/**
 * coachMoveCommentary
 * -------------------
 * Produces in-depth, eval-tied coaching commentary after a move is played.
 *
 * Goal (per user directive): no generic lines. Every comment the coach
 * speaks is real analysis — concrete threats, piece coordination, weak
 * squares, pawn-structure implications, typical plans. If the LLM is
 * unavailable (no API key, network down), we return an empty string and
 * the caller simply does not narrate that move. We never fall back to
 * canned "Nice move." filler.
 *
 * The LLM is grounded by Stockfish: we pass the eval delta, the move,
 * and the FEN so the model anchors its prose to the real position
 * rather than guessing.
 *
 * This service lives outside React so it can be reused by any play or
 * review view.
 */
import type { Chess } from 'chess.js';
import { getCoachChatResponse } from './coachApi';

export type MoveVerdict = 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' | 'neutral';

export interface MoveCommentaryInput {
  /** Chess instance positioned AFTER the move was played. */
  gameAfter: Chess;
  /** Side that just moved. */
  mover: 'w' | 'b';
  /** Stockfish eval (centipawns, positive = White winning) BEFORE the move. Null when unknown. */
  evalBefore: number | null;
  /** Stockfish eval AFTER the move. Null when unknown. */
  evalAfter: number | null;
  /** First SAN move of Stockfish's best continuation from the position AFTER the move, if known. */
  bestReplySan?: string;
  /** Optional subject (e.g. "Sicilian Najdorf") to bias the prose. */
  subject?: string;
  /**
   * True when the context is a post-game review, so the coach speaks to
   * the student about the game's arc rather than as an in-game opponent.
   */
  reviewTone?: boolean;
  /** When true, skip the LLM entirely and return '' (no narration). */
  offline?: boolean;
}

/**
 * Classify an eval swing into a rough verdict from the MOVER's perspective.
 * Centipawn thresholds mirror gameImportUtils so review + play agree.
 */
export function classifyEvalSwing(
  evalBefore: number | null,
  evalAfter: number | null,
  mover: 'w' | 'b',
): MoveVerdict {
  if (evalBefore === null || evalAfter === null) return 'neutral';
  const sign = mover === 'w' ? 1 : -1;
  const swing = (evalAfter - evalBefore) * sign;
  if (swing >= 80) return 'excellent';
  if (swing >= 20) return 'good';
  if (swing <= -300) return 'blunder';
  if (swing <= -150) return 'mistake';
  if (swing <= -60) return 'inaccuracy';
  return 'book';
}

/**
 * Produce in-depth coaching commentary. Returns an empty string when we
 * cannot call the LLM (no API key, offline, API error) — callers should
 * treat empty as "do not narrate" rather than painting a generic line.
 */
export async function generateMoveCommentary(input: MoveCommentaryInput): Promise<string> {
  if (input.offline) return '';

  const history = input.gameAfter.history({ verbose: true });
  if (history.length === 0) return '';

  try {
    const response = await getLlmCommentary(input, history);
    if (!response) return '';
    const trimmed = response.trim();
    // The coachApi returns a warning banner string when no key is
    // configured; surface that as "not available" rather than speaking it.
    if (trimmed.startsWith('⚠️')) return '';
    return trimmed;
  } catch {
    return '';
  }
}

interface VerboseMove {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  flags: string;
}

async function getLlmCommentary(
  input: MoveCommentaryInput,
  history: VerboseMove[],
): Promise<string> {
  const { gameAfter, mover, evalBefore, evalAfter, bestReplySan, subject, reviewTone } = input;
  const last = history[history.length - 1];
  const verdict = classifyEvalSwing(evalBefore, evalAfter, mover);

  const pawnPerspective = (cp: number | null): string =>
    cp === null ? 'unknown' : (cp / 100).toFixed(2);
  const swingPawns =
    evalBefore !== null && evalAfter !== null
      ? ((evalAfter - evalBefore) * (mover === 'w' ? 1 : -1) / 100).toFixed(2)
      : 'unknown';

  const moverName = mover === 'w' ? 'White' : 'Black';
  const recentSan = history.slice(-8).map((m) => m.san).join(' ');

  const system = reviewTone ? REVIEW_SYSTEM_PROMPT : PLAY_SYSTEM_PROMPT;

  const user = [
    subject ? `Session subject: ${subject}.` : '',
    `${moverName} just played ${last.san}.`,
    `Move flags: ${describeMoveFlags(last)}.`,
    `FEN after the move: ${gameAfter.fen()}.`,
    `Last 8 moves (SAN): ${recentSan}.`,
    `Stockfish eval after (pawns, White's POV): ${pawnPerspective(evalAfter)}.`,
    `Eval swing for the mover (pawns): ${swingPawns}.`,
    `Swing classification: ${verdict}.`,
    bestReplySan ? `Stockfish's best reply from this position: ${bestReplySan}.` : '',
    'Give IN-DEPTH analysis per the rules. No filler, no generic praise.',
  ].filter(Boolean).join('\n');

  return getCoachChatResponse(
    [{ role: 'user', content: user }],
    system,
    undefined,
    'interactive_review',
    420,
  );
}

const COMMON_RULES = [
  'You are a chess coach talking to a friend across the board, not a',
  'textbook. Your lines are read ALOUD by text-to-speech, so they need',
  'to SOUND like a real coach — warm, curious, direct.',
  '',
  'HARD RULES:',
  '- Conversational tone. Use contractions ("you\'re", "that\'s", "let\'s"),',
  '  short sentences, direct second-person language. Ask the student a',
  '  question or point their attention at something when it fits ("notice',
  '  how the knight hits two squares at once", "see what their queen is',
  '  eyeing?"). Sound like a human teacher, not an analysis engine.',
  '- 1 to 3 sentences, 20–70 words. Brevity wins — short is easier to',
  '  listen to than long.',
  '- NEVER write generic filler like "Solid move", "Nice", "Good job",',
  '  "I played Nf3". Skip "Great question!" / "Excellent!" openers.',
  '- Cite at least ONE concrete feature from the position — a threat,',
  '  pinned piece, weak square, pawn break, open file, misplaced piece,',
  '  king safety, outpost, structural idea. Two is fine when it fits,',
  '  but one concrete idea said clearly beats a list of three.',
  '- If the move was a mistake or blunder, name the concrete threat or',
  '  refutation it walked into and what the defender should have done.',
  '- If the move was strong, explain the IDEA — what it targets, what',
  '  plan it enables, what structural change it imposes.',
  '- Never invent tactics. If unsure, speak about structure and piece',
  '  activity.',
  '- Do not cite engine evaluation numbers; translate them into plain',
  '  ideas ("this keeps the position level", "you\'re doing well here").',
  '- Never repeat the SAN back — assume the student can see it on the',
  '  board. Translate any square references into spoken English ("the',
  '  knight to c6" not "Nc6"; "castle kingside" not "O-O").',
  '- No lists, no markdown, no move numbers, no bullet points.',
].join('\n');

const PLAY_SYSTEM_PROMPT = `${COMMON_RULES}

CONTEXT: You are the opponent's coach during a live game-against-AI
session. You are both the opponent AND the teacher. Speak about YOUR
move (what you were thinking, what you're threatening) or the student's
move (what they're setting up, what to watch for). Keep it
conversational — two people at a chessboard, one teaching the other.`;

const REVIEW_SYSTEM_PROMPT = `${COMMON_RULES}

CONTEXT: You are reviewing the student's finished game with them. Speak
TO the student about this move — their idea, the opponent's threat,
the plan the position calls for, and (if it was an error) the principle
they missed. Conversational, not lecturing. Use "you" / "your".`;

function describeMoveFlags(move: VerboseMove): string {
  const parts: string[] = [];
  if (move.flags.includes('c') || move.flags.includes('e')) parts.push('capture');
  if (move.flags.includes('p')) parts.push('promotion');
  if (move.flags.includes('k')) parts.push('kingside castle');
  if (move.flags.includes('q')) parts.push('queenside castle');
  if (move.flags.includes('b')) parts.push('double pawn push');
  if (parts.length === 0) parts.push('quiet move');
  return parts.join(', ');
}
