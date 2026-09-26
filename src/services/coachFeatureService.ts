import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { legalSeeGainOn } from './positionReadingService';
import { explainBestMoveGrounded, explainMoveOrder, describeMoveMerit, describeSacrifice, seatPieceReferences, describeStudentThreat, detectNewThreat, describeThreatPrevention } from './groundedAnswer';
import { selectTeaching } from './teachingSelector';
import { coldStudent, computeNeed, type StudentNeedContext, type NeedVerdict } from './needScore';
import { loadStudentNeedContext } from './studentNeedLoader';
import { layerStandings } from './teachingLayers';
import { readConversion, type ConversionStep } from './conversionMethod';
import { buildReviewMoveTeaching, buildReviewConversionTeaching, nameEndgamePhase } from './reviewMoveTeaching';
import { plyFactsClause, computePvLine, pvDepthForRating, type PvLine, type PvEngine } from './pvPlayback';
import { andList } from '../utils/andList';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { explainEvalByPieceQuality, lowestMinorMobility, type PieceQualityResult } from './pieceQuality';
import { compareTwoMoves, type Evaluate } from './moveComparison';
import { detectConcept } from './reviewConcepts';
// (removed spokenTacticNote / generalizedTeaching — review no longer voices a
// floating tactic-pattern note; that teaching lives on the tactics drill.)
import { buildMiddlegameOrientation, buildOpeningDevelopmentPlan, buildHisGroundedPlanBeat, buildMastersGroundedPlanBeat } from './reviewStrategicOrientation';
import { getHisPlayDb } from './hisPlayLookup';
import { ensureMastersDbLoaded, mastersMovesSync } from './masterPlayLookup';
import { refutedAlternative, candidatesForPosition, type RefutedAlternative } from './refutedAlternative';
import { transferClause, recordMotif, withTransfer, type MotifLedger } from './motifLedger';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { detectOpening } from './openingDetectionService';
import { resolveCuratedOpeningIdeas } from './reviewOpeningTheory';
import { detectPieceItineraries } from './reviewPieceItinerary';
import { pickStoryGame } from './reviewStoryGame';
import { sacrificeCompensation, enemyKingStuckInCenter, describeSacBreaksKingShield } from './reviewSacrifice';
import { detectForcedMatingSequence, explainMatingSacMechanism } from './reviewForcedSequence';
import { assessPositionalEdge, verdictBand } from './reviewPositionalAssessment';
import { classifyPhase } from './gamePhaseService';
import { foldStandingRefrains, emptyRefrainLedger } from './standingRefrains';
import { renderStructureAtoms } from './structureProse';
import { decide, habitNeedFrom } from './coachDecider';
import { boardStateAfter } from './boardState';
import { NO_BOOST, type StudentBoost } from './studentMomentBoost';
import { habitIsOwed, type MethodHabit } from './methodBeat';
import { recurrenceFor, recurrenceLine } from './misconceptionCallbacks';
import { fundamentalRecurrenceLine } from './fundamentalRecurrence';
import { proofCut, describeProofResult, type LineProof } from './exchangeLedger';
import { computeMoveFacets, computeThroughLine, prematureBreakWhy } from './reviewFullData';
import type { FactStakes } from './factStakes';
import { describeNotableMove, describeConcessions, findTrappedPiece, describeSimplifyingTrade, describeTradeConsequence, buildReviewDeepestLookahead, buildMissedShotSignal } from './reviewTeachingPoints';
import { computeGemCrush, buildReviewGemSay } from './gemCrushLines';
import { buildOpeningMoveDetail } from './reviewStrategicOrientation';
import { walkBookLine } from './theoryDeparture';
import { detectBadHabits } from './badHabitDetector';
import { db } from '../db/schema';
import { voiceFacts } from './coachApi';
// Post-game review narration is now GROUNDED (David 2026-07-09): the intro,
// closing, and recap are COMPUTED from the engine annotations and phrased by
// `voiceFacts` — no coachService.ask / free-LLM prose, no per-move segment
// LLM call (those are deterministic via `buildReviewSegments`).
import { logAppAudit } from './appAuditor';
import { whyItFailed } from './whyItFailed';
import { betterMoveReason } from './inaccuracyCall';
import { attributePrinciples, pvUciToSan, type PrincipleAttribution } from './principleAttribution';
import { buildCausalChain, causalChainArrows, causalChainMistakeTags, findMissedChain, findAllowedChain } from './causalChain';
import { renderCausalChain } from './causalChainVoice';
import { matchFundamental, matchTag, type WeaknessSignal } from './weaknessSignal';
import { loadWeaknessSignals } from './weaknessSignalLoader';
import { renderFundamentalVerdict, renderPvEvidence, renderFundamentalsRecap, isMethodSentence } from './principleVoice';
import { resolveCoachNarration } from '../utils/coachNarration';
import type { BadHabit, CoachContext, UserProfile, CoachNarration, OpeningKey } from '../types';
import { departureRecordSentence, openingRecordClause } from './openingRecordBeat';
import { ecoOfKey, openingEntryForKey, openingFamily, openingKeyFromSans } from './openingKey';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { describeEvalCp, isMateEval } from './engineConstants';
import { isMinorAtHome } from './development';

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

/** FEN-before-each-ply from the game PGN, so a recap can convert the engine's
 *  best-move UCI into clean SAN (David 2026-08-28: the recap printed raw UCI
 *  like "g6f4" / "h7h6" — bare notation TTS reads as gibberish). Index i aligns
 *  with moveData[i]: both are one-per-ply from the SAME game. Empty on a PGN
 *  that won't parse — callers fall back to the UCI string. */
function fenBeforeByPly(pgn: string): string[] {
  const out: string[] = [];
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    for (const mv of c.history({ verbose: true })) out.push(mv.before);
  } catch { /* recap falls back to UCI if the PGN won't parse */ }
  return out;
}

export async function generateNarrativeSummary(
  pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  _playerRating: number,
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
  const fenBefore = fenBeforeByPly(pgn);
  let prevEvalCp: number | null = 0;
  for (let i = 0; i < moveData.length; i++) {
    const m = moveData[i];
    const moverColor: 'White' | 'Black' = m.moveNumber % 2 === 1 ? 'White' : 'Black';
    const isStudent = !m.isCoachMove && moverColor === studentColorWB;
    if (isStudent && m.classification === 'blunder') blunderCount++;
    else if (isStudent && m.classification === 'mistake') mistakeCount++;
    else if (isStudent && m.classification === 'inaccuracy') inaccuracyCount++;
    if (isStudent && (m.classification === 'blunder' || m.classification === 'mistake')) {
      const fullMove = Math.ceil(m.moveNumber / 2);
      // Mate-aware (D-12): a sentinel eval reads "a forced mate for Black",
      // never "-300.0".
      // FROM THE STUDENT'S SIDE (walk 5, R14): the engine's numbers are
      // White's, so a Black student heard "+0.6 to +3.7" about the move that
      // lost them the game. A mate eval already names its colour — kept as is.
      const sideSign = studentColorWB === 'White' ? 1 : -1;
      const forStudent = (cp: number): string => (isMateEval(cp) ? describeEvalCp(cp) : describeEvalCp(cp * sideSign));
      const swing = prevEvalCp !== null && m.evaluation !== null
        ? ` (the evaluation moved from ${forStudent(prevEvalCp)} to ${forStudent(m.evaluation)}, counted from your side)`
        : '';
      // Convert the engine's best-move UCI → clean SAN (never speak raw UCI).
      const bestSan = m.bestMove ? (uciToSanAt(m.bestMove, fenBefore[i] ?? '') ?? m.bestMove) : null;
      keyMoments.push(
        `On move ${fullMove}, ${m.san} was a ${m.classification}${bestSan ? `; the engine preferred ${bestSan}` : ''}${swing}.`,
      );
    }
    prevEvalCp = m.evaluation;
  }
  const totalErrors = blunderCount + mistakeCount + inaccuracyCount;

  // Result → student-relative outcome (computed, not asked).
  const framedOpening = openingName ? frameOpeningForStudent(openingName, playerColor === 'black' ? 'black' : 'white') : null;
  const openingClause = framedOpening
    ? (framedOpening.owned ? `the ${framedOpening.label}` : `the game against the ${framedOpening.label}`)
    : 'this game';

  // Verbosity caps the number of moments named (brief = 1) — the SAME hard
  // contract the old prompt tried to hint at, now enforced in code (G5).
  const momentBudget = verbosity === 'brief' ? 1 : 3;

  // ONE TEXT, ONE VOICE (walk 2026-09-23: the card STILL rendered "Post-game
  // recap of … (student rated about 1366). The student made 0 blunder(s)" —
  // `voiceFacts` speaks the RAW facts on every one of its failure paths, so a
  // third-person package handed to the model was what the student read
  // whenever the model did not answer, and the `?? spokenFallback` below it
  // never fired). The second-person computed recap is now the only text: the
  // model warms it, and every fallback IS it.
  const spokenFallback = recapSecondPerson({
    outcome: result, playerColor, openingClause,
    blunderCount, mistakeCount, inaccuracyCount, keyMoments: keyMoments.slice(0, momentBudget), totalErrors,
  });
  // The flagged moments' moves must survive the phrasing: the review register's
  // "and there it is" beat kept the theatre and dropped the moves (walk
  // 2026-09-23 tape: "Here it is. That's where this one slipped." with no Bg4,
  // no Nc6). A reword that loses one is refused in favour of the computed text.
  const mustPreserve = keyMoments.slice(0, momentBudget).flatMap((k) => k.match(SAN_TOKEN_RE) ?? []);
  const voiced = (await voiceFacts(spokenFallback, { intent: `review-recap:${verbosity}`, warm: true, mustPreserve })) ?? spokenFallback;
  onStream?.(voiced);
  return voiced;
}

/** A SAN token inside a computed moment ("On move 3, Bg4 was a mistake; the engine preferred Nc6"). */
const SAN_TOKEN_RE = /\b(?:O-O(?:-O)?|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?)[+#]?/g;

/** The recap in the STUDENT's register, from the same computed numbers the
 *  model is handed. Exported so the gate can prove it never says "the
 *  student" and never renders a mate sentinel as a number. */
export function recapSecondPerson(r: {
  outcome: string;
  playerColor: string;
  openingClause: string;
  blunderCount: number;
  mistakeCount: number;
  inaccuracyCount: number;
  keyMoments: readonly string[];
  totalErrors: number;
}): string {
  // The result arrives as a PGN score from review AND as a word from the Play
  // surface (walk 2, 2026-09-23: "The game ended loss." with the opening
  // clause dropped). One normaliser, both shapes.
  const raw = r.outcome.trim().toLowerCase();
  const kind: 'win' | 'loss' | 'draw' | 'unfinished' | null =
    raw === '1-0' || raw === '0-1' ? (((raw === '1-0') === (r.playerColor === 'white')) ? 'win' : 'loss')
    : raw === '1/2-1/2' || raw === '½-½' || raw === 'draw' || raw === 'drawn' ? 'draw'
    : raw === 'win' || raw === 'won' ? 'win'
    : raw === 'loss' || raw === 'lost' ? 'loss'
    : raw === '*' || raw === 'ended' || raw === 'unfinished' || raw === 'abandoned' ? 'unfinished'
    : null;
  const outcome = kind === 'win' ? `You won ${r.openingClause}.`
    : kind === 'unfinished' ? `You stopped ${r.openingClause} before it finished.`
    : kind === 'loss' ? `You lost ${r.openingClause}.`
    : kind === 'draw' ? `You drew ${r.openingClause}.`
    : `This game ${r.openingClause} ended ${r.outcome}.`;
  const n = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : (word === 'inaccuracy' ? '' : 's')}`;
  const errors = r.totalErrors === 0
    ? 'The engine flagged nothing — you played cleanly.'
    : `You made ${[
        r.blunderCount > 0 ? n(r.blunderCount, 'blunder') : null,
        r.mistakeCount > 0 ? n(r.mistakeCount, 'mistake') : null,
        r.inaccuracyCount > 0 ? (r.inaccuracyCount === 1 ? '1 inaccuracy' : `${r.inaccuracyCount} inaccuracies`) : null,
      ].filter(Boolean).join(', ')}.`;
  // The key moments are third-person for the model ("the engine preferred");
  // in the student's voice the move is theirs.
  const moments = r.keyMoments.map((k) => k.replace(/^On move (\d+), (\S+) was a (\w+)/, 'On move $1 your $2 was a $3'));
  const tip = r.totalErrors === 0
    ? 'Keep that accuracy and pick one sharper idea to try next game.'
    : 'The one thing to carry into the next game: slow down at the flagged moments.';
  return [outcome, errors, ...moments, tip].join(' ');
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
  const md = moveData ?? [];
  const fenBefore = fenBeforeByPly(pgn);
  for (let i = 0; i < md.length; i++) {
    const m = md[i];
    const moverColor: 'White' | 'Black' = m.moveNumber % 2 === 1 ? 'White' : 'Black';
    // Only the STUDENT's own errors are the review's subject (a coach/opponent
    // slip isn't the student's lesson). Compare against the STUDENT's color —
    // NOT the opponent's (the old `coachColor` inversion counted the wrong
    // side; David 2026-07-19).
    if (m.isCoachMove || moverColor !== studentColorWB) continue;
    if (m.classification === 'blunder') {
      blunders += 1;
      // Convert the engine's best-move UCI → clean SAN (never speak raw UCI).
      const bestSan = m.bestMove ? (uciToSanAt(m.bestMove, fenBefore[i] ?? '') ?? m.bestMove) : null;
      keyMoments.push(`move ${Math.ceil(m.moveNumber / 2)} ${m.san} (a blunder${bestSan ? `; the engine preferred ${bestSan}` : ''})`);
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
    keyMoments.length > 0 ? `Watch especially for ${joinClauses(keyMoments)}.` : '',
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

  const intro = (await voiceFacts(introFacts, { intent: 'review-intro', preferRaw: true })) ?? introFacts;
  const closing = (await voiceFacts(closingFacts, { intent: 'review-closing', preferRaw: true })) ?? closingFacts;
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
  /** WO-TEACH-02 meter: a TEACHING fact spoke on this ply (the decider's own
   *  `teaches`). Undefined on plies no decision voiced — a fill that writes
   *  narration afterwards is, by definition, not the door teaching. */
  teaches?: boolean;
  /** N2 — the student's computed NEED for teaching at this ply (student plies
   *  only). The quiet per-move opening beat speaks only when `need.speak`;
   *  flags / plan one-shots / moments speak on their own importance. */
  need?: NeedVerdict;
  /** The fundamentals this (student, flagged) move neglected — attributed on
   *  the board (principleAttribution), spoken FIRST in `narration`, and
   *  aggregated into the closing. Undefined when nothing attached. */
  fundamentals?: PrincipleAttribution[];
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
  /** The projected line this segment's narration MENTIONS in prose — the delta
   *  ("the line runs h3, then d5, then e5…"), the opponent-punishment line
   *  ("here's how you take advantage: Ne5, then bxc5…"), or the deep-threat line
   *  ("it runs Qf2, then Be6…"). The board PLAYS IT OUT with a lead-the-eye arrow
   *  per move as the coach speaks it — the moves land on evolving positions, so
   *  they can't be shown as static arrows on the current board (David 2026-07-24:
   *  "we NEED arrows showing the lines the coach mentions. The delta!"). Each
   *  entry: `uci` = the arrow from→to, `fenAfter` = the board frame for that move.
   *  The student-slip better-line is already walked by the faucet's §5 playout, so
   *  this carries the OTHER lines the walk only spoke. `fenBefore` lets the
   *  board name the move (SAN) as it draws the arrow. */
  spokenLineArrows?: Array<{ uci: string; fenBefore: string; fenAfter: string }>;
  /** KEY SQUARES this ply's narration NAMED (trapped piece + its attacker, a
   *  passed pawn, a minority-attack target, colour-complex holes) — coupled from
   *  the fact-computer's OWN squares, never scraped from prose (G0). The review
   *  board paints these yellow while this segment is active so the eye lands on
   *  the square as the coach names it (David 2026-09-13 "add highlights to all
   *  spoken key squares"). Undefined when the ply named no clean square. */
  keySquares?: readonly string[];
  /** The STATIC threat call-out this ply's narration carries, tagged so the
   *  engine pass can CONFIRM it (David 2026-07-21: "We need to find a way for
   *  these two to work together. They need to compliment each other!!"). The
   *  static layer proposes and explains; the engine decides — agree → the
   *  claim stands and gains the engine's continuation; disagree → the static
   *  sentence is replaced by the engine's own line, voiced through the same
   *  fact-computers. `sentence` is the exact appended text (for replacement);
   *  `nullFen` is the student-moves-again position the claim was scanned on. */
  staticThreat?: { san: string; sentence: string; nullFen: string };
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
  /** Persisted engine lines (UCI) for a flagged ply — corroboration only. */
  pv?: { afterPlayed: string[]; afterBest: string[] };
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
  /** Grounded one-line "why YOUR move failed" — the other half of the pair.
   *
   *  🔒 `whyBetter` explains the ENGINE's move; this explains the student's.
   *  They are not the same lesson, and the second one is the thing they
   *  actually did: told only that the stronger move was X, they learn a move;
   *  told why their own idea failed, they learn the reason it will fail again.
   *
   *  Two board-provable geometries — the target was held by a guard the
   *  student did not look at, or nothing guarded it and the reply comes with
   *  check on the attacker. Null for every other shape, which is most of them.
   *  See `whyItFailed`. */
  whyItFailedLine: string | null;
  /** Squares behind `whyItFailedLine` — the target, then the piece that
   *  refutes it. Carried so a mark is drawn from the fact rather than parsed
   *  back out of the sentence. */
  whyItFailedSquares: string[];
}

/** Reconstruct the FEN at each ply from the move list. Uses chess.js
 *  to replay the SAN sequence — if any SAN is invalid we bail with a
 *  shorter list (better to narrate the moves we can than refuse the
 *  whole review). */
function buildFenChain(moves: ReviewMoveInput[]): { fenBefore: string; fenAfter: string }[] {
  // TRUST the per-ply fenAfter already computed upstream (adaptGameRecord, which
  // honors a `[SetUp]`/`[FEN]` header). Re-replaying the SANs from a fresh
  // STANDARD board — as this used to — truncated custom-start games at the first
  // move that's illegal on a standard board (the two-knights-odds game where
  // 3.O-O is legal only without the g1-knight). fenBefore[i] chains from the
  // prior ply's fenAfter; fenBefore[0] falls back to the standard start (only the
  // move-1 beat is affected, and its teaching is start-position-generic). A
  // legacy input without fenAfter drops to a guarded replay so nothing breaks.
  const START = new Chess().fen();
  const chain: { fenBefore: string; fenAfter: string }[] = [];
  if (moves.length > 0 && moves[0].fenAfter) {
    for (let i = 0; i < moves.length; i += 1) {
      const fenAfter = moves[i].fenAfter;
      if (!fenAfter) break;
      chain.push({ fenBefore: i > 0 ? moves[i - 1].fenAfter : START, fenAfter });
    }
    return chain;
  }
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
 * THE "BETTER MOVE" SAN, in ONE place.
 *
 * Defense-in-depth for games analysed BEFORE the source fix: never name the
 * move that was actually played as the "better" move. If the stored best move
 * resolves to the played SAN, treat it as absent so the narration uses its
 * no-alternative phrasing (or stays silent) instead of the incoherent
 * "<played move> was stronger" (David 2026-06-11).
 *
 * Extracted 2026-09-21 because it now has TWO readers — the segment loop's
 * prose and the attribution pre-pass below — and a derivation with two hand
 * copies is the drifting constant the rot rule bans. The attribution and the
 * sentence that speaks it must be about the same "better move" or the coach
 * explains one move and names another.
 */
function stripMoveGlyphs(san: string): string { return san.replace(/[+#!?]+$/, ''); }

function betterMoveSan(bestMove: string | null | undefined, playedSan: string, fenBefore: string): string | null {
  const raw = uciToSanAt(bestMove ?? null, fenBefore);
  return raw && stripMoveGlyphs(raw) !== stripMoveGlyphs(playedSan) ? raw : null;
}

/**
 * THE FUNDAMENTAL EACH STUDENT PLY BROKE — attributed ONCE, for the whole game,
 * before anything consumes it.
 *
 * 🔒 WHY A PRE-PASS AND NOT A CALL INSIDE THE SEGMENT LOOP (2026-09-21). The
 * attribution used to live in the loop, which runs AFTER `selectTeaching` — so
 * the two computers that decide whether a ply speaks (`computeNeed`) and how
 * much the moment is worth (`studentMomentBoost`) had already run, and neither
 * could ever see the fundamental. The coach could therefore say "you left a
 * piece loose AGAIN" — `fundamentalRecurrence` joins EXACTLY, through
 * `matchFundamental` — while the decider had matched the coarse positional
 * bucket and ranked the moment on some unrelated structural note. One sentence,
 * two joins, two different holes.
 *
 * Hoisting it (rather than attributing a second time in the selector) is what
 * keeps that impossible: the selector has no `bestSan`, so a second attribution
 * there would be a WEAKER one that could legitimately disagree with the
 * sentence. One attribution, three consumers — the need score, the ranker, and
 * the narration.
 *
 * Pure: chess.js + the persisted engine record. No I/O.
 */
function attributeGameFundamentals(
  moves: ReviewMoveInput[],
  fenChain: { fenBefore: string; fenAfter: string }[],
  usable: number,
  playerColor: 'white' | 'black' | null,
  sansForRun: readonly string[],
): Map<number, { fundamentals: PrincipleAttribution[]; why: string[] }> {
  const out = new Map<number, { fundamentals: PrincipleAttribution[]; why: string[] }>();
  for (let i = 0; i < usable; i++) {
    const m = moves[i];
    const fenPair = fenChain[i];
    const moverColor: 'white' | 'black' = m.ply % 2 === 1 ? 'white' : 'black';
    const isStudent = playerColor ? moverColor === playerColor : !m.isCoachMove;
    if (!isStudent) { out.set(m.ply, { fundamentals: [], why: [] }); continue; }
    const bestMoveSan = betterMoveSan(m.bestMove, m.san, fenPair.fenBefore);
    // WHY IT DECLINED (2026-09-20). A flagged student ply that led with the
    // classification label instead of the fundamental was undiagnosable from
    // the tape — the audit could say FUNDLEAD failed and never say why. That is
    // the silent null the `why` sink exists to abolish.
    const why: string[] = [];
    let fundamentals: PrincipleAttribution[] = [];
    try {
      fundamentals = attributePrinciples({
        historySans: sansForRun.slice(0, m.ply),
        bestSan: bestMoveSan,
        classification: m.classification,
        pvAfterPlayed: m.pv?.afterPlayed?.length ? pvUciToSan(fenPair.fenAfter, m.pv.afterPlayed) : undefined,
        pvAfterBest: m.pv?.afterBest?.length && bestMoveSan
          ? pvUciToSan((() => { const c = new Chess(fenPair.fenBefore); try { c.move(bestMoveSan); } catch { return fenPair.fenBefore; } return c.fen(); })(), m.pv.afterBest)
          : undefined,
        // Persisted engine eval, normalised to the MOVER's POV (stored
        // white-POV) — powers the eval/PV-gated detectors (overvalued attack,
        // poisoned pawn, botched conversion). Absent on games analysed before
        // the fix.
        evalBefore: typeof m.preMoveEval === 'number' ? (moverColor === 'white' ? m.preMoveEval : -m.preMoveEval) : undefined,
        evalAfterPlayed: typeof m.evaluation === 'number' ? (moverColor === 'white' ? m.evaluation : -m.evaluation) : undefined,
      }, why);
    } catch { fundamentals = []; }
    out.set(m.ply, { fundamentals, why });
  }
  return out;
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
    // ONE COACH (David 2026-09-25): the reason comes from the computer Learn's
    // verdict and the review walk speak (`betterMoveReason` — the engine-proven
    // order, then what the line wins). The board-only mechanism is the fallback
    // when the engine line cannot name one.
    const shared = suggestedSan && m.bestMove
      ? betterMoveReason(fenBefore, m.san, suggestedSan, [m.bestMove, ...(m.pv?.afterBest ?? [])], isWhiteMove ? 'white' : 'black')
      : null;
    const whyBetter = shared
      ? `${suggestedSan} was better — ${shared}.`
      : suggestedSan
        ? explainMoveOrder({
            fenBefore,
            betterSan: suggestedSan,
            worseSan: m.san,
            moverColor: isWhiteMove ? 'white' : 'black',
          })?.text ?? null
        : null;

    // WHY THE PLAYED MOVE FAILED — the companion to `whyBetter` above. Pure
    // chess.js geometry, no engine, so it costs nothing and cannot invent.
    const failed = whyItFailed({
      fenBefore,
      playedSan: m.san,
      studentColor: isWhiteMove ? 'white' : 'black',
    });

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
      whyItFailedLine: failed?.line ?? null,
      whyItFailedSquares: failed?.squares ?? [],
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
  /** The previous move's capture — a recapture is never a win (see describeMoveMerit). */
  prevCapture: { square: string | null; capturedValue: number } | null;
}): string | null {
  const { ply, isStudentMove, classification, bestMoveSan, preMoveEval, evaluation, fenBefore, playedSan, moverColor, prevCapture } = params;
  if (classification === null || classification === 'book' || classification === 'good') {
    return null;
  }

  const variant = ply % 3;

  // WHY the move is bad, when we can PROVE it (a premature central break while
  // behind in development). Danya leads the mistake with the positional reason,
  // THEN names the better move — so we prepend it to the negative-class stems.
  // Grounded + gated (never overstated); null when it doesn't genuinely apply.
  const whyBad = (classification === 'inaccuracy' || classification === 'mistake' || classification === 'blunder')
    ? prematureBreakWhy(fenBefore, playedSan)
    : null;
  const whyLead = whyBad ? `That's ${whyBad}. ` : '';
  const w = (s: string): string => whyLead + s; // prepend the proven why to a stem

  // The student's eval AFTER the move, in words — the honest fallback when a
  // strong move has no nameable geometry (a quiet consolidating move). Grounded
  // in the engine eval, never praise-for-praise's-sake.
  const studentEvalCp = evaluation === null ? null : (moverColor === 'white' ? evaluation : -evaluation);
  // ONE LADDER (David 2026-09-16). This was a FOURTH cp-to-word mapping, with
  // its own bands (300/100/40) AND its own words ("you hold a pull") — so the
  // same +120 could be "clearly better" in this beat and "a bit better" in the
  // positional verdict two plies later. The bands differing might be
  // defensible; the same WORDS meaning different evals is not, and the student
  // hears the contradiction. Reads `verdictBand` like every other caller.
  // Silent when the student is worse: this clause only ever decorates a GOOD
  // move, so it states an edge or says nothing (empty > generic).
  const evalBand = verdictBand(studentEvalCp);
  const studentEvalWord = evalBand === null || evalBand === 'a bit worse' || evalBand === 'in trouble'
    ? null
    : evalBand === 'balanced' ? 'the position stays balanced' : `you're ${evalBand}`;

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
        ? ` Drops about ${swingPawns.toFixed(1)} points.`
        : '';

  // WHY a strong move was strong — the concrete thing it DID on the board,
  // computed from chess.js (G3), never generic praise (David 2026-07-10). The
  // move is SOUND by classification (brilliant/great), so a piece it gives up is
  // a real sacrifice (decoy/deflection), not a hang — name it as such rather
  // than mislabel it as development or fall silent.
  const playedMerit = isStudentMove
    ? (describeMoveMerit(fenBefore, playedSan, moverColor, prevCapture) ?? describeSacrifice(fenBefore, playedSan))
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
    // Opponent brilliant/only-move — vary the stem so a game where they have to
    // find several only-moves in a row doesn't read the identical line each time
    // (David 2026-09-07, his Traxler: "Brilliant shot — your opponent found the
    // only line." fired four times verbatim).
    const oppStems = [
      'Their only move — and they found it.',
      'Precise — that was the one line that held for them.',
      'They had to find that, and they did — the only move.',
    ];
    return oppStems[variant];
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
        return w(stems[variant]);
      }
      return w('A small inaccuracy — there was a more precise move available.');
    }
    if (bestMoveSan) {
      return w(`Your opponent slipped — ${bestMoveSan} was stronger.`);
    }
    return whyBad ? whyLead.trimEnd() : null;
  }

  if (classification === 'mistake') {
    if (isStudentMove) {
      if (bestMoveSan) {
        const stems = [
          `This one gives back real ground — ${bestMoveSan} held the position.${swingPhrase}`,
          `${bestMoveSan} was the move; this hands the initiative back.${swingPhrase}`,
          `A real concession. ${bestMoveSan} kept everything together.${swingPhrase}`,
        ];
        return w(stems[variant]);
      }
      return w(`A real mistake — the engine had a stronger continuation.${swingPhrase}`);
    }
    if (bestMoveSan) {
      return w(`Your opponent erred — ${bestMoveSan} was much better.${swingPhrase}`);
    }
    return w(`Your opponent gave ground here.${swingPhrase}`);
  }

  if (classification === 'blunder') {
    if (isStudentMove) {
      if (bestMoveSan) {
        const stems = [
          `This is the moment — ${bestMoveSan} keeps you right in it.${swingPhrase}`,
          `Costly. Find ${bestMoveSan} here and the game holds.${swingPhrase}`,
          `${bestMoveSan} was sitting right there — this one changes the game.${swingPhrase}`,
        ];
        return w(stems[variant]);
      }
      return w(`A genuine blunder — the engine had a much stronger continuation.${swingPhrase}`);
    }
    if (bestMoveSan) {
      return w(`Your opponent blundered — ${bestMoveSan} would have held.${swingPhrase}`);
    }
    return w(`Your opponent blundered here.${swingPhrase}`);
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
 *  `raceTimeout`). The COMPUTER computes and RANKS every board fact
 *  (`buildReviewMoveBriefing`, most-important-first via the eval PV + delta —
 *  chess judgment, G0); the LLM only VOICES the ranked package in the house
 *  register, deciding nothing (David 2026-09-07: "Make sure the llm gets the
 *  computer facts"). On timeout the walk ships the deterministic, still-grounded
 *  templates rather than hanging "Preparing…". Worst case ≈ 55s to ready. */
const REVIEW_INTRO_VOICE_TIMEOUT_MS = 18000;
// Stockfish projection budget — bounds the ONE prep await that was try/catch-only
// so a wedged engine worker can never leave the walk stuck on "Preparing…".
// THE CEILING IS TIME, NEVER A PER-PASS COUNT (David 2026-07-24: "remove any
// caps"; G4.5). The projection passes run with unlimited budgets on EVERY
// review — that did not change when the inventory rendering register was cut on
// 2026-09-16 — so give them room to cover both sides deeply. The shorter
// 20s sibling constant was deleted with the capped scope it belonged to; do not
// reintroduce a second, tighter deadline as a back-door cap.
const REVIEW_AUGMENT_TIMEOUT_MS_UNCAPPED = 75000;

/** Reframe a seat-free `buildReviewMoveTeaching` sentence as the OPPONENT's, so
 *  Black's quiet developing moves get the SAME positional teaching the student's
 *  do (David 2026-07-24: "same level of narrations for opponents moves… I'm not
 *  hearing narrations for black's moves"). The teaching sentences are already
 *  3rd-person-singular ("The knight bears down…", "Stakes a claim…"), so the
 *  transform is clean: a piece subject becomes "Your opponent's <piece>…", a
 *  verb-first observation becomes "Your opponent <verb>…", and "the opponent"
 *  (which meant the student in a neutral sentence) becomes "you". */
export function frameTeachingForOpponent(sentence: string): string {
  // The neutral sentence's "the opponent" means the mover's opponent = the
  // STUDENT, so from the opponent's seat it becomes "you" / "your" (possessive
  // FIRST so "the opponent's" → "your", never the broken "you's").
  const s = sentence.trim()
    .replace(/\bthe opponent's\b/g, 'your')
    .replace(/\bthe opponent\b/g, 'you');
  // A CHECK sentence needs its INTERNAL pronouns flipped, not just its subject.
  // The seat-free line is written student-as-checker ("The check forces THEIR
  // king to react — YOU set the tempo…"), so for the OPPONENT's check the king
  // in check is YOURS and THEY hold the initiative (David 2026-09-14: "they are
  // checking me, so it's my king not their king"). Must run before the generic
  // "^The …" subject swap below, which would leave the inner pronouns wrong.
  if (/^The check\b/.test(s)) {
    return s
      .replace(/^The check\b/, "Your opponent's check")
      .replace(/\btheir king\b/g, 'your king')
      .replace(/\byou set the tempo\b/g, 'they set the tempo');
  }
  // The universal teacher (reviewMoveTeaching) emits "The pawn …" / "The check
  // …" too, so include them — else "The pawn clamps down…" falls to the
  // verb-first branch and reads "Your opponent the pawn clamps down…" (double
  // subject — the 2026-07-25 re-walk bug).
  if (/^The\s+(pawn|knight|bishop|rook|queen|king|check|capture)\b/.test(s)) {
    return s.replace(/^The\s+/, "Your opponent's ");
  }
  // "Now <student weakness>…" — a pawn move that leaves a weakness in the
  // student's camp; frame it as the opponent's doing, not a bare "Now".
  if (/^Now\s+/.test(s)) {
    const rest = s.slice(4);
    return `Your opponent's move — ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
  }
  // Verb-first observation ("Stakes a claim…", "Opens the f-file…") — already
  // 3rd-person-singular, so "Your opponent " + the verb reads correctly.
  return `Your opponent ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
}

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
  /** The student's rating — scales the causal-chain depth (beginners hear every
   *  link; strong players hear the compressed 2–3). Default 1500 (medium). */
  rating?: number,
  /** THE STUDENT MODEL (Phase 1). When a chain the student ERRED into (missed /
   *  allowed) matches a hole they keep falling in, the review appends an honest
   *  "this recurs for you — worth drilling" recap. Optional/inert when absent. */
  studentWeaknesses?: readonly WeaknessSignal[],
  /** THE STUDENT'S NEED CONTEXT (unified-coach N2). Gates the quiet per-move
   *  opening teaching on this student's own data (book departures, holes, line
   *  familiarity, results). Absent = a cold student → the rating prior teaches
   *  (today's behaviour for a fresh install; never a mute coach). */
  studentNeed?: StudentNeedContext,
  /** The game being narrated (WO-LOOP-01). The recurrence clause counts PRIOR
   *  games, so the sweep's rows for THIS game must not be mistaken for one. */
  currentGameId?: string | null,
  /** S2 — the refuted alternative per student ply, computed by the async caller
   *  (engine work cannot run inside this synchronous builder). Absent = no
   *  engine budget, the same honest answer as an empty map; both production
   *  callers pass it explicitly (the walk's builder and CoachGameReview's
   *  synchronous rebuild), so only the unit tests rely on the default. */
  refutedByPly: ReadonlyMap<number, RefutedAlternative> = new Map(),
): ReviewMoveSegment[] {
  // Curated, opening-specific ideas for the dev-plan beat (null → uncurated).
  const curatedOpeningIdeas = resolveCuratedOpeningIdeas(openingName ?? null);
  // WHERE THIS STUDENT STANDS PER TEACHING LAYER (WO-LAYERS-01), once per
  // review — the same record every ply of the walk is judged against.
  const layers = layerStandings(studentWeaknesses ?? [], studentNeed?.capabilities);
  // Package-completion once-per-game beats (David 2026-07-24: "complete the
  // package"): the simplify-when-ahead trade idea fires at most once.
  let tradeIdeaSpoken = false;
  // Per-GAME seed (stable within a game, different across games) — rotates the
  // dev-plan's lead idea + stem so the same opening never reads as the same
  // recording every game (David 2026-07-21: "the same response every time").
  const gameSeed = moves.reduce((a, m) => (a * 31 + m.san.charCodeAt(0)) >>> 0, moves.length >>> 0);
  // §1 piece-route itineraries — the student's REAL reroutes in this game
  // ("f3–d2–c4"), keyed by the ply the maneuver completes (G3, from the moves).
  const pieceItineraries = playerColor
    ? detectPieceItineraries(moves.map((m) => m.san), playerColor)
    : new Map<number, { text: string }>();
  const fenChain = buildFenChain(moves);
  const usable = fenChain.length;
  // Hoisted above the selector (2026-09-21): the attribution pre-pass needs the
  // run's SANs, and the selector needs the pre-pass. See
  // `attributeGameFundamentals` for why the attribution moved ahead of the
  // segment loop.
  const sansForRun = moves.slice(0, usable).map((mm) => mm.san);
  /** The fundamental each student ply broke — attributed ONCE, consumed by the
   *  need score, the ranker and the narration. */
  const attrByPly = attributeGameFundamentals(moves, fenChain, usable, playerColor ?? null, sansForRun);
  // THE ONE SELECTOR's student term (N2): need per student ply, computed once
  // for the game from the student's own data (cold → the rating prior). This is
  // what retires R2 ("teach every silent opening move"): a book ply speaks only
  // when THIS student needs it — a line they have played right five times is
  // silent, a line they keep leaving early is taught.
  // COLD FAST-PATH: a student below the cold-start floor (or a caller with no
  // context) clears the bar on the rating prior at every ply, so the thread /
  // landed-tactic computation cannot change a verdict — skip the selector and
  // stamp the prior directly (keeps the legacy callers' walk at its old cost).
  // 🚨 KEEP THE WHOLE PACKAGE. This used to end `.needByPly`, throwing away
  // everything else the selector computed — including the student term the
  // RANKER needs. Review's `decide()` then passed no `momentBoost` at all, so
  // on the surface where diagnosis happens a student's own recorded holes could
  // not raise a single moment: the weaknesses were loaded, used to ORDER facts,
  // and ignored by the computer that decides how much a moment is worth saying.
  const selectorPkg: { needByPly: ReadonlyMap<number, NeedVerdict>; boostByPly: ReadonlyMap<number, StudentBoost> } = playerColor
    // ZERO games only (B7b): the prior FADES now, so from the first analysed
    // game the data terms and the prior must be summed by the selector — a
    // fast path that stamped the prior for anyone under COLD_START_GAMES
    // would silence a two-game student whose data plus prior clears the bar.
    ? (!studentNeed || studentNeed.gamesPlayed === 0)
      ? { boostByPly: new Map(), needByPly: new Map(moves.slice(0, usable)
          .filter((mv) => (mv.ply % 2 === 1 ? 'white' : 'black') === playerColor)
          // `clauseKind: null` is the honest answer on THIS branch, not a
          // default: it is the cold-start fast path (no student data, or fewer
          // than COLD_START_GAMES games), where every data term is zero and the
          // prior decides regardless. The warm path below goes through
          // `selectTeaching`, which computes the ply's concept properly.
          // `clauseKind` and `fundamentalId` are both honestly null on THIS
          // branch, not defaulted: it is the cold-start fast path, where every
          // data term is zero and the prior decides regardless.
          .map((mv) => [mv.ply, computeNeed({ ply: mv.ply, studentMove: true, clauseKind: null, fundamentalId: null }, studentNeed ?? coldStudent(rating ?? DEFAULT_STUDENT_RATING))] as const)) }
      : (() => {
        try {
          return selectTeaching({
            plies: moves.slice(0, usable).map((mv, i) => ({
              ply: mv.ply, san: mv.san, fenBefore: fenChain[i].fenBefore, fenAfter: fenChain[i].fenAfter,
              playerColor: mv.ply % 2 === 1 ? 'white' as const : 'black' as const,
              evalBefore: mv.preMoveEval, evalAfter: mv.evaluation, classification: mv.classification,
              // THE TIE: the fundamental the attributor proved on this ply, the
              // same one the narration will speak. `matchFundamental` joins it
              // to the student's own `fundamental:<id>` rows — the very rows the
              // Fundamentals tab counts — so the heat map the student SEES and
              // the need the decider COMPUTES are one number.
              fundamentalId: attrByPly.get(mv.ply)?.fundamentals[0]?.id ?? null,
            })),
            studentColor: playerColor, rating, kind: 'game', surface: 'review', student: studentNeed,
          });
        } catch { return { needByPly: new Map<number, NeedVerdict>(), boostByPly: new Map<number, StudentBoost>() }; }
      })()
    : { needByPly: new Map<number, NeedVerdict>(), boostByPly: new Map<number, StudentBoost>() };
  const needByPly = selectorPkg.needByPly;
  const boostByPly = selectorPkg.boostByPly;
  /** Fundamentals already spoken in full this game — repeats get the short stem. */
  const seenFundamentals = new Set<import('./principleAttribution').FundamentalId>();
  const seenConversionSteps = new Set<ConversionStep>();
  /** S6 transfer: tactic motif → the move it was first SPOKEN this game. */
  const motifFirstMove: MotifLedger = new Map();
  /** S2: opening principles SPOKEN this game — committed after the door. */
  const principlesTaught = new Set<string>();
  /** S4: the first ply of each phase the game reaches after the opening. */
  const phaseTurnAt = new Map<number, 'middlegame' | 'endgame'>();
  {
    let prevPhase: string | null = null;
    for (let k = 0; k < usable; k += 1) {
      const phase = classifyPhase(fenChain[k].fenAfter, moves[k].ply);
      if (prevPhase !== null && phase !== prevPhase && (phase === 'middlegame' || phase === 'endgame')
        && ![...phaseTurnAt.values()].includes(phase)) phaseTurnAt.set(moves[k].ply, phase);
      prevPhase = phase;
    }
  }
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
  // Same enemy threat announced once — a threat that PERSISTS across the
  // opponent's moves (e.g. Qxb7# standing for two plies) must not re-warn
  // verbatim on each move (David 2026-07-23: the mating-net line repeated
  // word-for-word on consecutive moves). Keyed by the threat's SAN.
  const threatsAnnounced = new Set<string>();
  // D#6 — per-game dedupe for the causal chain and its recurrence recap, so the
  // same cross-move story doesn't LEAD several beats and "this keeps recurring —
  // <hole>" isn't repeated on every move that maps to the same weakness.
  const causalChainsSeen = new Set<string>();
  const recurrenceLabelsSeen = new Set<string>();
  // Deepest-look-ahead shots announced (David 2026-07-26 — the review-register
  // peer of the live speakDeepestLookahead), keyed by the shot's SAN so the same
  // combination is called out once per game.
  const deepShotAnnounced = new Set<string>();
  // FORESIGHT-AS-A-SKILL beats, deduped on the geometry they describe. The same
  // alignment can recur for plies; naming it once is teaching, naming it five
  // times is the drumbeat the method layer already learned not to be.
  const signalsAnnounced = new Set<string>();
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
  // ── SAY-ONCE LEDGER (David 2026-07-23: "Drop repeats, drop repeats, and make
  // every one add something new") ─────────────────────────────────────────────
  // The standing-state family: a live tactic, an undefended piece, an
  // attacker/defender imbalance, a royal-fork target, a rook on the 7th. Each
  // teaching read is spoken ONCE PER GAME, keyed on a seat-normalized signature:
  // a re-appearance of the SAME fact (even after it dropped off the board and
  // returned) adds nothing new, so it stays silent; a genuinely DIFFERENT one
  // (new squares → new signature) is new content and still speaks. This is the
  // hard "drop repeats, drop repeats … every one adds something new" rule — it
  // supersedes the earlier appear-only pass, which still let a flickering fact
  // ("your pawn on e4 is undefended") restate itself two or three times.
  const STANDING_STATE_RE = /^\[(tactic|loose|count|royal|rook7)\]/;
  const standingSpoken = new Set<string>(); // signatures of standing reads spoken
  const sacSpoken = new Set<string>(); // sacrifice-compensation profiles spoken
  // Verdict is ATOM-DIFFED: the verdict WORD (balanced/better/worse) speaks when
  // it changes; each REASON speaks only the first time it is true — so a growing
  // edge adds just the NEW asset ("you now own the open d-file") instead of
  // re-listing the whole pile every ply ("bishop pair; a7 isolated; passer…").
  let lastVerdictWord: string | null = null;
  const verdictReasonsSeen = new Set<string>();
  // Plans dedup by GOAL, not exact wording: the full "here's how" recipe is
  // stated ONCE per distinct goal (attack the king / seize the d-file / win the
  // weak pawn / push the passer), never re-recited when the phrasing drifts a
  // ply later. Square specifics are stripped from the key so "attack the king on
  // e8" and "attack the king on e8 before it runs" collapse to one goal.
  const planGoalsSeen = new Set<string>();
  /** Refuted alternatives already SPOKEN this game, by the move refuted. */
  const refutedSaid = new Set<string>();
  // The RACE verdict last spoken. Keyed on WHO ARRIVES FIRST, not on the counts:
  // the counts change on every push, so keying on them would re-announce the race
  // each ply. A flip — you were winning the race and now you are not — IS the
  // moment worth teaching, and it is the only repeat this lets through.
  let lastRaceVerdict: string | null = null;
  const standingSig = (f: string): string =>
    f.replace(/^\[[a-z0-9-]+\]\s*/, '')
      .toLowerCase()
      .replace(/\b(?:your|their|my|mine|our|white|black)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  // Structure is taught at the SUB-CLAIM level: each open file / outpost /
  // passed / isolated / doubled pawn is named the first time it is true, then
  // never restated. A genuinely new atom (a file that just opened, a new passed
  // pawn) still speaks; the unchanged ones fall silent — so the [structure]
  // line always ADDS something instead of re-listing the whole pawn skeleton.
  const structAtomsSeen = new Set<string>();
  // PURE since B4 (2026-09-22): it reports which atoms it would CLAIM and the
  // caller writes `structAtomsSeen` only once the facet has actually spoken.
  // `claimedThisPly` keeps the within-ply dedupe the ledger used to give.
  const freshStructureFacet = (facet: string, outpostSquaresAlreadySaid: ReadonlySet<string> | undefined, claimedThisPly: Set<string>): { text: string; atoms: string[] } | null => {
    const claimed: string[] = [];
    const inner = facet.replace(/^\[structure\]\s*/, '').replace(/\.\s*$/, '');
    const atoms: string[] = [];
    for (const seg of inner.split(' · ')) {
      const listed = /^(open files|passed pawns|isolated pawns|doubled pawns)\s+(.*)$/.exec(seg);
      if (listed) {
        const label = listed[1].replace(/s$/, ''); // "open files" → "open file"
        for (const item of listed[2].split(/,\s*/)) atoms.push(`${label} ${item}`.trim());
      } else {
        // outposts segment: "White knight outpost e5; Black bishop outpost d4"
        for (const item of seg.split(/;\s*/)) atoms.push(item.trim());
      }
    }
    const fresh = atoms.filter((a) => {
      const k = a.toLowerCase();
      if (structAtomsSeen.has(k) || claimedThisPly.has(k)) return false;
      if (/outpost/i.test(a) && outpostSquaresAlreadySaid) {
        const sq = a.match(/\b[a-h][1-8]\b/)?.[0];
        if (sq && outpostSquaresAlreadySaid.has(sq)) { claimedThisPly.add(k); claimed.push(k); return false; }
      }
      claimedThisPly.add(k);
      claimed.push(k);
      return true;
    });
    // Spoken as ENGLISH from the student's seat, never as the machine
    // inventory (`isolated pawns white a3`) the computer emits — see
    // structureProse.ts. The dedupe key stays the RAW atom so the
    // once-per-game contract is unaffected by the phrasing.
    return fresh.length
      ? { text: `[structure] ${renderStructureAtoms(fresh, playerColor === 'white' ? 'w' : playerColor === 'black' ? 'b' : null)}`, atoms: claimed }
      : null;
  };
  // TEACHING REFRAINS speak ONCE per review (David 2026-07-22: "Once a line
  // like this has been said that's it"). The FACTS stay every time (the
  // squares given up, the piece walked away from); the PRINCIPLE attached to
  // them ("pawns don't move back…", "a standing invitation", "the worst
  // defenders…") is taught on first occurrence and stripped after.
  const REFRAINS: Array<{ re: RegExp; sub: string }> = [
    { re: / — pawns don't move back, so (?:that square|those squares) now needs? piece cover/, sub: '' },
    { re: /, and an undefended piece is a standing invitation/, sub: '' },
    { re: / — and the king and queen are the worst defenders, because the moment you hit the guard the piece drops/, sub: '' },
    { re: / — a piece that sees nothing defends nothing/, sub: '' },
    { re: / more attackers than defenders, so/, sub: ' so' },
    { re: / — hemmed in behind its own pawns on the same colour, with almost nowhere to go/, sub: '' },
    // THE EVAL-SHIFT EXPLAINER — 8 times in one 33-ply review. This one STRIPS
    // rather than referring back (unlike the standing facts in
    // `standingRefrains.ts`), because its tail is not a fact of its own: "the
    // new pressure the move creates" / "the lines it opened" are POINTERS to
    // the [does] and [delta] facets already spoken in the same breath. There is
    // nothing to call back to. What the student needs every time is the number
    // and the direction; what they need once is what "positional" means here.
    { re: /: the shift is positional — [^.]*(?=\.)/, sub: ': the shift is positional' },
  ];
  const spokenRefrains = new Set<number>();
  // A HABIT IS A ROUTINE, NOT A RUNNING TOTAL. One ledger for the whole game, so
  // "ask what THEY want" is taught once and the later slips carry board facts
  // instead of the same lecture. This is what lets the method BAR be need-driven
  // (methodBeat.ts) without the ten-plies-in-a-row drumbeat coming back — a bar
  // tuned to suppress repetition suppresses teaching too.
  const spokenHabits = new Set<MethodHabit>();
  // WHICH HABITS THIS STUDENT STILL OWES, read off the spine ONCE per game —
  // it is a property of the student, not of the ply, so computing it per move
  // would be the same answer N times.
  const reviewHabitNeed = habitNeedFrom(studentWeaknesses ?? []);
  // PURE since B4: the first fact on a ply to carry a refrain KEEPS it and
  // reports the claim; a second fact on the same ply has it stripped, exactly
  // as before. The claim reaches `spokenRefrains` only when that fact speaks.
  const refrainOnce = (text: string, claimedThisPly: Set<number>): { text: string; claims: number[] } => {
    let out = text;
    const claims: number[] = [];
    REFRAINS.forEach((r, idx) => {
      if (!r.re.test(out)) return;
      if (spokenRefrains.has(idx) || claimedThisPly.has(idx)) out = out.replace(r.re, r.sub);
      else { claimedThisPly.add(idx); claims.push(idx); }
    });
    return { text: out, claims };
  };
  // DEVELOPMENT NAGS fire once per review, period — "the user knows it needs
  // developing after the first mention". One-shot by TAG, not by string (the
  // set of undeveloped pieces shrinks, so exact-string dedup let each
  // variant through).
  const oneShotTags = new Set<string>();
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
  // Base families already announced (text before the first ':' — "Italian Game",
  // "Caro-Kann Defense"). The re-naming beat dedupes on THIS, not the full ECO
  // name: a heavily-transposing opening yields a new sub-variation almost every
  // ply, which used to emit 6+ bare "This has become the Italian Game: <sub>"
  // lines with no teaching (the sparse-narration class caught in the 2026-07-25
  // hand audit). Name the family ONCE; the rich plan/threat beats carry the
  // specific sub-variation.
  const announcedOpeningFamilies = new Set<string>();
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
    // N2 — the student's computed need at this ply. Only the STUDENT's plies
    // carry one; undefined on the opponent's / when no student colour was given.
    const needHere = needByPly.get(m.ply);
    // Track the opponent's own moves for the development read below.
    if (moverColor !== playerColor) opponentSans.push(m.san);
    // Track every SAN for the live variation-naming beat below.
    allSans.push(m.san);
    // THE PER-MOVE BRIEFING — every important aspect of the move, computed and
    // ranked most-important-first (salience lifted by the eval swing), the
    // criticality "this was the moment" line leading when the decision mattered,
    // in the review register (David 2026-09-07: "compute all the facts, order
    // them in level of importance using the PV and delta… state all important
    // aspects of each move"). Supersedes the thinner first-builder-wins
    // plyFactsForMove/buildReviewMoveTeaching that stated only ONE aspect.
    const moveBriefing = (moverIsStudent: boolean): string | null => {
      const swingCp = (m.evaluation != null && m.preMoveEval != null && studentColorWB !== null)
        ? (studentColorWB === 'w' ? 1 : -1) * (m.evaluation - m.preMoveEval)
        : null;
      const critical = m.classification === 'inaccuracy' || m.classification === 'mistake'
        || m.classification === 'blunder' || m.classification === 'brilliant' || m.classification === 'great'
        || (swingCp != null && Math.abs(swingCp) >= 150);
      return buildReviewMoveBriefing({
        fenBefore: fenPair.fenBefore, san: m.san, prev: prevCap,
        moverIsStudent, studentSwingCp: swingCp, criticalMoment: critical,
        // The eval verdict + why (why the position is what it is) and the delta
        // (how this move moved it) — the reasons David wants to hear.
        evalAfterWhiteCp: m.evaluation, evalBeforeWhiteCp: m.preMoveEval,
        studentColorWB: studentColorWB ?? undefined,
      });
    };
    const bestMoveSan = betterMoveSan(m.bestMove, m.san, fenPair.fenBefore);
    // THE FUNDAMENTAL THIS MOVE NEGLECTED (David 2026-09-05) — attributed on
    // the board, pure and deterministic, only for the STUDENT's flagged moves.
    //
    // READ, not recomputed: `attributeGameFundamentals` ran this before the
    // selector so the need score and the ranker could see it too (2026-09-21).
    // Attributing again here would be a second copy of the same derivation —
    // and the whole point is that the sentence and the decision are about the
    // SAME hole.
    const isStudentForAttr = playerColor ? moverColor === playerColor : !m.isCoachMove;
    const attrHere = attrByPly.get(m.ply);
    const attrWhy: string[] = attrHere?.why ?? [];
    const fundamentals: PrincipleAttribution[] = attrHere?.fundamentals ?? [];
    const fundamentalLed = fundamentals.length > 0;
    // Emitted ONCE per flagged student ply that got NOTHING — a named ply has
    // nothing to explain, and logging every ply would drown the stream it is
    // read from. Guarded the same way the sweep's is.
    if (isStudentForAttr && !fundamentalLed && attrWhy.length > 0
      && (m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder')) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachFeatureService.reviewFundamentalDeclined',
        summary: `ply ${m.ply} ${m.classification} ${m.san}: no fundamental — ${attrWhy[0]}`,
        details: JSON.stringify({ ply: m.ply, san: m.san, classification: m.classification, bestSan: bestMoveSan, why: attrWhy }),
      });
    }
    // 🔗 THE CROSS-MOVE CAUSAL CHAIN (David 2026-09-07: "fact A caused fact B
    // caused fact C. THIS IS CHESS! Moves do not exist in isolation."). When THIS
    // move is a tactic that collected a loose enemy piece whose looseness traces
    // to an earlier move (a premature queen taking a defender's square → the
    // defender displaced → the piece left loose), LEAD the beat with the
    // board-proven chain — the one teaching that links the moves instead of
    // grading each alone. Self-gates (null unless a real cross-move chain is
    // PROVABLE, per the silent-on-unprovable rule); runs for either side (the
    // cause is often the OPPONENT's early queen enabling the student's tactic).
    // BOTH WAYS (David 2026-09-07): the chain that was PLAYED, the winning chain
    // the student MISSED (what they could have done), and the chain their move
    // ALLOWED the opponent (how it could have been avoided). Priority: a tactic
    // played on this move is the main story; else a shot they allowed the opponent
    // (prophylaxis); else a win they missed. Arrows only for played/allowed (both
    // valid on the after-move board the segment shows); the missed frame is the
    // before-move board, so its narration is retrospective and carries no arrows.
    let causalLead: string | null = null;
    let causalArrows: ReviewMoveSegment['planArrows'];
    if (studentColorWB !== null) {
      try {
        const isStudentMove = (moverColor === 'white') === (studentColorWB === 'w');
        const played = buildCausalChain({ historySans: sansForRun.slice(0, m.ply) });
        const chain = played
          ?? (isStudentMove ? findAllowedChain(sansForRun, m.ply, studentColorWB) : null)
          ?? (isStudentMove ? findMissedChain(sansForRun, m.ply, studentColorWB) : null);
        // Per-game dedupe (D#6): the same cross-move chain can re-derive across
        // adjacent plies (the played/allowed/missed paths surface a recurring
        // tactic more than once). Signature = stance + each node's kind+squares.
        // If it has already LED a beat this game, don't lead with it again.
        const chainSig = chain
          ? `${chain.stance}:${chain.nodes.map((n) => `${n.kind}${n.squares.join('')}`).join('|')}`
          : '';
        if (chain && !causalChainsSeen.has(chainSig)) {
          causalChainsSeen.add(chainSig);
          const lines = renderCausalChain(chain, { register: 'review', studentColor: studentColorWB, rating: rating ?? DEFAULT_STUDENT_RATING });
          if (lines.length) causalLead = lines.join(' ');
          // RECURRENCE RECAP (Phase 1) — when the student ERRED into this chain
          // (missed a win / allowed a shot) AND it maps to a hole they keep
          // falling in, name the pattern so the lesson lands: "this recurs for
          // you." Board-honest (the chain is real) + profile-honest (openCount
          // proves recurrence). Never on a PLAYED win (that's not a leak), and
          // never invented — only when a matched, recurring weakness exists.
          if (causalLead && studentWeaknesses && studentWeaknesses.length > 0 && (chain.stance === 'missed' || chain.stance === 'allowed')) {
            let recur: WeaknessSignal | null = null;
            for (const tag of causalChainMistakeTags(chain, studentColorWB)) {
              const hit = matchTag(tag, studentWeaknesses);
              if (hit && hit.openCount >= 2 && (!recur || hit.openCount > recur.openCount)) recur = hit;
            }
            if (recur && !recurrenceLabelsSeen.has(recur.label)) {
              // NAME THE GAME (David 2026-09-16: "Yes! Name the game! Date and
              // opponent if available"). Counted in GAMES, and this game's own
              // swept rows are never a "prior" (`recurrenceFor`, WO-LOOP-01).
              // Each clause appears only when its source actually knows it: no
              // "against your opponent", no invented recency.
              const read = recurrenceFor(recur, currentGameId);
              if (read) {
                recurrenceLabelsSeen.add(recur.label);
                causalLead += ` ${recurrenceLine(recur.label, read, 'review')}`;
              }
            }
          }
          if (chain.stance === 'played' || chain.stance === 'allowed') {
            const CHAIN_ARROW_HEX: Record<string, string> = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', blue: '#3b82f6' };
            const arr = causalChainArrows(chain);
            if (arr.length) causalArrows = arr.map((a) => ({ startSquare: a.from, endSquare: a.to, color: CHAIN_ARROW_HEX[a.color] ?? '#22c55e' }));
          }
        }
      } catch { causalLead = null; }
    }
    // UNCAPPED diagnostic branch — emit EVERY computed facet on EVERY move (David
    // 2026-07-20: "turn off all narration caps"). Skips the one-beat cascade + the
    // one-shot flags entirely; the aggregator is the full data inventory.
    if (uncapped) {
      // Key squares each facet NAMED, coupled from the computer (never scraped)
      // so the review can lead the eye with a yellow highlight per kept facet.
      const facetSquares = new Map<string, readonly string[]>();
      // Facts describing what the OPPONENT is doing TO the student, coupled from
      // the tactic detector's own `beneficiary` — the selector's tie-break.
      const facetIncoming = new Set<string>();
      // What each facet is worth on the board — coupled by the computer that
      // produced it; the door orders by it (factStakes.ts).
      const facetStakes = new Map<string, FactStakes>();
      const facetIdentity = new Map<string, string>();
      const facets = computeMoveFacets({
        fundamentals,
        seenFundamentals,
        teaching: {
          refutedAlt: refutedByPly.get(m.ply) ?? null,
          prevFenBefore: i > 0 ? fenChain[i - 1].fenBefore : null,
          phaseTurn: phaseTurnAt.get(m.ply) ?? null,
          principlesTaught,
        },
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
        bestLineUci: m.bestMove ? [m.bestMove, ...(m.pv?.afterBest ?? [])] : [],
        replyBestSan: i + 1 < moves.length ? uciToSanAt(moves[i + 1].bestMove ?? null, fenPair.fenAfter) : null,
        prevCap,
        allSans: sansForRun,
        forcedRunStartPly: forcedRun ? forcedRun.startPly : null,
      }, facetSquares, facetIncoming, facetStakes, facetIdentity);
      // THE CONVERSION METHOD (WO-LAYERS-01 step 5), on the student's move when
      // they are a piece or more up — the step the board is on, once per step
      // per game (the step only changes when the board does).
      if (moverColor === playerColor && studentColorWB) {
        const conv = readConversion(fenPair.fenAfter, studentColorWB);
        if (conv && !seenConversionSteps.has(conv.step)) {
          seenConversionSteps.add(conv.step);
          facets.push(`[technique] ${conv.text}`);
        }
      }
      // THE LOOP, OUT LOUD — ON THE PATH PROD ACTUALLY RUNS (WO-LOOP-01, run 4).
      // `isReviewUncapped()` is TRUE by default, so every shipped review beat is
      // composed here from facets; the capped block below never runs for a real
      // student. The recurrence clause rides on the `[principle]` facet — the
      // same claim as the verdict, so the selector's subsumption and rank see
      // one fact, not two. Found by `audit-loop-closes-prod`: A recorded, the
      // pair shared loose-piece, B's beat led with the verdict and said nothing
      // about the prior game.
      // Every say-once ledger on this path is written AFTER the door, and only
      // for a fact the door let through (B4) — this one via a scratch copy.
      const recurScratch = new Set(recurrenceLabelsSeen);
      if (fundamentals.length > 0) {
        const recur = fundamentalRecurrenceLine({
          ids: fundamentals.map((f) => f.id), signals: studentWeaknesses ?? [],
          currentGameId, register: 'review', seenLabels: recurScratch,
        });
        if (recur) {
          const i = facets.findIndex((f) => f.startsWith('[principle] '));
          if (i >= 0) facets[i] = `${facets[i]} ${recur}`;
          else facets.push(`[principle] ${recur}`);
        }
      }
      // ── NO CORPUS NOTE IN REVIEW (David 2026-09-23) ─────────────────────
      // "Remove corpus notes for learn with coach (free play) and review with
      // coach." Review narrates what was computed on the student's own board;
      // a literary note beside a computed line read as two coaches. The notes
      // stay on the "teach me X opening" lesson and in chat. Gate:
      // corpusScope.test.ts. (This REPLACES the 2026-08-07 "the corpus reaches
      // review" splice, which is deleted rather than annotated.)
      // Drop an identical STATIC state facet already spoken on an earlier ply
      // (opening / plan-opening / plan-middlegame / opp-dev); keep every dynamic
      // per-move fact.
      // Build the kept list; some facets are REWRITTEN (structure → only its new
      // sub-claims) so this is a loop, not a pure filter.
      // 🔒 THE LEDGERS ARE WRITTEN AFTER THE DOOR, FOR SPOKEN FACTS ONLY (B4,
      // 2026-09-22). Every say-once set below used to be mutated HERE, while
      // building the candidate list — before `decide()` collapsed, floored or
      // (on a familiar opening ply) silenced the whole beat. So a fact the
      // student never heard was ledgered as said, and its next appearance was
      // dropped as a repeat: the development plan consumed on a need-silenced
      // ply 1 was never spoken in the whole review. Now each branch CLAIMS
      // (dedupe within the ply, as before) and registers a COMMIT; the commits
      // run after the door and the quiet-ply gate, for the facts that spoke.
      const keptRaw: string[] = [];
      const claimedThisPly = new Set<string>();
      const commitByRaw = new Map<string, () => void>();
      const claim = (key: string): boolean => { if (claimedThisPly.has(key)) return false; claimedThisPly.add(key); return true; };
      const keep = (raw: string, commit?: () => void): void => { keptRaw.push(raw); if (commit) commitByRaw.set(raw, commit); };
      let verdictWordThisPly: string | null = null;
      for (const f of facets) {
        // A refuted alternative is said once per game (identity `refuted:<move>`).
        { const id = facetIdentity.get(f); if (id?.startsWith('refuted:') && (refutedSaid.has(id) || !claim(id))) continue; }
        // Positional VERDICT — atom-diffed. Speak the verdict WORD when it
        // changes, and only the REASONS not yet stated, so a growing edge adds
        // the new asset instead of re-reciting the pile every ply.
        if (/^\[verdict\]/.test(f)) {
          const vm = /^\[verdict\]\s*You're\s+([^:.]+?)(?::\s*(.*?))?\.?\s*$/.exec(f);
          if (!vm) { keep(f); continue; }
          const word = vm[1].trim();
          const reasons = vm[2] ? vm[2].split(/;\s*/).map((r) => r.trim()).filter(Boolean) : [];
          const freshReasons = reasons.filter((r) => !verdictReasonsSeen.has(r.toLowerCase()) && !claimedThisPly.has(`verdict-reason:${r.toLowerCase()}`));
          const wordChanged = word.toLowerCase() !== (verdictWordThisPly ?? lastVerdictWord);
          if (!wordChanged && freshReasons.length === 0) continue; // nothing new
          freshReasons.forEach((r) => claimedThisPly.add(`verdict-reason:${r.toLowerCase()}`));
          verdictWordThisPly = word.toLowerCase();
          const why = freshReasons.length ? `: ${freshReasons.join('; ')}` : '';
          keep(`[verdict] You're ${word}${why}.`, () => {
            freshReasons.forEach((r) => verdictReasonsSeen.add(r.toLowerCase()));
            lastVerdictWord = word.toLowerCase();
          });
          continue;
        }
        // Plans — the full "here's how" recipe ONCE per distinct goal.
        if (/^\[plan-now\]/.test(f)) {
          const gm = /the plan from here is to (.+?)(?:\.|,? here'?s)/i.exec(f);
          const goalKey = gm
            ? gm[1].toLowerCase().replace(/\b[a-h][1-8]\b/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
            : f;
          if (planGoalsSeen.has(goalKey) || !claim(`plan:${goalKey}`)) continue;
          // A NEW goal after plans the student already heard is a CHANGE, and
          // the change is the teaching (David 2026-09-25: "If the structure
          // plan changes then coach should say so"). Once per ply.
          const changed = planGoalsSeen.size > 0 && claim('plan-changed');
          const said = !changed ? f
            : /^\[plan-now\]\s*The plan from here is to /i.test(f)
              ? f.replace(/^\[plan-now\]\s*The plan from here is to /i, '[plan-now] The plan changes here — now it\'s to ')
              : f.replace(/^\[plan-now\]\s*(.)/, (_m, c: string) => `[plan-now] The plan changes here: ${c.toLowerCase()}`);
          keep(said, () => planGoalsSeen.add(goalKey));
          continue;
        }
        // The RACE — once, then only when the verdict FLIPS (see lastRaceVerdict).
        if (/^\[plan-race\]/.test(f)) {
          const verdict = /they get there first|they got there first/i.test(f) ? 'them' : 'you';
          if (lastRaceVerdict === verdict || !claim(`race:${verdict}`)) continue;
          keep(f, () => { lastRaceVerdict = verdict; });
          continue;
        }
        // STANDING teaching read (live tactic / undefended piece / count /
        // royal-fork target / rook-on-7th) — taught ONCE per game by signature.
        if (STANDING_STATE_RE.test(f)) {
          const sig = standingSig(f);
          if (standingSpoken.has(sig) || !claim(`standing:${sig}`)) continue;
          keep(f, () => standingSpoken.add(sig));
          continue;
        }
        // Structure: speak only the sub-claims not yet taught this game — and
        // never an outpost the POSITIONAL VERDICT already named on this same
        // ply (David 2026-09-15, reading the real review: "your knight sits on a
        // protected outpost on d4 … Your knight sits on an outpost at d4"). Two
        // computers, one fact, one sentence.
        if (/^\[structure\]/.test(f)) {
          const outpostSquaresAlreadySaid = new Set(
            keptRaw.filter((k) => /outpost/i.test(k)).flatMap((k) => k.match(/\b[a-h][1-8]\b/g) ?? []),
          );
          const fresh = freshStructureFacet(f, outpostSquaresAlreadySaid, claimedThisPly);
          if (fresh) keep(fresh.text, () => { for (const a of fresh.atoms) structAtomsSeen.add(a); });
          continue;
        }
        // "Their king is stuck in the centre" is taught at most ONCE per game —
        // it's a standing observation, robotic to repeat every ply it holds.
        if (/^\[king\]/.test(f)) {
          if (kingCenterTaught || !claim('king')) continue;
          keep(f, () => { kingCenterTaught = true; });
          continue;
        }
        // A sacrifice's COMPENSATION profile is shared across a combination —
        // state it once per game (by signature); later sacs are still NAMED via
        // their own [sac-why] mechanism facet, which is dynamic per move.
        if (/^\[sac\]/.test(f)) {
          const sig = standingSig(f);
          if (sacSpoken.has(sig) || !claim(`sac:${sig}`)) continue;
          keep(f, () => sacSpoken.add(sig));
          continue;
        }
        // Development nags: once per review by TAG (David 2026-07-22).
        const oneShot = /^\[(plan-opening|opp-dev)\]/.exec(f);
        if (oneShot) {
          const tag = oneShot[1];
          if (oneShotTags.has(tag) || !claim(`oneshot:${tag}`)) continue;
          keep(f, () => oneShotTags.add(tag));
          continue;
        }
        // [endgame] joins the static set (walk 5, R22): "The position is a
        // rook endgame…" spoke on all ten plies of the ending. Keyed on the
        // exact string, so the class still speaks again when it CHANGES
        // (rook ending → king-and-pawn ending).
        if (/^\[(opening|plan-middlegame|passer|badbishop|worst|trapped|minority|complex|endgame)\]/.test(f)) {
          if (emittedStaticFacets.has(f) || !claim(`static:${f}`)) continue;
          keep(f, () => emittedStaticFacets.add(f));
          continue;
        }
        // The [principle] facet carries the recurrence label, if one was named.
        if (/^\[principle\]/.test(f)) {
          keep(f, () => { for (const l of recurScratch) recurrenceLabelsSeen.add(l); });
          continue;
        }
        keep(f);
      }
      const claimedRefrains = new Set<number>();
      const refrained = keptRaw.map((raw) => refrainOnce(raw, claimedRefrains));
      const kept = refrained.map((r) => r.text);
      // THE DOOR SEES `kept`, the side maps are keyed by the RAW facet. The
      // refrain-once pass can change the text, and a changed fact used to reach
      // the door with no squares, no stakes and no "incoming" flag — blind to
      // subsumption and to support. Re-key all three by position.
      const keptSquares = new Map<string, readonly string[]>();
      const keptStakes = new Map<string, FactStakes>();
      const keptIncoming = new Set<string>();
      kept.forEach((k, i) => {
        const raw = keptRaw[i];
        const sq = facetSquares.get(raw); if (sq) keptSquares.set(k, sq);
        const st = facetStakes.get(raw); if (st) keptStakes.set(k, st);
        if (facetIncoming.has(raw)) keptIncoming.add(k);
      });
      // KEY-SQUARE HIGHLIGHTS (David 2026-09-13): every square a KEPT facet
      // named, from the computer's own squares (facetSquares), so the review
      // board leads the eye in yellow exactly where the narration points —
      // matched to the RAW facet strings (the map keys), before refrainOnce
      // rewrites them, so a highlight only rides a facet actually spoken.
      const segKeySquares = [...new Set(keptRaw.flatMap((f) => facetSquares.get(f) ?? []))];
      // FUNDAMENTALS-FIRST on a flagged student ply (David 2026-09-05 overhaul:
      // "narrate the fundamentals FIRST"). computeMoveFacets emits the neglected
      // principle as a [principle] facet, but AFTER the move-mechanics facets —
      // so in the (now-default) uncapped review a flagged ply led with "your
      // knight eyes d5" instead of the lesson. Lift the [principle] verdict to
      // the front of the facets so the flagged move leads with WHY it was flagged;
      // the causal cross-move chain, when present, still leads ahead of it (it is
      // itself the deeper positional lesson). Non-flagged plies are unchanged.
      // 🔒 THE COMPUTER RANKS, THE ORDER IS NOT AUTHORING ORDER (David
      // 2026-09-16). These facets used to be spoken in the order the code
      // happened to push them; the hard caps that were just removed had been
      // the only thing deciding what a student heard FIRST. `rankFacets` sorts
      // by importance and adds this student's weakness boost, so the fact that
      // most changes what they do next leads the beat. The SET is unchanged —
      // ranking reorders, it never drops (G4.5).
      // 🔒 THE COMPUTER CUTS, AT NARRATION TIME — not a branch in code (David
      // 2026-09-16: "we don't make a cut on the code side, the computer that
      // ranks the narrations does. At narrations time. If the battery is more
      // important than the pin, then the pin stays quiet and the battery wins").
      //
      // `rankFacets` orders and, by design, never drops. That left four readings
      // of ONE diagonal — the pin, the battery, the lone defender, the royal
      // guard — all speaking as separate findings. `selectFacts` adds the two
      // things ordering cannot do: it COLLAPSES facts whose squares coincide to
      // the single most important one (their incoming threat beating your
      // standing asset at equal rank), and it drops what is below the moment's
      // value BAR. A bar is not a cap: on a critical moment every computed fact
      // still clears it (G4.5).
      // THE REAL COST of the move to the side that PLAYED it — mover-POV, from
      // Stockfish's own numbers, computed ONCE and handed to both the door and
      // the method beat (B6 + B11, 2026-09-22). Two things it is not:
      //  • not a bucket keyed off the classification label (300/150/60 made
      //    every inaccuracy read 0.6 pawns and a 250cp mistake read 1.5);
      //  • not `Math.abs(evaluation - preMoveEval)`, which turned a GAIN into a
      //    cost — the student wins a piece, the eval jumps two pawns their
      //    way, and the method beat read it as a 200cp slip and said "this was
      //    the moment to slow down" on the best move of the game.
      // White loses when the white-POV number FALLS, Black when it RISES; a
      // move that gained is a cost of 0, never a negative "loss".
      const realCpLossCp: number | null = m.evaluation != null && m.preMoveEval != null
        ? Math.max(0, moverColor === 'white' ? m.preMoveEval - m.evaluation : m.evaluation - m.preMoveEval)
        : null;
      // ONE DOOR (David 2026-09-16: "I want one unified deciding computer").
      // Importance, this student's need, subsumption, the floor and the order
      // are a SINGLE call now — review does not compose them itself, so it
      // cannot drift from the surface that adopts the decider next.
      const habitScratch = new Set(spokenHabits);
      const decision = decide(
        {
          decision: null,          // no per-ply criticality scan in the review pass
          cpLossCp: realCpLossCp,
          threatNet: 0,
          teachingBeat: fundamentalLed || !!causalLead,
          evalCpWhitePov: m.evaluation ?? null,
          wdl: null,
        },
        {
          rating: rating ?? DEFAULT_STUDENT_RATING,
          weaknesses: studentWeaknesses ?? [],
          // THE STUDENT TERM FOR THE RANKER — red or grey, raise-only, applied
          // by `computeImportance` under `rank > 0` so it re-weights a moment a
          // computer already produced and never manufactures one.
          momentBoost: boostByPly.get(m.ply) ?? NO_BOOST,
          layers,
          // 🚨 DELIBERATELY null, and this is why the field is required.
          //
          // Review DOES gate on need — narrowly, at `quietOpeningPly` below:
          // only a quiet student OPENING ply with no flag, no causal lead and
          // no fundamental can be silenced by a low score. Handing `need` to
          // the door instead would apply the veto to EVERY ply, because step 2
          // is posture-blind, and that is the change that once cut a 46-ply
          // walk to six.
          //
          // So this is a real disagreement with the one-door doctrine, not an
          // oversight: the door's need step wants to be posture-aware the way
          // its importance step already is. Until it is, review keeps the
          // narrow gate it was tuned with and says so here.
          need: null,
          // Review is retrospective: it names the move that WAS the one, not the
          // student's next move, so the live advice gate does not apply.
          moveAdvice: null,
        },
        {
          facts: kept, squares: keptSquares, incoming: keptIncoming, stakes: keptStakes,
          // THE BOARD AFTER THIS PLY — a recapture pending, or mate for the
          // side to move (`boardState`). Review had no such guard at all: "You're
          // a piece up" one ply before the piece was taken back.
          board: boardStateAfter(fenPair.fenBefore, m.san, m.fenAfter, m.evaluation ?? null),
          // THE EXACT HOLE FOR THE FACT THAT NAMES IT (2026-09-21). The
          // `[principle]` facet IS the attributed fundamental, so ranking it by
          // `clauseKindForTag('principle') → 'structure-plan'` asked the coarse
          // bucket a question this ply already has an exact answer to. Every
          // other facet is left to the tag join, which is the right route for
          // it — only this one carries an id.
          //
          // `null` when the attributor named a fundamental the student has NO
          // record of: that is GREY, and grey is not a hole. It must not fall
          // back to the bucket, or "never asked" would borrow an unrelated
          // weakness's weight.
          holeByFact: new Map(kept
            .filter((f) => f.startsWith('[principle] '))
            .map((f) => [f, fundamentals[0]
              ? matchFundamental(fundamentals[0].id, studentWeaknesses ?? [])
              : null] as const)),
        },
        // REVIEW IS A WALK: the student asked to be taken through the game, so a
        // quiet moment is a shorter beat, never a skipped one. Gating review on
        // the live-surface importance check cut this game to 6 narrated plies.
        'walk',
        // HOW TO THINK, not just what happened (David 2026-09-16). The signals
        // are ones this loop already holds — the attributor's own
        // `ignored-threat` finding, the cost, the move that was there — so the
        // habit is earned by a computed condition, never generic advice.
        {
          // THE REAL COST — see `realCpLossCp` above: the same number the door
          // judged on, so the habit and the moment can never disagree.
          cpLossCp: realCpLossCp,
          bestSan: bestMoveSan ?? null,
          ignoredThreat: fundamentals.some((f) => f.id === 'ignored-threat'),
          isStudentMove: playerColor !== undefined && moverColor === playerColor,
          ply: m.ply,
          // A SCRATCH copy (B4): the beat claims its habit here, and the
          // claim reaches the game ledger only if the ply actually speaks.
          saidHabits: habitScratch,
        },
      );
      // SILENCE IS A COMPUTED VERDICT, so it has to be explainable — emit what
      // went quiet and why, or a future session cannot tell a deliberate
      // collapse from a lost fact.
      if (decision.quiet.length > 0) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachFeatureService.coachDecider',
          summary: `ply ${m.ply}: ${decision.spoken.length} spoken, ${decision.quiet.length} quiet (${decision.reason}; ${decision.quiet.map((q) => q.why).join(',')})`,
        });
      }
      let orderedKept = decision.spoken;
      if (fundamentalLed) {
        const principle = orderedKept.filter((f) => /^\[principle\]/.test(f));
        if (principle.length > 0) orderedKept = [...principle, ...orderedKept.filter((f) => !/^\[principle\]/.test(f))];
      }
      // The causal chain LEADS the beat when present (it's the cross-move story).
      const uncappedParts = causalLead ? [causalLead, ...orderedKept] : orderedKept;
      // 🔒 THE BOOK-MOVE RULE APPLIES HERE TOO (CLAUDE.md narration-by-need
      // standard, N2). The capped cascade has carried the need gate since N2
      // landed — but `isReviewUncapped()` is TRUE by default, so THIS is the
      // branch a real review actually runs, and it was ungated: every quiet
      // opening ply still got the full computed inventory, which is exactly the
      // "takes too long and says too much in opening book moves" David reported.
      // Gate only the QUIET student opening plies — a flagged move, a move on
      // the causal thread, and every opponent ply are untouched, so nothing the
      // student got wrong can be silenced by a low need score.
      const quietOpeningPly = playerColor !== undefined
        && moverColor === playerColor
        && m.ply <= OPENING_TEACH_MAX_PLY
        && (m.classification === null || m.classification === 'book' || m.classification === 'good')
        && !causalLead
        && !(fundamentals.length > 0);
      if (quietOpeningPly && needHere && !needHere.speak) {
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
          narration: null,
          narrationSource: null,
          ...(needHere ? { need: needHere } : {}),
        });
        try {
          const pc0 = new Chess(fenPair.fenBefore).move(m.san);
          prevCap = pc0
            ? { square: pc0.to, capturedValue: pc0.captured ? (PIECE_PTS[pc0.captured] ?? 0) : 0 }
            : { square: null, capturedValue: 0 };
        } catch {
          prevCap = { square: null, capturedValue: 0 };
        }
        continue;
      }
      // THE COMMIT (B4): only now — past the door and past the quiet-ply gate
      // — do the say-once ledgers learn what was said, and only for the facts
      // in `decision.spoken`. A fact the door collapsed or floored, and every
      // fact on a ply the need gate silenced, stays unsaid and may speak later.
      {
        const spokenSet = new Set(decision.spoken);
        keptRaw.forEach((raw, i) => {
          if (!spokenSet.has(kept[i])) return;
          commitByRaw.get(raw)?.();
          for (const c of refrained[i].claims) spokenRefrains.add(c);
        });
        if (decision.spoken.some((f) => f.startsWith('[method] '))) for (const h of habitScratch) spokenHabits.add(h);
        // THE STRUCTURED COMMITS (WO-TEACH-02), for facts that SPOKE:
        //  • rule:<id>  — the principle is now taught; it will not speak again;
        //  • motif:<t>  — S6 transfer: a tactic whose motif was spoken at an
        //    earlier move names that move ("same idea as move 12").
        for (let k = 0; k < uncappedParts.length; k += 1) {
          const raw = keptRaw[kept.indexOf(uncappedParts[k])] ?? uncappedParts[k];
          const identity = facetIdentity.get(raw);
          if (!identity) continue;
          if (identity.startsWith('rule:')) { principlesTaught.add(identity.slice(5)); continue; }
          if (identity.startsWith('refuted:')) { refutedSaid.add(identity); continue; }
          // `motif:<type>:<squares>` — the squares make it THIS instance, so a
          // standing tactic is never "the same idea as move N" of itself.
          const [motif, instance = ''] = identity.slice('motif:'.length).split(':');
          uncappedParts[k] = withTransfer(uncappedParts[k], transferClause(motif, instance, fullMove, motifFirstMove));
          recordMotif(motif, instance, fullMove, motifFirstMove);
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
        narration: uncappedParts.length ? uncappedParts.join(' ') : null,
        narrationSource: uncappedParts.length ? 'per-move' : null,
        ...(uncappedParts.length ? { teaches: decision.teaches } : {}),
        ...(needHere ? { need: needHere } : {}),
        ...(causalArrows && causalArrows.length ? { planArrows: causalArrows } : {}),
        ...(fundamentals.length ? { fundamentals } : {}),
        ...(segKeySquares.length ? { keySquares: segKeySquares } : {}),
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
      prevCapture: prevCap,
    });
    // 🔒 THE FUNDAMENTAL LEADS; EVERYTHING ELSE IS EVIDENCE (David 2026-09-05:
    // "the fundamental flaw stated first and then the other computer narration
    // following it as supporting evidence"). Fixed slots, spoken raw (no warm
    // pass on this line — see generateReviewNarration): verdict → the engine
    // line that corroborates it → the concrete refutation → the lasting
    // concession → the eval cost → the better move and why. Deterministic:
    // same board, same words, every open.
    if (fundamentalLed) {
      const verdict = renderFundamentalVerdict(fundamentals, { ply: m.ply, seen: seenFundamentals, replySan: moves[i + 1]?.san ?? null });
      // THE LOOP, OUT LOUD (WO-LOOP-01, 2026-09-20). The fundamental this move
      // neglected is joined to the student's own record: when their spine says
      // they have done this in ANOTHER game, the beat says so — count and the
      // last game named, nothing invented. `matchFundamental` had zero
      // production callers before this line; the coach could record a hole
      // and never tell the student it remembered.
      const recurrence = fundamentalRecurrenceLine({
        ids: fundamentals.map((f) => f.id), signals: studentWeaknesses ?? [],
        currentGameId, register: 'review', seenLabels: recurrenceLabelsSeen,
      });
      const pvEvidence = renderPvEvidence(fundamentals);
      const failed = whyItFailed({ fenBefore: fenPair.fenBefore, playedSan: m.san, studentColor: moverColor });
      const concession = describeConcessions(fenPair.fenBefore, m.san, true);
      const swingCp = m.preMoveEval != null && m.evaluation != null
        && Math.abs(m.preMoveEval) < 15000 && Math.abs(m.evaluation) < 15000
        ? Math.abs(m.preMoveEval - m.evaluation) : null;
      const cost = swingCp != null && swingCp >= 50
        ? `That cost about ${(swingCp / 100).toFixed(1)} points.`
        : null;
      const why = bestMoveSan ? explainBestMoveGrounded(fenPair.fenBefore, m.san, m.bestMove, moverColor) : null;
      const better = bestMoveSan ? `The move was ${bestMoveSan}.${why ? ` ${why}` : ''}` : null;
      narration = [verdict, recurrence, pvEvidence, failed?.line ?? null, concession, cost, better]
        .filter((x): x is string => !!x && x.trim().length > 0)
        .join(' ');
    }
    // Append the GROUNDED "why the best move is best" clause — chess.js
    // board truth only, never LLM-guessed (David 2026-06-05). Only on the
    // student's flagged errors, only when there's a genuine distinct best
    // move, and only when a board fact is provable.
    if (!fundamentalLed && narration && bestMoveSan && !m.isCoachMove && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy' || m.classification === 'miss')) {
      const why = explainBestMoveGrounded(fenPair.fenBefore, m.san, m.bestMove, moverColor);
      if (why) narration = `${narration} ${why}`;
    }
    // WHY THE STUDENT'S OWN MOVE FAILED — the companion to "why the best move is
    // best". Names the concrete refutation of what they ACTUALLY played: the
    // swap-off that loses material, the own piece they abandoned, the in-between
    // check (whyItFailed — pure chess.js geometry, no engine, no LLM). All
    // geometry, spoken to everyone (David 2026-08-28: "wire geometry into
    // review … all geometry spoken, even for beginners"). Student moves only.
    {
      const isStudentMove = playerColor ? moverColor === playerColor : !m.isCoachMove;
      if (!fundamentalLed && narration && isStudentMove && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy')) {
        const failed = whyItFailed({ fenBefore: fenPair.fenBefore, playedSan: m.san, studentColor: moverColor });
        if (failed) narration = `${narration} ${failed.line}`;
      }
    }
    // FORESIGHT AS A SKILL — "here was the signal" (David 2026-09-16: "Future
    // moves, how to think, threat identification, that is teaching"). Every beat
    // above this one is about the move that was PLAYED: what it was, why it
    // failed, what it conceded, what was better. None of them says what was
    // readable on the board BEFORE the shot existed — and that is the part that
    // transfers to the next game.
    //
    // GATED ON THEIR OWN RECORD, never on the size of the slip (the same
    // correction the slow-down beat took the same night). A student who reliably
    // finds forcing shots does not need to be taught how to look for them; one
    // whose spine says they keep walking past them does. `habitIsOwed` treats an
    // UNSCORED habit as owed on purpose — a student with no history yet is a
    // student who has not proven they can see it.
    {
      const isStudentMove = playerColor ? moverColor === playerColor : !m.isCoachMove;
      const flagged = m.classification === 'mistake' || m.classification === 'blunder'
        || m.classification === 'inaccuracy' || m.classification === 'miss';
      if (narration && isStudentMove && flagged && habitIsOwed(reviewHabitNeed, 'forcing-scan')) {
        // `moverColor` is the long form here; the board computers speak 'w'/'b'.
        const signal = buildMissedShotSignal(fenPair.fenBefore, m.bestMove, moverColor === 'white' ? 'w' : 'b', m.san);
        if (signal && !signalsAnnounced.has(signal)) {
          signalsAnnounced.add(signal);
          narration = `${narration} ${signal}`;
        }
      }
    }
    // THE LASTING CONCESSION (David 2026-07-21, IMG_4571: "What serious
    // positional concessions have been made? What are the ramifications of this
    // move?"). Name the structural damage the flagged move caused — computed
    // diff (king shield thinned, passer granted, structure splintered). Both
    // sides: your concession is the lesson, theirs is the target.
    if (!fundamentalLed && narration && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy')) {
      const concession = describeConcessions(fenPair.fenBefore, m.san, playerColor ? moverColor === playerColor : !m.isCoachMove);
      if (concession) narration = `${narration} ${concession}`;
    }
    // THE CORPUS NOTE — the pattern that was live when the student erred. Only
    // 🔒 NO FLOATING NOTE IN REVIEW (David 2026-08-26: "make sure I hear no
    // floating notes in the play surfaces — make them stay where they belong").
    // This once-per-game blunder/mistake beat used to append a floating
    // tactic-pattern note (geometry-free, but still a note written about a
    // DIFFERENT game). Review is a play surface, so it is removed. The tactics
    // DRILL keeps exactly this teaching via `tacticNoteForPuzzleThemes`, where
    // the floating corpus belongs.
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
    // 📖 BOOK MOVE, HONEST EVAL (David 2026-09-07, his Traxler: "Read it as a
    // book move but be honest of the evaluation"). A flagged minor slip that is
    // established THEORY — the exact move is played in real master games at this
    // position — is NOT a slip the student found; it's the named gambit/main
    // line. So OVERRIDE the "you slipped, X was better" flag text with the book
    // framing, and STILL state the engine's honest number. The theory signal is
    // MASTER-GAME MASS (mastersMovesSync ≥ 40 games for THIS move), not raw
    // isBookLine — the Lichess DB carries junk namesakes (it calls the Bongcloud
    // "book"), so name-matching alone over-fires; master mass keeps the real
    // Traxler (130 games) and drops the Bongcloud (0). Only inaccuracy/mistake in
    // the opening phase (a genuine blunder past book stays flagged). Grounded:
    // the name is detectOpening, the mass is the masters DB, the eval is the
    // persisted engine number (G0/G3). Masters DB is loaded before the walk
    // (ensureMastersDbLoaded); if it isn't, mastersMovesSync is null → no reframe.
    {
      const isStudentSideMove = playerColor ? moverColor === playerColor : !m.isCoachMove;
      const mastersHere = isStudentSideMove
        && (m.classification === 'inaccuracy' || m.classification === 'mistake')
        && m.ply <= OPENING_TEACH_MAX_PLY
        ? mastersMovesSync(fenPair.fenBefore) : null;
      const moveMasterGames = mastersHere?.find((mm) => mm.san === m.san)?.games ?? 0;
      const isStudentBookMove = moveMasterGames >= 40;
      if (isStudentBookMove) {
        const bookName = detectOpening(sansForRun.slice(0, m.ply))?.name ?? openingName ?? null;
        const nameClause = bookName ? `the ${bookName}` : 'a known theory line';
        // Student-POV eval AFTER the move; a positive OPPONENT edge = the honest
        // "the engine doesn't fully trust this" number, stated in the FAVORED
        // side's name (never "we/our").
        const stPov = (m.evaluation != null && studentColorWB)
          ? (studentColorWB === 'w' ? m.evaluation : -m.evaluation) : null;
        const oppEdge = stPov != null ? -stPov / 100 : null;
        const favored = studentColorWB === 'w' ? 'Black' : 'White';
        let honest: string;
        if (oppEdge != null && oppEdge >= 0.5) {
          const alt = bestMoveSan ? ` the engine would rather have ${bestMoveSan}, which keeps it closer to level` : ' the engine prefers the quieter route';
          honest = `Be honest about the eval, though: this is a gambit the engine doesn't fully trust — it reads about ${oppEdge.toFixed(1)} in ${favored}'s favor here, and ${alt}. You're trading the safe edge for a sharp, less-charted fight — a fair bet, not a blunder.`;
        } else {
          honest = `The engine calls it roughly level here — a sound theory choice.`;
        }
        narration = `${m.san} is book — ${nameClause}. ${honest}`;
        narrationSource = 'per-move';
      }
    }
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
          const oppWins = legalSeeGainOn(sb, smv.to); // pin-aware: opponent's legal recapture
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
            true,
            m.preMoveEval != null ? (moverColor === 'white' ? m.preMoveEval : -m.preMoveEval) : null,
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
      // A move that FORCES MATE is not an inaccuracy/mistake/blunder in any way
      // that matters — even if the engine sees a faster mate. Drop the negative
      // "a more precise move was available" stem (David 2026-07-24 Opera read:
      // "Bxd7+ [inaccuracy] … the precise move was Bxf6" ON a mating move). Keep
      // a genuine sac description (prepend); replace a negative flag stem.
      const flaggedNegative = m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder';
      narration = (narration && !flaggedNegative) ? `${framing} ${narration}` : framing;
      narrationSource = narrationSource ?? 'flag';
    }
    // THE THREAT CALL-OUT (David 2026-07-21, emphatic: "The coach should
    // identify my threat and call it out!!"). On EVERY student move, name the
    // biggest NEW threat the move created — mate-in-one, a safe royal fork, a
    // clean material win — from the null-move scan (board-provable). The
    // Berlin case: after ...Bc5, "you're now threatening Nxf2 — wins the f2
    // pawn and forks their queen and rook" went unsaid. A threat is a
    // keystone: it speaks even on an otherwise-quiet ply.
    let segmentStaticThreat: ReviewMoveSegment['staticThreat'];
    // THREAT ARROWS (David 2026-07-24: "no threat detection" — it fired in audio
    // but nothing was drawn). Show the threatened move on the board: GREEN for the
    // student's own threat (your attack), RED for the opponent's (the danger),
    // plus fork rays to the victim squares. Rides the segment's planArrows slot,
    // which the board already renders when no walkout overlay is active.
    let threatArrows: ReviewMoveSegment['planArrows'];
    if (playerColor && moverColor === playerColor) {
      const threat = describeStudentThreat(fenPair.fenBefore, fenPair.fenAfter, playerColor === 'white' ? 'w' : 'b');
      if (threat) {
        const sentence = narration ? ` And ${threat}.` : `${threat.charAt(0).toUpperCase()}${threat.slice(1)}.`;
        narration = narration ? `${narration}${sentence}` : sentence;
        narrationSource = narrationSource ?? 'per-move';
        // Tag the claim for the ENGINE-CONFIRMATION pass (statics propose +
        // explain; the engine decides — David 2026-07-21).
        const threatSan = threat.match(/threatening (\S+)/)?.[1] ?? null;
        if (threatSan) {
          const nullParts = fenPair.fenAfter.split(' ');
          nullParts[1] = playerColor === 'white' ? 'w' : 'b';
          nullParts[3] = '-';
          const nullFen = nullParts.join(' ');
          segmentStaticThreat = { san: threatSan.replace(/[.,]$/, ''), sentence, nullFen };
          // Draw the student's threatened move (green — your attack).
          try {
            const tc = new Chess(nullFen).move(threatSan.replace(/[.,]$/, ''));
            if (tc) threatArrows = [{ startSquare: tc.from, endSquare: tc.to, color: '#22c55e' }];
          } catch { /* arrow is a bonus — never block the narration */ }
        }
      }
      // REVIEW DEEPEST LOOK-AHEAD (David 2026-07-26 — the review-register peer of
      // the live speakDeepestLookahead). On the student's own GOOD/BOOK/quiet move
      // (flagged moves are already owned by the better-move teaching above, so
      // this stays additive), walk the engine's best move ONE ply forward and, if
      // it sets up a FORK or MATE, name the combination that was on the board.
      // The fork VICTIMS are the OPPONENT's pieces — invariant to which move the
      // student picked — so the claim is board-true regardless. Retrospective
      // voice, guaranteed spoken (a direct computed beat, never LLM-mediated),
      // deduped per game by the shot's SAN.
      if (!m.isCoachMove && (m.classification === null || m.classification === 'book' || m.classification === 'good')) {
        const shot = buildReviewDeepestLookahead(fenPair.fenBefore, m.bestMove, playerColor === 'white' ? 'w' : 'b', m.san);
        if (shot) {
          // Dedupe on the WHOLE shot sentence, not just its SAN (D#5). Two
          // different shots later in the game can share a SAN (a knight jump that
          // sets up different forks at move 10 and move 30); keying on the SAN
          // alone dropped the second as a repeat. The full text is the shot's
          // identity — an identical shot dedupes, a genuinely-new one speaks.
          const shotKey = shot;
          if (!deepShotAnnounced.has(shotKey)) {
            deepShotAnnounced.add(shotKey);
            narration = narration ? `${narration} ${shot}` : shot;
            narrationSource = narrationSource ?? 'per-move';
          }
        }
      }
      // SIMPLIFY-WHEN-AHEAD — Danya's strategic "you're offering a queen trade"
      // on a winning game (fABTn305 22…Qd4). Board-verified; appends the idea to
      // whatever tactic the move already carries, so the student hears BOTH.
      const studentPovForTrade = m.evaluation != null ? (studentColorWB === 'w' ? m.evaluation : -m.evaluation) : null;
      const tradeIdea = describeSimplifyingTrade(fenPair.fenBefore, m.san, true, studentPovForTrade);
      if (tradeIdea) {
        narration = narration ? `${narration} ${tradeIdea}.` : `${tradeIdea}.`;
        narrationSource = narrationSource ?? 'per-move';
      }
      // GENERAL simplify-when-ahead — a bare even TRADE while winning got only
      // "captures the X" and the warmer padded it; give it the real idea, ONCE
      // per game (David 2026-07-24 "complete the package").
      if (!tradeIdea && !tradeIdeaSpoken) {
        const tc = describeTradeConsequence(fenPair.fenBefore, m.san, true, studentPovForTrade);
        if (tc) {
          narration = narration ? `${narration} ${tc}.` : `${tc.charAt(0).toUpperCase()}${tc.slice(1)}.`;
          narrationSource = narrationSource ?? 'per-move';
          tradeIdeaSpoken = true;
        }
      }
    }
    // THE OPPONENT'S THREAT — identified, TAUGHT, and DEFUSED (David
    // 2026-07-22: "can the coach identify how to prevent this from happening
    // and TEACH the user how to identify and prevent it??"). When the
    // opponent's move creates a threat: (1) name it; (2) teach the PATTERN
    // that made it possible (recognition — the geometry to spot a move
    // early); (3) teach the DEFENSE — the engine's stored best reply for the
    // NEXT ply (delivered in the package, no fresh search) explained by HOW
    // it meets the threat: undermine the guard / cover the square / step off
    // the alignment. All computed; nothing improvised.
    if (playerColor && moverColor !== playerColor) {
      const oppWB: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';
      const oppThreat = detectNewThreat(fenPair.fenBefore, fenPair.fenAfter, oppWB);
      // Dedupe on the threat's IDENTITY (kind + landing + victims), not its bare
      // SAN (D#5). A persisting identical threat still dedupes (no re-announce
      // each ply), but a genuinely-new threat that happens to share a SAN — a
      // different Nf3 fork hitting different pieces — is no longer silenced.
      const threatKey = oppThreat
        ? `${oppThreat.san}|${oppThreat.kind}|${oppThreat.landing}|${[...oppThreat.targetSquares].sort().join(',')}`
        : '';
      if (oppThreat && !threatsAnnounced.has(threatKey)) {
        threatsAnnounced.add(threatKey);
        // The concrete threat, board-computed (kind + detail). The REMEDIAL
        // "the pattern to spot…" explainer (describeThreatRecognition) was
        // REMOVED from this default in-game callout (David 2026-09-07: "Obvious,
        // remedial, and unnecessary"). Depth now comes from the rating-scaled
        // deep-threat PV pass (augmentWithProjections #5c — "spell the line for
        // everyone"), and the WHY from the causal chain; recognition-teaching
        // stays only in the EXPLICIT Learn "spot-it" drill, where it belongs.
        let callOut = `Careful — their move threatens ${oppThreat.san}: it ${oppThreat.detail}.`;
        const nextBest = i + 1 < usable ? uciToSanAt(moves[i + 1].bestMove, fenPair.fenAfter) : null;
        if (nextBest) {
          const prevention = describeThreatPrevention(fenPair.fenAfter, oppThreat, nextBest, oppWB);
          if (prevention) callOut += ` The answer: ${prevention}.`;
        }
        narration = narration ? `${narration} ${callOut}` : callOut;
        narrationSource = narrationSource ?? 'per-move';
        // Draw the danger (red): the threatened move from → landing, plus a ray
        // to each fork victim so the eye lands on what's under attack.
        threatArrows = [
          { startSquare: oppThreat.from, endSquare: oppThreat.landing, color: '#ef4444' },
          ...oppThreat.targetSquares.map((sq) => ({ startSquare: oppThreat.landing, endSquare: sq, color: '#f97316' })),
        ];
      }
      // GEM CRUSH IN REVIEW (David: "add the gem calculator into review… showing
      // crush lines during review!!!"). If the path BEFORE this move is exactly a
      // curated gem's spine and the opponent JUST played that gem's known
      // inaccuracy, append the retrospective crush note + arrows. APPENDS (like
      // the threat call-out) so it survives the first-match-wins cascade.
      // buildReviewGemSay was built + tested but wired to NOTHING until now.
      // Guard to the opening phase — gem spines are opening lines.
      if (i < 24) {
        const gemPathBefore = moves.slice(0, i).map((mv) => mv.san);
        const gemCrush = computeGemCrush(undefined, gemPathBefore);
        const stripAnno = (s: string): string => s.replace(/[!?]+$/, '');
        if (gemCrush && stripAnno(m.san) === stripAnno(gemCrush.inaccuracy)) {
          const studentPunished = i + 1 < usable && stripAnno(moves[i + 1].san) === stripAnno(gemCrush.punish);
          const gemSay = buildReviewGemSay(gemCrush, {
            opponentPlayedInaccuracy: true,
            studentPlayedPunish: studentPunished,
          });
          narration = narration ? `${narration} ${gemSay}` : gemSay;
          narrationSource = narrationSource ?? 'per-move';
          const gemArrows = gemCrush.arrows.map((a) => ({
            startSquare: a.from,
            endSquare: a.to,
            color: a.color === 'green' ? '#22c55e' : a.color === 'red' ? '#ef4444' : '#3b82f6',
          }));
          threatArrows = [...(threatArrows ?? []), ...gemArrows];
        }
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
      // Grounding chain (David 2026-07-23): his games -> masters DB backup ->
      // curated repertoire -> nothing. The ungrounded generic template is gone.
      // THIS game's continuation from here — so the plan tracks the game, not
      // his aggregate line (David 2026-07-24, the …e6 delta-context bug).
      const gameLine = moves.slice(i).map((x) => x.san);
      const dev = buildHisGroundedPlanBeat(fenPair.fenBefore, studentColorWB, openingName ?? null, gameLine)
        ?? buildMastersGroundedPlanBeat(fenPair.fenBefore, studentColorWB, openingName ?? null)
        ?? buildOpeningDevelopmentPlan(fenPair.fenBefore, studentColorWB, { openingName: openingName ?? null, curatedIdeas: curatedOpeningIdeas, seed: gameSeed });
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
      const orientation = buildMiddlegameOrientation(fenPair.fenBefore, studentColorWB, m.san);
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
      // P3 DE-SHADOW (David 2026-07-26): don't let the generic "you're better,
      // here's why" verdict claim the slot when the enemy king is stuck in the
      // centre — that quiet-move slot belongs to the forward king-attack cue (c)
      // below, which was losing first-match-wins to this beat. Mirrors the same
      // guard the orientation beat (b) already carries.
      && !enemyKingStuckInCenter(fenPair.fenAfter, studentColorWB)
    ) {
      const studentPovCp = m.evaluation != null ? (studentColorWB === 'w' ? m.evaluation : -m.evaluation) : null;
      const assess = assessPositionalEdge(fenPair.fenAfter, studentColorWB, studentPovCp);
      if (assess.reasons.length >= 2 && assess.verdict && assess.verdict !== 'balanced') {
        narration = `Step back and take stock — you're ${assess.verdict} here, and it's worth knowing exactly why: ${joinClauses(assess.reasons)}.`;
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
      const family = named ? openingFamily(named) : null;
      if (named && family && named !== lastAnnouncedOpeningName && !announcedOpeningFamilies.has(family)) {
        const first = announcedOpeningFamilies.size === 0;
        announcedOpeningNames.add(named);
        announcedOpeningFamilies.add(family);
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
      // THE BOOK-MOVE RULE (CLAUDE.md standard, N2): a quiet opening ply speaks
      // only when this student's computed need clears the bar. A cold student
      // clears it on the prior; a familiar, well-played line is silent.
      && (needHere ? needHere.speak : true)
    ) {
      // GROUNDED opening detail FIRST (David 2026-07-24: "we already attached his
      // corpus for opening details, master DB for games he doesn't have") — what
      // his own games / the masters DB show at this position. Then the rich
      // PlyFacts, then the thin teaching note. All grounded; the opening-detail
      // just carries the real theory/repertoire content the warmer needs.
      // Lead with the IDEA of the move — what it develops, which squares it
      // fights for, what it threatens — the SAME grounded plyFacts / teaching
      // engine the middlegame uses (`plyFactsForMove`, `buildReviewMoveTeaching`).
      // The corpus/masters frequency STATS drop to a fallback (only when there's
      // no board idea to teach), instead of PRE-EMPTING the idea. Stats winning
      // the slot ("you play this 53%", "one of your regular tries here") was the
      // whole reason opening narration read thin next to the middlegame — same
      // engine, but buildOpeningMoveDetail was tried FIRST and buried it
      // (2026-07-25 hand-audit N1 root cause).
      const openingIdea = moveBriefing(true);
      if (openingIdea) {
        narration = openingIdea;
        narrationSource = 'per-move';
      } else {
        const openingStat = buildOpeningMoveDetail(fenPair.fenBefore, m.san, true);
        if (openingStat) { narration = openingStat; narrationSource = 'opening-plan'; }
      }
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
        if (phase) { narration = `You've reached ${phase}.`; endgameAnnounced = true; narrationSource = 'endgame'; }
      }
      // MIDDLEGAME silence gap (David 2026-07-20: "narration was missing on a
      // lot of moves"). Past the opening, a quiet student move that isn't a
      // mate/endgame beat got NOTHING — the biggest coverage hole. Fill it with
      // the same rich PlyFacts the best-move lines use (captures/tactics/
      // outposts/passed pawns/files/material), null → still silent for a truly
      // uneventful move.
      if (narration === null) {
        const rich = moveBriefing(true);
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
      // 'great'/'brilliant' included so a STRONG opponent move still narrates
      // (David 2026-09-07 prod read: an opponent 'great' Ke2/Be3 fell through
      // every opponent path and rendered as a bare SAN). Opponent brilliant is
      // already handled by buildDeterministicNarration; this catches 'great'.
      && (m.classification === null || m.classification === 'book' || m.classification === 'good' || m.classification === 'great' || m.classification === 'brilliant')
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
      && (m.classification === null || m.classification === 'book' || m.classification === 'good' || m.classification === 'great' || m.classification === 'brilliant')
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
      && (m.classification === null || m.classification === 'book' || m.classification === 'good' || m.classification === 'great' || m.classification === 'brilliant')
    ) {
      const clause = plyFactsClause(fenPair.fenBefore, m.san, prevCap);
      if (clause) {
        narration = `Your opponent ${clause}.`;
        narrationSource = 'opponent';
      } else {
        // PARITY (David 2026-07-24: "same level of narrations for opponents
        // moves"). A quiet opponent developing move has no tactical fact clause,
        // but it still has a positional purpose — the SAME buildReviewMoveTeaching
        // the student's quiet moves get, reframed to the opponent's seat. Only a
        // TRULY uneventful move (teaching === null) stays silent, symmetric with
        // the student side.
        const teach = buildReviewMoveTeaching(fenPair.fenBefore, m.san, false);
        if (teach) {
          narration = frameTeachingForOpponent(teach);
          narrationSource = 'opponent';
        }
      }
    }
    // CHECKMATE DELIVERY — board-true from the SAN's '#', for EITHER side, and it
    // OVERRIDES whatever generic beat the cascade produced (David 2026-09-07, his
    // own Traxler loss: the move that CHECKMATED him — Ng6# — was narrated as
    // "the knight steps in eyeing e5, fighting for the center"). The move that
    // ends the game is the one line that must never read as routine development.
    // classifyCpLoss already coerces a delivered mate to good/brilliant, so it
    // never flags; this is the only place the mate gets named on the mating ply.
    if (/#$/.test(m.san)) {
      const studentMated = moverColor === playerColor;
      narration = studentMated
        ? `And there it is — checkmate. You finished the game.`
        : `And that's checkmate — the game ends here. This is the position to sit with: trace the mating net back and find the move where it became unavoidable.`;
      narrationSource = 'per-move';
    }
    // 🔗 THE CAUSAL CHAIN LEADS the beat when this move exploited a loose piece
    // with a provable cross-move cause (David 2026-09-07). Prepended last so it
    // sits ahead of whatever the cascade produced; a mate move never has a chain
    // (the exploit is winning a piece, not the king), so it doesn't collide.
    if (causalLead) {
      narration = narration ? `${causalLead} ${narration}` : causalLead;
      if (!narrationSource) narrationSource = 'per-move';
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
      ...(needHere ? { need: needHere } : {}),
      narrationSource,
      ...(fundamentals.length ? { fundamentals } : {}),
      // Plan-idea arrows take the slot when present; else the threat arrows
      // (they rarely coincide — a plan beat fires on a quiet move, a threat on a
      // tactical one) so the danger/attack is SHOWN, not just spoken.
      // The causal chain leads the beat, so its lead-the-eye arrows take the slot
      // on the tactic move; else the plan / threat arrows as before.
      ...((causalArrows && causalArrows.length) ? { planArrows: causalArrows }
        : (planArrows && planArrows.length) ? { planArrows }
        : (threatArrows && threatArrows.length ? { planArrows: threatArrows } : {})),
      ...(segmentStoryGame ? { storyGame: segmentStoryGame } : {}),
      ...(segmentStaticThreat ? { staticThreat: segmentStaticThreat } : {}),
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
/** THE RECORD IN THIS OPENING (A8): the intro's second sentence, computed off
 *  the need context — "your 63rd Pirc Defense, 49% so far — your home opening.
 *  You left book at move 7 again — …a6 instead of …Nf6, the third time here."
 *  Null when the record has nothing to say (a first game in the line). Uses
 *  the FAMILY the intro frames (a student facing the Pirc is not playing it). */
export function reviewOpeningRecord(params: {
  openingName: string | null;
  playerColor: 'white' | 'black';
  studentNeed: StudentNeedContext;
  gameId: string | null;
}): string | null {
  if (!params.openingName) return null;
  const framed = frameOpeningForStudent(params.openingName, params.playerColor);
  if (!framed.owned) return null; // their opening, not the student's record
  const family = openingFamily(params.openingName);
  const clause = openingRecordClause({ family, ctx: params.studentNeed, gameId: params.gameId });
  const departure = departureRecordSentence({ family, ctx: params.studentNeed, gameId: params.gameId });
  const parts: string[] = [];
  if (clause) parts.push(`That's ${clause}.`);
  if (departure) parts.push(departure);
  return parts.length > 0 ? parts.join(' ') : null;
}

function defaultIntroText(params: {
  playerColor: 'white' | 'black';
  result: string;
  openingName: string | null;
  mistakeCount: number;
  /** The student's record in this opening (A8), spoken after the outcome. */
  record?: string | null;
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
    ? ` You had ${params.mistakeCount === 1 ? 'one moment' : `${params.mistakeCount} moments`} worth a second look — here's each one.`
    : ` Clean play throughout — here's what worked.`;
  const recordBit = params.record ? ` ${params.record}` : '';
  return `Here's your game${openingBit} — you had ${colorWord} and it ended in ${resultPhrase}.${recordBit}${momentBit}`;
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
/** A projected line reads as a "threat"/"danger" ONLY when it is FORCING — it
 *  mates, or a strong majority of its plies are checks or captures. A quiet
 *  positional maneuver that merely improves the eval is NOT a threat; narrating
 *  it as one dumps an engine line that reads nothing like a human threat (David
 *  2026-07-24, full-game read: "Nxc3…d6…f5…Bd7…Ng5…Nf6" narrated as "a deeper
 *  threat brewing" — a 7-ply quiet maneuver). The plan-beats teach quiet ideas
 *  in words; the projection passes speak only forcing tactics. */
/** Run `fn` over `items` with at most `limit` in flight, preserving order.
 *  Used to spread the review's engine reads across the worker pool without
 *  firing every line at once (G4.6). */
/** How long the review waits for the refuted alternatives before building the
 *  walk. A LATENCY bound, never a teaching cap (G4.5/G4.6): what landed in
 *  time speaks through the door; a ply whose search was still running simply
 *  has no alternative to teach this time. */
const REFUTED_PREP_MS = 8_000;

/**
 * S2 — THE REFUTED ALTERNATIVE, computed BEFORE the walk is built (WO-TEACH-02).
 * `buildReviewSegments` is synchronous and the door runs per ply inside it, so
 * the engine work that costs the popular alternative happens here and is
 * handed in; the `[refuted]` facet it becomes goes through `decide()` like
 * every other fact. Student opening plies with nothing to correct only —
 * those are the plies a strong coach teaches with "most players play X here".
 * Candidates: players at the student's level first (cache), masters after.
 */
async function refutedAlternativesForGame(
  moves: readonly ReviewMoveInput[],
  playerColor: 'white' | 'black' | undefined,
): Promise<Map<number, RefutedAlternative>> {
  const out = new Map<number, RefutedAlternative>();
  if (!playerColor) return out;
  const chain = buildFenChain([...moves]);
  const jobs = moves.slice(0, chain.length)
    .map((m, i) => ({ m, fenBefore: chain[i].fenBefore }))
    .filter(({ m }) => m.ply <= OPENING_TEACH_MAX_PLY
      && (m.ply % 2 === 1) === (playerColor === 'white')
      && (m.classification === null || m.classification === 'book' || m.classification === 'good'))
    .map((t) => ({ ...t, candidates: candidatesForPosition(t.fenBefore, mastersMovesSync(t.fenBefore)) }))
    .filter((j) => j.candidates.length >= 2);
  if (jobs.length === 0) return out;
  const lease = await import('./gameAnalysisService')
    .then((mod) => mod.acquirePvEngines(jobs.length))
    .catch(() => null);
  const engines = lease?.engines ?? [];
  let next = 0;
  let stopped = false;
  const lanes = Math.max(1, Math.min(engines.length || 1, jobs.length));
  // Each lane owns ONE engine (never two searches on one worker).
  const work = Promise.all(Array.from({ length: lanes }, async (_unused, lane) => {
    const engine = engines[lane];
    for (;;) {
      if (stopped) return;
      const i = next++;
      if (i >= jobs.length) return;
      const j = jobs[i];
      const r = await refutedAlternative({
        fenBefore: j.fenBefore, taughtSan: j.m.san, candidates: j.candidates,
        studentColor: playerColor, depth: 10, maxPlies: 4, ...(engine ? { engine } : {}),
      }).catch(() => null);
      if (r && !stopped) out.set(j.m.ply, r);
    }
  }));
  await raceTimeout(work.then(() => undefined), REFUTED_PREP_MS, undefined);
  stopped = true;
  // The lease goes back only when the in-flight searches finish, so a worker
  // is never handed to the next pass while this one still drives it.
  void work.finally(() => lease?.release());
  return new Map(out);
}

export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = Array.from({ length: items.length });
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(lanes);
  return out;
}

function isForcingProjection(line: PvLine): boolean {
  if (line.plies.length === 0) return false;
  if (line.plies[line.plies.length - 1].facts.isMate) return true;
  const forcing = line.plies.filter((p) => p.facts.isCheck || !!p.facts.captured).length;
  return forcing / line.plies.length >= 0.6;
}

async function augmentWithProjections(
  segments: ReviewMoveSegment[],
  studentColorWB: 'w' | 'b',
  /** 'full' (uncapped diagnostic) runs all three passes; 'mistakes' (capped
   *  production) runs ONLY the punishment pass on the student's flagged moves
   *  (David 2026-07-21, IMG_4571: "How does white take advantage of this
   *  mistake?" — production reviews need the ramification, not just the badge). */
  scope: 'full' | 'mistakes' = 'full',
  /** The student's rating — scales how DEEP the spelled threat lines run
   *  (Phase 2: deeper for stronger, via pvDepthForRating). Default 1500. */
  rating = DEFAULT_STUDENT_RATING,
  /** Per-pass wall-clock ms, filled as each pass finishes (review-prep-timing). */
  timings: Record<string, number> = {},
): Promise<void> {
  let passStart = Date.now();
  const mark = (pass: string): void => { timings[pass] = Date.now() - passStart; passStart = Date.now(); };
  // How many plies to spell a deep threat line — rating-scaled, capped at the
  // reliable window (Phase 2, David 2026-09-07: "spell the lines out for
  // everyone", "the more advanced player should get a DEEPER calculation").
  const deepThreatPlies = pvDepthForRating(rating);
  // Render a projected line — computed in code, no LLM (G0). `rich` is kept
  // for call-site compatibility.
  const render = (line: PvLine, _rich = false): string => {
    // 🔒 THE LINE AS PROOF (WO-LAYERS-01). A line is spoken only as far as the
    // point it proves: mate, or a finished trade that wins something — the
    // moves, then the result, no description per move ("Qxd4, Qxd4, and the
    // knight forks on c2, winning a piece"). It replaced a six-ply recital
    // with an adjective on every move, which ran 120–300 words a ply.
    const sans = line.plies.map((p) => p.san);
    const proof = linePlies(line);
    if (proof.proof) {
      const moves = andList(sans.slice(0, proof.plies));
      return proof.proof.mate ? `${moves} — and it's mate` : `${moves} — ${describeProofResult(proof.proof.ledger as NonNullable<typeof proof.proof.ledger>)}`;
    }
    // No material point settles: the line proves nothing a sentence can hold,
    // and its verdict is already the move's own verdict. Say nothing — every
    // caller skips an empty line (a recital of moves that prove nothing is
    // exactly what this replaced).
    return '';
  };
  /** How many plies of a line are SPOKEN (and so drawn): the proof's length,
   *  or just the first move when nothing settles. One answer for the voice and
   *  the arrows, so the board never plays moves the coach did not name. */
  const linePlies = (line: PvLine): { plies: number; proof: LineProof | null } => {
    const proof = line.plies.length > 0
      ? proofCut(line.plies[0].fenBefore, line.plies.map((p) => p.san), studentColorWB)
      : null;
    return { plies: proof ? proof.plies : Math.min(1, line.plies.length), proof };
  };
  // David 2026-07-24: "we NEED arrows showing the lines the coach mentions. The
  // delta!" — whenever a projection line is spoken (render() above), the board
  // PLAYS IT OUT with a lead-the-eye arrow per move (CoachGameReview). A segment
  // can accrue several lines across passes; the board plays ONE, so keep the
  // highest-priority (the delta/better-line beats a punishment beats a threat).
  const spokenLineArrowPriority = new WeakMap<ReviewMoveSegment, number>();
  const attachLineArrows = (s: ReviewMoveSegment, line: PvLine, priority: number): void => {
    const existing = spokenLineArrowPriority.get(s) ?? -1;
    if (priority <= existing) return;
    const arrows = line.plies
      .slice(0, linePlies(line).plies)
      .filter((p) => p.uci && p.uci.length >= 4)
      .map((p) => ({ uci: p.uci, fenBefore: p.fenBefore, fenAfter: p.fenAfter }));
    if (arrows.length === 0) return;
    s.spokenLineArrows = arrows;
    spokenLineArrowPriority.set(s, priority);
  };
  // Budget: 'full' (uncapped) needs room for punishment + plan + consequence;
  // 'mistakes' (capped production) caps at 2 punishment lines per game so the
  // review prep never stalls on Stockfish.
  // NO COUNT CEILING in either scope (David 2026-09-16). The scopes already
  // differ in WHICH passes run; capping the number of lines on top of that
  // dropped real teaching on the 4th flagged move onward for no reason but
  // thrift. The punishment pass no longer carries a counter at all — it batches
  // every flagged move across the pool (G4.6).
  const PROJ_TIMEOUT_MS = 7000;

  // #3 — PUNISHMENT projection on BOTH SIDES' mistakes/blunders: the engine PV
  // from the position AFTER the flagged move IS the ramification (David
  // 2026-07-21, IMG_4571 — and he was WHITE there: the mistake was his
  // OPPONENT's, and the question was "how does white take advantage?"). Your
  // own mistake → "here's how it gets punished"; the opponent's → "here's how
  // you take advantage" — same computed line, correct seat. Runs in BOTH
  // scopes; in 'mistakes' scope it's the only pass.
  const studentColorName = studentColorWB === 'w' ? 'white' : 'black';
  // ── ONE ENGINE SCHEDULE, STARTED UP FRONT (2026-09-23) ─────────────────────
  //
  // Measured on a real 53-ply amateur game: the passes below ran strictly one
  // after another — each pooled pass leased the pool, waited for its slowest
  // line, released it, and only then did the next pass start, while the
  // singleton sat idle through every pooled pass and the pool sat idle through
  // every singleton pass. The projections alone took 54–75s and twice hit the
  // 75s cap, which drops whatever had not landed.
  //
  // So every engine probe the passes will want is SCHEDULED here, before any
  // pass composes a word: the pooled probes on ONE lease (in pass order, so the
  // early passes' lines land first), the singleton probes on their own chain,
  // both running at once. The passes below still COMPOSE in their original
  // order with their original filters — they only read results instead of
  // starting searches — so what a pass says is unchanged. Each probe set is a
  // SUPERSET of what its pass will read (collected before earlier passes have
  // appended text), because a probe the pass never reads costs a little engine
  // time and a probe it wants and cannot find would silently drop a beat.
  //
  // Each LANE owns ONE engine. The helper this replaces handed engines out by
  // item index (`i % engines.length`), so two lanes could drive the same
  // worker at once whenever they finished out of order.
  const poolKey = (fen: string, maxPlies: number): string => `${maxPlies}|${fen}`;
  const deferred = <T,>(): { promise: Promise<T>; resolve: (v: T) => void } => {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => { resolve = r; });
    return { promise, resolve };
  };
  const nullMoveFen = (fen: string, mover: 'w' | 'b'): string => {
    const parts = fen.split(' ');
    parts[1] = mover;
    parts[3] = '-';
    return parts.join(' ');
  };

  // #3 punish — every flagged move, both sides.
  const flaggedForPunish = segments.filter(
    (s) => s.classification === 'mistake' || s.classification === 'blunder',
  );
  // #5 deep threat — the student's good moves, null-moved to the student.
  const deepFens = new Map<string, string>(); // segment fenAfter -> nullFen
  for (const s of segments) {
    if (s.playerColor !== studentColorName) continue;
    if (s.classification !== 'good' && s.classification !== 'great' && s.classification !== 'brilliant') continue;
    try {
      if (s.fenAfter.split(' ')[1] === studentColorWB) continue;
      if (new Chess(s.fenAfter).inCheck()) continue;
      deepFens.set(s.fenAfter, nullMoveFen(s.fenAfter, studentColorWB));
    } catch { /* an unparseable segment simply contributes no probe */ }
  }
  // #5c deep threat against the student — the opponent's good moves.
  const oppWB: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
  const deepOppFens = new Map<string, string>();
  for (const s of segments) {
    if (s.playerColor === studentColorName) continue;
    if (s.classification !== 'good' && s.classification !== 'great' && s.classification !== 'brilliant') continue;
    try {
      if (s.fenAfter.split(' ')[1] === oppWB) continue;
      if (new Chess(s.fenAfter).inCheck()) continue;
      deepOppFens.set(s.fenAfter, nullMoveFen(s.fenAfter, oppWB));
    } catch { /* an unparseable segment simply contributes no probe */ }
  }
  // Missed prevention (WO-LAYERS-01 step 6) — the student's flagged moves whose
  // best move was QUIET: what was the opponent threatening before it? Probed
  // as a free move for the opponent at the board before the slip.
  const missedProphyFens = new Map<string, string>(); // segment fenBefore -> nullFen
  for (const s of flaggedForPunish) {
    if (s.playerColor !== studentColorName || !s.bestMoveSan) continue;
    if (/[x+#=]/.test(s.bestMoveSan)) continue;
    try {
      if (new Chess(s.fenBefore).inCheck()) continue;
      missedProphyFens.set(s.fenBefore, nullMoveFen(s.fenBefore, oppWB));
    } catch { /* no probe for an unparseable board */ }
  }
  // Prophylaxis — the student's quiet, still-silent moves from ply 10.
  const prophyFens = new Map<string, string>();
  if (scope !== 'mistakes') {
    for (const s of segments) {
      if (s.narration) continue;
      if (s.playerColor !== studentColorName) continue;
      if (s.ply < 10) continue;
      if (/[x+=]/.test(s.san)) continue;
      if (s.evalBefore === null || s.evalAfter === null) continue;
      const parts = s.fenBefore.split(' ');
      if (parts.length < 4) continue;
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      parts[3] = '-';
      const nf = parts.join(' ');
      try { new Chess(nf); } catch { continue; }
      prophyFens.set(s.fenBefore, nf);
    }
  }

  // The pooled schedule, in pass order. Duplicate (fen, depth) probes share one
  // search.
  const poolOrder: Array<{ fen: string; maxPlies: number }> = [
    ...flaggedForPunish.map((s) => ({ fen: s.fenAfter, maxPlies: 6 })),
    ...[...deepFens.values()].map((fen) => ({ fen, maxPlies: deepThreatPlies })),
    ...[...deepOppFens.values()].map((fen) => ({ fen, maxPlies: deepThreatPlies })),
    ...[...prophyFens.values()].map((fen) => ({ fen, maxPlies: 3 })),
    ...[...missedProphyFens.values()].map((fen) => ({ fen, maxPlies: 3 })),
  ];
  const poolDone = new Map<string, { promise: Promise<PvLine | null>; resolve: (v: PvLine | null) => void }>();
  /** One unit of pooled work. `engine` is the lane's own worker, or undefined
   *  when no pool could be had (then it runs on the singleton, as before). */
  const poolTasks: Array<(engine: PvEngine | undefined) => Promise<void>> = [];
  for (const p of poolOrder) {
    const key = poolKey(p.fen, p.maxPlies);
    if (poolDone.has(key)) continue;
    const d = deferred<PvLine | null>();
    poolDone.set(key, d);
    poolTasks.push(async (engine) => {
      d.resolve(await raceTimeout(
        computePvLine(p.fen, { maxPlies: p.maxPlies, ...(engine ? { engine } : {}) }),
        PROJ_TIMEOUT_MS,
        null,
      ).catch(() => null));
    });
  }
  // #6 bad-piece ablation — POOLED too. Measured on the real game it ran every
  // cramped-minor candidate one after another on the singleton (39.6s, the
  // single longest pass). Each candidate is independent, so they go on the pool
  // lanes; the pass still picks the biggest proven swing in candidate order.
  const badPieceCandidates = segments
    .filter((s) => s.ply >= 14 && !(s.evalAfter !== null && Math.abs(s.evalAfter) >= 5000))
    .map((s) => ({ s, mob: lowestMinorMobility(s.fenAfter) }))
    .filter((c) => c.mob <= 2)
    .sort((a, b) => a.mob - b.mob);
  const badPieceResults: Array<{ promise: Promise<PieceQualityResult | null>; resolve: (v: PieceQualityResult | null) => void }> =
    badPieceCandidates.map(() => deferred<PieceQualityResult | null>());
  badPieceCandidates.forEach((c, i) => {
    poolTasks.push(async (engine) => {
      const evaluate: Evaluate = async (fen) => {
        const l = await raceTimeout(computePvLine(fen, { maxPlies: 1, ...(engine ? { engine } : {}) }), PROJ_TIMEOUT_MS, null);
        return { cp: l ? l.rootEvalCp : NaN };
      };
      badPieceResults[i].resolve(await raceTimeout(
        explainEvalByPieceQuality(c.s.fenAfter, evaluate, { swingThresholdCp: 150, pairThresholdCp: 220, baseCp: c.s.evalAfter ?? undefined }),
        PROJ_TIMEOUT_MS * 2,
        null,
      ).catch(() => null));
    });
  });
  const poolLine = (fen: string, maxPlies: number): Promise<PvLine | null> =>
    poolDone.get(poolKey(fen, maxPlies))?.promise ?? Promise.resolve(null);
  // A pool that cannot be had degrades to the singleton exactly as before:
  // slower, never quieter. A single probe never leases (it would only add the
  // spawn cost), which is what the old per-pass helper did too.
  void (async () => {
    const lease = poolTasks.length > 1
      ? await import('./gameAnalysisService')
        .then((m) => m.acquirePvEngines(poolTasks.length))
        .catch(() => null)
      : null;
    try {
      const engines = lease?.engines ?? [];
      let next = 0;
      const laneCount = Math.max(1, Math.min(engines.length, poolTasks.length));
      await Promise.all(Array.from({ length: laneCount }, async (_unused, lane) => {
        const engine = engines[lane];
        for (;;) {
          const i = next++;
          if (i >= poolTasks.length) return;
          await poolTasks[i](engine).catch(() => undefined);
        }
      }));
    } finally {
      lease?.release();
      // Anything never reached (a lane threw) settles as "no line", never hangs.
      for (const d of poolDone.values()) d.resolve(null);
      for (const d of badPieceResults) d.resolve(null);
    }
  })();

  // THE SINGLETON CHAIN — the passes that search on `stockfishEngine`, in their
  // original order, running BESIDE the pool instead of after it.
  const deltaEvaluate: Evaluate = async (fen) => {
    const l = await raceTimeout(computePvLine(fen, { maxPlies: 1 }), PROJ_TIMEOUT_MS, null);
    return { cp: l ? l.rootEvalCp : NaN };
  };
  const flaggedStudent = segments
    .filter((s) => s.playerColor === studentColorName
      && (s.classification === 'inaccuracy' || s.classification === 'mistake' || s.classification === 'blunder')
      && !!s.bestMoveUci
      // bestMoveSan is nulled when the engine's best IS the move played (a
      // depth-limited mis-rank of a strong move — Morphy's 13.Rxd7). Never
      // narrate "Why Rxd7 was better" about the move that was actually played.
      && !!s.bestMoveSan
      // …and never nitpick a "better move" on a move that FORCES MATE — the
      // forced-finish framing already owns that segment (David 2026-07-24).
      && !/from this move on it's forced/.test(s.narration ?? ''))
    .sort((a, b) => {
      const swing = (x: ReviewMoveSegment): number =>
        x.evalBefore !== null && x.evalAfter !== null ? Math.abs(x.evalBefore - x.evalAfter) : 0;
      return swing(b) - swing(a);
    });
  const betterDone = deferred<Map<ReviewMoveSegment, { line: PvLine | null; why: string | null }>>();
  const confirmDone = deferred<Map<ReviewMoveSegment, PvLine | null>>();
  const badPieceDone = {
    promise: Promise.all(badPieceResults.map((d) => d.promise)).then((results) => {
      let bestPiece: { seg: ReviewMoveSegment; text: string; swing: number } | null = null;
      results.forEach((res, i) => {
        if (res?.delta && (!bestPiece || res.delta.ablation.swingCp > bestPiece.swing)) {
          bestPiece = { seg: badPieceCandidates[i].s, text: res.delta.text, swing: res.delta.ablation.swingCp };
        }
      });
      return bestPiece as { seg: ReviewMoveSegment; text: string; swing: number } | null;
    }),
  };
  void (async () => {
    // #4 the better line + the proven delta.
    const better = new Map<ReviewMoveSegment, { line: PvLine | null; why: string | null }>();
    try {
      for (const s of flaggedStudent) {
        const line = await raceTimeout(
          computePvLine(s.fenBefore, { firstUci: s.bestMoveUci as string, maxPlies: 6 }),
          PROJ_TIMEOUT_MS,
          null,
        ).catch(() => null);
        let why: string | null = null;
        if (line && line.plies.length >= 3) {
          const cmp = await raceTimeout(compareTwoMoves(s.fenBefore, s.san, line.plies[0].san, deltaEvaluate), PROJ_TIMEOUT_MS, null).catch(() => null);
          // A "why" only when the comparison AGREES with the grading: the
          // engine's move came out ahead and there is a proven delta. Walk 6,
          // R15 spoke "that was a blunder" then "Why b3 was better — the two
          // moves come out about the same": a shallower re-evaluation
          // contradicting the verdict one clause later.
          why = cmp && cmp.better === 'B' && cmp.delta && cmp.delta.kind !== 'none' ? cmp.delta.text : null;
        }
        better.set(s, { line, why });
      }
    } finally { betterDone.resolve(better); }
    // #4b the engine's verdict on each static threat.
    const confirm = new Map<ReviewMoveSegment, PvLine | null>();
    try {
      for (const s of segments) {
        if (!s.staticThreat) continue;
        confirm.set(s, await raceTimeout(computePvLine(s.staticThreat.nullFen, { maxPlies: 4 }), PROJ_TIMEOUT_MS, null).catch(() => null));
      }
    } finally { confirmDone.resolve(confirm); }
  })();

  // #3 compose — punishment / advantage lines.
  {
    const lines = await Promise.all(flaggedForPunish.map((s) => poolLine(s.fenAfter, 6)));
    flaggedForPunish.forEach((s, i) => {
      const line = lines[i];
      const isStudentSlip = s.playerColor === studentColorName;
      const proof = line && line.delivers && line.plies.length >= 2 ? render(line, true) : '';
      if (line && proof) {
        const frame = isStudentSlip
          ? `Here's how it gets punished from here: ${proof}.`
          : `Here's how you take advantage: ${proof}.`;
        s.narration = `${s.narration ?? ''} ${frame}`.trim();
        attachLineArrows(s, line, 4); // punishment/advantage line
      }
    });
  }
  mark('punish');
  // #4 — THE BETTER-LINE WHY (David 2026-07-21, IMG_4577: "Need to know why
  // Bf2 was better. The better lines need the why narrations. A deeper
  // understanding is critical."). On the student's flagged moves that name a
  // distinct best move — INACCURACIES included, which the punishment pass
  // skips — play the engine's line STARTING WITH the better move and narrate
  // every ply's why, so "the stronger move was X" always carries the
  // understanding, never just the name. Seeding firstUci reuses the stored
  // analysis' own top line, so this is usually a cache hit, not fresh engine
  // time. Biggest swings first so the budget lands on the moves that matter.
  let whyBudget = Number.POSITIVE_INFINITY; // every better-move delta (no ceiling)
  // THE DELTA (David 2026-07-24: "the delta is what computes why a stockfish
  // move is good — wire it in"): the method of comparison proves the concrete
  // reason the better move beats the played one (engine-verified ablation), so
  // "Why X was better" LEADS with the proven why, not just the line. Searched on
  // the singleton chain above; composed here in the original order.
  const better = await betterDone.promise;
  for (const s of flaggedStudent) {
    if (whyBudget <= 0) break;
    const got = better.get(s);
    const line = got?.line ?? null;
    if (line && line.plies.length >= 3) {
      const bestName = line.plies[0].san;
      const why = got?.why ?? null;
      const proof = render(line, true);
      // The why, and the line only where it PROVES something. Neither → the
      // move's own verdict ("X keeps the edge") has already said it.
      const parts = [why, proof ? `the line runs ${proof}` : null].filter((x): x is string => !!x);
      if (parts.length > 0) {
        s.narration = `${s.narration ?? ''} Why ${bestName} was better — ${parts.join('. ')}.`.trim();
        if (proof) attachLineArrows(s, line, 5); // the delta / better-line — David's named priority
        whyBudget -= 1;
      }
    }
    // MISSED PREVENTION (WO-LAYERS-01 step 6 — "h3 takes g4 away before the
    // pin"). Three engine reads must agree before it is said: the opponent's
    // free move at the board before the slip (their threat), their reply to
    // the move played (the punishment) — the SAME move — and their reply to
    // the quiet best move, which is NOT that move. Only then did the best move
    // take it away.
    const nullFen = missedProphyFens.get(s.fenBefore);
    if (nullFen && line && line.plies.length >= 2) {
      const strip = (x: string): string => x.replace(/[+#!?]+$/, '');
      const [threat, punish] = await Promise.all([poolLine(nullFen, 3), poolLine(s.fenAfter, 6)]);
      const t = threat?.plies[0]?.san;
      if (t && punish?.plies[0] && strip(punish.plies[0].san) === strip(t) && strip(line.plies[1].san) !== strip(t)) {
        s.narration = `${s.narration ?? ''} ${line.plies[0].san} first was the preventive move — it takes away their ${t}, and that is exactly the reply that punishes this.`.trim();
      }
    }
  }
  mark('better');

  // #4b — ENGINE-CONFIRMATION of the static threat call-outs (David
  // 2026-07-21: "We need to find a way for these two to work together. They
  // need to compliment each other!!"). The static layer PROPOSED the threat
  // and explained its mechanism; here the engine DECIDES: probe the same
  // null-move position — if the engine's own first move matches the claimed
  // threat, the claim stands and gains the engine's continuation (deeper
  // teaching for free); if the engine finds something better or refutes the
  // claim, the static sentence is REPLACED by the engine's line, voiced
  // through the same per-ply fact-computers. Truth from the engine,
  // mechanism from the statics — never a static story the engine disowns.
  let confirmBudget = Number.POSITIVE_INFINITY; // every threat confirmation (no ceiling)
  const confirmed = await confirmDone.promise;
  for (const s of segments) {
    if (confirmBudget <= 0) break;
    if (!s.staticThreat) continue;
    const line = confirmed.get(s) ?? null;
    confirmBudget -= 1;
    if (!line || line.plies.length === 0) continue; // engine unavailable — the static-verified claim stands
    const stripGl = (x: string): string => x.replace(/[+#!?]+$/, '');
    if (stripGl(line.plies[0].san) === stripGl(s.staticThreat.san)) {
      // AGREEMENT — extend the claim with the engine's continuation when it
      // has real follow-up teaching (2+ further plies).
      if (line.plies.length >= 3 && s.narration) {
        const tail = render({ ...line, plies: line.plies.slice(1) });
        if (tail) s.narration = `${s.narration} The engine confirms it — and if they try to run, it continues ${tail}.`;
        attachLineArrows(s, line, 3); // confirmed threat continuation
      }
    } else if (s.narration) {
      // DISAGREEMENT — the engine sees a stronger idea. Replace the static
      // sentence with the engine's own line, explained by the same statics.
      const engineWhy = plyFactsClause(line.plies[0].fenBefore, line.plies[0].san);
      const replacement = ` And the real threat here, per the engine: ${line.plies[0].san}${engineWhy ? ` — it ${engineWhy}` : ''}.`;
      s.narration = s.narration.replace(s.staticThreat.sentence, replacement);
      attachLineArrows(s, line, 3); // engine's replacement threat line
    }
  }
  mark('confirm');

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
  let deepBudget = scope === 'full' ? 999 : 2; // uncapped: every deep threat
  // The probes were collected and scheduled up front (see THE ENGINE SCHEDULE);
  // this pass reads them in its original order.
  const deepPv = new Map<string, PvLine | null>();
  for (const nf of deepFens.values()) deepPv.set(nf, await poolLine(nf, deepThreatPlies));
  for (const s of segments) {
    if (deepBudget <= 0) break;
    if (s.playerColor !== studentColorName) continue;
    if (s.classification !== 'good' && s.classification !== 'great' && s.classification !== 'brilliant') continue;
    // NEVER STACK two forcing lines on one move (David 2026-07-23, narration
    // dial-in): if #4 already extended this segment with the engine's
    // continuation, one line is enough — Danya reserves deep calculation for the
    // critical moment and never reads two long variations on a single move.
    if (s.narration && /engine confirms it|if they try to run/i.test(s.narration)) continue;
    try {
      const parts = s.fenAfter.split(' ');
      if (parts[1] === (studentColorWB === 'w' ? 'w' : 'b')) continue; // already student's turn — not a threat read
      const probe = new Chess(s.fenAfter);
      if (probe.inCheck()) continue;
      // NOT IN THE MIDDLE OF AN EXCHANGE (walk 5, 2026-09-23). After 5…cxd4
      // the probe asked "if they sit still" and read out a 13-ply line — but
      // Nxd4 was always coming, and came. A capture the opponent can take back
      // is an exchange in progress; "what if they don't recapture" is not a
      // threat the student built, it is the opponent forgetting a move.
      if (pendingRecapture(s.fenBefore, s.san, s.fenAfter)) continue;
      parts[1] = studentColorWB;
      parts[3] = '-';
      const nullFen = parts.join(' ');
      // maxPlies 7 = FOUR of the student's moves out (plies 1,3,5,7) — inside
      // depth-14's reliable window, never past it (David 2026-07-22: "don't
      // push the engine past its natural limits!!! Solid and honest is
      // paramount"). One move belongs to the static call-out; 2-4 moves
      // belong here.
      const line = deepPv.get(nullFen) ?? null;
      if (!line || line.plies.length < 3) continue; // one-movers belong to the static call-out
      const studentPovNow = s.evalAfter !== null ? (studentColorWB === 'w' ? s.evalAfter : -s.evalAfter) : null;
      const lastPly = line.plies[line.plies.length - 1];
      const matesOut = lastPly.facts.isMate; // chess.js replay fact — exact
      // The eval claim requires the VERIFIED terminal (re-analysis at the
      // line's end) — never the unverified root promise.
      const studentPovTerminal = line.terminalEvalCp !== null
        ? (studentColorWB === 'w' ? line.terminalEvalCp : -line.terminalEvalCp)
        : null;
      const decisiveJump = studentPovNow !== null && studentPovTerminal !== null
        && studentPovTerminal - studentPovNow >= 250;
      if (!matesOut && !decisiveJump) continue;
      // David 2026-09-07 (#4): the deep calculation "doesn't have to be forced —
      // spell the lines out for everyone." The decisive gate above (mate or a
      // ≥250cp verified swing) is the noise floor; a quiet eval-drift never
      // clears it. A FORCING line is a "threat"; a decisive but non-forcing best
      // line is a "plan" — labelled honestly so we never overstate a plan as a
      // forced threat (the "if they sit still" framing is already true for both).
      // TEACHING POINTS FIRST (2026-09-23): a FORCING line is a threat the
      // student built — a teaching point. A decisive but non-forcing best line
      // only describes where the game could go, and a long engine line speaks
      // only when it proves a point, so it stays quiet.
      if (!isForcingProjection(line)) continue;
      const deep = render(line);
      s.narration = deep
        ? `${s.narration ?? ''} And there's a deeper threat brewing — if they sit still, it runs ${deep}.`.trim()
        : `${s.narration ?? ''} And there's a deeper threat brewing — if they sit still, it starts with ${line.plies[0].san}.`.trim();
      attachLineArrows(s, line, 3); // deep threat (student's)
      deepBudget -= 1;
    } catch { /* skip this ply — never block the walk on a threat probe */ }
  }

  // #5c — THE DEEP THREAT AGAINST THE STUDENT (David 2026-07-22: "threats
  // are called out 3+ moves in advance. Both for and against the user").
  // The one-move opponent call-out (identify→recognize→prevent) lives in
  // the per-ply loop; here the ENGINE reads the opponent's DEEP idea: from
  // the position after an opponent move, give the OPPONENT the move again
  // and read the line — if, with the student sitting still, it mates or
  // swings decisively toward the opponent (≥250cp) within ≤9 plies (2-5 of
  // the opponent's moves), that is the brewing danger — narrated ply-by-ply
  // through the same render machinery, closed with the DEFENSE from the
  // stored analysis (the student's next best move — in the package, no
  // fresh search, G0).
  mark('deep');
  let deepOppBudget = scope === 'full' ? 999 : 2; // uncapped: every opponent deep threat
  const deepOppPv = new Map<string, PvLine | null>();
  for (const nf of deepOppFens.values()) deepOppPv.set(nf, await poolLine(nf, deepThreatPlies));
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (deepOppBudget <= 0) break;
    if (s.playerColor === studentColorName) continue;
    // Probe the opponent's STRONG moves — that's where a deep idea lives
    // (mirrors #5's gate; also bounds the engine-probe count per review).
    if (s.classification !== 'good' && s.classification !== 'great' && s.classification !== 'brilliant') continue;
    try {
      const parts = s.fenAfter.split(' ');
      if (parts[1] === oppWB) continue; // already the opponent's turn — not a null read
      const probe = new Chess(s.fenAfter);
      if (probe.inCheck()) continue;
      parts[1] = oppWB;
      parts[3] = '-';
      const nullFen = parts.join(' ');
      // Same honest window as #5: 7 plies (4 opponent moves), and the eval
      // claim requires the VERIFIED terminal — never the unverified root.
      const line = deepOppPv.get(nullFen) ?? null;
      if (!line || line.plies.length < 3) continue; // one-movers belong to the static opponent call-out
      // Don't re-narrate the same move the one-move call-out already named.
      const stripGl = (x: string): string => x.replace(/[+#!?]+$/, '');
      const immediate = /threatens ([A-Za-z0-9+#=-]+):/.exec(s.narration ?? '')?.[1];
      if (immediate && stripGl(line.plies[0].san) === stripGl(immediate)) continue;
      const oppPovNow = s.evalAfter !== null ? (oppWB === 'w' ? s.evalAfter : -s.evalAfter) : null;
      const lastPly = line.plies[line.plies.length - 1];
      const matesOut = lastPly.facts.isMate; // chess.js replay fact — exact
      const oppPovTerminal = line.terminalEvalCp !== null
        ? (oppWB === 'w' ? line.terminalEvalCp : -line.terminalEvalCp)
        : null;
      const decisiveJump = oppPovNow !== null && oppPovTerminal !== null
        && oppPovTerminal - oppPovNow >= 250;
      if (!matesOut && !decisiveJump) continue;
      // David 2026-09-07 (#4): non-forcing decisive lines count too. Forcing →
      // "threat"; decisive non-forcing → "idea/plan" (honest label). The decisive
      // ≥250cp gate is the noise floor; "left alone" is true for both.
      const oppDeepKind = isForcingProjection(line) ? 'threat' : 'idea';
      // A proof when the line settles something; otherwise the IDEA is still
      // the teaching (what they want) — named by its first move, not recited.
      const oppRun = render(line);
      let callOut = oppRun
        ? `Watch what they're building — left alone, their ${oppDeepKind} runs ${oppRun}.`
        : `Watch what they're building — left alone, their ${oppDeepKind} starts with ${line.plies[0].san}.`;
      const next = segments[i + 1];
      if (next && next.playerColor === studentColorName && next.bestMoveSan) {
        callOut += ` Your defense starts with ${next.bestMoveSan}.`;
      }
      s.narration = `${s.narration ?? ''} ${callOut}`.trim();
      attachLineArrows(s, line, 3); // deep threat (opponent's idea)
      deepOppBudget -= 1;
    } catch { /* skip this ply — never block the walk on a threat probe */ }
  }

  mark('deepOpp');

  // #6 — BAD-PIECE ATTRIBUTION (David 2026-07-23, IMG_4589: "the knight and the
  // bishop are so bad that White has fighting chances"). The method of comparison
  // aimed at a PIECE. TARGET the middlegame position with the most cramped MINOR
  // (a free board scan — a bad piece is a rim knight / buried bishop, a low-
  // mobility fact), then ablate it there: teleport to its best clean square,
  // re-eval, and speak it ONLY if the swing proves that piece is the cause (the
  // engine gates every claim; a check-giving teleport or an out-of-range swing
  // is rejected, so we never invent a bad piece — G0). One position per game,
  // timeout-guarded; both scopes (this is where Danya's "his pieces are
  // terrible" reads live).
  {
    // Searched on the singleton chain above (same candidates, same ablation);
    // composed here.
    const best = await badPieceDone.promise;
    if (best) {
      // Appended as its own sentence — capitalize the lead so the seat-stamped
      // possessive ("their"/"your") reads as a sentence start, not mid-clause.
      const obs = best.text.charAt(0).toUpperCase() + best.text.slice(1);
      best.seg.narration = `${best.seg.narration ?? ''} ${obs}.`.trim();
    }
  }

  mark('badPiece');
  // #0 THE OPENING PLAN PLAYED OUT, #1 THE PLAN LINE and #2 THE CONSEQUENCE LINE
  // are REMOVED (2026-09-23, "teaching points first"). Each played a long engine
  // line that DESCRIBED where a calm position could go — "Played out, the game
  // develops naturally from here — …", "Follow it up and it goes …" — without
  // proving a point the student needed. The lines that TEACH stay: the
  // punishment, why the better move was better, the engine's verdict on a
  // threat, the threats either side is building, the bad piece, prophylaxis.
  // Nothing here is a cap: a teaching line of any length still speaks.
  if (scope === 'mistakes') return;
  // #5 — PROPHYLAXIS (David 2026-07-24: "keep going" — the concept-tool member
  // that needs the engine). A quiet student move that PREVENTS the opponent's
  // threat: give the opponent a FREE tempo (null move) at fenBefore — if their
  // best then gains ≥ ~1.5, they had a real threat; if the student's actual
  // QUIET move (no capture/check/promo) holds the eval steady, that move took
  // the sting out of it before it started. One extra engine eval per candidate,
  // bounded by its own small budget. G0: the CODE proves the threat existed and
  // was neutralised from the engine; the house voice only phrases it.
  {
    let prophyBudget = scope === 'full' ? 999 : 2; // uncapped: every prophylactic move
    const studentPov = (cp: number): number => (studentColorWB === 'w' ? cp : -cp);
    // Collected and scheduled up front (THE ENGINE SCHEDULE); read here.
    const prophyPv = new Map<string, PvLine | null>();
    for (const nf of prophyFens.values()) prophyPv.set(nf, await poolLine(nf, 3));
    for (const s of segments) {
      if (prophyBudget <= 0) break;
      if (s.narration) continue;                            // fill only silent moves
      if (s.playerColor !== studentColorName) continue;     // the student's own prophylaxis
      if (s.ply < 10) continue;                             // middlegame onward
      if (/[x+=]/.test(s.san)) continue;                    // quiet: no capture / check / promotion
      if (s.evalBefore === null || s.evalAfter === null) continue;
      const parts = s.fenBefore.split(' ');
      if (parts.length < 4) continue;
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      parts[3] = '-';
      const nullFen = parts.join(' ');
      try { new Chess(nullFen); } catch { continue; }        // flip must be a legal position
      const threatLine = prophyPv.get(nullFen) ?? null;
      if (!threatLine || threatLine.plies.length === 0) continue;
      const beforeEval = studentPov(s.evalBefore);
      const afterEval = studentPov(s.evalAfter);
      const freeMoveEval = studentPov(threatLine.rootEvalCp); // student POV if the opponent got a free move
      if (beforeEval - freeMoveEval < 150) continue;         // no real threat → not prophylaxis
      if (afterEval < beforeEval - 40) continue;             // the move conceded → it didn't neutralise
      const threatSan = threatLine.plies[0].san;
      s.narration = `A quiet, preventive move — this is prophylaxis. Your opponent was set up for ${threatSan}, and this takes the sting out of it before it starts. Stopping their idea is often worth more than making one of your own.`;
      s.narrationSource = 'orientation';
      prophyBudget -= 1;
    }
  }
  mark('prophylaxis');
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
  const collect = (steps: Array<{ san: string; fenAfter: string }>): Map<string, { to: string; piece: string }> => {
    const targets = new Map<string, { to: string; piece: string }>();
    let fen = seg.fenBefore;
    for (const p of steps) {
      try {
        const c = new Chess(fen);
        const mv = c.move(p.san);
        if (!mv) break;
        fen = p.fenAfter;
        if (isMinorAtHome(mv.piece, mv.color, mv.from) && !targets.has(mv.from)) {
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
  const mineT = [...targets.entries()].filter(([f]) => sideOf(f) === 'student');
  const theirsT = [...targets.entries()].filter(([f]) => sideOf(f) === 'opponent');
  const list = (xs: Array<[string, { to: string; piece: string }]>, poss: string): string =>
    xs.map(([from, t]) => `${poss} ${from}-${t.piece} to ${t.to}`).join(' and ');
  const bits: string[] = [];
  if (mineT.length) bits.push(`it develops ${list(mineT, 'your')}`);
  if (theirsT.length) bits.push(`${mineT.length ? 'and expect' : 'expect'} ${list(theirsT, 'their')}`);
  const spoken = bits.join(', ');
  if (spoken) {
    seg.narration = source === 'book'
      ? `${seg.narration ?? ''} In this exact structure the book's scheme: ${spoken} — that's the path the master games follow here.`.trim()
      : `${seg.narration ?? ''} You're past the master book here, so trust the engine's scheme: ${spoken}.`.trim();
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

/** True when every OCCUPANCY claim in `text` — a piece asserted to SIT on a
 *  square — is TRUE on `fen` (the board the student sees at that ply). Guards
 *  the review walk against a house-voice rephrase that attaches a piece to a
 *  square it doesn't occupy — e.g. "the pawn on b5 gets taken" after a bishop
 *  landed on b5 (audit 2026-07-20), or "their pawn digs in on c4" warmed from a
 *  fact about d3 (real-game review audit 2026-09-09, chesscom-1000411252: no
 *  pawn was EVER on c4 — the warm turned "the pawn to d3, guarding e4" into an
 *  invented c4 pawn, and the bare "<piece> on <square>" pattern never saw it
 *  because "on" wasn't adjacent to the piece). Runtime analog of the build-time
 *  narrationAccuracy contract.
 *
 *  CATCHES occupancy across phrasings — the piece named followed by an OCCUPANCY
 *  connective (on/to/onto) directly OR through a whitelisted occupancy verb
 *  ("digs in on", "lands on", "sits on", "settles on", "plants … on", "parked
 *  on"), plus the hyphenated "the c4-pawn" form. Deliberately does NOT flag
 *  CONTROL/vision phrasings ("eyeing c4", "guarding e4", "fighting for the
 *  center on d4", "bears down on g7") — a piece eyeing an empty square is true
 *  teaching, only a piece CLAIMED TO OCCUPY an empty/wrong square is the lie. */
export function narrationBoardAccurate(text: string, fen: string): boolean {
  const WANT: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
  const occupies = (piece: string, sq: string, board: Chess): boolean => {
    const cell = board.get(sq.toLowerCase() as Square);
    return !!cell && cell.type === WANT[piece.toLowerCase()];
  };
  try {
    const board = new Chess(fen);
    const PIECE = '(knight|bishop|rook|queen|pawn|king)';
    // Whitelisted placement verbs — a piece that "digs / sinks / lands / sits /
    // settles / plants / parks / posts / camps / drops / slots / tucks / nestles
    // / burrows / stands / holds" onto a square is asserted to BE there. Attack
    // verbs ("bears down on", "eyes", "hits", "targets", "fighting for … on") are
    // pointedly absent — they're vision, not occupancy.
    const OCC_VERB = '(?:digs?|sinks?|lands?|landed|sits?|sat|sitting|settles?|settled|plants?|planted|parks?|parked|posts?|posted|stationed|camps?|camped|drops?|slots?|tucks?|nestles?|burrows?|stands?|standing|holds?)';
    const patterns: RegExp[] = [
      // direct: "knight on e5" / "pawn to d3" / "bishop onto g7" / "pawn into c4"
      new RegExp(`\\b${PIECE}\\s+(?:on|onto|into|to)\\s+([a-h][1-8])\\b`, 'gi'),
      // verb-mediated: "pawn digs in on c4" / "knight settles on d5" / "pawn digs
      // into c4" / "knight sinks into e5" (piece within a short window of the
      // placement verb, an optional "in", then a placement prep + square)
      new RegExp(`\\b${PIECE}\\b[^.,;:]{0,24}?\\b${OCC_VERB}\\s+(?:in\\s+)?(?:on|onto|into)\\s+([a-h][1-8])\\b`, 'gi'),
      // hyphenated: "the c4-pawn"
      new RegExp(`\\bthe\\s+([a-h][1-8])-(knight|bishop|rook|queen|pawn|king)\\b`, 'gi'),
    ];
    for (let i = 0; i < patterns.length; i++) {
      const re = patterns[i];
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        // The hyphenated form is [square, piece]; the others are [piece, square].
        const piece = i === 2 ? m[2] : m[1];
        const sq = i === 2 ? m[1] : m[2];
        if (!occupies(piece, sq, board)) return false;
      }
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

/** The warm pass may not move a move from one seat to the other. The raw line
 *  names the mover ("You capture…" / "Your opponent stakes…"); a rephrase that
 *  opens an OPPONENT ply with "You <verb>" (or a STUDENT ply with "Your
 *  opponent" / "They") has reattributed the move, whatever the prompt said
 *  (audit 2026-09-06: 1.e4 by the opponent warmed to "You grab the center").
 *  Pure text — no board needed, the seat is a fact of the ply. */
export function narrationMoverFaithful(warmed: string, moverIsStudent: boolean): boolean {
  const head = warmed.replace(/^["'“‘\s]+/, '').slice(0, 40);
  if (moverIsStudent) {
    return !/^(your opponent|their (move|pawn|knight|bishop|rook|queen|king)\b|they )/i.test(head);
  }
  // Opponent ply: "You <action verb>" reattributes the move. Not an enumerated
  // verb list (the model found "seize" the moment "grab" was blocked) — ANY
  // "You <word>" is rejected except the state/modal forms that describe the
  // student's situation rather than a move: "You're", "You've", "You had",
  // "You need", "You can"… "Your <piece>…" (a threat read) is not "You ".
  return !/^you\s+(?!(?:'re|'ve|'ll|'d|are|were|have|had|has|need|want|can|could|must|should|may|might|will|would|know|see|feel|get|keep|hold|sit|stand|remain|stay)\b)[a-z]/i.test(head);
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

/** COVERAGE fidelity for the house-voice pass (David 2026-07-22: "Does the
 *  LLM ever decide what facts it should or should not state?" — the answer
 *  must be NO). The coverAll prompt MANDATES voicing every bracketed facet;
 *  this net ENFORCES it: each facet in the deterministic bundle must leave a
 *  footprint in the warmed prose — at least one of its square / SAN anchors
 *  survives the rephrase. Rewording is fine; a DROPPED facet is not. A facet
 *  with no board anchors (a bare verdict) can't be anchor-checked and is
 *  skipped. On failure the deterministic template ships verbatim — full
 *  content always wins over polish. */
export function narrationCoversFacets(det: string, warmed: string): boolean {
  const facets = det.split(/(?=\[[a-z0-9-]+\])/i).map((f) => f.trim()).filter(Boolean);
  if (facets.length <= 1 && !/^\[/.test(det)) return true; // untagged text — nothing to anchor
  const wLower = warmed.toLowerCase();
  for (const f of facets) {
    const sans = f.match(/\b(?:[NBRQK][a-h]?[1-8]?x?[a-h][1-8]|O-O(?:-O)?)\b/g) ?? [];
    const anchors = new Set<string>([
      ...(f.match(/\b[a-h][1-8]\b/g) ?? []),
      ...sans,
      // A reword may keep only the SAN's destination square ("Nf3" → "lands
      // on f3") — that footprint still proves the facet survived.
      ...sans.map((s) => s.replace(/[+#]/g, '').slice(-2)).filter((s) => /^[a-h][1-8]$/.test(s)),
    ]);
    if (anchors.size === 0) continue;
    const hit = [...anchors].some((a) => wLower.includes(a.toLowerCase()));
    if (!hit) return false;
  }
  return true;
}

/**
 * STEM-VARIETY PASS (David 2026-07-24: the Naroditsky side-by-side showed our
 * deterministic templates hammering the SAME stem across one game — "Clean."
 * ×3, "an undefended piece is a standing invitation, and tactics find it" ×3,
 * plus "It develops the X to Y" and "Your opponent erred —" dozens of times a
 * game. Danya never repeats a stem). This is a PURE REPHRASE over the finished
 * facts (G0-safe — adds zero chess content): the FIRST occurrence of each
 * signature keeps its full form; later occurrences rotate to a shorter/alternate
 * phrasing, keyed on the occurrence count so it's deterministic + resume-safe
 * (no Math.random). Runs before the house-voice pass so the warmer varies from
 * already-varied input, not from a wall of identical stems.
 */
/**
 * SILENT-MIDDLE FILL (David 2026-07-24: the side-by-side showed us going silent
 * on quiet moves where Danya keeps teaching — "he never goes silent"). Fills a
 * silent quiet move with the GROUNDED merit of the piece it moved ("what it does
 * + what it eyes") from `describeMoveMerit`, which returns null for a recapture
 * / king-flight / passive shuffle — so those correctly STAY silent (G3: empty >
 * generic > invented, no fabricated plan). Runs BEFORE the variety pass so the
 * new development lines get deduped like any other stem. Opening / early-
 * middlegame only, where development is the story.
 */
/**
 * CONCEPT-BEAT FILL (David 2026-07-24: "build a concept level tool"). Fills a
 * silent move with the STRATEGIC IDEA it expresses (`detectConcept` — grounded
 * preconditions on board + engine eval; null when no concept computably holds,
 * so nothing is invented). Higher teaching value than bare development merit, so
 * it runs first. Deduped per concept: taught in FULL the first time it appears,
 * a brief nod the second, silent after — a concept lectured on every trade in a
 * won game would tune out (the very repetition dial we just turned).
 */
// No per-game total (G4.5): a cap cannot know what it deletes. Repetition is
// handled by the per-concept dedupe below — full once, a nod once, then silent.
function fillConceptBeats(segments: ReviewMoveSegment[], playerColor: 'white' | 'black'): void {
  const studentColor: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
  const shown = new Map<string, number>();
  for (const s of segments) {
    if (s.narration || s.evalBefore === null || s.evalAfter === null) continue;
    const moverColor: 'w' | 'b' = s.ply % 2 === 1 ? 'w' : 'b';
    let beat: ReturnType<typeof detectConcept> = null;
    try {
      beat = detectConcept({
        fenBefore: s.fenBefore, fenAfter: s.fenAfter, san: s.san,
        moverColor, evalBefore: s.evalBefore, evalAfter: s.evalAfter, studentColor,
      });
    } catch { beat = null; }
    if (!beat) continue;
    const n = shown.get(beat.concept) ?? 0;
    shown.set(beat.concept, n + 1);
    if (n === 0) { s.narration = beat.text; s.narrationSource = 'orientation'; s.teaches = true; }
    else if (n === 1 && beat.concept === 'simplify-when-ahead') {
      s.narration = moverColor === studentColor
        ? `Another pair comes off — exactly right when you're winning.`
        : `More pieces off the board — that only speeds your win.`;
      s.narrationSource = 'orientation';
      s.teaches = true;
    }
    // n >= 2 (or a repeat of a non-simplify concept): stay silent, the point landed.
  }
}

// fillSilentDevelopment is RETIRED (WO-TEACH-02 S1, David 2026-09-24:
// "Everything said needs to teach something. Not state the move."). It ran
// AFTER the deciding door and refilled every ply the door had silenced with a
// description of the move — "It developed into the game", "Your opponent
// stakes out the center" — which was most of what a student heard. The retired
// R2 loop by another name. Quiet plies are now filled only by TEACHING
// computers (the refuted alternative, a principle taught once, the opponent's
// purpose) or stay silent.

/**
 * PAST-TENSE PASS (David 2026-07-24: "it's a post-game review" — the walk speaks
 * in the RETROSPECTIVE register). The deterministic templates describe the move
 * that WAS played in the present ("you capture the queen", "the knight forks the
 * king"); in a post-game review that reads as live commentary. This converts the
 * ACTUAL-MOVE clause to past tense — but NEVER the hypothetical tails (the
 * "here's how you take advantage… then Nxe5 captures" projection lines are future
 * variations that didn't happen) and NEVER a live threat ("it wins the queen" is
 * a threat, not a past event). It splits each line at the first projection/threat
 * marker and past-tenses only the head. Pure rephrase, adds no chess content (G0).
 */
const PAST_VERB: Record<string, string> = {
  captures: 'captured', capture: 'captured', wins: 'won', win: 'won', gives: 'gave', give: 'gave',
  throws: 'threw', throw: 'threw', grabs: 'grabbed', takes: 'took', take: 'took',
  sacrifices: 'sacrificed', sacrifice: 'sacrificed', lands: 'landed', land: 'landed',
  opens: 'opened', open: 'opened', creates: 'created', create: 'created', comes: 'came',
  breaks: 'broke', castles: 'castled', castle: 'castled', plants: 'planted', plant: 'planted',
  pins: 'pinned', attacks: 'attacked', attack: 'attacked', develops: 'developed', develop: 'developed',
  settles: 'settled', forks: 'forked', fork: 'forked', recaptures: 'recaptured', adds: 'added',
  add: 'added', meets: 'met', drops: 'dropped', walks: 'walked', holds: 'held', hold: 'held',
  plays: 'played', play: 'played', skewers: 'skewered', skewer: 'skewered', strips: 'stripped',
  strip: 'stripped', bears: 'bore', bear: 'bore', goes: 'went', trades: 'traded', trade: 'traded',
  offers: 'offered', offer: 'offered', grab: 'grabbed', settle: 'settled',
  meet: 'met', walk: 'walked', drop: 'dropped', recapture: 'recaptured', break: 'broke',
};

/** The student's move captured, and the opponent can take back on that square
 *  right now — an exchange still in progress. Pure chess.js. */
export function pendingRecapture(fenBefore: string, san: string, fenAfter: string): boolean {
  try {
    const mv = new Chess(fenBefore).move(san);
    if (!mv?.captured) return false;
    const after = new Chess(fenAfter);
    return after.moves({ verbose: true }).some((m) => m.to === mv.to && !!m.captured);
  } catch { return false; }
}

const PROJECTION_MARKER = /(here's how you take advantage|the line runs|why [nbrqko][\w+#=-]* was better|why [a-h][\w+#=-]* was better|if they (sit still|try to run)|the engine confirms it|there's a deeper threat|deeper threat brewing|the real threat here|and the real threat|you're now threatening|now threatening|the pattern to spot|and once your opponent started slipping|watch out|careful)/i;
// Verbs converted ONLY in verb position (after a subject or in a comma-series),
// so noun objects survive — "lands a pin" → "landed a pin" (not "a pinned"),
// "every trade" stays a noun.
const V_ALT = '(captures?|forks?|gives?|wins?|throws?|takes?|sacrifices?|opens?|creates?|comes|breaks?|castles?|plants?|attacks?|develops?|settles?|recaptures?|adds?|meets?|drops?|walks?|holds?|plays?|goes|trades?|offers?|bears?|lands?|skewers?|strips?|grabs?)';
// "the move Qxh7 captures …" is a subject too (walk 5, R18): without it the
// series verbs after it changed tense and the head did not — "captures the
// pawn, created a passed pawn, won material".
const SUBJECT_VERB = new RegExp(`\\b(You|It|Your opponent|The (?:knight|bishop|rook|queen|king|pawn)|[Tt]he move [A-Za-z0-9+#=-]+) ${V_ALT}\\b`, 'g');
const SERIES_VERB = new RegExp(`, ${V_ALT}\\b`, 'g');
// PRESCRIPTIVE SENTENCES ARE NEVER PAST-TENSED (found 2026-09-16 by reading the
// shipped review of David's Alapin). The retrospective register describes what
// HAPPENED; a plan describes what to DO NEXT, and past-tensing it produces
// ungrammatical nonsense the student reads as the coach losing the thread —
// "don't play a single attacking move until it was fixed", "a piece doing
// nothing means you were effectively playing down a piece". `PROJECTION_MARKER`
// cut the tail at the FIRST engine-line marker, which protected a plan only when
// one happened to sit after it: the same walk said "Watch what they're building"
// on one ply and "Watch what they were building" on another, purely on ordering.
// Registers don't take turns in one string, so the decision is made PER SENTENCE.
const PRESCRIPTIVE = /(the plan (?:from here|is)|so the plan is|here's (?:exactly )?how|your defense starts with|watch what they|follow it up|don't play|spend two or three tempi|that's your cue|is your cue|your whole job|wants to run)/i;
/** Case-preserving contraction rewrite: "You're" → "You were", never "you were"
 *  mid-narration with a lowercase head (the `/gi` replacement used to lowercase
 *  every sentence it opened). */
function sub(h: string, re: RegExp, past: string): string {
  return h.replace(re, (m) => (m[0] === m[0].toUpperCase() ? past[0].toUpperCase() + past.slice(1) : past));
}
function toPastSentence(sentence: string): string {
  if (PRESCRIPTIVE.test(sentence) || isMethodSentence(sentence)) return sentence;
  let h = sentence;
  // contractions / state-of-being → past
  h = sub(h, /\bthat's\b/gi, 'that was');
  h = sub(h, /\bit's\b/gi, 'it was');
  h = sub(h, /\byou're\b/gi, 'you were');
  h = sub(h, /\bthey're\b/gi, 'they were');
  h = sub(h, /\bthere's\b/gi, 'there was');
  h = sub(h, /\bis still\b/gi, 'was still');
  // "points a pawn storm" is a verb; "2 points of material" is a noun — only the verb.
  h = h.replace(/\bpoints a\b/gi, 'pointed a');
  h = h.replace(SUBJECT_VERB, (_m, subj: string, verb: string) => `${subj} ${PAST_VERB[verb.toLowerCase()] ?? verb}`);
  h = h.replace(SERIES_VERB, (_m, verb: string) => `, ${PAST_VERB[verb.toLowerCase()] ?? verb}`);
  return h;
}
function toPastHead(head: string): string {
  // Split on sentence ends but KEEP the delimiter, so reassembly is lossless.
  return head.split(/(?<=[.!?])(\s+)/).map((piece, i) => (i % 2 === 1 ? piece : toPastSentence(piece))).join('');
}
/** Exported for the register gate (`reviewRegister.test.ts`) — the three
 *  defects it pins were live in the shipped voice while every other test was
 *  green, so the rewrite needs a test that can reach it directly. */
export function pastTenseReviewNarration(segments: ReviewMoveSegment[]): void {
  for (const s of segments) {
    if (!s.narration) continue;
    const m = PROJECTION_MARKER.exec(s.narration);
    const cut = m ? m.index : s.narration.length;
    const head = s.narration.slice(0, cut);
    s.narration = toPastHead(head) + s.narration.slice(cut);
  }
}

function varyRepeatedStems(segments: ReviewMoveSegment[]): void {
  const seen = new Map<string, number>();
  const bump = (k: string): number => { const n = (seen.get(k) ?? 0); seen.set(k, n + 1); return n; };
  const PIECE_UP: Record<string, string> = { knight: 'Knight', bishop: 'Bishop', rook: 'Rook', queen: 'Queen', king: 'King' };
  for (const s of segments) {
    if (!s.narration) continue;
    let t = s.narration;

    // STACKED PLANS ON ONE PLY — vary the stem, never drop a plan (G4.5: a long
    // list is a PHRASING problem, never a truncation). Found 2026-09-16 reading
    // David's Alapin review: ply 31 won a piece and three agendas fired at once,
    // so one breath opened "The plan from here is to…" three times — a form
    // letter, and the drumbeat is what reads as "the coach says too much". Every
    // plan and every method survives verbatim; only the 2nd and 3rd stem change.
    // WITHIN the segment (cross-ply repetition is already deduped by the caller),
    // so the counter is local and resets on each narration.
    {
      let nth = 0;
      t = t.replace(/\bThe plan from here is to /g, (m0) => {
        nth += 1;
        if (nth === 1) return m0;
        const forms = ['Alongside that, aim to ', 'And the third piece of it: ', 'On top of that, work to '];
        return forms[(nth - 2) % forms.length];
      });
    }

    // "Clean." confirmation tag — keep the first, then rotate/drop.
    if (/\bClean\./.test(t)) {
      const n = bump('clean');
      if (n > 0) {
        const alts = ['', ' Simple.', ' Nothing fancy.', ' Just good chess.'];
        t = t.replace(/\s*Clean\./, alts[n % alts.length]);
      }
    }

    // "an undefended piece is a standing invitation, and tactics find it" — the
    // loose-piece moral. Keep it once; after that, name the fact without the sermon.
    if (/an undefended piece is a standing invitation, and tactics find it/.test(t)) {
      if (bump('loose-invite') > 0) {
        t = t.replace(/ — an undefended piece is a standing invitation, and tactics find it/, ' — it sits undefended');
      }
    }

    // "another pair comes off — and with your extra material…" — keep the moral
    // once, then just state the trade.
    if (/another pair comes off — and with your extra material, every trade is one step closer to the win/.test(t)) {
      if (bump('trade-moral') > 0) {
        t = t.replace(/ — and with your extra material, every trade is one step closer to the win/, '');
      }
    }

    // "It develops the <piece> to <sq>" — the development lead. Rotate the verb
    // phrase by occurrence so it stops reading like a form letter.
    t = t.replace(/\bIt develops the (knight|bishop|rook|queen|king) to ([a-h][1-8])\b/, (m0, piece: string, sq: string) => {
      const n = bump('develops');
      if (n === 0) return m0;
      const forms = [
        `The ${piece} comes to ${sq}`,
        `The ${piece} settles on ${sq}`,
        `${PIECE_UP[piece]} to ${sq}`,
      ];
      return forms[(n - 1) % forms.length];
    });

    // "And there it is —" is the brilliant/great-move stem; on a forced mating
    // run every check is brilliant, so it fired 6× in a row (audit 2026-07-24).
    // Keep the first, then rotate.
    t = t.replace(/\bAnd there it is — /, (m0: string) => {
      const n = bump('there-it-is');
      if (n === 0) return m0;
      const forms = ['And again — ', 'Same hammer — ', 'Once more — ', 'And onward — '];
      return forms[(n - 1) % forms.length];
    });

    // Opponent-mistake lead — "Your opponent erred —" / "slipped —" fire dozens
    // of times a game. Rotate after the first couple so the walk breathes.
    t = t.replace(/\bYour opponent (erred|slipped) — /, (m0: string) => {
      const n = bump('opp-mistake');
      if (n < 2) return m0;
      const forms = ['Your opponent went wrong here — ', 'A misstep from your opponent — ', 'Your opponent faltered — '];
      return forms[(n - 2) % forms.length];
    });

    // "— a target they can keep working on" — the opponent target-fixation tail
    // (fired twice in the 2026-07-24 log: queen/c5, bishop/f2). Vary the tail.
    t = t.replace(/ — a target they can keep working on/, (m0: string) => {
      const n = bump('target-working');
      if (n === 0) return m0;
      const forms = ['', ' — and it stays a target', ' — pressure they can keep leaning on', ' — a weakness that lingers'];
      return forms[n % forms.length];
    });

    // "… — contesting the centre" — the opponent developing-move frame (fired
    // twice: knight to e4, knight to d4/e5). Vary the tail after the first.
    t = t.replace(/ — contesting the (centre|center)/, (m0: string, sp: string) => {
      const n = bump('contesting-centre');
      if (n === 0) return m0;
      const forms = ['', ` — fighting for the ${sp}`, ` — a bid for the ${sp}`, ` — staking the ${sp}`];
      return forms[n % forms.length];
    });

    // "quiet development, getting the pieces coordinated" — the generic dev tag.
    // Rotate so a game full of developing moves doesn't read like a form letter.
    t = t.replace(/quiet development, getting the pieces coordinated/, (m0: string) => {
      const n = bump('quiet-dev');
      if (n === 0) return m0;
      const forms = ['just getting a piece into play', 'a quiet developing move', 'bringing a piece toward the action', 'simple development'];
      return forms[n % forms.length];
    });

    s.narration = t;
  }
}

/** The display name behind the ONE opening key — for a surface that holds a
 *  stored game's key and needs to say the opening. */
export function openingNameForKey(key: OpeningKey | null | undefined): string | null {
  return key ? openingEntryForKey(key)?.name ?? null : null;
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
  /** UNCAPPED full-detail mode (David 2026-07-20). Speaks EVERY computed facet
   *  on EVERY move (full-data aggregator). The house-voice pass DOES run, in
   *  coverAll mode ("voice every fact, drop nothing"), and the coverage /
   *  accuracy / seat / number nets reject any warm that loses a facet — so no
   *  fact is ever compressed away regardless of what the model does. */
  uncapped?: boolean;
  /** The game's opening id / ECO when known — scope the student's need context
   *  (opening results, departures) to this opening (N2). */
  openingId?: OpeningKey | null;
  eco?: string | null;
  /** The game's id — lets the recurrence clause tell this game's own swept
   *  rows from a prior game's (WO-LOOP-01). */
  gameId?: string | null;
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
  // THE STUDENT'S NEED CONTEXT (unified-coach N2) — loaded once per game; cold
  // on any failure (the coach teaches, never mutes). Loaded HERE, before the
  // intro, because the intro now carries the student's RECORD in this opening
  // (A8) — the family count and score off the ONE key, the departure history
  // joined by position — and those live on this context.
  // THE ONE KEY (A1): minted HERE from the game's own moves when the caller
  // holds none — a surface never mints a key of its own.
  const reviewKey = params.openingId !== undefined ? params.openingId : openingKeyFromSans(moves.map((m) => m.san));
  // 🔒 THE PREP RUNS IN PARALLEL WHERE NOTHING DEPENDS ON ORDER (2026-09-23).
  // These four loads, and then the intro phrasing, used to be awaited one after
  // another, so the intro's 18s phrasing race sat at the FRONT of every review
  // before a single segment was built. The student record, the two opening
  // DBs and the weakness signals are independent reads; the intro phrasing
  // needs only the record, so it starts as soon as the record exists and is
  // collected at the end. Same inputs, same outputs — less waiting.
  const prepStart = Date.now();
  const timings: Record<string, number> = {};
  const [studentNeed, , studentWeaknesses] = await Promise.all([
    loadStudentNeedContext({
      rating: playerRating, sans: moves.slice(0, usableCount).map((m) => m.san), studentColor: playerColor,
      openingId: reviewKey, eco: params.eco ?? (reviewKey ? ecoOfKey(reviewKey) : null),
    }).catch(() => coldStudent(playerRating)),
    // Warm the opening-plan grounding sources before the sync segment build:
    // the his-play DB (primary) + the masters DB (backup). Each degrades to
    // null on failure so the beat just falls through.
    Promise.all([getHisPlayDb(), ensureMastersDbLoaded()]),
    // THE STUDENT MODEL (Phase 1) — so a chain the student keeps erring into
    // gets the "this recurs for you, drill it" recap. Memoized once-per-game;
    // degrades to [] (inert) on any failure.
    loadWeaknessSignals().catch(() => []),
  ]);
  timings.loads = Date.now() - prepStart;
  // After the masters DB is warm (the loads above), so the fallback candidates
  // can be read synchronously.
  const refutedStart = Date.now();
  const refutedByPly = await refutedAlternativesForGame(moves.slice(0, usableCount), playerColor)
    .catch(() => new Map<number, RefutedAlternative>());
  timings.refuted = Date.now() - refutedStart;
  const record = reviewOpeningRecord({ openingName, playerColor, studentNeed, gameId: params.gameId ?? null });
  const groundedIntro = defaultIntroText({ playerColor, result, openingName, mistakeCount, record });
  // SPOKEN RAW (prod audit 2026-09-24): the warm pass turned this computed
  // intro into "the facts for the four critical moments weren't included in
  // what I was given" — a model asking for facts, with the wrong count, as the
  // review's first line. The intro is already the house voice; nothing to warm.
  const skipIntroLlm = coachNarration === 'silent';
  const introStart = Date.now();
  const introPromise: Promise<string> = skipIntroLlm
    ? Promise.resolve('')
    : raceTimeout(
        voiceFacts(groundedIntro, { intent: 'review-intro', preferRaw: true }).catch(() => ''),
        REVIEW_INTRO_VOICE_TIMEOUT_MS,
        '',
      ).then((r) => { timings.intro = Date.now() - introStart; return r ?? ''; });

  let phaseStart = Date.now();
  const segments = buildReviewSegments(moves.slice(0, usableCount), playerColor, openingName, uncapped, playerRating, studentWeaknesses, studentNeed, params.gameId ?? null, refutedByPly);
  // FUTURE-POSITION PROJECTIONS (#1 plan realization + #2 consequence projection)
  // — Stockfish-projected teaching, uncapped-diagnostic only (bounded budget +
  // timeout so it never stalls the walk). Runs before the voice pass so the
  // projected facts get spoken in the same register.
  try {
    // Uncapped: all three projection passes. Capped production: the punishment
    // pass only — every review now answers "how does this mistake get taken
    // advantage of?" with the concrete engine line (David 2026-07-21).
    // TIMEOUT-BOUNDED (David 2026-07-24, "Preparing…" stuck): this is the one
    // prep await that was try/catch-only — a try/catch does NOT bound a HANG, so
    // a wedged Stockfish projection could stall the walk forever. Race it; on
    // timeout the segments keep whatever projections already landed (best-effort)
    // and the walk still becomes ready.
    // 🔒 SCOPE IS ALWAYS 'full' — NEVER re-couple it to `uncapped` (G4.5, David
    // 2026-09-16). The inventory RENDERING register was cut; the PROJECTIONS
    // were not. `'mistakes'` scope reinstates three `scope === 'full' ? 999 : 2`
    // budgets (deep threats, opponent deep threats, prophylactic moves), which
    // is exactly the hard cap G4.5 forbids — it would delete the "here's how you
    // take advantage" lines David asked for while looking like a tidy-up.
    // 🔒 A TIMED-OUT PASS MUST NOT KEEP WRITING (walk 5, 2026-09-23). The race
    // bounds the WAIT, not the WORK: a pass that lost the race kept running and
    // appended "[consequence] Follow it up…" onto the very segment objects the
    // walk had already returned — after the tag strip, the past-tense pass and
    // the de-dupe had run — so a raw bracket reached the banner. The pass now
    // works on a COPY; one snapshot is taken the moment the race settles, and
    // whatever lands after that touches nothing the student sees. Partial
    // results that landed in time are kept, exactly as before.
    const work = segments.map((seg) => ({ ...seg }));
    timings.segments = Date.now() - phaseStart;
    phaseStart = Date.now();
    const augTimings: Record<string, number> = {};
    const augWon = await raceTimeout(
      augmentWithProjections(work, playerColor === 'white' ? 'w' : 'b', 'full', playerRating, augTimings).then(() => true),
      REVIEW_AUGMENT_TIMEOUT_MS_UNCAPPED,
      false,
    );
    timings.augment = Date.now() - phaseStart;
    timings.augmentCapped = augWon ? 0 : 1;
    for (const [k, v] of Object.entries(augTimings)) timings[`aug_${k}`] = v;
    work.forEach((w, i) => {
      const snap = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]));
      Object.assign(segments[i], snap);
    });
  } catch { /* projections are best-effort; the walk ships without them */ }

  // SILENT-MIDDLE FILL then STEM VARIETY (David 2026-07-24) — first give quiet
  // developing moves their grounded merit (Danya never goes silent), then
  // dedup/rotate the signature stems the side-by-side caught repeating within a
  // single game. Both pure rephrases; run after every fact is on the segment and
  // before the house-voice warm so the warmer varies from varied input.
  fillConceptBeats(segments, playerColor);
  varyRepeatedStems(segments);
  // POST-GAME REVIEW register (David 2026-07-24) — the walk narrates a game
  // already played, so the actual-move clauses speak in past tense (the
  // hypothetical projection tails + live threats stay present).
  pastTenseReviewNarration(segments);
  // STANDING FACTS TEACH ONCE AND REFER AFTER (David 2026-09-16: "Once a plan
  // is announced we can use common language to readdress it. 'Don't forget
  // about the isolated pawn'"). On his own Alapin, `their pawn on d4 is
  // isolated — a target you can pile on` spoke ELEVEN times, seven of them on
  // consecutive plies about the same pawn: `assessPositionalEdge` is stateless
  // and its two callers — the per-ply [verdict] facet and the projection
  // terminal — never compared notes.
  //
  // Here, and not inside either composer, because the projections are built
  // later over the whole game at once: a ledger in either one would let a
  // projection at ply 12 refer back to a full form that is not spoken until ply
  // 20. Walking the finished segments IN PLY ORDER makes the first mention in
  // READING order the full one, by construction.
  {
    const refrainLedger = emptyRefrainLedger();
    for (const s of [...segments].sort((a, b) => a.ply - b.ply)) {
      if (s.narration) s.narration = foldStandingRefrains(s.narration, refrainLedger);
    }
  }

  // BOOK-GROUNDED DEV TARGETS (David 2026-07-21, IMG_4569: the plan arrow said
  // g1→f3 while the theory lecture's masters data plays Ne2 — two "authorities"
  // contradicting each other. The plan must read from the SAME masters book as
  // the lecture (G0): rewrite any template arrow the book disagrees with and
  // SAY the book's development squares.
  phaseStart = Date.now();
  try {
    await groundOpeningPlanInBook(segments);
  } catch { /* best-effort; the template arrows stand when the book is silent */ }
  timings.book = Date.now() - phaseStart;

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

  // HOUSE-VOICE PASS — the COMPUTER computed and RANKED every board fact above
  // (`buildReviewMoveBriefing`: all important aspects of the move, ordered
  // most-important-first by the eval PV + delta, the "this was the moment" line
  // leading when the decision mattered — chess judgment, G0). Now the LLM VOICES
  // that ranked package in the house teaching register — it decides NOTHING, it
  // only phrases what code handed it (David 2026-09-07: "Make sure the llm gets
  // the computer facts" — reconciled with "compute all the facts, order them in
  // level of importance… state all important aspects of each move"). One batched
  // call through the ONE grounding chokepoint; every warmed line is checked
  // against the ply's own board (board-accuracy / seat / mover / numbers /
  // covers-facets) so a phrasing that dropped or invented a fact is REJECTED and
  // the computed template ships verbatim. Best-effort at prep; skipped on silent.
  // Never a regression. The review's intro / closing / recap FRAMING is warmed
  // separately (free-speak narrative arc). The seat-stamp above (MINE/YOURS) has
  // already handed the house voice the computed possessive on every reference.
  // 🔒 THE COMPUTED PROSE IS THE VOICE — no phrasing model on the review walk
  // (David 2026-09-16: "cut but pass through dna").
  //
  // This used to hand every computed line to a batched LLM rewrite and then
  // defend the result with TEN acceptance conditions — board accuracy, seat,
  // mover, numbers, facet coverage, an introduced-square guard, a proper-noun
  // corruption guard, a verbatim-repeat check, a mate/sacrifice keyword keeper
  // and a punish/advantage frame keeper — any one of which reverted to the
  // template anyway, behind a 38s timeout. G0's own test says a stack of
  // validators means the model is still DECIDING, and the cure is to stop
  // giving it the choice. The chat side already settled this: "the DNA register
  // lives in the computed prose + the general-speak prompt, not a per-answer
  // LLM call" (coachApi, 2026-09-02).
  //
  // So the computed text ships, routed through the ONE chokepoint with
  // `preferRaw` — which short-circuits to `speakableFacts` with no model call,
  // stripping internal headers and notation the ear should never hear. Same
  // register, nothing to validate, no timeout, and a line can no longer be
  // dropped or reworded by a model that never saw the board.
  phaseStart = Date.now();
  if (coachNarration !== 'silent') {
    for (const s of segments) {
      if (!s.narration || s.narration.trim().length === 0) continue;
      try {
        const spoken = await voiceFacts(s.narration, { preferRaw: true, intent: 'review-walk' });
        if (spoken && spoken.trim().length > 0) s.narration = spoken;
      } catch { /* keep the computed template — it is already the voice */ }
    }
  }
  timings.voice = Date.now() - phaseStart;

  // STRIP DIAGNOSTIC [tags] from EVERY spoken line — ALWAYS, not just uncapped
  // (David 2026-09-07 full-game read: the house voice ECHOED a "[converting]"
  // register tag it saw in its own instructions into a capped-mode endgame line).
  // Two sources: a REJECTED uncapped warm keeps its [tag]-prefixed template, and
  // the warmer can leak a bracket it was told about. A bracket never belongs in a
  // spoken line, so scrub it in both modes — the strip preserves all the prose,
  // it only removes the [token] and its trailing space.
  for (const s of segments) {
    if (s.narration && s.narration.includes('[')) {
      // Tags can carry DIGITS ([rook7]) — the old [a-z-]+ class missed those
      // and leaked "[rook7]" into the spoken line (preview audit, 2026-07-22).
      s.narration = s.narration.replace(/\[[a-z0-9-]+\]\s*/gi, '').replace(/\s{2,}/g, ' ').trim();
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
  const throughLine = computeThroughLine(fenChain.map((f) => f.fenAfter), throughLineWB);
  // THE FUNDAMENTALS AGGREGATE (G.4) — "three of your five flagged moves handed
  // over a tempo": the actual lesson, computed from the per-move attributions,
  // spoken raw at the last ply ahead of the through-line.
  const studentSegs = segments.filter((s) => s.playerColor === playerColor);
  const flaggedCount = studentSegs.filter((s) => s.classification === 'inaccuracy' || s.classification === 'mistake' || s.classification === 'blunder' || s.classification === 'miss').length;
  const recap = renderFundamentalsRecap(studentSegs.map((s) => s.fundamentals ?? []), flaggedCount);
  const closing = recap ? (throughLine ? `${recap} ${throughLine}` : recap) : throughLine;

  // Intro: use the phrased response if non-empty and not the ⚠️ error
  // placeholder; else the grounded default. Collected LAST — it was started
  // beside the segment build, so its phrasing race no longer delays the walk.
  const introWaitStart = Date.now();
  const introTrimmed = (await introPromise).trim();
  timings.introWait = Date.now() - introWaitStart;
  const intro = introTrimmed && !introTrimmed.startsWith('⚠️')
    ? introTrimmed
    : defaultIntroText({ playerColor, result, openingName, mistakeCount, record });

  // NEED COVERAGE + THE TEACH METER (WO-TEACH-02 S0) — measured on what the
  // student will actually HEAR, after every fill pass. It used to be taken
  // before the fills, so plies a later pass narrated read as silent and plies
  // it filled with a description read as covered by nothing: the instrument
  // and the tape disagreed (prod 2026-09-24: row 8/12, tape 11/12).
  {
    const heard = (sg: ReviewMoveSegment): boolean => !!(sg.narration ?? '').trim();
    const rows = segments.flatMap((sg) => sg.need
      ? [{ ply: sg.ply, score: sg.need.score, speak: sg.need.speak, prior: sg.need.prior, spoke: sg.narrationSource === 'per-move', heard: heard(sg), teaches: sg.teaches === true, source: sg.narrationSource ?? null }]
      : []);
    const owed = rows.filter((r) => r.speak && r.ply <= OPENING_TEACH_MAX_PLY);
    const covered = owed.filter((r) => r.heard);
    const studentSpoken = segments.filter((sg) => sg.playerColor === playerColor && heard(sg));
    const studentTaught = studentSpoken.filter((sg) => sg.teaches === true);
    void logAppAudit({
      kind: 'review-need-coverage',
      category: 'subsystem',
      source: 'coachFeatureService.generateReviewNarration',
      summary: `need coverage: ${covered.length}/${owed.length} owed opening plies heard; teach meter ${studentTaught.length}/${studentSpoken.length} spoken student plies teach; ${rows.filter((r) => !r.speak).length} silent by need; cold=${studentNeed.gamesPlayed < 5} games=${studentNeed.gamesPlayed}`,
      details: JSON.stringify({ gamesPlayed: studentNeed.gamesPlayed, rows, taught: studentTaught.map((sg) => sg.ply), described: studentSpoken.filter((sg) => sg.teaches !== true).map((sg) => sg.ply) }),
    });
  }

  timings.total = Date.now() - prepStart;
  void logAppAudit({
    kind: 'review-prep-timing',
    category: 'subsystem',
    source: 'coachFeatureService.generateReviewNarration',
    summary: `review prep ${(timings.total / 1000).toFixed(1)}s — augment ${((timings.augment ?? 0) / 1000).toFixed(1)}s, segments ${((timings.segments ?? 0) / 1000).toFixed(1)}s, plies ${segments.length}`,
    details: JSON.stringify({ ...timings, plies: segments.length }),
  });

  return { intro, segments, closing };
}
