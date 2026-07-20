import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { seeGain } from './positionReadingService';
import { explainBestMoveGrounded, explainMoveOrder, describeMoveMerit, describeSacrifice } from './groundedAnswer';
import { buildReviewMoveTeaching, buildReviewConversionTeaching, nameEndgamePhase } from './reviewMoveTeaching';
import { plyFactsForMove, plyFactsClause } from './pvPlayback';
import { buildMiddlegameOrientation, buildOpeningDevelopmentPlan } from './reviewStrategicOrientation';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { detectOpening } from './openingDetectionService';
import { resolveCuratedOpeningIdeas } from './reviewOpeningTheory';
import { detectPieceItineraries } from './reviewPieceItinerary';
import { pickStoryGame } from './reviewStoryGame';
import { sacrificeCompensation, enemyKingStuckInCenter, describeSacBreaksKingShield } from './reviewSacrifice';
import { detectForcedMatingSequence, explainMatingSacMechanism } from './reviewForcedSequence';
import { detectBadHabits } from './badHabitDetector';
import { db } from '../db/schema';
import { voiceFacts, voiceReviewLines } from './coachApi';
// Post-game review narration is now GROUNDED (David 2026-07-09): the intro,
// closing, and recap are COMPUTED from the engine annotations and phrased by
// `voiceFacts` — no coachService.ask / free-LLM prose, no per-move segment
// LLM call (those are deterministic via `buildReviewSegments`).
import { logAppAudit } from './appAuditor';
import { resolveCoachNarration } from '../utils/coachNarration';
import type { BadHabit, CoachContext, UserProfile, CoachNarration } from '../types';

// ─── Bad Habit Detection ────────────────────────────────────────────────────

// `detectBadHabits` now lives in the leaf `badHabitDetector` so the coach-chat
// grounding interception in `coachApi` can compute the FRESH habit profile
// without the coachApi↔coachFeatureService import cycle (WO stumbling-block #1).
// Re-exported here so existing consumers (StatsPage, CoachGamePage,
// gameAnalysisService) keep importing it from this module unchanged.
export { detectBadHabits };

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
  return gateReport('post_game_analysis', context, onStream);
}

// ─── Daily Lesson ───────────────────────────────────────────────────────────

export async function getDailyLesson(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return gateReport('daily_lesson', context, onStream);
}

// ─── Bad Habit Report ───────────────────────────────────────────────────────

export async function getBadHabitReport(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return gateReport('bad_habit_report', context, onStream);
}

// ─── Weekly Report ──────────────────────────────────────────────────────────

export async function getWeeklyReport(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return gateReport('weekly_report', context, onStream);
}

/** These report surfaces are non-board prose about the STUDENT's own data.
 *  GROUNDED (David 2026-07-09: one LLM command): the facts — rating, the
 *  computed bad-habit list, the recent-game count — are assembled in code and
 *  voiced through the one chokepoint. The LLM reasons about nothing, so the
 *  free getCoachCommentary + the groundCoachReply bandaid are gone. */
async function gateReport(
  task: 'post_game_analysis' | 'daily_lesson' | 'bad_habit_report' | 'weekly_report',
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const facts = await buildReportFacts(task, context);
  const voiced = (await voiceFacts(facts, { intent: `report:${task}`, warm: true })) ?? facts;
  if (onStream) onStream(voiced);
  return voiced;
}

/** Assemble the COMPUTED facts for a report — rating + the flagged bad habits
 *  (already computed by detectBadHabits), plus the recent-game count for the
 *  weekly view. Nothing here is invented; the LLM only phrases it. */
async function buildReportFacts(
  task: 'post_game_analysis' | 'daily_lesson' | 'bad_habit_report' | 'weekly_report',
  context: CoachContext,
): Promise<string> {
  const rating = context.playerProfile.rating;
  const weaknesses = context.playerProfile.weaknesses;
  const focusList = weaknesses.length > 0 ? weaknesses.map((w) => `- ${w}`).join('\n') : '';
  switch (task) {
    case 'bad_habit_report':
      return weaknesses.length > 0
        ? `The student's rating is ${rating}. Their currently-flagged recurring patterns to work on:\n${focusList}`
        : `The student's rating is ${rating}. No recurring bad habits are currently flagged.`;
    case 'daily_lesson':
      return weaknesses.length > 0
        ? `The student's rating is ${rating}. Today's single focus, drawn from their flagged patterns: ${weaknesses[0]}. The lesson is to drill that one pattern.`
        : `The student's rating is ${rating}. No specific weakness is flagged, so today's lesson is a balanced training session.`;
    case 'weekly_report': {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recent = await db.games.where('date').aboveOrEqual(weekAgo).count().catch(() => 0);
      const head = `The student's rating is ${rating}. They played ${recent} game(s) in the last seven days.`;
      return weaknesses.length > 0 ? `${head} Patterns still flagged to work on:\n${focusList}` : `${head} No recurring bad habits are currently flagged.`;
    }
    case 'post_game_analysis':
      return weaknesses.length > 0
        ? `The student's rating is ${rating}. Their flagged recurring patterns:\n${focusList}`
        : `The student's rating is ${rating}. No recurring patterns are currently flagged.`;
  }
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

export async function generateNarrativeSummary(
  _pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  playerRating: number,
  onStream?: (chunk: string) => void,
  moveData?: NarrativeMoveData[],
  /** Verbosity override for tests. Production reads the user's
   *  `coachNarration` profile setting (Settings → Coach). */
  verbosityOverride?: CoachNarration,
): Promise<string> {
  // No per-move analysis → bail out with the graceful fallback.
  // Writing prose from nothing is exactly the hallucination path
  // WO-REVIEW-01 closes.
  if (!moveData || moveData.length === 0) {
    onStream?.(NARRATIVE_SUMMARY_NO_DATA);
    return NARRATIVE_SUMMARY_NO_DATA;
  }

  // Verbosity tie-in (Bug D-2, David's 2026-05-19 directive on /
  // weaknesses): the recap honors the user's coachNarration setting.
  // silent → no recap at all (short stub); brief → 1-2 sentences;
  // full → the existing 2-4 moments / ~180 words. Drives both the
  // prompt's word/moment budget AND the max_tokens ceiling so the
  // generated text matches what's promised AND what the user pays
  // for downstream.
  const profile = await db.profiles.get('main').catch(() => null);
  const verbosity: CoachNarration = verbosityOverride ?? resolveCoachNarration(profile?.preferences);
  if (verbosity === 'silent') {
    const stub = 'Game complete. Open Full Review for analysis.';
    onStream?.(stub);
    return stub;
  }
  // GROUNDED (David 2026-07-09: "check every spoken word path" / G0). The
  // narrative recap is COMPUTED from the engine annotations (moveData) and
  // phrased by voiceFacts — never free-composed by the LLM. Routing a PGN
  // prompt through coachService.ask now trips the Q&A grounding seal (which
  // serves a one-line position-default, NOT a game recap), so the facts are
  // assembled here and voiced. The LLM only chooses words; every number,
  // move, and classification below is code-computed.
  // The STUDENT's own color — the recap counts THEIR errors, not the
  // opponent's (David 2026-07-19: the recap said "played cleanly" over a
  // "3 Inaccuracy" chip because this used to compare against the OPPONENT's
  // color — an inversion that counted the opponent's mistakes as the
  // student's, so the student's real inaccuracies were never tallied).
  const studentColorWB: 'White' | 'Black' = playerColor === 'white' ? 'White' : 'Black';

  // Count errors across ALL student (non-coach) moves + collect the flagged
  // moments (with the engine's preferred move + the eval swing) in ply order.
  let blunderCount = 0;
  let mistakeCount = 0;
  let inaccuracyCount = 0;
  const keyMoments: string[] = [];
  let prevEvalCp: number | null = 0;
  for (const m of moveData) {
    const moverColor: 'White' | 'Black' = m.moveNumber % 2 === 1 ? 'White' : 'Black';
    const isStudent = !m.isCoachMove && moverColor === studentColorWB;
    if (isStudent && m.classification === 'blunder') blunderCount++;
    else if (isStudent && m.classification === 'mistake') mistakeCount++;
    else if (isStudent && m.classification === 'inaccuracy') inaccuracyCount++;
    if (isStudent && (m.classification === 'blunder' || m.classification === 'mistake')) {
      const fullMove = Math.ceil(m.moveNumber / 2);
      const swing = prevEvalCp !== null && m.evaluation !== null
        ? ` (the evaluation moved from ${(prevEvalCp / 100).toFixed(1)} to ${(m.evaluation / 100).toFixed(1)})`
        : '';
      keyMoments.push(
        `On move ${fullMove}, ${m.san} was a ${m.classification}${m.bestMove ? `; the engine preferred ${m.bestMove}` : ''}${swing}.`,
      );
    }
    prevEvalCp = m.evaluation;
  }
  const totalErrors = blunderCount + mistakeCount + inaccuracyCount;

  // Result → student-relative outcome (computed, not asked).
  const outcomeClause =
    result === '1-0' || result === '0-1'
      ? (result === '1-0') === (playerColor === 'white')
        ? 'The student won.'
        : 'The student lost.'
      : result === '1/2-1/2' || result === '½-½'
        ? 'The game was a draw.'
        : `The game ended ${result}.`;
  const openingClause = openingName ? `the ${openingName}` : 'this game';

  // Verbosity caps the number of moments named (brief = 1) — the SAME hard
  // contract the old prompt tried to hint at, now enforced in code (G5).
  const momentBudget = verbosity === 'brief' ? 1 : 3;
  const errorClause =
    totalErrors === 0
      ? 'The engine flagged no blunders, mistakes, or inaccuracies — the student played cleanly.'
      : `The student made ${blunderCount} blunder(s), ${mistakeCount} mistake(s), and ${inaccuracyCount} inaccuracy/inaccuracies.`;
  const tipClause =
    totalErrors === 0
      ? 'Reinforce the accuracy and pick one sharper idea to try next game.'
      : 'The one thing to carry into the next game is to slow down on the flagged moment(s).';

  const factParts =
    verbosity === 'brief'
      ? [
          `Post-game recap of ${openingClause}. ${outcomeClause}`,
          errorClause,
          ...keyMoments.slice(0, momentBudget),
        ]
      : [
          `Post-game recap of ${openingClause} (student rated about ${playerRating}). ${outcomeClause}`,
          errorClause,
          ...keyMoments.slice(0, momentBudget),
          tipClause,
        ];
  const facts = factParts.filter(Boolean).join(' ');

  const voiced = (await voiceFacts(facts, { intent: `review-recap:${verbosity}`, warm: true })) ?? facts;
  onStream?.(voiced);
  return voiced;
}

// ─── Review Narration Segments ─────────────────────────────────────────────

export interface ReviewNarrationSegments {
  intro: string;
  closing: string;
}

export async function generateReviewNarrationSegments(
  _pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  playerRating: number,
  moveData?: NarrativeMoveData[],
): Promise<ReviewNarrationSegments> {
  // GROUNDED (David 2026-07-09: "check every spoken word path"). The intro +
  // closing are COMPUTED from the engine analysis (moveData) and voiced — not
  // free-LLM JSON generation (which the Q&A grounding seal now correctly
  // intercepts, breaking the old path). The facts are the opening, the
  // student-relative outcome, the error counts, and the flagged key moments;
  // voiceFacts phrases them warmly. The `_pgn` is unused — moveData carries
  // every fact the narration needs (G0: nothing is re-derived from the PGN).
  const studentColorWB: 'White' | 'Black' = playerColor === 'white' ? 'White' : 'Black';
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;
  const keyMoments: string[] = [];
  for (const m of moveData ?? []) {
    const moverColor: 'White' | 'Black' = m.moveNumber % 2 === 1 ? 'White' : 'Black';
    // Only the STUDENT's own errors are the review's subject (a coach/opponent
    // slip isn't the student's lesson). Compare against the STUDENT's color —
    // NOT the opponent's (the old `coachColor` inversion counted the wrong
    // side; David 2026-07-19).
    if (m.isCoachMove || moverColor !== studentColorWB) continue;
    if (m.classification === 'blunder') {
      blunders += 1;
      keyMoments.push(`move ${Math.ceil(m.moveNumber / 2)} ${m.san} (a blunder${m.bestMove ? `; the engine preferred ${m.bestMove}` : ''})`);
    } else if (m.classification === 'mistake') {
      mistakes += 1;
    } else if (m.classification === 'inaccuracy') {
      inaccuracies += 1;
    }
  }
  const total = blunders + mistakes + inaccuracies;
  const openingClause = openingName ? `the ${openingName}` : 'this game';
  const outcomeClause =
    result === '1-0' || result === '0-1'
      ? (result === '1-0') === (playerColor === 'white')
        ? 'The student won.'
        : 'The student lost.'
      : result === '1/2-1/2' || result === '½-½'
        ? 'The game was a draw.'
        : `The game ended ${result}.`;

  const introFacts = [
    `This is a review of ${openingClause} (student rated about ${playerRating}). ${outcomeClause}`,
    total > 0
      ? `The engine flagged ${total} moment(s) to look at — ${blunders} blunder(s) and ${mistakes} mistake(s).`
      : 'The engine flagged no significant errors in this game.',
    keyMoments.length > 0 ? `Watch especially for ${keyMoments.slice(0, 2).join(', and ')}.` : '',
  ].filter(Boolean).join(' ');

  const verdict =
    blunders >= 2 ? 'There were several blunders to address.'
    : blunders === 1 ? 'One blunder was the main turning point.'
    : total <= 1 ? 'This was cleanly played.'
    : 'A solid game with a few things to tighten up.';
  const closingFacts = [
    `In this game: ${blunders} blunder(s), ${mistakes} mistake(s), ${inaccuracies} inaccuracy/inaccuracies.`,
    verdict,
    'Keep practicing and learning from each game.',
  ].join(' ');

  const intro = (await voiceFacts(introFacts, { intent: 'review-intro', warm: true })) ?? introFacts;
  const closing = (await voiceFacts(closingFacts, { intent: 'review-closing', warm: true })) ?? closingFacts;
  return { intro, closing };
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
  /** Which builder produced `narration` — 'flag' | 'opening-plan' |
   *  'orientation' | 'per-move' | 'conversion' | 'endgame' | 'opponent'. Null
   *  when silent. Surfaced to PostHog per ply so a review session is queryable
   *  (David 2026-07-19: "if post game review doesn't send to posthog, fix it"). */
  narrationSource?: 'flag' | 'opening-plan' | 'orientation' | 'per-move' | 'conversion' | 'endgame' | 'opponent' | null;
  /** PLAN-IDEA arrows to lead the eye when this segment's narration is a plan
   *  beat (opening-development / middlegame orientation). The board stays put —
   *  these arrows SHOW the plan instead of moving pieces (David 2026-07-19).
   *  Undefined on ordinary moves. */
  planArrows?: Array<{ startSquare: string; endSquare: string; color: string }>;
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

// `parseSegmentsJson` + `buildPerMoveBlock` deleted in ship-3 — both
// only fed the legacy LLM segments call (REVIEW_MOVE_SEGMENT_ADDITION),
// which has been replaced by `buildReviewSegments` (deterministic).

/**
 * A grounded, structured citation for ONE of the student's flagged moves —
 * the G0 spine for the game recap + the inline board previews David asked for
 * (IMG_4298: "I don't have any visual reference for these words"). Every field
 * is COMPUTED from the engine annotations + chess.js, never the LLM: the LLM
 * only PHRASES from these, so it can't hallucinate a move/square (the "left
 * book at move 1" / "12.Bg5 would have pinned" class). The preview board
 * renders `fenBefore` with the played + suggested arrows from the squares here.
 */
export interface ReviewMoveCitation {
  /** Zero-based ply. */
  ply: number;
  /** 1-based full move number for display ("Move 12"). */
  moveNumber: number;
  /** The mover's side, so the UI can orient the preview board. */
  moverColor: 'white' | 'black';
  /** What the student actually played (SAN). */
  playedSan: string;
  /** The engine's best move at this position (SAN), or null if unknown. */
  suggestedSan: string | null;
  classification: 'inaccuracy' | 'mistake' | 'blunder';
  /** Position the student FACED (before the move) — the preview anchor. */
  fenBefore: string;
  /** Position after the played move. */
  fenAfter: string;
  /** Centipawns conceded by the played move (≥ 0), or null when eval data is
   *  missing. Used to rank "the biggest mistake". */
  evalSwingCp: number | null;
  /** [from, to] of the played move, for a red preview arrow. */
  playedSquares: [string, string] | null;
  /** [from, to] of the engine's best move, for a green preview arrow. */
  suggestedSquares: [string, string] | null;
  /** Grounded one-line "why the engine's move was better" — the board
   *  geometry (pin / tempo / check / material) from `explainMoveOrder`,
   *  computed not LLM'd. Null when there's no suggestion or no concrete
   *  mechanism (empty > generic > invented). David 2026-06-27: "I want to
   *  hear the coach say why the move was better." */
  whyBetter: string | null;
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

/** Convert a UCI move (e.g., "e2e4", "g7g8q") to SAN at the given
 *  pre-move FEN. Returns null when the UCI is missing or chess.js
 *  can't legally play the move from that position. Used by the
 *  deterministic narration builder to surface "best move" SANs in
 *  the per-ply prose. */
function uciToSanAt(uci: string | null, fenBefore: string): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fenBefore);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move.san;
  } catch {
    return null;
  }
}

/**
 * buildReviewCitations — extract the student's flagged moves as a structured,
 * grounded list (G0). The recap phrases from these and the board previews
 * render from these; nothing about a cited move comes from the LLM. Returned
 * in ply order (chronological); the caller sorts by `evalSwingCp` / severity
 * for "the biggest mistake". Coach moves and clean moves are excluded.
 */
export function buildReviewCitations(
  moves: ReviewMoveInput[],
  playerColor: 'white' | 'black',
): ReviewMoveCitation[] {
  const FLAGGED = new Set(['inaccuracy', 'mistake', 'blunder']);
  // `ply` is 1-based (ply 1 = White's first move), so White moves on ODD plies.
  const studentIsWhite = playerColor === 'white';
  const chain = buildFenChain(moves);
  const out: ReviewMoveCitation[] = [];

  for (let i = 0; i < chain.length; i++) {
    const m = moves[i];
    const isWhiteMove = m.ply % 2 === 1;
    // Only the STUDENT's flagged moves belong in the recap. In an imported
    // game the opponent isn't `isCoachMove`, so filter by color (and skip
    // coach moves defensively for vs-coach games).
    if (m.isCoachMove) continue;
    if (isWhiteMove !== studentIsWhite) continue;
    if (!m.classification || !FLAGGED.has(m.classification)) continue;
    const fenBefore = chain[i].fenBefore;

    // Played-move squares — replay the SAN on the pre-move position.
    let playedSquares: [string, string] | null = null;
    try {
      const c = new Chess(fenBefore);
      const mv = c.move(m.san);
      if (mv) playedSquares = [mv.from, mv.to];
    } catch { /* leave null — never guess squares */ }

    const suggestedSan = uciToSanAt(m.bestMove, fenBefore);
    const suggestedSquares: [string, string] | null =
      m.bestMove && m.bestMove.length >= 4
        ? [m.bestMove.slice(0, 2), m.bestMove.slice(2, 4)]
        : null;

    const evalSwingCp =
      m.preMoveEval !== null && m.evaluation !== null
        ? Math.abs(m.preMoveEval - m.evaluation)
        : null;

    // Grounded "why the engine's move was better" — same position, the
    // suggestion is the better order, the played move the worse. Pure board
    // geometry (pin/tempo/check/material); null when no concrete mechanism.
    const whyBetter = suggestedSan
      ? explainMoveOrder({
          fenBefore,
          betterSan: suggestedSan,
          worseSan: m.san,
          moverColor: isWhiteMove ? 'white' : 'black',
        })?.text ?? null
      : null;

    out.push({
      ply: m.ply,
      moveNumber: Math.ceil(m.ply / 2),
      moverColor: isWhiteMove ? 'white' : 'black',
      playedSan: m.san,
      suggestedSan,
      classification: m.classification as 'inaccuracy' | 'mistake' | 'blunder',
      fenBefore,
      fenAfter: chain[i].fenAfter,
      evalSwingCp,
      playedSquares,
      suggestedSquares,
      whyBetter,
    });
  }

  return out;
}

/**
 * Deterministic per-ply narration. Drives the walk-the-game banner
 * directly from the engine annotations — no LLM segments call (ship-3).
 *
 * Follows CLAUDE.md narration voice rules:
 *   - Silent on `book` / `good` / `null` (rule #4 — silence is OK).
 *   - No "great job" / "well played" filler on routine moves (rule #5).
 *   - Talks about the move's chess content (best alternative + swing in
 *     pawns), not the interface or restating the SAN (rules #2/3).
 *   - 3 stem variants per classification rotate by ply so the narration
 *     doesn't read like a metronome across 40 moves (rule #9).
 *
 * Returns `null` when the position deserves silence. The walk UI
 * already renders "(this move passes silently…)" for null narrations.
 */
function buildDeterministicNarration(params: {
  ply: number;
  isStudentMove: boolean;
  classification: import('../types').MoveClassification | null;
  bestMoveSan: string | null;
  preMoveEval: number | null;
  evaluation: number | null;
  /** Board BEFORE the move + the move played + the mover's colour — so a
   *  strong/brilliant move can be explained by WHAT IT DID on the board
   *  (David 2026-07-10: no more "Strong, accurate move" filler). */
  fenBefore: string;
  playedSan: string;
  moverColor: 'white' | 'black';
}): string | null {
  const { ply, isStudentMove, classification, bestMoveSan, preMoveEval, evaluation, fenBefore, playedSan, moverColor } = params;
  if (classification === null || classification === 'book' || classification === 'good') {
    return null;
  }

  const variant = ply % 3;

  // The student's eval AFTER the move, in words — the honest fallback when a
  // strong move has no nameable geometry (a quiet consolidating move). Grounded
  // in the engine eval, never praise-for-praise's-sake.
  const studentEvalCp = evaluation === null ? null : (moverColor === 'white' ? evaluation : -evaluation);
  const studentEvalWord =
    studentEvalCp === null ? null
      : studentEvalCp >= 300 ? "you're winning"
      : studentEvalCp >= 100 ? "you're clearly better"
      : studentEvalCp >= 40 ? 'you hold a pull'
      : studentEvalCp >= -40 ? 'the position stays balanced'
      : null;

  // Swing magnitude in pawns (positive = how much the moving side
  // conceded). Both evals are centipawns, white POV; the absolute
  // difference is the swing regardless of moving side because the
  // classification flags the bad direction.
  const swingPawns =
    preMoveEval !== null && evaluation !== null
      ? Math.abs((preMoveEval - evaluation) / 100)
      : null;
  // A mate score is stored as a huge sentinel cp; dividing it by 100 printed
  // nonsense like "Drops about 299.5 pawns" (David 2026-07-20, F9). Anything
  // past ~20 pawns is beyond any real material swing → it's a decisive /
  // mating turn, so say THAT instead of a bogus pawn count. Board truth.
  const MATE_MAGNITUDE_CP = 5000;
  const swingIsDecisive =
    (preMoveEval !== null && Math.abs(preMoveEval) >= MATE_MAGNITUDE_CP) ||
    (evaluation !== null && Math.abs(evaluation) >= MATE_MAGNITUDE_CP) ||
    (swingPawns !== null && swingPawns >= 20);
  const swingPhrase =
    swingIsDecisive
      ? ' A game-deciding swing.'
      : swingPawns !== null && swingPawns >= 0.1
        ? ` Drops about ${swingPawns.toFixed(1)} pawns.`
        : '';

  // WHY a strong move was strong — the concrete thing it DID on the board,
  // computed from chess.js (G3), never generic praise (David 2026-07-10). The
  // move is SOUND by classification (brilliant/great), so a piece it gives up is
  // a real sacrifice (decoy/deflection), not a hang — name it as such rather
  // than mislabel it as development or fall silent.
  const playedMerit = isStudentMove
    ? (describeMoveMerit(fenBefore, playedSan, moverColor) ?? describeSacrifice(fenBefore, playedSan))
    : null;

  if (classification === 'brilliant') {
    if (isStudentMove) {
      if (playedMerit) return `And there it is — it ${playedMerit}.`;
      const stems = [
        'And there it is — that was the move.',
        'Brilliant find. This was the game.',
        'There it is. The position asked for exactly this.',
      ];
      return stems[variant];
    }
    return 'Brilliant shot — your opponent found the only line.';
  }

  if (classification === 'great') {
    if (!isStudentMove) return null;
    // NO "Strong, accurate move." filler — say WHAT the move accomplished.
    // A sacrifice pairs with the eval so the student sees it's sound.
    if (playedMerit) {
      const isSac = playedMerit.startsWith('sacrifices');
      return isSac && studentEvalWord ? `It ${playedMerit} — and ${studentEvalWord}. Clean.` : `It ${playedMerit}. Clean.`;
    }
    // No nameable tactic — but a quiet keystone (a castle, a developing move) still
    // has a CONCRETE lesson. Prefer it over generic praise so a strong castling
    // move keeps "king to safety, rook to the open centre" instead of falling to
    // "Accurate — you're winning" (audit 2026-07-20: O-O-O graded GREAT lost its
    // teaching). Only fall back to the eval line when there's no concrete note.
    const concrete = buildReviewMoveTeaching(fenBefore, playedSan);
    if (concrete) return concrete;
    return studentEvalWord ? `Accurate — ${studentEvalWord}. Simple chess.` : null;
  }

  if (classification === 'miss') {
    if (bestMoveSan) {
      return `You had something here — ${bestMoveSan} was sitting right there.`;
    }
    return 'Missed chance here — the engine had a stronger continuation.';
  }

  if (classification === 'inaccuracy') {
    if (isStudentMove) {
      if (bestMoveSan) {
        const stems = [
          `Slightly off — ${bestMoveSan} was sharper.`,
          `${bestMoveSan} keeps the edge; this lets a little of it slip.`,
          `The precise move was ${bestMoveSan}. Small thing, but it adds up.`,
        ];
        return stems[variant];
      }
      return 'A small inaccuracy — there was a more precise move available.';
    }
    if (bestMoveSan) {
      return `Your opponent slipped — ${bestMoveSan} was stronger.`;
    }
    return null;
  }

  if (classification === 'mistake') {
    if (isStudentMove) {
      if (bestMoveSan) {
        const stems = [
          `This one gives back real ground — ${bestMoveSan} held the position.${swingPhrase}`,
          `${bestMoveSan} was the move; this hands the initiative back.${swingPhrase}`,
          `A real concession. ${bestMoveSan} kept everything together.${swingPhrase}`,
        ];
        return stems[variant];
      }
      return `A real mistake — the engine had a stronger continuation.${swingPhrase}`;
    }
    if (bestMoveSan) {
      return `Your opponent erred — ${bestMoveSan} was much better.${swingPhrase}`;
    }
    return `Your opponent gave ground here.${swingPhrase}`;
  }

  if (classification === 'blunder') {
    if (isStudentMove) {
      if (bestMoveSan) {
        const stems = [
          `This is the moment — ${bestMoveSan} keeps you right in it.${swingPhrase}`,
          `Costly. Find ${bestMoveSan} here and the game holds.${swingPhrase}`,
          `${bestMoveSan} was sitting right there — this one changes the game.${swingPhrase}`,
        ];
        return stems[variant];
      }
      return `A genuine blunder — the engine had a much stronger continuation.${swingPhrase}`;
    }
    if (bestMoveSan) {
      return `Your opponent blundered — ${bestMoveSan} would have held.${swingPhrase}`;
    }
    return `Your opponent blundered here.${swingPhrase}`;
  }

  return null;
}

/**
 * Build the full `ReviewMoveSegment[]` deterministically from the
 * per-ply annotations + a reconstructed FEN chain. Exported for tests;
 * `generateReviewNarration` calls this directly. Replaces the LLM
 * segments call that used to drive the walk (ship-3) — see the
 * generateReviewNarration commentary for the rationale.
 */
// explainBestMoveGrounded + its piece constants moved to ./groundedAnswer (the
// pure leaf) 2026-06-10 to break the coachApi import cycle. Imported above.

/** Through this ply, the STUDENT's silent (good/book) moves get a grounded
 *  teaching note so the walk actually teaches the opening (R2), not just
 *  badges it. Beyond it we honor R8 (silence in conversion) and only narrate
 *  flagged moments. ~move 12 covers the opening + early middlegame. */
const OPENING_TEACH_MAX_PLY = 24;
/** The opening DEVELOPING-plan beat fires early — once the opening is identified
 *  and enough pieces are out to describe a plan (~move 3), but before the
 *  middlegame orientation takes over. */
const OPENING_PLAN_MIN_PLY = 6;
const OPENING_PLAN_MAX_PLY = 14;
/** §1/§2: the one-shot middlegame orientation (structure anchor + both sides'
 *  plans) fires no earlier than ~move 8, once the pawn structure has taken
 *  shape enough for the majorities to be real. */
const MIDDLEGAME_ORIENTATION_MIN_PLY = 16;

/** Best-effort budgets for the review's two LLM warming passes (see
 *  `raceTimeout`). On timeout the walk ships the deterministic, still-grounded
 *  templates rather than hanging "Preparing…". Worst case ≈ 55s to ready. */
const REVIEW_INTRO_VOICE_TIMEOUT_MS = 18000;
const REVIEW_HOUSE_VOICE_TIMEOUT_MS = 38000;

export function buildReviewSegments(
  moves: ReviewMoveInput[],
  /** The student's color — when provided, their silent opening moves are
   *  filled with a grounded per-move "why" (R2). Omitted in unit tests that
   *  only exercise the flag narration → behaves exactly as before. */
  playerColor?: 'white' | 'black',
  /** The game's opening name — feeds the OPENING-SPECIFIC development plan
   *  (David 2026-07-20). When it's a curated opening, the plan beat leads with
   *  that opening's own key idea instead of the generic "develop the minors". */
  openingName?: string | null,
): ReviewMoveSegment[] {
  // Curated, opening-specific ideas for the dev-plan beat (null → uncurated).
  const curatedOpeningIdeas = resolveCuratedOpeningIdeas(openingName ?? null);
  // §1 piece-route itineraries — the student's REAL reroutes in this game
  // ("f3–d2–c4"), keyed by the ply the maneuver completes (G3, from the moves).
  const pieceItineraries = playerColor
    ? detectPieceItineraries(moves.map((m) => m.san), playerColor, { budget: 2 })
    : new Map<number, { text: string }>();
  const fenChain = buildFenChain(moves);
  const usable = fenChain.length;
  const segments: ReviewMoveSegment[] = [];
  // §7: the endgame phase is announced once per game (the first quiet student
  // move that's in a readable endgame), not on every endgame ply.
  let endgameAnnounced = false;
  // Plan-idea beats, each fired once on an eligible student move: the opening
  // developing plan (when the opening is identified) and the middlegame
  // orientation (structure anchor + both-sides plans).
  let openingPlanShown = false;
  let orientationShown = false;
  // Opponent-commentary dedup — name each target square at most once, and cap
  // the total so the lighter developing reads never spam (Danya comments the
  // opponent ~50-60% of moves, not every one).
  // Opponent target-read dedup — name each target square at most once (David
  // 2026-07-20: "always narrate both sides" — no count cap; the dedup is the only
  // throttle, and the PlyFacts fallback narrates every other eventful opp move).
  const oppTargetsSeen = new Set<string>();
  // Opponent-psychology read state — was the opponent's LAST move an error, and
  // have we already noted the snowball once?
  let lastOpponentWasError = false;
  let psychologyReadDone = false;
  // Opponent structure + development read — a once-per-game observation (David
  // 2026-07-19 live test). Accumulate the opponent's own SANs as we walk.
  const opponentSans: string[] = [];
  let opponentDevReadShown = false;
  // Variation re-naming inside the walk (A2 — Danya names the line as it takes
  // shape). Accumulate ALL sans; announce each new, more-specific opening name
  // once, in order, on a quiet opening move (grounded via detectOpening).
  const allSans: string[] = [];
  const announcedOpeningNames = new Set<string>();
  let lastAnnouncedOpeningName: string | null = null;
  // §6 story-as-evidence — a cited illustrative game from the VERIFIED corpus,
  // spoken once per game (never invented). Null when the opening has no model game.
  const storyGame = openingName ? pickStoryGame(openingName) : null;
  let storyShown = false;
  // The full sacrifice-compensation profile (king-stuck / dev-lead / verdict)
  // fires ONCE per game — a combination of several sacs shares one compensation,
  // so re-listing it verbatim on each is robotic. Later sacs are still NAMED.
  let sacCompShown = false;
  // The "their king is stuck in the centre" keystone is taught at most ONCE per
  // game — whether by the sacrifice compensation or the standalone beat below.
  let kingCenterTaught = false;
  // FORCED-SEQUENCE framing (the forcing-move / "calculate to the end" concept):
  // if the game ends in a forced checking run, frame it at its first move so the
  // student learns to SEE a forced finish, then the walk plays it out. Board-true.
  const sansForRun = moves.slice(0, usable).map((mm) => mm.san);
  const forcedRun = detectForcedMatingSequence(sansForRun);
  const studentColorWB: 'w' | 'b' | null = playerColor === 'white' ? 'w' : playerColor === 'black' ? 'b' : null;
  // Prev-capture context so the PlyFacts material calc can tell a RECAPTURE
  // (even trade → 0) from a genuine win (David 2026-07-20 Opera nitpick). Holds
  // the PREVIOUS move's capture; updated at the end of each iteration.
  const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let prevCap: { square: string | null; capturedValue: number } = { square: null, capturedValue: 0 };
  for (let i = 0; i < usable; i++) {
    const m = moves[i];
    const fenPair = fenChain[i];
    const fullMove = Math.ceil(m.ply / 2);
    const moverColor: 'white' | 'black' = m.ply % 2 === 1 ? 'white' : 'black';
    // Track the opponent's own moves for the development read below.
    if (moverColor !== playerColor) opponentSans.push(m.san);
    // Track every SAN for the live variation-naming beat below.
    allSans.push(m.san);
    const rawBestSan = uciToSanAt(m.bestMove, fenPair.fenBefore);
    // Defense-in-depth for games analysed BEFORE the source fix: never name the
    // move that was actually played as the "better" move. If the stored best
    // move resolves to the played SAN, treat it as absent so the narration uses
    // its no-alternative phrasing (or stays silent) instead of the incoherent
    // "<played move> was stronger" (David 2026-06-11).
    const stripGlyphs = (s: string): string => s.replace(/[+#!?]+$/, '');
    const bestMoveSan = rawBestSan && stripGlyphs(rawBestSan) !== stripGlyphs(m.san) ? rawBestSan : null;
    let narration = buildDeterministicNarration({
      ply: m.ply,
      // Key student-vs-opponent framing on COLOR when the student's color is
      // known — isCoachMove is false for BOTH sides in an imported/reviewed game
      // (documented gotcha), so `!m.isCoachMove` marked every opponent move as the
      // student's and gave the opponent's forced recapture the student-blunder
      // voice ("Ouch — that one hurts" on Black's Nxd7; audit 2026-07-20). When
      // playerColor is omitted (flag-only unit tests), fall back to the old
      // isCoachMove signal so the mover is treated as the student.
      isStudentMove: playerColor ? moverColor === playerColor : !m.isCoachMove,
      classification: m.classification,
      bestMoveSan,
      preMoveEval: m.preMoveEval,
      evaluation: m.evaluation,
      fenBefore: fenPair.fenBefore,
      playedSan: m.san,
      moverColor,
    });
    // Append the GROUNDED "why the best move is best" clause — chess.js
    // board truth only, never LLM-guessed (David 2026-06-05). Only on the
    // student's flagged errors, only when there's a genuine distinct best
    // move, and only when a board fact is provable.
    if (narration && bestMoveSan && !m.isCoachMove && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy' || m.classification === 'miss')) {
      const why = explainBestMoveGrounded(fenPair.fenBefore, m.san, m.bestMove, moverColor);
      if (why) narration = `${narration} ${why}`;
    }
    // Don't scold a near-FORCED recapture the engine only dings as an inaccuracy/
    // mistake (David 2026-07-20 Opera nitpick: the loser's forced takes-back got
    // "Qb4+ was the try" nags). If this move recaptures on the square the opponent
    // just captured, and it's not an outright blunder, drop the "X was stronger"
    // scold — they had to take back. A neutral fact beat may still fill below.
    if (narration && (m.classification === 'inaccuracy' || m.classification === 'mistake')) {
      try {
        const rc = new Chess(fenPair.fenBefore).move(m.san);
        if (rc && prevCap.square === rc.to) narration = null;
      } catch { /* keep the narration */ }
    }
    // Track WHICH builder produced the narration (surfaced to PostHog per ply).
    let narrationSource: ReviewMoveSegment['narrationSource'] = narration ? 'flag' : null;
    // 🎯 SOUND SACRIFICE — the single most important thing to say about the move,
    // so it OVERRIDES the generic merit / itinerary / plan beats (David 2026-07-20
    // Opera nitpick: the knight sac was narrated as "a reroute", the queen sac as
    // "just a check"). A move that hands over NET material (describeSacrifice, pure
    // SEE board-truth) AND the engine did NOT flag as an error (null/book/good/
    // great/brilliant) is a real, sound sacrifice — name it as one, at a register
    // that scales with the classification. The queen sac is the peak beat.
    const isSoundNonError = m.classification === null || m.classification === 'book'
      || m.classification === 'good' || m.classification === 'great' || m.classification === 'brilliant';
    // A move is a SACRIFICE when the opponent wins back MORE than the mover just
    // captured — net material handed over ≥ 1 pawn (a knight-for-two-pawns like
    // Nxb5 nets −1; describeSacrifice's ≥2 threshold misses it). A move that WINS
    // material (Bxd7+ nets +2) is not a sac. Pure SEE board-truth (G0).
    let sacInfo: { piece: string; sq: string } | null = null;
    if (isSoundNonError && !m.isCoachMove) {
      try {
        const sb = new Chess(fenPair.fenBefore);
        const smv = sb.move(m.san);
        if (smv) {
          const capVal = smv.captured ? (PIECE_PTS[smv.captured] ?? 0) : 0;
          const oppWins = seeGain(sb, smv.to as Square);
          if (oppWins - capVal >= 1) {
            sacInfo = { piece: ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const)[smv.piece] ?? 'piece', sq: smv.to };
          }
        }
      } catch { sacInfo = null; }
    }
    if (sacInfo) {
      const sq = sacInfo.sq;
      const piece = sacInfo.piece;
      const isStudentSac = moverColor === playerColor;
      const subjCap = isStudentSac ? 'You' : 'Your opponent';
      const s = isStudentSac ? '' : 's'; // verb suffix ("you give" vs "your opponent gives")
      const withCheck = /\+$/.test(m.san) ? ', and it lands with check' : '';
      const top = m.classification === 'brilliant' || m.classification === 'great';
      // TEACH the compensation, don't ASSERT it (David 2026-07-20: narrating vs
      // teaching). Name the board-true reasons the piece is worth giving —
      // king-stuck-in-centre / development lead / the winning verdict — computed
      // from the position AFTER the sac + the eval. Only for the STUDENT's sac
      // (the "you get X for it" framing is the student's payoff); the opponent's
      // sac keeps the plain naming.
      let comp = isStudentSac && !sacCompShown
        ? sacrificeCompensation(
            fenPair.fenAfter,
            moverColor === 'white' ? 'w' : 'b',
            m.evaluation != null ? (moverColor === 'white' ? m.evaluation : -m.evaluation) : null,
          )
        : [];
      // If a standalone beat already taught "king stuck in the centre", drop that
      // clause here so the keystone is never stated twice.
      if (kingCenterTaught) comp = comp.filter((c) => !/stuck in the cent/i.test(c));
      if (comp.length > 0) sacCompShown = true;
      if (comp.some((c) => /stuck in the cent/i.test(c))) kingCenterTaught = true;
      const payoff = comp.length > 0 ? ` Look what you get for it: ${joinClauses(comp)}.` : '';
      // THE MECHANISM — the deepest "why" (David 2026-07-20: "where is the
      // teaching moment, the WHY? … one sentence per move doesn't cover it").
      // When this sac is a mating sac whose forced recapture DEFLECTS/CLEARS a
      // defender off the mating line, explain that line-clearance in a full
      // sentence. Board-true (chess.js replay). Only the student's own sac.
      const mechanismClause = isStudentSac
        ? explainMatingSacMechanism(sansForRun, m.ply - 1)
        : null;
      const mechanism = mechanismClause ? ` Here's why it works: ${mechanismClause}.` : '';
      // A positional / exchange sacrifice that isn't a DIRECT mating sac still has
      // a concrete point: it rips a defender off the enemy king. When the mating
      // mechanism doesn't apply, teach THAT instead of the generic "for the
      // initiative" (David 2026-07-20 Opera: Rxd7 "still sounds generic"). This
      // clause NAMES the material give + the point, so it's the base sentence.
      const kingShieldClause = isStudentSac && !mechanismClause
        ? describeSacBreaksKingShield(fenPair.fenBefore, m.san)
        : null;
      if (piece === 'queen') {
        // The peak. A queen sacrifice the engine rates top is the point of the
        // whole attack — say so, don't call it "a check". Compose the full
        // teaching passage: name → mechanism (why) → compensation payoff.
        narration = top
          ? `There it is — the queen sacrifice on ${sq}${withCheck}. The boldest move on the board, and this is the point the whole attack was building toward.${mechanism}${payoff}`
          : `${subjCap} offer${s} the queen on ${sq}${withCheck} — a stunning sacrifice.${mechanism}${payoff}`;
      } else if (kingShieldClause) {
        // Exchange/positional sac that tears a shield off the king — the clause
        // names both the give and the point; append any fresh compensation.
        narration = `${kingShieldClause}${withCheck}.${payoff}`;
      } else if (mechanism || payoff) {
        narration = `${subjCap} sacrifice${s} the ${piece} on ${sq}${withCheck}.${mechanism}${payoff}`;
      } else {
        narration = top
          ? `${subjCap} sacrifice${s} the ${piece} on ${sq}${withCheck} — a real sacrifice for the initiative.`
          : `${subjCap} give${s} up the ${piece} on ${sq}${withCheck} — a real sacrifice for the initiative.`;
      }
      narrationSource = 'flag';
    }
    // FORCED-FINISH framing — at the first move of a forced checking run to mate,
    // teach the "it's forced, calculate to the end" concept, then let the walk
    // play it out. Prepends to a sac/flag line, else sets it. Board-true (the run
    // is detected from inCheck() + the check markers). The mate move itself is
    // still named by the conversion beat at the end.
    if (forcedRun && m.ply === forcedRun.startPly) {
      const framing = "Here's the finish — from this move on it's forced. Every move is a check, the king has no square to run to, and it ends in mate. Watch it land.";
      narration = narration ? `${framing} ${narration}` : framing;
      narrationSource = narrationSource ?? 'flag';
    }
    // OPPONENT-PSYCHOLOGY read (Danya register #14: "once one side starts to
    // decline, more mistakes appear"). When the opponent errs on CONSECUTIVE
    // moves, note the unravelling ONCE — a real pattern from the classification
    // sequence (G0), which the house voice then phrases. Only the opponent's own
    // flagged moves; the flag narration already exists to append to.
    const thisIsOppError = moverColor !== playerColor
      && (m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder');
    if (narration && narrationSource === 'flag' && thisIsOppError && lastOpponentWasError && !psychologyReadDone) {
      narration = `${narration} And once your opponent started slipping, the mistakes are snowballing.`;
      psychologyReadDone = true;
    }
    if (moverColor !== playerColor) lastOpponentWasError = thisIsOppError;
    // Teach the STUDENT's silent opening moves (R2). Only good/book moves in
    // the opening phase (flagged moves already narrate above); only the
    // student's own side; only board-true notes (null → stays silent, better
    // than generic filler). This is what makes the walk a coach, not a badge-
    // labeler (David 2026-07-19: "there is no coach narration").
    // PLAN-IDEA beats — shown with ARROWS, not by moving pieces (David
    // 2026-07-19). Two one-shots on the student's own quiet moves.
    // A "concrete" move (capture / check / castle) is NOT a quiet positional
    // move — it has its own board content, and a generic plan beat there is
    // wrong (David 2026-07-20 Opera nitpick: O-O-O got a "queenside majority
    // endgame" plan; Bxb5+ too). Let those fall through to the per-move teaching.
    const isConcreteMove = /[x+#]/.test(m.san) || m.san.startsWith('O-O');
    let planArrows: ReviewMoveSegment['planArrows'];
    // (a) Opening DEVELOPING plan, fired once when the opening is identified.
    if (
      narration === null
      && !isConcreteMove
      && studentColorWB !== null
      && !openingPlanShown
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply >= OPENING_PLAN_MIN_PLY
      && m.ply <= OPENING_PLAN_MAX_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const dev = buildOpeningDevelopmentPlan(fenPair.fenBefore, studentColorWB, { openingName: openingName ?? null, curatedIdeas: curatedOpeningIdeas });
      if (dev) { narration = dev.text; planArrows = dev.arrows; openingPlanShown = true; narrationSource = 'opening-plan'; }
    }
    // (b) Middlegame orientation (structure anchor + both-sides plans), fired
    // once at/after the middlegame threshold. Takes priority over the per-move
    // opening note in that zone; silent when no clear structural plan exists.
    if (
      narration === null
      && !isConcreteMove
      && studentColorWB !== null
      && !orientationShown
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply >= MIDDLEGAME_ORIENTATION_MIN_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
      // A slow "advance your pawn majority" plan is a NON-APPLICABLE reason while
      // the enemy king is exposed in the centre — that's a king-hunt, not a
      // majority grind (David 2026-07-20: "don't overstate the why … Rd1 got a
      // queenside-majority-endgame plan mid-mating-attack"). Board-true gate.
      && !enemyKingStuckInCenter(fenPair.fenBefore, studentColorWB)
    ) {
      const orientation = buildMiddlegameOrientation(fenPair.fenBefore, studentColorWB);
      if (orientation) { narration = orientation.text; planArrows = orientation.arrows; orientationShown = true; narrationSource = 'orientation'; }
    }
    // (c) KING-STUCK-IN-THE-CENTRE — the keystone attacking concept, taught as a
    // TEACHING beat (not just inside a sacrifice). Once per game, on the student's
    // own move, when the enemy king is genuinely exposed in the centre (past the
    // opening, central king, open central file — board-true predicate). Skipped if
    // a sacrifice already taught it. This is the "read the position, know when to
    // attack" lesson the coach was missing (David 2026-07-20, narrating→teaching).
    if (
      narration === null
      && !kingCenterTaught
      && studentColorWB !== null
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply >= 12
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
      && enemyKingStuckInCenter(fenPair.fenAfter, studentColorWB)
    ) {
      narration = 'Look at their king — still in the centre, no castling in sight, and the files are opening around it. That is your cue: this is the moment to throw your pieces at it, before they ever wriggle to safety.';
      narrationSource = 'orientation';
      kingCenterTaught = true;
    }
    // VARIATION RE-NAMING (A2) — name the line as it takes shape (Danya: "now
    // we're in the Najdorf"). Announce each newly-reached named opening once, in
    // order, on a quiet opening move. Grounded via detectOpening on the sans so
    // far (the DB trie, never invented). Fires on EITHER side's move — the name
    // is a property of the position, not who's to move.
    if (
      narration === null
      && m.ply >= 4
      && m.ply <= OPENING_TEACH_MAX_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const named = detectOpening(allSans)?.name ?? null;
      if (named && named !== lastAnnouncedOpeningName && !announcedOpeningNames.has(named)) {
        const first = announcedOpeningNames.size === 0;
        announcedOpeningNames.add(named);
        lastAnnouncedOpeningName = named;
        narration = first ? `You're playing into the ${named}.` : `This has become the ${named}.`;
        narrationSource = 'opening-plan';
      }
    }
    // §1 PIECE ITINERARY — narrate the student's real reroute as a journey
    // ("f3–d2–c4") on the ply it completes. Grounded in their own moves (G3);
    // fires on a quiet student move so it doesn't clobber a flag/plan beat.
    if (
      narration === null
      && !isConcreteMove
      && moverColor === playerColor
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const itin = pieceItineraries.get(m.ply);
      if (itin) { narration = itin.text; narrationSource = 'per-move'; }
    }
    // §6 STORY-AS-EVIDENCE — once per game, name a cited master game for this
    // opening (from the verified corpus). Fires in the early middlegame on a
    // quiet student move, so it lands as the position takes shape.
    if (
      narration === null
      && storyGame
      && !storyShown
      && moverColor === playerColor
      && m.ply >= 12
      && m.ply <= 26
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      narration = storyGame.text;
      narrationSource = 'opening-plan';
      storyShown = true;
    }
    if (
      narration === null
      && playerColor !== undefined
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply <= OPENING_TEACH_MAX_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      // Rich PlyFacts FIRST (the same deep computer the best-move lines use —
      // David 2026-07-20 "the best move lines have way better narration"), then
      // the thinner teaching note. Both are grounded; the rich one just fires on
      // far more moves so the walk stops going silent on eventful ones.
      narration = plyFactsForMove(fenPair.fenBefore, m.san, prevCap) ?? buildReviewMoveTeaching(fenPair.fenBefore, m.san);
      if (narration) narrationSource = 'per-move';
    }
    // §7 CONVERSION / ENDGAME: past the opening cap the walk was "badges only".
    // Name the mate PATTERN (back-rank / smothered) on the move that delivers
    // it, and announce the ENDGAME PHASE exactly ONCE (the first quiet student
    // move that's in a readable endgame). Else stay silent — no middlegame
    // filler. Student's own non-flagged moves only; flagged moves narrate above.
    if (
      narration === null
      && playerColor !== undefined
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply > OPENING_TEACH_MAX_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      narration = buildReviewConversionTeaching(fenPair.fenBefore, m.san);
      if (narration) narrationSource = 'conversion';
      if (narration === null && !endgameAnnounced) {
        const phase = nameEndgamePhase(fenPair.fenAfter);
        if (phase) { narration = `We've reached ${phase}.`; endgameAnnounced = true; narrationSource = 'endgame'; }
      }
      // MIDDLEGAME silence gap (David 2026-07-20: "narration was missing on a
      // lot of moves"). Past the opening, a quiet student move that isn't a
      // mate/endgame beat got NOTHING — the biggest coverage hole. Fill it with
      // the same rich PlyFacts the best-move lines use (captures/tactics/
      // outposts/passed pawns/files/material), null → still silent for a truly
      // uneventful move.
      if (narration === null) {
        const rich = plyFactsForMove(fenPair.fenBefore, m.san, prevCap);
        if (rich) { narration = rich; narrationSource = 'per-move'; }
      }
    }
    // OPPONENT STRUCTURE + DEVELOPMENT read — once per game, on an opponent's
    // quiet move in the opening, when they're provably pawn-heavy and lagging in
    // development (David 2026-07-19 live test). Fires BEFORE the per-move target
    // commentary so this rarer, structural observation wins its one slot.
    if (
      narration === null
      && studentColorWB !== null
      && moverColor !== playerColor
      && playerColor !== undefined
      && !opponentDevReadShown
      && m.ply >= 10
      && m.ply <= OPENING_TEACH_MAX_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const devRead = buildOpponentDevelopmentRead(opponentSans, fenPair.fenAfter, studentColorWB);
      if (devRead) {
        narration = devRead.text;
        narrationSource = 'opponent';
        opponentDevReadShown = true;
      }
    }
    // OPPONENT-MOVE commentary — what the opponent's move TARGETS in the
    // student's position (a loose piece, a weak pawn, an outpost). Two people
    // play the game; the student needs to see the opponent's intentions (David
    // 2026-07-19). Opponent's own quiet moves only (flagged opp moves already
    // say "opponent slipped"); each distinct target named once, else silent.
    if (
      narration === null
      && studentColorWB !== null
      && moverColor !== playerColor
      && playerColor !== undefined
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      // No count cap (David 2026-07-20: "always narrate both sides") — the
      // per-target dedup already stops the same idea repeating; this richer
      // "what they're targeting" read fires whenever there's a NEW target, and
      // the PlyFacts fallback below covers every other eventful opponent move.
      const opp = buildOpponentMoveTeaching(fenPair.fenBefore, m.san, studentColorWB);
      const target = opp?.arrows[0]?.endSquare;
      if (opp && !(target && oppTargetsSeen.has(target))) {
        narration = opp.text;
        planArrows = opp.arrows;
        narrationSource = 'opponent';
        if (target) oppTargetsSeen.add(target);
      }
    }
    // OPPONENT PER-MOVE FALLBACK — narrate BOTH SIDES on every eventful move
    // (David 2026-07-20: "always narrate both sides"). When the opponent's own
    // quiet move still has no narration but DID something concrete (capture,
    // tactic, outpost, passed pawn, opened file, material, king-shield), voice it
    // in the SAME rich PlyFacts register the student side gets — framed "Your
    // opponent …" so the side is never ambiguous. Board-true (G0); a truly quiet
    // opponent move stays silent, exactly as a truly quiet student move does, so
    // the two sides get symmetric coverage.
    if (
      narration === null
      && moverColor !== playerColor
      && playerColor !== undefined
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const clause = plyFactsClause(fenPair.fenBefore, m.san, prevCap);
      if (clause) {
        narration = `Your opponent ${clause}.`;
        narrationSource = 'opponent';
      }
    }
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
      bestMoveSan,
      bestMoveUci: m.bestMove,
      narration,
      narrationSource,
      ...(planArrows && planArrows.length ? { planArrows } : {}),
    });
    // Carry this move's capture forward so the NEXT ply's material calc can
    // recognize a recapture (even trade → 0, no "wins material" windfall).
    try {
      const pc = new Chess(fenPair.fenBefore).move(m.san);
      prevCap = pc
        ? { square: pc.to, capturedValue: pc.captured ? (PIECE_PTS[pc.captured] ?? 0) : 0 }
        : { square: null, capturedValue: 0 };
    } catch {
      prevCap = { square: null, capturedValue: 0 };
    }
  }
  return segments;
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
  // Derive the student-relative outcome from the raw score + colour. `result`
  // arrives as the raw PGN score ('1-0'/'0-1'/'1/2-1/2') OR already as
  // 'win'/'loss'/'draw'. The old ternary only checked the latter, so a raw
  // '1-0' fell through to "a draw" — the coach opened a WIN by calling it a draw
  // (David 2026-07-19). Grounded certainty: we computed the result, so state it.
  const outcome: 'win' | 'loss' | 'draw' =
    params.result === 'win' || params.result === 'loss' || params.result === 'draw'
      ? params.result
      : params.result === '1-0' || params.result === '0-1'
        ? ((params.result === '1-0') === (params.playerColor === 'white') ? 'win' : 'loss')
        : 'draw';
  const resultPhrase = outcome === 'win' ? 'a win' : outcome === 'loss' ? 'a loss' : 'a draw';
  const openingBit = params.openingName ? ` in the ${params.openingName}` : '';
  const momentBit = params.mistakeCount > 0
    ? ` You had ${params.mistakeCount === 1 ? 'one moment' : `${params.mistakeCount} moments`} worth a second look — let's walk through them together.`
    : ` Clean play throughout — let's walk it and pull out what worked.`;
  return `Let's review your game${openingBit} — you had ${colorWord} and it ended in ${resultPhrase}.${momentBit}`;
}

/**
 * Build the per-move walk-the-game narration for a completed game.
 *
 * ship-3 inversion: the per-ply segments come from a deterministic
 * builder (`buildReviewSegments`) driven by the Stockfish annotations
 * the analysis pipeline already produced. The legacy LLM segments
 * call (REVIEW_MOVE_SEGMENT_ADDITION) is gone — it was the single
 * point of failure for the entire walk-the-game UX:
 *   - 30s spine timeout on long games → silent walk
 *   - JSON parse failure on malformed output → silent walk
 *   - 4000-token cap truncation past ~30 plies → silent tail
 *   - Voice-marker collision with REVIEW_MODE_ADDITION → markdown leak
 *   - "Every ply gets prose" prompt → chatty filler that contradicts
 *     CLAUDE.md narration voice rules (silence is acceptable, etc.)
 *
 * The deterministic builder produces narration grounded in
 * classification + bestMove + eval swing. Silent on book/good per the
 * narration voice rules; templated prose on inaccuracy/mistake/blunder/
 * brilliant with stem rotation to avoid repetition.
 *
 * The intro is the deterministic, outcome-grounded `defaultIntroText`,
 * warmed by `voiceFacts` (never free-composed); if the warming pass
 * misses, the deterministic text is spoken verbatim.
 */
/**
 * Bound a best-effort promise so a slow/cold provider can never stall the
 * review. The OpenAI/Anthropic SDKs default to a 10-minute timeout, so a cold
 * prod DeepSeek call to the house-voice pass would hang "Preparing…" for
 * minutes (audit 2026-07-20: the walk never became ready in 165s). The
 * house-voice + intro-warm passes are explicitly best-effort — on timeout we
 * ship the deterministic templates, which are still fully grounded (G0). This
 * guarantees the walk becomes ready within a bounded window, every time.
 */
/** Oxford-comma join for a short clause list ("a", "b", "c" → "a, b, and c"). */
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function raceTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** True when every "<piece> on <square>" claim in `text` is TRUE on `fen` (the
 *  board the student sees at that ply). Guards the review walk against a house-
 *  voice rephrase that attaches a piece to a square it doesn't occupy — e.g.
 *  "the pawn on b5 gets taken" after a bishop has landed on b5 (audit
 *  2026-07-20). Runtime analog of the build-time narrationAccuracy contract. */
export function narrationBoardAccurate(text: string, fen: string): boolean {
  const WANT: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
  try {
    const board = new Chess(fen);
    const re = /\b(knight|bishop|rook|queen|pawn|king)\s+on\s+([a-h][1-8])\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const cell = board.get(m[2].toLowerCase() as Square);
      if (!cell || cell.type !== WANT[m[1].toLowerCase()]) return false;
    }
    return true;
  } catch {
    return true; // never block narration on a parse error
  }
}

export async function generateReviewNarration(params: {
  moves: ReviewMoveInput[];
  playerColor: 'white' | 'black';
  openingName: string | null;
  result: string;
  playerRating: number;
  /** Coach Narration verbosity ('silent' / 'brief' / 'full'). Brief
   *  caps the intro LLM call at fewer tokens so the spoken intro
   *  stays tight; silent skips the LLM call entirely (speakInternal
   *  silences playback anyway, but we save the token spend). When
   *  undefined, defaults to full-length behavior (legacy). */
  coachNarration?: 'silent' | 'brief' | 'full';
}): Promise<ReviewNarration> {
  const { moves, playerColor, openingName, result, coachNarration, playerRating } = params;

  // Reconstruct FENs via chess.js so the UI can rewind cleanly.
  const fenChain = buildFenChain(moves);
  const usableCount = fenChain.length;

  // Count the STUDENT's own mistakes for the intro tone. isCoachMove is
  // unreliable for a reviewed/imported game (false for both sides), so key on
  // COLOR — same fix as the recap (#9) and the walk gates. Without it the intro
  // counted the OPPONENT's errors too and mis-set the tone.
  const introStudentWB: 'white' | 'black' = playerColor;
  let mistakeCount = 0;
  for (const m of moves.slice(0, usableCount)) {
    const moverColor: 'white' | 'black' = m.ply % 2 === 1 ? 'white' : 'black';
    if (m.isCoachMove || moverColor !== introStudentWB) continue;
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

  // Intro narration — GROUNDED (David 2026-07-09 "check every spoken word
  // path" / G0). The intro is the deterministic, outcome-grounded
  // `defaultIntroText`; voiceFacts only WARMS the phrasing (it never adds a
  // chess fact). It NO LONGER routes through coachService.ask — that path now
  // hits the Q&A grounding seal (which serves a one-line position-eval, NOT a
  // review intro) and would also stall the walk on a cold-prod brain. Silent
  // verbosity skips the warming pass (playback is silenced anyway); on any
  // voiceFacts miss we speak the deterministic default verbatim.
  const groundedIntro = defaultIntroText({ playerColor, result, openingName, mistakeCount });
  const skipIntroLlm = coachNarration === 'silent';
  const introRaw = skipIntroLlm
    ? ''
    : (await raceTimeout(
        voiceFacts(groundedIntro, { intent: 'review-intro', warm: true }).catch(() => ''),
        REVIEW_INTRO_VOICE_TIMEOUT_MS,
        '',
      )) ?? '';

  // Intro: use LLM response if non-empty and not the ⚠️ error placeholder;
  // else fall back to a grounded default.
  const introTrimmed = introRaw.trim();
  const intro = introTrimmed && !introTrimmed.startsWith('⚠️')
    ? introTrimmed
    : defaultIntroText({ playerColor, result, openingName, mistakeCount });

  const segments = buildReviewSegments(moves.slice(0, usableCount), playerColor, openingName);

  // HOUSE-VOICE PASS (David 2026-07-19: "does NOT sound like Danya"). The
  // per-move narration above is computed deterministically (the FACTS, G0) but
  // reads like templated labels spoken raw. Rephrase EVERY line through the one
  // grounding chokepoint in a SINGLE batched call — the model voices each fact in
  // the teaching register (concept-first, causal, varied, never restating the
  // move), adding zero chess content (guarded per line; a trip keeps the
  // template). Best-effort at prep; skipped on silent. Never a regression.
  if (coachNarration !== 'silent') {
    try {
      // Warm EVERY narrated segment — including the sacrifice, mate, and the new
      // teaching beats — so the teaching speaks in the SAME Danya voice as the
      // rest of the walk, not as bolted-on inserts (David 2026-07-20: "the new
      // teachings need to tie into and complement the narration build, not stand
      // alone"). The load-bearing words are protected below (revert if dropped),
      // so we no longer exempt the showcase beats up front.
      const toVoice = segments
        .filter((s) => s.narration && s.narration.trim().length > 0)
        .map((s) => ({ id: s.ply, fact: s.narration as string, kind: s.narrationSource ?? undefined }));
      if (toVoice.length > 0) {
        const warmed = await raceTimeout(
          voiceReviewLines(toVoice, { studentRating: playerRating }),
          REVIEW_HOUSE_VOICE_TIMEOUT_MS,
          new Map<number, string>(),
        );
        for (const s of segments) {
          const w = warmed.get(s.ply);
          if (!w || !s.narration) continue;
          const det = s.narration;
          // Accept the warmed (Danya-voiced) line ONLY if it (a) is board-accurate
          // — no piece attached to a square it doesn't occupy ("the pawn on b5 gets
          // taken" after a bishop landed there) — AND (b) KEEPS the load-bearing
          // word the fact carried: a mate line must still say "mate/checkmate", a
          // sacrifice must still say "sacrifice". Otherwise the deterministic
          // template ships verbatim so the canary words can never be flattened
          // away (audit 2026-07-20: the queen sac was once narrated as "a check").
          const keepsMate = !/\bcheckmate\b/i.test(det) || /\b(checkmate|mate)\b/i.test(w);
          const keepsSac = !/\bsacrific/i.test(det) || /\bsacrific/i.test(w);
          if (keepsMate && keepsSac && narrationBoardAccurate(w, s.fenAfter)) s.narration = w;
        }
      }
    } catch { /* keep the deterministic templates */ }
  }

  const narratedCount = segments.filter((s) => s.narration !== null).length;
  void logAppAudit({
    kind: 'review-segments-generated',
    category: 'subsystem',
    source: 'coachFeatureService.generateReviewNarration',
    summary: `${narratedCount} of ${segments.length} plies narrated (deterministic)`,
    details: JSON.stringify({ totalSegments: segments.length, narratedCount, source: 'deterministic-ship3' }),
  });

  return { intro, segments, closing: null };
}
