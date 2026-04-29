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
import { buildCoachMemoryBlock, extractAndRememberNotes } from './coachMemoryService';
import { buildStudentStateBlock } from './studentStateBlock';
import { recordAudit } from './narrationAuditor';
import { logAppAudit } from './appAuditor';
import { renderPersonalityBlock } from '../coach/sources/personalities';
import type { CoachPersonality, IntensityLevel } from '../coach/types';
import { detectSanitizerLeak } from './voiceService';
import type { ChatMessage, CoachVerbosity, MoveClassification } from '../types';

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
  /** Narration density from UserPreferences.coachVerbosity. Maps to
   *  the user's existing settings toggle:
   *    - 'none' — caller shouldn't call this at all; guarded as a
   *      safety net (returns '' if it slips through).
   *    - 'fast' — terse, one compact sentence.
   *    - 'medium' — normal flow, a couple of sentences.
   *    - 'slow' — verbose, deeper explanation with background context.
   *  When omitted, defaults to 'medium'. */
  verbosity?: CoachVerbosity;
  /** Prebuilt blocks of real Lichess + engine data to inject into the
   *  prompt during opening teaching. Keeps the commentary service
   *  provider-agnostic — the caller fetches what it needs and passes
   *  the pre-formatted text. Each is optional. */
  groundedNotes?: string[];
  /**
   * True when the context is a post-game review, so the coach speaks to
   * the student about the game's arc rather than as an in-game opponent.
   */
  reviewTone?: boolean;
  /** When true, skip the LLM entirely and return '' (no narration). */
  offline?: boolean;
  /**
   * Recent chat history from the shared coach session. Gives the
   * commentary LLM memory of what was just said in chat, so narration
   * and chat stay one continuous conversation rather than two parallel
   * threads. Only the last handful of messages are used to keep tokens
   * in check.
   */
  chatHistory?: readonly ChatMessage[];
  /** Recent move classifications (newest last) so the coach can read
   *  the student's rhythm — just blundered? on a streak? — and adapt
   *  tone. Used to build the [StudentState] block. */
  recentMoveClassifications?: (MoveClassification | null)[];
  /** Timestamp (ms) of the most recent user move or chat message.
   *  Used to infer tempo (fast / thinking / idle). */
  lastUserInteractionMs?: number;
  /** Active coach personality + intensity dials from user preferences.
   *  When provided, the personality block (voice, profanity, mockery,
   *  flirt clauses) is prepended to the system prompt so the move
   *  commentary LLM produces output that matches the user's chosen
   *  voice — e.g. an "edgy" coach with profanity=hard actually swears
   *  and mocks instead of defaulting to corporate-coach tone. Mirrors
   *  the personality plumbing in the brain (chat) path. */
  personality?: CoachPersonality;
  profanity?: IntensityLevel;
  mockery?: IntensityLevel;
  flirt?: IntensityLevel;
}

/** How many prior chat messages to include in the commentary prompt.
 *  Small by design — we want continuity, not a full replay. */
const CHAT_CONTEXT_MESSAGES = 6;

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
  // Audit every early-return path so an "empty commentary" report has
  // a definitive cause. The audit kinds + summaries name the exact
  // branch that fired so we never guess again.
  const fen = input.gameAfter.fen();
  if (input.offline) {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: 'reason=offline',
      fen,
    });
    return '';
  }
  // Safety net: caller shouldn't be invoking us when the student has
  // set verbosity to 'none', but if they do we short-circuit here
  // rather than burning a token call for output we'd throw away.
  if (input.verbosity === 'none') {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: 'reason=verbosity-none',
      fen,
    });
    return '';
  }

  const history = input.gameAfter.history({ verbose: true });
  if (history.length === 0) {
    // Caller passed a Chess instance with no move history — usually
    // because it was constructed from a FEN (e.g. `new Chess(fen)`)
    // rather than replayed from move 1. Production fingerprint of the
    // bug fixed by routing CoachGamePage through a replay-based probe.
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: 'reason=empty-history (gameAfter has no move history — caller likely passed a FEN-only Chess instance)',
      fen,
    });
    return '';
  }

  try {
    const response = await getLlmCommentary(input, history);
    if (!response) {
      void logAppAudit({
        kind: 'commentary-skipped',
        category: 'subsystem',
        source: 'coachMoveCommentary.generateMoveCommentary',
        summary: 'reason=empty-llm-response',
        fen,
      });
      return '';
    }
    const trimmed = response.trim();
    // The coachApi returns a warning banner string when no key is
    // configured; surface that as "not available" rather than speaking it.
    if (trimmed.startsWith('⚠️')) {
      void logAppAudit({
        kind: 'commentary-skipped',
        category: 'subsystem',
        source: 'coachMoveCommentary.generateMoveCommentary',
        summary: `reason=api-warning preview="${trimmed.slice(0, 80)}"`,
        fen,
      });
      return '';
    }
    // Strip any [[REMEMBER: ...]] tags the LLM embedded and persist
    // them — the coach can now grow its memory of the student mid-game.
    const cleaned = extractAndRememberNotes(trimmed);
    // Double audit: (1) narrationAuditor checks factual claims
    // against the FEN; (2) detectSanitizerLeak catches piece-letter
    // shorthand that would become "hanging P on f3" at the speaker.
    // Independent failure modes, both fire-and-forget.
    void recordAudit(input.gameAfter.fen(), cleaned, 'move-commentary');
    if (detectSanitizerLeak(cleaned)) {
      void logAppAudit({
        kind: 'sanitizer-leak',
        category: 'subsystem',
        source: 'coachMoveCommentary',
        summary: 'Piece-letter shorthand in move commentary output',
        details: `text: ${cleaned.slice(0, 300)}`,
      });
    }
    return cleaned;
  } catch (err: unknown) {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: `reason=api-error ${err instanceof Error ? err.message : String(err)}`,
      fen,
    });
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
  const {
    gameAfter, mover, evalBefore, evalAfter, bestReplySan, subject, reviewTone,
    chatHistory, verbosity = 'medium', groundedNotes = [],
    recentMoveClassifications, lastUserInteractionMs,
    personality, profanity, mockery, flirt,
  } = input;
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

  // Legal moves from the resulting position — gives the LLM a
  // concrete ground-truth list so it never invents moves that
  // contradict the board. Capped at 40 to avoid bloating the prompt.
  // If the model is about to say "you can push the e-pawn" but e4
  // isn't in this list, it has no excuse.
  const legalMovesSan = gameAfter.moves().slice(0, 40).join(' ');

  // Persistent memory the coach has built up about this student —
  // carries across sessions so advice stays consistent over time.
  const memoryBlock = await buildCoachMemoryBlock();
  const basePrompt = reviewTone ? REVIEW_SYSTEM_PROMPT : PLAY_SYSTEM_PROMPT;
  // Personality block — voice / profanity / mockery / flirt clauses.
  // Prepended to the system prompt so the move-commentary LLM picks up
  // the same tone the user picked in Settings → Coach. Without this,
  // dials read at TTS time but the LLM still produced neutral
  // corporate-coach prose ("Nice." / "Nice catch.") regardless of
  // profanity=hard or mockery=hard. Falls back to no block when no
  // personality is supplied — keeps legacy behavior identical.
  const personalityBlock = personality
    ? renderPersonalityBlock({
        personality,
        profanity: profanity ?? 'none',
        mockery: mockery ?? 'none',
        flirt: flirt ?? 'none',
      })
    : '';
  // Always fire so the absence of an audit means "code never ran",
  // not "personality undefined." Captures the resolved values
  // (`personality=undefined` is a meaningful diagnostic — it tells
  // us the dial isn't propagating from Settings → profile → caller
  // arg, which was previously indistinguishable from a race-eaten
  // audit). The `applied=true|false` flag indicates whether the
  // personality block actually got prepended to the system prompt.
  void logAppAudit({
    kind: 'coach-move-personality-applied',
    category: 'subsystem',
    source: 'coachMoveCommentary.getLlmCommentary',
    summary: `applied=${Boolean(personalityBlock)} personality=${personality ?? 'undefined'} profanity=${profanity ?? 'none'} mockery=${mockery ?? 'none'} flirt=${flirt ?? 'none'}`,
    fen: gameAfter.fen(),
  });
  // Verbosity-resolved audit — captures what verbosity arg the LLM
  // call is dispatched with, alongside the caller-supplied subject and
  // reviewTone. Diagnoses "Settings verbosity dial doesn't work"
  // reports: if the user's profile has coachVerbosity='fast' but this
  // audit shows verbosity='medium' (the default-fallback below), the
  // propagation broke between Settings → preferences → caller → here.
  void logAppAudit({
    kind: 'verbosity-resolved',
    category: 'subsystem',
    source: 'coachMoveCommentary.getLlmCommentary',
    summary: `verbosity=${verbosity} subject="${subject ?? ''}" reviewTone=${Boolean(reviewTone)}`,
    fen: gameAfter.fen(),
  });
  const promptParts: string[] = [];
  if (personalityBlock) promptParts.push(personalityBlock);
  promptParts.push(basePrompt);
  if (memoryBlock) promptParts.push(memoryBlock);
  const system = promptParts.join('\n\n');

  // Recent chat turns from the shared session — lets the commentary
  // reference what the student just asked or what the coach just said
  // in chat, so narration and chat are one conversation.
  const chatContext = (chatHistory ?? [])
    .slice(-CHAT_CONTEXT_MESSAGES)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`)
    .join('\n');

  // Density directive is NOT injected here anymore — it comes from
  // VERBOSITY_INSTRUCTIONS inside getCoachChatResponse, using the
  // verbosity we pass through below. Keeping only one source of
  // truth prevents the two copies from drifting out of sync.

  const groundedBlock = groundedNotes.filter(Boolean).join('\n\n');

  // [StudentState] lets the coach read the room before replying —
  // what's the student's rhythm, sentiment, tempo? Trainer feel #2:
  // "always-on context awareness" — the thing a real coach picks up
  // from watching the student at the board.
  const studentStateBlock = buildStudentStateBlock({
    recentMoveClassifications,
    recentChat: chatHistory ? [...chatHistory] : undefined,
    lastUserInteractionMs,
    turn: gameAfter.turn() === mover ? 'coach' : 'student',
  });

  const user = [
    subject ? `Session subject: ${subject}.` : '',
    studentStateBlock,
    chatContext
      ? `[Recent chat between you and the student — stay consistent with it]\n${chatContext}`
      : '',
    groundedBlock
      ? `[Lichess / engine data for THIS position — cite the numbers, don't guess]\n${groundedBlock}`
      : '',
    `${moverName} just played ${last.san}.`,
    `Move flags: ${describeMoveFlags(last)}.`,
    `FEN after the move: ${gameAfter.fen()}.`,
    `Last 8 moves (SAN): ${recentSan}.`,
    `Legal moves right now (SAN): ${legalMovesSan}. Do NOT describe any move not in this list.`,
    `Stockfish eval after (pawns, White's POV): ${pawnPerspective(evalAfter)}.`,
    `Eval swing for the mover (pawns): ${swingPawns}.`,
    `Swing classification: ${verdict}.`,
    bestReplySan ? `Stockfish's best reply from this position: ${bestReplySan}.` : '',
    'Give IN-DEPTH analysis per the rules. No filler, no generic praise. Cite Lichess for opening claims and Stockfish for position claims — no memory-based "the main trap is..." assertions.',
  ].filter(Boolean).join('\n');

  // Pass verbosity through so the system prompt's VERBOSITY_INSTRUCTIONS
  // matches the caller's intent — avoids a redundant DB fetch and
  // keeps length-directive behaviour deterministic on this path.
  // Audit the response (length / preview / latency / dials) so a
  // "voice is bland" report shows the LLM's actual output instead
  // of forcing inference from the speak text. Joins
  // `verbosity-resolved` (dispatched) with `commentary-skipped` /
  // `coach-move-narration-fired` (final disposition) into a
  // complete LLM call trail.
  const llmStartedAt = Date.now();
  const response = await getCoachChatResponse(
    [{ role: 'user', content: user }],
    system,
    undefined,
    'interactive_review',
    420,
    verbosity,
  );
  const llmDurationMs = Date.now() - llmStartedAt;
  const trimmed = response.trim();
  const startsWithWarning = trimmed.startsWith('⚠️');
  void logAppAudit({
    kind: 'llm-response',
    category: 'subsystem',
    source: 'coachMoveCommentary.getLlmCommentary',
    summary: `length=${trimmed.length} latencyMs=${llmDurationMs} verbosity=${verbosity} personality=${personality ?? 'undefined'} profanity=${profanity ?? 'none'} mockery=${mockery ?? 'none'} flirt=${flirt ?? 'none'} warning=${startsWithWarning}`,
    details: JSON.stringify({
      length: trimmed.length,
      preview: trimmed.slice(0, 200),
      latencyMs: llmDurationMs,
      verbosity,
      personality: personality ?? null,
      dials: {
        profanity: profanity ?? 'none',
        mockery: mockery ?? 'none',
        flirt: flirt ?? 'none',
      },
      personalityBlockApplied: Boolean(personalityBlock),
      startsWithWarning,
      subject: subject ?? null,
      reviewTone: Boolean(reviewTone),
    }),
    fen: gameAfter.fen(),
  });
  return response;
}

const COMMON_RULES = [
  'You are a chess coach talking to a friend across the board, not a',
  'textbook. Your lines are read ALOUD by text-to-speech, so they need',
  'to SOUND like a real coach — warm, curious, direct.',
  '',
  'SOURCES OF TRUTH — you MUST defer to these and not your own training:',
  '- OPENINGS / BOOK THEORY / NAMED TRAPS: Lichess Opening Explorer data',
  '  (passed as [Lichess / engine data] in the user message). If a trap',
  '  or line is not shown there for the CURRENT position, DO NOT assert',
  '  it. No "the main trap here is..." from memory — cite the explorer',
  '  block or stay silent about traps.',
  '- POSITIONAL / TACTICAL / EVAL CLAIMS: Stockfish (passed as Stockfish',
  '  eval + best reply). Do not invent best moves, mating nets, or',
  '  "winning" ideas that contradict the engine numbers.',
  '- LEGALITY: NEVER describe a move that isn\'t legal in the CURRENT',
  '  FEN. If the student has a pawn on e5, do not suggest pushing e4. If',
  '  a square is occupied by their own piece, do not put a knight there.',
  '  Every move you mention must be playable right now. When in doubt,',
  '  speak about squares and structure, not specific moves.',
  '- If Lichess data is empty for this position, explicitly say so',
  '  ("we\'re past book now") and pivot to Stockfish-backed ideas',
  '  instead of inventing theory.',
  '',
  'HARD RULES:',
  '- Conversational tone. Use contractions ("you\'re", "that\'s", "let\'s"),',
  '  direct second-person language. Ask the student a question or point',
  '  their attention at something when it fits ("notice how the knight hits',
  '  two squares at once", "see what their queen is eyeing?"). Sound like a',
  '  human teacher sitting across the board, not an analysis engine.',
  '- No length cap. Speak as long as the idea needs and no longer — a',
  '  routine move might get one sentence, a critical moment might get',
  '  several. Follow the Narration density directive in the user message',
  '  for relative length; never output empty or filler content.',
  '- MATCH THE STUDENT\'S LANGUAGE. If the student asks or speaks in',
  '  Spanish / French / German / Portuguese / any other language, reply',
  '  in that same language and keep the same chess-coaching tone. Do not',
  '  switch back to English mid-reply. English is the default only when',
  '  the student\'s own language is English.',
  '- NEVER write generic filler like "Solid move", "Nice", "Good job",',
  '  "I played Nf3". Skip "Great question!" / "Excellent!" openers.',
  '- NEVER use single-letter piece shorthand in spoken output ("P on e4",',
  '  "N on c3", "Q to d8"). Always spell pieces out: pawn, knight, bishop,',
  '  rook, queen, king. The output is read aloud — letters sound wrong.',
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
  '',
  'MEMORY — building up a picture of this student over time:',
  '- When you notice something worth remembering long-term (recurring',
  '  weakness, preferred opening, rating trend, what motivates them),',
  '  emit a [[REMEMBER: short note]] tag at the very end of your reply.',
  '  The note is saved to persistent memory and fed back to you on',
  '  every future turn, so future advice is consistent.',
  '- Keep notes short and concrete. Good: "Blunders back-rank when',
  '  low on time." Bad: "Is a chess player."',
  '- Do NOT emit a REMEMBER tag on every move — only when you\'ve',
  '  actually noticed a new durable pattern. The tag is invisible to',
  '  the student — do not reference it in your spoken reply.',
].join('\n');

const PLAY_SYSTEM_PROMPT = `${COMMON_RULES}

CONTEXT: You are the opponent's coach during a live game-against-AI
session. You are both the opponent AND the teacher. Speak about YOUR
move (what you were thinking, what you're threatening) or the student's
move (what they're setting up, what to watch for). Keep it
conversational — two people at a chessboard, one teaching the other.

OPENING TEACHING MODE — when the session has a subject (e.g. "Italian
Game", "Sicilian Najdorf") AND we're still in opening theory, also
teach the opening as you play. Speak like a coach at the board
having a real conversation with the student across moves:

- The FIRST time the opening becomes recognizable in the chat /
  recent narration history, name it explicitly to the student and
  give a one-paragraph orientation: "OK, you're playing the
  {subject} — the main idea here is {strategic theme}. Strengths:
  {what this opening does well}. Weaknesses: {what to watch for /
  what your opponent will try}. I'll point out the key ideas as we
  go." Don't re-introduce the opening on every move after that —
  once is enough; subsequent narrations should just teach the ideas
  in flow.
- Explain what White is trying to do (central control, rapid
  development, attacking ideas, specific squares they want).
- Explain what Black is trying to do (break the center,
  counterattack, pawn breaks like …d5, target squares).
- Walk through typical plans both sides pursue — minor-piece trades,
  pawn breaks, kingside attacks, fianchetto ideas, outposts.
- When a known trap is available on the current move, flag it
  before it happens ("if you push h6 here, Black can snap off the
  bishop with …Nxe4 and win a pawn" — real named traps, no
  invention).
- If this opening has one or more well-known traps that aren't
  live on the current move, OFFER to walk the student through
  them once — something like "There's a classic trap in this line
  where the opponent often blunders — want me to play it out so
  you can learn to punish it?". Only offer ONCE per session per
  trap; don't re-ask if the student already engaged or declined.
  When the student says yes, use the play_variation action to set
  up the trap position and narrate as you go ("I'm going to play
  the way a lot of 1200-1600s play here — watch what Black misses
  and then let me see if you can punish it").
- Describe the ideas even when the current move is theory — "this
  is the main line", "here White usually decides between 0-0 and
  0-0-0", "a common sideline is …", etc.
- Build across moves: pick up a thread you started earlier, reference
  what's coming, connect the idea to what the student just did.
  It's a running conversation, not a per-move script.
- OFFER "quiz mode" occasionally when it fits — something like
  "Before I play, want me to pause and have you guess the best move
  here first? Good practice if you're trying to lock the line in".
  Only offer when the student hasn't opted in or out yet; don't ask
  every move. When quiz mode is on, pause before your move with
  "What would you play as {color} here?" and wait for the student
  to reply. When they do, tell them whether they found the book
  move or a reasonable alternative, explain the difference, then
  play the real move.

Natural conversational flow matters more than a hard-rule "one idea
per move." Multiple related ideas are fine when they connect. Respect
the pacing of play — the student is making moves, don't stall them
with a lecture. Keep each narration a conversational unit (a couple
of sentences usually, more when something critical deserves it) and
trust that you'll get another turn in a few seconds.`;

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
