import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { getCoachCommentary } from './coachApi';
import { buildChessContextMessage } from './coachPrompts';
import { coachService } from '../coach/coachService';
import {
  GAME_POST_REVIEW_ADDITION,
  REVIEW_INTRO_ADDITION,
  REVIEW_MOVE_SEGMENT_ADDITION,
} from './coachPrompts';
import { getThemeSkills } from './puzzleService';
import { logAppAudit } from './appAuditor';
import type { BadHabit, CoachContext, UserProfile } from '../types';

// ─── Bad Habit Detection ────────────────────────────────────────────────────

export async function detectBadHabits(profile: UserProfile): Promise<BadHabit[]> {
  const themeSkills = await getThemeSkills();
  const habits: BadHabit[] = [...profile.badHabits];
  const today = new Date().toISOString().split('T')[0];

  // Check for weak themes (accuracy < 40% with 5+ attempts)
  for (const skill of themeSkills) {
    if (skill.accuracy < 0.4 && skill.attempts >= 5) {
      const existingIdx = habits.findIndex((h) => h.id === `weak-${skill.theme}`);
      if (existingIdx >= 0) {
        habits[existingIdx] = {
          ...habits[existingIdx],
          occurrences: habits[existingIdx].occurrences + 1,
          lastSeen: today,
          isResolved: skill.accuracy >= 0.6,
        };
      } else {
        habits.push({
          id: `weak-${skill.theme}`,
          description: `Struggling with ${skill.theme} puzzles (${Math.round(skill.accuracy * 100)}% accuracy)`,
          occurrences: 1,
          lastSeen: today,
          isResolved: false,
        });
      }
    }
  }

  // Mark habits as resolved if accuracy improved
  for (const habit of habits) {
    if (habit.id.startsWith('weak-')) {
      const theme = habit.id.replace('weak-', '');
      const skill = themeSkills.find((s) => s.theme === theme);
      if (skill && skill.accuracy >= 0.6) {
        habit.isResolved = true;
      }
    }
  }

  return habits;
}

export async function updateBadHabits(profile: UserProfile): Promise<BadHabit[]> {
  const habits = await detectBadHabits(profile);
  await db.profiles.update(profile.id, { badHabits: habits });
  return habits;
}

// ─── Post-Game Analysis ─────────────────────────────────────────────────────

export async function getPostGameAnalysis(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('post_game_analysis', context, onStream);
}

// ─── Daily Lesson ───────────────────────────────────────────────────────────

export async function getDailyLesson(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('daily_lesson', context, onStream);
}

// ─── Bad Habit Report ───────────────────────────────────────────────────────

export async function getBadHabitReport(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('bad_habit_report', context, onStream);
}

// ─── Weekly Report ──────────────────────────────────────────────────────────

export async function getWeeklyReport(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('weekly_report', context, onStream);
}

// ─── Bad Habit Detection from Coach Game ────────────────────────────────────

export async function detectBadHabitsFromGame(
  moves: { classification: string | null; san: string }[],
  profile: UserProfile,
): Promise<BadHabit[]> {
  const habits = [...profile.badHabits];
  const today = new Date().toISOString().split('T')[0];

  // Count mistakes and blunders
  const blunders = moves.filter((m) => m.classification === 'blunder').length;
  const mistakes = moves.filter((m) => m.classification === 'mistake').length;
  const inaccuracies = moves.filter((m) => m.classification === 'inaccuracy').length;

  // Detect time pressure blunders (blunders in last 10 moves)
  const lastMoves = moves.slice(-10);
  const lateBlunders = lastMoves.filter((m) => m.classification === 'blunder' || m.classification === 'mistake').length;
  if (lateBlunders >= 2) {
    const existingIdx = habits.findIndex((h) => h.id === 'game-time-pressure');
    if (existingIdx >= 0) {
      habits[existingIdx] = {
        ...habits[existingIdx],
        occurrences: habits[existingIdx].occurrences + 1,
        lastSeen: today,
        isResolved: false,
      };
    } else {
      habits.push({
        id: 'game-time-pressure',
        description: 'Tends to blunder in the later stages of the game (possible time pressure)',
        occurrences: 1,
        lastSeen: today,
        isResolved: false,
      });
    }
  }

  // Detect consistently inaccurate play
  if (blunders + mistakes >= 3) {
    const existingIdx = habits.findIndex((h) => h.id === 'game-calculation');
    if (existingIdx >= 0) {
      habits[existingIdx] = {
        ...habits[existingIdx],
        occurrences: habits[existingIdx].occurrences + 1,
        lastSeen: today,
        isResolved: false,
      };
    } else {
      habits.push({
        id: 'game-calculation',
        description: `Frequent calculation errors (${blunders} blunders, ${mistakes} mistakes in last game)`,
        occurrences: 1,
        lastSeen: today,
        isResolved: false,
      });
    }
  }

  // Mark improvement — if no blunders at all, mark calculation habit as resolved
  if (blunders === 0 && mistakes === 0 && inaccuracies <= 1) {
    for (const habit of habits) {
      if (habit.id === 'game-calculation' && !habit.isResolved) {
        habit.isResolved = true;
      }
    }
  }

  await db.profiles.update(profile.id, { badHabits: habits });
  return habits;
}

// ─── Narrative Summary ──────────────────────────────────────────────────────

export interface NarrativeMoveData {
  moveNumber: number;
  san: string;
  classification: string | null;
  commentary: string;
  evaluation: number | null;
  bestMove: string | null;
  isCoachMove: boolean;
}

/** Exact fallback sentence required by WO-REVIEW-01 when the per-move
 *  analysis is empty. The UI surfaces this verbatim — do not prettify. */
export const NARRATIVE_SUMMARY_NO_DATA = 'I need a moment to analyze this game. Tap Full Review for complete analysis.';

/** Format a single move row for the grounded [Per-move analysis] block.
 *  Columns: full move number, color, SAN, eval before, eval after, best,
 *  classification. Every field is either derived from the move record or
 *  explicitly marked "n/a" so the LLM cannot invent the missing value. */
function formatMoveRow(m: NarrativeMoveData, prevEvalCp: number | null, coachColor: 'White' | 'Black'): string {
  const fullMove = Math.ceil(m.moveNumber / 2);
  const moverColor: 'White' | 'Black' = m.moveNumber % 2 === 1 ? 'White' : 'Black';
  const side = m.isCoachMove ? `${moverColor}/coach` : moverColor === coachColor ? `${moverColor}/coach` : `${moverColor}/student`;
  const evalBefore = prevEvalCp !== null ? (prevEvalCp / 100).toFixed(2) : 'n/a';
  const evalAfter = m.evaluation !== null ? (m.evaluation / 100).toFixed(2) : 'n/a';
  const best = m.bestMove ?? 'n/a';
  const classification = m.classification ?? 'unclassified';
  return `Move ${fullMove}. ${m.san} (${side}) — eval before: ${evalBefore}, eval after: ${evalAfter}, best: ${best}, classification: ${classification}`;
}

export async function generateNarrativeSummary(
  pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  playerRating: number,
  onStream?: (chunk: string) => void,
  moveData?: NarrativeMoveData[],
): Promise<string> {
  // No per-move analysis → bail out with the graceful fallback.
  // Writing prose from nothing is exactly the hallucination path
  // WO-REVIEW-01 closes.
  if (!moveData || moveData.length === 0) {
    onStream?.(NARRATIVE_SUMMARY_NO_DATA);
    return NARRATIVE_SUMMARY_NO_DATA;
  }

  // Count errors across ALL student (non-coach) moves for the tone guide.
  let blunderCount = 0;
  let mistakeCount = 0;
  let inaccuracyCount = 0;
  for (const m of moveData) {
    if (m.isCoachMove) continue;
    if (m.classification === 'blunder') blunderCount++;
    else if (m.classification === 'mistake') mistakeCount++;
    else if (m.classification === 'inaccuracy') inaccuracyCount++;
  }
  const totalErrors = blunderCount + mistakeCount + inaccuracyCount;
  const toneGuide = totalErrors === 0
    ? 'The student played cleanly — praise the accuracy without overclaiming brilliance.'
    : totalErrors <= 2
      ? 'Mostly solid play with a couple areas to improve. Be constructive.'
      : `The student made ${totalErrors} errors (${blunderCount} blunders, ${mistakeCount} mistakes, ${inaccuracyCount} inaccuracies). Be honest about what went wrong — do NOT call the game "excellent" or "great". Focus on the specific errors and what to learn from them.`;

  // Build a [Per-move analysis] block with EVERY move. Previously the
  // filter limited this to blunders/mistakes/inaccuracies, which left
  // the LLM free to invent narrative for unanalyzed moves — the
  // hallucination mode WO-REVIEW-01 is fixing. Every move gets a row.
  const coachColor: 'White' | 'Black' = playerColor === 'white' ? 'Black' : 'White';
  const rows: string[] = [];
  let prevEvalCp: number | null = 0;
  for (const m of moveData) {
    rows.push(formatMoveRow(m, prevEvalCp, coachColor));
    prevEvalCp = m.evaluation;
  }

  const perMoveBlock = `[Per-move analysis]\n${rows.join('\n')}`;
  const resultLine = `Game result: ${result}.`;
  const openingLine = openingName
    ? `Opening: ${openingName}.`
    : 'Opening: (not classified).';
  const playerLine = `Student color: ${playerColor}. Student rating: ~${playerRating}.`;
  const errorSummary = `Student errors — blunders: ${blunderCount}, mistakes: ${mistakeCount}, inaccuracies: ${inaccuracyCount}.`;

  const userMessage = [
    playerLine,
    openingLine,
    resultLine,
    errorSummary,
    `Tone: ${toneGuide}`,
    '',
    perMoveBlock,
    '',
    `PGN: ${pgn}`,
  ].join('\n');

  // WO-COACH-UNIFY-01 Review-tab parity: route through coachService.ask
  // with surface='review' so the unified envelope (REVIEW_MODE_ADDITION
  // identity + memory + live-state) wraps every Review-tab LLM call —
  // same shape as /coach/teach and /coach/play. GAME_POST_REVIEW_ADDITION
  // threads as systemPromptAddition. Empty string on provider error
  // preserves the legacy "graceful blank" contract.
  const finalFen = (() => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      return chess.fen();
    } catch {
      return undefined;
    }
  })();
  const spineAnswer = await coachService.ask(
    {
      surface: 'review',
      ask: userMessage,
      liveState: {
        surface: 'review',
        fen: finalFen,
        userJustDid: 'Reviewing the completed game',
        whoseTurn: finalFen?.split(' ')[1] === 'b' ? 'black' : 'white',
      },
    },
    {
      task: 'game_narrative_summary',
      maxTokens: 800,
      maxToolRoundTrips: 1,
      systemPromptAddition: GAME_POST_REVIEW_ADDITION,
      onChunk: onStream,
    },
  );
  return spineAnswer.text.startsWith('(coach-brain provider error:')
    ? ''
    : spineAnswer.text;
}

// ─── Review Narration Segments ─────────────────────────────────────────────

export interface ReviewNarrationSegments {
  intro: string;
  closing: string;
}

export async function generateReviewNarrationSegments(
  pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  playerRating: number,
  moveData?: NarrativeMoveData[],
): Promise<ReviewNarrationSegments> {
  let analysisContext = '';
  if (moveData && moveData.length > 0) {
    const keyMoves = moveData.filter((m) =>
      !m.isCoachMove && m.classification &&
      m.classification !== 'good' && m.classification !== 'book',
    );
    if (keyMoves.length > 0) {
      analysisContext = '\n\nEngine analysis of key moments:\n' +
        keyMoves.map((m) => {
          const evalText = m.evaluation !== null ? ` (eval: ${(m.evaluation / 100).toFixed(1)})` : '';
          const bestText = m.bestMove ? `, best was ${m.bestMove}` : '';
          return `- Move ${Math.ceil(m.moveNumber / 2)} ${m.san}: ${m.classification}${evalText}${bestText}`;
        }).join('\n');
    }
  }

  const context: CoachContext = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastMoveSan: null,
    moveNumber: 0,
    pgn,
    openingName,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: {
      rating: playerRating,
      weaknesses: [],
    },
    additionalContext: `Player color: ${playerColor}. Game result: ${result}.
Generate two short narration segments for a move-by-move game review (2-3 sentences each, spoken aloud):

1. INTRO: Spoken before any moves play. Set the scene — mention the opening, early impressions, and what to watch for.
2. CLOSING: Spoken after the last move. Summarize takeaways — what went well, what to improve, and an encouraging note.

Respond ONLY with valid JSON: {"intro": "...", "closing": "..."}
Do not include any other text outside the JSON.${analysisContext}`,
  };

  // WO-COACH-UNIFY-01 final review-tab parity: route through
  // coachService.ask with surface='review' so this prep call ALSO
  // rides the unified envelope (REVIEW_MODE_ADDITION + memory +
  // live-state). Was the last legacy LLM caller in the Review path.
  // The JSON-only instruction lives inside `context.additionalContext`,
  // so it ends up in the user message via buildChessContextMessage —
  // identical wire shape as the legacy getCoachCommentary call.
  const userMessage = buildChessContextMessage(context);
  let raw = '';
  try {
    const spineAnswer = await coachService.ask(
      {
        surface: 'review',
        ask: userMessage,
        liveState: {
          surface: 'review',
          fen: context.fen,
          userJustDid: 'Generating intro/closing narration for the review',
        },
      },
      {
        task: 'game_narrative_summary',
        maxTokens: 800,
        maxToolRoundTrips: 1,
      },
    );
    raw = spineAnswer.text.startsWith('(coach-brain provider error:')
      ? ''
      : spineAnswer.text;
  } catch {
    // Fall through to the deterministic fallback below.
  }
  try {
    // Extract JSON from the response (may have markdown fences).
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { intro: string; closing: string };
      return { intro: parsed.intro, closing: parsed.closing };
    }
  } catch {
    // Fallback: split the text in half
  }
  // Fallback if parsing fails
  return {
    intro: openingName
      ? `Let's review this game. You played the ${openingName}.`
      : `Let's walk through this game together.`,
    closing: 'That wraps up the review. Keep practicing and learning from each game!',
  };
}

// ─── Build Context from Profile ─────────────────────────────────────────────

export function buildProfileContext(profile: UserProfile): CoachContext {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastMoveSan: null,
    moveNumber: 0,
    pgn: '',
    openingName: null,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: {
      rating: profile.currentRating,
      weaknesses: profile.badHabits
        .filter((h) => !h.isResolved)
        .map((h) => h.description),
    },
  };
}

// ─── Walk-the-game Review Narration (WO-REVIEW-02) ──────────────────────────


/** One move's worth of review narration material. Merged at build time
 *  from the deterministic move data (FEN / classification / best move)
 *  plus the per-ply narration string the LLM returned. A null `narration`
 *  means "this move passes in silence" — the review UI advances the
 *  board but speaks nothing. */
export interface ReviewMoveSegment {
  /** 1-indexed ply count. Ply 1 = White's first move, ply 2 = Black's first. */
  ply: number;
  /** Chess "full move number" — Math.ceil(ply / 2). */
  moveNumber: number;
  san: string;
  playerColor: 'white' | 'black';
  fenBefore: string;
  fenAfter: string;
  classification: 'brilliant' | 'great' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' | 'miss' | null;
  evalBefore: number | null;
  evalAfter: number | null;
  bestMoveSan: string | null;
  bestMoveUci: string | null;
  narration: string | null;
}

export interface ReviewNarration {
  intro: string;
  segments: ReviewMoveSegment[];
  /** Optional — spoken when the user reaches the last ply. Null by default. */
  closing: string | null;
}

/** Rich move data that feeds the walk-the-game review. Includes the
 *  starting-FEN before each move so the board can rewind/replay
 *  precisely. Derived by CoachGameReview from CoachGameMove[]. */
export interface ReviewMoveInput {
  ply: number;
  san: string;
  isCoachMove: boolean;
  classification: ReviewMoveSegment['classification'];
  evaluation: number | null;
  preMoveEval: number | null;
  bestMove: string | null;
  fenAfter: string;
}

/** Extract a JSON array from an LLM response. Accepts either a raw
 *  JSON array or one wrapped in markdown fences. Returns null on any
 *  shape that doesn't cleanly parse to an array — caller decides
 *  whether to retry or fall back to silence. */
function parseSegmentsJson(raw: string): Array<{ ply?: unknown; narration?: unknown }> | null {
  if (!raw) return null;
  const fenceStripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // Find the first `[` and its matching `]` — handles prose prefixes/suffixes.
  const firstBracket = fenceStripped.indexOf('[');
  const lastBracket = fenceStripped.lastIndexOf(']');
  if (firstBracket < 0 || lastBracket <= firstBracket) return null;
  const slice = fenceStripped.slice(firstBracket, lastBracket + 1);
  try {
    const parsed: unknown = JSON.parse(slice);
    return Array.isArray(parsed) ? (parsed as Array<{ ply?: unknown; narration?: unknown }>) : null;
  } catch {
    return null;
  }
}

/** Build the grounded [Per-move analysis] block the LLM uses to decide
 *  what to narrate. Mirrors the shape generateNarrativeSummary uses
 *  (WO-REVIEW-01) so the LLM sees the same data it's already trained
 *  on via our previous prompts. */
function buildPerMoveBlock(moves: ReviewMoveInput[], playerColor: 'white' | 'black'): string {
  const coachColor: 'White' | 'Black' = playerColor === 'white' ? 'Black' : 'White';
  const rows: string[] = [];
  for (const m of moves) {
    const fullMove = Math.ceil(m.ply / 2);
    const moverColor: 'White' | 'Black' = m.ply % 2 === 1 ? 'White' : 'Black';
    const side = m.isCoachMove || moverColor === coachColor ? `${moverColor}/coach` : `${moverColor}/student`;
    const evalBefore = m.preMoveEval !== null ? (m.preMoveEval / 100).toFixed(2) : 'n/a';
    const evalAfter = m.evaluation !== null ? (m.evaluation / 100).toFixed(2) : 'n/a';
    const best = m.bestMove ?? 'n/a';
    const classification = m.classification ?? 'unclassified';
    rows.push(
      `Ply ${m.ply} — Move ${fullMove}. ${m.san} (${side}) — eval before: ${evalBefore}, eval after: ${evalAfter}, best: ${best}, classification: ${classification}`,
    );
  }
  return `[Per-move analysis]\n${rows.join('\n')}`;
}

/** Reconstruct the FEN at each ply from the move list. Uses chess.js
 *  to replay the SAN sequence — if any SAN is invalid we bail with a
 *  shorter list (better to narrate the moves we can than refuse the
 *  whole review). */
function buildFenChain(moves: ReviewMoveInput[]): { fenBefore: string; fenAfter: string }[] {
  const chain: { fenBefore: string; fenAfter: string }[] = [];
  const chess = new Chess();
  for (const m of moves) {
    const fenBefore = chess.fen();
    let moveResult: unknown = null;
    try {
      moveResult = chess.move(m.san);
    } catch {
      moveResult = null;
    }
    if (!moveResult) break;
    chain.push({ fenBefore, fenAfter: chess.fen() });
  }
  return chain;
}

/** Deterministic fallback narration for a single ply. Used when the
 *  LLM either omits a ply entirely or returns null for it. The user
 *  has explicitly asked for narration on every move — silent plies
 *  leave the student staring at the board. Production audit (build
 *  06b6d5d) showed only 6/10 plies narrated; this guarantees a read
 *  on every move even when the LLM regresses. Tone stays neutral —
 *  the LLM produces the rich personality narration; this is just a
 *  safety net. */
function fallbackMoveNarration(params: {
  san: string;
  color: 'white' | 'black';
  isStudentMove: boolean;
  classification: import('../types').MoveClassification | null;
}): string {
  const { san, isStudentMove, classification } = params;
  const subject = isStudentMove ? 'You played' : 'The coach played';
  const sanReadable = san.replace(/\+|#/g, '');
  if (classification === 'blunder') {
    return `${subject} ${sanReadable} — flagged as a blunder. Step through to see the better line.`;
  }
  if (classification === 'mistake') {
    return `${subject} ${sanReadable} — flagged as a mistake. There was a stronger continuation.`;
  }
  if (classification === 'inaccuracy') {
    return `${subject} ${sanReadable} — slightly inaccurate, but still in the game.`;
  }
  if (classification === 'brilliant') {
    return `${subject} ${sanReadable} — a brilliant move. The engine approves.`;
  }
  if (classification === 'great') {
    return `${subject} ${sanReadable} — a strong, accurate move.`;
  }
  return `${subject} ${sanReadable}.`;
}

/** Fallback intro used if the LLM intro call fails. Still grounded in
 *  result + opening name. */
function defaultIntroText(params: {
  playerColor: 'white' | 'black';
  result: string;
  openingName: string | null;
  mistakeCount: number;
}): string {
  const colorWord = params.playerColor === 'white' ? 'White' : 'Black';
  const resultWord = params.result === 'win' ? 'a win' : params.result === 'loss' ? 'a loss' : 'a draw';
  const openingBit = params.openingName ? ` — ${params.openingName}.` : '.';
  const momentBit = params.mistakeCount > 0
    ? ` A few moments to review along the way.`
    : ` Mostly clean play — we'll flag what stood out.`;
  return `Let's walk through this game. You played ${colorWord} and finished with ${resultWord}${openingBit}${momentBit}`;
}

/**
 * Build the per-move walk-the-game narration for a completed coach
 * game. Dispatches two LLM calls in parallel: one for the short intro,
 * one for the per-ply segment JSON. Parsing failures degrade
 * gracefully — the ReviewNarration always returns a valid intro and a
 * segments array covering every ply, with `narration: null` for any
 * ply the LLM didn't cover.
 */
export async function generateReviewNarration(params: {
  moves: ReviewMoveInput[];
  playerColor: 'white' | 'black';
  openingName: string | null;
  result: string;
  playerRating: number;
}): Promise<ReviewNarration> {
  const { moves, playerColor, openingName, result, playerRating } = params;

  // Reconstruct FENs via chess.js so the UI can rewind cleanly.
  const fenChain = buildFenChain(moves);
  const usableCount = fenChain.length;

  // Count student mistakes for the intro tone.
  let mistakeCount = 0;
  for (const m of moves.slice(0, usableCount)) {
    if (m.isCoachMove) continue;
    if (m.classification === 'blunder' || m.classification === 'mistake' || m.classification === 'inaccuracy') {
      mistakeCount += 1;
    }
  }

  // Graceful empty case — if chess.js couldn't replay any moves, return
  // a minimal narration with just an intro so the UI can still mount.
  if (usableCount === 0) {
    return {
      intro: defaultIntroText({ playerColor, result, openingName, mistakeCount }),
      segments: [],
      closing: null,
    };
  }

  const perMoveBlock = buildPerMoveBlock(moves.slice(0, usableCount), playerColor);
  const introUserMessage = [
    `Student color: ${playerColor}.`,
    `Game result: ${result}.`,
    openingName ? `Opening: ${openingName}.` : 'Opening: (not classified).',
    `Student errors: ${mistakeCount} (blunders + mistakes + inaccuracies).`,
  ].join('\n');
  const segmentsUserMessage = [
    `Student color: ${playerColor}.`,
    `Game result: ${result}.`,
    openingName ? `Opening: ${openingName}.` : 'Opening: (not classified).',
    `Student rating: ~${playerRating}.`,
    '',
    perMoveBlock,
  ].join('\n');

  // WO-COACH-UNIFY-01 Review-tab parity: route both prep calls through
  // coachService.ask with surface='review' so the unified envelope
  // (REVIEW_MODE_ADDITION + memory + live-state) wraps the prep-scan
  // step too. Same shape as /coach/teach + /coach/play. The two
  // surface-specific prompts thread as systemPromptAddition.
  // Fire both in parallel so the review opens faster.
  const reviewLiveState = {
    surface: 'review' as const,
    fen: fenChain[fenChain.length - 1]?.fenAfter,
    userJustDid: 'Opening review of the completed game (prep scan)',
  };
  const stripErrorWrap = (text: string): string =>
    text.startsWith('(coach-brain provider error:') ? '' : text;
  const introPromise = coachService.ask(
    {
      surface: 'review',
      ask: introUserMessage,
      liveState: reviewLiveState,
    },
    {
      task: 'chat_response',
      maxTokens: 200,
      maxToolRoundTrips: 1,
      systemPromptAddition: REVIEW_INTRO_ADDITION,
    },
  ).then((a) => stripErrorWrap(a.text)).catch(() => '');

  // max_tokens: 8000 — the per-ply JSON array scales with game length
  // and the prior 2000 cap silently truncated output for games past ~20
  // plies, producing unparseable JSON and empty narration. Match the
  // "max_tokens is not a useful filter" posture from WO-POLISH-02.
  const segmentsPromise = coachService.ask(
    {
      surface: 'review',
      ask: segmentsUserMessage,
      liveState: reviewLiveState,
    },
    {
      task: 'game_narrative_summary',
      maxTokens: 8000,
      maxToolRoundTrips: 1,
      systemPromptAddition: REVIEW_MOVE_SEGMENT_ADDITION,
    },
  ).then((a) => stripErrorWrap(a.text)).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    void logAppAudit({
      kind: 'review-segments-parse-failed',
      category: 'subsystem',
      source: 'coachFeatureService.generateReviewNarration',
      summary: 'segments LLM call failed',
      details: msg,
    });
    return '';
  });

  const [introRaw, segmentsRaw] = await Promise.all([introPromise, segmentsPromise]);

  // Intro: use LLM response if non-empty and not the ⚠️ error placeholder;
  // else fall back to a grounded default.
  const introTrimmed = introRaw.trim();
  const intro = introTrimmed && !introTrimmed.startsWith('⚠️')
    ? introTrimmed
    : defaultIntroText({ playerColor, result, openingName, mistakeCount });

  // Parse per-ply segments. Build a lookup { ply → narration } with
  // relaxed validation — reject obviously-malformed entries but accept
  // anything that has a plausible ply + string-or-null narration.
  const parsed = parseSegmentsJson(segmentsRaw);
  const narrationByPly = new Map<number, string | null>();
  if (parsed) {
    for (const entry of parsed) {
      if (typeof entry !== 'object') continue;
      const plyVal = entry.ply;
      const narrationVal = entry.narration;
      if (typeof plyVal !== 'number' || !Number.isFinite(plyVal)) continue;
      const ply = Math.round(plyVal);
      if (ply < 1 || ply > usableCount) continue;
      if (narrationVal === null || narrationVal === undefined) {
        narrationByPly.set(ply, null);
      } else if (typeof narrationVal === 'string') {
        const trimmed = narrationVal.trim();
        narrationByPly.set(ply, trimmed.length > 0 ? trimmed : null);
      }
    }
  } else if (segmentsRaw) {
    void logAppAudit({
      kind: 'review-segments-parse-failed',
      category: 'subsystem',
      source: 'coachFeatureService.generateReviewNarration',
      summary: 'segments JSON parse failed — falling back to silent walk',
      details: segmentsRaw.slice(0, 300),
    });
  }

  // Stitch into ReviewMoveSegment[] with one entry per ply, narration
  // filled where the LLM provided one and null for ply gaps.
  const segments: ReviewMoveSegment[] = [];
  for (let i = 0; i < usableCount; i++) {
    const m = moves[i];
    const fenPair = fenChain[i];
    const fullMove = Math.ceil(m.ply / 2);
    const moverColor: 'white' | 'black' = m.ply % 2 === 1 ? 'white' : 'black';
    const bestUci = m.bestMove;
    // Prefer the LLM's per-ply narration. When it's missing (LLM
    // returned a null, omitted the ply, or the parse failed), fall
    // back to a deterministic one-liner so EVERY ply speaks. The user
    // has explicitly asked for narration on every move — silent plies
    // leave the student staring at the board with no audio. Production
    // audit (build 06b6d5d) showed only 6 of 10 plies narrated under
    // the old "null = silence" prompt; this fallback closes the gap
    // even when the LLM regresses.
    const llmNarration = narrationByPly.get(m.ply);
    const narration =
      llmNarration && llmNarration.trim().length > 0
        ? llmNarration
        : fallbackMoveNarration({
            san: m.san,
            color: moverColor,
            isStudentMove: !m.isCoachMove,
            classification: m.classification,
          });
    segments.push({
      ply: m.ply,
      moveNumber: fullMove,
      san: m.san,
      playerColor: moverColor,
      fenBefore: fenPair.fenBefore,
      fenAfter: fenPair.fenAfter,
      classification: m.classification,
      evalBefore: m.preMoveEval,
      evalAfter: m.evaluation,
      bestMoveSan: bestUci, // UCI is passed through as SAN when SAN isn't available
      bestMoveUci: bestUci,
      narration,
    });
  }

  const narratedCount = segments.filter((s) => s.narration !== null).length;
  void logAppAudit({
    kind: 'review-segments-generated',
    category: 'subsystem',
    source: 'coachFeatureService.generateReviewNarration',
    summary: `${narratedCount} of ${segments.length} plies narrated`,
    details: JSON.stringify({ totalSegments: segments.length, narratedCount }),
  });

  return { intro, segments, closing: null };
}
