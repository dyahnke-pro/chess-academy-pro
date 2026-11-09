import { fadeLevelsFrom, fadeText } from './fadeText';
import { moveIntentsForGame, type ReviewIntent } from './reviewMoveIntent';
import { openSentence, continueSentence } from '../utils/openSentence';
import { tacticGeometryKey } from './conceptKey';
import { reasonFormula } from '../utils/reasonFormula';
import { recordTermForThreat, threatInputFor, threatVisibility, threatVoice } from './learnRecordTerms';
import type { StudentRecord } from './studentRecord';
import { lastMoveFromSan } from './material';
import { Chess } from 'chess.js';
import { gameArcSteps, type ArcEvent } from './lookaheadPlan';
import { fundamentalOfLine, principleAlreadyTaught, type MoveFundamentalId } from './moveFundamentals';
import type { Square } from 'chess.js';
import { legalSeeGainOn } from './positionReadingService';
import { lossBeyondBestAlternative } from './voluntaryLoss';
import { explainBestMoveGrounded, explainMoveOrder, describeMoveMerit, describeSacrifice, seatPieceReferences, describeStudentThreat, detectNewThreat, describeThreatPrevention } from './groundedAnswer';
import { selectTeaching, turnThesis, type SelectorPly } from './teachingSelector';
import { coldStudent, computeNeed, fenKey, type StudentNeedContext, type NeedVerdict } from './needScore';
import { loadStudentNeedContext } from './studentNeedLoader';
import { layerStandings } from './teachingLayers';
import { readConversion, type ConversionStep } from './conversionMethod';
import { characterTurn } from './positionCharacter';
import { readZugzwang, zugzwangProof, zugzwangSentence, type ZugzwangRead } from './zugzwang';
import { phaseTurnsOf } from './phaseTransitionDetector';
import { detectImmediateTactics } from './liveTacticsContext';
import { buildReviewMoveTeaching, buildReviewConversionTeaching, nameEndgamePhase } from './reviewMoveTeaching';
import { plyFactsClause, moveOnlyRestates, computePvLine, pvDepthForRating, afterCapture, NO_PREV_CAPTURE, tacticWord, type PvLine, type PvEngine, type PrevCaptureContext, type MoveScorer } from './pvPlayback';
import { countWord, lineSeatAt, lineShape, withArticle } from '../utils/andList';
import { BRIEFING_LINE_PLIES, buildReviewMoveBriefing } from './reviewMoveBriefing';
import { moveThoughtFacts } from './moveThoughtFacts';
import { composeThought, speaksBehindLead, NOT_LED, type ThoughtStep } from './thoughtComposer';
import { FUNDAMENTAL_IDEA, type IdeaKind } from './ideaKind';
import { explainEvalByPieceQuality, worstPieceMobility, phraseBadPiece, type PieceQualityResult } from './pieceQuality';
import { compareTwoMoves, type Evaluate } from './moveComparison';
import { detectConcept } from './reviewConcepts';
// (removed spokenTacticNote / generalizedTeaching — review no longer voices a
// floating tactic-pattern note; that teaching lives on the tactics drill.)
import { buildMiddlegameOrientation } from './reviewStrategicOrientation';
import { getHisPlayDb } from './hisPlayLookup';
import { ensureMastersDbLoaded, mastersMovesSync, masterMovesCachedSync } from './masterPlayLookup';
import { moveJob, whatItAsks, MINE, THEIRS, JOB_RESTATED_BY_RULE, type BookJobKind, type PriorCapture } from './bookMoveWhy';
import { refutedAlternative, candidatesForPosition, SINGLETON_SCORER, type RefutedAlternative } from './refutedAlternative';
import { loadKnownSlipIndex, type KnownSlipIndex } from './knownSlips';
import { recordedMoveCost } from './moveCost';
import { storedIntentReads } from './moveIntent';
import { findWorstPlacedPiece, planAimKey } from './nextPlans';
import { transferClause, transferMotifOf, recordMotif, withTransfer, motifSaidInstances, type MotifLedger } from './motifLedger';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { detectOpening, detectOpeningByOrder } from './openingDetectionService';
import { detectPieceItineraries } from './reviewPieceItinerary';
import { pickStoryGame } from './reviewStoryGame';
import { sacrificeCompensation, enemyKingStuckInCenter, describeSacBreaksKingShield } from './reviewSacrifice';
import { detectForcedMatingSequence, explainMatingSacMechanism } from './reviewForcedSequence';
import { assessPositionalEdge, verdictBand } from './reviewPositionalAssessment';
import { classifyPhase } from './gamePhaseService';
import { inaccuracySpeaks, loadInaccuracyVoice } from './inaccuracyVoice';
import { foldStandingRefrains, emptyRefrainLedger } from './standingRefrains';
import { renderStructureAtoms } from './structureProse';
import { coachTurn, habitNeedFrom } from './coachDecider';
import { advantageWasMissed } from './reviewWithholding';
import { PLAN_THREAD_HOLD_PLIES, PLAN_THREAD_KINDS } from './planThread';
import { createStoryStore, switchesSaid, storyLedger, storyThrough, threadKey, threadStated, threadVariant, PLAN_GOAL, phaseCrossed, openingAt, openingsNamed, noteOpening, lastVerdict, modelGameCited, storyTurn, type ThreadKey, type StoryStore, type StorySeed, type SaidSet } from './gameStory';
import { boardStateAfter } from './boardState';
import { NO_BOOST, type StudentBoost } from './studentMomentBoost';
import { FUNDAMENTAL_HABIT, habitIsOwed, type MethodHabit } from './methodBeat';
import { noteSlip } from './learnBoardTeaching';
import { readBoard, readBoardAll, readKey } from './boardComputers';
import { replyReadsFromFan, repliesNotWeighed, type ReplyRead } from './ifTheyPlay';
import { proofCut, describeProofResult, type LineProof } from './exchangeLedger';
import { computeMoveFacets, prematureBreakWhy, INFLUENCE_LOOSE_TAIL_RE } from './reviewFullData';
import { mainConceptLine } from './slipDepth';
import { flipSideToMove, sideToMoveAs } from './threatOut';
import { mateStakes, isSacrifice } from './factStakes';
import { sacrificeLedger, type BestAmong, type SacrificeLedgerRead } from './sacrificeLedger';
import { threatPurpose, lineRestatesClaim } from './threatPurpose';
import type { BestOfEngine, DeepReadEngine } from './gameAnalysisService';
import { costReason as readCostReason, costReasonRow, type CostReason, type CostReasonRow, type LineRead } from './costReason';
import { lineTrust, NAME_NEAR_PLIES } from './lineTrust';
import { describeNotableMove, describeConcessions, findTrappedPiece, describeSimplifyingTrade, describeTradeConsequence, buildReviewDeepestLookahead, buildMissedShotSignal } from './reviewTeachingPoints';
import { detectBadHabits } from './badHabitDetector';
import { db } from '../db/schema';
import { voiceFacts } from './coachApi';
// Post-game review narration is now GROUNDED (David 2026-07-09): the intro,
// closing, and recap are COMPUTED from the engine annotations and phrased by
// `voiceFacts` — no coachService.ask / free-LLM prose, no per-move segment
// LLM call (those are deterministic via `buildReviewSegments`).
import { logAppAudit } from './appAuditor';
import { errorWhyFor, recordSecondReads } from './inaccuracyCall';
import { attachCalcLines } from './mistakePuzzleService';
import { betterMoveReason, priorMoveLeadingTo } from './inaccuracyCall';
import { toOtherSeat } from '../utils/seatPronouns';
import { attributePrinciples, pvUciToSan, type PrincipleAttribution } from './principleAttribution';
import { buildCausalChain, causalChainArrows, causalChainKey, findMissedChain, findAllowedChain } from './causalChain';
import { renderCausalChain } from './causalChainVoice';
import { matchFundamental, type WeaknessSignal } from './weaknessSignal';
import { loadWeaknessSignals } from './weaknessSignalLoader';
import { renderFundamentalVerdict, renderPvEvidence, renderFundamentalsRecap, isMethodSentence } from './principleVoice';
import { fundamentalReply, sameReplyAsGrade } from './mistakeTurnLine';
import { resolveCoachNarration } from '../utils/coachNarration';
import type { BadHabit, UserProfile, CoachNarration, OpeningKey, BoardArrow, HeardVerdict, StockfishAnalysis, TacticType, StoredLines, StoredWeighReads } from '../types';
import { admitArrow, admitArrows, type ArrowClaim } from './arrowDoor';
import { lineWins, lineArrows, mateLine } from './lineCalc';
import { pawnEndingTrade, outsidePasserDecoy, spareTempoWasted } from './endgamePawnReads';
import { theirOpeningVerdict, openingAnnouncementForGame, openingNameForBoard } from './openingAnnouncement';
import { bookDeparture } from './bookDeparture';
import { isWaypointOpening, identityFor, planFor } from './openingIdentity';
import { departureRecordSentence, openingRecordClause } from './openingRecordBeat';
import { ecoOfKey, openingEntryForKey, openingFamily, openingKeyFromSans } from './openingKey';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { costWords, describeEvalCp, isMateEval, storedMate, moverGaveUpMate, COST_REASON_DEPTH } from './engineConstants';
import { isContested } from './narrationImportance';
import { mateDescription } from './matePatterns';
import { buildVoicePackage, spokenSentenceKeys, type SpokenLine } from './voicePackage';
import { extractMentionedSans, squaresNamedNotMoves } from './arrowEngine';
import { cutMarksWithWords, markItems } from './markAnchors';
import type { PacedMark } from './markPacing';
import { studentMoveTeaching, namedMoveArrows } from './learnBoardTeaching';
import { FACET_ROLE, type FacetTag } from './reviewFacetRank';
import { stepOf, type ComputerName } from './coachFact';
import { reviewFacet, reworded, type ReviewFacet, type ReviewFacetParts } from './reviewFacet';
import { type Proof } from './proof';
import { newPhraseMemory } from '../utils/phraseMemory';
import { whyItEnded, idlePiece, quietDecider, exploreInvite, murkyRead, type EndRead, type GamePly } from './gameEndReads';
import { positionOf } from '../utils/samePosition';
import { yieldToScreen } from '../utils/yieldToScreen';
import { emitEverything, everythingListening } from './everythingEvents';

// ─── Bad Habit Detection ────────────────────────────────────────────────────

// `detectBadHabits` now lives in the leaf `badHabitDetector` so the coach-chat
// grounding interception in `coachApi` can compute the FRESH habit profile
// without the coachApi↔coachFeatureService import cycle (WO stumbling-block #1).
// Re-exported here so existing consumers (StatsPage, CoachGamePage,
// gameAnalysisService) keep importing it from this module unchanged.

export { advantageWasMissed } from './reviewWithholding';

/** How long a stated plan holds before a different goal may replace it — two
 *  full moves. Damping, not a cap: the new plan is said once it persists. */
export const PLAN_HOLD_PLIES = PLAN_THREAD_HOLD_PLIES;

export { detectBadHabits };

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
const NARRATIVE_SUMMARY_NO_DATA = 'This game is still being analyzed. Tap Full Review for complete analysis.';

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
  // full → every flagged moment (G4.5, 2026-10-20). Drives both the
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
        `On move ${fullMove}, ${m.san} was ${withArticle(m.classification)}${bestSan ? `; the engine preferred ${bestSan}` : ''}${swing}.`,
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

  // BRIEF names one moment — the student's own switch, the one sanctioned cap
  // (G5). FULL names every flagged moment (G4.5: the old 3 dropped the rest;
  // each moment is its own sentence, so a long game reads as a list of them).
  const recapMoments = verbosity === 'brief' ? keyMoments.slice(0, 1) : keyMoments;

  // ONE TEXT, ONE VOICE (walk 2026-09-23: the card STILL rendered "Post-game
  // recap of … (student rated about 1366). The student made 0 blunder(s)" —
  // `voiceFacts` speaks the RAW facts on every one of its failure paths, so a
  // third-person package handed to the model was what the student read
  // whenever the model did not answer, and the `?? spokenFallback` below it
  // never fired). The second-person computed recap is now the only text: the
  // model warms it, and every fallback IS it.
  const spokenFallback = recapSecondPerson({
    outcome: result, playerColor, openingClause,
    blunderCount, mistakeCount, inaccuracyCount, keyMoments: recapMoments, totalErrors,
  });
  // COMPUTED PROSE SPEAKS (2026-10-18): the recap is already second-person
  // spoken prose; no model rewrite between it and the student.
  const voiced = (await voiceFacts(spokenFallback, { intent: `review-recap:${verbosity}`, preferRaw: true })) ?? spokenFallback;
  onStream?.(voiced);
  return voiced;
}


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

// ─── Build Context from Profile ─────────────────────────────────────────────

// ─── Walk-the-game Review Narration (WO-REVIEW-02) ──────────────────────────

/** One move's worth of review narration material. Merged at build time
 *  from the deterministic move data (FEN / classification / best move)
 *  plus the per-ply narration string the LLM returned. A null `narration`
 *  means "this move passes in silence" — the review UI advances the
 *  board but speaks nothing. */
/** EVERY MOVE A REVIEW BEAT NAMES GETS ITS ARROW (David 2026-10-02: "Make
 *  sure all stated moves have arrows"). The beat's text, resolved on the
 *  board the walk shows (after the move), with the board before it for a
 *  "was cleaner" move and a line walked ply by ply — the same resolver Learn
 *  uses, through the arrow door. Computed at display time, so a cached
 *  review gains its arrows without a rebuild. */
/** THE SQUARES THE REVIEW BOARD LIGHTS ON A PLY: the kept facts' own squares
 *  (`keySquares`), and every square the narration names that is not a move —
 *  a move is arrowed (`segmentNamedArrows`). The marks sweep (2026-11-08) found
 *  24 Review sentences naming a square nothing lit, from nine producers (the
 *  better move's reason, the route, "it let you play d5, which attacks their
 *  knight on c6" …); the board reads the words, so no producer can forget. */
export function segmentLitSquares(seg: Pick<ReviewMoveSegment, 'narration' | 'keySquares' | 'fenAfter' | 'fenBefore'>): string[] {
  const out = new Set<string>(seg.keySquares ?? []);
  if (seg.narration) for (const sq of squaresNamedNotMoves(seg.narration, [seg.fenAfter, seg.fenBefore])) out.add(sq);
  return [...out];
}

/** A REVIEW PLY'S MARKS, each anchored to the words that state it (David
 *  2026-11-08: "Key squares get highlights, moves get arrowed, lines get
 *  multiple arrows … and they ALL appear AS THEY ARE STATED"). The squares the
 *  board lights (`segmentLitSquares`); the moves it arrows — the plan arrows,
 *  else the better move on a costly ply, and every move the words name
 *  (`segmentNamedArrows`); the spoken line, its moves in order. The walk shows
 *  each one when the schedule (`markPacing`) reaches its words. */
export interface SegmentMarks {
  highlights: string[];
  arrows: BoardArrow[];
  /** Each line's arrows, its moves in order. */
  lines: BoardArrow[][];
  /** The schedule items (`markItems`), ids `h<i>`, `a<i>`, `l<k>.<i>`. */
  items: PacedMark[];
}

export function segmentMarks(
  seg: Pick<ReviewMoveSegment, 'narration' | 'keySquares' | 'keySquareSaid' | 'fenAfter' | 'fenBefore' | 'planArrows' | 'planArrowsSaid' | 'classification' | 'bestMoveUci' | 'spokenLineArrows' | 'spokenLineSaid'>,
  studentColor: 'white' | 'black',
): SegmentMarks {
  const highlights = segmentLitSquares(seg);
  const named = segmentNamedArrows(seg, studentColor);
  const costly = seg.classification === 'inaccuracy' || seg.classification === 'mistake' || seg.classification === 'blunder';
  // The better move lives on the board BEFORE the move; the walk shows the
  // board AFTER it — the door checks both.
  const better = !seg.planArrows?.length && costly && seg.bestMoveUci && seg.bestMoveUci.length >= 4
    ? admitArrow({ from: seg.bestMoveUci.slice(0, 2), to: seg.bestMoveUci.slice(2, 4), role: 'missed', fen: seg.fenBefore, source: 'review.betterMove' }, { fen: seg.fenAfter, studentColor })
    : null;
  // NO MARKS WITHOUT WORDS (G8.5 rule 3): the better move is drawn only when
  // the beat says it ("f6 was stronger: …"). A costly move whose words teach
  // what it allowed and never name the better move drew it anyway, painted at
  // the turn's end with nothing said (marks sweep, Rac8: their Kg8).
  const betterSaid = better !== null && !!seg.narration && ((): boolean => {
    try {
      const m = new Chess(seg.fenBefore).move({ from: better.startSquare, to: better.endSquare, promotion: seg.bestMoveUci?.[4] as 'q' | undefined });
      const bare = (x: string): string => x.replace(/^…/, '').replace(/[+#?!]/g, '');
      return !!m && extractMentionedSans(seg.narration ?? '').some((x) => bare(x) === bare(m.san));
    } catch { return false; }
  })();
  const base = seg.planArrows?.length ? [...seg.planArrows] : better && betterSaid ? [better] : [];
  const arrows = [...base, ...named.filter((n) => !base.some((b) => b.startSquare === n.startSquare && b.endSquare === n.endSquare))];
  // The spoken line, each ply on the board before it.
  const plies = seg.spokenLineArrows ?? [];
  const drawnPlies = plies.length >= 2
    ? plies.flatMap((a) => {
      if (!a.uci || a.uci.length < 4) return [];
      const drawn = admitArrow({ from: a.uci.slice(0, 2), to: a.uci.slice(2, 4), role: 'line', fen: a.fenBefore, source: 'review.line' }, { fen: a.fenBefore, studentColor });
      return drawn ? [{ ply: a, drawn }] : [];
    })
    : [];
  const lines = drawnPlies.length >= 2 ? [drawnPlies.map((p) => p.drawn)] : [];
  const viewer: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  // A key square carries the sentence of the fact it belongs to — its anchor
  // when the words describe it without naming it ("only four squares").
  const saidOf = new Map<string, string>();
  (seg.keySquares ?? []).forEach((sq, i) => { const said = seg.keySquareSaid?.[i]; if (said && !saidOf.has(sq)) saidOf.set(sq, said); });
  const items = markItems({
    fen: seg.fenAfter,
    viewer,
    highlights: highlights.map((sq) => { const said = saidOf.get(sq); return said ? { square: sq, said } : sq; }),
    // A plan arrow is said with the sentence that shows the plan.
    arrows: arrows.map((a) => {
      const plan = seg.planArrows?.some((p) => p.startSquare === a.startSquare && p.endSquare === a.endSquare);
      return { from: a.startSquare, to: a.endSquare, ...(plan && seg.planArrowsSaid ? { said: seg.planArrowsSaid } : {}) };
    }),
    lines: lines.length ? [{ moves: drawnPlies.map((p) => ({ from: p.ply.uci.slice(0, 2), to: p.ply.uci.slice(2, 4), fen: p.ply.fenBefore })), ...(seg.spokenLineSaid ? { said: seg.spokenLineSaid } : {}) }] : [],
  });
  return { highlights, arrows, lines, items };
}

/** The line a kept fact says, as the walk plays it (`spokenLineArrows`): every
 *  ply from the board it starts on, or nothing when it does not play. A line
 *  whose words name its moves ("you play Bxe4, they answer Nxe4 and you play
 *  Bxb2") comes before a proof the words only conclude from. */
function spokenLineOf(kept: readonly { text?: string; lines?: readonly SpokenLine[] }[]): { spokenLineArrows?: Array<{ uci: string; fenBefore: string; fenAfter: string }>; spokenLineSaid?: string } {
  const unmark = (san: string): string => san.replace(/^…/, '').replace(/[+#?!]/g, '');
  const named = (f: { text?: string; lines?: readonly SpokenLine[] }): number => {
    const line = f.lines?.find((l) => l.sans.length >= 2);
    if (!line || !f.text) return 0;
    const said = new Set(extractMentionedSans(f.text).map(unmark));
    return line.sans.filter((san) => said.has(unmark(san))).length;
  };
  const ordered = [...kept].sort((a, b) => named(b) - named(a));
  for (const f of ordered) {
    const line = f.lines?.find((l) => l.sans.length >= 2);
    if (!line) continue;
    try {
      const c = new Chess(line.fen);
      const arrows: Array<{ uci: string; fenBefore: string; fenAfter: string }> = [];
      for (const san of line.sans) {
        const fenBefore = c.fen();
        const m = c.move(san);
        arrows.push({ uci: `${m.from}${m.to}${m.promotion ?? ''}`, fenBefore, fenAfter: c.fen() });
      }
      if (arrows.length >= 2) return { spokenLineArrows: arrows, ...(f.text ? { spokenLineSaid: f.text } : {}) };
    } catch { /* a line that does not play draws nothing */ }
  }
  return {};
}

export function segmentNamedArrows(
  seg: Pick<ReviewMoveSegment, 'narration' | 'fenAfter' | 'fenBefore'>,
  studentColor: 'white' | 'black',
): BoardArrow[] {
  if (!seg.narration) return [];
  const claims = namedMoveArrows(seg.narration, seg.fenAfter, studentColor === 'white' ? 'w' : 'b', seg.fenBefore);
  return admitArrows(claims, { fen: seg.fenAfter, studentColor }).arrows;
}

/** The say-once keys of the known slips the walk has said (the registry's
 *  `knownSlip` read, filed under `hint:` by the facet door). */
const KNOWN_SLIP_HINT = 'hint:known-slip:';

/** REVIEW'S SAY-ONCE MEMORIES IN THE STORY (WO-STORY-MATRIX-01 P1-8d): each
 *  ledger the walk keeps is the game story's one claim map under its own
 *  prefix (`storyLedger`) — the prefixes the seeded key list used, so one
 *  vocabulary names a memory in the story, a checkpoint and a test. */
const REVIEW_SAID = {
  hint: 'h:', formula: 'f:', refuted: 'r:', principle: 'p:', loose: 'l:', motif: 'm:',
  fundamental: 'fu:', conversionStep: 'cv:', decoy: 'dc:', trapped: 'tr:', threat: 'th:', lastHere: 'rc:',
  deepShot: 'ds:', signal: 'sg:', staticFacet: 'sf:', standing: 'ss:', sac: 'sc:', verdictReason: 'vr:',
  thought: 'tk:', structAtom: 'sa:', oneShot: 'os:', oppTarget: 'ot:', flag: 'g:', refrain: 'rf:',
  /** The opening story's lines told — a job one of them claimed is not said
   *  again when the move lands (no seed carried them before 8d). */
  storyLine: 'st:',
  /** The method habits taught, once a game each (no seed carried them before 8d). */
  habit: 'hb:',
} as const;

/** The walk's once-a-game beats, each a flag in the story (`REVIEW_SAID.flag`). */
type ReviewFlag = 'orientationShown' | 'assessmentShown' | 'psychologyReadDone' | 'opponentDevReadShown'
  | 'sacCompShown' | 'kingCenterTaught' | 'tradeIdeaSpoken';

/** THE STANDING REFRAINS, folded over finished segments IN PLY ORDER (the
 *  first mention in reading order is the full one). Each refrain's full form
 *  said enters the game's story (its `rf:` claim, at the ply that said it), and
 *  a seed — what a walk already SPOKE — starts the fold at `throughPly + 1`
 *  from the refrains in the story, so a rebuild (the deep-dive swap, a
 *  free-board move) never says a refrain in full twice. Before the seed the
 *  build's own plies fold on a ledger of their own: they are the walk's past,
 *  which the walk keeps, and nothing they say enters the story. */
export function foldReviewRefrains(segments: ReviewMoveSegment[], story: StoryStore, seed: StorySeed | null): void {
  const said = storyLedger(story, REVIEW_SAID.refrain);
  let ledger = seed ? emptyRefrainLedger() : new Set<string>(said);
  let onStory = !seed;
  for (const s of [...segments].sort((a, b) => a.ply - b.ply)) {
    if (seed && !onStory && s.ply > seed.throughPly) {
      onStory = true;
      ledger = new Set<string>(said);
    }
    if (!s.narration) continue;
    const before = new Set(ledger);
    s.narration = foldStandingRefrains(s.narration, ledger);
    if (!onStory) continue;
    const added = [...ledger].filter((x) => !before.has(x)).map((x) => `${REVIEW_SAID.refrain}${x}`);
    if (added.length > 0) story.commit(s.ply, { claims: added });
  }
}

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
  /** The reason the verdict gave for the better move, as spoken — so the
   *  better-line pass can replace it with the reason read off its own, fresher
   *  line of the same ply (one ply, one line). */
  verdictReason?: string;
  /** The verdict already played the punishing line out — the advantage /
   *  punishment pass must not say it a second time. */
  verdictPlayedLine?: boolean;
  /** The punishing reply the verdict NAMED ("starting with Qg5+") — a later
   *  sentence about the same punishment must name the same move. */
  verdictPunishSan?: string;
  /** THE HABIT THAT CLOSES THE TURN, held until the turn's last step is in
   *  (WO-ONE-COACH-01: the move, the choices, not yet, the line played out,
   *  then the habit that finds it next time). The projections add the line
   *  after the walk builds the move, so the habit waits here and
   *  `closeReviewTurns` says it last. Absent once the turn is closed. */
  habitTail?: string;
  /** THE PROOFS OF WHAT THIS PLY SAID (one-coach P3) — the door's own
   *  `proofOf`, in spoken order. Why reads these first, so the student hears
   *  the proof of the claim the coach just made, the same way Learn does. */
  proofs?: Proof[];
  /** Why no fundamental attached to this flagged student ply — the attributor's
   *  own reasons, stated when the ply is spoken (see buildReviewSegments). */
  fundamentalDeclined?: string[];
  /** WO-TEACH-02 meter: a TEACHING fact spoke on this ply (the decider's own
   *  `teaches`). Undefined on plies no decision voiced — a fill that writes
   *  narration afterwards is, by definition, not the door teaching. */
  teaches?: boolean;
  /** N2 — the student's computed NEED for teaching at this ply (student plies
   *  only). The quiet per-move opening beat speaks only when `need.speak`;
   *  flags / plan one-shots / moments speak on their own importance. */
  need?: NeedVerdict;
  /** The ply where the conversion was first TAUGHT (the plan or the method),
   *  so the later concept fill hears the claim as already made. */
  convertTaught?: true;
  /** A silent student ply whose only lesson — this opening principle — was
   *  already taught earlier in the game (say-once). Read by need coverage. */
  principleTaughtEarlier?: string;
  /** Sentences about the move NOT played (the better move's reason). The
   *  past-tense pass leaves these alone — a counterfactual is never history. */
  counterfactual?: string[];
  /** The punishing replies this ply already named, by their first move (bare
   *  SAN) — a later line opening with one of them is the same claim. */
  blowsSaid?: string[];
  /** The reason the student's mistake or blunder got: allowed / missed (said
   *  on the ply), positional (no material in the engine's lines — the cost is
   *  positional), held (a reason past two moves no second read confirmed — the
   *  cost stands, the line is not taught), withheld (the punishment is the
   *  student's own next find), or none (WO-DECIDER-02 decision row). */
  costReason?: 'allowed' | 'missed' | 'positional' | 'held' | 'withheld' | 'none';
  /** THE RECORD'S OWN LINES for a costly move — the board after it (their
   *  reply first) and the best line from before it. A second read of the same
   *  boards for the cost reason's deep read (`lineTrust`). */
  recordReplyLine?: string[];
  recordBestLine?: string[];
  /** Each record line's own second read (the same search two depths
   *  shallower, `pv.earlierPlayed` / `pv.earlierBest`) — absent on a record
   *  analysed before 2026-10-28. */
  recordReplyEarlier?: string[];
  recordBestEarlier?: string[];
  /** The student's missed win three or more moves out, named on the naming
   *  rule — saved onto the move's mistake puzzle for Calculation
   *  (`attachCalcLines`). */
  calcLine?: { uci: string[]; blowPlies: number; why: 'agreed' | 'forcing-agreed' | 'verified' };
  /** The ONE cost reason (`costReason`), both seats, as the decision row
   *  carries it — so an audit holds the two seats to the same depth. */
  reasonRow?: CostReasonRow;
  /** A silent ply whose move only restates the board — a capture or check
   *  with no consequence (the quiet-move rule, WO-DECIDER-02). Read by need
   *  coverage, so that silence is counted apart from a ply nothing taught. */
  quietRestates?: true;
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
  /** Arrow-door output only (`arrowDoor`). */
  planArrows?: BoardArrow[];
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
  /** The sentence that says the spoken line (its anchor on the mark schedule). */
  spokenLineSaid?: string;
  /** The sentence that says what the plan arrows show (their anchor). */
  planArrowsSaid?: string;
  /** KEY SQUARES this ply's narration NAMED (trapped piece + its attacker, a
   *  passed pawn, a minority-attack target, colour-complex holes) — coupled from
   *  the fact-computer's OWN squares, never scraped from prose (G0). The review
   *  board paints these yellow while this segment is active so the eye lands on
   *  the square as the coach names it (David 2026-09-13 "add highlights to all
   *  spoken key squares"). Undefined when the ply named no clean square. */
  keySquares?: readonly string[];
  /** The sentence of the spoken fact each key square belongs to (its anchor
   *  on the mark schedule), parallel to `keySquares`. */
  keySquareSaid?: readonly string[];
  /** THE SQUARES OF EACH CLAIM THIS PLY SPOKE — every spoken fact's coupled
   *  squares, from the computers' own squares, never scraped from prose. A
   *  later pass that adds a line (the deep threat) reads these to tell a claim
   *  the ply already made from a new one (`lineRestatesClaim`). */
  spokenSquares?: ReadonlyArray<readonly string[]>;
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
  /** The club gem index could not be read for this build, so its known
   *  mistakes and traps are not in it — never stored: the next open builds
   *  again with them (a line is never dropped for a file that did not load). */
  knownSlipsMissing?: boolean;
  /** THE GAME'S STORY (WO-STORY-MATRIX-01 P1-8d): everything the walk says,
   *  each at the ply it says it — its claims, sentences, plans, events and
   *  flags — as one checkpoint (`StoryStore.serialize`). What a walk had said
   *  through ply k is this taken back to k (`storyThrough`); null when the
   *  build said nothing. Cached with the narration. */
  story: string | null;
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
  pv?: StoredLines;
  /** One-search move cost (MoveAnnotation.costCp) — read through `recordedMoveCost`. */
  costCp?: number;
  /** The live grade the student heard, when the deeper read differs (MoveAnnotation.heardVerdict). */
  heardVerdict?: HeardVerdict;
  /** The best move's eval FROM THE SAME SEARCH as `costCp` (MoveAnnotation.
   *  bestMoveEval) — the pair a cost is measured against. */
  bestMoveEval?: number;
  /** One read per candidate a player weighs (MoveAnnotation.weighed). */
  weighed?: StoredWeighReads;
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
 * could ever see the fundamental: the decider matched the coarse positional
 * bucket and ranked the moment on some unrelated structural note.
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
        // The Review walk says no opening theory (David 2026-11-06): the
        // departure from the book is the Theory button's.
        theory: false,
        historySans: sansForRun.slice(0, m.ply),
        bestSan: bestMoveSan,
        replySan: sansForRun[m.ply] ?? null,
        classification: m.classification,
        pvAfterPlayed: m.pv?.afterPlayed?.length ? pvUciToSan(fenPair.fenAfter, m.pv.afterPlayed) : undefined,
        pvAfterBest: m.pv?.afterBest?.length && bestMoveSan
          ? pvUciToSan((() => { const c = new Chess(fenPair.fenBefore); try { c.move(bestMoveSan); } catch { return fenPair.fenBefore; } return c.fen(); })(), m.pv.afterBest)
          : undefined,
        // Persisted engine eval, normalised to the MOVER's POV (stored
        // white-POV) — powers the eval/PV-gated detectors (overvalued attack,
        // poisoned pawn, botched conversion). Absent on games analysed before
        // the fix.
        // ONE MOVE, ONE COST, ONE SEARCH (clean-pass review walk 2026-10-04:
        // G2 27…Rfe8 "throws away about 2 points" beside "costing about 1.0",
        // and G1 29.Bxd5 "throws away a winning position" at +6.58 — the
        // shallow read before minus a cost from another search). With a
        // one-search cost, both sides come from that search: its best eval,
        // and that less the cost. Otherwise the two reads the ply has.
        ...(() => {
          const sign = moverColor === 'white' ? 1 : -1;
          if (typeof m.costCp === 'number' && typeof m.bestMoveEval === 'number' && !isMateEval(m.bestMoveEval)) {
            return { evalBefore: m.bestMoveEval * sign, evalAfterPlayed: m.bestMoveEval * sign - m.costCp };
          }
          return {
            evalBefore: typeof m.preMoveEval === 'number' ? m.preMoveEval * sign : undefined,
            evalAfterPlayed: typeof m.evaluation === 'number' ? m.evaluation * sign : undefined,
          };
        })(),
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
/** The motifs a cost reason names aloud (`motifBit`). A hanging piece, a
 *  promotion and a mate say themselves in the line's result. */
const SAID_MOTIFS: ReadonlySet<TacticType> = new Set<TacticType>([
  'fork', 'pin', 'skewer', 'discovered_attack', 'discovered_check', 'double_check', 'back_rank', 'deflection',
  'removing_the_guard', 'trapped_piece', 'overloaded_piece', 'x_ray', 'zwischenzug', 'interference', 'clearance',
]);

/** The record's own lines for a costly move (`ReviewMoveSegment.recordReplyLine`). */
function recordLinesOf(m: { bestMove: string | null; pv?: StoredLines }): { recordReplyLine?: string[]; recordBestLine?: string[]; recordReplyEarlier?: string[]; recordBestEarlier?: string[] } {
  return {
    ...(m.pv?.afterPlayed?.length ? { recordReplyLine: [...m.pv.afterPlayed] } : {}),
    ...(m.bestMove ? { recordBestLine: [m.bestMove, ...(m.pv?.afterBest ?? [])] } : {}),
    ...(m.pv?.afterPlayed?.length && m.pv.earlierPlayed?.length ? { recordReplyEarlier: [...m.pv.earlierPlayed] } : {}),
    ...(m.bestMove && m.pv?.earlierBest?.length ? { recordBestEarlier: [...m.pv.earlierBest] } : {}),
  };
}

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

    const evalSwingCp = typeof m.costCp === 'number' ? m.costCp
      : m.preMoveEval !== null && m.evaluation !== null
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
      ? betterMoveReason(fenBefore, m.san, suggestedSan, [m.bestMove, ...(m.pv?.afterBest ?? [])], isWhiteMove ? 'white' : 'black',
        priorMoveLeadingTo(i > 0 ? { fenBefore: chain[i - 1].fenBefore, san: moves[i - 1].san } : null, fenBefore),
        moverGaveUpMate(m.preMoveEval, m.evaluation, isWhiteMove ? 'white' : 'black'))
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
    const failed = errorWhyFor({
      // The record's own second read rides with its line (`pv.earlierPlayed`).
      secondReads: recordSecondReads(m.pv), costCp: m.costCp ?? null,
      fenBefore,
      playedSan: m.san,
      moverColor: isWhiteMove ? 'white' : 'black',
      replyLineUci: m.pv?.afterPlayed ?? null,
      quality: m.classification,
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
  /** One-search move cost (MoveAnnotation.costCp); null on older annotations. */
  costCp: number | null;
  /** Board BEFORE the move + the move played + the mover's colour — so a
   *  strong/brilliant move can be explained by WHAT IT DID on the board
   *  (David 2026-07-10: no more "Strong, accurate move" filler). */
  fenBefore: string;
  playedSan: string;
  moverColor: 'white' | 'black';
  /** The previous move's capture — a recapture is never a win (see describeMoveMerit). */
  prevCapture: PrevCaptureContext | null;
}): string | null {
  const { ply, isStudentMove, classification, bestMoveSan, preMoveEval, evaluation, costCp, fenBefore, playedSan, moverColor, prevCapture } = params;
  if (classification === null || classification === 'book' || classification === 'good') {
    return null;
  }

  const variant = ply % 3;

  // WHY the move is bad, when we can PROVE it (a premature central break while
  // behind in development). Danya leads the mistake with the positional reason,
  // THEN names the better move — so we prepend it to the negative-class stems.
  // Grounded + gated (never overstated); null when it doesn't genuinely apply.
  const whyBad = (classification === 'inaccuracy' || classification === 'mistake' || classification === 'blunder')
    ? prematureBreakWhy(fenBefore, playedSan, isStudentMove ? 'student' : 'opponent')
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
  const studentEvalWord = evalBand === null || evalBand === 'slightly worse' || evalBand === 'clearly worse' || evalBand === 'losing'
    ? null
    : evalBand === 'balanced' ? 'the position stays balanced' : `you're ${evalBand}`;

  // Swing magnitude in pawns (positive = how much the moving side
  // conceded). Both evals are centipawns, white POV; the absolute
  // difference is the swing regardless of moving side because the
  // classification flags the bad direction.
  const swingPawns = costCp !== null ? costCp / 100
    : preMoveEval !== null && evaluation !== null
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
        ? ` That drops ${costWords(swingPawns * 100)}.`
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
        'That was the move — the game turned on it.',
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
    const concrete = buildReviewMoveTeaching(fenBefore, playedSan, true);
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
/** The reply tree's reads (`ifTheyPlay`): the depth (the human model was fitted
 *  on depth-10 reads), the first ply read, the eval past which a board is
 *  decided and no branch is worth saying, and how long into the augment the
 *  walk waits for them (the reads are scheduled last on the pool). */
const REPLY_TREE_DEPTH = 10;
const REPLY_TREE_FIRST_PLY = 4;
const REPLY_TREE_DECIDED_CP = 400;
const REPLY_TREE_WAIT_MS = 30000;
/** When each singleton-chain composer stops WAITING (ms from the start of the
 *  projection passes) and reads what has landed. The chain runs one 7s search
 *  at a time; on a long game it used to hold the deep-threat passes behind it
 *  until the 75s cap fired, so every deep line vanished at once (narration
 *  unification step 6). The deep passes read the POOL, so they need only the
 *  wait bounded; the chain keeps working, and anything it finishes later is
 *  simply not read. Not a cap on teaching: a better-line or confirmation that
 *  has not landed by then would have been cut by the overall cap anyway. */
const SINGLETON_STAGE_MS = { better: 35000, confirm: 45000 } as const;

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
    return `Your opponent's move — ${continueSentence(rest)}`;
  }
  // Verb-first observation ("Stakes a claim…", "Opens the f-file…") — already
  // 3rd-person-singular, so "Your opponent " + the verb reads correctly.
  return `Your opponent ${continueSentence(s)}`;
}

/** A line the student has played this many times without leaving book is
 *  proven: the story says what the opening is and stops there. */
export const STORY_PROVEN_GAMES = 5;
/** A move is book here when masters played it at least this often. */
/** The briefing aspects Review says through its own producers — the threat
 *  ([threat]), the tactic ([tactic]), the trade and the material ([trade]),
 *  the outpost (the plan arc's arrival, the outpost rule) and the passed pawn
 *  ([passer], the passer plan) — so the move's thought from the one composer
 *  leaves them to those lines (one claim, one producer; Review prod audit
 *  2026-10-30: Nd5 "plants an outpost on d5" beside "There it is — your knight
 *  on d5. That was your plan: the outpost on d5"). */
const REVIEW_OWNS_IDEA: ReadonlySet<IdeaKind> = new Set<IdeaKind>(['threat', 'mate', 'tactic', 'win-material', 'trade', 'recapture', 'outpost', 'passed-pawn']);
/** The idea a teaching-move facet on this move teaches that the composer's
 *  briefing also reads — said by the facet with what it is for, so the move's
 *  composed thought leaves that idea to it, as it leaves a [rule]'s principle
 *  (`ruleIdeas`): the pawn break says the file its trade opens ("…cxb4 is a
 *  pawn break: … opens the c-file for your rooks" was followed by "It also
 *  opens the c-file"). */
const FACET_TEACHES_IDEA: Partial<Record<FacetTag, IdeaKind>> = { 'pawn-break': 'file' };
/** …and the readers that reach Review under a generic tag (`rule`) but teach
 *  one idea of the composer's: the king attack's "one of the pawns in front of
 *  their king is gone — the cover is coming apart" is the briefing's "prises
 *  open their king's cover" (prod Review audit 2026-11-08, Carlsen–Caruana
 *  34.gxf7+: both on one move). */
const COMPUTER_TEACHES_IDEA: Partial<Record<ComputerName, IdeaKind>> = { kingAttack: 'attack-king' };
const BOOK_JOB_MIN_GAMES = 20;
/** The description and teaching lanes whose reason formula speaks once a game
 *  (`reasonFormula`); the verdict lanes are per-move facts and repeat. */
const FORMULA_ONCE: ReadonlySet<string> = new Set<FacetTag>([
  'point', 'judgement', 'delta', 'does', 'opp-target', 'defence-idea', 'trade-idea',
  'their-cost', 'their-read', 'rule', 'nugget', 'loose', 'bluff', 'plan-arc', 'timing',
  // The kinds filed under `timing` and `rule` until each had its own.
  'move-order', 'rule-exception', 'false-alarm', 'push-or-hold',
  // Their idea's one condition, said once a game as their move's read was.
  'their-trigger',
  // The teaching moves' new computers: one formula, once a game — a second
  // break with the same reason on a new board is the same lesson again.
  'pawn-break',
]);

/** THE STUDENT-MOVE BUNDLE'S RULES Review says itself: the rule kept or
 *  broken for a reason and the false alarm (`studentMoveTeaching`, each under
 *  its own teaching-move kind since 2026-11-05); the bundle's other lanes
 *  Review says through its own producers. */
const BUNDLE_RULE_KINDS = ['rule', 'rule-exception', 'false-alarm', 'push-or-hold'] as const satisfies readonly FacetTag[];
function isBundleRuleKind(kind: string): kind is (typeof BUNDLE_RULE_KINDS)[number] {
  return (BUNDLE_RULE_KINDS as readonly string[]).includes(kind);
}

/** The rule a `[rule]` facet states, from its say-once identity (`rule:<line
 *  id>` the first time, `rule-stem:<ply>:<line id>` after). Null for any other
 *  facet. */
function ruleIdOf(identity: string | undefined): MoveFundamentalId | null {
  const id = /^rule(?:-stem:\d+)?:(.+)$/.exec(identity ?? '')?.[1];
  return id ? fundamentalOfLine(id) : null;
}

/** Whether a `[rule]` facet on this move states the job's claim — the rule's
 *  fundamental is one `JOB_RESTATED_BY_RULE` names for the job's kind, and it
 *  names the square the claim is about. */
function restatedByRule(
  job: { kind: BookJobKind; squares: readonly string[] },
  facets: readonly ReviewFacet[],
): boolean {
  const join = JOB_RESTATED_BY_RULE[job.kind];
  if (!join) return false;
  const about = join.about === null ? null : job.squares[join.about] ?? null;
  if (join.about !== null && !about) return false;
  return facets.some((f) => {
    const rule = ruleIdOf(f.identity);
    return !!rule && join.rules.includes(rule) && (about === null || f.squares.includes(about));
  });
}

/** Which computer reads each end-of-game fact (`gameEndReads`). */
const END_READ_COMPUTER: Record<EndRead['kind'], ComputerName> = {
  'why-it-ended': 'whyItEnded',
  'idle-piece': 'idlePiece',
  'quiet-decider': 'quietDecider',
  explore: 'exploreInvite',
  murky: 'murkyRead',
};

/** The loose piece a board-influence line names — a claim of its own (the
 *  loose count below reads it), so the line is never stripped as a
 *  restatement of the move's attack. Read off the claim its producer
 *  coupled (`loose:<square>`), never off the words: since 2026-11-05 a piece
 *  is said "their bishop", its square lit and not read out. */
function looseSquareOf(f: ReviewFacet): string | null {
  return f.claims?.find((c) => c.startsWith('loose:'))?.slice('loose:'.length) ?? null;
}

/** The review's per-move segments, built in one pass — the test seam. The
 *  app builds with `buildReviewSegmentsYielding`, which keeps the screen.
 *  Every move's turn is closed (its habit said last). */
export function buildReviewSegmentsForTests(...args: Parameters<typeof reviewSegmentSteps>): ReviewMoveSegment[] {
  const steps = reviewSegmentSteps(...args);
  for (;;) {
    const step = steps.next();
    if (step.done) { closeReviewTurns(step.value); return step.value; }
  }
}

/** THE HABIT CLOSES THE TURN (WO-ONE-COACH-01): each move's held habit is
 *  said after everything else on the move — the line played out included. Run
 *  once the turn's last step is in: on the walk after the projections
 *  (`generateReviewNarration`), and by the builders where nothing is added. */
function closeReviewTurns(segments: ReviewMoveSegment[]): void {
  for (const s of segments) {
    if (!s.habitTail) continue;
    s.narration = s.narration ? `${s.narration} ${s.habitTail}` : s.habitTail;
    delete s.habitTail;
  }
}

/** The same build, handing the screen back after every move. Built in one
 *  task, a whole game held the screen 20–36 s after Start while the walk
 *  waited to speak (Review freeze, 2026-10-21). Same output, move for move.
 *  Each turn's habit is still held (`habitTail`): the walk closes the turns
 *  once its projections are in. */
async function buildReviewSegmentsOpen(...args: Parameters<typeof reviewSegmentSteps>): Promise<ReviewMoveSegment[]> {
  const steps = reviewSegmentSteps(...args);
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
    await yieldToScreen();
  }
}

/** The stepped build with every turn closed — for a caller that adds no line
 *  after it (the free board's explored move). */
export async function buildReviewSegmentsYielding(...args: Parameters<typeof reviewSegmentSteps>): Promise<ReviewMoveSegment[]> {
  const segments = await buildReviewSegmentsOpen(...args);
  closeReviewTurns(segments);
  return segments;
}

/** The build itself, one move per step: it pauses (`yield`) before each move
 *  and after each move's end-of-game read, so a caller can let the screen run
 *  in between. Nothing outside it changes while it is paused. */
function* reviewSegmentSteps(
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
  /** What each clean student move was FOR, from the engine lines the review
   *  read-ahead stored (`moveIntentsForGame`) — computed by the async caller. */
  intentByPly: ReadonlyMap<number, ReviewIntent> = new Map(),
  /** WHAT THE STUDENT ALREADY HEARD (review noise walk 2026-10-20). When the
   *  walk is partway through and a newer build replaces the plies ahead, the
   *  story past `throughPly` starts from what was SPOKEN on the plies walked —
   *  the walk's own story taken back to them (`storyThrough`), every claim,
   *  flag, plan and event — not from this build's own guess at them, or a line
   *  said before the swap is said again after it. */
  spokenBefore: StorySeed | null = null,
  /** THE GAME'S STORY (WO-STORY-MATRIX-01 P1-8b–d) — the build's whole memory
   *  of what it has said, renewed for this game when the build starts. The
   *  caller that keeps the narration passes its own store and serializes it
   *  into `ReviewNarration.story` once the walk's last pass (the refrain fold)
   *  has said its piece; both production callers pass one, so only the unit
   *  tests rely on the default. */
  story: StoryStore = createStoryStore(currentGameId ?? 'review'),
  /** ZUGZWANG on the board after each ply, read off the tablebase by the async
   *  caller (≤7 pieces; `zugzwangsForGame`) — engine-free and exact. Absent =
   *  no tablebase read (the free board's rebuild, the unit tests). */
  zugzwangByPly: ReadonlyMap<number, ZugzwangRead> = new Map(),
  /** THE CLUB GEM INDEX (David 2026-11-04: known mistakes and traps "in
   *  review for sure") — loaded by the async caller before this synchronous
   *  build (`loadKnownSlipIndex`), so no known slip is dropped for a file still
   *  loading. Null: no index in hand (the unit tests; offline with no copy). */
  knownSlipIndex: KnownSlipIndex | null = null,
): Generator<void, ReviewMoveSegment[], void> {
  story.newGame(currentGameId ?? 'review');
  // Curated, opening-specific ideas for the dev-plan beat (null → uncurated).
  // The repertoire's ideas are written for ONE colour — only the student's seat reads them.
  // WHERE THIS STUDENT STANDS PER TEACHING LAYER (WO-LAYERS-01), once per
  // review — the same record every ply of the walk is judged against.
  const layers = layerStandings(studentWeaknesses ?? [], studentNeed?.capabilities);
  // The fade per skill, from the same record (one rule with Learn).
  const fade = fadeLevelsFrom(studentNeed?.heat);
  // The record the threat voice reads (the same shape Learn's door reads).
  const reviewRecord: StudentRecord = { weaknesses: studentWeaknesses ?? [], capabilities: studentNeed?.capabilities ?? null, heat: studentNeed?.heat ?? new Map() };
  // Package-completion once-per-game beats (David 2026-07-24: "complete the
  // package"): the simplify-when-ahead trade idea fires at most once (the
  // `tradeIdeaSpoken` flag in the story — no seed carried it before 8d).
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
  /** Each side's plan FOLLOWED across the game (planArc): where it took shape,
   *  where it landed, where it was given up — read off the moves actually
   *  played. The per-ply plan facets forget themselves every move; this is the
   *  thread between them. */
  const arcByIndex = playerColor === 'white' || playerColor === 'black'
    ? (yield* gameArcSteps(sansForRun, playerColor))
    : new Map<number, ArcEvent[]>();
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
  // RANKER needs. Review's `coachTurn()` then passed no `momentBoost` at all, so
  // on the surface where diagnosis happens a student's own recorded holes could
  // not raise a single moment: the weaknesses were loaded, used to ORDER facts,
  // and ignored by the computer that decides how much a moment is worth saying.
  // The game's plies as the game-level readers take them (the selector, the
  // turning point): the move, its boards and its evals, and the fundamental the
  // attributor proved on it.
  const selectorPlies: SelectorPly[] = moves.slice(0, usable).map((mv, i) => ({
    ply: mv.ply, san: mv.san, fenBefore: fenChain[i].fenBefore, fenAfter: fenChain[i].fenAfter,
    playerColor: mv.ply % 2 === 1 ? 'white' as const : 'black' as const,
    evalBefore: mv.preMoveEval, evalAfter: mv.evaluation, classification: mv.classification,
    // THE TIE: the fundamental the attributor proved on this ply, the
    // same one the narration will speak. `matchFundamental` joins it
    // to the student's own `fundamental:<id>` rows — the very rows the
    // Fundamentals tab counts — so the heat map the student SEES and
    // the need the decider COMPUTES are one number.
    fundamentalId: attrByPly.get(mv.ply)?.fundamentals[0]?.id ?? null,
  }));
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
            plies: selectorPlies,
            studentColor: playerColor, rating, kind: 'game', surface: 'review', student: studentNeed,
          });
        } catch { return { needByPly: new Map<number, NeedVerdict>(), boostByPly: new Map<number, StudentBoost>() }; }
      })()
    : { needByPly: new Map<number, NeedVerdict>(), boostByPly: new Map<number, StudentBoost>() };
  const needByPly = selectorPkg.needByPly;
  const boostByPly = selectorPkg.boostByPly;
  // THE WALK'S SAY-ONCE MEMORIES ARE THE STORY'S (WO-STORY-MATRIX-01 P1-8d):
  // each is the one claim map under its own prefix (`REVIEW_SAID`), said at
  // the ply the story is at — so the checkpoint, a seed and the walk's own
  // past are one state, never a key list stamped beside it.
  const ledger = <K extends string = string>(prefix: string): SaidSet<K> => storyLedger<K>(story, prefix);
  /** The walk's once-a-game beats (`ReviewFlag`). */
  const flags = ledger<ReviewFlag>(REVIEW_SAID.flag);
  /** Fundamentals already spoken in full this game — repeats get the short stem. */
  const seenFundamentals = ledger<import('./principleAttribution').FundamentalId>(REVIEW_SAID.fundamental);
  const seenConversionSteps = ledger<ConversionStep>(REVIEW_SAID.conversionStep);
  /** Outside-passer decoys already said this review (one per passer file). */
  const seenDecoys = ledger(REVIEW_SAID.decoy);
  /** S6 transfer: tactic motif → the move it was first SPOKEN this game — a
   *  reading of the motif keys below, rebuilt from them when a seed replaces
   *  the story (`motifLedgerOf`). */
  let motifLastSpoken: MotifLedger = new Map();
  /** The motifs spoken, as keys (`<motif>|<move>|<instance>`). */
  const motifKeys = ledger(REVIEW_SAID.motif);
  /** S2: opening principles SPOKEN this game — committed after the door. The
   *  ply each was first said is the story's (the coverage marker reads it). */
  const principlesTaught = ledger(REVIEW_SAID.principle);
  // The plies the grader called sound — the habit reader never counts one as
  // "a piece left loose" (a sacrifice that holds).
  const FAULT = new Set(['inaccuracy', 'mistake', 'blunder', 'miss']);
  const soundPlies = new Set<number>(moves.filter((mv) => mv.classification != null && !FAULT.has(mv.classification)).map((mv) => mv.ply));
  // THE ONE DOOR, REVIEW SIDE (David 2026-09-30: "Review yes, Play no"). Every
  // uncapped ply's lines pass the same package Learn speaks through — board
  // grading (true on the board before OR after the move), the not-speakable
  // screen, and the per-game sentence + claim ledger — so a line said at move
  // 9 is not said again at move 22. Counted for the audit row below.
  const reviewSpokenKeys = storyLedger(story, '', 'sentences');
  const reviewPkgTally = { plies: 0, parts: 0, dropped: 0, reasons: {} as Record<string, number>, drops: [] as Array<{ ply: number; reason: string; text: string }> };
  /** S4: the first ply of each phase the game reaches after the opening —
   *  the ONE phase-edge computer Learn reads (`detectPhaseTransition`,
   *  WO-STORY-MATRIX-01 P1-9c) read over the game (`phaseTurnsOf`). */
  const phaseTurnAt = playerColor
    ? phaseTurnsOf(moves.slice(0, usable).map((mm, k) => ({ ply: mm.ply, san: mm.san, fenAfter: fenChain[k].fenAfter })), playerColor)
    : new Map<number, 'middlegame' | 'endgame'>();

  const segments: ReviewMoveSegment[] = [];
  // Plan-idea beats, each fired once on an eligible student move: the opening
  // developing plan (when the opening is identified) and the middlegame
  // orientation (structure anchor + both-sides plans).
  /** Trapped-piece beats announced, keyed side:square — once per trap, ever. */
  const trappedAnnounced = ledger(REVIEW_SAID.trapped);
  // Same enemy threat announced once — a threat that PERSISTS across the
  // opponent's moves (e.g. Qxb7# standing for two plies) must not re-warn
  // verbatim on each move (David 2026-07-23: the mating-net line repeated
  // word-for-word on consecutive moves). Keyed by the threat's SAN.
  const threatsAnnounced = ledger(REVIEW_SAID.threat);
  /** Say-once for the "last time here" line, per position, this game. */
  const lastHereSaid = ledger(REVIEW_SAID.lastHere);
  // Deepest-look-ahead shots announced (David 2026-07-26 — the review-register
  // peer of the live speakDeepestLookahead), keyed by the shot's SAN so the same
  // combination is called out once per game.
  const deepShotAnnounced = ledger(REVIEW_SAID.deepShot);
  // FORESIGHT-AS-A-SKILL beats, deduped on the geometry they describe. The same
  // alignment can recur for plies; naming it once is teaching, naming it five
  // times is the drumbeat the method layer already learned not to be.
  const signalsAnnounced = ledger(REVIEW_SAID.signal);
  // The enumerated POSITIONAL VERDICT ("you're better here, and here's why:
  // bishop pair, the open file, his weak pawn") — Danya's signature teaching
  // message (David 2026-07-20). Fired ONCE, when there's a real edge with ≥2
  // concrete board-true assets to name (the `assessmentShown` flag).
  // Uncapped-mode dedup: STATIC state facets (opening name, opening plan, the
  // majority plan, the opponent-dev read) repeat identically move after move —
  // pure noise. Emit each identical line ONCE; every DYNAMIC per-move facet
  // (move/quality/tactic/loose/verdict/structure/king/sac/consequence) always
  // fires (David 2026-07-20 diagnostic: "Philidor Defense" was said 33 times).
  const emittedStaticFacets = ledger(REVIEW_SAID.staticFacet);
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
  const STANDING_STATE_TAGS: ReadonlySet<FacetTag> = new Set<FacetTag>(['tactic', 'loose', 'count', 'royal', 'rook7']);
  // The static reads, said once a game each, keyed by their tag and words.
  const STATIC_TAGS: ReadonlySet<FacetTag> = new Set<FacetTag>(['opening', 'plan-middlegame', 'passer', 'badbishop', 'worst', 'trapped', 'minority', 'complex', 'endgame']);
  const staticKey = (f: ReviewFacet): string => `${f.tag}|${f.text}`;
  const standingSpoken = ledger(REVIEW_SAID.standing); // signatures of standing reads spoken
  const sacSpoken = ledger(REVIEW_SAID.sac); // sacrifice-compensation profiles spoken
  // Verdict is ATOM-DIFFED: the verdict WORD (balanced/better/worse) speaks when
  // it changes; each REASON speaks only the first time it is true — so a growing
  // edge adds just the NEW asset ("you now own the open d-file") instead of
  // re-listing the whole pile every ply ("bishop pair; a7 isolated; passer…").
  const verdictReasonsSeen = ledger(REVIEW_SAID.verdictReason);
  // THE GAME'S PLANS are the story's too (WO-STORY-MATRIX-01 P1-8b): the plan
  // the student last HEARD with its stops in a row (the same plan thread Learn
  // keeps, so both surfaces remember a plan one way), and the threads each
  // plan was said on.
  // ONE CLAIM, MANY LANES (review walk 2026-10-01). "Convert your extra
  // material" (the plan), "trade pieces, not pawns" (the conversion method) and
  // "when you're ahead the plan is to trade" (the concept fill) are one claim;
  // so are "get your passed pawn on c3 promoting", "your passed pawn on c3
  // wants to run" and "the plan for you here: pushing the passed pawn on the
  // c-file". The first lane to speak claims it for the game: its thread.
  const CONVERT_THREAD = threadKey('student', PLAN_GOAL.convert);
  const RACE_THREAD = threadKey('student', PLAN_GOAL.race);
  const passerThread = (file: string): ThreadKey => threadKey('student', planAimKey('passer', file) as string);
  const passerTaught = (file: string): boolean => threadStated(story.current(), passerThread(file)) !== null;
  const convertTaughtAt = (): number | null => threadStated(story.current(), CONVERT_THREAD);
  /** Refuted alternatives already SPOKEN this game, by the move refuted. */
  const refutedSaid = ledger(REVIEW_SAID.refuted);
  // Learn-computer hints already spoken this game (A2), by claim identity.
  const hintsSaid = ledger(REVIEW_SAID.hint);
  // HOW MUCH OF THE OPENING'S STORY THIS STUDENT GETS — from their own record
  // (David 2026-10-19: "an opening they keep leaving early gets more; one they
  // play cleanly gets a line"). Full story unless the record PROVES the line:
  // five or more games in this opening, no departure of theirs anywhere on this
  // game's line. A grey record (few games) gets the whole story (grey teaches).
  // WHERE THE OPENING'S STORY ENDS (BACKLOG §6). The masters' file runs out
  // before most openings are over (the Fried Liver's book ends at ply 17,
  // mid-attack), so the move jobs keep going past it — read off the board,
  // claiming no theory — until the game's first flagged move, where the
  // game's own story (the error lane) takes over. Within the opening phase
  // they always run.
  const lastBookIdx = ((): number => {
    let last = -1;
    for (let k = 0; k < moves.length; k += 1) {
      const known = masterMovesCachedSync(fenChain[k].fenBefore);
      if (!known || !known.some((x) => x.san === moves[k].san && x.games >= BOOK_JOB_MIN_GAMES)) break;
      last = k;
    }
    return last;
  })();
  const isFlagged = (c: ReviewMoveInput['classification']): boolean => c === 'inaccuracy' || c === 'mistake' || c === 'blunder' || c === 'miss';
  const storyTailEnd = ((): number => {
    for (let k = Math.max(0, lastBookIdx + 1); k < moves.length; k += 1) if (isFlagged(moves[k].classification)) return k;
    return moves.length;
  })();
  // SAID ONCE (lead 2026-10-20: a formula said every move is the why
  // standard's measure 3): a guard's context ("which their bishop on c4
  // pins") once per pin. The book standing (main line / side road / the last
  // book move) is opening theory — Review's Theory button, never the walk
  // (David 2026-11-06).
  /** THE ONE COMPOSER'S MEMORY for the move's own thought (WO-ONE-COACH-01
   *  Build 5): the claims and sentences it has said this walk, and how often
   *  each phrase was said (a job's words rotate on it, a guard's context is
   *  said once). Committed only when the line speaks. */
  const thoughtKeys = ledger(REVIEW_SAID.thought);
  const thoughtPhrases = newPhraseMemory();
  // The story lines the walk has SPOKEN: a move job one of them already
  // claimed ("it invites Ng5, which joins their bishop on c4 against your
  // pawn on f7") is not said again when the move lands.
  const storySaid = ledger(REVIEW_SAID.storyLine);
  const formulasSaid = ledger(REVIEW_SAID.formula);
  const storyAll: boolean | null = ((): boolean | null => {
    if (!studentNeed) return true;
    const keys = studentNeed.lineFenKeys ? new Set(studentNeed.lineFenKeys) : null;
    const leftHere = keys ? studentNeed.bookDepartures.some((r) => keys.has(fenKey(r.bookFen))) : studentNeed.bookDepartures.length > 0;
    return leftHere || (studentNeed.openingGames ?? 0) < STORY_PROVEN_GAMES;
  })();
  // LOOSE PIECES, BY OWNER — spoken count this game. The first is said; the
  // second names the PATTERN (the heart of the app: "what the opponent keeps
  // doing wrong — closing on the habit that finds it next time"); after that a
  // loose piece is no longer news, and the formula is not said again (review
  // audit 2026-10-15: "…now eyes the pawn on c5 — nothing guards it" ×3).
  // As keys (`your#1`, `your#2`), so the count rides the say-once ledgers and a
  // rebuild seeded from what the walk spoke carries it (review noise, #8).
  const looseSaid = ledger(REVIEW_SAID.loose);
  const looseCount = (owner: 'your' | 'their'): number => [...looseSaid].filter((k) => k.startsWith(`${owner}#`)).length;
  // The RACE verdict last spoken is the race thread's variant. Keyed on WHO
  // ARRIVES FIRST, not on the counts: the counts change on every push, so keying
  // on them would re-announce the race each ply. A flip — you were winning the
  // race and now you are not — IS the moment worth teaching, and it is the only
  // repeat this lets through.
  // A standing TACTIC is keyed by its claim, the first sentence: the hold
  // after it rotates by ply (`pinConsequence`), and a key on the whole line
  // would re-say the same pin every ply in new words.
  const standingSig = (f: ReviewFacet): string =>
    (f.tag === 'tactic' ? f.text.split(/(?<=\.)\s/)[0] : f.text)
      .toLowerCase()
      .replace(/\b(?:your|their|my|mine|our|white|black)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  // Structure is taught at the SUB-CLAIM level: each open file / outpost /
  // passed / isolated / doubled pawn is named the first time it is true, then
  // never restated. A genuinely new atom (a file that just opened, a new passed
  // pawn) still speaks; the unchanged ones fall silent — so the [structure]
  // line always ADDS something instead of re-listing the whole pawn skeleton.
  const structAtomsSeen = ledger(REVIEW_SAID.structAtom);
  // PURE since B4 (2026-09-22): it reports which atoms it would CLAIM and the
  // caller writes `structAtomsSeen` only once the facet has actually spoken.
  // `claimedThisPly` keeps the within-ply dedupe the ledger used to give.
  const freshStructureFacet = (facet: string, outpostSquaresAlreadySaid: ReadonlySet<string> | undefined, claimedThisPly: Set<string>): { text: string; atoms: string[] } | null => {
    const claimed: string[] = [];
    const inner = facet.replace(/\.\s*$/, '');
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
      ? { text: renderStructureAtoms(fresh, playerColor === 'white' ? 'w' : playerColor === 'black' ? 'b' : null), atoms: claimed }
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
  const spokenHabits = ledger<MethodHabit>(REVIEW_SAID.habit);
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
  const oneShotTags = ledger(REVIEW_SAID.oneShot);
  // Opponent-commentary dedup — name each target square at most once, and cap
  // the total so the lighter developing reads never spam (Danya comments the
  // opponent ~50-60% of moves, not every one).
  // Opponent target-read dedup — name each target square at most once (David
  // 2026-07-20: "always narrate both sides" — no count cap; the dedup is the only
  // throttle, and the PlyFacts fallback narrates every other eventful opp move).
  const oppTargetsSeen = ledger(REVIEW_SAID.oppTarget);
  // Opponent-psychology read state — was the opponent's LAST move an error (a
  // reading of the grades, rebuilt by every build from the moves — not a memory
  // of anything said), and have we already noted the snowball once (the
  // `psychologyReadDone` flag)?
  let lastOpponentWasError = false;
  // Opponent structure + development read — a once-per-game observation (David
  // 2026-07-19 live test; the `opponentDevReadShown` flag). Accumulate the
  // opponent's own SANs as we walk — the moves, which every build replays.
  const opponentSans: string[] = [];
  // Variation re-naming inside the walk (A2 — Danya names the line as it takes
  // shape). Accumulate ALL sans; announce each new, more-specific opening name
  // once, in order, on a quiet opening move (grounded via detectOpening).
  const allSans: string[] = [];
  // §6 story-as-evidence — a cited illustrative game from the VERIFIED corpus,
  // spoken once per game (never invented; the story's `model-game` event). Null
  // when the opening has no model game.
  const storyGame = openingName ? pickStoryGame(openingName) : null;
  // The full sacrifice-compensation profile (king-stuck / dev-lead / verdict)
  // fires ONCE per game — a combination of several sacs shares one compensation,
  // so re-listing it verbatim on each is robotic. Later sacs are still NAMED
  // (the `sacCompShown` flag). The "their king is stuck in the centre" keystone
  // is taught at most ONCE per game — whether by the sacrifice compensation or
  // the standalone beat below (`kingCenterTaught`).
  // FORCED-SEQUENCE framing (the forcing-move / "calculate to the end" concept):
  // if the game ends in a forced checking run, frame it at its first move so the
  // student learns to SEE a forced finish, then the walk plays it out. Board-true.
  const forcedRun = detectForcedMatingSequence(sansForRun, moves.slice(0, usable).map((mm) => (typeof mm.evaluation === 'number' ? mm.evaluation : null)));
  const studentColorWB: 'w' | 'b' | null = playerColor === 'white' ? 'w' : playerColor === 'black' ? 'b' : null;
  // Prev-capture context so the PlyFacts material calc can tell a RECAPTURE
  // (even trade → 0) from a genuine win (David 2026-07-20 Opera nitpick). Holds
  // the PREVIOUS move's capture; updated at the end of each iteration.
  const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let prevCap: PrevCaptureContext = NO_PREV_CAPTURE;
  // THE GAME'S PHRASE MEMORY (the DNA template): an idea said in full once in
  // this review, referred to after.
  const reviewPhrases = newPhraseMemory();
  // LOOKING BACK OVER THE GAME (computers batch 2, `gameEndReads`): why it
  // ended, the piece of theirs that never played, the quiet move it turned on,
  // a position to set up and explore, and the moments the engine's own read
  // would not hold still. Computed ONCE from the game's moves and the review's
  // own numbers, then handed to the ply they belong to.
  const endReadsAt = new Map<number, EndRead[]>();
  if (studentColorWB) {
    try {
      const gamePlies: GamePly[] = fenChain.slice(0, usable).map((fp, k) => ({
        san: moves[k].san, fenBefore: fp.fenBefore, fenAfter: fp.fenAfter,
        evalAfter: moves[k].evaluation ?? null, bestMoveUci: moves[k].bestMove ?? null,
        // The eval had the best move been played: the one-search number when
        // the ply was searched for its cost, else the board's eval before it.
        bestMoveEval: moves[k].bestMoveEval ?? moves[k].preMoveEval ?? null,
      }));
      const add = (r: EndRead | null): void => { if (r) endReadsAt.set(r.index, [...(endReadsAt.get(r.index) ?? []), r]); };
      const ended = whyItEnded(gamePlies, studentColorWB);
      add(ended);
      add(idlePiece(gamePlies, studentColorWB));
      add(quietDecider(gamePlies, studentColorWB));
      for (let k = 0; k < gamePlies.length; k += 1) {
        // The final board's own read already says what every move allows.
        if (!(ended && k === gamePlies.length - 1)) add(exploreInvite(gamePlies, k, studentColorWB));
        add(murkyRead(gamePlies[k], k, studentColorWB));
        yield;
      }
    } catch { /* looking back is a bonus, never a blocker */ }
  }
  /** The motif transfer, read off the motif keys in the order they were said
   *  (by move) — the same replay a seeded story needs. */
  const motifLedgerOf = (keys: Iterable<string>): MotifLedger => {
    const out: MotifLedger = new Map();
    const replay = [...keys].map((k) => {
      const [motif, move, ...rest] = k.split('|');
      return { motif, move: Number(move), instance: rest.join('|') };
    }).sort((x, y) => x.move - y.move);
    for (const r of replay) recordMotif(r.motif, r.instance, r.move, out);
    return out;
  };
  for (let i = 0; i < usable; i++) {
    yield;
    if (spokenBefore && moves[i].ply === spokenBefore.throughPly + 1) {
      // What the walk had said, as it had said it (WO-STORY-MATRIX-01 P1-8d):
      // the whole story — every ledger, flag, plan and event — starts from the
      // walk's checkpoint, never this build's own guess at its past.
      story.restore(spokenBefore.checkpoint);
      motifLastSpoken = motifLedgerOf(motifKeys);
    }
    // Everything said on this move is said at its ply.
    story.reach(moves[i].ply);
    // THE PLIES THE WALK ALREADY SAID (WO-STORY-MATRIX-01 P1-8f). With a seed,
    // what was said through `throughPly` is the walk's: the story restores the
    // walk's checkpoint at the next ply, and the caller keeps the walk's own
    // segments for these plies (`mergeReviewNarration`; a line off the free
    // board speaks only its own moves). So they are not narrated again — which
    // is what lets the free board's line be built by the walk's own coach at
    // the cost of its new moves. The move is carried (the sans, the capture
    // run, whether their move was a slip) and its segment stays silent.
    if (spokenBefore && moves[i].ply <= spokenBefore.throughPly) {
      const mv = moves[i];
      const fp = fenChain[i];
      const mover: 'white' | 'black' = mv.ply % 2 === 1 ? 'white' : 'black';
      if (mover !== playerColor) {
        opponentSans.push(mv.san);
        lastOpponentWasError = mv.classification === 'inaccuracy' || mv.classification === 'mistake' || mv.classification === 'blunder';
      }
      allSans.push(mv.san);
      segments.push({
        ply: mv.ply, moveNumber: Math.ceil(mv.ply / 2), san: mv.san, playerColor: mover,
        fenBefore: fp.fenBefore, fenAfter: fp.fenAfter, classification: mv.classification,
        evalBefore: mv.preMoveEval, evalAfter: mv.evaluation,
        bestMoveSan: betterMoveSan(mv.bestMove, mv.san, fp.fenBefore), bestMoveUci: mv.bestMove,
        narration: null, narrationSource: null,
      });
      try { prevCap = afterCapture(prevCap, new Chess(fp.fenBefore).move(mv.san)); } catch { prevCap = NO_PREV_CAPTURE; }
      continue;
    }
    const m0 = moves[i];
    // AN INACCURACY SPEAKS ONLY WHERE THE RECORD EARNS IT (David 2026-10-18):
    // where this student's mistakes and blunders outnumber their inaccuracies
    // (this phase and this skill first), the big errors come first — the move is narrated as an
    // ordinary move (its reason), and the badge keeps the real grade.
    const quietSlip = m0.classification === 'inaccuracy'
      && (playerColor ? (m0.ply % 2 === 1 ? 'white' : 'black') === playerColor : !m0.isCoachMove)
      && !inaccuracySpeaks({ fenBefore: fenChain[i].fenBefore, playedSan: m0.san, bestSan: betterMoveSan(m0.bestMove, m0.san, fenChain[i].fenBefore), ply: m0.ply - 1 });
    const m = quietSlip ? { ...m0, classification: null } : m0;
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
      const swingCp = typeof m.costCp === 'number' && studentColorWB !== null
        ? (moverIsStudent ? -m.costCp : m.costCp)
        : (m.evaluation != null && m.preMoveEval != null && studentColorWB !== null)
          ? (studentColorWB === 'w' ? 1 : -1) * (m.evaluation - m.preMoveEval)
          : null;
      const critical = m.classification === 'inaccuracy' || m.classification === 'mistake'
        || m.classification === 'blunder' || m.classification === 'brilliant' || m.classification === 'great'
        || (swingCp != null && Math.abs(swingCp) >= 150);
      return buildReviewMoveBriefing({
        fenBefore: fenPair.fenBefore, san: m.san, prev: prevCap, phrases: reviewPhrases,
        moverIsStudent, studentSwingCp: swingCp, criticalMoment: critical,
        // The eval verdict + why (why the position is what it is) and the delta
        // (how this move moved it) — the reasons David wants to hear.
        evalAfterWhiteCp: m.evaluation, evalBeforeWhiteCp: m.preMoveEval,
        studentColorWB: studentColorWB ?? undefined,
        // The game's own continuation (what this move set up) and the move
        // before it (what they were aiming at) — the three facts.
        line: moves.slice(i + 1, i + 1 + BRIEFING_LINE_PLIES).map((x) => x.san),
        theirLast: i > 0 ? { fenBefore: fenChain[i - 1].fenBefore, san: moves[i - 1].san } : null,
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
    const fundamentals: PrincipleAttribution[] = attrHere?.fundamentals ?? [];
    const fundamentalLed = fundamentals.length > 0;
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
        // tactic more than once). If it has already LED a beat this game, don't
        // lead with it again — the story's claim, under the one key Learn's
        // chain line claims too (`causalChainKey`, P1-8c). It leads the
        // narration whenever it is computed, so it is said here.
        const chainKey = chain ? causalChainKey(chain) : '';
        if (chain && !story.current().said.has(chainKey)) {
          story.commit(m.ply, { claims: [chainKey] });
          const lines = renderCausalChain(chain, { register: 'review', studentColor: studentColorWB, rating: rating ?? DEFAULT_STUDENT_RATING });
          if (lines.length) causalLead = lines.join(' ');
          if (chain.stance === 'played' || chain.stance === 'allowed') {
            // Sight lines (the piece that attacks the loose target) through the
            // arrow door, on the board after the move — each takes its owner's colour.
            const arr = causalChainArrows(chain);
            if (arr.length) causalArrows = admitArrows(arr.map((a): ArrowClaim => ({ from: a.from, to: a.to, role: 'vision', source: 'review.causalChain' })), { fen: fenPair.fenAfter, studentColor: playerColor ?? moverColor }).arrows;
          }
        }
      } catch { causalLead = null; }
    }
    // WHAT THE POSITION IS ABOUT, AND WHEN THAT CHANGES (WO-STORY-MATRIX-01
    // P1-9c) — the same computer Learn steps (`characterTurn`), stepped on
    // every board of the walk in the game's story, so the switch holds for two
    // reads exactly as it does live. Review keeps one engine line a ply, so the
    // best-move gap is not read here: the character comes off the material and
    // the proven tactics on the board.
    let characterSwitch: { to: import('./positionCharacter').Character; text: string } | null = null;
    if (studentColorWB) {
      try {
        const step = characterTurn(story.plans().character, switchesSaid(story.current()), {
          fen: fenPair.fenAfter, studentColor: studentColorWB === 'w' ? 'white' : 'black',
          immediate: detectImmediateTactics(fenPair.fenAfter, studentColorWB), topLines: [], lastSan: m.san,
        });
        story.setPlans(m.ply, { ...story.plans(), character: step.next });
        // Up material, what to do is the conversion method's (`readConversion`,
        // below): its step can be "attack the king, don't cash in", which the
        // character's "trade down" would contradict. One idea, one computer.
        characterSwitch = step.switched && step.switched.to !== 'conversion' ? step.switched : null;
      } catch { characterSwitch = null; }
    }
    // UNCAPPED diagnostic branch — emit EVERY computed facet on EVERY move (David
    // 2026-07-20: "turn off all narration caps"). Skips the one-beat cascade + the
    // one-shot flags entirely; the aggregator is the full data inventory.
    if (uncapped) {
      // EVERY FACT OF THE MOVE IS THE ONE FACT (WO-STORY-MATRIX-01 P1-6d): its
      // squares, whose it is, what it is worth, its proof, its claims and its
      // say-once identity ride on it, made by the computer that found it.
      const fact = (computer: ComputerName, tag: FacetTag, text: string, parts: ReviewFacetParts = {}): ReviewFacet =>
        reviewFacet(computer, tag, text, fenPair.fenAfter, fenPair.fenBefore, parts);
      // The walk's own say-once state for a fact (the opening name, the book
      // standing, a pin's context), committed only if the fact SPOKE — after
      // the door, like every ledger (B4: a fact on a silenced ply is not said).
      const facetCommits = new Map<ReviewFacet, () => void>();
      // The conversion method's own line on this move (the "trade pieces"
      // step), which the convert plan's thread owns below — a mark on this
      // move's facets, not a memory of the game (it rode the seed until 8d).
      const conversionFacets = new Set<ReviewFacet>();
      const verdictReasonOut: { text: string | null; playedLine?: boolean; punishSan?: string; lostSquare?: string; guardLeft?: string } = { text: null };
      const facets = computeMoveFacets({
        fundamentals,
        seenFundamentals,
        teaching: {
          refutedAlt: refutedByPly.get(m.ply) ?? null,
          intent: intentByPly.get(m.ply) ?? null,
          prevFenBefore: i > 0 ? fenChain[i - 1].fenBefore : null,
          phaseTurn: phaseTurnAt.get(m.ply) ?? null,
          principlesTaught,
          soundPlies,
          motifSaid: motifSaidInstances(motifKeys),
          knownSlips: { index: knownSlipIndex, nextRefutedAlt: refutedByPly.get(m.ply + 1)?.alt ?? null, told: [...hintsSaid].filter((k) => k.startsWith(KNOWN_SLIP_HINT)).length },
          weigh: { rating: rating ?? DEFAULT_STUDENT_RATING, reads: m.weighed?.reads ?? null },
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
        costCp: m.costCp ?? null,
        heardVerdict: m.heardVerdict ?? null,
        classification: m.classification ?? null,
        bestMoveSan,
        bestLineUci: m.bestMove ? [m.bestMove, ...(m.pv?.afterBest ?? [])] : [],
        playedLineUci: m.pv?.afterPlayed ?? [],
        secondReads: recordSecondReads(m.pv),
        replyBestSan: i + 1 < moves.length ? uciToSanAt(moves[i + 1].bestMove ?? null, fenPair.fenAfter) : null,
        replyEvaluation: i + 1 < moves.length ? moves[i + 1].evaluation ?? null : null,
        prevCap,
        allSans: sansForRun,
        forcedRunStartPly: forcedRun ? forcedRun.startPly : null,
      }, verdictReasonOut);
      // THE EXACT HOLE FOR THE FACT THAT NAMES IT (2026-09-21). The
      // `[principle]` fact IS the attributed fundamental, so ranking it by
      // `clauseKindForTag('principle') → 'structure-plan'` asked the coarse
      // bucket a question this ply already has an exact answer to. Every other
      // fact is left to the tag join — only this one carries an id. `null` when
      // the attributor named a fundamental the student has NO record of: that
      // is GREY, and grey is not a hole; it must not borrow a bucket's weight.
      for (const f of facets) {
        if (f.tag === 'principle') f.hole = fundamentals[0] ? matchFundamental(fundamentals[0].id, studentWeaknesses ?? []) : null;
      }
      // ONE THREAT VOICE WITH LEARN (David's locked table, 2026-10-19): a
      // simple one-move threat on a skill the student has PROVEN is quiet —
      // "Watch out — that bishop attacks your rook" is said to a student who
      // does not yet see those, and to no one else.
      for (let k = facets.length - 1; k >= 0; k -= 1) {
        const sq = /^opp-threat:hanging:([a-h][1-8])$/.exec(facets[k].identity ?? '')?.[1];
        if (!sq) continue;
        const input = threatInputFor({ kind: 'hanging', square: sq }, { fenBefore: fenPair.fenBefore, opponentSan: m.san });
        const voice = threatVoice(recordTermForThreat(input.pattern, reviewRecord).state, threatVisibility(input.sighting).visibility).voice;
        if (voice === 'quiet') facets.splice(k, 1);
      }
      // The game looked back on (batch 2) — each read once a game, through the
      // `hint:` say-once ledger the Learn computers already ride.
      for (const r of endReadsAt.get(i) ?? []) {
        facets.push(fact(END_READ_COMPUTER[r.kind], r.kind === 'murky' ? 'murky' : 'game-end', r.text, { identity: `hint:${r.claim}`, proof: r.proof, squares: r.squares, stakes: r.stakes }));
      }
      // MEMORY BY POSITION, the green half: the student left theory from this
      // board in another game at a cost, and this game went another way. The
      // repeat is the departure line's job ("You left book … again").
      if (moverColor === playerColor && studentNeed?.bookDepartures.length) {
        const here = readBoard('lastTimeHere', { fenBefore: fenPair.fenBefore, playedSan: m.san, rows: studentNeed.bookDepartures, currentGameId: currentGameId ?? null });
        const hereKey = here ? readKey(here) : null;
        if (here && hereKey && hereKey.startsWith('last-here:other:') && !lastHereSaid.has(hereKey)) {
          lastHereSaid.add(hereKey);
          facets.push(fact(here.computer, 'last-here', here.text));
        }
      }
      // The position's character switch, said once its new character holds:
      // stated in the story only when it spoke, so its words rotate on the
      // switches the student heard (Learn's rule).
      if (characterSwitch) {
        const to = characterSwitch.to;
        const raw = fact('characterTurn', 'judgement', characterSwitch.text, { identity: `character:${m.ply}` });
        facets.push(raw);
        facetCommits.set(raw, () => story.note(m.ply, [{ kind: 'character', to }]));
      }
      // ZUGZWANG — whoever has to move here loses ground (the tablebase,
      // WO-STORY-MATRIX-01 P1-9c): on their move, the student is the one in it;
      // on the student's, the student put them in it. Said once a position.
      const zz = zugzwangByPly.get(m.ply);
      if (zz && studentColorWB) {
        const studentToMove = moverColor !== playerColor;
        const zKey = `zugzwang:${fenPair.fenAfter.split(' ').slice(0, 2).join(' ')}`;
        if (!hintsSaid.has(`once:${zKey}`)) {
          const raw = fact('readZugzwang', 'technique', zugzwangSentence(zz, studentToMove), { identity: `once:${zKey}`, proof: zugzwangProof(zz, studentToMove) });
          facets.push(raw);
        }
      }
      // THE CONVERSION METHOD (WO-LAYERS-01 step 5), on the student's move when
      // they are a piece or more up — the step the board is on, once per step
      // per game (the step only changes when the board does).
      if (moverColor === playerColor && studentColorWB) {
        const conv = readConversion(fenPair.fenAfter, studentColorWB);
        if (conv && !seenConversionSteps.has(conv.step) && !(conv.step === 'trade-pieces' && convertTaughtAt() !== null)) {
          seenConversionSteps.add(conv.step);
          const raw = fact('readConversion', 'technique', conv.text);
          facets.push(raw);
          if (conv.step === 'trade-pieces') conversionFacets.add(raw);
        }
      }
      // THE PAWN ENDING (parity with Learn): the trade that takes the last
      // pieces off, counted; an outside passer as a decoy, once per game.
      if (moverColor === playerColor && studentColorWB && typeof m.preMoveEval === 'number' && typeof m.evaluation === 'number') {
        const sign = moverColor === 'white' ? 1 : -1;
        const moveCost = recordedMoveCost(m, moverColor) ?? 0;
        const pe = pawnEndingTrade(fenPair.fenBefore, m.san, moves[i + 1]?.san ?? null, moveCost, m.evaluation * sign);
        if (pe) facets.push(fact('pawnEndingTrade', 'technique', pe.text));
        if (m.bestMove) {
          try {
            const bm = new Chess(fenPair.fenBefore).move({ from: m.bestMove.slice(0, 2), to: m.bestMove.slice(2, 4), promotion: m.bestMove[4] });
            const st = spareTempoWasted(fenPair.fenBefore, m.san, bm?.san ?? null, moveCost);
            if (st) facets.push(fact('spareTempoWasted', 'technique', st));
          } catch { /* no best move to compare */ }
        }
        const decoy = outsidePasserDecoy(fenPair.fenAfter, studentColorWB);
        if (decoy && !seenDecoys.has(decoy.passer[0])) {
          seenDecoys.add(decoy.passer[0]);
          facets.push(fact('outsidePasserDecoy', 'technique', decoy.text, { squares: decoy.squares }));
        }
      }
      // THE LEARN COMPUTERS, CALLED — not copied (unify-the-coach A2, David
      // 2026-10-01: "one coach, every surface"). The student-move computer Learn
      // speaks from runs here on the same move, and each of its facts is filed
      // under its own kind (WO-STORY-MATRIX-01 P1-6b) — the bundle's rules; the
      // rest Review says through its own producers (the winning line, the
      // pawn-ending reads, the trade read, the timing facet, the plan race,
      // the opening facets), never a second voice. Each is said once a game,
      // keyed on its own claims (committed only when it spoke).
      if (moverColor === playerColor && studentColorWB && typeof m.preMoveEval === 'number' && typeof m.evaluation === 'number') {
        const sign = moverColor === 'white' ? 1 : -1;
        const bothCp = Math.abs(m.preMoveEval) < 5000 && Math.abs(m.evaluation) < 5000;
        const hints = studentMoveTeaching({ theory: false,
          fenBefore: fenPair.fenBefore,
          san: m.san,
          history: sansForRun.slice(0, m.ply),
          // ONE GRADE, ONE COST (clean-pass review walk 2026-10-04, G1 27.Rc8:
          // graded GREAT, then "Blunder check … here the answer was your rook
          // on c8" — the raw drop of two reads at +10, which the grade, in
          // expected points, had already called no loss). A move the review
          // does not grade as a fault cost nothing here either.
          cpLoss: m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder'
            ? recordedMoveCost(m, moverColor) ?? 0 : 0,
          bothCp,
          bestSan: bestMoveSan,
          bestLine: m.bestMove ? { rank: 1, evaluation: m.preMoveEval, moves: [m.bestMove, ...(m.pv?.afterBest ?? [])], mate: storedMate(m.preMoveEval), earlier: m.pv?.earlierBest?.length ? { depth: Math.max(0, (m.pv.depth ?? 2) - 2), moves: m.pv.earlierBest } : null } : undefined,
          reply: sansForRun[m.ply] ?? null,
          cpAfter: bothCp ? m.evaluation * sign : null,
        });
        for (const h of hints) {
          if (!isBundleRuleKind(h.kind)) continue;
          const id = `hint:${h.claims.join('|') || h.lane}`;
          if (hintsSaid.has(id)) continue;
          facets.push(fact(h.computer, h.kind, h.text, { identity: id, squares: h.squares }));
        }
      }
      // THE LINE BEHIND A WINNING MOVE — parity with Learn (David 2026-09-30:
      // "teach more line calculations"; one coach everywhere). The student
      // played the engine's move and its line wins material: said to the last
      // capture, drawn ply by ply.
      if (moverColor === playerColor && studentColorWB) {
        try {
          const played = new Chess(fenPair.fenBefore).move(m.san);
          const playedUci = played ? `${played.from}${played.to}${played.promotion ?? ''}` : null;
          const line = m.bestMove && playedUci === m.bestMove ? [m.bestMove, ...(m.pv?.afterBest ?? [])]
            : playedUci && m.pv?.afterPlayed?.length && (m.classification === 'great' || m.classification === 'brilliant' || m.classification === 'good') ? [playedUci, ...m.pv.afterPlayed]
              : null;
          // The line's own second read, from the same board (`lineTrust`).
          const lineSecond = m.bestMove && playedUci === m.bestMove ? m.pv?.earlierBest ?? null
            : playedUci && m.pv?.earlierPlayed?.length ? [playedUci, ...m.pv.earlierPlayed] : null;
          // A line that MATES is said as the mate (and the quiet move that
          // started it) — a material count would undersell it.
          const ml = line ? mateLine(fenPair.fenBefore, line, studentColorWB, m.san) : null;
          if (ml) {
            facets.push(fact('mateLine', 'tactic', ml.text, { stakes: mateStakes('you', 0, true), squares: ml.taken, lines: [{ fen: fenPair.fenBefore, sans: ml.sans.map((x) => x.replace(/^…/, '')) }] }));
            if (!causalArrows || causalArrows.length === 0) {
              causalArrows = admitArrows(lineArrows(fenPair.fenBefore, line ?? [], 'review.mateLine'), { fen: fenPair.fenBefore, studentColor: playerColor ?? moverColor }).arrows;
            }
          }
          const won = !ml && line ? lineWins(fenPair.fenBefore, line, studentColorWB, m.san, i > 0 ? { fenBefore: fenChain[i - 1].fenBefore, san: moves[i - 1].san } : null, [lineSecond]) : null;
          if (won) {
            // ONE COUNT OF WHAT THE CAPTURE WINS (Gotham–Jelena 13.Bxf7+: "You
            // take on f7, and they can take back — your bishop for their pawn"
            // beside "That wins a queen and a pawn for a bishop"): the trade
            // read counts the capture's own square, the line counts the whole
            // of it, and the line is the claim. The trade's own judgement
            // (`readTrade`: "it takes off their bishop that was bearing down on
            // your king") is another claim and stays.
            for (let k = facets.length - 1; k >= 0; k -= 1) if (facets[k].tag === 'trade' && facets[k].computer === 'settledExchange') facets.splice(k, 1);
            facets.push(fact('lineWins', 'tactic', `That wins ${won.what}: ${lineShape(won.sans, lineSeatAt(fenPair.fenBefore, studentColorWB))}.`, { stakes: { points: won.net, plies: 0 }, lines: [{ fen: fenPair.fenBefore, sans: won.sans.map((x) => x.replace(/^…/, '')) }] }));
            if (!causalArrows || causalArrows.length === 0) {
              causalArrows = admitArrows(lineArrows(fenPair.fenBefore, line ?? [], 'review.winningLine'), { fen: fenPair.fenBefore, studentColor: playerColor ?? moverColor }).arrows;
            }
          }
        } catch { /* a bonus, never a blocker */ }
      }
      // THE OPENING'S STORY, AS EACH MOVE IS PLAYED (David 2026-10-19: "in
      // review, i do want the full theory and main idea of the opening
      // explained as each move is being played. like Danya does in his post
      // game analysis"). The SAME computer Learn reads (`openingStory`, one
      // vocabulary): the fork and its families, what the opening is, the road
      // the student chose and why, their setup, the structure's cost and the
      // move that pays it, the coming game's character, the key break. Review
      // may name the moves (the game is over). Said once a game each, through
      // the walk's after-the-door ledger; sized by the student's own record.
      if (studentColorWB && storyAll !== null) {
        let storyNames: string | null = null;
        const reads = readBoardAll('openingStory', { history: sansForRun.slice(0, m.ply), fen: fenPair.fenAfter, student: studentColorWB, theory: false, namesStudentMoves: true });
        // THE OPENING NAMED AS IT IS IDENTIFIED — the SAME announcement Learn
        // speaks (`openingAnnouncementForGame`: the first name, each
        // refinement while in book, the departure), never a second namer.
        // The identity, when it is ready on this move, rides in the same line
        // (Learn's rule: one claim, heard once, with its reason).
        try {
          const history = sansForRun.slice(0, m.ply);
          const { det, transposed } = openingNameForBoard(detectOpeningByOrder(history), fenPair.fenAfter, history.length);
          // A NAME WITH NOTHING TO TEACH IS DESCRIPTION (lead 2026-10-20: "King's
          // Pawn Game", "King's Knight Opening"): the walk names the opening
          // from the first identity that carries an idea or a masters plan.
          const teaches = !!det && !isWaypointOpening(det.name) && (!!identityFor(det.name) || !!planFor(det.name));
          const namedOpening = openingAt(story.current(), 'named');
          const announce = det && teaches ? openingAnnouncementForGame(det, history, namedOpening, studentColorWB, transposed) : null;
          // A story beat on this move that already names it ("They've gone for
          // the Italian Game", "You chose the Two Knights Defense") says the
          // name with its reason; the bare announcement would say it twice.
          const label = det ? (det.name.split(/[:,]/).map((x) => x.trim()).filter(Boolean).pop() ?? det.name) : '';
          const namedByStory = !!label && reads.some((r) => r.storyBeat !== 'identity' && r.text.includes(label));
          if (det && announce && namedByStory) storyNames = det.name;
          if (det && announce && !namedByStory) {
            const idRead = reads.find((r) => r.storyBeat === 'identity' && !hintsSaid.has(`hint:${readKey(r)}`)) ?? null;
            // THE FIRST NAME IS SAID WITH WHAT IT TEACHES (lead 2026-10-20:
            // "This game is the Sicilian Defense." alone is a name with no
            // teaching): the identity when it is ready, else not yet — the next
            // move that carries one names it. The masters' plan is opening
            // theory: Review's Theory button says it (David 2026-11-06).
            // A REFINEMENT of a family already taught (the Fried Liver of the
            // Two Knights) names the line the student is now in.
            const teaching = idRead?.text ?? null;
            // THEIR DEPARTURE WITH NOTHING TO TEACH IS HELD (lead 2026-10-20,
            // Najdorf Zagreb: "They left the book with the bishop to b7." is a
            // description). The student's own departure carries its book move
            // and job through the bookMove computer.
            const dep = bookDeparture(history);
            const theirBareDeparture = !teaching && !!dep && dep.mover !== studentColorWB && history.length - dep.ply <= 1;
            if ((teaching || namedOpening) && !theirBareDeparture) {
              const raw = fact(idRead?.computer ?? 'openingAnnouncementForGame', 'opening', `${announce}${teaching ? ` ${teaching}` : ''}`, { identity: idRead ? `hint:${readKey(idRead)}` : `hint:opening-name:${det.name}`, squares: idRead?.squares ?? [] });
              facets.push(raw);
              const said = det.name;
              facetCommits.set(raw, () => { noteOpening(story, m.ply, 'named', said); });
            }
          }
        } catch { /* naming is a bonus, never a blocker */ }
        for (const r of reads) {
          if (!storyAll && r.storyBeat !== 'identity') continue;
          const id = `hint:${readKey(r)}`;
          if (hintsSaid.has(id) || facets.some((x) => x.identity === id)) continue;
          // Each beat under its own kind (`openingStory.STORY_KIND`, on the
          // fact), placed by the one group table — no longer every beat filed
          // as the name.
          const raw = fact(r.computer, r.kind, r.text, { identity: id, proof: r.proof, squares: r.squares });
          facets.push(raw);
          const told = r.text; const named = storyNames;
          facetCommits.set(raw, () => { storySaid.add(told); if (named) noteOpening(story, m.ply, 'named', named); });
        }
      }
      // EACH OPENING MOVE, BOTH SIDES, WITH ITS JOB (BACKLOG §6, David: "the
      // full theory and main idea of the opening explained as each move is
      // being played. like Danya does in his post game analysis"). What the
      // move DOES on the board — the guard, the pin it stops, the castling it
      // clears, the capture taken back, the fork it lands, the piece it piles
      // on — from `moveJob`, the same computer that names the book move after
      // a departure, said in the mover's seat. Where the masters' file knows
      // the position the line says so ("the masters' main move"); past it the
      // job is still read off the board and no theory is claimed. A flagged
      // move is the error lane's; a bare "brings your knight out" restates the
      // board (rule 3) and stays quiet.
      // PAST THE OPENING THE NEED SCORE DECIDES (lead 2026-10-20: move jobs
      // spoke on 25 middlegame plies the need score had marked silent — a
      // game with no slip after the book ran the story tail to the last move).
      // …EXCEPT THE STUDENT'S OWN MOVE (lead 2026-10-20, the WHY standard in
      // Review): every student move out of book is owed its own reason, so
      // its job speaks wherever the board shows one. Their moves past the
      // opening stay with the need score.
      const openingPly = classifyPhase(fenPair.fenBefore, { ply: m.ply - 1 }) === 'opening';
      const inStory = openingPly || moverColor === playerColor || (lastBookIdx >= 0 && i < storyTailEnd && needHere?.speak === true);
      if (storyAll && studentColorWB && !isFlagged(m.classification) && inStory) {
        const mine = moverColor === playerColor;
        const prevSan = i > 0 ? moves[i - 1].san : null;
        let prior: PriorCapture | null = null;
        if (prevSan && /x/.test(prevSan)) {
          try { const pm = new Chess(fenChain[i - 1].fenBefore).move(prevSan); if (pm.captured) prior = { to: pm.to, captured: pm.captured, promoted: !!pm.promotion }; } catch { prior = null; }
        }
        const job = moveJob(fenPair.fenBefore, m.san, moverColor === 'white' ? 'w' : 'b', mine ? MINE : THEIRS, prior);
        const id = `hint:move-job:${m.ply}`;
        // ONE CLAIM, ONE PRODUCER: the board-influence line ("[does] Your pawn
        // on e5 now eyes their knight on f6") states the same attack as the
        // move's job, as a DESCRIPTION the door drops when nothing teaches
        // beside it (2.Nf3's attack on e5 went unsaid). The job is the
        // teaching statement of it, so the description steps aside.
        const target = job?.kind === 'attack' && job.squares.length === 2 ? job.squares[1] : null;
        // …unless, past the opening, it carries a SECOND claim the job does
        // not: "— nothing guards their bishop on f4" is the loose piece, which
        // the loose count reads (the second one names their habit). The job
        // reached past the opening only for the student's own move
        // (review-noise), and stripping the loose line with the attack there
        // lost the first loose piece, so the habit never came (batch 4 merge,
        // Alapin 11…Nd5: loosePattern.test). In the opening the job keeps the
        // line it always had.
        const keepLoose = (f: ReviewFacet): boolean => !openingPly && looseSquareOf(f) !== null;
        // The line about the job's target, found by the squares it couples.
        const doesLine = target ? facets.findIndex((f) => f.tag === 'does' && (f.squares ?? []).includes(target)) : -1;
        const sameClaim = doesLine >= 0 && !keepLoose(facets[doesLine]) ? doesLine : -1;
        // …and when it stays for its loose piece, it has said the attack: the
        // job does not say it again (Review prod audit 2026-10-30, Qc3: "Your
        // queen on c3 now eyes their pawn on e5 — …" then "it attacks their
        // pawn on e5").
        const doesSaysJob = doesLine >= 0 && sameClaim < 0;
        // A STORY LINE ON THIS MOVE THAT ALREADY SAYS THE JOB ("You chose the
        // Two Knights Defense: …Nf6 attacks their pawn on e4, where …") carries
        // it with its reason; the bare job would say it twice.
        const told = !!job && (facets.some((f) => (f.identity ?? '').startsWith('hint:story:') && f.text.includes(job.clause.replace(/^it /, '')))
          // ONE CLAIM, ONE PRODUCER (lead 2026-10-20: "Attacks their bishop on
          // b6." beside "c5 kicks their bishop off b6, gaining time"): an
          // attack another line on this move already names, with its reason,
          // is not said again as a bare job.
          || (job.kind === 'attack' && job.squares.length === 2 && facets.some((f) => (f.tag === 'rule' || f.tag === 'point' || f.tag === 'judgement')
            && new RegExp(`\\b(?:kicks?|attacks?|hits?|chases?|goes after)\\b[^.]*\\b(?:on|off) ${job.squares[1]}\\b`).test(f.text)))
          // ONE CLAIM, ONE PRODUCER (Review tape 2026-10-21: "Brings your bishop
          // out and clears the way to castle next move. Your bishop to d3 clears
          // the way to castle."): the student's move whose engine reason is the
          // castling it prepares already says it, with the move as its subject.
          || (!!job.prepsCastle && moverColor === playerColor && intentByPly.get(m.ply)?.prepsCastle === true)
          // …and a rule this move kept that states the job's claim with its
          // subject and its reason (same tape, 20.Bd2: "…steps out of the
          // pawn's reach, keeping the bishop…" beside "Takes your bishop out of
          // reach of their pawn on f4."). The join is JOB_RESTATED_BY_RULE.
          || restatedByRule(job, facets)
          // …and a free capture the cause-and-effect line on this move already
          // told as won (v5 re-run 2026-10-29, chesscom-832383758 ply 16: "You
          // won the bishop on f7 — nothing was left guarding it. … Wins their
          // bishop on f7, and nothing can take back.").
          || (job.kind === 'capture' && !!causalLead && new RegExp(`\\bwon the \\w+ on ${job.squares[0]}\\b`).test(causalLead)));
        if (told && sameClaim >= 0) facets.splice(sameClaim, 1);
        // ONE CLAIM, SAID ONCE (lead 2026-10-20): a job a spoken story line
        // already claimed says what the move now ASKS instead, or nothing.
        const heard = !!job && [...storySaid].some((t) => t.includes(job.clause.replace(/^it /, '')));
        if (job && heard && !told && !hintsSaid.has(id) && moverColor !== playerColor && job.kind === 'attack' && job.squares[1]) {
          const ask = whatItAsks(fenPair.fenAfter, job.squares[1], moverColor === 'white' ? 'w' : 'b', THEIRS);
          if (ask) {
            facets.push(fact('whatItAsks', 'move-job', `${ask}.`, { identity: id, squares: job.squares }));
          }
        }
        // THEIR ATTACK SAYS WHAT IT ASKS (lead 2026-10-20, Najdorf Zagreb:
        // "Attacks your pawn on e4." is a one-move attack he can see). Their
        // attack on a target that now needs an answer says so; a PLAIN attack
        // that asks nothing is held. Checks and joined attacks keep their own
        // clause either way.
        const theirAttack = !!job && moverColor !== playerColor && job.kind === 'attack' && !!job.squares[1];
        const asks = theirAttack && job ? whatItAsks(fenPair.fenAfter, job.squares[1], moverColor === 'white' ? 'w' : 'b', THEIRS) !== null : false;
        const plainAttackAsksNothing = theirAttack && !asks && !!job && /^it attacks /.test(job.clause);
        // THE MOVE'S OWN THOUGHT, FROM THE ONE COMPOSER (WO-ONE-COACH-01 Build
        // 5, David 2026-10-30: "Remember to unify this build"). Review said a
        // move with its job alone; the composer weighs the job with the
        // fundamentals, the briefing, the board teacher, the answer to their
        // last move, the trip and the stop, by the policy fitted on Danya's
        // notes — the lesson's sentence for the same move. On 542 of his notes
        // Review's line said 30.8% of his ideas (his lead idea 17.9%) in 36.8
        // words, the composer's 43.7% (33.4%) in 23; on the opponent's moves
        // 19% against 39%. A job another line on this move already says is
        // left out, so the composer leads with the move's next idea; the rest
        // of Review's thought (the danger, the choices, the line, the board,
        // the verdict, the habit) stays its own — and so do the threat, the
        // tactic and the trade, which Review says through its own producers
        // ([threat], [tactic], [trade]; …Nb4's Nxc2+ fork was said twice), and
        // the principle a [rule] line on this move teaches with its reason
        // (Nf3's "develops into the game, fighting for the center…" was said
        // by both).
        const skipJob = told || heard || plainAttackAsksNothing || doesSaysJob;
        const ruleIdeas = new Set(facets.map((f) => ruleIdOf(f.identity)).filter((r): r is MoveFundamentalId => r !== null).map((r) => FUNDAMENTAL_IDEA[r]));
        for (const f of facets) { const idea = FACET_TEACHES_IDEA[f.tag] ?? COMPUTER_TEACHES_IDEA[f.computer]; if (idea) ruleIdeas.add(idea); }
        // A line that already teaches this move ([rule], [point]…) leads its
        // step: the composer adds only a second job — a new claim that clears
        // the policy's floor (…Nxd5's rule said the recapture; "adds its
        // weight to f4" was trivia behind it).
        const stepLeads = facets.filter((f) => FACET_ROLE[f.tag] === 'teach' && (stepOf(f.tag, 'student') === 'yours' || stepOf(f.tag, 'student') === 'theirs'));
        const leadSquares = new Set(stepLeads.flatMap((f) => [...f.squares]));
        const phrasesHere = new Map(thoughtPhrases);
        const memoryHere = { keys: new Set(thoughtKeys) };
        const thoughtFacts = moveThoughtFacts({ theory: false,
          fenBefore: fenPair.fenBefore, san: m.san, moverIsStudent: mine, prev: prevCap,
          line: moves.slice(i + 1, i + 1 + BRIEFING_LINE_PLIES).map((x) => x.san),
          theirLast: i > 0 ? { fenBefore: fenChain[i - 1].fenBefore, san: moves[i - 1].san } : null,
          history: moves.slice(0, i).map((x) => x.san),
          phrases: phrasesHere,
          // The record's own lines for this move (the deep read where it ran)
          // and its cost from one search.
          reads: storedIntentReads(fenPair.fenBefore, m.san, m),
          costCp: recordedMoveCost(m, moverColor),
        }).filter((f) => (f.step === 'yours' || f.step === 'theirs') && !(skipJob && f.source === 'moveJob')
          && !(f.source === 'briefing' && REVIEW_OWNS_IDEA.has(f.idea)) && !ruleIdeas.has(f.idea)
          // What their move aims at is a threat Review says through its own
          // producer ([threat]); the lesson says it as the move's fact.
          && f.computer !== 'theirTarget'
          // The king walked by hand: Review says it through its own facets
          // (the registry's reads, both seats), so it is not said twice.
          && f.source !== 'kingWalk'
          // The moves a player weighs: Review says them through its own
          // facets (the registry's reads, both seats).
          && f.source !== 'weighed'
          // The teaching moves' new computers: Review says them through its
          // own facets (the registry's reads, both seats).
          && f.source !== 'teachingMove'
          // The trip reads the line ahead as a plan; in a game the moves that
          // followed were answers to the board ("Qc3 sends the queen on to e4,
          // by way of b3 and f3" — hindsight), so Review leaves it to lessons.
          && f.source !== 'pieceRoute'
          && (stepLeads.length === 0 || speaksBehindLead(f, leadSquares)));
        // Behind a line that already teaches this move, the composer's first
        // fact is the move's second job and nothing follows it (two jobs a
        // move at most, M-TWO-JOBS).
        const led: ReadonlySet<ThoughtStep> = stepLeads.length > 0 ? new Set<ThoughtStep>([mine ? 'yours' : 'theirs']) : NOT_LED;
        const thought = composeThought(thoughtFacts, 'review', memoryHere, led);
        if (thought.spoken && !hintsSaid.has(id)) {
          const named = new Set(thought.kept.flatMap((f) => [...f.squares]));
          // The job's attack said here is the teaching statement of the
          // influence line's: the description steps aside.
          if (!told && target && named.has(target) && sameClaim >= 0) facets.splice(sameClaim, 1);
          // ONE LOOSE PIECE, ONE LINE, the mover's own attack too (prod Review
          // audit 2026-11-08, Carlsen–Caruana 21.Bxg5: "it hits their knight
          // on f4, which has no guard. Your dark-squared bishop now hits their
          // knight, and nothing guards it"). When the thought's board teacher
          // says the attack on the influence line's loose piece, the
          // description steps aside and its loose claim rides the thought, so
          // the loose count still reads it.
          const carried = facets.findIndex((f) => {
            const sq = f.tag === 'does' ? looseSquareOf(f) : null;
            return sq !== null && thought.kept.some((k) => k.source === 'boardTeacher' && k.squares.includes(sq));
          });
          const carriedLoose = carried >= 0 ? looseSquareOf(facets[carried]) : null;
          if (carried >= 0) facets.splice(carried, 1);
          // Their attack that asks an answer says so in the sentence that
          // names the target (a sentence of its own is the same words every
          // time, and the say-once ledger drops the second).
          const asked = asks && !!job ? thought.kept.findIndex((f) => f.squares.includes(job.squares[1])) : -1;
          // ONE ATTACK, ONE LINE (prod Review audit 2026-11-08, …a6: "it kicks
          // your bishop off b5, gaining time, and it needs an answer this move.
          // Watch out — that pawn attacks your bishop on b5, and nothing
          // defends it"). The move's own sentence says the attack and that it
          // asks an answer; the hanging read on the same square steps aside.
          if (asked >= 0 && job) {
            const k = facets.findIndex((f) => f.identity === `opp-threat:hanging:${job.squares[1]}`);
            if (k >= 0) facets.splice(k, 1);
          }
          const spoken = thought.kept.map((f, k) => (k === asked ? f.text.replace(/\.$/, ', and it needs an answer this move.') : f.text)).join(' ');
          const raw = fact('moveThoughtFacts', 'move-job', spoken, { identity: id, squares: [...named] });
          if (carriedLoose) raw.claims = [...(raw.claims ?? []), `loose:${carriedLoose}`];
          facets.push(raw);
          facetCommits.set(raw, () => {
            for (const k of memoryHere.keys) thoughtKeys.add(k);
            for (const [k, n] of phrasesHere) thoughtPhrases.set(k, n);
            // A kept fact on a plan thread (a passer made, an outpost
            // planted) is a step the story follows.
            story.commitFacts(m.ply, thought.kept);
          });
        }
      }
      // A VERDICT ON THEIR OPENING CHOICE — parity with Learn: their move that
      // left the masters' book, judged by the engine's cost of it.
      if (moverColor !== playerColor && studentColorWB && typeof m.preMoveEval === 'number' && typeof m.evaluation === 'number') {
        const sign = moverColor === 'white' ? 1 : -1;
        const oppLoss = typeof m.costCp === 'number' ? m.costCp : (m.preMoveEval - m.evaluation) * sign;
        const verdict = theirOpeningVerdict(moves.slice(0, i + 1).map((x) => x.san), studentColorWB, oppLoss, false);
        if (verdict) facets.push(fact('theirOpeningVerdict', 'opening', verdict));
      }
      for (const e of arcByIndex.get(i) ?? []) {
        // Review has no think pause: the question and its answer run on as one
        // line (the arc's "‖" was reaching the review's text).
        facets.push(fact('gameArcSteps', 'plan-arc', e.text, { squares: e.squares, incoming: e.seat === 'opponent' }));
      }
      if (fundamentals.length > 0) {
        if (isStudentForAttr) {
          const again = noteSlip(story, fundamentals[0].id, m.ply);
          const i = facets.findIndex((f) => f.tag === 'principle');
          if (again && i >= 0) facets[i] = reworded(facets[i], `${again}${facets[i].text}`);
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
      // (opening / plan-middlegame / opp-dev); keep every dynamic
      // per-move fact.
      // Build the kept list; some facets are REWRITTEN (structure → only its new
      // sub-claims) so this is a loop, not a pure filter.
      // 🔒 THE LEDGERS ARE WRITTEN AFTER THE DOOR, FOR SPOKEN FACTS ONLY (B4,
      // 2026-09-22). Every say-once set below used to be mutated HERE, while
      // building the candidate list — before `coachTurn()` collapsed, floored or
      // (on a familiar opening ply) silenced the whole beat. So a fact the
      // student never heard was ledgered as said, and its next appearance was
      // dropped as a repeat: the development plan consumed on a need-silenced
      // ply 1 was never spoken in the whole review. Now each branch CLAIMS
      // (dedupe within the ply, as before) and registers a COMMIT; the commits
      // run after the door and the quiet-ply gate, for the facts that spoke.
      const keptRaw: ReviewFacet[] = [];
      // THE KEY EACH KEPT FACET'S RECORDS ARE FILED UNDER — its producer's own
      // words, before any rewrite on its way here (WO-STORY-MATRIX-01 P1-5). A
      // facet REWRITTEN on its way to the door (the loose tail turned into the
      // habit) keeps every record coupled to it — squares, stakes, proof,
      // claims, identity, the incoming flag, its commit — by this key, so one
      // rewrite cannot drop a record it forgot to copy (the habit lost its
      // claims, and the door then heard it as a restatement and silenced it,
      // 2026-10-21). It replaced a copy of all seven maps under the new words.
      const keptKey: ReviewFacet[] = [];
      const claimedThisPly = new Set<string>();
      const commitByRaw = new Map<ReviewFacet, () => void>();
      const claim = (key: string): boolean => { if (claimedThisPly.has(key)) return false; claimedThisPly.add(key); return true; };
      // A REASON FORMULA IS SAID ONCE A GAME (lead 2026-10-20, Review noise
      // walk): "X is tied down now: you hit …", "Watch out — that … attacks
      // your …", "stand a knight's jump apart" — the second time on a new board
      // is the same lesson again. The verdict lanes (quality, tactic, threat,
      // the principle and its method) are per-move facts and stay.
      const keep = (raw: ReviewFacet, commit?: () => void, key: ReviewFacet = raw): void => {
        const formula = FORMULA_ONCE.has(raw.tag) ? reasonFormula(raw.text) : null;
        if (formula && formulasSaid.has(formula)) return;
        keptRaw.push(raw);
        keptKey.push(key);
        if (commit || formula) commitByRaw.set(raw, () => { commit?.(); if (formula) formulasSaid.add(formula); });
      };
      let verdictWordThisPly: string | null = null;
      // THE ONE PLAN THREAD — the same `planThreadTurn` Learn runs, on their
      // move: the stop with its proof, then at most one plan, held while it
      // stands. Review used to run its own loop over every plan the board
      // offered, which said two plans in one turn and changed a plan that still
      // stood (review tape 2026-10-15). Run on a copy; the copy becomes the
      // thread once one of its lines is spoken (commit after the door).
      const planTrial = story.plans().thread;
      // The plan's routes, hop by hop, drawn when its line speaks.
      const planRouteByRaw = new Map<ReviewFacet, ReadonlyArray<{ from: string; to: string; fen: string }>>();
      if (studentColorWB && !isStudentForAttr) {
        const povCp = m.evaluation != null ? (studentColorWB === 'w' ? m.evaluation : -m.evaluation) : null;
        // Their move follows the student's: the ply before is the student's own
        // (`planStepLine` checks the side to move on that board).
        const prevStudent = i > 0 && moves[i - 1] ? { fenBefore: fenChain[i - 1].fenBefore, san: moves[i - 1].san } : null;
        for (const r of readBoardAll('planThread', { thread: planTrial, ply: m.ply, fenBefore: fenPair.fenBefore, fenAfter: fenPair.fenAfter, student: studentColorWB, studentPovCp: povCp, studentMove: prevStudent, holdPlayable: false })) {
          // Review has no think pause: the question and its answer run on.
          const key = readKey(r);
          const raw = fact(r.computer, r.kind, r.text, {
            identity: key.startsWith('plan:stopped:') ? 'plan-thread:stop' : (key.startsWith('plan:step:') || key.startsWith('plan:their-step:')) ? 'plan-thread:step' : 'plan-thread:plan',
            proof: r.proof, squares: r.squares, incoming: r.seat === 'opponent',
          });
          facets.push(raw);
          if (r.marks?.route?.length) planRouteByRaw.set(raw, r.marks.route);
        }
      }
      // ONE PLAN A SIDE (Review baseline 2026-11-08, the Colle 14.Ng5: "Here
      // is what you build toward: an attack on their king. Your plan is to
      // advance your queenside pawn majority" — two plans pulling opposite
      // ways; held for that turn, the majority came back two plies later; the
      // Closed Sicilian 29…Rxc2: "your rook to e2 was a step of the plan" on
      // their weak h2 pawn, then "your plan is to advance your queenside pawn
      // majority", then "the plan changes here"). The orientation's plan is the
      // mover's (`buildMiddlegameOrientation` runs from the mover's seat); the
      // plan the game is following — the arc's and the plan thread's — outranks
      // that static read of the structure: on the turn it speaks and, once that
      // side has heard it, for the rest of the game (`PLAN_GOAL.arc`).
      {
        const moverSeat: 'student' | 'opponent' = moverColor === playerColor ? 'student' : 'opponent';
        const followedHere = facets.some((f) => f.seat === moverSeat && (f.tag === 'plan-arc'
          || (PLAN_THREAD_KINDS.has(f.tag) && (f.identity === 'plan-thread:plan' || f.identity === 'plan-thread:step'))));
        if (followedHere || threadStated(story.current(), threadKey(moverSeat, PLAN_GOAL.arc)) !== null) {
          for (let k = facets.length - 1; k >= 0; k -= 1) if (facets[k].tag === 'plan-middlegame') facets.splice(k, 1);
        }
      }
      const newPlan = planTrial.stated && planTrial.stated.ply === m.ply ? planTrial.stated.fact : null;
      const planPasserFile = newPlan?.kind === 'passer' ? (newPlan.squares[0]?.[0] ?? null) : null;
      // One claim, many lanes: a passer or conversion plan another lane already
      // taught this game is not stated again.
      const planLineHeld = (planPasserFile !== null && passerTaught(planPasserFile))
        || (newPlan?.kind === 'convert' && convertTaughtAt() !== null);
      const planNowPasserFiles = new Set(planPasserFile && !planLineHeld ? [planPasserFile] : []);
      const adoptPlanThread = (): void => {
        const thread = planLineHeld ? { ...planTrial, stated: null, lastStatedPly: null } : planTrial;
        story.setPlans(m.ply, { ...story.plans(), thread });
      };
      for (const f0 of facets) {
        let f = f0;
        // ONE LOOSE-PIECE HABIT A GAME, WHOEVER NAMES IT (prod Review
        // 2026-10-29: the habit computer said "two times now you've left a
        // piece loose" at ply 47, and the loose tail below said "that's the
        // second time you've left a piece with no guard" at ply 52). Once
        // either names it for a side, that side's loose pieces go quiet.
        {
          const owner0 = f0.tag === 'your-habit' ? 'your' : f0.tag === 'their-habit' ? 'their' : null;
          if (owner0 && f0.identity === `${owner0}-habit:loose`) {
            const owner = owner0;
            if (looseCount(owner) >= 2) continue;
            keep(f0, () => { looseSaid.add(`${owner}#1`); looseSaid.add(`${owner}#2`); });
            continue;
          }
        }
        {
          // The loose piece belongs to the side that did not move.
          const looseSq = f0.tag === 'does' || f0.tag === 'move-job' ? looseSquareOf(f0) : null;
          if (looseSq) {
            const owner: 'your' | 'their' = moverColor === playerColor ? 'their' : 'your';
            const n = looseCount(owner);
            if (n >= 2) continue;
            // A move the grader called sound is never a habit's evidence
            // (`soundPlies`, the habit computer's own rule): a piece left
            // loose by a sacrifice that holds is a fact, not a habit.
            if (n === 1 && !soundPlies.has(m.ply - 1)) {
              const habit = owner === 'their'
                ? "That's the second piece they've left with no guard this game. After every move of theirs, look first for what it leaves loose."
                : "That's the second piece you've left with no guard this game. Before every move, check what it leaves unguarded.";
              // The producer's own tail pattern, never a copy of its words.
              f = reworded(f0, `${f0.text.replace(INFLUENCE_LOOSE_TAIL_RE, '')} ${habit}`);
            }
            keep(f, () => { looseSaid.add(`${owner}#${n + 1}`); }, f0);
            continue;
          }
        }
        // A refuted alternative is said once per game (identity `refuted:<move>`).
        { const id = f.identity; if (id?.startsWith('refuted:') && (refutedSaid.has(id) || !claim(id))) continue; }
        // `once:` — a batch-1 fact said once per game (the opening this board is).
        { const id = f.identity; if ((id?.startsWith('hint:') || id?.startsWith('once:')) && (hintsSaid.has(id) || !claim(id))) continue; }
        // Positional VERDICT — atom-diffed. Speak the verdict WORD when it
        // changes, and only the REASONS not yet stated, so a growing edge adds
        // the new asset instead of re-reciting the pile every ply.
        if (f.tag === 'verdict') {
          const vm = /^\s*You're\s+([^:.]+?)(?::\s*(.*?))?\.?\s*$/.exec(f.text);
          if (!vm) { keep(f); continue; }
          const word = vm[1].trim();
          const reasons = vm[2] ? vm[2].split(/;\s*/).map((r) => r.trim()).filter(Boolean) : [];
          const freshReasons = reasons.filter((r) => !verdictReasonsSeen.has(r.toLowerCase()) && !claimedThisPly.has(`verdict-reason:${r.toLowerCase()}`));
          const wordChanged = word.toLowerCase() !== (verdictWordThisPly ?? lastVerdict(story.current()));
          if (!wordChanged && freshReasons.length === 0) continue; // nothing new
          freshReasons.forEach((r) => claimedThisPly.add(`verdict-reason:${r.toLowerCase()}`));
          verdictWordThisPly = word.toLowerCase();
          const why = freshReasons.length ? `: ${freshReasons.join('; ')}` : '';
          keep(reworded(f, `You're ${word}${why}.`), () => {
            freshReasons.forEach((r) => verdictReasonsSeen.add(r.toLowerCase()));
            story.note(m.ply, [{ kind: 'verdict', word: word.toLowerCase() }]);
          });
          continue;
        }
        // Plans — the one thread's lines (above).
        if (PLAN_THREAD_KINDS.has(f.tag)) {
          const role = f.identity;
          // A spoken plan or step is the plan this side's game follows: the
          // static structure plan stays quiet for that side from here (ONE PLAN
          // A SIDE, above).
          const followed = { key: threadKey(f.seat === 'opponent' ? 'opponent' : 'student', PLAN_GOAL.arc), kind: 'stated' as const };
          if (role === 'plan-thread:plan') {
            if (planLineHeld) continue;
            keep(f, () => {
              adoptPlanThread();
              story.commitThreads(m.ply, [followed]);
              if (newPlan?.kind === 'convert') story.commitThreads(m.ply, [{ key: CONVERT_THREAD, kind: 'stated' }]);
              if (planPasserFile) story.commitThreads(m.ply, [{ key: passerThread(planPasserFile), kind: 'stated' }]);
            });
          } else if (role === 'plan-thread:stop') {
            keep(f, adoptPlanThread);
          } else if (role === 'plan-thread:step') {
            keep(f, () => story.commitThreads(m.ply, [followed]));
          } else {
            // Another plan computer's line through the one registry (the king
            // walked by hand, 2026-11-04): said once by its own ledger key,
            // never silently dropped for not being the plan thread's.
            keep(f);
          }
          continue;
        }
        // The RACE — once, then only when the verdict FLIPS (the race thread).
        if (f.tag === 'plan-race') {
          const verdict = /they get there first|they got there first|they would get there first/i.test(f.text) ? 'them' : 'you';
          if (threadVariant(story.current(), RACE_THREAD) === verdict || !claim(`race:${verdict}`)) continue;
          keep(f, () => { story.commitThreads(m.ply, [{ key: RACE_THREAD, kind: 'stated', variant: verdict }]); });
          continue;
        }
        // STANDING teaching read (live tactic / undefended piece / count /
        // royal-fork target / rook-on-7th) — taught ONCE per game by signature.
        if (conversionFacets.has(f)) {
          if (convertTaughtAt() !== null || !claim('convert')) continue;
          keep(f, () => { story.commitThreads(m.ply, [{ key: CONVERT_THREAD, kind: 'stated' }]); });
          continue;
        }
        {
          const pf = f.tag === 'passer' ? (/passed pawn on ([a-h])[1-8]/i.exec(f.text)?.[1] ?? null)
            : f.tag === 'plan-arc' ? (/^The plan for you here: pushing the passed pawn on the ([a-h])-file/i.exec(f.text)?.[1] ?? null) : null;
          if (pf) {
            // The full plan outranks the one-line note and the arc for the same
            // pawn: when it is on this ply, they defer to it.
            if (passerTaught(pf) || planNowPasserFiles.has(pf) || !claim(`passer:${pf}`)) continue;
            keep(f, () => story.commitThreads(m.ply, [{ key: passerThread(pf), kind: 'stated' }, { key: threadKey(f.seat === 'opponent' ? 'opponent' : 'student', PLAN_GOAL.arc), kind: 'stated' }]));
            continue;
          }
        }
        // The plan the game follows, once heard, keeps its side's static
        // structure plan quiet (`PLAN_GOAL.arc`, above).
        if (f.tag === 'plan-arc') {
          const seat: 'student' | 'opponent' = f.seat === 'opponent' ? 'opponent' : 'student';
          keep(f, () => story.commitThreads(m.ply, [{ key: threadKey(seat, PLAN_GOAL.arc), kind: 'stated' }]));
          continue;
        }
        if (STANDING_STATE_TAGS.has(f.tag)) {
          const sig = standingSig(f);
          // …and by its GEOMETRY: a battery and a discovery in waiting on the
          // same three squares are one line (`tacticGeometryKey`).
          const geo = f.tag === 'tactic' ? tacticGeometryKey(f.squares) : null;
          if (standingSpoken.has(sig) || (geo && standingSpoken.has(geo)) || !claim(`standing:${sig}`) || (geo && !claim(geo))) continue;
          keep(f, () => { standingSpoken.add(sig); if (geo) standingSpoken.add(geo); });
          continue;
        }
        // Structure: speak only the sub-claims not yet taught this game — and
        // never an outpost the POSITIONAL VERDICT already named on this same
        // ply (David 2026-09-15, reading the real review: "your knight sits on a
        // protected outpost on d4 … Your knight sits on an outpost at d4"). Two
        // computers, one fact, one sentence.
        if (f.tag === 'structure') {
          const outpostSquaresAlreadySaid = new Set(
            keptRaw.filter((k) => /outpost/i.test(k.text)).flatMap((k) => k.text.match(/\b[a-h][1-8]\b/g) ?? []),
          );
          const fresh = freshStructureFacet(f.text, outpostSquaresAlreadySaid, claimedThisPly);
          if (fresh) keep(reworded(f, fresh.text), () => { for (const a of fresh.atoms) structAtomsSeen.add(a); });
          continue;
        }
        // "Their king is stuck in the centre" is taught at most ONCE per game —
        // it's a standing observation, robotic to repeat every ply it holds.
        if (f.tag === 'king') {
          if (flags.has('kingCenterTaught') || !claim('king')) continue;
          keep(f, () => { flags.add('kingCenterTaught'); });
          continue;
        }
        // A sacrifice's COMPENSATION profile is shared across a combination —
        // state it once per game (by signature); later sacs are still NAMED via
        // their own [sac-why] mechanism facet, which is dynamic per move.
        if (f.tag === 'sac') {
          const sig = standingSig(f);
          if (sacSpoken.has(sig) || !claim(`sac:${sig}`)) continue;
          keep(f, () => sacSpoken.add(sig));
          continue;
        }
        // Development nags: once per review by TAG (David 2026-07-22).
        if (f.tag === 'opp-dev') {
          const tag = f.tag;
          if (oneShotTags.has(tag) || !claim(`oneshot:${tag}`)) continue;
          keep(f, () => oneShotTags.add(tag));
          continue;
        }
        // [endgame] joins the static set (walk 5, R22): "The position is a
        // rook endgame…" spoke on all ten plies of the ending. Keyed on the
        // exact string, so the class still speaks again when it CHANGES
        // (rook ending → king-and-pawn ending).
        if (STATIC_TAGS.has(f.tag)) {
          const key = staticKey(f);
          if (emittedStaticFacets.has(key) || !claim(`static:${key}`)) continue;
          keep(f, () => emittedStaticFacets.add(key));
          continue;
        }
        keep(f);
      }
      const claimedRefrains = new Set<number>();
      const refrained = keptRaw.map((raw) => refrainOnce(raw.text, claimedRefrains));
      const kept = keptRaw.map((raw, k) => reworded(raw, refrained[k].text));
      // A spoken line back to its fact: the door hands back its words.
      const keptByText = new Map<string, ReviewFacet>();
      for (const f of kept) if (!keptByText.has(f.text)) keptByText.set(f.text, f);
      // THE DOOR'S FACTS (WO-STORY-MATRIX-01 P1-5): each kept facet as the one
      // fact shape, its records read off the producer's maps by the key it was
      // filed under — the refrain-once pass and the loose rewrite change the
      // words, never the key — and riding on the fact from here on. Deleted
      // when the facets are emitted as `CoachFact` (P1-6d).
      // A [rule] fact that restates a facet (the passed-pawn rule beside the
      // [passer] read of the same pawn) takes that facet's kind, so the door's
      // subsumption sees ONE claim. The join is FUNDAMENTAL_CLAIM_FAMILY.
      // Review names no move the student has yet to find: the game is over.
      const facetFacts: ReviewFacet[] = [];
      {
        const seen = new Set<string>();
        for (const f of kept) {
          if (seen.has(f.id)) continue;
          seen.add(f.id);
          facetFacts.push(f);
        }
      }
      // KEY-SQUARE HIGHLIGHTS (David 2026-09-13): the squares the board lights
      // are the spoken facts' own squares, read after the door (`litSaid`, below).
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
      const realCpLossCp: number | null = recordedMoveCost(m, moverColor);
      // ONE DOOR (David 2026-09-16: "I want one unified deciding computer").
      // Importance, this student's need, subsumption, the floor and the order
      // are a SINGLE call now — review does not compose them itself, so it
      // cannot drift from the surface that adopts the decider next.
      const habitScratch = new Set(spokenHabits);
      const decision = coachTurn({ signals: {
          decision: null,          // no per-ply criticality scan in the review pass
          cpLossCp: realCpLossCp,
          threatNet: 0,
          teachingBeat: fundamentalLed || !!causalLead,
          evalCpWhitePov: m.evaluation ?? null,
          wdl: null,
        }, student: {
          rating: rating ?? DEFAULT_STUDENT_RATING,
          weaknesses: studentWeaknesses ?? [],
          // THE STUDENT TERM FOR THE RANKER — red or grey, raise-only, applied
          // by `computeImportance` under `rank > 0` so it re-weights a moment a
          // computer already produced and never manufactures one.
          momentBoost: boostByPly.get(m.ply) ?? NO_BOOST,
          layers,
          fade,
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
        }, bundle: {
          facts: facetFacts,
          // THE BOARD AFTER THIS PLY — a recapture pending, or mate for the
          // side to move (`boardState`). Review had no such guard at all: "You're
          // a piece up" one ply before the piece was taken back.
          board: boardStateAfter(fenPair.fenBefore, m.san, m.fenAfter, m.evaluation ?? null),
        },
        // REVIEW IS A WALK: the student asked to be taken through the game, so a
        // quiet moment is a shorter beat, never a skipped one. Gating review on
        // the live-surface importance check cut this game to 6 narrated plies.
        posture: 'walk',
        // HOW TO THINK, not just what happened (David 2026-09-16). The signals
        // are ones this loop already holds — the attributor's own
        // `ignored-threat` finding, the cost, the move that was there — so the
        // habit is earned by a computed condition, never generic advice.
        method: {
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
          // The slip, as the verdict read it (`errorWhy`): the habit beat asks
          // the thinking step it failed, Learn's own slip question.
          slip: studentColorWB && (verdictReasonOut.lostSquare || verdictReasonOut.guardLeft)
            ? { fenBefore: fenPair.fenBefore, san: m.san, lostSquare: verdictReasonOut.lostSquare ?? null, guardLeft: verdictReasonOut.guardLeft ?? null, student: studentColorWB, punishLine: m.pv?.afterPlayed?.length ? { fen: fenPair.fenAfter, uci: m.pv.afterPlayed } : null }
            : null,
          // The leading fundamental that already IS a habit's lesson.
          habitByFact: new Map(kept
            .filter((f) => f.tag === 'principle')
            .flatMap((f) => fundamentals.flatMap((fd) => (fd.id in FUNDAMENTAL_HABIT ? [[f.text, FUNDAMENTAL_HABIT[fd.id]] as const] : [])))),
        } });
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
        const isPrinciple = (t: string): boolean => keptByText.get(t)?.tag === 'principle';
        const principle = orderedKept.filter(isPrinciple);
        if (principle.length > 0) orderedKept = [...principle, ...orderedKept.filter((t) => !isPrinciple(t))];
      }
      // ONE HABIT A TURN — Learn's door rule, one coach (Learn 2026-10-20;
      // Review baseline 2026-11-08: the Ng5 blunder closed on "Blunder check …
      // run CCT for them" AND "Next time: end every move with a count", each
      // with its own "Here the answer was …"). A part teaches a habit when its
      // tag's step is the habit, or it is a board rule carrying a `method:`
      // claim (the blunder check, the autopilot guard — Review dropped the
      // claim and spoke them as body). The turn keeps one: the fundamental's
      // how behind this move, else the slip's own question, else the first.
      // This game's pattern lines (your-habit, their-habit) say what happened
      // here and stay; two fundamentals the move broke each keep their how
      // (one part, `renderFundamentalVerdict`).
      const tagOfPart = (part: string) => (part === decision.method ? 'method' as const : keptByText.get(part)?.tag);
      const idOfPart = (part: string): string | undefined => { const at = kept.findIndex((f) => f.text === part); return at >= 0 ? keptKey[at].identity : undefined; };
      const teachesHabit = (part: string): boolean => {
        const tag = tagOfPart(part);
        return (!!tag && stepOf(tag, 'student') === 'habit') || (idOfPart(part)?.startsWith('hint:method:') ?? false);
      };
      const GAME_PATTERN_TAGS: ReadonlySet<string> = new Set(['your-habit', 'their-habit']);
      {
        const habits = orderedKept.filter((part) => teachesHabit(part) && !GAME_PATTERN_TAGS.has(tagOfPart(part) ?? ''));
        if (habits.length > 1) {
          const rank = (part: string): number => (tagOfPart(part) === 'how' ? 0 : idOfPart(part)?.startsWith('hint:method:') ? 1 : 2);
          const winner = [...habits].sort((a, b) => rank(a) - rank(b))[0];
          orderedKept = orderedKept.filter((part) => part === winner || !habits.includes(part));
        }
      }
      // The causal chain LEADS the beat when present (it's the cross-move story).
      const rankedParts = causalLead ? [causalLead, ...orderedKept] : orderedKept;
      // NO WORD CAP (David 2026-10-15: "No hard word count caps. Set the cap as
      // an average, not a hard limit"). The door's ranking decides what speaks;
      // the audit holds the AVERAGE turn length, never a per-ply limit.
      const uncappedParts = rankedParts;
      // The door's fact keys, before any later rewrite, for the fade lookup.
      const doorKeys = [...uncappedParts];
      // The squares each spoken line's fact carries — after the door the walk
      // still speaks facet words (until P1-6d), so a line finds its fact's
      // squares by them, as the fade does.
      const spokenSquaresOf = new Map(facetFacts.filter((f) => f.squares.length > 0).map((f) => [f.text, f.squares] as const));
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
          classification: m0.classification,
          evalBefore: m.preMoveEval,
          evalAfter: m.evaluation,
          bestMoveSan,
          bestMoveUci: m.bestMove,
          narration: null,
          narrationSource: null,
          ...(needHere ? { need: needHere } : {}),
        });
        try {
          prevCap = afterCapture(prevCap, new Chess(fenPair.fenBefore).move(m.san));
        } catch {
          prevCap = NO_PREV_CAPTURE;
        }
        continue;
      }
      // THE COMMIT (B4): only now — past the door and past the quiet-ply gate
      // — do the say-once ledgers learn what was said, and only for the facts
      // in `decision.spoken`. A fact the door collapsed or floored, and every
      // fact on a ply the need gate silenced, stays unsaid and may speak later.
      {
        // What SPOKE is what survived the turn's length too, not the door's
        // list — an evicted fact is not said and must stay free to speak later.
        const spokenSet = new Set(uncappedParts);
        keptRaw.forEach((raw, i) => {
          if (!spokenSet.has(kept[i].text)) return;
          commitByRaw.get(raw)?.();
          facetCommits.get(keptKey[i])?.();
          // The plan that spoke shows its routes (David 2026-10-15: "Arrows trace its route?").
          const route = planRouteByRaw.get(keptKey[i]);
          if (route && !(causalArrows && causalArrows.length)) {
            causalArrows = admitArrows(route.map((a): ArrowClaim => ({ from: a.from, to: a.to, role: 'line', fen: a.fen, source: 'review.planRoute' })), { fen: fenPair.fenAfter, studentColor: playerColor ?? moverColor }).arrows;
          }
          for (const c of refrained[i].claims) spokenRefrains.add(c);
        });
        if (decision.method !== null && uncappedParts.includes(decision.method)) for (const h of habitScratch) spokenHabits.add(h);
        // THE STRUCTURED COMMITS (WO-TEACH-02), for facts that SPOKE:
        //  • rule:<id>  — the principle is now taught; it will not speak again;
        //  • motif:<t>  — S6 transfer: a tactic whose motif was spoken at an
        //    earlier move names that move ("same idea as move 12").
        for (let k = 0; k < uncappedParts.length; k += 1) {
          const at = kept.findIndex((f) => f.text === uncappedParts[k]);
          const identity = at >= 0 ? keptKey[at].identity : undefined;
          if (!identity) continue;
          if (identity.startsWith('rule:')) { for (const k of identity.slice(5).split('|')) principlesTaught.add(k); continue; }
          if (identity.startsWith('refuted:')) { refutedSaid.add(identity); continue; }
          if (identity.startsWith('hint:') || identity.startsWith('once:')) { hintsSaid.add(identity); continue; }
          // ONLY a tactic motif transfers (`transferMotifOf`).
          // `motif:<type>:<squares>` — the squares make it THIS instance, so a
          // standing tactic is never "the same idea as move N" of itself.
          const tm = transferMotifOf(identity);
          if (!tm) continue;
          const { motif, instance } = tm;
          uncappedParts[k] = withTransfer(uncappedParts[k], transferClause(motif, instance, fullMove, motifLastSpoken));
          recordMotif(motif, instance, fullMove, motifLastSpoken);
          motifKeys.add(`${motif}|${fullMove}|${instance}`);
        }
      }
      // THE GAME ENDED ON THIS MOVE (review of chesscom-1040709576, 2026-10-13:
      // the mating Qxh2# was narrated as a battery and "your plan is to advance
      // your kingside pawn majority"). The mate is the whole beat — every other
      // board fact describes a game that is over.
      if (/#$/.test(m.san)) uncappedParts.splice(0, uncappedParts.length, deliveredMateNarration(fenPair.fenAfter, moverColor === playerColor));
      // Said SHORTER where the student has shown the skill — one fade rule
      // with Learn (David 2026-10-17: shorten, never silence a reason).
      // Each spoken fact carries its own squares, cut with its words by the
      // fade (`cutMarksWithWords`) and again by the package's trim — so the
      // board lights the squares of what is SAID, never of a fact the door
      // quieted (the key squares were the facets kept BEFORE the door).
      const doorFacts = uncappedParts.map((text, k) => {
        const key = doorKeys[k] ?? '';
        const said = fadeText(text, decision.faded.get(key) ?? null);
        const own = spokenSquaresOf.get(key) ?? [];
        const squares = said === text ? [...own] : cutMarksWithWords(text, said, { squares: own }, fenPair.fenAfter, null).squares;
        // The causal chain leads (`rankedParts`): its sight-line arrows are
        // drawn only while its words are kept (`causalSaid`, below).
        return { kind: 'computed' as const, text: said, fen: fenPair.fenAfter, altFen: fenPair.fenBefore, squares, ...(causalLead && k === 0 ? { causalChain: true as const } : {}) };
      });
      // The squares the board lights for this ply, each with its sentence.
      const litSaid: Array<{ square: string; said: string }> = [];
      // The causal chain's sentence, when the package kept it — the chain's
      // arrows are its marks (marks sweep 2026-11-08: a chain the door or the
      // package dropped still drew every sight line, with no words for them).
      let causalSaid: string | null = null;
      const speakDoor = (facts: typeof doorFacts): string | null => {
        if (facts.length === 0) return null;
        const pkg = buildVoicePackage(facts, undefined, reviewSpokenKeys);
        for (const f of pkg.kept) for (const sq of f.squares ?? []) if (!litSaid.some((x) => x.square === sq)) litSaid.push({ square: sq, said: f.text });
        for (const f of pkg.kept) if ('causalChain' in f && f.causalChain === true) causalSaid = f.text;
        for (const k of spokenSentenceKeys(pkg)) reviewSpokenKeys.add(k);
        reviewPkgTally.parts += facts.length;
        for (const d of pkg.dropped) {
          reviewPkgTally.dropped += 1;
          reviewPkgTally.reasons[d.reason] = (reviewPkgTally.reasons[d.reason] ?? 0) + 1;
          reviewPkgTally.drops.push({ ply: m.ply, reason: d.reason, text: d.fact.text.slice(0, 200) });
        }
        return pkg.spoken || null;
      };
      if (uncappedParts.length > 0) reviewPkgTally.plies += 1;
      // THE HABIT CLOSES THE TURN (WO-ONE-COACH-01, his order: the move, the
      // choices, not yet, the line played out, then the habit). The line is
      // added after this walk (`augmentWithProjections`), so the habit-step
      // facts (the fundamental's how, the method beat, their habit and yours)
      // are held as the segment's tail and said once the line is in. A ply
      // whose only words are the habit says it now — nothing comes before.
      const isHabit = teachesHabit;
      const bodyNarration = speakDoor(doorFacts.filter((_, k) => !isHabit(uncappedParts[k])));
      const habitNarration = speakDoor(doorFacts.filter((_, k) => isHabit(uncappedParts[k])));
      const doorNarration = bodyNarration ?? habitNarration;
      const habitTail = bodyNarration && habitNarration ? habitNarration : null;
      segments.push({
        ply: m.ply,
        moveNumber: fullMove,
        san: m.san,
        playerColor: moverColor,
        fenBefore: fenPair.fenBefore,
        fenAfter: fenPair.fenAfter,
        classification: m0.classification,
        evalBefore: m.preMoveEval,
        evalAfter: m.evaluation,
        bestMoveSan,
        bestMoveUci: m.bestMove,
        narration: doorNarration,
        ...(habitTail ? { habitTail } : {}),
        narrationSource: doorNarration ? 'per-move' : null,
        ...(m.classification === 'mistake' || m.classification === 'blunder' ? recordLinesOf(m) : {}),
        ...(doorNarration ? { teaches: decision.teaches } : {}),
        ...(needHere ? { need: needHere } : {}),
        ...(causalArrows && causalArrows.length && causalSaid ? { planArrows: causalArrows, planArrowsSaid: causalSaid } : {}),
        ...(fundamentals.length ? { fundamentals } : {}),
        ...(litSaid.length ? { keySquares: litSaid.map((x) => x.square), keySquareSaid: litSaid.map((x) => x.said) } : {}),
        ...(verdictReasonOut.text ? { verdictReason: verdictReasonOut.text } : {}),
        ...(verdictReasonOut.playedLine ? { verdictPlayedLine: true } : {}),
        ...(verdictReasonOut.punishSan ? { verdictPunishSan: verdictReasonOut.punishSan } : {}),
        ...(doorNarration && decision.proofOf.size ? { proofs: [...decision.proofOf.values()] } : {}),
        ...(doorNarration ? { spokenSquares: doorKeys.flatMap((k) => { const sq = spokenSquaresOf.get(k); return sq ? [sq] : []; }) } : {}),
        // A LINE A KEPT FACT SAYS IS PLAYED ON THE BOARD, as Learn draws a kept
        // fact's lines (`keptLines`): the voice says its shape, the board
        // walks every move of it (marks sweep 2026-11-08).
        ...(doorNarration ? spokenLineOf(keptKey) : {}),
      });
      try {
        prevCap = afterCapture(prevCap, new Chess(fenPair.fenBefore).move(m.san));
      } catch {
        prevCap = NO_PREV_CAPTURE;
      }
      continue;
    }
    // The sentences about the move NOT played (the better move's reason) —
    // the past-tense pass leaves exactly these alone: "Bxe5 … it wins their
    // knight on e5" is a counterfactual, never "It won their knight" (review
    // depth eval 2026-10-28).
    const counterfactual: string[] = [];
    // The punishing replies already said on this ply (by their first move), so
    // the later line passes never say the same claim again.
    const blowsSaid = new Set<string>();
    // WHICH REASON the student's costly move got (WO-DECIDER-02 decision row):
    // allowed (what it let them do), missed (what the better move did),
    // positional (the concession or principle), or none.
    let costReason: 'allowed' | 'missed' | 'positional' | 'none' | null = null;
    let whySpoken = false;
    /** The fundamental's habit, said after everything else on the move. */
    let habitTail: string | null = null;
    let failedSpoken = false;
    let concessionSpoken = false;
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
      costCp: m.costCp ?? null,
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
      // ONE REASON PER MOVE (WO-DECIDER-02, 2026-10-28). A fundamental that
      // proves the material the move cost — it plays the punishing line,
      // keyed by its first blow — IS why the move cost what it did; a second
      // flaw on the same move (a tempo handed, say) is not, and speaking both
      // gave every costly move two habits to fix. The others stay on the
      // student's record (the attribution is filed, never dropped).
      const reasons = fundamentals.filter((f) => typeof f.facts.blow === 'string');
      const spokenFundamentals = reasons.length > 0 ? reasons : fundamentals;
      const { diagnosis: verdict, how } = renderFundamentalVerdict(spokenFundamentals, { ply: m.ply, seen: seenFundamentals, replySan: moves[i + 1]?.san ?? null });
      // The habit closes the turn, after everything the move says (WO-ONE-COACH-01).
      if (how) habitTail = how;
      // ONE REASON PER MOVE (WO-DECIDER-02, 2026-10-28). A fundamental that
      // plays the punishing line itself ("That walks into a tactic: they play
      // Nxc6 … they win a knight") IS the reason; the engine-line note
      // ("it goes Nxc6 — exactly that") and the error reader's "it let them
      // win material, starting with Nxc6" are the same claim and stay quiet.
      // The claim is keyed by its first blow, never by the prose.
      const bareSan = (x: string): string => x.replace(/^…/, '').replace(/[+#!?]+$/, '');
      const blows = new Set(reasons.map((f) => String(f.facts.blow)).map(bareSan));
      const pvEvidence = renderPvEvidence(spokenFundamentals.filter((f) => typeof f.facts.blow !== 'string'));
      const failedRaw = errorWhyFor({ secondReads: recordSecondReads(m.pv), costCp: m.costCp ?? null, fenBefore: fenPair.fenBefore, playedSan: m.san, moverColor, replyLineUci: m.pv?.afterPlayed ?? null, quality: m.classification });
      const failed = failedRaw?.blow && blows.has(bareSan(failedRaw.blow)) ? null : failedRaw;
      // …and the engine-line note ("it goes Rxb6 — exactly that") beside the
      // error reader naming the same first reply ("That left your pawn on b6
      // hanging — their rook on f6 just takes it") is one claim too: the
      // concrete one stays (review depth eval 2026-10-28, ply 72).
      const pvFirst = spokenFundamentals.filter((f) => typeof f.facts.blow !== 'string').find((f) => f.evidence.pvMoves.length > 0)?.evidence.pvMoves[0] ?? null;
      const pvEvidenceSaid = failed?.blow && pvFirst && bareSan(failed.blow) === bareSan(pvFirst) ? null : pvEvidence;
      for (const b of [...blows, failed?.blow ?? null, pvEvidenceSaid ? pvFirst : null]) if (b) blowsSaid.add(bareSan(b));
      const concession = describeConcessions(fenPair.fenBefore, m.san, true);
      // ONE cost reader: the one-search price when the review recorded it (the
      // flag line says the same number), the eval delta only as its fallback.
      const swingCp = m.preMoveEval != null && m.evaluation != null
        && Math.abs(m.preMoveEval) < 15000 && Math.abs(m.evaluation) < 15000
        ? recordedMoveCost(m, moverColor) : null;
      const cost = swingCp != null && swingCp >= 50
        ? `That cost ${costWords(swingCp)}.`
        : null;
      // ONE why-it-failed per beat: when `failed` already says what the move
      // left, the better move's reason is asked for WITHOUT the played move
      // (no playedSan), or the same mechanism is said twice (free board,
      // Najdorf Zagreb jMVMo1Ua: "That left your knight on b5 hanging" ×2).
      const why = bestMoveSan ? explainBestMoveGrounded(fenPair.fenBefore, failedRaw?.line ? null : m.san, m.bestMove, moverColor, null, m.pv ? { afterPlayed: m.pv.afterPlayed ?? null, afterBest: m.pv.afterBest ?? null, ...(m.pv.earlierPlayed ? { earlierPlayed: m.pv.earlierPlayed } : {}), ...(m.pv.earlierBest ? { earlierBest: m.pv.earlierBest } : {}) } : null, isStudentForAttr ? 'mover' : 'other-side') : null;
      const better = bestMoveSan ? `The move was ${bestMoveSan}.${why ? ` ${why}` : ''}` : null;
      if (why) counterfactual.push(why);
      if (isStudentForAttr && (m.classification === 'mistake' || m.classification === 'blunder')) {
        costReason = reasons.length > 0 || failed || pvEvidenceSaid ? 'allowed' : why ? 'missed' : (verdict || concession) ? 'positional' : 'none';
      }
      // ONE ANSWER, ONE CLAIM (Colle replay 2026-11-05, 20.Qxf4): a
      // diagnosis naming the answer of theirs the error line already plays out
      // ("…f6, which attacks your bishop") is that line's to say; the rule
      // keeps only its habit (`habitTail`).
      const verdictSaid = failed?.proofLine?.uci[0] && sameReplyAsGrade(
        fundamentalReply(spokenFundamentals[0]?.evidence.moves ?? [], fenPair.fenBefore, m.san),
        { fen: failed.proofLine.fen, uci: failed.proofLine.uci[0] },
      ) ? null : verdict;
      narration = [verdictSaid, pvEvidenceSaid, failed?.line ?? null, concession, cost, better]
        .filter((x): x is string => !!x && x.trim().length > 0)
        .join(' ');
    }
    // Append the GROUNDED "why the best move is best" clause — chess.js
    // board truth only, never LLM-guessed (David 2026-06-05). Only on the
    // student's flagged errors, only when there's a genuine distinct best
    // move, and only when a board fact is provable.
    // The played move's failure is said once, below (`errorWhyFor`) — the
    // best move's reason here never repeats it (no playedSan when it will be).
    const studentFlag = !fundamentalLed && (playerColor ? moverColor === playerColor : !m.isCoachMove)
      && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy');
    const failedBelow = studentFlag && narration
      ? errorWhyFor({ secondReads: recordSecondReads(m.pv), costCp: m.costCp ?? null, fenBefore: fenPair.fenBefore, playedSan: m.san, moverColor, replyLineUci: m.pv?.afterPlayed ?? null, quality: m.classification })
      : null;
    if (!fundamentalLed && narration && bestMoveSan && !m.isCoachMove && (m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'inaccuracy' || m.classification === 'miss')) {
      // Seated for the listener: on the opponent's slip the reason is THEIR
      // move's, said to the student (92 of 99 false claims, 2026-10-28).
      const why = explainBestMoveGrounded(fenPair.fenBefore, failedBelow ? null : m.san, m.bestMove, moverColor, null, m.pv ? { afterPlayed: m.pv.afterPlayed ?? null, afterBest: m.pv.afterBest ?? null, ...(m.pv.earlierPlayed ? { earlierPlayed: m.pv.earlierPlayed } : {}), ...(m.pv.earlierBest ? { earlierBest: m.pv.earlierBest } : {}) } : null, isStudentForAttr ? 'mover' : 'other-side');
      if (why) { narration = `${narration} ${why}`; counterfactual.push(why); whySpoken = true; }
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
        if (failedBelow) {
          narration = `${narration} ${failedBelow.line}`;
          failedSpoken = true;
          if (failedBelow.blow) blowsSaid.add(failedBelow.blow.replace(/^…/, '').replace(/[+#!?]+$/, ''));
        }
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
      if (concession) {
        narration = `${narration} ${concession}`;
        concessionSpoken = true;
      }
    }
    if (!fundamentalLed && narration && isStudentForAttr && (m.classification === 'mistake' || m.classification === 'blunder')) {
      costReason = failedSpoken ? 'allowed' : whySpoken ? 'missed' : concessionSpoken ? 'positional' : 'none';
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
          // …and only when the mover had a cheaper choice: a loss every legal
          // move shares (the queen pinned to the king, a check that also hits
          // the queen) is damage limitation, never "a stunning sacrifice".
          if (oppWins - capVal >= 1 && (lossBeyondBestAlternative(fenPair.fenBefore, m.san) ?? 1) >= 1) {
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
      let comp = isStudentSac && !flags.has('sacCompShown')
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
      if (flags.has('kingCenterTaught')) comp = comp.filter((c) => !/stuck in the cent/i.test(c));
      if (comp.length > 0) flags.add('sacCompShown');
      if (comp.some((c) => /stuck in the cent/i.test(c))) flags.add('kingCenterTaught');
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
      // Never the why of a sac the grade says failed (review walk 2026-10-01, ply 38).
      const sacFailed = m.classification === 'mistake' || m.classification === 'blunder' || m.classification === 'miss';
      const kingShieldClause = isStudentSac && !mechanismClause && !sacFailed
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
    const segmentSpokenSquares: string[][] = [];
    // THREAT ARROWS (David 2026-07-24: "no threat detection" — it fired in audio
    // but nothing was drawn). Show the threatened move on the board: GREEN for the
    // student's own threat (your attack), RED for the opponent's (the danger),
    // plus fork rays to the victim squares. Rides the segment's planArrows slot,
    // which the board already renders when no walkout overlay is active.
    let threatArrows: ReviewMoveSegment['planArrows'];
    if (playerColor && moverColor === playerColor) {
      const threat = describeStudentThreat(fenPair.fenBefore, fenPair.fenAfter, playerColor === 'white' ? 'w' : 'b');
      if (threat) {
        const sentence = narration ? ` And ${threat}.` : `${openSentence(threat)}.`;
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
            const yours = tc ? admitArrow({ from: tc.from, to: tc.to, role: 'play', fen: nullFen, source: 'review.yourThreat' }, { fen: fenPair.fenAfter, studentColor: playerColor }) : null;
            if (yours) threatArrows = [yours];
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
      if (!tradeIdea && !flags.has('tradeIdeaSpoken')) {
        const tc = describeTradeConsequence(fenPair.fenBefore, m.san, true, studentPovForTrade);
        if (tc) {
          narration = narration ? `${narration} ${tc}.` : `${openSentence(tc)}.`;
          narrationSource = narrationSource ?? 'per-move';
          flags.add('tradeIdeaSpoken');
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
        segmentSpokenSquares.push([oppThreat.from, oppThreat.landing, ...oppThreat.targetSquares]);
        const nextBest = i + 1 < usable ? uciToSanAt(moves[i + 1].bestMove, fenPair.fenAfter) : null;
        if (nextBest) {
          const prevention = describeThreatPrevention(fenPair.fenAfter, oppThreat, nextBest, oppWB);
          if (prevention) callOut += ` The answer: ${prevention}.`;
        }
        narration = narration ? `${narration} ${callOut}` : callOut;
        narrationSource = narrationSource ?? 'per-move';
        // Draw the danger (red): the threatened move from → landing, plus a ray
        // to each fork victim so the eye lands on what's under attack.
        // Their move is a plan of theirs (a fork lands quietly, so it is not a
        // capture that wins now); the rays to what it hits are sight lines on
        // the board AFTER it lands — the piece is not on the landing square yet.
        const threatCtx = { fen: fenPair.fenAfter, studentColor: playerColor };
        let landedFen: string | null = null;
        try { const lc = new Chess(fenPair.fenAfter); if (lc.move({ from: oppThreat.from, to: oppThreat.landing, promotion: 'q' })) landedFen = lc.fen(); } catch { landedFen = null; }
        threatArrows = admitArrows([
          { from: oppThreat.from, to: oppThreat.landing, role: 'theirs', vouchedBy: 'engine', source: 'review.oppThreat' },
          ...(landedFen ? oppThreat.targetSquares.map((sq): ArrowClaim => ({ from: oppThreat.landing, to: sq, role: 'vision', fen: landedFen, source: 'review.oppThreat.ray' })) : []),
        ], threatCtx).arrows;
      }
    }
    // OPPONENT-PSYCHOLOGY read (Danya register #14: "once one side starts to
    // decline, more mistakes appear"). When the opponent errs on CONSECUTIVE
    // moves, note the unravelling ONCE — a real pattern from the classification
    // sequence (G0), which the house voice then phrases. Only the opponent's own
    // flagged moves; the flag narration already exists to append to.
    const thisIsOppError = moverColor !== playerColor
      && (m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder');
    if (narration && narrationSource === 'flag' && thisIsOppError && lastOpponentWasError && !flags.has('psychologyReadDone')) {
      narration = `${narration} And once your opponent started slipping, the mistakes are snowballing.`;
      flags.add('psychologyReadDone');
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
    // The opening's developing plan (from the player's games, master games,
    // the repertoire's key ideas) is opening theory: Review's Theory button
    // says it (`reviewOpeningTheory`, David 2026-11-06), never the walk.
    // (b) Middlegame orientation (structure anchor + both-sides plans), fired
    // once at/after the middlegame threshold. Takes priority over the per-move
    // opening note in that zone; silent when no clear structural plan exists.
    if (
      narration === null
      && !isConcreteMove
      && studentColorWB !== null
      && !flags.has('orientationShown')
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
      if (orientation) { narration = orientation.text; planArrows = orientation.arrows; flags.add('orientationShown'); narrationSource = 'orientation'; }
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
      && !flags.has('assessmentShown')
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
      const assess = assessPositionalEdge(fenPair.fenAfter, studentColorWB, studentPovCp, lastMoveFromSan(fenPair.fenBefore, m.san));
      if (assess.reasons.length >= 2 && assess.verdict && assess.verdict !== 'balanced') {
        narration = `Step back and take stock — you're ${assess.verdict} here, and it's worth knowing exactly why: ${joinClauses(assess.reasons)}.`;
        flags.add('assessmentShown');
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
      && !flags.has('kingCenterTaught')
      && studentColorWB !== null
      && !m.isCoachMove
      && moverColor === playerColor
      && m.ply >= 12
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
      && enemyKingStuckInCenter(fenPair.fenAfter, studentColorWB)
    ) {
      narration = 'Look at their king — still in the centre, no castling in sight, and the files are opening around it. That is your cue: this is the moment to throw your pieces at it, before they ever wriggle to safety.';
      narrationSource = 'orientation';
      flags.add('kingCenterTaught');
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
      // Base families already named (text before the first ':' — "Italian Game",
      // "Caro-Kann Defense"). The re-naming beat dedupes on THIS, not the full ECO
      // name: a heavily-transposing opening yields a new sub-variation almost every
      // ply, which used to emit 6+ bare "This has become the Italian Game: <sub>"
      // lines with no teaching (the sparse-narration class caught in the 2026-07-25
      // hand audit). Name the family ONCE; the rich plan/threat beats carry the
      // specific sub-variation. Every name the walk said is the story's (P1-8c), so
      // a line explored off the walk does not name its opening again.
      const familiesNamed = new Set(openingsNamed(story.current()).map(openingFamily));
      if (named && family && named !== openingAt(story.current(), 'named') && !familiesNamed.has(family)) {
        const first = familiesNamed.size === 0;
        noteOpening(story, m.ply, 'named', named);
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
      && !modelGameCited(story.current())
      && moverColor === playerColor
      && m.ply >= 12
      && m.ply <= 26
      && (m.classification === null || m.classification === 'book' || m.classification === 'good')
    ) {
      narration = storyGame.text;
      narrationSource = 'opening-plan';
      story.note(m.ply, [{ kind: 'model-game', citation: storyGame.citation }]);
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
      // The corpus / masters frequency stat is opening theory — the Theory
      // button's, never the walk's (David 2026-11-06).
      const openingIdea = moveBriefing(true);
      if (openingIdea) {
        narration = openingIdea;
        narrationSource = 'per-move';
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
      // …and only when the engine's line after the move really takes it
      // (WO-OUTCOME-01: "that piece is coming off the board" is an outcome).
      const line = m.pv?.afterPlayed ?? null;
      const theirsTrapped = findTrappedPiece(fenPair.fenAfter, enemyOfStudent, line);
      const mineTrapped = theirsTrapped ? null : findTrappedPiece(fenPair.fenAfter, studentColorWB, line);
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
      // §7: the endgame is named once per game (the first quiet student move
      // that's in a readable endgame) — the story's phase edge.
      if (narration === null && !phaseCrossed(story.current(), 'endgame')) {
        const phase = nameEndgamePhase(fenPair.fenAfter);
        if (phase) { narration = `You've reached ${phase}.`; story.note(m.ply, [{ kind: 'phase', edge: 'endgame' }]); narrationSource = 'endgame'; }
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
      && !flags.has('opponentDevReadShown')
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
        flags.add('opponentDevReadShown');
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
      const clause = plyFactsClause(fenPair.fenBefore, m.san, { prev: prevCap, victimOwner: 'your', sanSaid: false });
      if (clause) {
        narration = `Your opponent ${clause}.`;
        narrationSource = 'opponent';
      } else if (!moveOnlyRestates(fenPair.fenBefore, m.san, prevCap)) {
        // A capture or check that does nothing more stays silent (the
        // quiet-move rule): the positional fallback below said "the bishop
        // rakes toward c5, d4, f2" of a take-back (census group 6).
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
      narration = deliveredMateNarration(fenPair.fenAfter, moverColor === playerColor);
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
      ...(habitTail ? { habitTail } : {}),
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
      ...(segmentSpokenSquares.length ? { spokenSquares: segmentSpokenSquares } : {}),
      ...(counterfactual.length ? { counterfactual } : {}),
      ...(blowsSaid.size ? { blowsSaid: [...blowsSaid] } : {}),
      ...(costReason ? { costReason } : {}),
      ...(m.classification === 'mistake' || m.classification === 'blunder' ? recordLinesOf(m) : {}),
    });
    // Carry this move's capture forward so the NEXT ply's material calc can
    // recognize a recapture (even trade → 0, no "wins material" windfall).
    try {
      prevCap = afterCapture(prevCap, new Chess(fenPair.fenBefore).move(m.san));
    } catch {
      prevCap = NO_PREV_CAPTURE;
    }
  }
  // THE GAME'S TURNING POINT, read once and kept in its story (P1-8c): the
  // walk's closing line states it from the story when the walk reaches the end
  // (CoachGameReview), on the last segment's checkpoint.
  if (playerColor) {
    try {
      const turn = turnThesis(selectorPlies, playerColor);
      // A seed may already hold the walk's read of it: the same turn is not
      // noted twice; a deeper build's different turn is noted after it, and
      // the last one noted is the story's (`storyTurn`).
      const was = storyTurn(story.current());
      const known = !!was && !!turn && was.ply === turn.ply && JSON.stringify(was.thesis) === JSON.stringify(turn);
      if (turn?.ply != null && !known) story.note(turn.ply, [{ kind: 'turn', thesis: turn }]);
    } catch { /* the turn is read on the walk's last ply — a bonus, never a blocker */ }
  }
  if (reviewPkgTally.plies > 0) {
    void logAppAudit({
      kind: 'review-voice-package',
      category: 'subsystem',
      source: 'coachFeatureService.buildReviewSegments',
      summary: `${reviewPkgTally.plies} plies, ${reviewPkgTally.parts} parts, ${reviewPkgTally.dropped} dropped at the door`,
      details: JSON.stringify(reviewPkgTally),
    });
  }
  const convertAt = convertTaughtAt();
  if (convertAt !== null) {
    const at = segments.find((x) => x.ply === convertAt);
    if (at) at.convertTaught = true;
  }
  // SAY-ONCE, MADE VISIBLE: a quiet student move whose only lesson is a
  // principle already taught this game stays silent on purpose. Mark it, so the
  // coverage instrument tells that silence apart from a ply nothing taught.
  const principlesSaidAt = [...story.current().said].flatMap(([k, at]) => (k.startsWith(REVIEW_SAID.principle) ? [[k.slice(REVIEW_SAID.principle.length), at] as const] : []));
  for (const sg of segments) {
    if (sg.narration || sg.playerColor !== playerColor) continue;
    const before = new Set(principlesSaidAt.filter(([, at]) => at < sg.ply).map(([id]) => id));
    const id = principleAlreadyTaught(sg.fenBefore, sg.san, sg.playerColor, before);
    if (id) sg.principleTaughtEarlier = id;
  }
  // THE QUIET-MOVE RULE, MADE VISIBLE (WO-DECIDER-02): a silent ply whose move
  // only restates the board — a take-back, an even trade, a bare check — is
  // silent on purpose. The capture run is threaded in ply order so a take-back
  // reads as one.
  {
    let run: PrevCaptureContext = NO_PREV_CAPTURE;
    for (const sg of [...segments].sort((a, b) => a.ply - b.ply)) {
      if (!(sg.narration ?? '').trim() && moveOnlyRestates(sg.fenBefore, sg.san, run)) sg.quietRestates = true;
      try { run = afterCapture(run, new Chess(sg.fenBefore).move(sg.san)); } catch { run = NO_PREV_CAPTURE; }
    }
  }
  // WHY NO FUNDAMENTAL, CARRIED ON THE PLY (clean-pass review walk 2026-10-04,
  // G2 ply 38): the decline was emitted only while the narration was BUILT,
  // and a narration built ahead of the walk and served from the cache never
  // re-emits it — the walk heard a flagged ply with no lesson and no reason.
  // The reason rides the segment, and the playback states it when the ply is
  // spoken.
  for (const sg of segments) {
    if (sg.playerColor !== playerColor || (sg.fundamentals?.length ?? 0) > 0) continue;
    if (sg.classification !== 'inaccuracy' && sg.classification !== 'mistake' && sg.classification !== 'blunder') continue;
    const why = attrByPly.get(sg.ply)?.why ?? [];
    if (why.length > 0) sg.fundamentalDeclined = why;
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
function reviewOpeningRecord(params: {
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

export function defaultIntroText(params: {
  playerColor: 'white' | 'black';
  result: string;
  openingName: string | null;
  /** Null while the review is still reading the game: the intro then says
   *  nothing about how the game went move by move (2026-10-13 — "Clean play
   *  throughout" was said off a part of the game read from a draft). */
  mistakeCount: number | null;
  /** The student's record in this opening (A8), spoken after the outcome. */
  record?: string | null;
}): string {
  const colorWord = params.playerColor === 'white' ? 'White' : 'Black';
  // Derive the student-relative outcome from the raw score + colour. `result`
  // arrives as the raw PGN score ('1-0'/'0-1'/'1/2-1/2') OR already as
  // 'win'/'loss'/'draw'. The old ternary only checked the latter, so a raw
  // '1-0' fell through to "a draw" — the coach opened a WIN by calling it a draw
  // (David 2026-07-19). Grounded certainty: we computed the result, so state it.
  // …and ONLY a drawn score reads as a draw (Carlsen–Topalov review walk
  // 2026-09-27: an unfinished game, `*`, opened "it ended in a draw"). An
  // unknown result names no result.
  const raw = params.result.trim().toLowerCase();
  const outcome: 'win' | 'loss' | 'draw' | null =
    raw === 'win' || raw === 'loss' || raw === 'draw'
      ? raw
      : raw === '1-0' || raw === '0-1'
        ? ((raw === '1-0') === (params.playerColor === 'white') ? 'win' : 'loss')
        : raw === '1/2-1/2' || raw === '½-½' || raw === 'drawn'
          ? 'draw'
          : null;
  const resultBit = outcome === 'win' ? ' and it ended in a win' : outcome === 'loss' ? ' and it ended in a loss' : outcome === 'draw' ? ' and it ended in a draw' : '';
  const framedIntro = params.openingName ? frameOpeningForStudent(params.openingName, params.playerColor) : null;
  const openingBit = framedIntro
    ? (framedIntro.owned ? ` in the ${framedIntro.label}` : ` against the ${framedIntro.label}`)
    : '';
  const momentBit = params.mistakeCount === null
    ? ''
    : params.mistakeCount > 0
      ? ` You had ${countWord(params.mistakeCount)} moment${params.mistakeCount === 1 ? '' : 's'} worth a second look — here's each one.`
      : ` Clean play throughout — here's what worked.`;
  const recordBit = params.record ? ` ${params.record}` : '';
  return `Here's your game${openingBit} — you had ${colorWord}${resultBit}.${recordBit}${momentBit}`;
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
 * handed in; the `[refuted]` facet it becomes goes through `coachTurn()` like
 * every other fact. Student opening plies with nothing to correct only —
 * those are the plies a strong coach teaches with "most players play X here".
 * Candidates: players at the student's level first (cache), masters after.
 */
/** ZUGZWANG OVER THE GAME (WO-STORY-MATRIX-01 P1-9c) — every board with seven
 *  pieces or fewer read off the tablebase, one position at a time (the same
 *  read Learn makes at the student's turn, `readZugzwang`). A game that never
 *  gets that far makes no request. */
async function zugzwangsForGame(moves: readonly ReviewMoveInput[]): Promise<Map<number, ZugzwangRead>> {
  const out = new Map<number, ZugzwangRead>();
  const chain = buildFenChain([...moves]);
  for (let k = 0; k < chain.length; k += 1) {
    const fen = chain[k].fenAfter;
    if (fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length > 7) continue;
    const z = await readZugzwang(fen).catch(() => null);
    if (z) out.set(moves[k].ply, z);
  }
  return out;
}

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

function isForcingProjection(line: PvLine): boolean {
  if (line.plies.length === 0) return false;
  if (line.plies[line.plies.length - 1].facts.isMate) return true;
  const forcing = line.plies.filter((p) => p.facts.isCheck || !!p.facts.captured).length;
  return forcing / line.plies.length >= 0.6;
}

/** Depth of each sacrifice-ledger branch search (one restricted search each). */
const SAC_LEDGER_DEPTH = 14;

/** IS THE OPPONENT'S "LEFT ALONE" IDEA MOOT? (review of chesscom-1040709576,
 *  2026-10-13: "Watch what they're building" was spoken on a ply where the
 *  student had a forced mate). The deep-threat probe hands the opponent a free
 *  move; that only teaches when the student has nothing faster. A student with
 *  a forced mate always goes first, and a student already winning on the board
 *  (the contested gate) outruns any non-mating idea. A mate threat against a
 *  student who is merely winning is still said — ignoring mate loses. */
export function studentOutpacesOpponentBuild(
  evalAfterWhitePov: number | null,
  studentWB: 'w' | 'b',
  opponentLineMates: boolean,
): boolean {
  if (evalAfterWhitePov === null) return false;
  const studentPov = studentWB === 'w' ? evalAfterWhitePov : -evalAfterWhitePov;
  if (isMateEval(studentPov) && studentPov > 0) return true;
  return !opponentLineMates && studentPov > 0 && !isContested(evalAfterWhitePov, null);
}

/** THE MATING PLY'S BEAT — one producer for every review builder. The
 *  student's own mate is named and explained; a mate against them points at
 *  the net. `studentMated` = the student delivered it. */
export function deliveredMateNarration(fenAfterMate: string, studentMated: boolean): string {
  const head = studentMated
    ? 'And there it is — checkmate. You finished the game.'
    : "And that's checkmate — the game ends here. This is the position to sit with: trace the mating net back and find the move where it became unavoidable.";
  const named = mateDescription(fenAfterMate);
  return named ? `${head} ${named}` : head;
}

async function augmentWithProjections(
  segments: ReviewMoveSegment[],
  studentColorWB: 'w' | 'b',
  /** REQUIRED — what the walk already claimed, with the ply it was said on
   *  (the story's ledger), so a pass never says again a branch a turn already
   *  said (`tempting:<uci>`). */
  walkSaid: ReadonlyMap<string, number>,
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
  const augStart = passStart;
  const mark = (pass: string): void => { timings[pass] = Date.now() - passStart; passStart = Date.now(); };
  // How many plies to spell a deep threat line — rating-scaled, capped at the
  // reliable window (Phase 2, David 2026-09-07: "spell the lines out for
  // everyone", "the more advanced player should get a DEEPER calculation").
  const deepThreatPlies = pvDepthForRating(rating);
  // Render a projected line — computed in code, no LLM (G0). `rich` is kept
  // for call-site compatibility.
  // `forSide` — WHOSE point the caller offers this line as proof of. Required:
  // a line cut at its first settled material point can prove the opposite of
  // the sentence around it, and the walk of 2026-09-26 said exactly that three
  // ways — "Watch what THEY'RE building … YOU come out ahead", "Here's how you
  // take advantage … you come out BEHIND", "Why Nd6+ was better … you come out
  // behind". A result that cuts against `forSide` is not proof; the caller
  // then says only what it can (the first move, the why) — never the ledger.
  const render = (line: PvLine, forSide: 'student' | 'opponent' | 'either'): string => {
    // 🔒 THE LINE AS PROOF (WO-LAYERS-01). A line is spoken only as far as the
    // point it proves: mate, or a finished trade that wins something — the
    // moves, then the result, no description per move ("Qxd4, Qxd4, and the
    // knight forks on c2, winning a piece"). It replaced a six-ply recital
    // with an adjective on every move, which ran 120–300 words a ply.
    const proof = linePlies(line);
    if (proof.proof) {
      const net = proof.proof.ledger?.netPawns ?? 0;
      if (!proof.proof.mate && ((forSide === 'student' && net < 0) || (forSide === 'opponent' && net > 0))) return '';
      // THE VOICE SAYS THE SHAPE (proof guard 2; review audit 2026-10-15): a
      // line past three moves is its first move and its result — the arrows
      // walk the rest on the board.
      const said = proof.proof.sans.slice(0, proof.plies);
      // Each move with its mover (OS-8 gap 7).
      const firstWB = line.plies[0].moverColor === 'white' ? 'w' : 'b';
      const moves = lineShape(said, firstWB === studentColorWB ? 'you' : 'they');
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
  // The move that led to a line's start, so a line opening with a recapture is
  // counted from before the capture it answers (`proofCut`'s `prior`).
  const priorByFen = new Map<string, { fenBefore: string; san: string }>();
  for (const seg of segments) if (seg.fenAfter && seg.fenBefore) priorByFen.set(positionOf(seg.fenAfter), { fenBefore: seg.fenBefore, san: seg.san });
  // A PUNISHMENT is what the MOVE cost, so its tally counts from before the
  // move (clean-pass review walk 2026-10-04, G1 41.Qxe5+: "Here's how it gets
  // punished: Kxd7, Qxg7+, Kd6, Qxh8 and Kxd5 — you come out behind on
  // material, a rook and a pawn for a rook and a bishop" — Qxe5+ had just taken
  // the queen). Same rule as `punishmentOf`'s cost; the voice and the arrows
  // both read it here.
  const punishedMove = new WeakMap<PvLine, { fenBefore: string; san: string }>();
  const linePlies = (line: PvLine): { plies: number; proof: LineProof | null } => {
    const start = line.plies[0]?.fenBefore;
    const sans = line.plies.map((p) => p.san);
    const played = punishedMove.get(line);
    let proof: LineProof | null = null;
    if (played) {
      const p = proofCut(played.fenBefore, [played.san, ...sans], studentColorWB);
      proof = p ? { ...p, plies: Math.max(1, p.plies - 1), sans: p.sans.slice(1) } : null;
    } else if (start) {
      proof = proofCut(start, sans, studentColorWB, priorByFen.get(positionOf(start)) ?? null);
    }
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
  /** A cost reason's line in words: its shape, then what it settles. */
  const reasonWords = (r: CostReason, firstSeat: 'you' | 'they'): string => {
    const moves = lineShape(r.plies.map((p) => p.san), firstSeat);
    return r.mate ? `${moves} — and it's mate` : r.ledger ? `${moves} — ${describeProofResult(r.ledger)}` : moves;
  };
  /** The one classifier's name for the line, when it is a pattern worth
   *  naming ("— a fork"); the material or the mate says the rest. */
  const motifBit = (m: TacticType | null): string => (m && SAID_MOTIFS.has(m) ? ` — ${withArticle(tacticWord(m))}` : '');
  /** A missed reason, for the better-line pass to say on the better move. */
  const reasonMissed = new Map<ReviewMoveSegment, CostReason>();
  /** The same, for a cost reason's line — drawn exactly as far as it is said. */
  const attachReasonArrows = (s: ReviewMoveSegment, r: CostReason, priority: number): void => {
    if (priority <= (spokenLineArrowPriority.get(s) ?? -1)) return;
    const arrows = r.plies.filter((p) => p.uci.length >= 4).map((p) => ({ uci: p.uci, fenBefore: p.fenBefore, fenAfter: p.fenAfter }));
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
  // #3 punish — every flagged move, both sides.
  const flaggedForPunish = segments.filter(
    (s) => s.classification === 'mistake' || s.classification === 'blunder',
  );
  /** What the move cost its own side, centipawns (a mate either way is the
   *  most a move can cost). */
  const costOfSeg = (s: ReviewMoveSegment): number => {
    if (s.evalBefore === null || s.evalAfter === null) return 0;
    if (isMateEval(s.evalBefore) || isMateEval(s.evalAfter)) return 1000;
    return (s.evalBefore - s.evalAfter) * (s.playerColor === 'white' ? 1 : -1);
  };
  /** THE ONE REASON for a costly ply, read the same way for both seats
   *  (`costReason`): the deep read's line with its own shallower iteration and
   *  the record's line as the second reads; the record's line alone when there
   *  is no deep read. */
  const reasonFor = (
    s: ReviewMoveSegment, after: StockfishAnalysis | null, before: StockfishAnalysis | null, mode: 'full' | 'after-only' | 'before-only',
  ): CostReason | null => {
    const boardRead = (deep: StockfishAnalysis | null, record: string[] | undefined, recordEarlier: string[] | undefined): LineRead | null => {
      const line = deep?.topLines?.[0];
      if (line?.moves?.length) return { uci: line.moves, source: 'deep', seconds: [line.earlier?.moves ?? null, record ?? null, recordEarlier ?? null] };
      return record?.length ? { uci: record, source: 'record', seconds: [recordEarlier ?? null] } : null;
    };
    const idx = segments.indexOf(s);
    const prev = idx > 0 ? segments[idx - 1] : null;
    const afterRead = boardRead(after, s.recordReplyLine, s.recordReplyEarlier);
    const beforeRead = boardRead(before, s.recordBestLine, s.recordBestEarlier);
    const playedUci = (() => { try { const m = new Chess(s.fenBefore).move(s.san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; } })();
    return readCostReason({
      fenBefore: s.fenBefore, playedSan: s.san,
      mover: s.playerColor === 'white' ? 'w' : 'b', student: studentColorWB,
      costCp: costOfSeg(s),
      after: mode === 'before-only' ? null : afterRead,
      before: mode === 'after-only' ? null : beforeRead,
      priorMove: prev ? priorMoveLeadingTo({ fenBefore: prev.fenBefore, san: prev.san }, s.fenBefore) : null,
      // Measured against the other move's line (`costReason.against`): what it
      // allowed against the best line, what it missed against the move played
      // and its reply; a full read compares each with the other itself.
      against: mode === 'after-only' ? beforeRead?.uci ?? null
        : mode === 'before-only' ? (playedUci && afterRead ? [playedUci, ...afterRead.uci] : null)
          : null,
    });
  };
  // #5 deep threat — the student's good moves, null-moved to the student.
  const deepFens = new Map<string, string>(); // segment fenAfter -> nullFen
  for (const s of segments) {
    if (s.playerColor !== studentColorName) continue;
    if (s.classification !== 'good' && s.classification !== 'great' && s.classification !== 'brilliant') continue;
    try {
      if (s.fenAfter.split(' ')[1] === studentColorWB) continue;
      if (new Chess(s.fenAfter).inCheck()) continue;
      const nf = sideToMoveAs(s.fenAfter, studentColorWB);
      if (nf) deepFens.set(s.fenAfter, nf);
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
      const nf = sideToMoveAs(s.fenAfter, oppWB);
      if (nf) deepOppFens.set(s.fenAfter, nf);
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
      const nf = sideToMoveAs(s.fenBefore, oppWB);
      if (nf) missedProphyFens.set(s.fenBefore, nf);
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
    // The 6-ply line after a costly move is read only by the missed-prevention
    // pass now — the cost reason reads its own deep read (WO-DECIDER-02).
    ...flaggedForPunish.filter((s) => missedProphyFens.has(s.fenBefore)).map((s) => ({ fen: s.fenAfter, maxPlies: 6 })),
    ...[...deepFens.values()].map((fen) => ({ fen, maxPlies: deepThreatPlies })),
    ...[...deepOppFens.values()].map((fen) => ({ fen, maxPlies: deepThreatPlies })),
    ...[...prophyFens.values()].map((fen) => ({ fen, maxPlies: 3 })),
    ...[...missedProphyFens.values()].map((fen) => ({ fen, maxPlies: 3 })),
  ];
  const poolDone = new Map<string, { promise: Promise<PvLine | null>; resolve: (v: PvLine | null) => void }>();
  /** One unit of pooled work. `engine` is the lane's own worker, or undefined
   *  when no pool could be had (then it runs on the singleton, as before). */
  const poolTasks: Array<(engine: PvEngine | undefined) => Promise<void>> = [];
  // THE COST REASON'S DEEP READ (WO-DECIDER-02) — every move that cost a pawn
  // or more, BOTH SEATS: the board after it, then the board before it when the
  // first explains nothing. Scheduled first, on pooled lanes only: with no
  // pool there is no deep read (the singleton is never loaded with it) and the
  // record's own line stands, held to the naming rule like any other.
  const deepReads = new Map<ReviewMoveSegment, { after: StockfishAnalysis | null; before: StockfishAnalysis | null }>();
  const deepDone = flaggedForPunish.map(() => deferred<true>());
  flaggedForPunish.forEach((s, i) => {
    poolTasks.push(async (engine) => {
      try {
        if (!engine || !('analyzeDeep' in engine)) return;
        const deep = engine as unknown as DeepReadEngine;
        const read = (fen: string): Promise<StockfishAnalysis | null> =>
          raceTimeout(deep.analyzeDeep(fen, COST_REASON_DEPTH), PROJ_TIMEOUT_MS * 2, null).catch(() => null);
        const after = await read(s.fenAfter);
        const allowed = after ? reasonFor(s, after, null, 'after-only') : null;
        const before = allowed ? null : await read(s.fenBefore);
        deepReads.set(s, { after, before });
      } finally { deepDone[i].resolve(true); }
    });
  });
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
    // THE ONE WORST PIECE targets the probe (WO-DEPTH-01): the ablation proves
    // the piece the finder names, so a ply is a candidate when it names one.
    .map((s) => ({ s, mob: worstPieceMobility(s.fenAfter) }))
    .filter((c) => Number.isFinite(c.mob))
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
  // SACRIFICE LEDGER (missed computers, 2026-10-08) — the student's
  // sacrifices, both branches: their best capture of the offered piece and
  // their best move that declines it, each one restricted search on the lane.
  const sacSegments = segments.filter((s) => {
    if (s.playerColor !== studentColorName) return false;
    if (s.classification === 'mistake' || s.classification === 'blunder' || s.classification === 'miss') return false;
    try { return isSacrifice(s.fenBefore, s.san, null, null); } catch { return false; }
  });
  const sacLedgers = sacSegments.map(() => deferred<SacrificeLedgerRead | null>());
  sacSegments.forEach((sg, i) => {
    poolTasks.push(async (engine) => {
      const bestAmong: BestAmong = async (fen, ucis) => {
        if (engine && 'bestOf' in engine) {
          return (engine as unknown as BestOfEngine).bestOf(fen, ucis, SAC_LEDGER_DEPTH);
        }
        // The singleton's `searchmoves` search lists the restricted moves best first.
        return (await SINGLETON_SCORER.scoreMoves(fen, ucis, SAC_LEDGER_DEPTH))[0] ?? null;
      };
      let to: string | null = null;
      try { to = new Chess(sg.fenBefore).move(sg.san)?.to ?? null; } catch { to = null; }
      sacLedgers[i].resolve(to
        ? await raceTimeout(sacrificeLedger(sg.fenAfter, to, studentColorWB, bestAmong), PROJ_TIMEOUT_MS * 2, null).catch(() => null)
        : null);
    });
  });
  // THE REPLY TREE'S READS (`ifTheyPlay`, his "if Black takes on e5 you take
  // back with the knight"): every legal reply on the board after each move,
  // both seats, ONE read a board on the pooled lanes — scheduled LAST, so
  // every other pass reads first. A board the pool never reached has no tree;
  // a decided board has none worth saying. No pool, no tree (the singleton is
  // never loaded with it).
  const treeReads = new Map<ReviewMoveSegment, ReplyRead[]>();
  const treeDone = segments.map(() => deferred<true>());
  segments.forEach((s, i) => {
    let ucis: string[] = [];
    try { ucis = new Chess(s.fenAfter).moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`); } catch { ucis = []; }
    // Only a ply the walk narrates gets a tree (a silent ply stays silent), so
    // only those are read.
    if (!s.narration || s.ply < REPLY_TREE_FIRST_PLY || ucis.length < 2 || s.evalAfter === null || Math.abs(s.evalAfter) >= REPLY_TREE_DECIDED_CP) {
      treeDone[i].resolve(true);
      return;
    }
    poolTasks.push(async (engine) => {
      try {
        if (!engine || !('scoreMoves' in engine)) return;
        const fan = await raceTimeout((engine as PvEngine & MoveScorer).scoreMoves(s.fenAfter, ucis, REPLY_TREE_DEPTH), PROJ_TIMEOUT_MS, null).catch(() => null);
        if (fan?.length) treeReads.set(s, replyReadsFromFan(s.fenAfter, fan));
      } finally { treeDone[i].resolve(true); }
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
      for (const d of sacLedgers) d.resolve(null);
      for (const d of deepDone) d.resolve(true);
      for (const d of treeDone) d.resolve(true);
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
  const flaggedOpponent = segments
    .filter((s) => s.playerColor !== studentColorName
      && (s.classification === 'inaccuracy' || s.classification === 'mistake' || s.classification === 'blunder')
      && !!s.bestMoveUci && !!s.bestMoveSan);
  const betterDone = deferred<Map<ReviewMoveSegment, { line: PvLine | null; why: string | null }>>();
  const confirmDone = deferred<Map<ReviewMoveSegment, PvLine | null>>();
  const badPieceDone = {
    promise: Promise.all(badPieceResults.map((d) => d.promise)).then((results) => {
      let bestPiece: { seg: ReviewMoveSegment; text: string; swing: number; color: 'w' | 'b'; pair: boolean; squares: string[] } | null = null;
      results.forEach((res, i) => {
        if (res?.delta && (!bestPiece || res.delta.ablation.swingCp > bestPiece.swing)) {
          bestPiece = { seg: badPieceCandidates[i].s, text: res.delta.text, swing: res.delta.ablation.swingCp, color: res.delta.color, pair: res.delta.squares.length > 1, squares: res.delta.squares };
        }
      });
      return bestPiece as { seg: ReviewMoveSegment; text: string; swing: number; color: 'w' | 'b'; pair: boolean; squares: string[] } | null;
    }),
  };
  // The singleton chain fills these as it goes; a composer that reaches its
  // stage deadline reads whatever has landed instead of waiting (see
  // SINGLETON_STAGE_MS).
  const better = new Map<ReviewMoveSegment, { line: PvLine | null; why: string | null }>();
  const confirm = new Map<ReviewMoveSegment, PvLine | null>();
  void (async () => {
    // #4 the better line + the proven delta.
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
      // THE OPPONENT'S FLAGGED MOVES TOO (clean-pass review walk 2026-10-04,
      // G2 30.Nh5 "Nd5 — it would win a pawn", G3 24.Nh4 "g3 — create a passed
      // pawn on g7"): their verdict's reason was read off the pre-dive line as
      // well. One ply, one line — re-read it off a fresh line of its own.
      for (const s of flaggedOpponent) {
        const line = await raceTimeout(
          computePvLine(s.fenBefore, { firstUci: s.bestMoveUci as string, maxPlies: 6 }),
          PROJ_TIMEOUT_MS,
          null,
        ).catch(() => null);
        better.set(s, { line, why: null });
      }
    } finally { betterDone.resolve(better); }
    // #4b the engine's verdict on each static threat.
    try {
      for (const s of segments) {
        if (!s.staticThreat) continue;
        confirm.set(s, await raceTimeout(computePvLine(s.staticThreat.nullFen, { maxPlies: 4 }), PROJ_TIMEOUT_MS, null).catch(() => null));
      }
    } finally { confirmDone.resolve(confirm); }
  })();

  // #3 compose — THE COST REASON, BOTH SEATS (WO-DECIDER-02, David
  // 2026-10-28: "both sides need to look equally as deep. We can't give
  // shallow reasoning for their moves and deeper reasons for users moves").
  // One walker (`costReason`) over the deep read of each costly move's boards:
  // what it allowed, else what it missed. Its line is said only on the naming
  // rule (`lineTrust`: two moves on one read, five on two agreeing reads, past
  // five forcing and agreed); held, the cost stands without a line. Your slip
  // → "here's how it gets punished"; theirs → "here's how you take advantage"
  // — the same reason, the same depth, the seat only in the words. A missed
  // reason waits for the better-line pass below. Their slip's punishment is
  // withheld when the student's own next move missed it: that move teaches it
  // (U8), read by the same walker.
  {
    await Promise.all(deepDone.map((d) => d.promise));
    const bare = (x: string): string => x.replace(/^…/, '').replace(/[+#!?]+$/, '');
    for (const s of flaggedForPunish) {
      const isStudentSlip = s.playerColor === studentColorName;
      const deep = deepReads.get(s) ?? { after: null, before: null };
      const r = reasonFor(s, deep.after, deep.before, 'full');
      const row = costReasonRow(s.ply, isStudentSlip ? 'you' : 'them', r);
      s.reasonRow = row;
      // THE WIN YOUR MOVE MISSED, THREE OR MORE MOVES OUT AND NAMED ON THE RULE,
      // IS A CALCULATION POSITION (David 2026-10-28: "Set up positions from
      // games and train calculations") — read even when the move also allowed
      // something, since the missed line is the calculation the board posed.
      if (isStudentSlip) {
        const missedWin = r?.kind === 'missed' ? r : reasonFor(s, null, deep.before, 'before-only');
        const w = missedWin?.trust.why;
        if (missedWin && missedWin.trust.name && missedWin.blowPlies > NAME_NEAR_PLIES && (w === 'agreed' || w === 'forcing-agreed' || w === 'verified')) {
          s.calcLine = { uci: missedWin.plies.map((p) => p.uci), blowPlies: missedWin.blowPlies, why: w };
        }
      }
      const markReason = (k: NonNullable<ReviewMoveSegment['costReason']>): void => {
        if (isStudentSlip && (!s.costReason || s.costReason === 'none')) s.costReason = k;
      };
      // What the verdict already said is the reason it gave.
      if (s.verdictPlayedLine || s.verdictPunishSan) markReason('allowed');
      if (!r) { markReason(s.verdictReason ? 'missed' : 'positional'); continue; }
      if (r.kind === 'missed') { reasonMissed.set(s, r); markReason(r.trust.name || s.verdictReason ? 'missed' : 'held'); continue; }
      if (!r.trust.name) { markReason(s.verdictReason ? 'missed' : 'held'); continue; }
      const first = r.plies[0];
      if (!first) continue;
      // A line that opens by TAKING BACK on the square this move just captured
      // on proves nothing new (1200 review walk 2026-09-27).
      let opensWithRecapture = false;
      try {
        const played = new Chess(s.fenBefore).move(s.san);
        opensWithRecapture = !!played.captured && /x/.test(first.san) && first.uci.slice(2, 4) === played.to;
      } catch { opensWithRecapture = false; }
      // NEVER HAND OVER A MOVE THE STUDENT HAD TO FIND NEXT (KID review
      // 2026-10-06): named only when the student actually played it.
      if (!isStudentSlip && advantageWasMissed(segments.find((x) => x.ply === s.ply + 1)?.san ?? null, first.san)) {
        s.reasonRow = { ...row, withheld: true };
        continue;
      }
      // ONE CLAIM ONCE (2b): a reply the verdict or the ply already named.
      const alreadyNamed = (s.blowsSaid ?? []).includes(bare(first.san))
        || (!!s.verdictPunishSan && bare(s.verdictPunishSan) === bare(first.san));
      if (s.verdictPlayedLine || alreadyNamed || opensWithRecapture) { markReason('allowed'); continue; }
      const proof = reasonWords(r, isStudentSlip ? 'they' : 'you');
      const motif = motifBit(r.motif);
      const frame = isStudentSlip
        ? `Here's how it gets punished from here${motif}: ${proof}.`
        : `Here's how you take advantage${motif}: ${proof}.`;
      s.narration = `${s.narration ?? ''} ${frame}`.trim();
      s.reasonRow = { ...row, spoken: true };
      markReason('allowed');
      attachReasonArrows(s, r, 4); // punishment/advantage line
    }
  }
  mark('punish');
  // THE REPLY TREE (`ifTheyPlay`, his "if Black plays Qe7, you play d4,
  // cementing the knight"), through the one registry: on a move the walk
  // narrates, the replies a player at this level was likely to play and the
  // engine's best, each with the answer its own line proves. The game went on
  // with one reply — the next ply says that one — so the others are said in
  // the past. A silent ply stays silent: the need gate decided it.
  {
    await raceTimeout(Promise.all(treeDone.map((d) => d.promise)), Math.max(0, augStart + REPLY_TREE_WAIT_MS - Date.now()), undefined);
    // ONE BRANCH, ONE CLAIM (Review 2026-11-08, Carlsen–Caruana: "If you had
    // taken on b5, queen takes g5 would have won a bishop" was followed by
    // "A-pawn takes b5 looks natural, but it doesn't work: they play queen
    // takes g5"): a reply the next turn already weighs as a tempting move
    // (`weighedMoves`, claim `tempting:<uci>`) is that turn's to say.
    segments.forEach((s, k) => {
      const all = treeReads.get(s);
      const replies = all ? repliesNotWeighed(all, walkSaid, segments[k + 1]?.ply) : undefined;
      if (!replies?.length || !s.narration) return;
      const next = segments[k + 1];
      let played: string | null = null;
      try { const m = next ? new Chess(s.fenAfter).move(next.san) : null; played = m ? `${m.from}${m.to}${m.promotion ?? ''}` : null; } catch { played = null; }
      const treeCtx = {
        fen: s.fenAfter, replies, rating, student: studentColorWB,
        seconds: [s.recordReplyLine ?? null, s.recordReplyEarlier ?? null], played, tense: 'past' as const, liveBoard: null,
      };
      // THE BAIT (WO-COACH-NEXT-TO-YOU-01 C4): the trap the student's move set,
      // said before the tree's other branches (the tree no longer repeats it).
      const bait = readBoardAll('baitSet', treeCtx)[0];
      if (bait) s.narration = `${s.narration} ${bait.text}`.trim();
      const f = readBoardAll('ifTheyPlay', treeCtx)[0];
      if (!f) return;
      s.narration = `${s.narration} ${f.text}`.trim();
      // The first branch's line on the board, when no other line was drawn.
      const line = f.lines?.[0];
      if (line && !s.spokenLineArrows?.length) {
        try {
          const c = new Chess(line.fen);
          const arrows: Array<{ uci: string; fenBefore: string; fenAfter: string }> = [];
          for (const san of line.sans) { const fenBefore = c.fen(); const m = c.move(san); arrows.push({ uci: `${m.from}${m.to}${m.promotion ?? ''}`, fenBefore, fenAfter: c.fen() }); }
          if (arrows.length) { s.spokenLineArrows = arrows; s.spokenLineSaid = f.text; }
        } catch { /* a line that does not play draws nothing */ }
      }
    });
  }
  mark('ifTheyPlay');
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
  await raceTimeout(betterDone.promise, Math.max(0, augStart + SINGLETON_STAGE_MS.better - Date.now()), better);
  for (const s of flaggedStudent) {
    if (whyBudget <= 0) break;
    const got = better.get(s);
    const line = got?.line ?? null;
    if (line && line.plies.length >= 3 && s.narration) {
      // ONE PLY, ONE LINE (clean-pass review walk 2026-10-04, G1 15.Ba2: "axb4
      // — it would win two pawns", read off the pre-dive line axb4 Ne7 Bxa4,
      // one sentence before "the line runs axb4, Qxb4, c3, Qb7 and Bxa4 — two
      // pawns for a pawn"). The verdict's reason is re-read off THIS line.
      const fresh = betterMoveReason(s.fenBefore, s.san, line.plies[0].san, line.plies.map((p) => p.uci), s.playerColor,
        priorMoveLeadingTo(segments[segments.indexOf(s) - 1] ? { fenBefore: segments[segments.indexOf(s) - 1].fenBefore, san: segments[segments.indexOf(s) - 1].san } : null, s.fenBefore),
        moverGaveUpMate(s.evalBefore, s.evalAfter, s.playerColor));
      const seatedFresh = fresh ? seatPieceReferences(fresh, s.fenBefore, studentColorWB) : null;
      s.narration = s.verdictReason
        ? replaceVerdictReason(s.narration, s.verdictReason, seatedFresh)
        : addVerdictReason(s.narration, line.plies[0].san, seatedFresh);
      // The stored reason is the one now SPOKEN — every other reader of this
      // ply's "why" (the turning-point reveal) reads it, never re-derives (U3).
      if (seatedFresh) s.verdictReason = seatedFresh;
    }
    // THE MISSED REASON (WO-DECIDER-02): what the better move's line won, read
    // by the one walker off the deep read — said when the naming rule allows,
    // in place of the shorter line when both open with the better move.
    const missed = reasonMissed.get(s) ?? null;
    const sameStart = (a: string | undefined, b: string | undefined): boolean => !!a && !!b && a.replace(/[+#!?]+$/, '') === b.replace(/[+#!?]+$/, '');
    const missedSaid = missed && missed.trust.name && (!line || sameStart(missed.plies[0]?.san, line.plies[0]?.san)) ? missed : null;
    if (missedSaid && (!line || line.plies.length < 3) && s.narration) {
      const first = missedSaid.plies[0].san;
      s.narration = `${s.narration} Why ${first} was better — the line goes: ${reasonWords(missedSaid, 'you')}.`.trim();
      if (!s.costReason || s.costReason === 'none' || s.costReason === 'held') s.costReason = 'missed';
      if (s.reasonRow) s.reasonRow = { ...s.reasonRow, spoken: true };
      attachReasonArrows(s, missedSaid, 5);
      whyBudget -= 1;
    }
    if (line && line.plies.length >= 3) {
      const bestName = line.plies[0].san;
      const why = got?.why ?? null;
      // The engine's 6-ply line past two moves speaks on the naming rule too:
      // the record's best line and the deep read are its second reads.
      const cut = linePlies(line).plies;
      const deepBefore = deepReads.get(s)?.before?.topLines?.[0] ?? null;
      const lineTrusted = cut <= NAME_NEAR_PLIES || lineTrust({
        fen: s.fenBefore, uci: line.plies.map((p) => p.uci), plies: cut, winner: s.playerColor === 'white' ? 'w' : 'b',
        seconds: [s.recordBestLine ?? null, s.recordBestEarlier ?? null, deepBefore?.moves ?? null, deepBefore?.earlier?.moves ?? null],
      }).name;
      const proof = missedSaid ? reasonWords(missedSaid, 'you') : lineTrusted ? render(line, 'student') : '';
      // The why, and the line only where it PROVES something. Neither → the
      // move's own verdict ("X keeps the edge") has already said it.
      // Each part is its own sentence, so each starts with a capital (review
      // walk 2026-10-04, G2 19…Nf2: "…better on material than Nf2. the line
      // runs Bxh4").
      const parts = [why, proof ? `the line goes: ${proof}` : null].filter((x): x is string => !!x)
        .map((x, i) => (i === 0 ? x : openSentence(x)));
      // ONE STATEMENT OF THE BETTER MOVE'S POINT: the beat already said it
      // in short ("It wins their pawn on a2") — the played-out line is the
      // deeper form of the same claim and replaces it; with no line to play,
      // the short form stands alone and the comparison is not said again.
      const saidShort = (s.counterfactual ?? []).filter((c) => (s.narration ?? '').includes(c));
      if (saidShort.length > 0 && !proof) parts.length = 0;
      if (saidShort.length > 0 && proof) {
        for (const c of saidShort) s.narration = (s.narration ?? '').replace(c, '').replace(/\s{2,}/g, ' ').trim();
      }
      if (parts.length > 0) {
        s.narration = `${s.narration ?? ''} Why ${bestName} was better — ${parts.join('. ')}.`.trim();
        if (!s.costReason || s.costReason === 'none' || (s.costReason === 'held' && proof)) s.costReason = 'missed';
        if (proof && s.reasonRow && missedSaid) s.reasonRow = { ...s.reasonRow, spoken: true };
        // the delta / better-line — David's named priority
        if (proof) { if (missedSaid) attachReasonArrows(s, missedSaid, 5); else attachLineArrows(s, line, 5); }
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
      // ONE FACT ONCE (A3): the ply's fundamental already named this threat as
      // a line ("Their threat first: Nxe3 was already on … Rfc1 does").
      const namedAsThreat = (s.fundamentals ?? []).some((f) => f.id === 'ignored-threat' && !!f.facts.threat && strip(String(f.facts.threat)) === strip(t ?? ''));
      // …and it is the reply the VERDICT named, or the two sentences name two
      // punishments (27.Rb3: "starting with Qg5+", then "their Qg6+, and that
      // is exactly the reply that punishes this").
      const agreesWithVerdict = !s.verdictPunishSan || strip(s.verdictPunishSan) === strip(t ?? '');
      if (t && !namedAsThreat && agreesWithVerdict && punish?.plies[0] && strip(punish.plies[0].san) === strip(t) && strip(line.plies[1].san) !== strip(t)) {
        s.narration = `${s.narration ?? ''} ${line.plies[0].san} first was the preventive move — it rules out their ${t}, and that is exactly the reply that punishes this.`.trim();
      }
    }
  }
  for (const s of flaggedOpponent) {
    const line = better.get(s)?.line ?? null;
    if (!line || line.plies.length < 3 || !s.narration) continue;
    const fresh = betterMoveReason(s.fenBefore, s.san, line.plies[0].san, line.plies.map((p) => p.uci), s.playerColor,
      priorMoveLeadingTo(segments[segments.indexOf(s) - 1] ? { fenBefore: segments[segments.indexOf(s) - 1].fenBefore, san: segments[segments.indexOf(s) - 1].san } : null, s.fenBefore),
      moverGaveUpMate(s.evalBefore, s.evalAfter, s.playerColor));
    // Their idea, said to the student — the same seating the verdict used.
    const seated = fresh ? seatPieceReferences(toOtherSeat(fresh), s.fenBefore, studentColorWB) : null;
    s.narration = s.verdictReason
      ? replaceVerdictReason(s.narration, s.verdictReason, seated)
      : addVerdictReason(s.narration, line.plies[0].san, seated);
    if (seated) s.verdictReason = seated;
  }
  // THEIR MISSED WIN, AT THE SAME DEPTH AS YOURS (WO-DECIDER-02): the line
  // their better move won, read by the same walker and said on the same rule.
  for (const s of flaggedOpponent) {
    const r = reasonMissed.get(s);
    if (!r || !r.trust.name || !s.narration || !r.plies[0]) continue;
    const words = reasonWords(r, 'they');
    if (s.narration.includes(words)) continue;
    s.narration = `${s.narration} The line they missed: ${words}.`;
    if (s.reasonRow) s.reasonRow = { ...s.reasonRow, spoken: true };
    attachReasonArrows(s, r, 5);
  }
  // The sacrifice ledger, said on the sacrifice's own ply.
  const ledgers = await raceTimeout(Promise.all(sacLedgers.map((d) => d.promise)), PROJ_TIMEOUT_MS * 2, sacSegments.map(() => null));
  ledgers.forEach((r, i) => {
    if (!r) return;
    const s = sacSegments[i];
    s.narration = `${s.narration ?? ''} ${r.text}`.trim();
  });
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
  await raceTimeout(confirmDone.promise, Math.max(0, augStart + SINGLETON_STAGE_MS.confirm - Date.now()), confirm);
  const confirmed = confirm;
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
        const tail = render({ ...line, plies: line.plies.slice(1) }, 'either');
        if (tail) s.narration = `${s.narration} The engine confirms it — and if they try to run, it continues: ${tail}.`;
        attachLineArrows(s, line, 3); // confirmed threat continuation
      }
    } else if (s.narration) {
      // DISAGREEMENT — the engine sees a stronger idea. Replace the static
      // sentence with the engine's own line, explained by the same statics.
      const engineWhy = plyFactsClause(line.plies[0].fenBefore, line.plies[0].san, { sanSaid: true });
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
  // A STANDING THREAT IS SAID ONCE (review walk 2026-10-01, plies 64/66/68/70:
  // "if they sit still, it runs Bxe5+, Qxe5 and Qxe5+" four moves running). The
  // key is the line itself, so a CHANGED threat still speaks.
  const deepSaid = new Set<string>();
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
      const nullFen = sideToMoveAs(s.fenAfter, studentColorWB);
      if (!nullFen) continue;
      // maxPlies 7 = FOUR of the student's moves out (plies 1,3,5,7) — inside
      // depth-14's reliable window, never past it (David 2026-07-22: "don't
      // push the engine past its natural limits!!! Solid and honest is
      // paramount"). One move belongs to the static call-out; 2-4 moves
      // belong here.
      const line = deepPv.get(nullFen) ?? null;
      if (!line || line.plies.length < 3) continue; // one-movers belong to the static call-out
      if (lineRestatesClaim(line, s.spokenSquares ?? [])) continue;
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
      const deepKey = line.plies.map((p) => p.san).join(' ');
      // The idea is its first move: a shifted continuation of the same first
      // move is the same threat (the opponent's pass below, 2026-10-28).
      const deepFirst = `first:${line.plies[0].san.replace(/[+#!?]+$/, '')}`;
      if (deepSaid.has(deepKey) || deepSaid.has(deepFirst)) continue;
      deepSaid.add(deepKey);
      deepSaid.add(deepFirst);
      const deep = render(line, 'student');
      s.narration = deep
        // WHOSE threat, said (review audit, prod 2026-10-13: "there's a deeper
        // threat brewing — if they sit still, it runs Nxg4 — you win a bishop"
        // named no owner until the last clause). The line is the student's.
        ? `${s.narration ?? ''} And you have a deeper threat brewing — if they sit still, your line goes: ${deep}.`.trim()
        : `${s.narration ?? ''} And you have a deeper threat brewing — if they sit still, it starts with your ${line.plies[0].san}.`.trim();
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
  // Said once per line, as on the student's side (review walk 2026-10-01).
  const deepOppSaid = new Set<string>();
  // ONE STEM, ROTATED ON HOW MANY IDEAS THE GAME HAS TOLD (prod Review
  // 2026-10-31: "Watch what they're building — left alone, their idea goes:
  // they play … takes … — they win a …" three times in one game, a formula).
  // Every stem carries a projection marker the board checkers cut at
  // ("watch what they're building", "played out from here", "it runs").
  let oppIdeasTold = 0;
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
      const nullFen = sideToMoveAs(s.fenAfter, oppWB);
      if (!nullFen) continue;
      // Same honest window as #5: 7 plies (4 opponent moves), and the eval
      // claim requires the VERIFIED terminal — never the unverified root.
      const line = deepOppPv.get(nullFen) ?? null;
      if (!line || line.plies.length < 3) continue; // one-movers belong to the static opponent call-out
      // A line that only plays out a claim this ply already spoke is that
      // claim heard twice (19…f4: the kick on e3, then "fxe3 and you answer
      // Rxe3"). Judged on the spoken claims' squares, never on the prose.
      if (lineRestatesClaim(line, s.spokenSquares ?? [])) continue;
      const oppPovNow = s.evalAfter !== null ? (oppWB === 'w' ? s.evalAfter : -s.evalAfter) : null;
      const lastPly = line.plies[line.plies.length - 1];
      const matesOut = lastPly.facts.isMate; // chess.js replay fact — exact
      const oppPovTerminal = line.terminalEvalCp !== null
        ? (oppWB === 'w' ? line.terminalEvalCp : -line.terminalEvalCp)
        : null;
      const decisiveJump = oppPovNow !== null && oppPovTerminal !== null
        && oppPovTerminal - oppPovNow >= 250;
      if (!matesOut && !decisiveJump) continue;
      if (studentOutpacesOpponentBuild(s.evalAfter, studentColorWB, matesOut)) continue;
      const oppKey = line.plies.map((p) => p.san).join(' ');
      // ONE CLAIM ONCE across the game (review audit 2026-10-28, Carlsen–
      // Caruana): "their idea starts with a2" was told on four opponent turns
      // running — the continuation shifted each time, the idea did not. An
      // idea is its first move; once told, it is not told again.
      const firstKey = `first:${line.plies[0].san.replace(/[+#!?]+$/, '')}`;
      if (deepOppSaid.has(oppKey) || deepOppSaid.has(firstKey)) continue;
      deepOppSaid.add(oppKey);
      deepOppSaid.add(firstKey);
      // David 2026-09-07 (#4): non-forcing decisive lines count too. Forcing →
      // "threat"; decisive non-forcing → "idea/plan" (honest label). The decisive
      // ≥250cp gate is the noise floor; "left alone" is true for both.
      const oppDeepKind = isForcingProjection(line) ? 'threat' : 'idea';
      // A proof when the line settles something; otherwise the IDEA is still
      // the teaching (what they want) — named by its first move, not recited.
      const oppRun = render(line, 'opponent');
      const stem = ([
        { goes: `Watch what they're building — left alone, their ${oppDeepKind} goes:`, starts: `Watch what they're building — left alone, their ${oppDeepKind} starts with` },
        { goes: `Their next ${oppDeepKind}, played out from here:`, starts: `Their next ${oppDeepKind}, played out from here, starts with` },
        // "it runs from a2" read as a square the line leaves from (prod Review
        // audit 2026-11-09): the idea STARTS with its first move.
        { goes: `Another ${oppDeepKind} of theirs, if nothing stops it, goes like this:`, starts: `Another ${oppDeepKind} of theirs, if nothing stops it, starts with` },
      ] as const)[oppIdeasTold % 3];
      oppIdeasTold += 1;
      let callOut = oppRun
        ? `${stem.goes} ${oppRun}.`
        // THE STAKE IS ITS WHY (review audit 2026-10-14: "their idea starts
        // with d5." and nothing more). The line was kept BECAUSE it mates or
        // swings the game, so that is said with it.
        : `${stem.starts} ${line.plies[0].san}${matesOut ? ', and it ends in mate' : oppPovNow !== null && oppPovTerminal !== null ? `, and it swings the game by ${costWords(oppPovTerminal - oppPovNow)}` : ''}.`;
      // Its REAL purpose — what the line wins, when that is not what their
      // first move looks aimed at (missed computers, 2026-10-08).
      const purpose = (() => { try { return threatPurpose(line, studentColorWB); } catch { return null; } })();
      if (purpose) callOut += ` ${purpose}`;
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
    // ONE FACT ONCE (clean-pass review walk 2026-10-04, G2 ply 23: "rescue
    // your worst piece, your bishop on c8 …" then "Your bishop on c8 is doing
    // nothing where it sits — improving it is the biggest gain"). When the
    // ply's plan already names this piece — the one worst-piece finder, the
    // same square — the bad-piece line adds nothing.
    const planNamesIt = (b: NonNullable<typeof best>): boolean => {
      if (!b.seg.fenAfter || !(b.seg.narration ?? '').includes('rescue your worst piece')) return false;
      try { const w = findWorstPlacedPiece(new Chess(b.seg.fenAfter), b.color); return !!w && b.squares.includes(w.sq); } catch { return false; }
    };
    if (best && !planNamesIt(best)) {
      // Appended as its own sentence — capitalize the lead so the seat-stamped
      // possessive ("their"/"your") reads as a sentence start, not mid-clause.
      const text = phraseBadPiece(best.text, best.color, best.pair, studentColorWB);
      const obs = openSentence(text);
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
      if (/[x+#=]/.test(s.san)) continue;                   // quiet: no capture / check / mate / promotion
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
      // THE MOVE MUST TOUCH THE THREAT (review walk 900, 2026-09-26: …Ng4 was
      // called prophylaxis against dxc5 — dxc5 was still on after it; the
      // knight held the eval by making a threat of its own). "Takes the sting
      // out of it" is a causal claim, so it needs a causal link on the board.
      if (!moveMeetsThreat(s.fenBefore, s.san, threatSan)) continue;
      s.narration = `A quiet, preventive move — this is prophylaxis. Your opponent was set up for ${threatSan}, and this takes the sting out of it before it starts. Stopping their idea is often worth more than making one of your own.`;
      s.narrationSource = 'orientation';
      prophyBudget -= 1;
    }
  }
  mark('prophylaxis');
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
  const convertTaughtPly = segments.find((x) => x.convertTaught === true)?.ply ?? null;
  const studentColor: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
  const shown = new Map<string, number>();
  const byPly = new Map(segments.map((x) => [x.ply, x]));
  for (const s of segments) {
    if (s.narration || s.evalBefore === null || s.evalAfter === null) continue;
    const moverColor: 'w' | 'b' = s.ply % 2 === 1 ? 'w' : 'b';
    const prev = byPly.get(s.ply - 1);
    let beat: ReturnType<typeof detectConcept> = null;
    try {
      beat = detectConcept({
        fenBefore: s.fenBefore, fenAfter: s.fenAfter, san: s.san,
        moverColor, evalBefore: s.evalBefore, evalAfter: s.evalAfter, studentColor,
        priorMove: prev ? { fenBefore: prev.fenBefore, san: prev.san } : null,
      });
    } catch { beat = null; }
    if (!beat) continue;
    // The conversion was already taught by the plan or the method — the trade
    // concept is the same claim, so it gets the nod, never the lecture again.
    const taughtElsewhere = beat.concept === 'simplify-when-ahead' && moverColor === studentColor && convertTaughtPly !== null && s.ply > convertTaughtPly;
    const n = Math.max(shown.get(beat.concept) ?? 0, taughtElsewhere ? 1 : 0);
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
// …and a method list or a conditional race is advice, not history (amateur
// review walk 2026-09-27: "Checks, captured, threats"; a passer race "you got
// there first once the queens came off" while the queens were still on).
const PRESCRIPTIVE = /(the plan (?:from here|is|changes)|so the plan is|here's (?:exactly )?how|your defense starts with|watch what they|played out from here|if nothing stops it|follow it up|don't play|spend two or three tempi|that's your cue|is your cue|your whole job|wants to run|checks, captures|pushes from queening|once the queens come off)/i;
/** Case-preserving contraction rewrite: "You're" → "You were", never "you were"
 *  mid-narration with a lowercase head (the `/gi` replacement used to lowercase
 *  every sentence it opened). */
function sub(h: string, re: RegExp, past: string): string {
  return h.replace(re, (m) => (m[0] === m[0].toUpperCase() ? openSentence(past) : past));
}
/** A sentence that already says "is"/"are" in full is framed in the present —
 *  a rule or a standing state ("this is a race, and it's won by…"). Rewriting
 *  its contractions alone splits one sentence across two tenses: the review
 *  walk of 2026-09-26 heard "this is a race, and it was won by throwing your
 *  pawns". Tense is decided per sentence, so the explicit verb decides it. */
const PRESENT_FRAMED = /\b(?:is|are)\b/i;
function toPastSentence(sentence: string): string {
  // THE MOVE'S OWN SENTENCE IS HISTORY whatever its clause says (Review prod
  // audit 2026-10-30: "You play Rxa8: it trains on their queen on d8, which is
  // worth more…" stayed present beside "You played Nd5 — …"): the head is
  // past-tensed even when the clause after it is framed in the present.
  // The facet's tag may lead the sentence ("[move-job] You play …").
  const moveHead = /^(\[[a-z-]+\] )?(You|They) play (?=\S)/;
  if (moveHead.test(sentence) && (PRESCRIPTIVE.test(sentence) || isMethodSentence(sentence) || PRESENT_FRAMED.test(sentence))) {
    return sentence.replace(moveHead, (_m, tag: string | undefined, who: string) => `${tag ?? ''}${who} played `);
  }
  if (PRESCRIPTIVE.test(sentence) || isMethodSentence(sentence) || PRESENT_FRAMED.test(sentence)) return sentence;
  let h = sentence;
  // contractions / state-of-being → past
  h = sub(h, /\bthat's\b/gi, 'that was');
  h = sub(h, /\bit's\b/gi, 'it was');
  h = sub(h, /\byou're\b/gi, 'you were');
  h = sub(h, /\bthey're\b/gi, 'they were');
  h = sub(h, /\bthere's\b/gi, 'there was');
  // "you were up a pawn and you have the bishop pair" split one clause list
  // across two tenses (review walk 2026-09-27). Possession only — "have to"
  // is a modal and stays.
  h = h.replace(/\b(you|they|You|They) have (the|a|an|two|more|both)\b/g, (_m, who: string, what: string) => `${who} had ${what}`);
  h = sub(h, /\bis still\b/gi, 'was still');
  // "points a pawn storm" is a verb; "2 points of material" is a noun — only the verb.
  h = h.replace(/\bpoints a\b/gi, 'pointed a');
  h = h.replace(SUBJECT_VERB, (_m, subj: string, verb: string) => `${subj} ${PAST_VERB[verb.toLowerCase()] ?? verb}`);
  h = h.replace(SERIES_VERB, (_m, verb: string) => `, ${PAST_VERB[verb.toLowerCase()] ?? verb}`);
  return h;
}
function toPastHead(head: string, keep: ReadonlySet<string> = new Set()): string {
  // Split on sentence ends but KEEP the delimiter, so reassembly is lossless.
  return head.split(/(?<=[.!?])(\s+)/).map((piece, i) => (i % 2 === 1 || keep.has(piece.trim()) ? piece : toPastSentence(piece))).join('');
}
/** The sentences of the counterfactual clauses, as the past pass splits them. */
function counterfactualSentences(s: ReviewMoveSegment): Set<string> {
  return new Set((s.counterfactual ?? []).flatMap((c) => c.split(/(?<=[.!?])\s+/)).map((x) => x.trim()).filter(Boolean));
}
/** Exported for the register gate (`reviewRegister.test.ts`) — the three
 *  defects it pins were live in the shipped voice while every other test was
 *  green, so the rewrite needs a test that can reach it directly. */
export function pastTenseReviewNarration(segments: ReviewMoveSegment[]): void {
  for (const s of segments) {
    if (!s.narration) continue;
    // ORIENTATION IS TEACHING, NOT HISTORY. The concept and orientation
    // computers speak rules and standing states ("It's a target now; look to
    // trade it off", "Improve your worst piece, trade when it's offered") —
    // past-tensing them produced "It was a target now" and "traded when it
    // was offered" (review walk 1500, 2026-09-26).
    if (s.narrationSource === 'orientation') continue;
    const m = PROJECTION_MARKER.exec(s.narration);
    const cut = m ? m.index : s.narration.length;
    const head = s.narration.slice(0, cut);
    s.narration = toPastHead(head, counterfactualSentences(s)) + s.narration.slice(cut);
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
  /** False while `moves` is only the part of the game the review has read so
   *  far (the read-ahead, 2026-10-13). A partial build says nothing that needs
   *  the whole game: no mistake count in the intro and no closing. */
  complete?: boolean;
  /** What the walk has already SPOKEN — its story through the ply it walked —
   *  when this build replaces the plies ahead of a walk in progress
   *  (`buildReviewSegments`' `spokenBefore`). */
  spokenBefore?: StorySeed | null;
}): Promise<ReviewNarration> {
  const { moves, playerColor, openingName, result, coachNarration, playerRating, uncapped } = params;
  const complete = params.complete !== false;

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
      story: null,
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
  const [studentNeed, , studentWeaknesses, knownSlipIndex] = await Promise.all([
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
    // The known mistakes and traps (David 2026-11-04), read before the
    // synchronous build so none is dropped for a file still loading.
    loadKnownSlipIndex().catch(() => null),
  ]);
  timings.loads = Date.now() - prepStart;
  // After the masters DB is warm (the loads above), so the fallback candidates
  // can be read synchronously.
  const refutedStart = Date.now();
  const refutedByPly = await refutedAlternativesForGame(moves.slice(0, usableCount), playerColor)
    .catch(() => new Map<number, RefutedAlternative>());
  const intentByPly = await moveIntentsForGame(moves.slice(0, usableCount), playerColor)
    .catch(() => new Map<number, ReviewIntent>());
  const zugzwangByPly = await zugzwangsForGame(moves.slice(0, usableCount)).catch(() => new Map<number, ZugzwangRead>());
  timings.refuted = Date.now() - refutedStart;
  const record = reviewOpeningRecord({ openingName, playerColor, studentNeed, gameId: params.gameId ?? null });
  const introMistakes = complete ? mistakeCount : null;
  const groundedIntro = defaultIntroText({ playerColor, result, openingName, mistakeCount: introMistakes, record });
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
  // The student's own record decides which inaccuracies speak; read it first.
  await loadInaccuracyVoice();
  // THE GAME'S STORY (P1-8d): the build's memory of what it says, kept with
  // the narration once the refrain fold below has said its piece.
  const story = createStoryStore(params.gameId ?? 'review');
  const segments = await buildReviewSegmentsOpen(moves.slice(0, usableCount), playerColor, openingName, uncapped, playerRating, studentWeaknesses, studentNeed, params.gameId ?? null, refutedByPly, intentByPly, params.spokenBefore ?? null, story, zugzwangByPly, knownSlipIndex);
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
      augmentWithProjections(work, playerColor === 'white' ? 'w' : 'b', story.current().said, 'full', playerRating, augTimings).then(() => true),
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
  closeReviewTurns(segments);
  // THE LONG LINES THIS GAME POSED GO TO CALCULATION (David 2026-10-28: "Set
  // up positions from games and train calculations" → "strengthen what we
  // have"): each far missed win the reason pass named is saved onto that
  // move's mistake puzzle; Calculation serves it. Best-effort, never awaited.
  if (params.gameId) {
    const long = segments.filter((sg) => sg.calcLine).map((sg) => ({ fenBefore: sg.fenBefore, calcLine: sg.calcLine as NonNullable<ReviewMoveSegment['calcLine']> }));
    if (long.length > 0) void attachCalcLines(params.gameId, long).catch(() => undefined);
  }

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
  foldReviewRefrains(segments, story, params.spokenBefore ?? null);


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
  // EVERYTHING THE WALK SAYS, line by line with the facet that carried it (the
  // owner's drawer, `everythingEvents`) — read before the tags are stripped,
  // so the lines added outside the doors (the opening, the story, the engine's
  // projected lines) show which producer said them.
  if (everythingListening()) {
    for (const s of segments) {
      if (!s.narration) continue;
      const parts = s.narration.split(/\[([a-z0-9-]+)\]\s*/i);
      const lines: Array<{ computer: string; kind: string | null; text: string; said: boolean; why: null }> = [];
      if (parts[0].trim()) lines.push({ computer: 'review walk', kind: null, text: parts[0].trim(), said: true, why: null });
      for (let k = 1; k < parts.length; k += 2) {
        if (parts[k + 1]?.trim()) lines.push({ computer: `review facet [${parts[k]}]`, kind: parts[k], text: parts[k + 1].trim(), said: true, why: null });
      }
      emitEverything({ surface: 'review', door: 'review-walk', at: { fen: s.fenAfter, ply: s.ply, san: s.san }, lines });
    }
  }
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

  // THE MAIN CONCEPT (WO-DEPTH-01, David 2026-11-08: "a main concept that
  // helped a user win or lose … a reoccurring theme throughout the game") —
  // the deep reason the costly moves share, by how their punishment landed
  // (`slipDepth.mainConceptLine`). It replaced a theme read off how often a
  // feature sat on the board ("the middlegame turned on the open file"), which
  // claimed a cause from presence alone.
  const studentWB: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
  const throughLine = mainConceptLine(
    segments
      .filter((sg) => (sg.classification === 'mistake' || sg.classification === 'blunder') && !!sg.fenBefore)
      .map((sg) => ({ seat: sg.playerColor === 'white' ? 'w' as const : 'b' as const, san: sg.san, fenBefore: sg.fenBefore, replyUci: sg.recordReplyLine ?? null })),
    studentWB,
  );
  // THE FUNDAMENTALS AGGREGATE (G.4) — "three of your five flagged moves handed
  // over a tempo": the actual lesson, computed from the per-move attributions,
  // spoken raw at the last ply ahead of the through-line.
  const studentSegs = segments.filter((s) => s.playerColor === playerColor);
  const flaggedCount = studentSegs.filter((s) => s.classification === 'inaccuracy' || s.classification === 'mistake' || s.classification === 'blunder' || s.classification === 'miss').length;
  const recap = renderFundamentalsRecap(studentSegs.map((s) => s.fundamentals ?? []), flaggedCount);
  // The closing is a whole-game statement: a partial build has none.
  const closing = !complete ? null : recap ? (throughLine ? `${recap} ${throughLine}` : recap) : throughLine;

  // Intro: use the phrased response if non-empty and not the ⚠️ error
  // placeholder; else the grounded default. Collected LAST — it was started
  // beside the segment build, so its phrasing race no longer delays the walk.
  const introWaitStart = Date.now();
  const introTrimmed = (await introPromise).trim();
  timings.introWait = Date.now() - introWaitStart;
  const intro = introTrimmed && !introTrimmed.startsWith('⚠️')
    ? introTrimmed
    : defaultIntroText({ playerColor, result, openingName, mistakeCount: introMistakes, record });

  // NEED COVERAGE + THE TEACH METER (WO-TEACH-02 S0) — measured on what the
  // student will actually HEAR, after every fill pass. It used to be taken
  // before the fills, so plies a later pass narrated read as silent and plies
  // it filled with a description read as covered by nothing: the instrument
  // and the tape disagreed (prod 2026-09-24: row 8/12, tape 11/12).
  {
    const heard = (sg: ReviewMoveSegment): boolean => !!(sg.narration ?? '').trim();
    const coveredBySayOnce = (sg: ReviewMoveSegment): boolean => !heard(sg) && !!sg.principleTaughtEarlier;
    const coveredByQuiet = (sg: ReviewMoveSegment): boolean => !heard(sg) && sg.quietRestates === true;
    const rows = segments.flatMap((sg) => sg.need
      ? [{ ply: sg.ply, score: sg.need.score, speak: sg.need.speak, prior: sg.need.prior, spoke: sg.narrationSource === 'per-move', heard: heard(sg) || coveredBySayOnce(sg) || coveredByQuiet(sg), sayOnce: sg.principleTaughtEarlier ?? null, quiet: coveredByQuiet(sg), teaches: sg.teaches === true, source: sg.narrationSource ?? null }]
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
      details: JSON.stringify({ gamesPlayed: studentNeed.gamesPlayed, rows, taught: studentTaught.map((sg) => sg.ply), described: studentSpoken.filter((sg) => sg.teaches !== true).map((sg) => sg.ply), quietSilenced: segments.filter(coveredByQuiet).map((sg) => sg.ply), costReasons: segments.filter((sg) => sg.costReason).map((sg) => ({ ply: sg.ply, reason: sg.costReason })), reasonRows: segments.filter((sg) => sg.reasonRow).map((sg) => sg.reasonRow) }),
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

  return {
    intro, segments, closing, story: storyThrough(story.serialize(), Number.POSITIVE_INFINITY),
    ...(knownSlipIndex === null ? { knownSlipsMissing: true } : {}),
  };
}

/** Does the student's move `san` (played from `fenBefore`) actually meet the
 *  opponent's threat `threatSan` (their best move had they moved instead)? Yes
 *  when the threat is no longer legal afterwards, or when the moved piece now
 *  covers the square the threat lands on. Anything else held the eval some
 *  other way — a counter-threat, a tempo — and is not prophylaxis. Two shapes
 *  that LOOK like it and are not (review walk 1500, 2026-09-26): the threatened
 *  piece simply stepping away (Rh7 out of Kxf7) is rescuing a piece, and any
 *  move made while IN CHECK is forced, not preventive. */
export function moveMeetsThreat(fenBefore: string, san: string, threatSan: string): boolean {
  let threat: { from: string; to: string } | null = null;
  try {
    const flipped = flipSideToMove(fenBefore);
    if (!flipped) return false;
    const t = new Chess(flipped).move(threatSan);
    threat = { from: t.from, to: t.to };
  } catch { return false; }
  let after: Chess;
  let moved: { from: string; to: string; color: 'w' | 'b' };
  try {
    if (new Chess(fenBefore).inCheck()) return false;                 // forced, not preventive
    after = new Chess(fenBefore);
    const m = after.move(san);
    moved = { from: m.from, to: m.to, color: m.color };
  } catch { return false; }
  if (moved.from === threat.to) return false;                          // a rescue, not prevention
  const stillLegal = after.moves({ verbose: true }).some((m) => m.from === threat.from && m.to === threat.to);
  if (!stillLegal) return true;                                        // the threat is gone
  return after.attackers(threat.to as Square, moved.color).includes(moved.to as Square);
}

/** Replace the verdict's reason for the better move ("— <old>") with one read
 *  off a fresher line of the same ply, or drop it when that line proves none.
 *  The narration is left alone when the old reason is not found as spoken. */
export function replaceVerdictReason(narration: string, oldReason: string, freshReason: string | null): string {
  if (freshReason === oldReason) return narration;
  // The reason follows the better move after a colon ("f6 was stronger: it
  // would …", 2026-11-08) or, in an older line, a dash.
  for (const sep of [': ', ' — ']) {
    const marker = `${sep}${oldReason}`;
    const at = narration.indexOf(marker);
    if (at < 0) continue;
    return `${narration.slice(0, at)}${freshReason ? `${sep}${freshReason}` : ''}${narration.slice(at + marker.length)}`;
  }
  return narration;
}

/** Give a verdict that names the better move with NO reason ("the stronger move
 *  was X.") the reason read off the fresh line of the same ply — the quick-sweep
 *  line it would have used is not one a claim may rest on. */
export function addVerdictReason(narration: string, bestSan: string, reason: string | null): string {
  if (!reason) return narration;
  // Its own sentence ("The stronger move was X.") or a clause ("— the stronger move was X").
  const marker = `he stronger move was ${bestSan}`;
  const at = narration.indexOf(marker);
  if (at < 0) return narration;
  const end = at + marker.length;
  if (!/^[.;]/.test(narration.slice(end))) return narration;   // already carries a clause
  return `${narration.slice(0, end)} — ${reason}${narration.slice(end)}`;
}
