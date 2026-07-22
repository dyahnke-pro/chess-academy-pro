import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { seeGain } from './positionReadingService';
import { explainBestMoveGrounded, explainMoveOrder, describeMoveMerit, describeSacrifice, seatPieceReferences, describeStudentThreat } from './groundedAnswer';
import { buildReviewMoveTeaching, buildReviewConversionTeaching, nameEndgamePhase } from './reviewMoveTeaching';
import { plyFactsForMove, plyFactsClause, computePvLine, type PvLine, type PrevCaptureContext } from './pvPlayback';
import { buildMiddlegameOrientation, buildOpeningDevelopmentPlan } from './reviewStrategicOrientation';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { detectOpening } from './openingDetectionService';
import { resolveCuratedOpeningIdeas } from './reviewOpeningTheory';
import { detectPieceItineraries } from './reviewPieceItinerary';
import { pickStoryGame } from './reviewStoryGame';
import { sacrificeCompensation, enemyKingStuckInCenter, describeSacBreaksKingShield } from './reviewSacrifice';
import { detectForcedMatingSequence, explainMatingSacMechanism } from './reviewForcedSequence';
import { assessPositionalEdge } from './reviewPositionalAssessment';
import { computeMoveFacets, computeThroughLine } from './reviewFullData';
import { describeNotableMove, describeConcessions, findTrappedPiece } from './reviewTeachingPoints';
import { walkBookLine } from './theoryDeparture';
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
  const framedOpening = openingName ? frameOpeningForStudent(openingName, playerColor === 'black' ? 'black' : 'white') : null;
  const openingClause = framedOpening
    ? (framedOpening.owned ? `the ${framedOpening.label}` : `the game against the ${framedOpening.label}`)
    : 'this game';

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
  const framedOpening = openingName ? frameOpeningForStudent(openingName, playerColor === 'black' ? 'black' : 'white') : null;
  const openingClause = framedOpening
    ? (framedOpening.owned ? `the ${framedOpening.label}` : `the game against the ${framedOpening.label}`)
    : 'this game';
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
  narrationSource?: 'flag' | 'opening-plan' | 'orientation' | 'assessment' | 'per-move' | 'conversion' | 'endgame' | 'opponent' | null;
  /** PLAN-IDEA arrows to lead the eye when this segment's narration is a plan
   *  beat (opening-development / middlegame orientation). The board stays put —
   *  these arrows SHOW the plan instead of moving pieces (David 2026-07-19).
   *  Undefined on ordinary moves. */
  planArrows?: Array<{ startSquare: string; endSquare: string; color: string }>;
  /** The cited master game for the §6 story-as-evidence beat, WITH its PGN +
   *  narrations so the UI can offer a NARRATED "watch this game" playback
   *  (David 2026-07-21: "Does the DB/example game have narrations?" — the
   *  corpus overview is spoken at the start, per-moment annotations as the
   *  playback reaches them). Undefined on other segments. */
  storyGame?: {
    citation: string;
    pgn: string;
    overview: string | null;
    criticalMoments: Array<{ moveNumber: number; color: 'white' | 'black'; annotation: string }>;
  };
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
  /** UNCAPPED diagnostic mode (David 2026-07-20: "turn off all narration caps —
   *  I want to hear ALL the computed data on every move"). Replaces the one-beat-
   *  per-move cascade + one-shot flags with the full-data aggregator, which emits
   *  EVERY computed facet on EVERY move. Off by default (production stays capped). */
  uncapped?: boolean,
): ReviewMoveSegment[] {
  // Curated, opening-specific ideas for the dev-plan beat (null → uncurated).
  const curatedOpeningIdeas = resolveCuratedOpeningIdeas(openingName ?? null);
  // Per-GAME seed (stable within a game, different across games) — rotates the
  // dev-plan's lead idea + stem so the same opening never reads as the same
  // recording every game (David 2026-07-21: "the same response every time").
  const gameSeed = moves.reduce((a, m) => (a * 31 + m.san.charCodeAt(0)) >>> 0, moves.length >>> 0);
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
  /** Trapped-piece beats announced, keyed side:square — once per trap, ever. */
  const trappedAnnounced = new Set<string>();
  let orientationShown = false;
  // The enumerated POSITIONAL VERDICT ("you're better here, and here's why:
  // bishop pair, the open file, his weak pawn") — Danya's signature teaching
  // message (David 2026-07-20). Fired ONCE, when there's a real edge with ≥2
  // concrete board-true assets to name.
  let assessmentShown = false;
  // Uncapped-mode dedup: STATIC state facets (opening name, opening plan, the
  // majority plan, the opponent-dev read) repeat identically move after move —
  // pure noise. Emit each identical line ONCE; every DYNAMIC per-move facet
  // (move/quality/tactic/loose/verdict/structure/king/sac/consequence) always
  // fires (David 2026-07-20 diagnostic: "Philidor Defense" was said 33 times).
  const emittedStaticFacets = new Set<string>();
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
    // UNCAPPED diagnostic branch — emit EVERY computed facet on EVERY move (David
    // 2026-07-20: "turn off all narration caps"). Skips the one-beat cascade + the
    // one-shot flags entirely; the aggregator is the full data inventory.
    if (uncapped) {
      const facets = computeMoveFacets({
        fenBefore: fenPair.fenBefore,
        fenAfter: fenPair.fenAfter,
        san: m.san,
        ply: m.ply,
        moverColor,
        playerColor,
        studentColorWB,
        evaluation: m.evaluation ?? null,
        preMoveEval: m.preMoveEval ?? null,
        classification: m.classification ?? null,
        bestMoveSan,
        prevCap,
        allSans: sansForRun,
        forcedRunStartPly: forcedRun ? forcedRun.startPly : null,
      });
      // Drop an identical STATIC state facet already spoken on an earlier ply
      // (opening / plan-opening / plan-middlegame / opp-dev); keep every dynamic
      // per-move fact.
      const kept = facets.filter((f) => {
        if (!/^\[(opening|plan-opening|plan-middlegame|plan-now|opp-dev|passer|badbishop|worst|trapped)\]/.test(f)) return true;
        if (emittedStaticFacets.has(f)) return false;
        emittedStaticFacets.add(f);
        return true;
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
        bestMoveSan,
        bestMoveUci: m.bestMove,
        narration: kept.length ? kept.join(' ') : null,
        narrationSource: kept.length ? 'per-move' : null,
      });
      try {
        const pc = new Chess(fenPair.fenBefore).move(m.san);
        prevCap = pc
          ? { square: pc.to, capturedValue: pc.captured ? (PIECE_PTS[pc.captured] ?? 0) : 0 }
          : { square: null, capturedValue: 0 };
      } catch {
        prevCap = { square: null, capturedValue: 0 };
      }
      continue;
    }
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
    // THE LASTING CONCESSION (David 2026-07-21, IMG_4571: "What serious
    // positional concessions have been made? What are the ramifications of this
    // move?"). Name the structural damage the flagged move caused — computed
    // diff (king shield thinned, passer granted, structure splintered). Both
    // sides: your concession is the lesson, theirs is the target.
    if (narration && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy')) {
      const concession = describeConcessions(fenPair.fenBefore, m.san, playerColor ? moverColor === playerColor : !m.isCoachMove);
      if (concession) narration = `${narration} ${concession}`;
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
          const oppWins = seeGain(sb, smv.to);
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
    // THE THREAT CALL-OUT (David 2026-07-21, emphatic: "The coach should
    // identify my threat and call it out!!"). On EVERY student move, name the
    // biggest NEW threat the move created — mate-in-one, a safe royal fork, a
    // clean material win — from the null-move scan (board-provable). The
    // Berlin case: after ...Bc5, "you're now threatening Nxf2 — wins the f2
    // pawn and forks their queen and rook" went unsaid. A threat is a
    // keystone: it speaks even on an otherwise-quiet ply.
    if (playerColor && moverColor === playerColor) {
      const threat = describeStudentThreat(fenPair.fenBefore, fenPair.fenAfter, playerColor === 'white' ? 'w' : 'b');
      if (threat) {
        narration = narration
          ? `${narration} And ${threat}.`
          : `${threat.charAt(0).toUpperCase()}${threat.slice(1)}.`;
        narrationSource = narrationSource ?? 'per-move';
      }
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
    let segmentStoryGame: ReviewMoveSegment['storyGame'];
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
      const dev = buildOpeningDevelopmentPlan(fenPair.fenBefore, studentColorWB, { openingName: openingName ?? null, curatedIdeas: curatedOpeningIdeas, seed: gameSeed });
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
    // (b2) ENUMERATED POSITIONAL VERDICT — the "you're better here, and here's
    // WHY: bishop pair, the open file, his weak pawn" message (David 2026-07-20:
    // "focus on his teaching messages"). Danya never says "White is better" and
    // stops; he itemizes the concrete assets. Fires once, on the student's own
    // quiet good move past the middlegame threshold, when there's a genuine edge
    // (verdict better/worse, not balanced) AND ≥2 board-true assets to name — so
    // it never fabricates a verdict on a level position (empty > generic).
    if (
      narration === null
      && !isConcreteMove
      && studentColorWB !== null
      && !assessmentShown
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply >= MIDDLEGAME_ORIENTATION_MIN_PLY
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const studentPovCp = m.evaluation != null ? (studentColorWB === 'w' ? m.evaluation : -m.evaluation) : null;
      const assess = assessPositionalEdge(fenPair.fenAfter, studentColorWB, studentPovCp);
      if (assess.reasons.length >= 2 && assess.verdict && assess.verdict !== 'balanced') {
        narration = `Step back and take stock — you're ${assess.verdict} here, and it's worth knowing exactly why: ${joinClauses(assess.reasons.slice(0, 3))}.`;
        assessmentShown = true;
        narrationSource = 'assessment';
      }
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
        // Seat-framed (IMG_4572): a White student facing the Pirc hears
        // "the Austrian Attack vs the Pirc" / "your opponent steers into…",
        // never "you're playing into the Pirc Defense".
        const framedName = playerColor ? frameOpeningForStudent(named, playerColor) : { label: named, owned: true };
        narration = framedName.owned
          ? (first ? `You're playing into the ${framedName.label}.` : `This has become the ${framedName.label}.`)
          : (first ? `Your opponent steers into the ${framedName.label} — their choice of battleground, so know its ideas.` : `This has become the ${framedName.label} — their opening, your counters.`);
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
      // Attach the cited game's PGN so the UI can offer "watch this game"
      // (David 2026-07-21, IMG_4576: the citation was spoken with no way to
      // actually SEE the game).
      if (storyGame.pgn) segmentStoryGame = { citation: storyGame.citation, pgn: storyGame.pgn, overview: storyGame.overview, criticalMoments: storyGame.criticalMoments };
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
    // NOTABLE MOVES — BOTH SIDES, ANY PHASE (David 2026-07-21, IMG_4570: "too
    // many moves passing without narration, for both sides. I feel like Danya
    // would have said something about this ambitious pawn push"). The per-move
    // fallback above covers only the STUDENT's opening moves; an opponent's g4
    // storm or a central break past the opening still passed silently. The
    // detector is strict (wing pushes into rank 4+, central pawn contact), so
    // this fires on shape-changing moves only, never as filler.
    if (
      narration === null
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      const notable = describeNotableMove(fenPair.fenBefore, m.san, playerColor ? moverColor === playerColor : !m.isCoachMove);
      if (notable) { narration = notable; narrationSource = 'per-move'; }
    }
    // TRAPPED PIECE — the story-level event (David 2026-07-21: "the trapped
    // piece was the queen!!!" — his game's Black queen on f6 had every flight
    // square covered and the review never said so). Fires ONCE per trapped
    // square, for EITHER side's rook/queen: theirs → you've boxed it in; your
    // own → the warning. Board-true (findTrappedPiece, conservative detector).
    if (narration === null && studentColorWB !== null) {
      const enemyOfStudent: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
      const theirsTrapped = findTrappedPiece(fenPair.fenAfter, enemyOfStudent);
      const mineTrapped = theirsTrapped ? null : findTrappedPiece(fenPair.fenAfter, studentColorWB);
      const hit = theirsTrapped ?? mineTrapped;
      if (hit && !trappedAnnounced.has(`${theirsTrapped ? 'e' : 's'}:${hit.square}`)) {
        trappedAnnounced.add(`${theirsTrapped ? 'e' : 's'}:${hit.square}`);
        narration = theirsTrapped
          ? `Stop and look at their ${hit.piece} on ${hit.square} — it's trapped. The ${hit.attackerPiece} on ${hit.attackerSquare} attacks it, and every square it could run to is covered. That piece is coming off the board; the only question is the price.`
          : `Careful — your ${hit.piece} on ${hit.square} is trapped. The ${hit.attackerPiece} on ${hit.attackerSquare} attacks it, and every escape square is covered. Start looking for the cheapest way to give it up, or a counter-blow that changes the subject.`;
        narrationSource = 'per-move';
      }
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
      ...(segmentStoryGame ? { storyGame: segmentStoryGame } : {}),
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
  const framedIntro = params.openingName ? frameOpeningForStudent(params.openingName, params.playerColor) : null;
  const openingBit = framedIntro
    ? (framedIntro.owned ? ` in the ${framedIntro.label}` : ` against the ${framedIntro.label}`)
    : '';
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

/**
 * FUTURE-POSITION PROJECTION (David 2026-07-20, future-analysis teachings #1 + #2):
 * "teaching means evaluating a FUTURE position." Two Stockfish-projected facts,
 * grounded (G0 — the line is the engine's real PV via computePvLine, graded so a
 * line that doesn't hold its promise is dropped; the LLM only voices it):
 *
 *   #1 PLAN REALIZATION — from the plan's critical position (the assessment /
 *      orientation ply), play the engine's best line OUT and narrate where the
 *      plan lands ("played out, it runs …b5, bxc6, and you're left with a
 *      backward c-pawn to hit").
 *   #2 CONSEQUENCE PROJECTION — on a strong student move (great/brilliant), play
 *      the follow-up OUT so the student sees what the good move LEADS to.
 *
 * Async + Stockfish, so it runs in the prep path (not the sync segment builder).
 * Bounded: a small per-game budget + a per-call timeout, so it can never stall
 * the walk. Uncapped-diagnostic only for now (keeps production review latency
 * flat); the projected facets are bracket-tagged so the cover-all voice pass
 * speaks them. Mutates the segments in place.
 */
async function augmentWithProjections(
  segments: ReviewMoveSegment[],
  studentColorWB: 'w' | 'b',
  /** 'full' (uncapped diagnostic) runs all three passes; 'mistakes' (capped
   *  production) runs ONLY the punishment pass on the student's flagged moves
   *  (David 2026-07-21, IMG_4571: "How does white take advantage of this
   *  mistake?" — production reviews need the ramification, not just the badge). */
  scope: 'full' | 'mistakes' = 'full',
): Promise<void> {
  const verdictWord = (studentPovCp: number | null): string => {
    if (studentPovCp === null) return 'the position stays balanced';
    if (studentPovCp >= 150) return "you're winning";
    if (studentPovCp >= 50) return "you're clearly better";
    if (studentPovCp > -50) return "it's about level";
    if (studentPovCp > -150) return "you're a bit worse";
    return "you're in trouble";
  };
  const render = (line: PvLine): string => {
    // NARRATE EVERY MOVE of the projected line (David 2026-07-21: "narrate each
    // line and explain the why behind each move. The user needs just as much
    // detail here as every other move, if not more, because this is where the
    // teaching happens!"). Each ply gets its computed clause — capture, check,
    // tactic landed, outpost — not a bare SAN chain. The recapture context
    // threads through so an even queen trade never reads as two nine-point
    // windfalls (scrutiny 2026-07-21: "Qxd6 captures the queen… then Bxd6
    // captures the queen for nine points").
    const PV_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let prev: PrevCaptureContext = { square: null, capturedValue: 0 };
    const steps = line.plies.map((p) => {
      const w = plyFactsClause(p.fenBefore, p.san, prev);
      try {
        const mv = new Chess(p.fenBefore).move(p.san);
        prev = mv?.captured
          ? { square: mv.to, capturedValue: PV_PTS[mv.captured] ?? 0 }
          : { square: null, capturedValue: 0 };
      } catch { prev = { square: null, capturedValue: 0 }; }
      return w ? `${p.san} (${w})` : p.san;
    });
    const whiteCp = line.terminalEvalCp ?? line.rootEvalCp;
    const studentPov = studentColorWB === 'w' ? whiteCp : -whiteCp;
    return `${steps.join(', then ')} — and ${verdictWord(studentPov)}`;
  };
  // Budget: 'full' (uncapped) needs room for punishment + plan + consequence;
  // 'mistakes' (capped production) caps at 2 punishment lines per game so the
  // review prep never stalls on Stockfish.
  let budget = scope === 'full' ? 5 : 3;
  const PROJ_TIMEOUT_MS = 7000;

  // #3 — PUNISHMENT projection on BOTH SIDES' mistakes/blunders: the engine PV
  // from the position AFTER the flagged move IS the ramification (David
  // 2026-07-21, IMG_4571 — and he was WHITE there: the mistake was his
  // OPPONENT's, and the question was "how does white take advantage?"). Your
  // own mistake → "here's how it gets punished"; the opponent's → "here's how
  // you take advantage" — same computed line, correct seat. Runs in BOTH
  // scopes; in 'mistakes' scope it's the only pass.
  const studentColorName = studentColorWB === 'w' ? 'white' : 'black';
  for (const s of segments) {
    if (budget <= 0) break;
    if (s.classification !== 'mistake' && s.classification !== 'blunder') continue;
    const isStudentSlip = s.playerColor === studentColorName;
    const line = await raceTimeout(computePvLine(s.fenAfter, { maxPlies: 6 }), PROJ_TIMEOUT_MS, null);
    if (line && line.delivers && line.plies.length >= 2) {
      const frame = isStudentSlip
        ? `Here's how it gets punished from here: ${render(line)}.`
        : `Here's how you take advantage: ${render(line)}.`;
      s.narration = `${s.narration ?? ''} ${frame}`.trim();
      budget -= 1;
    }
  }
  // #4 — THE BETTER-LINE WHY (David 2026-07-21, IMG_4577: "Need to know why
  // Bf2 was better. The better lines need the why narrations. A deeper
  // understanding is critical."). On the student's flagged moves that name a
  // distinct best move — INACCURACIES included, which the punishment pass
  // skips — play the engine's line STARTING WITH the better move and narrate
  // every ply's why, so "the stronger move was X" always carries the
  // understanding, never just the name. Seeding firstUci reuses the stored
  // analysis' own top line, so this is usually a cache hit, not fresh engine
  // time. Biggest swings first so the budget lands on the moves that matter.
  let whyBudget = scope === 'full' ? 5 : 3;
  const flaggedStudent = segments
    .filter((s) => s.playerColor === studentColorName
      && (s.classification === 'inaccuracy' || s.classification === 'mistake' || s.classification === 'blunder')
      && !!s.bestMoveUci)
    .sort((a, b) => {
      const swing = (x: ReviewMoveSegment): number =>
        x.evalBefore !== null && x.evalAfter !== null ? Math.abs(x.evalBefore - x.evalAfter) : 0;
      return swing(b) - swing(a);
    });
  for (const s of flaggedStudent) {
    if (whyBudget <= 0) break;
    const line = await raceTimeout(
      computePvLine(s.fenBefore, { firstUci: s.bestMoveUci as string, maxPlies: 6 }),
      PROJ_TIMEOUT_MS,
      null,
    );
    if (line && line.plies.length >= 3) {
      const bestName = line.plies[0].san;
      s.narration = `${s.narration ?? ''} Why ${bestName} was better — the line runs ${render(line)}.`.trim();
      whyBudget -= 1;
    }
  }

  // #5 — THE DEEP THREAT, two-to-three moves out (David 2026-07-21: "What
  // about calling out future threats? Two or three moves ahead?"). Static
  // scanning honestly reaches one reply; deeper is the ENGINE's job (G0).
  // From the position after the student's strong move, give the student the
  // move again (null-move fen) and read the engine's line: if, with the
  // opponent sitting still, the line MATES or wins decisively more than the
  // real eval within ≤3 of the student's moves, that line IS the looming
  // threat — narrated ply-by-ply through the same render machinery. Skipped
  // when the position is in check (forcing lines are the punishment pass's
  // job) and on one-move threats (the static call-out already owns those).
  let deepBudget = scope === 'full' ? 3 : 2;
  for (const s of segments) {
    if (deepBudget <= 0) break;
    if (s.playerColor !== studentColorName) continue;
    if (s.classification !== 'good' && s.classification !== 'great' && s.classification !== 'brilliant') continue;
    try {
      const parts = s.fenAfter.split(' ');
      if (parts[1] === (studentColorWB === 'w' ? 'w' : 'b')) continue; // already student's turn — not a threat read
      const probe = new Chess(s.fenAfter);
      if (probe.inCheck()) continue;
      parts[1] = studentColorWB;
      parts[3] = '-';
      const nullFen = parts.join(' ');
      const line = await raceTimeout(computePvLine(nullFen, { maxPlies: 5 }), PROJ_TIMEOUT_MS, null);
      if (!line || line.plies.length < 3) continue; // one-movers belong to the static call-out
      const terminal = line.terminalEvalCp ?? line.rootEvalCp;
      const studentPovTerminal = studentColorWB === 'w' ? terminal : -terminal;
      const studentPovNow = s.evalAfter !== null ? (studentColorWB === 'w' ? s.evalAfter : -s.evalAfter) : null;
      const lastPly = line.plies[line.plies.length - 1];
      const matesOut = lastPly.facts.isMate;
      const decisiveJump = studentPovNow !== null && studentPovTerminal - studentPovNow >= 250;
      if (!matesOut && !decisiveJump) continue;
      s.narration = `${s.narration ?? ''} And there's a deeper threat brewing — if they sit still, it runs ${render(line)}.`.trim();
      deepBudget -= 1;
    } catch { /* skip this ply — never block the walk on a threat probe */ }
  }

  if (scope === 'mistakes') return;

  // #1 — plan realization from the plan's critical position. In uncapped mode
  // every segment's source is 'per-move', so find the plan ply by its FACET tag
  // (the verdict/middlegame-plan fact appears in the bundle text).
  const planSeg = segments.find((s) => s.narrationSource === 'assessment' || s.narrationSource === 'orientation')
    ?? segments.find((s) => s.narration && (s.narration.includes('[verdict]') || s.narration.includes('[plan-middlegame]')));
  if (planSeg && budget > 0) {
    const line = await raceTimeout(computePvLine(planSeg.fenAfter, { maxPlies: 8 }), PROJ_TIMEOUT_MS, null);
    if (line && line.delivers && line.plies.length >= 2) {
      planSeg.narration = `${planSeg.narration ?? ''} [plan-line] Played out from here, the plan runs ${render(line)}.`.trim();
      budget -= 1;
    }
  }

  // #2 — consequence projection on the student's strongest moves.
  for (const s of segments) {
    if (budget <= 0) break;
    if (s === planSeg) continue;
    if (s.classification !== 'great' && s.classification !== 'brilliant') continue;
    const line = await raceTimeout(computePvLine(s.fenAfter, { maxPlies: 6 }), PROJ_TIMEOUT_MS, null);
    if (line && line.delivers && line.plies.length >= 2) {
      s.narration = `${s.narration ?? ''} [consequence] Follow it up and it goes ${render(line)}.`.trim();
      budget -= 1;
    }
  }
}

/**
 * Ground the opening-plan beat's development targets in the MASTERS BOOK (G0 —
 * the same source the theory lecture reads, so the two can never contradict;
 * David 2026-07-21 IMG_4569: "the opening theory said the knight goes to e2,
 * but now it says f3??"). Walks the book from the plan beat's position; wherever
 * a home minor's book destination differs from the template arrow, the arrow is
 * rewritten and the book squares are SPOKEN. Silent no-op when the position is
 * out of book — the universal-square template is then the only claim standing.
 */
async function groundOpeningPlanInBook(segments: ReviewMoveSegment[]): Promise<void> {
  const seg = segments.find((s) => s.narrationSource === 'opening-plan' && s.planArrows && s.planArrows.length > 0);
  if (!seg) return;
  const HOME = new Set(['b1', 'g1', 'b8', 'g8', 'c1', 'f1', 'c8', 'f8']);
  const collect = (steps: Array<{ san: string; fenAfter: string }>): Map<string, { to: string; piece: string }> => {
    const targets = new Map<string, { to: string; piece: string }>();
    let fen = seg.fenBefore;
    for (const p of steps) {
      try {
        const c = new Chess(fen);
        const mv = c.move(p.san);
        if (!mv) break;
        fen = p.fenAfter;
        if (HOME.has(mv.from) && (mv.piece === 'n' || mv.piece === 'b') && !targets.has(mv.from)) {
          targets.set(mv.from, { to: mv.to, piece: mv.piece === 'n' ? 'knight' : 'bishop' });
        }
      } catch { break; }
    }
    return targets;
  };
  // SOURCE 1 — the masters DB (the same aggregates the theory lecture reads).
  const line = await raceTimeout(walkBookLine(seg.fenBefore, { maxPlies: 8, minGames: 5 }), 6000, [] as Awaited<ReturnType<typeof walkBookLine>>);
  let targets = line && line.length >= 2 ? collect(line) : new Map<string, { to: string; piece: string }>();
  let source: 'book' | 'engine' = 'book';
  // SOURCE 2 — the ENGINE's PV from this exact position (David 2026-07-21:
  // "What if we don't have a book?"). Master coverage runs thin past ~move 12
  // and in offbeat lines; without this fallback the plan silently reverted to
  // the hardcoded natural-squares template — the exact f3-vs-e2 contradiction
  // machinery. The engine's line is position-true and always available; the
  // spoken clause labels it honestly as the engine's scheme, never "the book".
  if (targets.size === 0) {
    const pv = await raceTimeout(computePvLine(seg.fenBefore, { maxPlies: 8 }), 7000, null);
    if (pv && pv.plies.length >= 2) {
      targets = collect(pv.plies.map((p) => ({ san: p.san, fenAfter: p.fenAfter })));
      source = 'engine';
    }
  }
  if (targets.size === 0) return;
  // ONE SOURCE FOR WORDS AND ARROWS (David 2026-07-21, IMG_4575: the narration
  // said "f1-bishop to d3 and g8-knight to e7" while the board still showed the
  // TEMPLATE arrows b1→c3 / g1→f3). When data targets resolve, the arrows are
  // REBUILT from the targets alone — stale template arrows the data didn't
  // confirm are dropped (empty > wrong), and every spoken target gets its arrow.
  // Blue = the student's pieces, amber = the opponent's (devArrows' scheme).
  const studentIsWhite = seg.playerColor === 'white';
  const sideOf = (home: string): 'student' | 'opponent' => ((home[1] === '1') === studentIsWhite ? 'student' : 'opponent');
  seg.planArrows = [...targets.entries()].map(([from, t]) => ({
    startSquare: from,
    endSquare: t.to,
    color: sideOf(from) === 'student' ? '#3b82f6' : '#f59e0b',
  }));
  // SPEAK the scheme SEAT-AWARE — "your f1-bishop to d3", "expect their knight
  // to head for e7" — never a sideless mix of both armies in one clause.
  const mineT = [...targets.entries()].filter(([f]) => sideOf(f) === 'student').slice(0, 2);
  const theirsT = [...targets.entries()].filter(([f]) => sideOf(f) === 'opponent').slice(0, 2);
  const list = (xs: Array<[string, { to: string; piece: string }]>, poss: string): string =>
    xs.map(([from, t]) => `${poss} ${from}-${t.piece} to ${t.to}`).join(' and ');
  const bits: string[] = [];
  if (mineT.length) bits.push(`it develops ${list(mineT, 'your')}`);
  if (theirsT.length) bits.push(`${mineT.length ? 'and expect' : 'expect'} ${list(theirsT, 'their')}`);
  const spoken = bits.join(', ');
  if (spoken) {
    seg.narration = source === 'book'
      ? `${seg.narration ?? ''} In this exact structure the book's scheme: ${spoken} — that's the path the master games follow here.`.trim()
      : `${seg.narration ?? ''} We're past the master book here, so trust the engine's scheme: ${spoken}.`.trim();
  }
}


/**
 * SEAT-FRAME an opening name for the student (David 2026-07-21, IMG_4572:
 * "Opening says Pirc Defense but I am white and played the Austrian Attack…
 * Should read Austrian Attack Vs the Pirc"). Pure string transform over the
 * DB's canonical name (no chess invented):
 *  • a name whose FAMILY carries "Defense/Defence" belongs to Black; anything
 *    else to White (Italian Game, Ruy Lopez, London System, Queen's Gambit…);
 *  • the student OWNS the name → keep it as-is;
 *  • the student faces an enemy Defense whose sub-line is an "…Attack" — that
 *    attack is the STUDENT's system → reframe as "{Attack} vs the {Family}"
 *    ("Austrian Attack vs the Pirc") and treat it as owned;
 *  • otherwise the student merely FACES the name → owned:false, callers say
 *    "against the …" instead of "in the …".
 */
export function frameOpeningForStudent(
  name: string,
  studentColor: 'white' | 'black',
): { label: string; owned: boolean } {
  const [familyRaw, ...rest] = name.split(':');
  const family = (familyRaw ?? name).trim();
  const sub = rest.join(':').trim() || null;
  const blackOwned = /defen[cs]e/i.test(family);
  const studentOwns = blackOwned ? studentColor === 'black' : studentColor === 'white';
  if (studentOwns) return { label: name, owned: true };
  if (blackOwned && sub && /attack/i.test(sub)) {
    const familyShort = family.replace(/\s+defen[cs]e\s*$/i, '');
    return { label: `${sub} vs the ${familyShort}`, owned: true };
  }
  return { label: name, owned: false };
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

/** SEAT fidelity for the house-voice pass, checked against the BOARD: the
 *  rephrase must not claim the wrong owner for a piece on a square. Caught
 *  twice in the 2026-07-21 scrutiny — "your queen on e6" for the opponent's
 *  queen (Opera ply 28), and both pins flipped ("your bishop on c5 … your
 *  opponent's bishop on c4", inverted; trap ply 9). The deterministic facts
 *  often carry NO possessive ("Bishop on c5 pins pawn on f2"), so the model
 *  INVENTS one — only the board can arbitrate. Every "your/their <piece> on
 *  <square>" must match the color of the piece actually standing there. */
export function narrationSeatFaithful(
  warmed: string,
  fen: string,
  studentColorWB: 'w' | 'b',
): boolean {
  try {
    const board = new Chess(fen);
    const WANT: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
    const re = /\b(your opponent's|your|their)\s+(?:own\s+)?(knight|bishop|rook|queen|pawn|king)\s+on\s+([a-h][1-8])\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(warmed)) !== null) {
      const cell = board.get(m[3].toLowerCase() as Square);
      if (!cell || cell.type !== WANT[m[2].toLowerCase()]) continue; // board-accuracy guard's job
      const claimedYours = m[1].toLowerCase() === 'your';
      const actuallyYours = cell.color === studentColorWB;
      if (claimedYours !== actuallyYours) return false;
    }
    return true;
  } catch {
    return true; // never block narration on a parse error
  }
}

const SPELLED_NUM: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
  seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
};

/** NUMBER fidelity for the house-voice pass: a fact-bearing number the warm
 *  text speaks (points of material, eval swings, attacker/defender counts)
 *  must exist in the deterministic fact — the model must not turn a 3-point
 *  knight into "two more" (scrutiny 2026-07-21; same class the voiceFacts
 *  numberFidelity net catches on the Q&A path). Meta-counts ("three pins
 *  now") are aggregation, not chess facts, and stay unguarded. */
export function narrationNumbersFaithful(det: string, warmed: string): boolean {
  const numRe = /\b(\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi;
  const canon = (s: string): string => SPELLED_NUM[s.toLowerCase()] ?? s;
  const detNums = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(det)) !== null) detNums.add(canon(m[1]));
  const FACT_CONTEXT = /point|material|eval|swing|swung|attacker|defender/i;
  numRe.lastIndex = 0;
  while ((m = numRe.exec(warmed)) !== null) {
    const around = warmed.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30);
    if (FACT_CONTEXT.test(around) && !detNums.has(canon(m[1]))) return false;
  }
  return true;
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
  /** UNCAPPED diagnostic mode (David 2026-07-20). Speaks EVERY computed facet on
   *  EVERY move (full-data aggregator), and skips the house-voice warming pass so
   *  no fact is compressed away — you hear exactly what the position computes. */
  uncapped?: boolean;
}): Promise<ReviewNarration> {
  const { moves, playerColor, openingName, result, coachNarration, playerRating, uncapped } = params;

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

  const segments = buildReviewSegments(moves.slice(0, usableCount), playerColor, openingName, uncapped);

  // FUTURE-POSITION PROJECTIONS (#1 plan realization + #2 consequence projection)
  // — Stockfish-projected teaching, uncapped-diagnostic only (bounded budget +
  // timeout so it never stalls the walk). Runs before the voice pass so the
  // projected facts get spoken in the same register.
  try {
    // Uncapped: all three projection passes. Capped production: the punishment
    // pass only — every review now answers "how does this mistake get taken
    // advantage of?" with the concrete engine line (David 2026-07-21).
    await augmentWithProjections(segments, playerColor === 'white' ? 'w' : 'b', uncapped ? 'full' : 'mistakes');
  } catch { /* projections are best-effort; the walk ships without them */ }

  // BOOK-GROUNDED DEV TARGETS (David 2026-07-21, IMG_4569: the plan arrow said
  // g1→f3 while the theory lecture's masters data plays Ne2 — two "authorities"
  // contradicting each other. The plan must read from the SAME masters book as
  // the lecture (G0): rewrite any template arrow the book disagrees with and
  // SAY the book's development squares.
  try {
    await groundOpeningPlanInBook(segments);
  } catch { /* best-effort; the template arrows stand when the book is silent */ }

  // HOUSE-VOICE PASS (David 2026-07-19: "does NOT sound like Danya"). The
  // per-move narration above is computed deterministically (the FACTS, G0) but
  // reads like templated labels spoken raw. Rephrase EVERY line through the one
  // grounding chokepoint in a SINGLE batched call — the model voices each fact in
  // the teaching register (concept-first, causal, varied, never restating the
  // move), adding zero chess content (guarded per line; a trip keeps the
  // template). Best-effort at prep; skipped on silent. Never a regression.
  // DETERMINISTIC MINE/YOURS (David 2026-07-21: "ship the correct answer to
  // the LLM"). Stamp the computed owner onto every seatless "<piece> on
  // <square>" reference in every stored narration, checked against that ply's
  // own board — the house voice is HANDED the possessive, it never invents
  // one. Mismatched/vacated squares are left untouched, so future-line
  // references in projections can't be mis-stamped.
  {
    const studentWB: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
    for (const s of segments) {
      if (s.narration) s.narration = seatPieceReferences(s.narration, s.fenAfter, studentWB);
    }
  }

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
          voiceReviewLines(toVoice, { studentRating: playerRating, coverAll: uncapped }),
          REVIEW_HOUSE_VOICE_TIMEOUT_MS,
          new Map<number, string>(),
        );
        // No spoken line may repeat verbatim across the walk (audit R10 — the
        // model once shipped the identical quiet-ply line 10 plies apart despite
        // the vary-every-line instruction). A duplicate keeps the deterministic
        // template instead, which carries the ply's own move so it stays distinct.
        const spokenLines = new Set<string>();
        for (const s of segments) {
          const w = warmed.get(s.ply);
          if (!w || !s.narration) { if (s.narration) spokenLines.add(s.narration.trim().toLowerCase()); continue; }
          const det = s.narration;
          const isRepeat = spokenLines.has(w.trim().toLowerCase());
          // Accept the warmed (Danya-voiced) line ONLY if it (a) is board-accurate
          // — no piece attached to a square it doesn't occupy ("the pawn on b5 gets
          // taken" after a bishop landed there) — AND (b) KEEPS the load-bearing
          // word the fact carried: a mate line must still say "mate/checkmate", a
          // sacrifice must still say "sacrifice". Otherwise the deterministic
          // template ships verbatim so the canary words can never be flattened
          // away (audit 2026-07-20: the queen sac was once narrated as "a check").
          const keepsMate = !/\bcheckmate\b/i.test(det) || /\b(checkmate|mate)\b/i.test(w);
          const keepsSac = !/\bsacrific/i.test(det) || /\bsacrific/i.test(w);
          // The projection FRAME is a seat fact: the student's own slip reads
          // "how it gets punished", the opponent's "how you take advantage".
          // The warm pass once flipped a student mistake into "here's how you
          // can still punish" (scrutiny 2026-07-21) — board-accurate, seat-wrong.
          const keepsPunishFrame = !/how it gets punished/i.test(det)
            || !/you (can still |could |)(punish|take advantage)/i.test(w);
          const keepsAdvantageFrame = !/how you take advantage/i.test(det)
            || !/(gets|you get) punished/i.test(w);
          if (!isRepeat && keepsMate && keepsSac && keepsPunishFrame && keepsAdvantageFrame
            && narrationBoardAccurate(w, s.fenAfter)
            && narrationSeatFaithful(w, s.fenAfter, playerColor === 'white' ? 'w' : 'b')
            && narrationNumbersFaithful(det, w)) s.narration = w;
          spokenLines.add(s.narration.trim().toLowerCase());
        }
      }
    } catch { /* keep the deterministic templates */ }
  }

  // UNCAPPED: any line whose warming was REJECTED (a heavy sac/projection bundle
  // where the rephrase dropped the "sacrifice" canary or tripped board-accuracy)
  // still holds the diagnostic [tag] prefixes, which read badly aloud. Strip the
  // tags so every spoken line is clean prose that still carries all the data
  // (David 2026-07-20: the 3 heaviest moves showed raw brackets).
  if (uncapped) {
    for (const s of segments) {
      if (s.narration && s.narration.includes('[')) {
        s.narration = s.narration.replace(/\[[a-z-]+\]\s*/g, '').replace(/\s{2,}/g, ' ').trim();
      }
    }
  }

  const narratedCount = segments.filter((s) => s.narration !== null).length;
  void logAppAudit({
    kind: 'review-segments-generated',
    category: 'subsystem',
    source: 'coachFeatureService.generateReviewNarration',
    summary: `${narratedCount} of ${segments.length} plies narrated (deterministic)`,
    details: JSON.stringify({ totalSegments: segments.length, narratedCount, source: 'deterministic-ship3' }),
  });

  // THROUGH-LINE (future-analysis teaching #3) — the one theme that ran through
  // the whole game, named as the closing. Board-true; null when nothing recurs.
  const throughLineWB: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
  const closing = computeThroughLine(fenChain.map((f) => f.fenAfter), throughLineWB);

  return { intro, segments, closing };
}
