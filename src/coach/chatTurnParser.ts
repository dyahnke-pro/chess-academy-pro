/**
 * chatTurnParser — the READ stage of ONE-CHAT: a student's words (typed or a
 * mic transcript, any language) → the closed `ChatTurn` form → validated
 * against the board.
 *
 * Order: (1) the deterministic square-answer reader — no model for "c6 and
 * e5"; (2) the model fills the form through forced structured output
 * (`readChatTurnStructured` → `callDeepseekWithTool`), translation folded in so
 * there is ONE call, not translate-then-parse; (3) code validates every field
 * against the board (`validateChatTurn`) and a reading that cannot stand comes
 * back with a one-line clarifying question instead of an answer.
 *
 * The model is shown NO board: it reads words, it does not look at chess. It
 * may never emit a move to PLAY — "what about Nf3?" is always a question.
 * A failed or slow read is SILENT: the caller serves today's answer.
 */
import { readChatTurnStructured } from '../services/coachApi';
import { readTurnInCode } from './chatTurnCodeReader';
import {
  ALL_CHAT_KINDS,
  CHAT_KINDS,
  EMPTY_CONVERSATION,
  readSquareAnswer,
  validateChatTurn,
  type BoardContext,
  type ChatKind,
  type ChatTurn,
  type ConversationState,
  type PieceLetter,
  type Referent,
  type Seat,
  type ValidationResult,
} from './chatTurn';

export type Reader = typeof readChatTurnStructured;

export interface ParseContext {
  board: BoardContext;
  memory?: ConversationState;
  /** Wall-clock budget for the model read. The answer never waits on it in
   *  shadow; this only bounds how long the row waits. */
  timeoutMs?: number;
  /** Injected in tests; the coachApi chokepoint in the app. */
  reader?: Reader;
}

export interface ParseResult {
  turn: ChatTurn | null;
  /** The student's words in English, as the reader translated them (null on
   *  the deterministic path, where nothing needed translating). */
  english: string | null;
  validation: ValidationResult | null;
  source: 'square-answer' | 'code' | 'llm' | 'llm-failed' | 'timeout';
  latencyMs: number;
}

const TOOL_NAME = 'read_student_turn';
const PIECE_NAMES: Record<string, PieceLetter> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const REFERENT_TYPES = ['square', 'piece', 'move', 'what-i-played', 'their-last-move'] as const;

/** The closed form, as a JSON schema. The kind enum IS the kind table. */
export const CHAT_TURN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ALL_CHAT_KINDS },
    referents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...REFERENT_TYPES] },
          square: { type: 'string', description: 'a board square like e4, only if the student said it' },
          piece: { type: 'string', enum: Object.keys(PIECE_NAMES) },
          seat: { type: 'string', enum: ['me', 'them'] },
          other: { type: 'boolean', description: 'true for "the other knight"' },
          san: { type: 'string', description: 'a move in SAN, only if the student named one' },
        },
        required: ['type'],
      },
    },
    seat: { type: 'string', enum: ['me', 'them', 'none'] },
    topic: { type: 'string', description: 'an opening / player / concept name the student said, in English, else empty' },
    english: { type: 'string', description: 'the student message translated to English (unchanged if already English)' },
  },
  required: ['kind', 'referents', 'seat', 'english'],
};

/** The reader's instructions — derived from the kind table, so a new kind
 *  reaches the prompt by compiling. */
export function readerSystemPrompt(previousKind: ChatKind | null): string {
  const kinds = ALL_CHAT_KINDS.map((k) => `- ${k}: ${CHAT_KINDS[k].gloss}`).join('\n');
  return [
    'You read what a chess student just said to their coach and fill a form. You do NOT answer it.',
    'Pick the ONE kind that matches. Kinds:',
    kinds,
    'Referents: only the squares, pieces and moves the student actually SAID. Never add one.',
    '"what I played" / "my move" → a what-i-played referent. "their move" → their-last-move.',
    '"my" / "I" → seat me; "their" / "he" / "they" / "opponent" → seat them.',
    'A move the student names is ALWAYS a question about that move, never a request to play it.',
    'Translate the message to English in `english`. Keep moves in SAN.',
    previousKind ? `The previous turn was read as: ${previousKind}. Use it only for a follow-up like "and why?".` : '',
  ].filter(Boolean).join('\n');
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Turn whatever the model returned into a ChatTurn, or null. Closed: an
 *  unknown kind becomes `unclear`, an unknown referent is dropped, nothing is
 *  invented to fill a gap. */
export function coerceChatTurn(raw: unknown): { turn: ChatTurn; english: string | null } | null {
  if (!isRecord(raw)) return null;
  const kind: ChatKind = typeof raw.kind === 'string' && (ALL_CHAT_KINDS as string[]).includes(raw.kind)
    ? raw.kind as ChatKind
    : 'unclear';
  const seatOf = (v: unknown): Seat | null => (v === 'me' || v === 'them' ? v : null);
  const referents: Referent[] = [];
  for (const r of Array.isArray(raw.referents) ? raw.referents : []) {
    if (!isRecord(r)) continue;
    const square = typeof r.square === 'string' ? r.square.trim().toLowerCase() : null;
    switch (r.type) {
      case 'square':
        if (square) referents.push({ type: 'square', square });
        break;
      case 'piece': {
        const piece = typeof r.piece === 'string' ? PIECE_NAMES[r.piece.toLowerCase()] : undefined;
        if (piece) referents.push({ type: 'piece', piece, square: square || null, seat: seatOf(r.seat), ...(r.other === true ? { other: true } : {}) });
        break;
      }
      case 'move':
        if (typeof r.san === 'string' && r.san.trim()) referents.push({ type: 'move', san: r.san.trim() });
        break;
      case 'what-i-played':
        referents.push({ type: 'what-i-played' });
        break;
      case 'their-last-move':
        referents.push({ type: 'their-last-move' });
        break;
      default:
        break;
    }
  }
  const topic = typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : null;
  const english = typeof raw.english === 'string' && raw.english.trim() ? raw.english.trim() : null;
  return { turn: { kind, referents, seat: seatOf(raw.seat), topic }, english };
}

/** Read one student turn. Never throws. */
export async function parseChatTurn(text: string, ctx: ParseContext): Promise<ParseResult> {
  const started = Date.now();
  const memory = ctx.memory ?? EMPTY_CONVERSATION;
  const done = (r: Omit<ParseResult, 'latencyMs'>): ParseResult => ({ ...r, latencyMs: Date.now() - started });

  // 1. A bare square/piece answer needs no model.
  const square = readSquareAnswer(text);
  if (square) {
    return done({ turn: square, english: null, validation: validateChatTurn(square, ctx.board, memory), source: 'square-answer' });
  }

  // 2. THE SENTENCE COMPUTER reads what it can with the board in hand — a
  // choice between two moves, a question about one named move — before any
  // model call (chatTurnCodeReader).
  const coded = readTurnInCode(text, ctx.board);
  if (coded) {
    return done({ turn: coded, english: null, validation: validateChatTurn(coded, ctx.board, memory), source: 'code' });
  }

  // 3. The model fills the form.
  const reader = ctx.reader ?? readChatTurnStructured;
  const timeoutMs = ctx.timeoutMs ?? 6000;
  let timedOut = false;
  let raw: unknown;
  try {
    raw = await Promise.race([
      reader({
        system: readerSystemPrompt(memory.lastTurn?.kind ?? null),
        user: text,
        toolName: TOOL_NAME,
        description: 'Record what kind of turn the student said and what it points at.',
        schema: CHAT_TURN_SCHEMA,
        maxTokens: 300,
      }),
      new Promise<null>((resolve) => setTimeout(() => { timedOut = true; resolve(null); }, timeoutMs)),
    ]);
  } catch {
    raw = null;
  }
  if (raw === null || raw === undefined) {
    return done({ turn: null, english: null, validation: null, source: timedOut ? 'timeout' : 'llm-failed' });
  }
  const coerced = coerceChatTurn(raw);
  if (!coerced) return done({ turn: null, english: null, validation: null, source: 'llm-failed' });

  // 4. Code checks the reading against the board.
  return done({ turn: coerced.turn, english: coerced.english, validation: validateChatTurn(coerced.turn, ctx.board, memory), source: 'llm' });
}
