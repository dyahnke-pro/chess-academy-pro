// boardComputers — THE ONE REGISTRY OF BOARD COMPUTERS (one-coach plan P4,
// David 2026-10-07: "make sure it's wired properly, all coach surfaces get it.
// We are not duplicating").
//
// A surface never hand-calls one of these computers: it asks the registry for
// a computer by id with that computer's context, and gets back THE ONE FACT
// (`CoachFact`, WO-STORY-MATRIX-01 P1-6a) — the sentence, the PROOF it rests on
// (required, G0: the fact is computed and the proof comes from the same
// computation), the squares, its claims, its kind and its place. The fact
// carries everything a surface used to relabel at its call site (its kind, its
// role, the skill it teaches, the board it is about, the moves it draws and
// the form it takes without the move), so no surface re-derives any of it.
//
// Every entry answers EVERY coach surface (`Record<CoachSurface, …>`), wired or
// a reason it is not, so a new computer does not compile until someone has
// decided what Review, Play, chat, Tactics and Weaknesses do with it. The table
// is read by `boardComputers.test.ts`, which holds each "wired" claim to a real
// call site — a claim with no caller fails.
//
// PURE: every computer here is pure; this module adds no chess of its own.
import { ideaClaim, type IdeaKind } from './ideaKind';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { legalSeeGainFor, signedLegalSeeFor, seeSequence } from './positionReadingService';
import { NO_PROOF, squaresProof, isProof, legalLineProof, lineProofFromUci, type FactProof } from './proof';
import { lineSeatAt, withArticle } from '../utils/andList';
import type { FactStakes } from './factStakes';
import { LOCAL_THREAD, placeFact, stakesOf, type CoachFact, type CoachFactKind, type ComputerName, type FactSeat } from './coachFact';
import { threadKey } from './gameStory';
import { findPinBreaks, pinBreakLine, pinBreakProof } from './pinBreak';
import { findProphylaxis, prophylaxisKey, prophylaxisLine, prophylaxisIdea, prophylaxisProof, prophylaxisThreatProof, theirWantedMoves } from './prophylaxis';
import { inBetweenMove } from './inBetweenMove';
import { hookCreated } from './moveInsight';
import { criticalityThresholds } from './criticalityScan';
import { sayMoveClause } from './spokenMove';
import { tempoCount } from './tempoCount';
import { readPosition } from './positionalRead';
import { detectKingExposure, kingExposureClause } from './kingSafety';
import { findEnablingMove, enablingMoveLine, enablingMoveProof } from './enablingMove';
import { findTiedDefenders, newTiedDefender, tiedDefenderLine, tiedDefenderProof } from './tiedDefender';
import { obligationLifted, obligationLiftedLine } from './obligationLifted';
import { findQueenGrabTraps, queenGrabTrapLine, queenGrabTrapProof } from './queenGrabTrap';
import { looseClaims, provenThreatLine, threatStakes } from './threatProof';
import { threatAnswer } from './threatAnswer';
import { namesMoves, namedSan, namesPlayableStudentMove } from './studentMoveNaming';
import { trappedOnBoard } from './reviewTeachingPoints';
import { bookDeparture } from './bookDeparture';
import { openingSlip, mastersBook } from './openingSlip';
import { lastTimeHere } from './lastTimeHere';
import type { BookDepartureRow } from './bookDepartureWeakness';
import { PIECE_NAMES } from '../types/tacticTypes';
import { planThreadTurn, type PlanThread, type PlanLineKind } from './planThread';
import { geometryReads, type GeometryContext } from './tacticGeometry';
import { studentMoveStructure, theirMoveStructure, boardStructure, linesStructure, type StructureRead } from './structureReads';
import { STRUCTURE_ROLE } from './structureJudgementKit';
import { countMethod } from './countMethod';
import { countKey, temptingKey } from './conceptKey';
import { buildPriorityFirst, studentMovePoint } from './playCommentary';
import { openingStoryAt, STORY_KIND } from './openingStory';
import { isEndgameByMaterial } from './gamePhaseService';
import type { FactKind } from './reviewFacetRank';
import type { GamePhase, HeardVerdict } from '../types';
import { packageForRegister } from './hintRegister';
import { FUNDAMENTAL_TAG, type PrincipleAttribution, type FundamentalId } from './principleAttribution';
import { castleByHandMove, kingFromCentre, keptHome, kingSquares } from './kingWalk';
import { knownSlip, knownSlipIndexNow, knownSlipsAt, type KnownSlipContext } from './knownSlips';
import { ifTheyPlay, treeSentence, sayable, baitBranch, baitSentence, everyTakeLoses, everyTakeSentence, type ReplyRead, type ReplyBranch, type TreeTense, landedSquare } from './ifTheyPlay';
import { mateStakes } from './factStakes';
import { MOTIF_OF_TACTIC, MOTIFS } from '../data/tacticMotifs';
import { temptingRefuted, temptingOnBoard, standingRefutations, alsoGood, squareChoice, type WeighRead, type ConsideredTries, type TemptingRefuted, type StandingRefuted } from './weighedMoves';
import { pictureVerdictOf, type PictureConclusions, type PictureLedgerIn } from './pictureVerdict';
import { costStakes } from './factStakes';
import { pawnBreak } from './pawnBreak';
import { oppositeBishops } from './oppositeBishops';
import { planSteps, planStepsText, planStepsKey } from './planSteps';
import { planOfTheBoard } from './planOfTheBoard';
import { compensation } from './compensation';
import { openingTheoryFacts } from './openingTheory';
import { moveStops } from './moveStops';
import { pieceOutFirst } from './pieceOutFirst';
import { lineCut } from './lineCut';
import { harmlessPin, harmlessPinLine } from './harmlessPin';
import { queenNet, queenNetLine } from './queenNet';
import { bothSaved, bothSavedLine, type ReplyLine } from './bothSaved';
import { perpetualCheck, perpetualStartedBy, perpetualLine, winningAnyway, windmill, windmillStartedBy, windmillLine } from './repeatingChecks';
import { minorMatchup } from './minorMatchup';
import { kingSiege, siegeSpeaks, siegeLine, siegeSquares, backRankWeakness, backRankLine, backRankSquares, loadedDiscovery, discoverySpeaks, discoveryLine, discoverySquares, kingSacrifice, kingSacrificeLine, kingSacrificeSquares } from './kingSiege';
import { stalemateTrick, stalemateTraps, stalemateTrapLine, stalemateTrickLine } from './stalemateWatch';
import { intoTheirCamp, intoTheirCampLine } from './intoTheirCamp';
import { pressureOf, pressureLine } from './targetSelector';
import { breakPrep, breakPrepLine, breakStopped, breakStoppedLine } from './breakTiming';
import { flexibleMove, flexibleMoveLine, flexibleMoveSquares } from './flexibleMove';
import { exchangeSacrifice, exchangeSacrificeLine, exchangeSacrificeSquares } from './exchangeSacrifice';
import { pawnMajority, pawnMajorityLine, pawnMajoritySquares } from './pawnMajority';
import { pawnCentre } from './pawnCentre';
import { phaseOfFen } from './boardConcepts';
import { tensionKept, tensionReleased, type TensionLine } from './tensionRelease';
import { secondFront } from './secondFront';
import { lateralRookDefence } from './lateralRookDefence';
import { squareForPiece } from './squareForPiece';
import { tradeRelievesCramp } from './tradeRelievesCramp';
import { queenKnightNet } from './queenKnightNet';
import { selfBlock } from './selfBlock';
import { mateThreatLever } from './mateThreatLever';
import { queenlessMate } from './queenlessMate';
import { inaccessibleHole } from './inaccessibleHole';
import { harmlessWeakPawns } from './harmlessWeakPawns';
import { wingWithoutPieces } from './wingWithoutPieces';
import type { EngineLine } from './engineLineRead';
import { urgentStrike } from './urgentStrike';
import { misplacedQueen } from './misplacedQueen';
import { theirWorstPiece } from './theirWorstPiece';
import { kingInOpen } from './kingInOpen';
import { kingActivityGap } from './kingActivityGap';
import { zugzwangIfPassed } from './zugzwangIfPassed';
import { keySquaresOn, keySquareLine, keySquareSquares } from './keySquareRead';
import { kpDrawReason, KP_FAST_BUDGET } from './kpSolver';
import { shoulderOn, shoulderLine, shoulderSquares } from './shoulderRead';
import { connectedPassersOn, connectedPassersLine, connectedPassersSquares } from './connectedPassers';
import { wonEnding } from './wonEnding';
import { leverPasser } from './leverPasser';
import { coordinationGap } from './coordinationGap';
import { endgameVerdict } from './endgameVerdict';
import { defenderInTime } from './defenderInTime';
import { tactify } from './tactify';
import { seventhRankMate } from './seventhRankMate';
import { pieceTempo } from './pieceTempo';
import { kingBoxMove } from './kingBox';
import { matingNet } from './matingNet';
import { frozenTarget } from './frozenTarget';
import { pictureLedger, pictureCounterplay, pictureTarget, ledgerKey, ledgerText, ledgerSquares, counterplayText, targetText, moveWorksOnTarget, planTargetText, moveWorksOnPlan } from './pictureLedger';
import { centreDuo } from './centreDuo';
import { noSafeChecks } from './noSafeChecks';
import { promotionWithCheck } from './promotionWithCheck';
import { kingRace } from './kingRace';
import { fortress, fortressLine, fortressSquares } from './fortress';
import { itineraryAt, itineraryLine } from './reviewPieceItinerary';
import { forcedRunAt, FORCED_RUN_LINE } from './reviewForcedSequence';
import { threatPurpose } from './threatPurpose';
import { temptingCaptureRead, attackerDefenderCount, countSaid, royalDefenderTarget, rookOnSeventh, badEnemyBishop } from './reviewTeachingPoints';
import { nameEndgamePhase } from './reviewMoveTeaching';
import { passedPawnPush, findTrappedPiece } from './reviewTeachingPoints';
import { enemyKingStuckInCenter, sacrificeCompensation, describeSacBreaksKingShield } from './reviewSacrifice';
import { findMinorityAttack, findColorComplexWeakness } from './positionReadingService';
import { planRaceClause, planRaceProof, pawnSquareTaken, pawnSquareRaceProof } from './planRace';
import { pieceWish } from './pieceWish';
import { theirMoveCost } from './theirMoveCost';
import { threatStoppedBy, playItAnyway } from './opponentMovePurpose';
import { trickSidestepped } from './forkTrick';
import { habitsOf, opponentHabits } from './thinkAloud';
import { knownAttack } from './attackLibrary';
import { readTiming, timingClause } from './moveTiming';
import { detectBluff, bluffClause } from './bluffDetector';
import { contrastMoves, contrastClause } from './moveContrast';
import { readTheirMove, READ_FACT_KIND, type EngineLine as ReadLine } from './opponentMoveReads';
import { lineProof } from './proof';
import { holeKey } from './conceptKey';
import { describeStructure } from './boardStructure';
import { exchangeStakes, forkPoints, piecesOn } from './factStakes';
import { detectNewThreat, describeThreatPrevention, seatPieceReferences } from './groundedAnswer';
import { andList as listAnd, countWord } from '../utils/andList';
import { imageryFor } from './factImagery';
import { stemKeyOf } from '../utils/rotateStem';
import { openSentence, continueSentence } from '../utils/openSentence';
import type { PvLine } from './pvPlayback';
import { oppositionTaken, oppositionLine, oppositionSquares } from './oppositionRead';
import { zugzwangMade, zugzwangSyncLine, zugzwangSyncProof } from './zugzwangRead';
import { theoreticalEndingMade, theoreticalEndingMadeLine } from './theoreticalEnding';
import { raceCountMade, raceCountLine, raceCountSquares } from './raceCount';
import { promotionPlayed, promotionChoiceLine, queenMissedLine } from './promotionChoice';
import { defenderTradeMade, keyDefenderLine, defenderSquares, keyDefenderPlan } from './keyDefender';
import { practicalChance, practicalChanceLine, practicalChanceSquares, type PracticalReads } from './practicalChance';
import { pawnCutsGuard, type PawnLineRead } from './pawnLines';
import { chainBase } from './chainBase';
import { pinnedPawnGuard } from './pinnedPawnGuard';
import { castlingTakenAway } from './castlingTakenAway';
import { castlingWing } from './castlingWing';
import { pieceMovedAgain } from './pieceMovedAgain';
import { queenChased, queenChasedLine } from './queenChased';
import { blockade, blockadeLine } from './blockade';
import { tradeOfferAt, tradeOfferLine } from './tradeOffer';
import { fileTradeAt, fileTradeLine } from './fileTrade';
import { pawnEndingTradeAt, pawnEndingTradeLine } from './pawnEndingTrade';
import { tradeKeptAt, tradeKeptLine, type TradeKeptInput } from './tradeKept';
import type { AnalysisLine } from '../types';
import { queenHunt, queenHuntLine } from './queenHunt';
import { secondAttacker, secondAttackerLine } from './secondAttacker';
import { outOfReach, outOfReachLine } from './outOfReach';
import { poisonedPiece, poisonedPieceLine } from './poisonedPiece';
import { deepCombination, deepCombinationLine, deepCombinationSquares } from './deepCombination';
import { lineTrust } from './lineTrust';
import { everyMate, everyMateLine } from './everyMate';
import { pieceCage } from './pieceCage';
import { opensCheck } from './opensCheck';
import { captureOrder, type OrderRead } from './captureOrder';
import { knightSquareTaken } from './knightSquareTaken';
import { seatCp } from './winChance';
import { principleLine, principleContrastLine } from './moveFundamentals';
import { statusBandChange } from './statusBand';
import { refutedFromFan, candidatesFromAmateur, refutedAltProof, type FanLine } from './refutedAlternativeCore';
import { pawnHit, lineTakesPiece } from './trappedPiece';
import { moverLineProof } from './exchangeLedger';
import { MATERIAL_VALUE } from './pieceValues';
import { setUpClause, setUpHeldClause, setUpSkill, type SetUpChance } from './setUpChance';
import type { MustDefend } from './threatOut';
import { looseClaim, plyOfFen, type LooseSpells } from './conceptKey';
import { takingTheAttackerAnswers } from './positionReadingService';
import { threatProof } from './threatProof';
import { liveMethodBeat, type LiveMethodSignals } from './methodBeat';
import { boardPlanFacts, leverSentence } from './boardPlanFacts';
import { exchangeIdeas, type ExchangeIdeasInput } from './exchangeIdeas';
import { conceptForBoard } from './conceptEngine';
import { pinPressureConcept, guardRemovalConcept, type BoardConcept } from './boardTeachConcepts';
import { deliberationFacts, deliberationMarks, fullWeighingSays, deliberationWeighing, HELD_WEIGHING_SAYS, type Deliberation } from './deliberation';
import { detectLatentDangers, latentDangerClause, detectTradesCreatingPin, tradeDangerClause } from './latentDanger';
import { detectLatentFork, latentForkClause } from './latentFork';
import { detectCentralKingDanger, centralKingDangerClause } from './kingSafety';
import { readConversion } from './conversionMethod';
import { phaseVerdictLine } from './reviewPositionalAssessment';
import { buildOpponentIntent, opponentIntentFacts } from './opponentIntent';
import { readCriticalMoment, criticalMomentStatement, criticalMomentSquares, opponentOnlyMoveStatement } from './criticalMoment';
import type { LeansOn } from './perturbation';
import { planHere, strategicWhyImperative, strategicReason, strategicPlanPointer, strategicClaims, strategicSquares } from './moveFundamentals';
import { structurePlanFact } from './nextPlans';
import { structurePlanEvent, planChangeSentence } from './planThread';
import { readTrade, findTradeTarget } from './tradeQuality';
import type { LastMove } from './material';
import type { StockfishAnalysis } from '../types';
import { forkThreatKey } from './conceptKey';
import { lineTacticPoints } from './factStakes';

import { tradeLedger } from './tempoCount';
import { notYetPlayed } from './notYetPlayed';
import { heldResource } from './holdResource';
import { captureChoice } from './captureChoice';
import { kickAfterRecapture } from './kickMap';
import { kingReadsForBestLine } from './kingAttackReads';
import { explainMatingSacMechanism } from './reviewForcedSequence';
import { assessPositionalEdge, positionalVerdictLine } from './reviewPositionalAssessment';
import { buildMiddlegameOrientation } from './reviewStrategicOrientation';
import { buildOpponentDevelopmentRead, buildOpponentMoveTeaching } from './reviewOpponentCommentary';
import { lastMoveFromSan } from './material';
import type { PrevCaptureContext } from './captureRun';

import { plyFactsForMove, seatMoveSubject } from './pvPlayback';
import { computeBoardDelta } from './boardDelta';
import { type ExchangeIdeaKind } from './exchangeIdeas';
import { renderFundamentalVerdict } from './principleVoice';
import { definitionKey, tacticInvariant } from './conceptEngine';
import { describeMoveInfluence } from './moveInfluence';
import { correctionAgainstHeard } from './heardCorrection';

import { settledExchange } from './exchangeLedger';
import { inFluxAfter } from './boardState';
import { MISTAKE_CP } from './engineConstants';

import { detectTactics, tacticDescription } from './tacticsDetector';
import { verifyForkOnBoard } from './tacticVerification';
import { forkConsequence } from './tacticVocabulary';
import { pinConsequence } from './lookaheadPlan';
import { isScenicPawnPin } from './factStakes';
import { whyItEnded, idlePiece, quietDecider, exploreInvite, murkyRead, type GamePly, type EndRead } from './gameEndReads';
import { pawnEndingTrade, spareTempoWasted, outsidePasserDecoy } from './endgamePawnReads';
import { zugzwangSentence, zugzwangProof, type ZugzwangRead } from './zugzwang';
import { mateLine, lineWins } from './lineCalc';
import type { LineSeconds } from './lineTrust';
import { lineShape } from '../utils/andList';
import { whatItAsks, THEIRS } from './bookMoveWhy';
import { theirOpeningVerdict, openingAnnouncementForGame } from './openingAnnouncement';
import { type PlanBeat, type PlanArrow } from './reviewStrategicOrientation';
import { buildCausalChain, findAllowedChain, findMissedChain, causalChainArrows, causalChainKey } from './causalChain';
import { renderCausalChain } from './causalChainVoice';
import { recaptureChoice } from './recaptureChoice';
import { kneeJerk } from './kneeJerk';
import { strongChoice } from './strongChoice';
import { fileClaimed } from './planRace';
import { blunderCheck, autopilotGuard, keepPressing } from './safetyHabits';
import { tradeJudgement } from './tradeJudgement';
import type { PieceValue } from './pieceValueRead';
import { kingAttack } from './kingAttack';
import { ruleException } from './ruleException';
import { falseAlarm } from './falseAlarm';
import { pushOrHold } from './pushOrHold';
import { liveHabitKey } from './methodBeat';
import { piecePoints } from './factStakes';
import { studentMovesInLine, boardAfterSans } from './studentMoveNaming';
import { counterThreat, counterThreatLine } from './counterThreat';
import { playedConcept, playedConceptLine } from './playedConcept';
import { stalemateWatch } from './stalemateWatch';
import { checkMethod } from './checkMethod';
import { planChoice, type PlanChoiceLine } from './planChooser';
import { kingCourse } from './endgamePawnReads';
import { criticalMomentFound, type CriticalFanLine } from './criticalMoment';
import { deepFact, theirTarget, binding, moveHit } from './threeFacts';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { sayYourMove } from './spokenMove';
import { withSubject } from '../utils/openSentence';
import { conceptInstanceKey, tacticGeometryKey } from './conceptKey';
import { CAPTURE_VALUE } from './pieceValues';
import { signedCaptureRead, structureTransfer } from './positionReadingService';
import { rookReachesFile } from './positionalRead';
import { namedPawnStructure } from './nextPlans';
import { slipAnswerText } from './playCommentary';
import { countWarning } from './countMethod';
import { oppositeWingsRace } from './planRace';
// THE ONE FACT SET'S READS (the basket, 2026-11-19).
import { moveIdeaFact, moveLead, moveGerund, moveSeat, closeSentence, placedAs, castlePrepClaim, linePlays, followPvOf, orderMatters, horizonSaid, replyAnswers, boardTeacherThought, deepThought, FACT_SET_SURFACES, JOB_WEIGHT, STOCK_PHRASE, onlyMove, type MoveWords, type FactSetMultiKind } from './thoughtReads';
import type { PhraseMemory } from '../utils/phraseMemory';
import { sayIdea } from '../utils/phraseMemory';
import type { FollowLines } from './exchangeLedger';
import type { IntentReads } from './moveIntent';
import { moveIntent, intentRule } from './moveIntent';
import { moveAspects, evalReading, signedBand } from './reviewMoveBriefing';
import { moveJob, isBareJob, MINE } from './bookMoveWhy';
import { BOOK_JOB_IDEA, FUNDAMENTAL_IDEA } from './ideaKind';
import { computeMoveFundamentals } from './moveFundamentals';
import { toOtherSeat } from '../utils/seatPronouns';
import { moveThreat } from './moveThreat';
import { costReason, allowedClause } from './costReason';
import { computeMustDefend, flipSideToMove } from './threatOut';
import { rotateStem } from '../utils/rotateStem';
import { orderByThreat } from './orderByThreat';
import { desperadoAt, desperadoLine } from './desperado';
import { emptyCheckAt, emptyCheckLine } from './emptyCheck';
import { detectOpeningByOrder } from './openingDetectionService';
import { transposedOpening } from './openingPositions';
import { openingEquivalence } from './openingEquivalence';
import { preparesBreakClause } from './mastersPlanRead';
import { storyPlanAfter } from './openingStory';
import { namedStructureFormed, namedStructureLine } from './namedStructure';
import { stopsBreak } from './moveStops';
import { pieceRoute } from './pieceRoute';
import { moveOrder } from './moveOrder';
import { gambitIdea } from './gambitIdea';
import { BLUNDER_CP } from './engineConstants';
import { STORY_KEY } from './gameStory';
import { buildDeliberation, ruleOuts, NOTHING_SAID } from './deliberation';
import { bindingFact } from './threeFacts';
import { pvSanToUci } from './principleAttribution';

export type CoachSurface = 'learn' | 'review' | 'lesson' | 'play' | 'chat' | 'tactics' | 'weaknesses' | 'think';

/** What the picture's conclusions read (`pictureVerdict`, `picturePlan`). */
export interface PictureCtx {
  fen: string;
  student: Color;
  rating: number;
  reads: readonly WeighRead[] | null;
  considered: ConsideredTries | null;
  refuted: { tempting: readonly TemptingRefuted[]; standing: readonly StandingRefuted[] } | null;
  lines: readonly AnalysisLine[] | null;
  ledger?: PictureLedgerIn | null;
}

/** The conclusions of one board from its context: the refuters run on the
 *  reads when the surface has not run them already. Read once per context:
 *  the verdict, the plan and a caller that wants the tries themselves (the
 *  read, `boardReadFacts`) share one computation (`conclusionsOf` caches). */
const CONCLUSIONS = new WeakMap<PictureCtx, PictureConclusions | null>();
export function pictureConclusionsOf(c: PictureCtx): PictureConclusions | null {
  return conclusionsOf(c);
}
function conclusionsOf(c: PictureCtx): PictureConclusions | null {
  // The verdict and the plan read one context: read once.
  if (CONCLUSIONS.has(c)) return CONCLUSIONS.get(c) ?? null;
  const r = conclusionsRead(c);
  CONCLUSIONS.set(c, r);
  return r;
}
function conclusionsRead(c: PictureCtx): PictureConclusions | null {
  if (!c.reads || c.reads.length < 2) return null;
  const considered = c.considered ?? undefined;
  const tempting = c.refuted?.tempting ?? temptingOnBoard({ fen: c.fen, student: c.student, rating: c.rating, reads: c.reads, priorMove: null, considered });
  const standing = c.refuted?.standing ?? standingRefutations({ fen: c.fen, student: c.student, rating: c.rating, reads: c.reads, considered });
  return pictureVerdictOf({ fen: c.fen, student: c.student, rating: c.rating, reads: c.reads, considered: c.considered, tempting, standing,
    lines: c.lines ? c.lines.map((l) => ({ moves: l.moves, evaluation: l.evaluation, mate: l.mate ?? null })) : undefined, ledger: c.ledger ?? null });
}

/** Where a computer reaches a surface — the FILE that calls it — or why not. */
type SurfaceAnswer = { wired: string } | { not: string };

/** WHAT A READ SAYS, before the registry places it — every field of the one
 *  fact except those its computer's row answers (its kind, group, step and
 *  computer) and its id. Each producer answers its seat, the student move it
 *  names, its thread and its stakes: nothing defaults (WO-STORY-MATRIX-01 P1-6). */
type ReadParts = Omit<CoachFact, 'id' | 'kind' | 'group' | 'step' | 'computer' | 'stakes'> & {
  /** Its say-once key — the tail of its id (`readKey`). Every read but the
   *  threat's cost is said under it, so it is also its first claim. */
  key: string;
  /** The gap its computer measured, or null — the registry answers the
   *  reason for none from the row's kind (`stakesOf`, P1-10). */
  stakes: FactStakes | null;
};

/** The one fact a read becomes: its id is its computer's and its key, its
 *  place comes from its kind (`placeFact`) like every producer's, and its
 *  computer is the catalog row on the registry entry. */
type MakeFact = (parts: ReadParts) => CoachFact;

/** THE KEY A READ WAS MADE UNDER — its say-once key, the tail of the id the
 *  registry's one maker gave it (`readBoardAll`: `<computer id>:<key>`; the
 *  opening's story makes its own, `openingStoryAt:<key>`). A
 *  surface that keeps one key for a read (Review's `hint:` ledger, Learn's
 *  threat and tactic keys, the plan thread's offered claims) reads it here,
 *  never off the words. */
/** What a principle read's key says (`principle` / `principleContrast`). */
export function principleKey(f: CoachFact): { id: string; first: boolean; headsMove: boolean } {
  const k = readKey(f);
  const bar = k.indexOf('|');
  const head = k.slice(0, bar);
  return { id: k.slice(bar + 1), first: head[0] === '1', headsMove: head[1] === 'h' };
}

/** What a conversion read's key says: the step, and its passer when it has one. */
export function conversionKey(f: CoachFact): { step: string; passer: string | null } {
  const [step, passer] = readKey(f).split('|');
  return { step, passer: passer || null };
}

/** What a structure plan read's key says: the plan's id, its idea key and its
 *  aim (`structurePlanFact`), each null where the plan has none. */
export function structurePlanKey(f: CoachFact): { id: string; ideaKey: string | null; aim: string | null } {
  const [id, ideaKey, aim] = readKey(f).split('|');
  return { id, ideaKey: ideaKey || null, aim: aim || null };
}

/** What a live method read's key says: the habit, and its say-once key. */
export function liveMethodKey(f: CoachFact): { habit: string; key: string } {
  const k = readKey(f);
  const bar = k.indexOf('|');
  return { habit: k.slice(0, bar), key: k.slice(bar + 1) };
}

/** What a positional read's key says: the observation's kind and its key. */
export function positionReadKey(f: CoachFact): { kind: string; key: string } {
  const k = readKey(f);
  const bar = k.indexOf('|');
  return { kind: k.slice(0, bar), key: k.slice(bar + 1) };
}

/** What an exchange idea's key says: its kind and its say-once claim. */
export function exchangeIdeaKey(f: CoachFact): { kind: 'trade-idea' | 'defence-idea' | 'nugget'; claim: string } {
  const k = readKey(f);
  const bar = k.indexOf('|');
  return { kind: k.slice(0, bar) as 'trade-idea' | 'defence-idea' | 'nugget', claim: k.slice(bar + 1) };
}

/** A concept read (`boardConcept`, `pinPressure`, `guardRemoval`) back as the
 *  concept the live read teaches: its source and id from the key, its full
 *  words, its short form (`alsoText`), its squares and board, and either the
 *  line that reaches that board or — a pile-on — the move that piles on. */
export function boardConceptOf(f: CoachFact): BoardConcept {
  const [source, id, pin] = readKey(f).split('|');
  const line = f.lines?.[0];
  return {
    computer: f.computer, id, source, full: f.text, squares: f.squares, boardFen: f.fen,
    ...(f.alsoText ? { short: f.alsoText } : {}),
    ...(line && pin ? { pinMove: { fen: line.fen, san: line.sans[0] } } : line ? { line: [...line.sans] } : {}),
  };
}

/** The observation's own kind a positional read was made under (`positionRead`). */
export function positionReadKind(f: CoachFact): string {
  const k = readKey(f);
  return k.slice(0, k.indexOf('|'));
}

/** The lever a minority-attack read pushes (`minority`), off its key. */
export function minorityLever(f: CoachFact): string | null {
  const k = readKey(f);
  const bar = k.indexOf('|');
  return bar < 0 ? null : k.slice(bar + 1);
}

export function readKey(f: CoachFact): string {
  return f.id.slice(f.id.indexOf(':') + 1);
}

/** What reading their move needs. */
interface TheirReadCtx { fenBefore: string; san: string; student: Color; lines: readonly ReadLine[]; prev: { fenBefore: string; san: string } | null; flagged: boolean | null }

/** Each computer's own context — what it needs from the surface, no more. */
export interface BoardContexts {
  /** The student's own pinned piece that walks out with tempo (`fen`: student to move). */
  pinBreakOwn: { fen: string; student: Color };
  /** Their pinned piece on `pinned` can walk out — said beside the student's pin. */
  pinBreakTheirs: { fen: string; student: Color; pinned: string };
  /** The quiet move that stops their next pin, kick or fork — only when the
   *  engine's own top lines start with it. */
  prophylaxis: { fen: string; engineFirstMoves: readonly string[] };
  /** Their move is the pin or kick a quiet move of the student's would have
   *  stopped: `prevFen` the board before the student's last move, `studentSan`
   *  that move, `fenBefore`/`san` their move now. */
  prophylaxisMissed: { prevFen: string; studentSan: string; fenBefore: string; san: string; student: Color };
  /** A first, because it clears the road B needs (engine line from `fen`).
   *  Named for its computer (`findEnablingMove`): the move-order point —
   *  "X first, because Y right now runs into R" — is `moveOrder`'s own. */
  enablingMove: { fen: string; pv: readonly string[] };
  // ── REVIEW'S PER-MOVE FACETS (one-coach basket): the reads Review's
  // `computeMoveFacets` says, each worded here, never at its call site. ──
  /** THE TRADE COUNT (`tradeLedger`): the game's moves through the reply. */
  tradeLedger: { history: readonly string[]; student: Color };
  /** A move's point not yet played (`notYetPlayed`): the student's engine move. */
  notYetPlayed: { fenBefore: string; san: string; bestSan: string | null; cpLoss: number };
  /** A resource held back (`heldResource`), proved by its line. */
  heldResource: { fenBefore: string; san: string; bestSan: string | null; cpLoss: number; student: Color };
  /** Which capture to make (`captureChoice`), proved by the bad one's line. */
  captureChoice: { fenBefore: string; san: string; bestSan: string | null; cpLoss: number; student: Color };
  /** The kick after their recapture (`kickAfterRecapture`). */
  kickAfterRecapture: { fenBefore: string; san: string; reply: string | null; bestUci: readonly string[]; student: Color };
  /** The pawn square taken first (`pawnSquareTaken`). */
  /** `student` REQUIRED: the race is said as the student's pawn ("Your pawn got there first") — the opponent's push is never read as theirs. */
  pawnSquareTaken: { fenBefore: string; san: string; cpLoss: number; student: Color };
  /** The king reads the engine's best line poses (`kingReadsForBestLine`) —
   *  the ones that name a move, said as "Here, …". */
  kingReadsBestLine: { fenBefore: string; student: Color; bestUci: readonly string[] };
  /** A sacrifice's compensation (`sacrificeCompensation`), from the mover's
   *  seat (`moverCp`/`moverCpBefore`: the mover's scores after and before);
   *  proved by the engine's `line` after it. */
  sacCompensation: { fenBefore: string; san: string; fenAfter: string; mover: Color; moverCp: number | null; moverCpBefore: number | null; student: Color; line: readonly string[] };
  /** How a mating sacrifice works (`explainMatingSacMechanism`). */
  sacMechanism: { sans: readonly string[]; sacIdx: number };
  /** The sacrifice that breaks the king's shield (`describeSacBreaksKingShield`). */
  sacKingShield: { fenBefore: string; san: string };
  /** The board's structure state (`describeStructure`): files, outposts, pawns. */
  structureState: { fen: string };
  /** Who's better and why at the turn of the game (`phaseVerdictLine`). */
  phaseVerdict: { fen: string; student: Color; studentCp: number | null; phase: 'middlegame' | 'endgame'; heard: ReadonlySet<string>; lastMove: LastMove | null };
  /** The middlegame plan (`buildMiddlegameOrientation`) — never while their
   *  king is stuck in the centre (a king hunt, not a majority grind). `seat`:
   *  whose plan the beat may carry ('both' is the one-shot orientation the
   *  walk says once); `san`: the move played, so a storm pushed at the
   *  student's own king is said so (null on a board with no move). */
  middlegameOrientation: { fen: string; student: Color; seat: 'student' | 'opponent' | 'both'; san: string | null };
  /** Their development so far (`buildOpponentDevelopmentRead`). */
  opponentDevelopment: { oppSans: readonly string[]; fen: string; student: Color };
  /** The point of the student's quiet move (`studentMovePoint`); none on a capture. */
  studentMovePoint: { fenBefore: string; san: string; prevCap: PrevCaptureContext | null };
  /** The positional verdict (`assessPositionalEdge`). `quietBareBalanced`:
   *  the surface's setting — a bare "balanced" with no reason is not said. */
  positionalVerdict: { fenBefore: string; san: string; fen: string; student: Color; studentCp: number | null; quietBareBalanced: boolean };
  /** What the move did on the board (`plyFactsForMove`), owned by its mover. */
  plyFacts: { fenBefore: string; san: string; prevCap: PrevCaptureContext; moverIsStudent: boolean };
  /** Every other change the move caused (`computeBoardDelta`), a fact a
   *  clause, seated from the student's side when known. */
  boardDelta: { fenBefore: string; san: string; fenAfter: string; student: Color | null };
  /** The trade, defence and conversion ideas (`exchangeIdeas`). */
  exchangeIdeas: ExchangeIdeasInput;
  /** The fundamental the flagged move crossed (`renderFundamentalVerdict`):
   *  its diagnosis (key `diagnosis|…`), then its how (key `how|…`). `seen` is
   *  the game's ledger of fundamentals said in full — the read never writes
   *  it; the caller adds `fundamentalsSaid(diagnosis)` once it is said. */
  fundamentalVerdict: { fen: string; attrs: readonly PrincipleAttribution[]; ply: number; seen: ReadonlySet<FundamentalId>; replySan: string | null };
  /** The rule of the tactic the better move would have landed (`tacticInvariant`). */
  tacticRule: { fen: string; type: string };
  /** The moved piece's new pressure (`describeMoveInfluence`), seated from
   *  the student's side when known; its shape rides its key (`influenceShapeOf`). */
  moveInfluence: { fenBefore: string; fenAfter: string; san: string; student: Color | null };
  /** The deeper read against the grade heard live (`correctionAgainstHeard`):
   *  key `rides` when it joins the verdict, `alone` when it stands alone. */
  heardCorrection: { fen: string; heard: HeardVerdict; classification: string | null; san: string };
  /** What their move targets (`buildOpponentMoveTeaching`); its kind rides
   *  its key (`oppTeachingKind`). */
  opponentMoveTeaching: { fenBefore: string; san: string; student: Color };
  /** The student's answer to their slip (`slipAnswerText`, Review's voice). */
  /** A capture they can take back, played (Review's trade line): how good
   *  the trade is (`tradeJudged`, `readTrade`), else what the exchange settles
   *  (`tradeSettled`, `settledExchange`). `lineUci`: the engine's line after
   *  the move; `prior`: the move before it; `costCp`: the mover's cost (raw);
   *  `moverCostCp`: that cost, null across a mate score. */
  tradeJudged: TradePlayedCtx;
  tradeSettled: TradePlayedCtx;
  /** THE TACTICS ON THE BOARD AFTER A MOVE (`detectTactics`), seated from the
   *  student's side: a fork said only when verified, a scenic pawn pin never,
   *  a pin with what it holds. `motifSaid`: the instances of each motif the
   *  walk has said, so a sentence rotates by its place among them;
   *  `skipMateAgainst`: the side whose mate the verdict already said (its
   *  mate-in-one is not said twice), or null. Each fact's key is its motif
   *  instance (`tacticOf`). */
  boardTactics: { fenBefore: string; san: string; fenAfter: string; student: Color | null; lineUci: readonly string[]; motifSaid: ReadonlyMap<string, readonly string[]>; skipMateAgainst: Color | null };
  /** The guard the student's move tied down, still tied after their reply. */
  tiedDefender: { fenBefore: string; fenAfterMove: string; fenAfterReply: string; student: Color };
  /** Their move took an attacker off a piece the student had to look after. */
  obligationLifted: { fenBefore: string; fenAfter: string; student: Color };
  /** A capture that looks free and leaves the queen with no safe square. */
  queenGrabTrap: { fen: string };
  /** The book move the student just left, with the job it does on the board
   *  (the student's own departure, the move it happened or the reply after). */
  bookMove: { history: readonly string[]; student: Color;
    /** REQUIRED — see `openingSlip`'s `plain`: Learn true, elsewhere false. */
    plain: boolean };
  /** Opening theory, calculated, on the last two moves of `history` (the
   *  student's move and the reply): main move, other tries, reply, score. */
  openingTheory: { history: readonly string[]; student: Color } | { words: MoveWords };
  /** What each of the last two moves of `history` stops, the order it kept,
   *  the line it cut (gaps B1-B3). `follow`: the line after, when known. */
  moveGains: { history: readonly string[]; student: Color } | { words: MoveWords };
  /** The moved piece stepped off a line and opened a check its side gives in
   *  `line` (the moves after `san`, the reply first) on its second move after. */
  opensCheck: { fenBefore: string; san: string; line: readonly string[] | null; student: Color; tense: 'past' | 'now' };
  /** Two pieces to take, the one with check first (`line`: the moves after
   *  `san`; `reads`: the mover's fan at `fenBefore`, White's view). */
  captureOrder: { fenBefore: string; san: string; line: readonly string[] | null; reads: readonly OrderRead[]; student: Color; tense: 'past' | 'now' };
  /** A c- or f-pawn on its knight's natural square, the knight at home
   *  (`costCp`: the move's cost to its mover, or null — then nothing). */
  knightSquareTaken: { fenBefore: string; san: string; student: Color; costCp: number | null };
  /** The club index's known mistakes and traps on the last two moves of
   *  `history` (Learn): a slip either side played, else the slip waiting. */
  slipsOnLine: { history: readonly string[]; student: Color };
  /** The student's own costly departure from this position in another game. */
  lastTimeHere: { fenBefore: string; playedSan: string; rows: readonly BookDepartureRow[]; currentGameId: string | null };
  /** The student's queen or rook attacked with no safe square. */
  trapped: { fen: string; student: Color };
  /** Count before you take: the student's move lost the count (a capture on a
   *  square they did not outnumber, a piece put where it cannot be held). */
  countMethod: { fenBefore: string; playedSan: string; student: Color; costCp: number | null };
  /** The priority before the move: the engine's best move aims at a weak pawn. */
  priorityFirst: { fen: string; student: Color; bestUci: string };
  /** A threat warning, with the cost it claims proven on the board. */
  threatCost: { line: string; fen: string; student: Color; squares: readonly string[] };
  /** What the engine's best move does about a threat just named (`fen`:
   *  student to move) — the answer half of the threat. REQUIRED `namesMove`:
   *  a live board holds the move and says the kind of answer (David
   *  2026-10-10). `ply` keys its rotated question. */
  threatAnswer: { fen: string; squares: readonly string[]; shape: 'line' | 'hit'; bestUci: string | null; whiteCp: number | null; student: Color; ply: number; namesMove: boolean };
  /** The student's plan, carried across moves: its stop proven off their
   *  move, then the next plan (mutates the thread held in the surface's memory). */
  planThread: { thread: PlanThread; ply: number; fenBefore: string; fenAfter: string; student: Color; studentPovCp?: number | null; studentMove?: { fenBefore: string; san: string } | null; holdPlayable: boolean; studentBestUci: string | null };
  /** The line tactics (tacticGeometry): interference, clearance, decoy and
   *  deflection, the discovery audit, their in-between move, the fork that
   *  serves a plan, the kick that fails, the counterfactual fork, the pawn
   *  that can't block, interposition, the loaded line, the pinner pinned. */
  tacticGeometry: GeometryContext;
  /** The structure judgements of the student's move (batch 6). */
  /** Writer settings: may the better move and the student's own move be named? */
  structureMove: { fenBefore: string; san: string; student: Color; cpLoss: number; bestSan: string | null; bestUci: readonly string[]; reply: string | null; namesBetterMove: boolean; namesStudentMoves: boolean };
  /** What their move did to the student's structure and squares. */
  structureTheirMove: { fenBefore: string; san: string; student: Color };
  /** The standing structural facts, student to move. */
  /** THE LIVE READ'S BOARD FACTS (the basket, positionFacts): each the one
   *  writer of its sentence. The standing crossed a band since the last read
   *  (`studentCp`/`prevStudentCp`, the student's side). */
  statusBand: { fen: string; studentCp: number; prevStudentCp: number };
  /** A pin or skewer in waiting on the student's own king or queen. */
  latentDanger: { fen: string; student: Color };
  /** A trade of the student's that would line their own pieces up for a pin. */
  tradeDanger: { fen: string; student: Color };
  /** A knight fork two quiet moves away — the student's own first, else theirs. */
  latentFork: { fen: string; student: Color };
  /** A castled king with a broken shelter under real fire. */
  /** An uncastled central king with the file about to open. REQUIRED
   *  `namesMoves`: may the line say how to get castled? */
  centralKingDanger: { fen: string; student: Color; namesMoves: boolean };
  /** The conversion step this won board is on (the student a piece up). */
  conversion: { fen: string; student: Color };
  /** Who's better and why, at the turn of the game. `heard`: the say-once
   *  keys already spoken; `lastMove`: the move that produced `fen`. */
  opponentIntent: { fen: string; topLines: StockfishAnalysis['topLines'] };
  /** The critical moment counted off the fan: on the student's move, how many
   *  moves hold and what they hold (`anchor`: the reply that made the board);
   *  on the opponent's, that they have one move — or, on a critical tier with
   *  no count, that the position is sharp for them. */
  criticalMoment: { fen: string; topLines: StockfishAnalysis['topLines']; mover: Color; studentToMove: boolean; ply: number; anchor: { san: string; fenBefore: string } | null; critical: boolean };
  /** The piece a side leans on, as the perturbation probe found it — the
   *  probe is async and runs with the surface's eval, so the read is handed in. */
  leansOn: { fen: string; read: LeansOn; seat: FactSeat };
  /** The plan the student's best move (`bestSan`) serves. */
  strategicPlan: { fen: string; bestSan: string; student: Color };
  /** The plan the pawn structure earns — said when the student has not heard
   *  it (`heard`: the structure thread's last plan) or it changed; quiet when
   *  its idea was already said (`said`). */
  structurePlan: { fen: string; student: Color; heard: string | null; said: ReadonlySet<string> | null };
  /** Their best piece and the student's worst, the trade the engine's line makes. */
  tradeTarget: { fen: string; student: Color; bestLine: readonly string[] | null };
  /** How good a trade just played was (`costCp`: its graded cost; `priorMove`:
   *  the move that led to `fenBefore`). */
  tradeRead: { fenBefore: string; san: string; student: Color; costCp: number | null; priorMove: LastMove | null; namesPlayedMove: boolean };
  /** The move players at this level reach for at `fenBefore` (their popular
   *  moves) and what it costs off the fan already read there. */
  refutedAlt: { fenBefore: string; playedSan: string; popular: ReadonlyArray<{ san: string; games: number; pct: number }>; fan: readonly FanLine[]; student: Color };
  /** The engine's best move traps a piece of theirs, its own line taking it
   *  (`line`: the best line, UCI; `priorMove`: the move that made the board). */
  trapChance: { fen: string; student: Color; line: readonly string[] | null; priorMove: { fenBefore: string; san: string } | null };
  /** A tactic the student can set up with one quiet move — the read the
   *  surface took off its fan (`detectSetUpChance`), said here. */
  setUpChance: { fen: string; read: SetUpChance };
  /** What the student must defend now — the null-move probe's read, said
   *  here (`looseSpells`: the spells of their loose pieces this game). */
  mustDefend: { fen: string; student: Color; read: MustDefend; studentToMove: boolean; studentCp: number; looseSpells: LooseSpells | null };
  /** The habit to run on this board, present tense (`ply` rotates its stems,
   *  `said` its say-once ledger). */
  liveMethod: { fen: string; signals: LiveMethodSignals; ply: number; said: ReadonlySet<string> | undefined };
  /** The plans the board earns (development, breaks, files, outposts) —
   *  `withTrump`: the structural trump too, where no plan line said it. */
  boardPlans: { fen: string; student: Color; withTrump: boolean };
  /** The positional read of the board for both sides. */
  /** The lead computed concept of the board (a tactic, a technique), off the
   *  engine's line when the surface may walk it (`analysis`). */
  boardConcept: { fen: string; student: Color; rating: number; analysis: Pick<StockfishAnalysis, 'topLines' | 'evaluation'> | undefined };
  /** A pin with a pile-on, for either seat. */
  pinPressure: { fen: string; student: Color };
  /** A piece held by one guard, for either seat. */
  guardRemoval: { fen: string; student: Color };
  /** The weighing — the read the surface built (`buildDeliberation`), said
   *  here: the alternatives ruled out and the move, and its held form (the
   *  rule-outs alone). `saysBestLine`: the weighing plays the best line out. */
  deliberation: { fen: string; read: Deliberation; said: ReadonlySet<string>; saysBestLine: boolean }
    | { words: MoveWords; fan: readonly AnalysisLine[]; prev: PrevCaptureContext; theirLast: { fenBefore: string; san: string } | null; deep: boolean };
  structureBoard: { fen: string; student: Color };
  /** Plan choices off the student's MultiPV at `fen` (student to move).
   *  REQUIRED `namesMoves`: a live board holds the moves (the choice is said
   *  without them); a lesson's line is a model line and names them. */
  structureLines: { fen: string; student: Color; lines: readonly { moves: readonly string[]; evaluation: number; mate?: number | null }[]; namesMoves: boolean };
  /** The opening's story at the board after `history` (`fen`, student to
   *  move): masters data read from memory, never fetched here. REQUIRED
   *  `namesStudentMoves`: a live board holds every fact that would name a move
   *  the student can play now. */
  openingStory: { history: readonly string[]; fen: string; student: Color; namesStudentMoves: boolean; theory: boolean };
  /** A king that lost castling, walked by hand: what this move (`san` on
   *  `fenBefore`, either seat) did for the walk — the plan, the square it took
   *  from their knight, a step, the walk done. */
  castleByHand: { fenBefore: string; san: string; student: Color };
  /** The rule of thumb on a king walked out of the centre (either seat). */
  kingFromCentre: { fenBefore: string; san: string; student: Color };
  /** A bishop left home while the king walks: the check it would block. */
  keptHome: { fenBefore: string; san: string; student: Color };
  /** In check with only king moves: the squares mated and the square chosen.
   *  `lines` — the mover's fan before the move where the surface has one;
   *  `bestUci` — the engine's best move there. */
  kingSquares: { fenBefore: string; san: string; student: Color; lines: ReadonlyArray<{ moves: readonly string[] }> | null; bestUci: string | null };
  /** A known mistake or trap from the club gem index at `fen` (Review only,
   *  David 2026-11-04), said on the move that PLAYED it: the move club
   *  players really play here, and its punishment. */
  knownSlip: Omit<KnownSlipContext, 'on'>;
  /** The same index's slip at the board a move REACHED, when the game went
   *  another way: the trap or mistake named before it could land. */
  trapAhead: Omit<KnownSlipContext, 'on'>;
  /** THE REPLY TREE after a move (`fen`: the board after it, the replier to
   *  move): the replies likely at `rating` (the human model) and the engine's
   *  best, each with the mover's answer from ONE read of every legal reply
   *  (`replies`; null: no such read here, nothing said). `seconds`: other
   *  reads of `fen`. `played`: the reply the line goes on with (uci) — its
   *  branch is the line itself. `tense`: before the reply (a lesson's line)
   *  or after the game went on. REQUIRED `liveBoard`: the board the student
   *  moves on now (Learn), where an answer they could play is held in a form
   *  that names no move; null on a surface with no live board. */
  ifTheyPlay: { fen: string; replies: readonly ReplyRead[] | null; rating: number; student: Color; seconds: ReadonlyArray<readonly string[] | null>; played: string | null; tense: TreeTense; liveBoard: string | null; /** The move that made `fen` (SAN), or null: the square it landed on is read from it here. */ madeBy: string | null };
  /** THE BAIT (WO-COACH-NEXT-TO-YOU-01 C4): the same read of every reply as
   *  the reply tree — the bait is its likely reply that loses. */
  baitSet: BoardContexts['ifTheyPlay'];
  /** THE MOVES A PLAYER WEIGHS (`weighedMoves`, 2026-11-05): the move `san`
   *  played on `fenBefore` (either seat) against the candidates a player at
   *  `rating` weighs there. `reads` — one engine read per candidate from
   *  `fenBefore`, the move played among them (`WeighRead`), or null where the
   *  surface has none; `priorMove` — the move before, so a recapture is half
   *  a trade. The tempting candidate that fails, with its refutation. */
  temptingRefuted: { fenBefore: string; san: string; student: Color; rating: number; reads: readonly WeighRead[] | null; priorMove: { fenBefore: string; san: string } | null };
  /** THE TEMPTING MOVE ON THE BOARD (`weighedMoves.temptingOnBoard`,
   *  WO-DANYA-READS-01 group 4): before the side to move plays, the move a
   *  player at `rating` is drawn to that fails, against the engine's best.
   *  `reads` — one read per candidate from `fen`, the best move among them
   *  (a fan, or a MultiPV whose lines each read their first move); null where
   *  the surface has none. */
  temptingNow: { fen: string; student: Color; rating: number; reads: readonly WeighRead[] | null; priorMove: { fenBefore: string; san: string } | null };
  /** Two moves of the same worth and the board's difference between them. */
  alsoGood: { fenBefore: string; san: string; student: Color; rating: number; reads: readonly WeighRead[] | null };
  /** Which square for the piece: its other squares and what goes wrong there
   *  (board reads; the engine's line where `reads` has one). */
  squareChoice: { fenBefore: string; san: string; student: Color; rating: number; reads: readonly WeighRead[] | null; priorMove: { fenBefore: string; san: string } | null; beaten: string | null; namesStudentMoves: boolean };
  /** THE PAWN BREAK (`pawnBreak`, the teaching move S-BREAK): the move `san`
   *  on `fenBefore` (either seat) read as a break and what it is for.
   *  `lastTo` — the square the opponent's last move landed on (a recapture is
   *  no break), null at the start or where the surface has no move before.
   *  `namesStudentMoves` — false on Learn's own seat (the move just played is
   *  "your move"); every other surface names it. */
  pawnBreak: { fenBefore: string; san: string; student: Color; lastTo: string | null; namesStudentMoves: boolean };
  /** OPPOSITE-COLOURED BISHOPS (`oppositeBishops`): the move `san` on
   *  `fenBefore` (either seat) after which one bishop each, on opposite
   *  colours, stands settled with a consequence it did not have before. */
  oppositeBishops: { fenBefore: string; san: string; student: Color };
  /** THE PLAN'S NEXT STEPS (`planSteps`): on `fenAfter` (the move just
   *  played, either seat), the mover's next quiet moves in the engine's line
   *  `line` (UCI, the reply first) and what ties them — a square they all aim
   *  at, or a break. `played`: the move that made `fenAfter` (UCI), or null —
   *  a plan tied only by the break that move prepares is the move's own job. */
  planSteps: { fenAfter: string; line: readonly string[]; student: Color; played: string | null };
  /** THE ONE PLAN OF THE BOARD (`planOfTheBoard`): on `fen` (the side to
   *  move's, either seat), the plan the engine's best line plays — a road, a
   *  siege, a kick, a weak pawn, an outpost, a passer, the worst piece, a break
   *  — chosen by where the line starts it. `lines`: the engine's lines on
   *  `fen`, best first. `namesMoves`: may it name a move the student is still
   *  to find (Learn's live board holds it). */
  planOfTheBoard: { fen: string; lines: readonly AnalysisLine[]; student: Color; namesMoves: boolean };
  /** THE PICTURE'S CONCLUSIONS (WO-PICTURE-01 P3, `pictureVerdict`): on `fen`,
   *  the verdict read after the tries and the try that survives them. `reads`:
   *  one engine read per candidate from `fen` (the best among them — a fan, or
   *  a MultiPV whose every line reads its first move); `considered`: the tries
   *  weighed past the eye (`consideredTries`), null where the surface read none;
   *  `refuted`: what the refuters already made on these reads, null to make it
   *  here; `lines`: the engine's MultiPV on `fen` for the plan, null for the
   *  best read alone; `ledger`: the ledger's counterplay read, when built. */
  pictureVerdict: PictureCtx;
  picturePlan: PictureCtx;
  /** COMPENSATION (`positionAssessment`): on `fenAfter`, a side down material
   *  and still level or better by the engine (`studentCp`, the student's
   *  seat), with the board reason that pays for it. `line`: the engine's line
   *  from `fenAfter` (UCI) — a capture or check next is a trade still going. */
  compensation: { fenAfter: string; student: Color; studentCp: number; line: readonly string[] };
  /** RATE A PIN (`harmlessPin`, Danya 1Rejj 7.Bb5): the move `san` on
   *  `fenBefore` (either seat) pins a piece that a pawn guards, and the
   *  engine's line `line` from the board after it (UCI, their reply first)
   *  ends the pin within two of the pinned side's moves. */
  harmlessPin: { fenBefore: string; san: string; student: Color; line: readonly string[] };
  /** LIST THE QUEEN'S ESCAPES (`queenNet`, Danya hv0P 12.Nd4): the move `san`
   *  on `fenBefore` (either seat) takes a safe square from the other queen
   *  and leaves it one or none. */
  queenNet: { fenBefore: string; san: string; student: Color };
  /** TWO HANGING, ONE MOVE SAVES BOTH (`bothSaved`, Danya FozbG 27.Ne7): the
   *  move `san` on `fenBefore` (either seat). `replies`: the engine's lines
   *  from the board after it, best first (White-POV cp); [] where none. */
  bothSaved: { fenBefore: string; san: string; student: Color; replies: readonly ReplyLine[] };
  /** THE STALEMATE TRICK (`stalemateWatch`): the move `san` on `fenBefore`
   *  (either seat) by the side behind leaves the other side a capture that
   *  stalemates it — a chance for the side behind, a capture to leave for the
   *  side ahead. */
  stalemateTrick: { fenBefore: string; san: string; student: Color };
  /** A PERPETUAL CHECK (`repeatingChecks`): the move `san` on `fenBefore`
   *  (either seat) starts one, or leaves the side to move one it can force.
   *  `replies`: the engine's lines from the board after the move (White-POV
   *  cp), to stay quiet where the side with the checks is winning anyway. */
  perpetualCheck: { fenBefore: string; san: string; student: Color; replies: readonly ReplyLine[] };
  /** A WINDMILL (`repeatingChecks`): the move `san` on `fenBefore` (either
   *  seat) turns one, or leaves the side to move one. */
  windmill: { fenBefore: string; san: string; student: Color };
  /** KNIGHT AGAINST BISHOP (`minorMatchup`): the move `san` on `fenBefore`
   *  (either seat) that leaves one knight against one bishop, settled, with a
   *  verdict it did not have before — the good knight against the bad bishop,
   *  the closed board and the outpost, or the open board for the bishop — or
   *  that leaves a bishop the wrong colour for its rook's pawn. */
  minorMatchup: { fenBefore: string; san: string; student: Color };
  /** THE KING UNDER SIEGE (`kingSiege`, WO-DANYA-READS-01 group 1): after
   *  the move `san` on `fenBefore` (either seat), a king its attackers now
   *  outnumber — the pieces aimed at it against its defenders, and the ones
   *  too far to help. `replies`: the engine's lines after the move (White-POV
   *  cp), to stay quiet for a side the engine has losing; [] where none. */
  kingSiege: { fenBefore: string; san: string; student: Color; replies: readonly ReplyLine[] };
  /** THE BACK RANK (`kingSiege.backRankWeakness`): after the move, a king
   *  with no luft whose back rank one piece holds — taken off, the check is
   *  mate. Either seat. */
  backRankWeakness: { fenBefore: string; san: string; student: Color };
  /** THE LOADED DISCOVERY (`kingSiege.loadedDiscovery`): after the move, a
   *  piece that is all that stands between its own slider and the other king,
   *  and takes a piece with the check. Either seat. */
  loadedDiscovery: { fenBefore: string; san: string; student: Color };
  /** THE SACRIFICE AT THE KING (`kingSiege.kingSacrifice`): the move `san`
   *  gives up material by the other king, is taken, and the engine's line
   *  after it (`replies[0]`, UCI, the reply first) proves it — what it opens
   *  and the forced follow-up. Either seat. */
  kingSacrifice: { fenBefore: string; san: string; student: Color; replies: readonly ReplyLine[];
    /** REQUIRED — other reads of the top line after the move (each from the
     *  reply), `[]` where the surface has one: the line is named by the ONE
     *  naming rule (`lineTrust`). */
    seconds: ReadonlyArray<readonly string[]> };
  /** THE HIDDEN COMBINATION (`deepCombination`, WO-DANYA-READS-01 group 8):
   *  the move `san` gives up material away from the other king, and the
   *  engine's line after it (`replies[0]`, UCI, the reply first) forces it
   *  back with interest, or mates. Either seat. */
  deepCombination: { fenBefore: string; san: string; student: Color; replies: readonly ReplyLine[];
    /** REQUIRED — other reads of the top line after the move (each from the
     *  reply), `[]` where the surface has one: the line is named by the ONE
     *  naming rule (`lineTrust`; review audit 2026-11-18: "Nxe5 looks like it
     *  drops your knight … two moves later, you play Qxh8" on one read). */
    seconds: ReadonlyArray<readonly string[]> };
  /** GETTING INTO THEIR CAMP (`intoTheirCamp`, Danya's speedruns): the move
   *  `san` on `fenBefore` (either seat) gets a piece into their half and hits
   *  what they cannot keep, puts the rooks on the seventh, lifts or swings a
   *  rook toward their king, connects the rooks — or, on move 12, leaves them
   *  still cut off. */
  intoTheirCamp: { fenBefore: string; san: string; student: Color };
  /** PRESSURE ON THEIR TARGET (`pressureOf`, Danya's articles): the move
   *  brings a piece against a pawn of theirs no pawn can guard, and the siege
   *  the engine's line builds on its file (doubled rooks, Alekhine's gun).
   *  `lineAfter`: the engine's line from the board after the move, reply
   *  first; `costCp`: what the move cost against the best (the gate: an
   *  instruction is never handed out on a move the engine refutes). */
  targetPressure: { fenBefore: string; san: string; student: Color; lineAfter: readonly string[]; costCp: number | null };
  /** THE BREAK, READIED (`breakPrep`): the move gets a pawn break ready that
   *  the engine's line plays next — it clears or guards the square the pawn
   *  lands on, or puts a rook on the file the break opens. Gated on the cost. */
  breakPrep: { fenBefore: string; san: string; student: Color; lineAfter: readonly string[]; costCp: number | null };
  /** THE BREAK, STOPPED (`breakStopped`): the move takes away a break of the
   *  other side's that was worth something — it can no longer be played, or
   *  the pawn is simply lost on its square. Gated on the cost. */
  breakStopped: { fenBefore: string; san: string; student: Color; costCp: number | null };
  /** THE FLEXIBLE MOVE (`flexibleMove`, the option principle): the move `san`
   *  on `fenBefore` (either seat) against the moves the engine holds near the
   *  best. `reads`: the engine's lines from the board before the move, one per
   *  candidate, the move played among them (`WeighRead`); null where none. */
  flexibleMove: { fenBefore: string; san: string; student: Color; reads: readonly WeighRead[] | null };
  /** THE EXCHANGE SACRIFICE (`exchangeSacrifice`, Danya's "give up the
   *  rook, because in return you get a monster"): the move `san` on
   *  `fenBefore` (either seat) gives a rook for a minor (or a minor and a
   *  pawn), lost by the legal exchange, with the engine reading it no worse
   *  than the best — and what it buys on the board. `reads`: the engine's
   *  lines from the board before the move, one per candidate, the move played
   *  among them (`WeighRead`); null where none. */
  exchangeSacrifice: { fenBefore: string; san: string; student: Color; reads: readonly WeighRead[] | null };
  /** THE PAWN MAJORITY ON A WING (`pawnMajority`, Danya's "White gets a
   *  queenside majority, you get a kingside majority"): the move `san` on
   *  `fenBefore` (either seat) makes, cripples, gives up or sets moving a
   *  wing majority. `prior`: the move before it (its board and SAN), so a
   *  recapture is read against the board before the trade began; null where
   *  there was none. */
  pawnMajority: { fenBefore: string; san: string; student: Color; prior: { fenBefore: string; san: string } | null };
  /** THE FORTRESS (`fortress`, Danya's "a fortress plus an active king can
   *  draw even down material when there's no way in"): the move `san` on
   *  `fenBefore` (either seat) leaves an ending a piece or more down that the
   *  engine reads a draw, for a reason the board shows. `replies`: the
   *  engine's lines from the board after the move, best first (White-POV
   *  cp); [] where none. */
  fortress: { fenBefore: string; san: string; student: Color; replies: readonly ReplyLine[] };
  /** THE PIECE'S ITINERARY (`pieceItinerary`, Danya's knight "f3–d2–c4"):
   *  the move `san` on `fenBefore` (either seat) completes a minor piece's
   *  reroute — two or more hops to an advanced square — read off the game so
   *  far (`history`, from the start; a board with no game behind it has none). */
  pieceItinerary: { fenBefore: string; san: string; student: Color; history: readonly string[] };
  /** THE FORCED MATING RUN (`forcedRun`): the move `san` on `fenBefore`
   *  (either seat) begins a checking run to mate in the moves that follow
   *  (`line`), read off the game so far (`history`). `evalsAfter`: the score
   *  after each ply of history + move + line, or null. */
  forcedRun: { fenBefore: string; san: string; student: Color; history: readonly string[]; line: readonly string[] | null; evalsAfter: ReadonlyArray<number | null> | null };
  /** A THREAT'S REAL PURPOSE (`threatPurpose`): the decisive line `line`
   *  (either seat, its first move the threat) looks aimed at one piece and
   *  wins another, mates, or trades queens into a won ending. The caller
   *  hands only a line it has read as decisive for the side that moves first. */
  threatPurpose: { line: PvLine | null; student: Color };
  /** WHY NOT JUST TAKE? (`temptingCapture`): on `fenBefore` the mover plays
   *  `san` and leaves the most tempting capture alone — the capture loses
   *  material, opens a file at the mover's king, or the capturer is trapped.
   *  `line`: the line walked from `fenBefore`, starting with `san`, or null.
   *  `student`: null where the line has no seat (a theory lecture). */
  temptingCapture: { fenBefore: string; san: string; student: Color | null; line: readonly string[] | null };
  /** BOARD READS from the student's seat on the board `fen` (after a move):
   *  the most contested piece counted (`count`), the piece guarding their
   *  king (`royal`), a rook on the seventh (`rook7`), their bad bishop
   *  (`badBishop`), the ending reached (`endgamePhase`). */
  count: { fen: string; student: Color };
  royal: { fen: string; student: Color };
  rook7: { fen: string; student: Color };
  badBishop: { fen: string; student: Color };
  /** THE REVIEW WALK'S READS (basket, walk — one registry, one writer each):
   *  the game looked back on (`whyItEnded`, `idlePiece`, `quietDecider`, and
   *  per ply `exploreInvite`, `murkyRead`, from `gameEndReads`), the
   *  conversion step when a piece up (`conversion`), the pawn-ending reads
   *  (`pawnEndingCount`, `spareTempo`, `passerDecoy`), zugzwang worded off the
   *  tablebase read the surface fetched (`zugzwangAt`), the line behind a
   *  winning move (`mateLineAt`, `lineWinsAt`), what their attack asks
   *  (`attackAsks`), their opening choice judged (`theirOpeningChoice`), the
   *  opening named (`openingNamed`), the fundamental verdict and its habit
   *  (`fundamentalVerdict`, `fundamentalHow` — `seen` is read, never written:
   *  the ids it newly says ride the key, `fundamentalsSaid`), a sacrifice's
   *  payoff, mechanism and shield (`sacPayoff`, `sacMechanism`, `sacShield`),
   *  the middlegame orientation (`middlegameOrientation`), taking stock
   *  (`takeStock`), the cue to attack a king in the centre (`kingHuntCue`),
   *  their development and their move's target (`opponentDevelopment`,
   *  `opponentTarget` — arrows ride the key, `planBeatArrows`), and the
   *  cause across moves (`causalChain`, `causalChainRead`). */
  whyItEnded: { plies: readonly GamePly[]; student: Color };
  idlePiece: { plies: readonly GamePly[]; student: Color };
  quietDecider: { plies: readonly GamePly[]; student: Color };
  exploreInvite: { plies: readonly GamePly[]; index: number; student: Color };
  murkyRead: { plies: readonly GamePly[]; index: number; student: Color };
  pawnEndingCount: { fenBefore: string; san: string; replySan: string | null; cpLoss: number; evalAfterCp: number | null };
  spareTempo: { fenBefore: string; san: string; bestSan: string | null; cpLoss: number };
  passerDecoy: { fen: string; student: Color };
  zugzwangAt: { fen: string; read: ZugzwangRead; studentToMove: boolean };
  mateLineAt: { fenBefore: string; lineUci: readonly string[]; student: Color; san: string };
  lineWinsAt: { fenBefore: string; lineUci: readonly string[]; student: Color; san: string; prior: { fenBefore: string; san: string } | null; seconds: LineSeconds };
  attackAsks: { fenAfter: string; target: string; mover: Color };
  theirOpeningChoice: { history: readonly string[]; student: Color; cpLoss: number; coachChose: boolean; fen: string };
  openingNamed: { det: { name: string } | null; history: readonly string[]; spokenName: string | null; student: Color; transposed: boolean; fen: string };
  /** `student` REQUIRED: "what you get for it" is the student's payoff only; the opponent's sac is "what they get". */
  sacPayoff: { fenAfter: string; mover: Color; student: Color; moverPovEvalCp: number | null; moverPovBeforeCp: number | null; kingCentreTaught: boolean };
  sacShield: { fenBefore: string; san: string };
  takeStock: { fenBefore: string; san: string; fen: string; student: Color; studentPovCp: number | null };
  kingHuntCue: { fen: string; student: Color };
  opponentTarget: { fenBefore: string; san: string; student: Color };
  causalChain: { sans: readonly string[]; ply: number; student: Color; rating: number; fen: string };
  endgamePhase: { fen: string; student: Color };
  /** LEARN'S READS OF THE STUDENT'S MOVE (`learnBoardTeaching.studentMoveTeaching`,
   *  the bundle Review and the lessons also read). `faultCp` is the graded
   *  cost a lane may name as a fault (0 when the grader does not call it one);
   *  `reply` their answer when it is already on the board. */
  recapture: { fenBefore: string; san: string; theirLast: string | null; reply: string | null; faultCp: number; namesStudentMoves: boolean };
  /** The engine's move the student played, and the mate its line forces. */
  mateLine: { fenBefore: string; san: string; bestSan: string | null; lineUci: readonly string[]; reply: string | null };
  /** The engine's move the student played, and the material its line wins
   *  (`prior`: their move that led to `fenBefore`; `seconds`: the other reads). */
  winsLine: { fenBefore: string; san: string; bestSan: string | null; lineUci: readonly string[]; reply: string | null; prior: { fenBefore: string; san: string } | null; seconds: LineSeconds };
  kneeJerk: { fenBefore: string; san: string; theirLast: string | null; bestSan: string | null; faultCp: number };
  /** A strong player's choice here, from the games DB (`ply`: the move's index, its claim). */
  strongChoice: { fenBefore: string; san: string; ply: number };
  /** The open file both sides wanted, taken on a clean move (`cpLoss` null: unpriced). */
  fileClaimed: { fenBefore: string; san: string; cpLoss: number | null };
  /** The blunder check, earned by the move (`again`: asked in full already this game). */
  blunderCheck: { fenBefore: string; san: string; reply: string | null; faultCp: number; again: boolean; ply: number };
  autopilot: { fenBefore: string; san: string; faultCp: number; popularTopSan: string | null };
  /** The trade into a pawn ending, counted first (`endgamePawnReads.pawnEndingTrade`). */
  pawnEndingCounted: { fenBefore: string; san: string; reply: string | null; faultCp: number; cpAfter: number | null };
  outsidePasserDecoy: { fenBefore: string; san: string };
  keepPressing: { fenBefore: string; san: string; bestSan: string | null; faultCp: number; cpAfter: number | null };
  /** Was the trade a good deal (`prior`: their move before, for the trade ledger). */
  tradeDeal: { fenBefore: string; san: string; reply: string | null; faultCp: number; values: readonly PieceValue[] | undefined; prior: LastMove | null; namesStudentMoves: boolean; ply: number };
  /** Pieces brought to their king, on a move that did not cost a pawn. */
  kingAttack: { fenBefore: string; san: string; reply: string | null; cpLoss: number | null; namesStudentMoves: boolean; linesAfter: ReadonlyArray<readonly string[]> };
  /** A rule broken for a reason, on a move the engine agrees with (`history`: the moves before it). */
  ruleException: { fenBefore: string; san: string; history: readonly string[]; reply: string | null; bothCp: boolean; cpLoss: number | null };
  /** Their threat the engine's move rightly ignored (`theirFenBefore`: the board before their move). */
  falseAlarm: { theirFenBefore: string; fenBefore: string; studentSan: string | null; bestLine: AnalysisLine | undefined; reply: string | null };
  pushOrHold: { fenBefore: string; san: string; cpAfter: number | null };
  /** DANGER LEVELS (`counterThreat`, either seat): a move that left an
   *  attacked piece and hit a bigger one. The student's is credited only when
   *  the move held (`studentMoveCostCp`, null ungraded). */
  counterThreat: { fenBefore: string; san: string; student: Color; studentMoveCostCp: number | null };
  /** THE CONCEPT A MOVE JUST PLAYED, either seat (`define`: the definition
   *  the first time a game meets it). */
  playedConcept: { fenBefore: string; san: string; student: Color; define: (type: string) => string };
  /** Tempo, counted: their piece's third move in the opening (`history` ends with their reply). */
  tempoCount: { history: readonly string[]; student: Color };
  /** Winning, and one of the student's moves would stalemate them (student to move). */
  stalemateWatch: { fen: string; student: Color };
  /** Three ways to meet check, when the best answer is not the king move. */
  checkMethod: { fen: string; student: Color; bestUci: string | null };
  /** The engine's two best lines carry different plans (`lastMove` made `fen`). */
  planChoice: { fen: string; lines: readonly PlanChoiceLine[]; student: Color; lastMove: { fenBefore: string; san: string } | null };
  /** ZUGZWANG at the student's turn, from the tablebase read the page fetched. */
  zugzwang: { fen: string; read: ZugzwangRead };
  /** CHART A COURSE (kings and pawns only): the king's target is the weak pawn. */
  kingCourse: { fen: string; student: Color };
  /** THE VERDICT ON A FOUND MOVE: at a real decision moment one of the only
   *  moves that held, with the line that makes it work (`prevCapture`: the
   *  capture run before the move; `prior`: their move that led there). */
  foundMove: { fenBefore: string; san: string; preLines: readonly CriticalFanLine[]; student: Color; prevCapture: PrevCaptureContext | null; prior: { fenBefore: string; san: string } | null };
  /** THEIR MOVE'S DEEP FACT: what it sets up down their line (`lineAfter`). */
  theirDeepFact: { fenBefore: string; theirSan: string; lineAfter: readonly string[] | null; student: Color } | { words: MoveWords; line: readonly string[] | null };
  /** YOUR DEEP FACT, said when you play it (`lineAfterReply`: the line after their reply). */
  studentDeepFact: { fenBefore: string; san: string; reply: string | null; lineAfterReply: readonly string[] | null } | { words: MoveWords; line: readonly string[] | null };
  /** YOUR MOVE AGAINST THEIR LAST ONE: their target, and how the move answers
   *  it (`prior`: their last move; `plainSeen`: the record sees plain threats). */
  binding: { fenBefore: string; san: string; prior: { fenBefore: string; san: string } | null; plainSeen: boolean; ply: number }
    | { words: MoveWords; theirLast: { fenBefore: string; san: string } | null; plainSeen: boolean; point: string | null };
  /** THE BOARD TEACHER on a move of either seat, with the ideas the game has
   *  said (`spokenIdeas`: an idea said in full once is referred to after). */
  boardTeacherOwn: { fenBefore: string; san: string; fenNow: string; spokenIdeas: ReadonlyMap<string, number> } | { words: MoveWords; phrases: PhraseMemory | null };
  boardTeacherTheirs: { fenBefore: string; san: string; fenNow: string; spokenIdeas: ReadonlyMap<string, number> } | { words: MoveWords; phrases: PhraseMemory | null };
  /** WHAT CAN BE WON, AND WHY (`prizeTeaching`, student to move): a piece of
   *  theirs on `square` the legal exchange wins, said without its square
   *  (OS-10). `stem`: the game's occurrence, so the words rotate. */
  prize: { fen: string; square: string; student: Color; stem: number };
  /** A GAMBIT THEY ACCEPTED: what the piece the student's move put down bought. */
  gambitPoint: { fenBefore: string; fenAfterMove: string; fenAfterReply: string; san: string; to: string; student: Color };
  /** THE STRUCTURE, NAMED the moment it crystallises (`openingName`: where it
   *  came from, for "usually met in …"). */
  structureNaming: { fen: string; student: Color; openingName: string | null };
  /** WHAT A QUIET MOVE OF THE STUDENT'S IS FOR, asked after the move
   *  (`prevCapture`: the capture run before it). */
  /** `student` REQUIRED: the point is said in the student's voice ("Now you have the two bishops") — only on the student's move. */
  quietMovePoint: { fenBefore: string; san: string; prevCapture: PrevCaptureContext | null; student: Color };
  /** THE ANSWER TO THEIR SLIP, asked now (`lineUci`: the engine's line from
   *  `fen` starting with the answer). */
  /** `register`: the writer's tense — Review's retrospective words or Learn's live ones. */
  slipAnswer: { fen: string; prevCapture: PrevCaptureContext | null; answerSan: string | null; lineUci: readonly string[] | null; register: 'review' | 'now' };
  /** COUNT BEFORE YOU TAKE, at the student's turn (asked "what should I watch?"). */
  countWarning: { fen: string; student: Color };
  /** Kings on opposite wings: whose storm lands first (asked). */
  wingsRace: { fen: string; student: Color };
  /** MORE BOARD READS from the student's seat after a move: their king stuck
   *  in the centre (`kingInCentre`), a rook or queen with no safe square,
   *  either side (`trappedPiece`, the played line read for the escape), the
   *  piece that wants a better square (`worstPiece`, never the one the
   *  student's move just put there: `movedTo`), the passed pawn to push
   *  (`passerPush`, not on the move that pushes it: `pushed`), a minority
   *  attack and a weak colour complex either side (`minority`,
   *  `colourComplex`), and the race of two same-kind plans (`raceOfPlans`). */
  kingInCentre: { fen: string; student: Color };
  /** NOT YET — FIRST THIS (`inBetweenMove`, his "Be5 first, hitting the
   *  rook, and only then did I take"): on `fen` (the student to move) the
   *  engine's best move `bestSan` — its line `pv` in UCI, the best move first —
   *  is a forcing move before a capture that is still there after. Names the
   *  student's move. */
  notYet: { fen: string; bestSan: string; pv: readonly string[]; student: Color } | { words: MoveWords; line: readonly string[]; fan: readonly AnalysisLine[] };
  /** THE OBVIOUS STOP THAT DOESN'T WORK (`findProphylaxis`'s verdict, his
   *  "the obvious move is h3 — but h3 creates a hook"): on `fen` (the student
   *  to move) their wanted pin, kick or fork has a pawn stop that hands them a
   *  hook, and the engine's `lines` (best first) rank it a notable step below
   *  the best. */
  obviousStop: { fen: string; student: Color; lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }> };
  /** THE KEY DEFENDER, STANDING (`keyDefenderPlan`, WO-DANYA-READS-01 #6):
   *  on `fen` as it stands, the engine's best line (`line`, White-POV score)
   *  trades off the piece doing a job alone — either seat. */
  keyDefenderNow: { fen: string; student: Color; line: AnalysisLine };
  /** THE POSITIONAL READ (`readPosition`): every observation about the board
   *  `fen`, both sides, most urgent first — the asked "how do I stand?". */
  positionRead: { fen: string; student: Color };
  /** THE KING'S SHELTER (`detectKingExposure`): the king of `side` on `fen` —
   *  a broken castled shelter with real attackers on it, worded from the
   *  student's seat. Null when the king is not exposed. */
  /** `side`: whose king. `owner` (a writer setting): name it ("Your king: …") and say "reasonably safe" when there is nothing — chat's answer to a question; the live read says the bare clause. */
  kingExposure: { fen: string; side: Color; student: Color; owner: boolean };
  /** THEIR SHELTER CRACKED (`detectKingExposure`): two or more of the three
   *  pawns in front of their king gone — the other half of "is my attack
   *  worth it", from the student's seat. */
  shelterCracked: { fen: string; student: Color };
  trappedPiece: { fen: string; student: Color; lineUci: readonly string[] };
  worstPiece: { fen: string; student: Color; movedTo: string | null };
  passerPush: { fen: string; student: Color; pushed: string | null };
  minority: { fen: string; student: Color };
  colourComplex: { fen: string; student: Color };
  raceOfPlans: { fen: string; student: Color };
  /** WHAT THEIR MOVE COST THEM (`theirCost`): their move `san` on
   *  `fenBefore` opened a hole a knight of the student's reaches, shut in a
   *  bishop, or gave up castling — the student's to use. The key starts with
   *  the cost's kind (`hole:`, `bishop:` …). */
  theirCost: { fenBefore: string; san: string; student: Color };
  /** THE THREAT THEIR REPLY STOPPED (`threatStopped`): the student's move
   *  (`studentFenBefore` → `studentFenAfter`) made a threat, and their reply
   *  `reply` took it off the board. */
  threatStopped: { studentFenBefore: string; studentFenAfter: string; reply: string; student: Color };
  /** CAN YOU PLAY IT ANYWAY? (`playItAnyway`): their reply stopped the
   *  student's threat on paper, and on `fenNow` the engine's lines (`lines`,
   *  White-POV) say the move still works. */
  playItAnyway: { studentFenBefore: string; studentFenAfter: string; reply: string; fenNow: string; lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>; student: Color };
  /** THE FORK TRICK A QUIET MOVE SIDESTEPPED (`trickSidestepped`), either
   *  seat: `san` on `fenBefore` took the other side's fork trick off the board. */
  trickSidestepped: { fenBefore: string; san: string; student: Color };
  /** WHAT A SIDE KEEPS DOING (`theirHabit`, `yourHabit`): the same mistake
   *  twice in the moves so far (`history`, from the start), with the plan
   *  against it; `sound`: the plies the grader called sound (never a habit's
   *  evidence), empty where no grades are in hand. One fact per habit. */
  theirHabit: { history: readonly string[]; student: Color; sound: ReadonlySet<number> };
  yourHabit: { history: readonly string[]; student: Color; sound: ReadonlySet<number> };
  /** A KNOWN ATTACKING STRUCTURE (`knownAttack`) on `fen` for the student, by
   *  its conditions; `studentCp`: the student's score, or null. */
  knownAttack: { fen: string; student: Color; studentCp: number | null };
  /** READING THEIR MOVE (`readTheirMove`): what their move `san` on
   *  `fenBefore` threatens quietly, needs, lifted, wrongly expected or handed
   *  the student — one entry per kind of fact it makes. `lines`: the engine's
   *  lines after their move (the student to move); `prev`: the student's own
   *  move before it; `flagged`: their move graded a fault, or null. The key
   *  is `<read kind>|<claim>`. */
  /** THE TIMING (`timing`): the quiet move `san` on `fenBefore`, played a
   *  move earlier (`history`: the moves before it, from the start), would
   *  have lost material to a reply that no longer works. */
  timing: { fenBefore: string; san: string; history: readonly string[]; student: Color };
  /** THE BLUFF (`bluff`): their move `san` lands in the student's half hitting
   *  things and wins nothing — `reply`: the student's best answer, or null. */
  bluff: { fenBefore: string; san: string; reply: string | null; student: Color };
  /** WHAT SEPARATES TWO GOOD MOVES (`contrast`): the student's sound `san`
   *  and the engine's `bestSan` on `fenBefore`, and what one leaves undefended. */
  contrast: { fenBefore: string; san: string; bestSan: string; student: Color };
  /** The rule a clean move kept. `taught` is the surface's say-once ledger of
   *  rules: full the first time, a stem after. */
  /** The new threat a move made (`mover` moved, `fenBefore` → `fenAfter`).
   *  `answerSan`, when given, is the engine's reply that meets it — said as
   *  the answer on the opponent's threat. */
  newThreat: { fenBefore: string; fenAfter: string; mover: Color; student: Color; answerSan: string | null };
  /** THE ONE FACT SET'S READS (the basket, 2026-11-19): every computer the
   *  move's fact set (`moveThoughtFacts`) reads, each handed the move and HOW
   *  it is said (`MoveWords` — its seat, tense, whether it may name the move). */
  moveAspect: { words: MoveWords; prev: PrevCaptureContext; follow: FollowLines; phrases: PhraseMemory | null };
  moveThreatDeep: { words: MoveWords; reads: { before: readonly AnalysisLine[]; after: readonly AnalysisLine[]; passAfter: readonly AnalysisLine[] }; student: Color };
  moveAllows: { words: MoveWords; student: Color; costCp: number; after: AnalysisLine; against: readonly string[] | null };
  moveJobRead: { words: MoveWords; theirLast: { fenBefore: string; san: string } | null; follow: FollowLines; phrases: PhraseMemory | null };
  moveFundamentals: { words: MoveWords; follow: FollowLines };
  theirAim: { words: MoveWords; line: readonly string[] | null; plainSeen: boolean };
  outFirst: { words: MoveWords; line: readonly string[] };
  orderFirst: { words: MoveWords; line: readonly string[]; fan: readonly AnalysisLine[] };
  desperadoMove: { words: MoveWords; bestUci: string | null };
  emptyCheckMove: { words: MoveWords; costCp: number | null; replyUci: string | null };
  transposition: { words: MoveWords; history: readonly string[] };
  mastersBreak: { words: MoveWords; history: readonly string[] };
  structureFormed: { words: MoveWords };
  moveCut: { words: MoveWords };
  moveCage: { words: MoveWords };
  moveStopsBreak: { words: MoveWords; history: readonly string[] };
  moveRoute: { words: MoveWords; line: readonly string[] | null; skipFrom: string | null };
  followUpFirst: { words: MoveWords; followFirst: { uci: string; line: AnalysisLine }; line: AnalysisLine };
  takesAway: { words: MoveWords };
  gambitOffer: { words: MoveWords; after: readonly AnalysisLine[]; student: Color; costCp: number | null };
  standingRead: { words: MoveWords; student: Color; before: AnalysisLine; after: AnalysisLine; lines: readonly AnalysisLine[] | null };
  movePurpose: { words: MoveWords; reads: IntentReads; line: readonly string[] | null; costCp: number | null; ruleBoard: { fen: string; taught: ReadonlySet<string> } | null };
  onlyMoveRead: { words: MoveWords; fan: readonly AnalysisLine[] };
  principle: { fenBefore: string; san: string; student: Color; taught: ReadonlySet<string>; stemKey: number; namesPlayedMove: boolean };
  /** The rule the engine's move kept, where the clean move kept none. */
  principleContrast: { fenBefore: string; san: string; bestSan: string | null; student: Color; taught: ReadonlySet<string>; stemKey: number };
  theirRead: TheirReadCtx;
  theirPreventTest: TheirReadCtx;
  theirTrigger: TheirReadCtx;
  /** THE OPPOSITION TAKEN (`oppositionRead`, Danya's "it is Black who has
   *  the opposition"): the king move `san` on `fenBefore` (either seat) takes
   *  the opposition in a king-and-pawn ending, with what it forces.
   *  `afterCp`: the engine's score after the move (White's view), or null. */
  oppositionRead: { fenBefore: string; san: string; student: Color; afterCp: number | null };
  /** ZUGZWANG MADE (`zugzwangRead`, Danya's "moving it in any direction is
   *  suicidal"): after `san` the side to move would rather pass. `after` and
   *  `passAfter`: the engine's lines after the move and with the mover to move
   *  again (White's view), or null — then the bounded count, pawn endings only. */
  zugzwangRead: { fenBefore: string; san: string; student: Color; after: readonly AnalysisLine[] | null; passAfter: readonly AnalysisLine[] | null };
  /** THE NAMED ENDING (`theoreticalEnding`, Lucena and Philidor with their
   *  steps, the back-rank defence, the rook-pawn corner): the move `san`
   *  reached one, built the bridge or took the third rank (either seat).
   *  `afterCp`: the engine's score after the move (White's view), or null. */
  theoreticalEnding: { fenBefore: string; san: string; student: Color; afterCp: number | null };
  /** THE RACE COUNTED (`raceCount`): after `san` (either seat) a pawn the
   *  other king cannot catch, or two racing, played out with chess.js —
   *  queening with check, the first queen winning the second, a stalemate. */
  raceCount: { fenBefore: string; san: string; student: Color };
  /** WHICH PIECE TO MAKE (`promotionChoice`): the promotion `san` on
   *  `fenBefore` (either seat) — an underpromotion and the reason the queen
   *  fails, or a queen made where the board needed a lesser piece. */
  promotionChoice: { fenBefore: string; san: string; student: Color; before: readonly AnalysisLine[] | null };
  /** THE KEY DEFENDER TRADED (`keyDefender`, Danya's "exchanging your
   *  opponent's most important piece removes the cog that makes his position
   *  run"): the move `san` on `fenBefore` (either seat) takes, or puts on the
   *  board, an even trade of a piece of the other side's that does a job no
   *  other piece of theirs does. `costCp`: the engine's cost of the move for
   *  its mover; `after`: the engine's best line after it (White's view). No
   *  read, nothing said — the engine must agree the trade helps. */
  keyDefender: { fenBefore: string; san: string; student: Color; costCp: number | null; after: AnalysisLine | null };
  /** PRACTICAL CHANCES (`practicalChance`, Danya's "ask your opponent some
   *  questions; give him an opportunity to falter"): the worse side's sound
   *  move `san` on `fenBefore` (either seat) leaves one good reply, sets a
   *  capture that looks free and gives the edge back, or makes the way through
   *  long — each proved on the engine's lines after the move. */
  practicalChance: { fenBefore: string; san: string; student: Color; reads: PracticalReads };
  /** WHAT A PAWN MOVE DID TO THE LINES (`pawnLines`, S4 pawns): the square the pawn landed on cut an enemy slider off from a piece it
   *  guarded, which is hanging now and was not before. */
  pawnCutsGuard: { fenBefore: string; san: string; student: Color };
  /** THE BASE OF A PAWN CHAIN (`chainBase`): the move `san` on `fenBefore`
   *  (either seat) brings a piece to guard the mover's own base, lost by the
   *  count before and held after, or to hit the other side's base, held
   *  before and lost by the count after. */
  chainBase: { fenBefore: string; san: string; student: Color };
  /** A GUARD THAT CAN'T TAKE BACK (`pinnedPawnGuard`): the move `san` on
   *  `fenBefore` (either seat) hits a square whose pawn guard is pinned to its
   *  king, and the pin is why the square is lost by the count. */
  pinnedPawnGuard: { fenBefore: string; san: string; student: Color };
  /** The move just played took castling away, either side's (S4 opening). */
  castlingTaken: { fenBefore: string; san: string; student: Color };
  /** A castling move read against their pawns: toward open files, or away. */
  castlingWing: { fenBefore: string; san: string; student: Color };
  /** One piece moved again while the others wait (`history`: every move
   *  before `san` from the start position, which must arrive at `fenBefore`;
   *  `costCp`: the move's cost, null unknown). */
  pieceMovedAgain: { history: readonly string[]; fenBefore: string; san: string; student: Color; costCp: number | null };
  /** THE EARLY QUEEN CHASED (`queenChased`, Danya's "the knight to c3 with
   *  tempo, hitting the queen"): the move `san` played after `history` (every
   *  move from the start, ending on `fenBefore`) hits the other side's early
   *  queen with tempo in the first twelve moves, either seat. */
  queenChased: { history: readonly string[]; fenBefore: string; san: string; student: Color };
  /** THE BLOCKADE (`blockade`, Danya's "a blockading knight on d5"): the move
   *  `san` on `fenBefore` (either seat) puts a piece directly in front of an
   *  enemy passed or isolated pawn, or walks the blockader of a passed pawn
   *  away. */
  blockade: { fenBefore: string; san: string; student: Color };
  /** THE TRADES (Danya speedruns, S4 trades): the move `san` on `fenBefore`
   *  (either seat), with the engine's cost of it for its mover (`costCp`) and
   *  its score after it from the mover's seat (`afterCp`) — a quiet offer of
   *  an even trade while ahead. */
  tradeOffer: { fenBefore: string; san: string; student: Color; costCp: number | null; afterCp: number | null };
  /** A rook trade for an open file: the challenge, or the trade that hands
   *  the file over. `line`: the engine's line after the move (uci). */
  fileTrade: { fenBefore: string; san: string; student: Color; costCp: number | null; line: readonly string[] | null };
  /** The trade into a won king-and-pawn ending, along the engine's line after
   *  the move (`after`, the opponent to move). */
  pawnEndingTrade: { fenBefore: string; san: string; student: Color; costCp: number | null; after: AnalysisLine | null };
  /** An even trade on offer kept off the board, with the board's reason. */
  tradeKept: TradeKeptInput & { student: Color };
  /** THE QUEEN HUNT (`queenHunt`, S4 king group): the move `san` from
   *  `fenBefore` hits the other side's queen and leaves it no safe square, or
   *  one (and the move that traps it there); or the mover's queen leaves a
   *  square one move would have trapped. `line`: the engine's line after the
   *  move (UCI, the reply first), or null. */
  queenHunt: { fenBefore: string; san: string; student: Color; line: readonly string[] | null };
  /** A SECOND ATTACKER (`secondAttacker`): the move joins a piece already on a
   *  target and the count now wins it, or taking there mates. */
  secondAttacker: { fenBefore: string; san: string; student: Color };
  /** OUT OF REACH (`outOfReach`): the moved piece lands where no pawn and no
   *  smaller piece can chase it, against a square where it could be chased.
   *  `altUcis`: the engine's top moves before the move (UCI). */
  outOfReach: { fenBefore: string; san: string; student: Color; altUcis: readonly string[] };
  /** THE POISONED PIECE (`poisonedPiece`): after the move a piece that looks
   *  loose cannot be taken — every capture walks into mate in one or two. */
  poisonedPiece: { fenBefore: string; san: string; student: Color; /** The read of every reply after the move (the lesson's `everyAfter`), or null: a capture that loses by the line, not only by mate. */ fan: { replies: readonly ReplyRead[]; rating: number } | null };
  /** EVERY MATE (`everyMate`): the move mates, and another move mated too. */
  everyMate: { fenBefore: string; san: string; student: Color };
  /** THE DANYA HAVE-CHECK COMPUTERS (2026-11-19), both seats where the board
   *  allows. Who owns the centre with pawns (`pawnCentre`). */
  pawnCentre: { fen: string; student: Color };
  /** Two central pawns side by side against a doubled or isolated centre. */
  centreDuo: { fen: string; student: Color };
  /** A bent structure that does not matter on this board (`best`: the
   *  engine's score, White's view). */
  harmlessWeakPawns: { fen: string; student: Color; best: { cp: number | null; mate: number | null } | null };
  /** The side to move has only checks that give the piece away while the
   *  other side has safe ones. */
  noSafeChecks: { fen: string; student: Color };
  /** Whose king reaches the passer's escort square first. */
  kingRace: { fen: string; student: Color };
  /** The lone king's box shrunk by the move. REQUIRED `namesPlayedMove`: the
   *  writer's setting (Learn says "your move", never the move just played). */
  kingBox: { fenBefore: string; san: string; student: Color; namesPlayedMove: boolean };
  /** A check that drives their king onto the promotion rank first. */
  promotionWithCheck: { fenBefore: string; san: string; reply: string | null; student: Color; namesPlayedMove: boolean };
  /** A hole the pawn move leaves that no enemy piece can reach soon. */
  inaccessibleHole: { fenBefore: string; san: string; student: Color };
  /** A wing pawn lever with none of the pusher's pieces near it. */
  wingWithoutPieces: { fenBefore: string; san: string; student: Color };
  /** THE DANYA HAVE-CHECK COMPUTERS, BATCH 2 (2026-11-19). `lines`: the
   *  engine's top lines on `fen` (White's view, UCI), best first or not. The
   *  strike that has to come now, before their reply closes it. */
  urgentStrike: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** A queen doing little, and the square the engine's line gives it. */
  misplacedQueen: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** The other side's worst piece, staying out of the game in the engine's
   *  line (`bestLine`, UCI, null when none). */
  theirWorstPiece: { fen: string; student: Color; bestLine: readonly string[] | null };
  /** A king off its shelter with checks against it. */
  kingInOpen: { fen: string; lines: readonly EngineLine[] | null; student: Color };
  /** Whose king is the fighting piece in an ending. `lines` null: posed by
   *  the count alone (the record's read, which keeps no score). */
  kingActivityGap: { fen: string; lines: readonly EngineLine[] | null; student: Color };
  /** THE KING UNDER SIEGE AS THE BOARD STANDS (`kingSiege`, the standing
   *  read): both kings, the student's own first. `studentCp`: the engine's
   *  score for the student on this board, or null with no read. */
  kingSiegeNow: { fen: string; student: Color; studentCp: number | null };
  /** Kings and pawns: the other side would be in zugzwang if it had the move. */
  zugzwangIfPassed: { fen: string; student: Color };
  /** The pawn lever in the engine's line that makes a passed pawn. */
  leverPasser: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** One army guarded and working, the other loose or idle. */
  coordinationGap: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** Checks that go round in circles, nothing to force, or sit tight. */
  endgameVerdict: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** A knight's route to a loose pawn against the king that gets there first. */
  defenderInTime: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** In a level, quiet position, the equal move that asks them questions. */
  tactify: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** Rooks on the seventh that cannot mate: the back rank guarded, or the
   *  king touching one. `lines` null: the record's read, by the board alone. */
  seventhRankMate: { fen: string; lines: readonly EngineLine[] | null; student: Color };
  /** A knight, bishop or rook that moves with tempo onto a safe square. */
  pieceTempo: { fen: string; lines: readonly EngineLine[] | null; student: Color };
  /** BEFORE the move: a tension capture the engine wants left alone
   *  (`lines`: the engine's lines on `fen`, White's view, UCI). */
  tensionKept: { fen: string; lines: readonly TensionLine[]; student: Color };
  /** THE DANYA HAVE-CHECK COMPUTERS, BATCH 3 (2026-11-19). `lines`: the
   *  engine's lines on `fen` (White's view, UCI; a line's cp null when the
   *  surface keeps no score). One wing held with no way in, so the second front. */
  secondFront: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** The raiding rook that slides along its rank to guard. */
  lateralRookDefence: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** A pawn push that gives up a square for good and buries a minor. */
  squareForPiece: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** The side short of room trades. */
  tradeRelievesCramp: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** Queen and knight leave the king one square or none. */
  queenKnightNet: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** A piece move in a king race that keeps out of its own king's way. */
  selfBlock: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** A quiet mate threat that wins material while it is parried. */
  mateThreatLever: { fen: string; lines: readonly EngineLine[]; student: Color };
  /** No queens on the board, and a mate in one (made or threatened). */
  queenlessMate: { fen: string; student: Color };
  /** A king with no square to go to, every flight covered, and a mate in one
   *  there (made or threatened) — whatever pieces draw the net. */
  matingNet: { fen: string; student: Color };
  /** A weak pawn that cannot move, no pawn able to come to its aid, and more
   *  pieces able to reach it than to guard it within two moves. */
  frozenTarget: { fen: string; student: Color };
  /** THE PICTURE'S CONCLUSIONS (WO-PICTURE-01 P3): read off the facts every
   *  computer produced on `fen` (the picture) and the engine's lines there,
   *  best first, White's seat. */
  pictureLedger: { fen: string; student: Color; lines: readonly EngineLine[]; facts: readonly CoachFact[] };
  pictureCounterplay: { fen: string; student: Color; lines: readonly EngineLine[]; facts: readonly CoachFact[] };
  pictureTarget: { fen: string; student: Color; lines: readonly EngineLine[]; facts: readonly CoachFact[] };
  /** AFTER the move: the capture released tension the engine wanted kept
   *  (`playedCp`: the mover's score after it, where the surface has it). */
  tensionReleased: { fenBefore: string; san: string; lines: readonly TensionLine[]; playedCp: number | null; reply: string | null; student: Color };
  /** THE ENDGAME BOARD READS (Danya: "Kc5 takes the opposition and the king
   *  reaches the key square"). Kings and pawns: a passed pawn's key squares
   *  and whose king holds, gets or can step onto one. */
  keySquareRead: { fen: string; student: Color };
  /** Kings and pawns, solved exactly: a proven draw with a side more pawns
   *  up, and why it holds (the defending king first, or every try met). */
  kpDrawRead: { fen: string; student: Color };
  /** A king shouldered away from a passed pawn by the other king, or cut off
   *  by a rook along a file or rank, counted in king steps. */
  shoulderRead: { fen: string; student: Color };
  /** Two connected passed pawns a lone rook or minor cannot stop, proven by
   *  an exact search. */
  connectedPassers: { fen: string; student: Color };
  /** Kings and pawns, solved exactly: a proven win and the shape that wins it
   *  (the pawn outside the king's square, connected or protected passers, the
   *  king on a key square or the opposition, the outside passer). */
  wonEndingRead: { fen: string; student: Color };
}

export type ComputerId = keyof BoardContexts;

interface ComputerSpec<C> {
  /** One fact, or several in speaking order (the plan thread: stop, then
   *  plan), each made by `fact` from what the read says. */
  read(ctx: C, fact: MakeFact): CoachFact | CoachFact[] | null;
  /** THE COMPUTER THAT MAKES ITS FACTS — its catalog row (`COMPUTER_CATALOG`,
   *  keyed by the function's own name), so the fact names its producer. */
  computer: ComputerName;
  /** THE KIND OF FACT ITS READS STATE (WO-STORY-MATRIX-01 P1-4) — the one
   *  label every surface speaks it under, so its group (`FACT_GROUP[kind]`)
   *  and its step are the same on Learn, Review and the live read. Never a
   *  tag picked at a call site: the same read used to be a habit on Review, a
   *  choice on Learn and a rule on the live read. */
  kind: FactKind;
  /** THE PHASES IT BELONGS TO — a read outside them is never computed
   *  (`readBoardAll`), so it is never computed and then held. */
  phase: ReadonlySet<GamePhase | 'any'>;
  surfaces: Record<CoachSurface, SurfaceAnswer>;
}

/** True in every phase. */
const ANY: ReadonlySet<GamePhase | 'any'> = new Set<GamePhase | 'any'>(['any']);
/** The opening and the middlegame: about the opening, the book or castling,
 *  with nothing to say in an ending (Learn's door held these lanes there). */
const NOT_ENDING: ReadonlySet<GamePhase | 'any'> = new Set<GamePhase>(['opening', 'middlegame']);
/** The middlegame only: a judgement the opening's book can contradict (a
 *  capture the book plays is no tension released too early). */
const MIDDLEGAME: ReadonlySet<GamePhase | 'any'> = new Set<GamePhase>(['middlegame']);

const LEARN = { wired: 'components/Coach/CoachTeachPage.tsx' } as const;
const REVIEW = { wired: 'services/reviewFullData.ts' } as const;
const PLAY_ASK = { not: 'owed (one-coach P4): Play volunteers nothing, and what the student taps reads the one fact set and the composer, neither of which reads this yet' } as const;
/** CHAT ASKS ABOUT A MOVE THROUGH THE ONE COMPOSER (`questionThought` →
 *  `moveThoughtFacts`): a computer that file reads is in every move answer. */
const CHAT_VIA_THOUGHT = { wired: 'services/moveThoughtFacts.ts' } as const;
/** The live composer reads it for every surface that does not read it itself
 *  — chat's board answers and the tapped read on Play (2026-10-15). */
const COMPOSER = { wired: 'services/positionFacts.ts' } as const;
/** PLAY ANSWERS WHAT THE STUDENT TAPS THROUGH THE ONE FACT SET (the one-coach
 *  unlock, 2026-11-19): "Read this position" (`usePositionNarration` →
 *  `composePositionRead` → `boardReadFacts`) reads `moveThoughtFacts` on the
 *  engine's best move, with the game's moves behind the board. Play still
 *  volunteers nothing (`PLAY_VOLUNTEERS_COACHING`). */
const PLAY_READ = { wired: 'services/moveThoughtFacts.ts' } as const;
/** A PUZZLE'S READ (the Read / Teach-me button on `PuzzleBoard`,
 *  `MistakePuzzleBoard`, `TacticSetupBoard`) reads the one fact set on the
 *  engine's best move from the puzzle board — the solution — once the puzzle
 *  is solved; before, `boardReadFacts.withhold` keeps only who stands better
 *  (the answer is never shown unasked). */
const TACTICS_READ = { wired: 'services/moveThoughtFacts.ts' } as const;
/** The composer's board reads on a puzzle's read (`boardReadFacts` →
 *  `computePositionFacts` 'composer'), withheld until the puzzle is solved. */
const TACTICS_COMPOSER = COMPOSER;
/** GENUINE: a puzzle board has no game behind it (`composePositionRead` is
 *  handed an empty PGN), and this reads the moves played to reach the board. */
const TACTICS_NO_HISTORY = { not: 'a puzzle board has no game behind it, and this reads the moves played to reach the board' } as const;
/** Review's Read button (`CoachGameReview` → `usePositionNarration`) reads the
 *  composer on the board on screen. */
const REVIEW_READ = COMPOSER;
/** The Read button on a lesson's board (the walkthrough in `CoachTeachPage`,
 *  the opening's Play rung in `OpeningPlayMode`) reads the composer. */
const LESSON_READ = COMPOSER;
/** THE LIVE READ'S OWN BOARD FACTS (the basket): read by the one composer
 *  for every surface it answers — Learn's position-facts lane, chat's board
 *  answers and the read the student taps on Play. Review and a lesson speak a
 *  move's own facts (moveThoughtFacts), never this read of the board between
 *  moves. */
const LIVE_READ: Record<CoachSurface, SurfaceAnswer> = {
  learn: COMPOSER, chat: COMPOSER, play: COMPOSER,
  review: REVIEW_READ, lesson: LESSON_READ, tactics: TACTICS_COMPOSER,
  weaknesses: { not: 'a read of the board said in the moment — the record grades the move\'s own cost' },
  think: { not: 'a step board\'s teaching reads the move\'s own facts (moveThoughtFacts.stepThought), not the live board read' },
};
/** THE PICTURE'S CONCLUSIONS read the engine's read of every try on the
 *  board the move was made on, through the one fact set (`moveThoughtFacts` →
 *  `pictureReads`, WO-PICTURE-01 P6): Learn's turn (the fan before the
 *  student's move and their reply), Review's walk (the record's candidate
 *  reads, `storedIntentReads`), a lesson's and chat's move answers, and the
 *  tapped read on every surface, a puzzle's once solved (`boardReadFacts`
 *  hands it the tries it read, `reads.tries`). Chat's position answer reads
 *  it too (`groundedAnswer`); the record files the posed question both ways
 *  (`moveInsight.planPosed`). */
const PICTURE_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  learn: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, lesson: { wired: 'services/moveThoughtFacts.ts' },
  play: { wired: 'services/moveThoughtFacts.ts' }, tactics: { wired: 'services/moveThoughtFacts.ts' },
  chat: { wired: 'services/moveThoughtFacts.ts' },
  weaknesses: { wired: 'services/moveInsight.ts' },
  think: { not: 'a step board does not carry the engine reads of every try the conclusions are read from' },
};
/** LEARN HOW TO THINK (one coach, David 2026-11-17): the step's teaching reads
 *  the composer and the step board's registry reads (`moveThoughtFacts.stepThought`). */
const THINK = { wired: 'services/moveThoughtFacts.ts' } as const;
/** LEARN HEARS THE ONE FACT SET (David 2026-11-17: "all computers feed the
 *  coach to all surfaces"): the live turn reads `moveThoughtFacts` for the
 *  student's move and their reply and hands its facts to the door on the
 *  `thought` lane (`learnSharedFacts`), which holds a move named unasked. */
const LEARN_VIA_THOUGHT = { wired: 'services/moveThoughtFacts.ts' } as const;
const THINK_BOOK = { not: 'opening book knowledge — taught by the opening lessons, not a step of thinking' } as const;
/** Owed: a puzzle's read reaches the one fact set and the composer
 *  (`TACTICS_READ`, `TACTICS_COMPOSER`); this computer is read by neither yet. */
const TACTICS_NA = { not: 'owed (one-coach P4): a puzzle\'s read reaches the one fact set and the composer, neither of which reads this yet' } as const;
/** THE ENDGAME TECHNIQUE READS (WO-DANYA-READS-01 #5): read off a move by the
 *  one composer and the Review walk; the position read says them standing. */
const ENDING_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
  learn: LEARN_VIA_THOUGHT,
  tactics: TACTICS_READ,
  weaknesses: { not: 'a reading of the ending said once — no question of the student\'s posed' },
};
const WEAK_OWED = { not: 'owed — one-coach P3: the record keeps the proof' } as const;
/** BOTH WAYS, ANSWERED (2026-11-19): the reads whose record half is not a
 *  question to the student's next move, each with why. A computer that poses
 *  a danger or a chance a clean move answers is filed through
 *  `moveInsight.registryPosedFacts`; these are the rest. */
const WEAK_MOVE_DESCRIBED = { not: 'a description of a move already on the board (what it did, what it gave up): it poses no question to the student\'s next move, so a clean move answers nothing' } as const;
const WEAK_PLAYED_JUDGED = { not: 'a judgement of the student\'s move once played: the move is graded by the one price and its miss is the slip the classifier files under its own tag; the read poses no question before the move' } as const;
const WEAK_WHOLE_GAME = { not: 'a read of a whole game (how it went, how it ended): no move is left to answer it' } as const;
const WEAK_OPENING_TOLD = { not: 'the opening named or told: the record files the book departure itself (autoAnalyzeGame\'s bookAsked, bookDepartureWeakness), not this description' } as const;
const WEAK_BOARD_VERDICT = { not: 'a verdict on the board (its structure, its edge): a judgement no single move can hold or miss' } as const;
const WEAK_PLAN_CHANCE = { not: 'an opportunity (a plan to follow): many clean moves serve it and none answers it, so the record cannot tell it held from passed by' } as const;
const WEAK_SAC_TOLD = { not: 'why a sacrifice already played works: a description of the move; the sacrifice the board offered is the shot the record names from the best move (capabilityOutcomes, namedShotTags)' } as const;
/** A lesson composes each move from the move's own facts (`moveThoughtFacts`)
 *  and reads no registry yet. */
const LESSON_BOARD = { wired: 'services/moveThoughtFacts.ts' } as const;
/** A taught line is a model line: no student move of theirs to judge. */
const LESSON_NO_STUDENT_MOVE = { not: 'it reads the student\'s own move; a lesson\'s line is a model line with no move of theirs to judge' } as const;

/** A structure read as the one fact, on the board it judged, from the seat
 *  whose move or position it judges. */
function structureFact(r: StructureRead, fact: MakeFact, fen: string, seat: FactSeat): CoachFact {
  // A judgement that names the move carries its held form (Learn names no
  // move unasked, David 2026-10-10).
  return fact({
    key: r.key, claims: [r.key], text: r.text, proof: r.proof, squares: r.squares, stakes: r.stakes ?? null,
    seat, namesStudentMove: !!r.heldForm, thread: LOCAL_THREAD, fen, role: STRUCTURE_ROLE[r.act],
    ...(r.proof.line ? { lines: [r.proof.line] } : {}),
    ...(r.heldForm ? { heldForm: { text: r.heldForm.text, proof: r.heldForm.proof, squares: [...r.heldForm.squares] } } : {}),
    ...(r.alsoText ? { alsoText: r.alsoText } : {}),
  });
}
const STRUCT_TACTICS = { not: 'a structural judgement is about a game\'s plan; a puzzle poses one tactic' } as const;

/** The piece a poisoned-by-the-line sentence names. */
const POISON_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A pile-on or guard-removal concept as its fact: `pin` in the key marks the
 *  move that piles on, carried as the line on the board it is played. */
function conceptFact(c: BoardConcept | null, fact: MakeFact, fen: string): CoachFact | null {
  if (!c) return null;
  return fact({ key: `${c.source}|${c.id}|${c.pinMove ? 'pin' : ''}`, claims: [], text: c.full, proof: NO_PROOF.description, squares: c.squares, stakes: null,
    seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: c.boardFen ?? fen, ...(c.short ? { alsoText: c.short } : {}),
    ...(c.pinMove ? { lines: [{ fen: c.pinMove.fen, sans: [c.pinMove.san] }] } : c.line ? { lines: [{ fen, sans: c.line }] } : {}) });
}

function safe<T>(f: () => T | null): T | null {
  try { return f(); } catch { return null; }
}

/** The engine's verdict on a stop (UCI): refuted only when the engine ranked
 *  it and it sits a notable step below the best line. Absent from the lines,
 *  its value is unknown — a MultiPV list can hold worse moves than the stop
 *  (h3 −0.31 at d20 sat below Ng5 −0.41 on the OS-1 board), so absence is
 *  never a refutation. */
function stopRefuted(fen: string, uci: string, lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>): boolean {
  if (lines.length === 0) return false;
  const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
  const cp = (l: { evaluation: number; mate: number | null }): number => (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * sign;
  const at = lines.findIndex((l) => l.moves[0]?.slice(0, 4) === uci);
  if (at === 0) return false;
  return at > 0 && cp(lines[0]) - cp(lines[at]) >= criticalityThresholds().notable;
}

/** The side to move on `fen`. */
function sideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/** The board after one move, or null when it does not play there. */
/** THE ONE NAMING RULE on a sacrifice's spoken line (SAN from `fenBefore`,
 *  the move first): `seconds` are other reads after the move, so each is
 *  checked with the move in front. */
function sacLineNamed(fenBefore: string, sanLine: readonly string[], seconds: ReadonlyArray<readonly string[]>, winner: Color): boolean {
  const c = new Chess(fenBefore);
  const uci: string[] = [];
  for (const s of sanLine) {
    let m;
    try { m = c.move(s); } catch { return false; }
    if (!m) return false;
    uci.push(`${m.from}${m.to}${m.promotion ?? ''}`);
  }
  if (uci.length === 0) return false;
  return lineTrust({ fen: fenBefore, uci, plies: uci.length, winner, seconds: seconds.map((s) => [uci[0], ...s]) }).name;
}

function boardAfter(fen: string, san: string): string | null {
  try { const b = new Chess(fen); b.move(san); return b.fen(); } catch { return null; }
}

// David 2026-11-12: "You can have coach state those lines and tactics. We
// need ppl to like my app and use it. Let's not hold anything back" — this
// REPLACES the 2026-10-29 rule that kept gems off Learn, the lessons and chat.
const SLIP_NOT_WEAK: SurfaceAnswer = { not: 'the slip played is graded as the move\'s own cost and filed by the record\'s writers; the index adds no skill of its own' };
/** The slip read on ONE move's board (`knownSlip`, `trapAhead`): the lesson
 *  and chat composer and the Review walk each read their own move. */
const KNOWN_SLIP_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: { wired: 'services/moveThoughtFacts.ts' },
  learn: LEARN_VIA_THOUGHT,
  review: { wired: 'services/moveThoughtFacts.ts' },
  play: PLAY_READ,
  chat: { wired: 'services/moveThoughtFacts.ts' },
  tactics: TACTICS_READ,
  weaknesses: SLIP_NOT_WEAK,
  think: THINK_BOOK,
};
/** The slips on the line just played (`slipsOnLine`): Learn's turn. */
const SLIPS_ON_LINE_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: LESSON_BOARD,
  learn: LEARN,
  review: { not: 'the Review walk reads each ply\'s board itself through knownSlip and trapAhead' },
  play: PLAY_READ,
  chat: CHAT_VIA_THOUGHT,
  tactics: TACTICS_NO_HISTORY,
  weaknesses: SLIP_NOT_WEAK,
  think: THINK_BOOK,
};

/** A known slip as the one fact, on the board it is played from. */
function knownSlipFact(r: ReturnType<typeof knownSlip>, fen: string, fact: MakeFact): CoachFact | null {
  if (!r) return null;
  return fact({ key: r.key, claims: [r.key], text: r.text, proof: r.proof, squares: r.squares, stakes: r.stakes, seat: r.seat,
    namesStudentMove: r.namesStudentMove, thread: LOCAL_THREAD, fen, role: 'teach', ...(r.proof.line ? { lines: [r.proof.line] } : {}), ...(r.heldForm ? { heldForm: r.heldForm } : {}) });
}

/** S4 PAWNS: no Learn lane reads these yet (a lane is a door decision of its
 *  own — `learnTurnDoor` LEARN_LANES and its roles). */

/** A pawn-line read as the one fact, on the board after the move. */
function pawnLineFact(r: PawnLineRead | null, fenBefore: string, san: string, fact: MakeFact): CoachFact | null {
  if (!r) return null;
  return fact({ key: r.key, claims: [r.key], text: r.text, proof: r.proof ?? NO_PROOF.description, squares: r.squares,
    stakes: r.gain ? { points: r.gain, plies: 1 } : null,
    seat: r.mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
}
/** THE TRADE COMPUTERS' SURFACES (S4 trades): each reads the engine lines
 *  around one move, which the move composer has on every surface it serves. */
const TRADE_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: { wired: 'services/moveThoughtFacts.ts' },
  learn: LEARN_VIA_THOUGHT,
  review: { wired: 'services/moveThoughtFacts.ts' },
  play: PLAY_READ,
  chat: CHAT_VIA_THOUGHT,
  tactics: TACTICS_READ,
  weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
  think: THINK,
};

/** The claim a move's idea on squares carries in the composer
 *  (`move:<from><to>:idea:<kind>:<squares>`), so a registry read and the
 *  briefing's own line for the same idea are one claim. Null on an illegal move. */
function moveIdeaClaim(fenBefore: string, san: string, kind: IdeaKind, squares: readonly string[]): string | null {
  try {
    const mv = new Chess(fenBefore).move(san);
    return `move:${mv.from}${mv.to}:${ideaClaim(kind, squares.filter((q) => q !== mv.from && q !== mv.to))}`;
  } catch { return null; }
}

/** The square choice's own claim (`weighedMoves` key `square:<uci>`). */
function squareChoiceClaim(fenBefore: string, san: string): string | null {
  try {
    const mv = new Chess(fenBefore).move(san);
    return `square:${mv.from}${mv.to}${mv.promotion ?? ''}`;
  } catch { return null; }
}

/** A move that costs more than this against the engine's best is not a
 *  plan step the coach hands out (targetPressure, breakPrep, breakStopped). */
const PRESSURE_COST_CP = 50;

/** LEARN'S BOARD TEACHING reads these (`learnBoardTeaching`): its student-move
 *  bundle (`studentMoveTeaching`) is also what Review reads for the bundle's
 *  rule kinds, what a lesson reads for the lanes it names
 *  (`LESSON_STUDENT_LANE`), and what Play and chat answer "was that a good
 *  move?" with (`studentMoveAnswerLines`). */
const LEARN_BUNDLE = { wired: 'services/learnBoardTeaching.ts' } as const;
const BUNDLE_SURFACES = {
  learn: LEARN_BUNDLE, review: LEARN_BUNDLE, lesson: LEARN_BUNDLE, play: LEARN_BUNDLE, chat: LEARN_BUNDLE,
  tactics: TACTICS_NA,
  think: { not: 'judges a game move the student played; a step board has no move of theirs to judge' },
} as const;
const SLIP_HABIT_LESSON = { not: 'a slip\'s habit: a taught line\'s move is never the student\'s slip' } as const;
const SLIP_HABIT_WEAK = { not: 'the habit said after a slip; the slip itself is recorded by the live slip capture' } as const;

/** The square a move lands on ('' when it does not play). */
function moveTo(fen: string, san: string): string {
  try { return new Chess(fen).move(san).to; } catch { return ''; }
}

/** A move without its check and mate marks. */
const bareSan = (s: string): string => s.replace(/[+#]$/, '');

/** A board's placement and side to move — a position's claim key. */
const posKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

/** WHAT THE PAGE KEEPS OF A LEARN READ — the part of its key before the
 *  claim (`<what>|<claim>`): the analytics prop or the square a read's arrow
 *  needs, so the page never reads it off the words. */
export function learnReadKey(f: CoachFact): string[] {
  return readKey(f).split('|');
}

/** THE ACT AND THE HELD ANSWER OF A STRUCTURE JUDGEMENT ON THE STUDENT'S MOVE
 *  (`structureMove`) — Learn's event names the act and a correct choice
 *  records HELD on its own tag. Kept beside the fact it was read with, so the
 *  page reads the same read and never computes it twice. */
const STRUCTURE_MOVE_READ = new WeakMap<CoachFact, Pick<StructureRead, 'act' | 'held'>>();
export function structureMoveRead(f: CoachFact): Pick<StructureRead, 'act' | 'held'> | null {
  return STRUCTURE_MOVE_READ.get(f) ?? null;
}

/** A student counter-threat that cost less than this (centipawns) held. */
const COUNTER_THREAT_HELD_CP = 60;

/** The moved piece still stands where it went on `fenNow` (a point about a
 *  piece that was since taken is no point: Alekhine walk 2026-10-19). */
function stillStands(fenBefore: string, san: string, fenNow: string): boolean {
  try {
    const mv = new Chess(fenBefore).move(san);
    const there = new Chess(fenNow).get(mv.to);
    return !!there && there.color === mv.color && there.type === (mv.promotion ?? mv.piece);
  } catch { return false; }
}

/** The board teacher's reading with the game's spoken ideas, and the claim for
 *  each idea it said (`idea:<key>:<n>`, n = the times it was said before). */
function teacherWithIdeas(
  fenBefore: string, san: string, moverIsStudent: boolean, spokenIdeas: ReadonlyMap<string, number>,
): { fact: NonNullable<ReturnType<typeof buildReviewMoveTeachingFact>>; ideaClaims: string[] } | null {
  const phrases = new Map(spokenIdeas);
  const read = buildReviewMoveTeachingFact(fenBefore, san, moverIsStudent, phrases);
  if (!read) return null;
  const ideaClaims = [...phrases]
    .filter(([k, n]) => n !== (spokenIdeas.get(k) ?? 0))
    .map(([k]) => `idea:${k}:${spokenIdeas.get(k) ?? 0}`);
  return { fact: read, ideaClaims };
}

/** A count of pieces as a number word ("three times"). */
const timesWord = (n: number): string => (n === 1 ? 'once' : n === 2 ? 'twice' : `${countWord(n)} times`);

export const BOARD_COMPUTERS = {
  pinBreakOwn: {
    // The student's own pinned piece that walks out with tempo: their resource.
    read: ({ fen, student }, fact) => safe(() => {
      const own = findPinBreaks(fen, student)[0];
      if (!own) return null;
      const proof = pinBreakProof(own, student);
      const key = `pinbreak:${own.pinned}${own.to}`;
      return fact({ key, claims: [key], text: pinBreakLine(own, student), proof, squares: [own.pinned, own.to, own.pinner], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'findPinBreaks',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { not: 'a pin a piece may walk out of: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' }, think: THINK },
  },
  pinBreakTheirs: {
    // Their piece the student pins can walk out the same way.
    read: ({ fen, student, pinned }, fact) => safe(() => {
      const brk = findPinBreaks(fen, student === 'w' ? 'b' : 'w').find((b) => b.pinned === pinned);
      if (!brk) return null;
      const proof = pinBreakProof(brk, student);
      const key = `pinbreak:${brk.pinned}${brk.to}`;
      return fact({ key, claims: [key], text: pinBreakLine(brk, student), proof, squares: [brk.pinned, brk.to, brk.pinner], stakes: null, seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'findPinBreaks',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { not: 'their pinned piece that can walk out: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' }, think: { not: 'the pin the student\'s move just made: a step board\'s own pins are read by pinBreakOwn' } },
  },
  prophylaxis: {
    read: ({ fen, engineFirstMoves }, fact) => safe(() => {
      const ph = findProphylaxis(fen);
      if (!ph || !engineFirstMoves.includes(`${ph.prevention.from}${ph.prevention.to}`)) return null;
      const key = prophylaxisKey(ph.intent.to);
      // Held: their idea and that one move stops it — never which move
      // (easy walk 2026-10-11: "h3 first — it stops the pin" unasked).
      return fact({ key, claims: [key], text: prophylaxisLine(ph), proof: prophylaxisProof(ph), squares: ph.squares, stakes: null, seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen,
        marks: { play: { from: ph.prevention.from, to: ph.prevention.to }, theirs: { from: ph.intent.from, to: ph.intent.to } },
        heldForm: prophylaxisIdea(ph),
        // Both ways: the stop played, or their idea let land (`moveInsight.prophylaxisAnswer`).
        skill: 'missed-opponents-threat' });
    }),
    computer: 'findProphylaxis',
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: LESSON_READ, learn: LEARN, review: { not: 'Review says the stop after it was missed (prophylaxisMissed), never as advice on a game already played' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { wired: 'services/moveInsight.ts' }, think: THINK },
  },
  prophylaxisMissed: {
    read: ({ prevFen, studentSan, fenBefore, san, student }, fact) => safe(() => {
      const ph = findProphylaxis(prevFen);
      if (!ph || ph.intent.san !== san || studentSan === ph.prevention.san) return null;
      // …and it lands on the SAME piece now (Danya hv0P 6…Bb4: the stop was
      // for a pin on the bishop on d2, and after Nc3 the bishop pins the knight
      // instead — "Bb4 would pin your dark-squared bishop" named the wrong piece).
      const landed = theirWantedMoves(fenBefore, student).find((w) => w.san === ph.intent.san);
      if (landed?.hit[0]?.square !== ph.victim.square) return null;
      const proof = prophylaxisProof(ph);
      const key = prophylaxisKey(ph.intent.to);
      return fact({ key: `missed:${key}`, claims: [key], text: `That is the ${ph.kind === 'pin' ? 'pin' : 'kick'} a quiet move would have stopped — ${proof.full}.`, proof, squares: ph.squares, stakes: null,
        seat: 'opponent', namesStudentMove: true, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'findProphylaxis',
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: { not: 'a lesson plays the stop; there is no missed stop in a taught line' }, learn: { not: 'Learn says the stop before the move (prophylaxis), never the miss after it' }, review: REVIEW, play: PLAY_READ, chat: { not: 'chat answers about the board in front of it, not a past stop' }, tactics: TACTICS_READ, weaknesses: { not: 'the record half is the stop itself (moveInsight.prophylaxisAnswer): the same read files the move held or broken, once' }, think: { not: 'a step board has no earlier move to have stopped it' } },
  },
  enablingMove: {
    // "A first": names the student's first move (the live read speaks it only
    // where the move is earned; Learn draws it as the move to play).
    read: ({ fen, pv }, fact) => safe(() => {
      const o = findEnablingMove(fen, pv);
      if (!o) return null;
      const key = `order:${o.first.san}>${o.then.san}`;
      return fact({ key, claims: [key], text: enablingMoveLine(o), proof: enablingMoveProof(o), squares: [o.opened, o.then.from, o.then.to], stakes: null, seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, marks: { play: { from: o.first.from, to: o.first.to } } });
    }),
    computer: 'findEnablingMove',
    kind: 'move-order',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { not: 'the move that makes the best line possible: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' }, think: THINK },
  },
  // ── REVIEW'S PER-MOVE FACETS (one-coach basket) ──
  tradeLedger: {
    read: ({ history, student }, fact) => safe(() => {
      const led = tradeLedger(history, student);
      const proof = led ? squaresProof(led.text, led.squares) : null;
      if (!led || !proof) return null;
      const key = `ledger:${led.kind}:${led.square}`;
      return fact({ key, claims: [key], text: led.text, proof, squares: [led.square], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenOfGame(history) });
    }),
    computer: 'tradeLedger',
    kind: 'timing',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_WHOLE_GAME },
  },
  notYetPlayed: {
    read: ({ fenBefore, san, bestSan, cpLoss }, fact) => safe(() => {
      const ny = notYetPlayed(fenBefore, san, bestSan, cpLoss);
      const proof = ny ? squaresProof(ny.text, ny.squares) : null;
      if (!ny || !proof) return null;
      const key = `once:not-yet-played:${ny.target}`;
      return fact({ key, claims: [key], text: ny.text, proof, squares: ny.squares, stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'notYetPlayed',
    kind: 'timing',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  heldResource: {
    read: ({ fenBefore, san, bestSan, cpLoss, student }, fact) => safe(() => {
      // The student's move only: its words are the student's ("their knight").
      if (sideToMove(fenBefore) !== student) return null;
      const hold = heldResource(fenBefore, san, bestSan, cpLoss);
      const lp = hold ? legalLineProof(hold.fen, hold.sans, lineSeatAt(hold.fen, student)) : null;
      if (!hold || !lp) return null;
      const key = `once:hold:${hold.resource}`;
      return fact({ key, claims: [key], text: hold.text, proof: { ...lp, squares: hold.squares }, squares: hold.squares, stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'heldResource',
    kind: 'timing',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  captureChoice: {
    read: ({ fenBefore, san, bestSan, cpLoss, student }, fact) => safe(() => {
      // The student's capture only: "their knight", "nothing of yours".
      if (sideToMove(fenBefore) !== student) return null;
      const cc = captureChoice(fenBefore, san, bestSan, cpLoss);
      const lp = cc ? legalLineProof(fenBefore, cc.bad, lineSeatAt(fenBefore, student)) : null;
      if (!cc || !lp) return null;
      const key = `capture-choice:${cc.square}`;
      return fact({ key, claims: [key], text: cc.text, proof: { ...lp, squares: [cc.square] }, squares: cc.squares, stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'captureChoice',
    kind: 'capture-choice',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  kickAfterRecapture: {
    read: ({ fenBefore, san, reply, bestUci, student }, fact) => safe(() => {
      // The student's capture only: "Their knight took back".
      if (sideToMove(fenBefore) !== student) return null;
      const kick = kickAfterRecapture(fenBefore, san, reply, bestUci);
      const lp = kick ? legalLineProof(fenBefore, kick.sans, lineSeatAt(fenBefore, student)) : null;
      if (!kick || !lp) return null;
      const key = `kick:${kick.kick.square}`;
      return fact({ key, claims: [key], text: kick.text, proof: { ...lp, squares: kick.squares }, squares: kick.squares, stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'kickAfterRecapture',
    kind: 'kick',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  pawnSquareTaken: {
    read: ({ fenBefore, san, cpLoss, student }, fact) => safe(() => {
      if (sideToMove(fenBefore) !== student) return null;
      const won = pawnSquareTaken(fenBefore, san, cpLoss);
      const proof = won ? pawnSquareRaceProof(fenBefore, won.race) : null;
      if (!won || !proof) return null;
      const key = `pawn-race:${won.race.square}`;
      return fact({ key, claims: [key], text: won.text, proof, squares: won.squares, stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'pawnSquareTaken',
    kind: 'plan-race',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  kingReadsBestLine: {
    // The king read the board posed and the move passed by, said "Here, …".
    read: ({ fenBefore, student, bestUci }, fact) => safe(() => (sideToMove(fenBefore) !== student ? [] : kingReadsForBestLine(fenBefore, student, bestUci))
      .filter((r) => r.namesMove && r.id !== 'storm-race')
      .map((r, i) => fact({ key: `${r.id}:${i}`, claims: [`king-read:${r.id}`], text: `Here, ${continueSentence(r.text)}`, proof: r.proof, squares: r.squares, stakes: r.stakes ?? null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore }))),
    computer: 'kingReadsForBestLine',
    kind: 'king-read',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: { wired: 'services/moveInsight.ts' } },
  },
  sacCompensation: {
    read: ({ fenBefore, san, fenAfter, mover, moverCp, moverCpBefore, student, line }, fact) => safe(() => {
      const comp = sacrificeCompensation(fenAfter, mover, moverCp, mover === student, moverCpBefore);
      if (!comp.length) return null;
      // The compensation is shown by the play that follows: the engine's line
      // after the sacrifice (or, with no line, the sacrificing move itself).
      const proof = lineProofFromUci(fenAfter, line, lineSeatAt(fenAfter, student)) ?? legalLineProof(fenBefore, [san], lineSeatAt(fenBefore, student));
      return fact({ key: `sac:${san}`, claims: [`sac:${san}`], text: `${mover === student ? 'Your' : 'Their'} move is a sacrifice — compensation: ${listAnd(comp)}.`, proof: proof ?? NO_PROOF.description, squares: [], stakes: null, seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'sacrificeCompensation',
    kind: 'sac',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_SAC_TOLD },
  },
  // ONE ENTRY FOR THE MATING SAC'S MECHANISM (the one-coach unlock,
  // 2026-11-19: the walk's `sacMechanismWalk` was this computer with a
  // "Here's why it works:" lead-in; the walk now says the mechanism itself).
  sacMechanism: {
    read: ({ sans, sacIdx }, fact) => safe(() => {
      const mech = explainMatingSacMechanism([...sans], sacIdx);
      if (!mech) return null;
      return fact({ key: `sac-why:${sacIdx}`, claims: [`sac-why:${sacIdx}`], text: `${openSentence(mech)}.`, proof: NO_PROOF.description, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenOfGame(sans.slice(0, sacIdx + 1)) });
    }),
    computer: 'explainMatingSacMechanism',
    kind: 'sac-why',
    phase: ANY,
    // Review's facets (reviewFullData) and Review's walk (coachFeatureService).
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_SAC_TOLD },
  },
  sacKingShield: {
    read: ({ fenBefore, san }, fact) => safe(() => {
      const shield = describeSacBreaksKingShield(fenBefore, san);
      if (!shield) return null;
      return fact({ key: `shield:${san}`, claims: [`shield:${san}`], text: `${shield}.`, proof: NO_PROOF.description, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'describeSacBreaksKingShield',
    kind: 'sac-why',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_SAC_TOLD },
  },
  structureState: {
    read: ({ fen }, fact) => safe(() => {
      const struct = describeStructure(fen);
      if (!struct) return null;
      const s: string[] = [];
      if (struct.pawns.openFiles.length) s.push(`open files ${struct.pawns.openFiles.join(',')}`);
      if (struct.outposts.length) s.push(struct.outposts.map((o) => `${o.color === 'w' ? 'White' : 'Black'} ${o.piece === 'n' ? 'knight' : 'bishop'} outpost ${o.square}`).join(', '));
      const passed = [...struct.pawns.passedPawns.w.map((p) => `white ${p}`), ...struct.pawns.passedPawns.b.map((p) => `black ${p}`)];
      if (passed.length) s.push(`passed pawns ${passed.join(', ')}`);
      const iso = [...struct.pawns.isolatedPawns.w.map((p) => `white ${p}`), ...struct.pawns.isolatedPawns.b.map((p) => `black ${p}`)];
      if (iso.length) s.push(`isolated pawns ${iso.join(', ')}`);
      const dbl = [...struct.pawns.doubledFiles.w.map((f) => `white ${f}-file`), ...struct.pawns.doubledFiles.b.map((f) => `black ${f}-file`)];
      if (dbl.length) s.push(`doubled pawns ${dbl.join(', ')}`);
      if (!s.length) return null;
      return fact({ key: 'structure-state', claims: ['structure-state'], text: `${s.join(' · ')}.`, proof: NO_PROOF.description, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'describeStructure',
    kind: 'structure',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_BOARD_VERDICT },
  },
  // ONE ENTRY FOR WHO IS BETTER AT THE TURN OF THE GAME (the one-coach
  // unlock, 2026-11-19: the live composer's `phaseVerdictLive` was this
  // computer under another key). `heard`: the clauses the surface already
  // said (Review hands none — its ledger decides repeats downstream);
  // `lastMove`: the move that produced the board, its material read settled.
  phaseVerdict: {
    read: ({ fen, student, studentCp, phase, heard, lastMove }, fact) => safe(() => {
      const line = phaseVerdictLine(fen, student, studentCp, phase, heard, lastMove);
      if (!line) return null;
      return fact({ key: `phase:${phase}`, claims: [`phase:${phase}`], text: line, proof: NO_PROOF.description, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'phaseVerdictLine',
    kind: 'stock',
    phase: ANY,
    // Review's facets read it (reviewFullData); the composer reads it for
    // Learn, chat and every tapped read.
    surfaces: { ...LIVE_READ, review: REVIEW },
  },
  middlegameOrientation: {
    // A slow "advance your majority" plan is a NON-APPLICABLE reason while the
    // enemy king is exposed in the centre — that's a king hunt, not a majority
    // grind (David 2026-07-20 diagnostic: it fired every move of a mating attack).
    // One read for Review's facets (the mover's seat) and the walk's one-shot
    // orientation (both seats): the beat's arrows ride the key (`planBeatArrows`).
    read: ({ fen, student, seat, san }, fact) => safe(() => {
      if (enemyKingStuckInCenter(fen, student)) return null;
      return planBeatFact(buildMiddlegameOrientation(fen, student, san ?? undefined, seat), fen, seat === 'opponent' ? 'opponent' : 'student', fact);
    }),
    computer: 'buildMiddlegameOrientation',
    kind: 'plan-middlegame',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAN_CHANCE },
  },

  opponentDevelopment: {
    // Their development so far — one read for Review's facets and the walk;
    // the beat's arrows ride the key (`planBeatArrows`).
    read: ({ oppSans, fen, student }, fact) => safe(() => planBeatFact(buildOpponentDevelopmentRead([...oppSans], fen, student), fen, 'opponent', fact)),
    computer: 'buildOpponentDevelopmentRead',
    kind: 'opp-dev',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },

  studentMovePoint: {
    // QUIET MOVES ONLY: a capture's point is the trade, said by the trade.
    read: ({ fenBefore, san, prevCap }, fact) => safe(() => {
      const mv = new Chess(fenBefore).move(san);
      if (!mv || mv.captured) return null;
      const point = studentMovePoint(fenBefore, san, prevCap, null);
      if (!point) return null;
      return fact({ key: `point:${mv.to}`, claims: [`point:${mv.to}`], text: point, proof: NO_PROOF.description, squares: [mv.to], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'studentMovePoint',
    kind: 'point',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  positionalVerdict: {
    read: ({ fenBefore, san, fen, student, studentCp, quietBareBalanced }, fact) => safe(() => {
      const assess = assessPositionalEdge(fen, student, studentCp, lastMoveFromSan(fenBefore, san));
      if (!assess.verdict) return null;
      // A BARE "you're balanced" IN THE OPENING SAYS NOTHING (David 2026-09-16).
      if (quietBareBalanced && assess.reasons.length === 0 && /^balanced$/i.test(assess.verdict)) return null;
      return fact({
        key: `${assess.verdict}|${JSON.stringify(assess.reasons)}`, claims: [`verdict:${assess.verdict}`],
        text: positionalVerdictLine(assess.verdict, assess.reasons), proof: NO_PROOF.description,
        squares: [...new Set(assess.reasonSquares.flat())], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen,
      });
    }),
    computer: 'assessPositionalEdge',
    kind: 'verdict',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_BOARD_VERDICT },
  },
  plyFacts: {
    read: ({ fenBefore, san, prevCap, moverIsStudent }, fact) => safe(() => {
      const mech = plyFactsForMove(fenBefore, san, prevCap);
      if (!mech) return null;
      return fact({ key: `move:${san}`, claims: [`move:${san}`], text: seatMoveSubject(mech, moverIsStudent), proof: NO_PROOF.description, squares: [], stakes: null, seat: moverIsStudent ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'plyFactsForMove',
    kind: 'move',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  boardDelta: {
    // The squares come back keyed by the RAW clause, re-keyed onto the said
    // words (never scraped from prose).
    read: ({ fenBefore, san, fenAfter, student }, fact) => safe(() => {
      const squares = new Map<string, readonly string[]>();
      return computeBoardDelta(fenBefore, san, squares).map((clause, i) => {
        const seated = student ? seatPieceReferences(clause, fenAfter, student) : clause;
        return fact({ key: `delta:${i}`, claims: [`delta:${i}`], text: `${openSentence(seated)}.`, proof: NO_PROOF.description, squares: [...(squares.get(clause) ?? [])], stakes: null, seat: !student || sideToMove(fenBefore) === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
      });
    }),
    computer: 'computeBoardDelta',
    kind: 'delta',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  // ONE ENTRY FOR THE TRADES, DEFENCE AND CONVERSION (the one-coach unlock,
  // 2026-11-19: the live composer's `exchangeIdeasLive` was this read word
  // for word). Each read carries its proof and its say-once claim; the key
  // carries its kind (`exchangeIdeaKey`: a trade, a defence or a nugget).
  exchangeIdeas: {
    read: (input, fact) => safe(() => exchangeIdeas(input).map((x) => fact({
      key: `${x.kind}|${x.claim}`, claims: [x.claim], text: x.text, proof: x.proof, squares: x.squares, stakes: x.stakes ?? null,
      seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: input.fen,
    }))),
    computer: 'exchangeIdeas',
    kind: 'trade-idea',
    phase: ANY,
    // Review's facets read it (reviewFullData); the composer reads it for
    // Learn, chat and every tapped read.
    surfaces: { ...LIVE_READ, review: REVIEW },
  },
  fundamentalVerdict: {
    // Its diagnosis, then its how (the habit step), from one render: the
    // fundamentals it says in full for the first time ride the key
    // (`fundamentalsSaid`), so the caller's ledger learns them once said.
    read: (ctx, fact) => safe(() => {
      if (!ctx.attrs.length) return null;
      const out = (['diagnosis', 'how'] as const).map((half) => verdictFact(ctx, fact, half)).filter((f): f is CoachFact => f !== null);
      return out.length ? out : null;
    }),
    computer: 'renderFundamentalVerdict',
    kind: 'principle',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: { not: 'the diagnosis of a fundamental, rendered: its miss is filed by the attribution pipeline (autoAnalyzeGame, misconceptionTags) and its hold by the leading fundamentals (capabilitiesPosed); this read writes the words' } },
  },

  tacticRule: {
    read: ({ fen, type }, fact) => safe(() => {
      const inv = tacticInvariant(type);
      if (!inv) return null;
      const key = definitionKey(type);
      return fact({ key, claims: [key], text: `Remember — ${inv.full}`, proof: NO_PROOF.description, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'tacticInvariant',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), learn: { wired: 'components/Coach/CoachTeachPage.tsx' }, weaknesses: { not: 'the rule of a motif, said beside a tactic: the tactic itself is the shot the record names (namedShotTags); a rule poses no question' } },
  },
  moveInfluence: {
    read: ({ fenBefore, fenAfter, san, student }, fact) => safe(() => {
      const squares: string[] = [];
      const shape: { hitsPiece: boolean; loose?: string } = { hitsPiece: false };
      const raw = describeMoveInfluence(fenBefore, fenAfter, san, squares, shape);
      if (!raw) return null;
      const mover = sideToMove(fenBefore);
      return fact({
        key: `${shape.hitsPiece ? 'h' : '-'}|${shape.loose ?? ''}`, claims: [`influence:${san}`],
        text: student ? seatPieceReferences(raw, fenAfter, student) : raw, proof: NO_PROOF.description, squares,
        stakes: null, seat: !student || mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter,
      });
    }),
    computer: 'describeMoveInfluence',
    kind: 'does',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  heardCorrection: {
    read: ({ fen, heard, classification, san }, fact) => safe(() => {
      const c = correctionAgainstHeard(heard, classification, san);
      if (!c) return null;
      return fact({ key: c.ridesVerdict ? 'rides' : 'alone', claims: [`heard:${san}`], text: c.text, proof: NO_PROOF.description, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'correctionAgainstHeard',
    kind: 'quality',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  opponentMoveTeaching: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const opp = buildOpponentMoveTeaching(fenBefore, san, student);
      if (!opp) return null;
      return fact({ key: `${opp.kind ?? '-'}|${san}`, claims: [`opp-target:${san}`], text: opp.text, proof: NO_PROOF.description, squares: [...(opp.squares ?? [])], stakes: null, seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'buildOpponentMoveTeaching',
    kind: 'opp-target',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  tradeJudged: {
    // HOW GOOD THE TRADE IS (David 2026-09-27: "how well the trade benefits
    // the user"). The same computer Learn speaks from; the engine has the
    // last word through the mover's own cost on this ply. Key `h|…` when its
    // words open with the move.
    read: ({ fenBefore, fenAfter, san, student, prior, costCp }, fact) => safe(() => {
      const sq = inFluxAfter(fenBefore, san);
      if (!student || !sq) return null;
      const judged = readTrade(fenBefore, san, student, costCp, prior ? lastMoveFromSan(prior.fenBefore, prior.san) : null, true);
      if (!judged) return null;
      return fact({ key: `${judged.headsMove ? 'h' : '-'}|${sq}`, claims: [`trade:${sq}`], text: judged.text, proof: tradeProofOf(fenBefore, fenAfter, san, sq, student) ?? NO_PROOF.description, squares: judged.squares, stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'readTrade',
    kind: 'trade',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  tradeSettled: {
    // THE WHOLE EXCHANGE, read off the ENGINE'S line through the one ledger
    // (WO-OUTCOME-01). Key `delta` for a capture with nothing computed about
    // it (a description, said only beside a teaching point on its square),
    // `trade` for material that changes hands or a take-back that costs more.
    // A plain even trade restates the move and is not said.
    read: ({ fenBefore, fenAfter, san, moverIsStudent, student, lineUci, prior, moverCostCp }, fact) => safe(() => {
      const tradeSq = inFluxAfter(fenBefore, san);
      if (!tradeSq) return null;
      const mv = new Chess(fenBefore).move(san);
      const NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
      const theirs = NOUN[mv.captured ?? ''] ?? 'piece';
      const line: string[] = [san];
      try {
        const c = new Chess(fenAfter);
        for (const u of lineUci) {
          const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
          if (!m) break;
          line.push(m.san);
        }
      } catch { /* the line stops where it stops being legal */ }
      const studentWB: Color = moverIsStudent ? mv.color : mv.color === 'w' ? 'b' : 'w';
      const ledger = line.length > 1 ? settledExchange(fenBefore, line, studentWB, prior) : null;
      const studentLost: string[] = ledger ? [...ledger.opponentWon] : [];
      const theirLost: string[] = ledger ? [...ledger.studentWon] : [];
      const traded: string[] = [];
      for (let i = studentLost.length - 1; i >= 0; i -= 1) {
        const j = theirLost.indexOf(studentLost[i]);
        if (j >= 0) { traded.unshift(studentLost[i]); theirLost.splice(j, 1); studentLost.splice(i, 1); }
      }
      const nouns = (xs: string[]): string => listAnd(xs.map((x) => NOUN[x] ?? 'piece'));
      const tradePart = traded.length ? `${withArticle(nouns([...new Set(traded)]))} trade` : null;
      // The piece won beside a trade of its kind is ANOTHER one (Review
      // baseline 2026-11-08, 19.gxf5: "a pawn trade, and they win the pawn").
      const won = (xs: string[]): string => (xs.length === 1 && traded.includes(xs[0]) ? `another ${NOUN[xs[0]] ?? 'piece'}` : `the ${nouns(xs)}`);
      const restPart = studentLost.length && theirLost.length
        ? `your ${nouns(studentLost)} for their ${nouns(theirLost)}`
        : theirLost.length ? `you win ${won(theirLost)}`
          : studentLost.length ? `they win ${won(studentLost)}` : null;
      const what = tradePart && restPart ? `${tradePart}, and ${restPart}` : tradePart ?? restPart;
      // "Can take back" only when taking back does not lose material; the
      // static count yields to the engine — a capture that cost its mover a
      // mistake's worth is never "safe from recapture".
      const recapturer: Color = mv.color === 'w' ? 'b' : 'w';
      const engineSaysCostly = moverCostCp !== null && moverCostCp >= MISTAKE_CP;
      // Whether they take back is what the engine's line does, when there is one.
      const lineRetakes = line.length > 1
        ? /x/.test(line[1]) && /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(line[1])?.[1] === tradeSq
        : null;
      // THE LINE'S OWN ANSWER DECIDES (review walk oct3b, g2 ply 49): when the
      // line declines the take-back of a capture that still cost its mover,
      // say the capture and stop.
      const safeBack = lineRetakes ?? (engineSaysCostly || signedLegalSeeFor(fenAfter, tradeSq as Square, recapturer) >= 0);
      const costlyGrab = lineRetakes === false && engineSaysCostly;
      const lost = NOUN[mv.captured ?? ''] ?? 'piece';
      const said = !what || costlyGrab
        ? moverIsStudent
          ? `You take on ${tradeSq} — that was their ${theirs}.`
          : `They take on ${tradeSq} — that was your ${theirs}.`
        : safeBack
          ? moverIsStudent
            ? `You take on ${tradeSq}, and they can take back — ${what}.`
            : `They take on ${tradeSq}, and you can take back — ${what}.`
          : moverIsStudent
            ? `You take on ${tradeSq} — taking back would cost them more than the ${lost}.`
            : `They take on ${tradeSq} — taking back would cost you more than the ${lost}.`;
      const seat: FactSeat = moverIsStudent ? 'student' : 'opponent';
      // A CAPTURE WITH NOTHING COMPUTED ABOUT IT IS A DESCRIPTION (review
      // audit 2026-10-14): filed as one, with its square.
      if (!what || costlyGrab) return fact({ key: `delta|${tradeSq}`, claims: [`capture:${tradeSq}`], text: said, proof: NO_PROOF.description, squares: [tradeSq], stakes: null, seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
      // A PLAIN EVEN TRADE restates the move (lead 2026-10-20): said only when
      // material changes hands or the take-back costs more.
      if (!restPart && safeBack) return null;
      return fact({ key: `trade|${tradeSq}`, claims: [`trade:${tradeSq}`], text: said, proof: tradeProofOf(fenBefore, fenAfter, san, tradeSq, student) ?? NO_PROOF.description, squares: [], stakes: null, seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'settledExchange',
    kind: 'trade',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  boardTactics: {
    read: ({ fenBefore, san, fenAfter, student, lineUci, motifSaid, skipMateAgainst }, fact) => safe(() => {
      const t = detectTactics(fenAfter);
      // The ONE colour-named description the detector writes ("Black has a
      // checkmate available from c8") is seated here too — walk 6, R13.
      const seatText = (s: string): string => {
        if (!student) return s;
        const me = student === 'w' ? 'White' : 'Black';
        const seated = s.replace(/^(White|Black) has mate in one\b/, (_m, side: string) => (side === me ? 'You have mate in one' : 'They have mate in one'));
        return seatPieceReferences(seated, fenAfter, student);
      };
      // A TACTIC'S PROOF is the engine line from this board, cut where it
      // proves the material for the side the tactic favours — only when that
      // side is to move; for the side NOT to move, the null-move read of what
      // it wins (`threatProof`, the same proof Learn's warning speaks).
      const toMove = sideToMove(fenAfter);
      const tacProof = (b: Color | undefined, squares: readonly string[]): FactProof => {
        if (!b) return NO_PROOF.description;
        return (b === toMove ? moverLineProof(fenAfter, lineUci, b, { fenBefore, san }) : threatProof(fenAfter, toMove, squares)) ?? NO_PROOF.description;
      };
      // THIS INSTANCE'S PLACE AMONG THE GAME'S — said before, then new here —
      // so a sentence rotates by how many patterns of its kind were said.
      const newHere = new Map<string, string[]>();
      const occurrence = (motif: string, instance: string): number => {
        const said = motifSaid.get(motif) ?? [];
        const at = said.indexOf(instance);
        if (at >= 0) return at;
        const here = newHere.get(motif) ?? [];
        if (!here.includes(instance)) here.push(instance);
        newHere.set(motif, here);
        return said.length + here.indexOf(instance);
      };
      const out: CoachFact[] = [];
      const say = (tac: (typeof t.tactics)[number], text: string, stakes: FactStakes | null): void => {
        const key = `${tac.type}@${tac.beneficiary ?? '-'}:${tac.involvedSquares.join('')}`;
        out.push(fact({ key, claims: [`motif:${key}`], text, proof: tacProof(tac.beneficiary, tac.involvedSquares), squares: tac.involvedSquares, stakes, seat: student && tac.beneficiary && tac.beneficiary !== student ? 'opponent' : 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter }));
      };
      for (const tac of t.tactics) {
        if (tac.type === 'none' || !tac.description) continue;
        // THE MATE IS SAID ONCE: the verdict already said the mate this move allowed.
        if (tac.type === 'mate_threat' && skipMateAgainst !== null && tac.beneficiary !== skipMateAgainst) continue;
        // A fork SHAPE is tempo-blind: verified (tempo + SEE) before it is said.
        if (tac.type === 'fork') {
          const v = verifyForkOnBoard(fenAfter, tac.involvedSquares[0], tac.involvedSquares.slice(1));
          if (v.status === 'live') {
            say(tac, `${seatText(tac.description)} — it's the move, so the material comes off.`, { points: v.winsPoints, plies: 1 });
          } else if (v.status === 'threat') {
            // The fork is coming, and the side it hits can rescue only one piece.
            const saver = !student || !tac.beneficiary ? null : tac.beneficiary === student ? 'they' : 'you';
            say(tac, `${seatText(tac.description)}${saver ? ` — ${forkConsequence(saver)}` : ''}.`, { points: v.winsPoints || forkPoints(piecesOn(fenAfter, tac.involvedSquares.slice(1))), plies: 2 });
          }
          continue;
        }
        // What it wins by exchange on its own squares, from the side it hurts.
        const stakes = exchangeStakes(fenAfter, tac.involvedSquares, tac.beneficiary ? (tac.beneficiary === 'w' ? 'b' : 'w') : null);
        // A PIN ON A PAWN THAT WINS NOTHING IS SCENERY (walk 6, R5).
        if (isScenicPawnPin(fenAfter, tac.type, tac.involvedSquares, tac.beneficiary)) continue;
        // A PIN SAYS WHAT IT HOLDS — the same rotated sentence Learn's pin line speaks.
        const said = occurrence(tac.type, tac.involvedSquares.join(''));
        const holds = tac.type === 'pin' && student && tac.beneficiary
          ? pinConsequence(fenAfter, tac.involvedSquares, student, tac.beneficiary === student ? 'student' : 'opponent', said)
          : null;
        say(tac, `${seatText(tacticDescription(tac, fenAfter, said, student ?? null))}.${holds ? ` ${holds}` : ''}`, stakes);
      }
      return out;
    }),
    computer: 'detectTactics',
    kind: 'tactic',
    phase: ANY,
    surfaces: { ...reviewFacetSurfaces(), weaknesses: { not: 'the tactics on the board after a move, for words: the chance the student had is the shot the record names from the best move (capabilityOutcomes, namedShotTags), their tactic the threat reads pose' } },
  },
  tiedDefender: {
    // Their guard the student's move tied down — a fact about the student's
    // own move (its pressure bought it), so the student's seat: every door
    // seats it there today (Learn's move point, the live clause, Review).
    read: ({ fenBefore, fenAfterMove, fenAfterReply, student }, fact) => safe(() => {
      // What the STUDENT's move tied down ("that is what pressure buys") —
      // never said after their move (lesson 2026-11-19: "their bishop on f8
      // is tied down now" on their own …c5).
      if (new Chess(fenBefore).turn() !== student) return null;
      const tie = newTiedDefender(fenBefore, fenAfterMove, student);
      if (!tie) return null;
      const holds = findTiedDefenders(fenAfterReply, student).some((t) => t.defender.square === tie.defender.square && t.target.square === tie.target.square);
      if (!holds) return null;
      const key = countKey(tie.target.square);
      return fact({ key, claims: [key], text: tiedDefenderLine(tie), proof: tiedDefenderProof(tie), squares: [tie.defender.square, tie.target.square], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfterReply });
    }),
    computer: 'newTiedDefender',
    kind: 'their-read',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_READ, weaknesses: { not: 'a pressure the student\'s move made, not a question the board posed: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' }, think: { not: 'needs the student\'s move and their reply; a step board stops at one move' } },
  },
  obligationLifted: {
    // What their move gave up: an attacker off a piece the student guarded.
    read: ({ fenBefore, fenAfter, student }, fact) => safe(() => {
      const o = obligationLifted(fenBefore, fenAfter, student);
      if (!o) return null;
      const key = `lifted:${o.square}`;
      return fact({ key, claims: [key], text: obligationLiftedLine(o), proof: NO_PROOF.description, squares: [o.square, o.from, o.to], stakes: null, seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'obligationLifted',
    kind: 'their-read',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: WEAK_MOVE_DESCRIBED, think: THINK },
  },
  openingStory: {
    // HOW A STRONG COACH EXPLAINS AN OPENING (OS-3): the fork, what it is, the
    // choice and its price, their setup, the coming game and its key idea —
    // each a computed fact, in the speed runs' order. The story makes its own
    // facts (WO-STORY-MATRIX-01 P1-6b): each beat under its own kind
    // (`STORY_KIND`), a plan aim a claim shared with the plan thread, and a
    // beat that would name the student's next move left out where the surface
    // may not name one (`namesStudentMoves`). `fen` is the board after
    // `history`, for the phase column.
    // THEORY WHERE THE SURFACE SAYS IT (David 2026-11-06: "Yes move theory to
    // review button, but keep in learn for now also"): `theory` is REQUIRED —
    // the Review walk speaks the board's and the name's lines only; its
    // master-games beats are the Theory button's.
    read: ({ history, student, namesStudentMoves, theory }) => safe(() => openingStoryAt({ history, student, namesStudentMoves, theory })),
    computer: 'openingStoryAt',
    kind: 'opening',
    phase: NOT_ENDING,
    surfaces: {
      lesson: LESSON_BOARD,
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: { not: 'Play\'s writer row carries no opening story (writerRegister WRITER.play.story false): its tapped read is about the board, not the opening' },
      chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: WEAK_OPENING_TOLD,
      think: THINK_BOOK,
    },
  },
  bookMove: {
    // THE OPENING SLIP (David 2026-11-07/08): once the student has left the
    // book, ONE computer (`openingSlip`) says whether it was the move ORDER,
    // the wrong SQUARE or a different LINE, and why it matters. The order and
    // a different line stay silent unless the move hands them a shot or gives
    // one up; the square says why the book square was better. The Openings
    // Play rung reads the same computer with the pro's book. Theory is
    // knowledge, not a find: the book move is named once the student has left
    // it. Graded on the board the student left (prod Learn audit 2026-10-14).
    read: ({ history, student, plain }, fact) => safe(() => {
      const dep = bookDeparture(history);
      if (!dep || dep.mover !== student || history.length - dep.ply > 1) return null;
      const book = mastersBook(history.slice(0, dep.ply - 1));
      if (!book) return null;
      const w = openingSlip({ fen: dep.fen, playedSan: dep.san, book, student, plain });
      if (!w) return null;
      const spokenOn = boardAfter(dep.fen, dep.san);
      if (!spokenOn) return null;
      const key = `book-move:${dep.ply}:${dep.san}`;
      return fact({ key, claims: [key], text: w.text, proof: squaresProof(w.text, w.squares) ?? NO_PROOF.stated, squares: [...w.squares], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: spokenOn, role: 'teach', skill: FUNDAMENTAL_TAG['left-book-early'] });
    }),
    computer: 'openingSlip',
    kind: 'opening',
    phase: NOT_ENDING,
    surfaces: {
      lesson: LESSON_READ,
      learn: LEARN,
      review: { not: "the walk speaks none: the Theory button says the book move at the student's departure (reviewOpeningTheory → bookMoveWhy); Review's deep dive is designed with David first" },
      play: COMPOSER,
      chat: COMPOSER,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: WEAK_OPENING_TOLD,
      think: THINK_BOOK,
    },
  },
  openingTheory: {
    // OPENING THEORY, CALCULATED (David 2026-11-12: "I want the gap filled" →
    // "the new lines we are adding is what I want on"): the masters' games at
    // the board each of the last two moves was played on — the main move or a
    // sideline, the other main tries and their aims, how it scores. Learn says
    // "your move", never its name; the reply the masters give to THEIR move is
    // the student's next move, so it is not said here.
    // THE MOVE'S OWN BOOK READ in the one fact set: the standing said about the move, the rest as sentences of their own steps; their move's expected reply is the student's next move (held where the surface holds it).
    read: (ctx, fact) => ('words' in ctx ? safe(() => {
      const w = ctx.words;
      const mine = w.moverIsStudent !== false;
      return openingTheoryFacts(w.fenBefore, w.san, mine).flatMap((t) => {
        const f = moveIdeaFact(fact, w, { kind: t.kind, idea: 'theory', weight: 40, text: t.kind === 'book-standing' ? moveLead(w, t.clause) : t.sentence, alsoText: t.sentence, squares: t.squares, extraClaims: [`theory:${t.kind}:${t.names.join(',')}`] });
        return f ? [t.kind === 'book-reply' && !mine ? { ...f, namesStudentMove: true } : f] : [];
      });
    }) : safe(() => {
      const { history, student } = ctx;
      const out: ReturnType<MakeFact>[] = [];
      const board = new Chess();
      const fens: string[] = [];
      for (const san of history) { fens.push(board.fen()); board.move(san); }
      for (let k = Math.max(0, history.length - 2); k < history.length; k++) {
        const fenBefore = fens[k];
        const mover: Color = new Chess(fenBefore).turn();
        const mine = mover === student;
        const san = history[k];
        const spokenOn = boardAfter(fenBefore, san);
        if (!spokenOn) continue;
        const subject = mine ? 'Your move' : `Their ${mover === 'b' ? '…' : ''}${san}`;
        for (const t of openingTheoryFacts(fenBefore, san, mine)) {
          if (t.kind === 'book-reply' && !mine) continue;
          const text = `${subject} ${t.clause}.`;
          const key = `theory:${k}:${t.kind}:${t.names.join(',')}`;
          out.push(fact({ key, claims: [key], text, proof: squaresProof(text, t.squares) ?? NO_PROOF.name, squares: [...t.squares], stakes: null, seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: spokenOn, role: 'teach' }));
        }
      }
      return out.length > 0 ? out : null;
    })),
    computer: 'openingTheoryFacts',
    // The door's word for a fact about the opening itself (the name group).
    kind: 'opening',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: PLAY_READ,
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'theory is knowledge, not a find the record keeps' },
      think: THINK_BOOK,
    },
  },
  slipsOnLine: {
    // KNOWN MISTAKES AND TRAPS IN LEARN (David 2026-11-12: "Let's not hold
    // anything back"): the student's move and the reply, each read on the
    // board it was played from — a known slip played, said with its
    // punishment.
    read: ({ history, student }, fact) => safe(() => {
      const index = knownSlipIndexNow();
      if (!index || history.length === 0) return null;
      const board = new Chess();
      const fens: string[] = [];
      for (const san of history) { fens.push(board.fen()); board.move(san); }
      const out: CoachFact[] = [];
      for (let k = Math.max(0, history.length - 2); k < history.length; k++) {
        const f = knownSlipFact(knownSlip({ fen: fens[k], gems: knownSlipsAt(index, fens[k]), played: history[k], student, verdictPunish: null, saidNext: null, told: k, on: 'played' }), fens[k], fact);
        if (f) out.push(f);
      }
      // The slip still to come is not named: on the student's side it names a
      // move they could play, on theirs the reply has already been chosen.
      // An opponent's slip played names the student's punishing move
      // (`namesStudentMove`), and the turn door decides whether it may speak.
      return out.length > 0 ? out : null;
    }),
    computer: 'knownSlip',
    kind: 'common-wrong',
    phase: ANY,
    surfaces: { ...SLIPS_ON_LINE_SURFACES, tactics: TACTICS_NO_HISTORY },
  },
  moveGains: {
    // WHAT A MOVE STOPS, THE ORDER IT KEEPS, THE LINE IT CUTS (gaps B1-B3,
    // David 2026-11-12: "I want the gap filled" — on every surface). Learn
    // reads the student's move and the reply: "Your move stops …Bg4, which
    // would pin your knight on f3 against your queen on d1".
    // The move's own stops in the one fact set (both seats): "it stops …Bg4, which would pin your knight on f3 against your queen".
    read: (ctx, fact) => ('words' in ctx ? safe(() => {
      const w = ctx.words;
      return moveStops(w.fenBefore, w.san, w.moverIsStudent !== false).flatMap((st) => {
        const f = moveIdeaFact(fact, w, { kind: 'stop', idea: 'prevent', weight: 70, text: moveLead(w, st.clause), alsoText: `It also ${st.clause}`, squares: st.squares, extraClaims: [`stops:${st.san}`] });
        return f ? [f] : [];
      });
    }) : safe(() => {
      const { history, student } = ctx;
      const out: ReturnType<MakeFact>[] = [];
      const board = new Chess();
      const fens: string[] = [];
      for (const san of history) { fens.push(board.fen()); board.move(san); }
      for (let k = Math.max(0, history.length - 2); k < history.length; k++) {
        const fenBefore = fens[k];
        const mover: Color = new Chess(fenBefore).turn();
        const mine = mover === student;
        const san = history[k];
        const spokenOn = boardAfter(fenBefore, san);
        if (!spokenOn) continue;
        const subject = mine ? 'Your move' : `Their ${mover === 'b' ? '…' : ''}${san}`;
        const say = (key: string, clause: string, squares: string[]): void => {
          const text = `${subject} ${clause}.`;
          // What a move stops is proven on its squares; with none, it is not said.
          const proof = squaresProof(text, squares);
          if (!proof) return;
          out.push(fact({ key: `${k}:${key}`, claims: [`gain:${k}:${key}`], text, proof, squares, stakes: null, seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: spokenOn, role: 'teach' }));
        };
        for (const s of moveStops(fenBefore, san, mine)) say(`stops:${s.san}`, `stops ${s.san}, which ${s.would}`, s.squares);
        const o = pieceOutFirst(fenBefore, san, history.slice(k + 1));
        if (o) say(`out:${o.pawn}`, `brings the ${o.piece} out before ${o.pawn} closes its road`, o.squares);
        const c = lineCut(fenBefore, san, mine);
        if (c) say(`cut:${c.squares.join('')}`, `cuts ${c.piece} off from ${c.lost}`, c.squares);
        const cage = pieceCage(fenBefore, san, mine);
        if (cage) say(`cage:${cage.knight}`, cage.clause, cage.squares);
      }
      return out.length > 0 ? out : null;
    })),
    computer: 'moveStops',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: PLAY_READ,
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move, no question of the student\'s posed' },
      think: THINK,
    },
  },
  // A MOVE THAT CLEARS A CHECK (Danya, …Ne4 "opens the queen's d8–h4
  // diagonal, so …Qh4+ comes next"): the road opened, then used.
  opensCheck: {
    read: ({ fenBefore, san, line, student, tense }, fact) => safe(() => {
      const mover: Color = new Chess(fenBefore).turn();
      const mine = mover === student;
      const o = opensCheck(fenBefore, san, line, mine, tense);
      const on = o ? boardAfter(fenBefore, san) : null;
      if (!o || !on) return null;
      const text = `${mine ? 'Your move' : `Their ${mover === 'b' ? '…' : ''}${san}`} ${o.clause}.`;
      const proof = squaresProof(text, o.squares);
      if (!proof) return null;
      const key = `opens-check:${o.from}${o.to}`;
      return fact({ key, claims: [key], text, proof, squares: o.squares, stakes: null, seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: on, role: 'teach' });
    }),
    computer: 'opensCheck',
    kind: 'does',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN_VIA_THOUGHT,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: PLAY_READ,
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move, no question of the student\'s posed' },
      think: THINK,
    },
  },
  // TWO THINGS TO TAKE, THE ONE WITH CHECK FIRST (Danya, Nxb8+: "first take
  // the rook with check, then collect the other one"), the reads proving it.
  captureOrder: {
    read: ({ fenBefore, san, line, reads, student, tense }, fact) => safe(() => {
      const mover: Color = new Chess(fenBefore).turn();
      const mine = mover === student;
      const o = captureOrder(fenBefore, san, line, reads, mine, tense);
      const on = o ? boardAfter(fenBefore, san) : null;
      if (!o || !on) return null;
      const proof = squaresProof(o.text, o.squares);
      if (!proof) return null;
      const key = `capture-order:${o.first.square}${o.second.square}`;
      return fact({ key, claims: [key], text: o.text, proof, squares: o.squares, stakes: null, seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: on, role: 'teach' });
    }),
    computer: 'captureOrder',
    kind: 'move-order',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN_VIA_THOUGHT,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: PLAY_READ,
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_READ,
      weaknesses: WEAK_PLAYED_JUDGED,
      think: THINK,
    },
  },
  // A PAWN ON THE KNIGHT'S SQUARE (Danya, 2…c6: "takes away the b8 knight's
  // natural square"), only on a move that cost an inaccuracy or more.
  knightSquareTaken: {
    read: ({ fenBefore, san, student, costCp }, fact) => safe(() => {
      const mover: Color = new Chess(fenBefore).turn();
      const mine = mover === student;
      const k = knightSquareTaken(fenBefore, san, mine, costCp);
      const on = k ? boardAfter(fenBefore, san) : null;
      if (!k || !on) return null;
      const text = `${mine ? 'Your move' : `Their ${mover === 'b' ? '…' : ''}${san}`} ${k.clause}.`;
      const proof = squaresProof(text, k.squares);
      if (!proof) return null;
      const key = `knight-square:${k.pawnSquare}`;
      return fact({ key, claims: [key], text, proof, squares: k.squares, stakes: null, seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: on, role: 'teach' });
    }),
    computer: 'knightSquareTaken',
    kind: 'principle',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN_VIA_THOUGHT,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: PLAY_READ,
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_READ,
      weaknesses: WEAK_PLAYED_JUDGED,
      think: THINK,
    },
  },
  // ONE COACH (unified 2026-10-17): the count and the priority Learn teaches,
  // read by Review and the live composer through the same registry. The count
  // reads the student's own move, and only a move that lost it (2026-10-28).
  countMethod: {
    read: ({ fenBefore, playedSan, student, costCp }, fact) => safe(() => {
      const m = countMethod(fenBefore, playedSan, student, costCp);
      if (!m) return null;
      const key = countKey(m.square);
      return fact({ key, claims: [key], text: m.text, proof: NO_PROOF.method, squares: [m.square], stakes: { points: Math.abs(m.net), plies: 0 }, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, role: 'teach' });
    }),
    computer: 'countMethod',
    kind: 'method',
    phase: ANY,
    surfaces: { lesson: LESSON_READ, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: WEAK_PLAYED_JUDGED, think: THINK },
  },
  priorityFirst: {
    read: ({ fen, student, bestUci }, fact) => safe(() => {
      const pf = buildPriorityFirst({ fen, studentColor: student === 'w' ? 'white' : 'black', bestUci });
      if (!pf) return null;
      // The spoken package names the move; the held form is the priority
      // without it (Learn names no move unasked). The question and its answer
      // as ONE closed span — the stakes are part of the answer, so they wait
      // with it.
      const idea = packageForRegister({ ...pf.hint, detail: undefined }, 'obvious');
      const key = `priority:${pf.targetSquare}`;
      return fact({ key, claims: [key], text: pf.spoken, proof: squaresProof(pf.spoken, [pf.targetSquare]) ?? NO_PROOF.method, squares: [pf.targetSquare], stakes: null, seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, role: 'teach',
        heldForm: { text: idea, proof: squaresProof(idea, [pf.targetSquare]) ?? NO_PROOF.method, squares: [pf.targetSquare] },
        marks: { play: pf.arrow } });
    }),
    computer: 'buildPriorityFirst',
    kind: 'priority',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { not: 'the target the best move aims at: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' }, think: THINK },
  },
  lastTimeHere: {
    // MEMORY BY POSITION (David 2026-10-15): the book-departure rows already
    // hold every position the student left theory from, the move and its
    // cost. Their own move, already played, is named; the book move never is.
    read: ({ fenBefore, playedSan, rows, currentGameId }, fact) => safe(() => {
      const r = lastTimeHere(fenBefore, playedSan, rows, currentGameId);
      if (!r) return null;
      const after = boardAfter(fenBefore, playedSan);
      if (!after) return null;
      // The proof is the move itself, from the board it was played on then.
      const line = { fen: r.departure.fen, sans: [r.departure.san] };
      const proof: FactProof = { kind: 'line', exact: true, short: `The move then was ${r.departure.san}`, full: `The move then was ${r.departure.san}`, line };
      return fact({ key: r.key, claims: [r.key], text: r.text, proof, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: after });
    }),
    computer: 'lastTimeHere',
    kind: 'last-here',
    phase: NOT_ENDING,
    surfaces: {
      lesson: LESSON_READ,
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: COMPOSER,
      chat: COMPOSER,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: WEAK_OPENING_TOLD,
      think: { not: 'reads the student\'s own record at this board, which a step board does not carry' },
    },
  },
  queenGrabTrap: {
    // A capture that looks free and leaves the student's queen with no way out.
    read: ({ fen }, fact) => safe(() => {
      const t = findQueenGrabTraps(fen)[0];
      if (!t) return null;
      const proof = queenGrabTrapProof(t);
      const key = `grab:${t.to}`;
      return fact({ key, claims: [key], text: queenGrabTrapLine(t), proof, squares: [t.from, t.to, t.replyFrom, t.replyTo, ...(proof.squares ?? [])], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, skill: 'poisoned-pawn', fen });
    }),
    computer: 'findQueenGrabTraps',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { wired: 'services/moveInsight.ts' }, think: THINK },
  },
  trapped: {
    read: ({ fen, student }, fact) => safe(() => {
      const t = trappedOnBoard(fen, student);
      if (!t) return null;
      const squares = [t.square, t.attackerSquare];
      const line = `Careful — your ${PIECE_NAMES[t.piece] ?? 'piece'} on ${t.square} is attacked and has no safe square.`;
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      const key = `trapped:${t.square}`;
      return fact({ key, claims: [key], text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], stakes: threatStakes(fen, student, squares), seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'trappedOnBoard',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_READ, learn: LEARN, review: { wired: 'services/reviewTeachingPoints.ts' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_COMPOSER, weaknesses: { not: 'a trapped piece is often lost whatever is played, so a clean move proves nothing held; the record files a trapped piece where the engine\'s line shows the way out (findTrappedPiece, hung-material)' }, think: THINK },
  },
  threatCost: {
    // A warning the surface wrote, with the cost it claims proven on the
    // board. Its claims are the loose pieces it names; the warning's own say-once
    // key is the surface's (the threat lane's), never this read's.
    read: ({ line, fen, student, squares }, fact) => safe(() => {
      const { text, proof } = provenThreatLine(line, fen, student, squares);
      return fact({ key: `threat:${squares.join('')}`, claims: looseClaims(fen, student, squares), text, proof: proof ?? squaresProof(text, squares) ?? NO_PROOF.stated, squares: [...new Set([...squares, ...(proof?.squares ?? [])])], stakes: threatStakes(fen, student, squares), seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'provenThreatLine',
    kind: 'threat',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { not: 'chat\'s threat question reads the same must-defend computer (groundedAnswer.assembleThreatAnswer → computeMustDefend) and proves each target there; this read proves a warning another surface wrote' }, tactics: TACTICS_NA, weaknesses: { not: 'proves the cost a surface\'s own warning claims: the threat is posed by the reads that find it (the mate probe in capabilitiesPosed, noSafeChecks), this read proves the words' }, think: { not: 'said with a threat warning a surface named; the step\'s own question asks for the threat' } },
  },
  threatAnswer: {
    // The threat and its answer are one claim: the answer is proven by the
    // threat's own cost on the board, or — when the move is named — by the
    // move itself, legal on the board.
    read: (c, fact) => safe(() => {
      const studentCp = c.whiteCp === null ? null : c.student === 'w' ? c.whiteCp : -c.whiteCp;
      const ans = threatAnswer({ fen: c.fen, squares: c.squares, bestUci: c.bestUci, studentCp, student: c.student, ply: c.ply, shape: c.shape, namesMove: c.namesMove });
      if (!ans) return null;
      const cost = provenThreatLine(ans.text, c.fen, c.student, c.squares).proof ?? squaresProof(ans.text, c.squares) ?? NO_PROOF.stated;
      const proof = (isProof(cost) ? cost : null) ?? (ans.arrow ? legalLineProof(c.fen, [ans.san], lineSeatAt(c.fen, c.student)) : null) ?? cost;
      const key = `threat-answer:${ans.kind}:${c.squares.join('')}`;
      return fact({
        key, claims: [key], text: ans.text, proof, squares: [...c.squares], stakes: null, seat: 'student',
        namesStudentMove: namesPlayableStudentMove(namesMoves(c.student, c.fen, namedSan(c.fen, ans.san))), thread: LOCAL_THREAD, fen: c.fen,
        ...(ans.arrow ? { marks: { play: { from: ans.arrow.from, to: ans.arrow.to } } } : {}),
      });
    }),
    computer: 'threatAnswer',
    kind: 'must-defend',
    phase: ANY,
    surfaces: {
      lesson: { not: 'the line\'s next move is the answer, said on it as the answer to their last move (moveThoughtFacts: bindingFact) or its job' },
      learn: LEARN,
      review: { not: 'the student\'s next ply says the answer: its job when it met the threat, the error and the better move when it did not' },
      play: PLAY_ASK, chat: { not: 'chat\'s threat question reads the same must-defend computer (assembleThreatAnswer → computeMustDefend: each target, what hits and guards it, the moves that keep it); "why that move?" says how a move meets a threat through the thought\'s rescue and guard facts' }, tactics: TACTICS_NA, weaknesses: { not: 'the answer to a threat a surface just named, from that surface\'s squares: the record\'s board read has no squares to hand it, and the threat itself is posed by the reads that find it' },
      think: { not: 'answers a threat a surface just named; the answer-danger step names its own key' },
    },
  },
  structureMove: {
    // The surface says whether the better move and the move played may be
    // named (Learn holds both, David 2026-10-10; Review names them).
    read: (ctx, fact) => safe(() => studentMoveStructure(ctx).map((r) => {
      // A judgement of the move is about the board it made: "your knight on g3
      // is safe there" is graded where the knight stands (Learn's package
      // grades a claim on its fact's board).
      const f = structureFact(r, fact, boardAfter(ctx.fenBefore, ctx.san) ?? ctx.fenBefore, 'student');
      STRUCTURE_MOVE_READ.set(f, { act: r.act, ...(r.held ? { held: r.held } : {}) });
      return f;
    })),
    computer: 'studentMoveStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: { wired: 'services/learnBoardTeaching.ts' }, review: REVIEW, play: PLAY_READ, chat: { not: 'a move judgement answers "why was my move bad"; chat reads the board judgements (structureBoard)' }, tactics: TACTICS_READ, weaknesses: { wired: 'services/capabilityEvidence.ts' }, think: { not: 'judges a move by its graded cost, which a step board\'s teaching does not compute' } },
  },
  structureTheirMove: {
    read: ({ fenBefore, san, student }, fact) => safe(() => theirMoveStructure(fenBefore, san, student).map((r) => structureFact(r, fact, fenBefore, 'opponent'))),
    computer: 'theirMoveStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: STRUCT_TACTICS, weaknesses: { not: 'what their move did to your structure: no decision of the student\'s' }, think: THINK },
  },
  statusBand: {
    read: ({ fen, studentCp, prevStudentCp }, fact) => safe(() => {
      const text = statusBandChange(studentCp, prevStudentCp);
      if (!text) return null;
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'statusBandChange',
    kind: 'status',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  latentDanger: {
    // BOTH SEATS (David 2026-11-19): the pin in waiting on your king or queen
    // (a danger, first), and the same line on theirs (your chance).
    read: ({ fen, student }, fact) => safe(() => {
      const them: Color = student === 'w' ? 'b' : 'w';
      const out: CoachFact[] = [];
      for (const [side, seat, skill] of [[student, 'opponent', 'missed-their-pin'], [them, 'student', 'missed-your-pin']] as const) {
        // EVERY pin in waiting, worth first (G4.5): the door chooses what is said.
        for (const d of detectLatentDangers(fen, side, { latentOnly: true })) {
        // A spoken sentence opens with its capital: the clause is built to
        // follow other words in `moveInsight`, so the fact opens it here.
        const text = openSentence(latentDangerClause(d, fen, student));
        // A LATENT line needs the pinning piece to arrive first.
        out.push(fact({ key: text, claims: [], text, proof: NO_PROOF.description,
          squares: [d.enemySquare, d.frontSquare, d.backSquare, ...(d.shieldSquare ? [d.shieldSquare] : [])],
          stakes: { points: lineTacticPoints(d.frontPiece, d.backPiece), plies: 3 },
          seat, namesStudentMove: false, thread: LOCAL_THREAD, fen, skill }));
        }
      }
      return out.length ? out : null;
    }),
    computer: 'detectLatentDanger',
    kind: 'latent-danger',
    phase: ANY,
    surfaces: { ...LIVE_READ, weaknesses: { wired: 'services/moveInsight.ts' } },
  },
  tradeDanger: {
    read: ({ fen, student }, fact) => safe(() => {
      const out = detectTradesCreatingPin(fen, student).map((d) => {
      const text = openSentence(tradeDangerClause(d, fen));
      // Said about the board AFTER the capture ("before you trade on e4: that
      // lines your bishop on e4 up…") — graded there, or it reads false now.
      const after = ((): string | null => { try { const c = new Chess(fen); return c.move({ from: d.tradeFrom, to: d.tradeTo, promotion: 'q' }) ? c.fen() : null; } catch { return null; } })();
      // The alignment AND the capture that creates it — that whole geometry is
      // the claim; the trade walks into the line now, landing one move later.
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description,
        squares: [d.enemySquare, d.frontSquare, d.backSquare, d.tradeFrom, d.tradeTo],
        stakes: { points: lineTacticPoints(d.frontPiece, d.backPiece), plies: 2 },
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: after ?? fen, skill: 'bad-trade' });
      });
      return out.length ? out : null;
    }),
    computer: 'detectTradeCreatesPin',
    kind: 'latent-danger',
    phase: ANY,
    surfaces: { ...LIVE_READ, weaknesses: { wired: 'services/moveInsight.ts' } },
  },
  latentFork: {
    // The student's own fork first (a plan you can execute beats a plan you
    // must prevent); the seat is the forker's, and decides opportunity or danger.
    read: ({ fen, student }, fact) => safe(() => {
      const seat = student === 'w' ? 'white' as const : 'black' as const;
      const f = detectLatentFork(fen, seat) ?? detectLatentFork(fen, seat === 'white' ? 'black' : 'white');
      if (!f) return null;
      const targets = f.targets.map((t) => t.square);
      const key = forkThreatKey(f.square, targets);
      const text = latentForkClause(f, seat);
      // The route is withheld from the words: the line names no move.
      return fact({ key, claims: [key], text, proof: NO_PROOF.description, squares: [f.square, ...targets],
        stakes: { points: forkPoints(f.targets.map((t) => t.piece)), plies: 2 * f.moves },
        seat: f.forker === seat ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen,
        // Both ways: your fork to set up, or theirs to stop (`moveInsight.positionPosed`).
        skill: f.forker === seat ? 'missed-your-fork' : 'missed-their-fork' });
    }),
    computer: 'detectLatentFork',
    kind: 'latent-chance',
    phase: ANY,
    surfaces: { ...LIVE_READ, weaknesses: { wired: 'services/moveInsight.ts' } },
  },
  centralKingDanger: {
    read: ({ fen, student, namesMoves: names }, fact) => safe(() => {
      const d = detectCentralKingDanger(fen, student);
      if (!d) return null;
      const text = centralKingDangerClause(d, names);
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: [d.kingSquare, d.aimedFrom, d.tensionSquare], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, skill: 'king-stuck-center' });
    }),
    computer: 'detectCentralKingDanger',
    kind: 'latent-danger',
    phase: ANY,
    surfaces: { ...LIVE_READ, weaknesses: { wired: 'services/moveInsight.ts' } },
  },
  conversion: {
    // The key is the step and its passer (`conversionKey`): a step is said
    // once, whatever the edge it is said with.
    read: ({ fen, student }, fact) => safe(() => {
      const c = readConversion(fen, student);
      if (!c) return null;
      return fact({ key: `${c.step}|${c.passer ?? ''}`, claims: [`convert:${c.step}`], text: c.text, proof: NO_PROOF.description, squares: c.passer ? [c.passer] : [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen, skill: 'botched-conversion' });
    }),
    computer: 'readConversion',
    kind: 'convert',
    phase: ANY,
    surfaces: { ...LIVE_READ, weaknesses: { wired: 'services/moveInsight.ts' } },
  },

  opponentIntent: {
    read: ({ fen, topLines }, fact) => safe(() => {
      const oi = buildOpponentIntent({ analysis: { topLines }, fen });
      if (!oi) return null;
      const text = opponentIntentFacts(oi);
      if (!text) return null;
      // The idea the sentence actually names is plan[0] — ITS squares.
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: [...(oi.plans[0]?.squares ?? [])], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'buildOpponentIntent',
    kind: 'opponent-intent',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  criticalMoment: {
    read: ({ fen, topLines, mover, studentToMove, ply, anchor, critical }, fact) => safe(() => {
      const read = readCriticalMoment({ topLines, moverColor: mover });
      if (studentToMove) {
        const text = read ? criticalMomentStatement(read, ply, anchor) : null;
        if (!text || !read) return null;
        // The decision is now; missing it costs the gap the fan measured.
        return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: criticalMomentSquares(anchor), stakes: costStakes(read.gapCp),
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
      }
      // The count is the one computer's, never the tier's.
      const text = opponentOnlyMoveStatement(read) ?? (critical ? 'This is where the opponent has to find something — the position is sharp for them.' : null);
      if (!text) return null;
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'readCriticalMoment',
    kind: 'key-moment',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  leansOn: {
    read: ({ fen, read: l, seat }, fact) => safe(() => {
      const text = seat === 'student'
        ? `Your ${l.piece} on ${l.square} does its work because your ${l.leansOn.piece} on ${l.leansOn.square} holds it there — keep that ${l.leansOn.piece} in place.`
        : `Their ${l.piece} on ${l.square} is their best piece — but it leans on the ${l.leansOn.piece} on ${l.leansOn.square}. Take that away and it's ordinary.`;
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: [l.square, l.leansOn.square], stakes: null,
        seat, namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'computeLeansOn',
    kind: 'student-leans',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  strategicPlan: {
    // Built FROM the engine's move for the student: "The plan here: kick their
    // knight off a5 with a pawn" is that move, so it names it and carries its
    // held form — the plan, never the move, a pointer at the next decision.
    read: ({ fen, bestSan, student }, fact) => safe(() => {
      const side = student === 'w' ? 'white' as const : 'black' as const;
      const idea = strategicWhyImperative(fen, bestSan, side);
      // A plan names where it happens ("the plan here: develop into the game"
      // in a queenless ending points at nothing on the board).
      if (!idea || !/\b[a-h][1-8]\b|-file\b|castle/.test(idea)) return null;
      const text = planHere(idea, strategicReason(fen, bestSan, side));
      const held = strategicPlanPointer(fen, bestSan, side);
      const claim = strategicClaims(fen, bestSan, side)[0] ?? null;
      return fact({ key: claim ?? text, claims: claim ? [claim] : [], text, proof: NO_PROOF.description, squares: strategicSquares(fen, bestSan, side), stakes: null,
        seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen,
        ...(held ? { heldForm: { text: held, proof: NO_PROOF.method, squares: [], points: 'no-plan' as const } } : {}) });
    }),
    computer: 'strategicReason',
    kind: 'fundamental',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  structurePlan: {
    // SAID ONCE BY ITS PLAN, NOT ITS WORDS, and when the plan changes, said as
    // a change (`structurePlanEvent`). The key carries the plan's id, its idea
    // key and its aim (`structurePlanKey`).
    read: ({ fen, student, heard, said }, fact) => safe(() => {
      const p = structurePlanFact(fen, student);
      if (!p) return null;
      if ((p.ideaKey && said?.has(p.ideaKey)) || (p.aim && said?.has(p.aim))) return null;
      const event = structurePlanEvent(heard, p);
      const text = event === 'announce' ? p.text : event === 'changed' ? planChangeSentence(p.text, 'statement') : '';
      if (!text) return null;
      return fact({ key: `${p.id}|${p.ideaKey ?? ''}|${p.aim ?? ''}`, claims: [], text, proof: NO_PROOF.description, squares: [...(p.squares ?? [])], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'structurePlanFact',
    kind: 'structure-plan',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  tradeTarget: {
    read: ({ fen, student, bestLine }, fact) => safe(() => {
      const t = findTradeTarget(fen, student, bestLine);
      if (!t) return null;
      return fact({ key: t.key, claims: [t.key], text: t.text, proof: NO_PROOF.description, squares: t.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'findTradeTarget',
    kind: 'trade',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  tradeRead: {
    // The trade's move is named, so it is drawn.
    read: ({ fenBefore, san, student, costCp, priorMove, namesPlayedMove }, fact) => safe(() => {
      const t = readTrade(fenBefore, san, student, costCp, priorMove, namesPlayedMove);
      if (!t) return null;
      return fact({ key: t.key, claims: [], text: t.text, proof: NO_PROOF.description, squares: t.squares, stakes: null,
        seat: t.moverIsStudent ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore,
        lines: [{ fen: fenBefore, sans: [san] }] });
    }),
    computer: 'readTrade',
    kind: 'trade',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  refutedAlt: {
    read: ({ fenBefore, playedSan, popular, fan, student }, fact) => safe(() => {
      const r = refutedFromFan({ fenBefore, playedSan, candidates: candidatesFromAmateur(popular), fan, moverWB: student });
      if (!r) return null;
      // Its squares on the board it was an alternative ON (the student's pre-move board).
      const squares = ((): string[] => { try { const m = new Chess(fenBefore).move(r.alt); return [m.from, m.to]; } catch { return []; } })();
      return fact({ key: r.alt, claims: [], text: r.text, proof: refutedAltProof(fenBefore, r) ?? NO_PROOF.description, squares, stakes: costStakes(r.costCp),
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'refutedFromFan',
    kind: 'common-wrong',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  trapChance: {
    // The engine's best move is a pawn move that leaves a piece no safe square,
    // and its own line takes that piece — the outcome proved, not a mobility
    // count. The key is the trapping move.
    read: ({ fen, student, line, priorMove }, fact) => safe(() => {
      if (!line?.length) return null;
      const c = new Chess(fen);
      const mv = c.move({ from: line[0].slice(0, 2), to: line[0].slice(2, 4), promotion: line[0][4] });
      const hit = mv ? pawnHit(c.fen(), mv) : null;
      if (!mv || !hit?.trapped || !lineTakesPiece(fen, hit.square, line)) return null;
      const proof = moverLineProof(fen, line, student, priorMove)?.short ?? null;
      const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
      const text = `${mv.san} traps their ${NAME[hit.type] ?? 'piece'} on ${hit.square} — it has no safe square to run to${proof ? `: ${proof}` : ''}.`;
      return fact({ key: mv.san, claims: [], text, proof: NO_PROOF.description, squares: [mv.to, hit.square], stakes: { points: MATERIAL_VALUE[hit.type] ?? 3, plies: 3 },
        seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, marks: { play: { from: mv.from, to: mv.to } } });
    }),
    computer: 'pawnHit',
    kind: 'latent-chance',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  setUpChance: {
    // The full fact names the quiet move; the held form names the tactic and
    // its targets only — a pointer at the student's next decision, said by the
    // record (`HeldForm.points`, the motif's own skill).
    read: ({ fen, read: su }, fact) => safe(() => {
      const claim = `set-up:${su.motif}:${su.squares.join(',')}`;
      return fact({ key: claim, claims: [claim], text: setUpClause(su),
        proof: lineProofFromUci(fen, su.line.slice(0, 2 * Math.max(1, su.depth)), 'you') ?? NO_PROOF.description,
        // The line names the move, so its square is lit with the targets.
        squares: [...new Set([su.uci.slice(2, 4), ...su.squares])],
        stakes: su.kind === 'pin' ? { points: lineTacticPoints(su.targets[0], su.targets[1]), plies: 3 } : { points: Math.min(su.gain, 10), plies: 2 * su.depth },
        seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, marks: { play: { from: su.uci.slice(0, 2), to: su.uci.slice(2, 4) } },
        heldForm: { text: setUpHeldClause(su), proof: NO_PROOF.withheld, squares: su.squares, points: setUpSkill(su) } });
    }),
    computer: 'detectSetUpChance',
    kind: 'latent-chance',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  mustDefend: {
    // THE BOARD FACT, NOT THE OUTCOME OR THE ORDER (WO-OUTCOME-01 C): the probe
    // is a static swap count with no engine line, so it may name the attacker
    // and the missing guard — never "they win it", never "take it first".
    // ONE CLAIM, ONE KEY: said once, then once "still" (`looseClaim`).
    read: ({ fen, student, read: md, studentToMove, studentCp, looseSpells }, fact) => safe(() => {
      const p = md.pieces[0];
      if (md.net < 3 || !p) return null;
      const loose = looseClaim(p.square, plyOfFen(fen), looseSpells);
      // PROPHYLAXIS FRAMING: winning, the teaching is "don't let them punch back in".
      const winning = studentToMove && studentCp >= 200;
      // The answer the board allows, as a fact: their attacker taken for free.
      const takeable = !!(studentToMove && p.attackerSquare && takingTheAttackerAnswers(fen, p.attackerSquare as Square, student));
      const hit = `${p.attacker ? `their ${POISON_NAME[p.attacker]}${takeable ? ` on ${p.attackerSquare}` : ''}` : 'they'} ${p.attacker ? 'attacks' : 'attack'} your ${POISON_NAME[p.piece.toLowerCase()]} on ${p.square}${p.defenders === 0 ? ', and nothing defends it' : ''}${takeable ? ' — and you can take the attacker without losing material' : ''}`;
      const text = loose.still ? `Still — ${hit}.` : winning ? `You're on top, but watch the counterpunch: ${hit}.` : `${openSentence(hit)}.`;
      return fact({ key: loose.key, claims: [loose.key], text,
        // Its proof — the count and the capture, the same read Learn's warning speaks.
        proof: threatProof(fen, student, [p.square]) ?? NO_PROOF.description,
        squares: takeable && p.attackerSquare ? [p.square, p.attackerSquare] : [p.square],
        // The null-move probe's own net: taken on their next move.
        stakes: { points: md.net, plies: studentToMove ? 2 : 1 },
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'computeMustDefend',
    kind: 'must-defend',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  liveMethod: {
    // The key carries the habit (`liveMethodKey`): a habit is said once a game,
    // under its kind (`HABIT_KIND`), and its stems rotate.
    read: ({ fen, signals, ply, said }, fact) => safe(() => {
      const mb = liveMethodBeat(signals, ply, said);
      if (!mb) return null;
      return fact({ key: `${mb.habit}|${mb.key}`, claims: [mb.key], text: mb.text, proof: mb.proof ?? NO_PROOF.description, squares: mb.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'liveMethodBeat',
    kind: 'method',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  boardPlans: {
    read: ({ fen, student, withTrump }, fact) => safe(() => {
      const pf = boardPlanFacts(fen, student === 'w' ? 'white' : 'black');
      if (!pf) return null;
      const out: CoachFact[] = [];
      const say = (text: string, squares: readonly string[], claims: readonly string[] = []): void => {
        out.push(fact({ key: text, claims: [...claims], text, proof: NO_PROOF.description, squares: [...squares], stakes: null,
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      };
      if (withTrump && pf.trump) say(pf.trump, pf.trumpSquares);
      for (const p of pf.plans) say(p.text, p.squares);
      const levers = leverSentence(pf.levers);
      if (levers) say(levers, pf.levers.flatMap((l) => l.squares), pf.levers.flatMap((l) => (l.claim ? [l.claim] : [])));
      return out;
    }),
    computer: 'boardPlanFacts',
    kind: 'structure-plan',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  boardConcept: {
    // A positional lead is the fundamental's and the plan's to say; a rule
    // with no pieces named is not spoken live. The concept rides as
    // `boardConceptOf`: its source and id in the key, its short form in
    // `alsoText`, the line that reaches its board in `lines`.
    read: ({ fen, student, rating, analysis }, fact) => safe(() => {
      const lead = conceptForBoard(fen, { analysis, studentSide: student === 'w' ? 'white' : 'black', rating, max: 1 })[0];
      if (!lead || lead.source === 'positional' || lead.bare) return null;
      return fact({ key: `${lead.source}|${lead.id}|`, claims: [], text: lead.full, proof: NO_PROOF.description, squares: lead.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: lead.boardFen ?? fen, alsoText: lead.short,
        ...(lead.line ? { lines: [{ fen, sans: lead.line }] } : {}) });
    }),
    computer: 'conceptForBoard',
    kind: 'concept',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  pinPressure: {
    read: ({ fen, student }, fact) => safe(() => conceptFact(pinPressureConcept(fen, student), fact, fen)),
    computer: 'pinPressureConcept',
    kind: 'concept',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  guardRemoval: {
    read: ({ fen, student }, fact) => safe(() => conceptFact(guardRemovalConcept(fen, student), fact, fen)),
    computer: 'guardRemovalConcept',
    kind: 'concept',
    phase: ANY,
    surfaces: LIVE_READ,
  },
  deliberation: {
    // Only a REAL fork is weighed out loud. The held form is the weighing with
    // the move held back — the rule-outs and their marks, never the held move.
    // THE CHOICES on the move in the one fact set: the moves you'd weigh here
    // and why each falls short, each its own fact with its proof, read off the
    // fan before the move; and the line played out when the move is the
    // engine's own and wins material or mates (not when the deep fact already
    // says what the move sets up). Its idea rides the key (`mate|`, `win-material|`).
    read: (ctx, fact) => ('words' in ctx ? safe(() => {
      const w = ctx.words;
      const san = w.san.replace(/[!?]+$/, '');
      const db = buildDeliberation({ analysis: { topLines: [...ctx.fan] }, fenBefore: w.fenBefore, moverColor: sideToMove(w.fenBefore), excludeSan: san, prevCapture: ctx.prev, priorMove: ctx.theirLast });
      if (!db) return null;
      const m = new Chess(w.fenBefore).move(w.san);
      const fenAfter = boardAfter(w.fenBefore, w.san) ?? w.fenBefore;
      const seat = moveSeat(w);
      const out: CoachFact[] = ruleOuts(db, NOTHING_SAID).map((r) => {
        const said = closeSentence(r.text);
        const claim = r.claim ?? `choice:${m.from}${m.to}:${r.san}`;
        return fact({ key: `choice|${claim}`, claims: [claim], text: said, squares: r.squares, stakes: costStakes(r.deltaCp),
          proof: r.proof ?? squaresProof(said, r.squares) ?? NO_PROOF.description, seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: w.fenBefore, altFen: fenAfter });
      });
      if (db.best.san === san && db.bestLineAfter && db.bestLineProof && !ctx.deep) {
        const idea = /and it's mate$/.test(db.bestLineAfter) ? 'mate' : 'win-material';
        const claim = `line:${m.from}${m.to}:${(db.bestLineSans ?? []).join(',')}`;
        out.push(placedAs(fact({ key: `${idea}|${claim}`, claims: [claim], text: closeSentence(db.bestLineAfter), squares: [], stakes: null, proof: db.bestLineProof,
          seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: w.fenBefore, altFen: fenAfter }), 'line', null));
      }
      return out;
    }) : safe(() => {
      const { fen, read: d, said, saysBestLine } = ctx;
      if (!d.isRealChoice) return null;
      const text = deliberationFacts(d, said, saysBestLine);
      if (!text) return null;
      const marks = deliberationMarks(d, fen, said, fullWeighingSays(d, saysBestLine));
      const held = deliberationWeighing(d, said);
      const heldMarks = deliberationMarks(d, fen, said, HELD_WEIGHING_SAYS);
      // The choice is worth what the tempting alternative would cost.
      const worst = Math.max(0, ...d.alternatives.map((c) => c.deltaCp));
      return fact({ key: text, claims: [], text, proof: NO_PROOF.description, squares: marks.squares, stakes: costStakes(worst),
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen, lines: marks.lines,
        ...(held ? { heldForm: { text: held, proof: NO_PROOF.withheld, squares: heldMarks.squares, lines: heldMarks.lines } } : {}) });
    })),
    computer: 'buildDeliberation',
    kind: 'deliberation',
    phase: ANY,
    surfaces: { ...LIVE_READ, lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, think: { wired: 'services/moveThoughtFacts.ts' } },
  },
  structureBoard: {
    read: ({ fen, student }, fact) => safe(() => boardStructure(fen, student).map((r) => structureFact(r, fact, fen, 'student'))),
    computer: 'boardStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: { wired: 'services/groundedAnswer.ts' }, tactics: TACTICS_COMPOSER, weaknesses: { not: 'standing structural facts of the board: no move answers them; the move\'s own structure judgements are filed (structureMove, capabilityEvidence)' }, think: THINK },
  },
  structureLines: {
    read: ({ fen, student, lines, namesMoves }, fact) => safe(() => linesStructure(fen, student, lines, namesMoves).map((r) => structureFact(r, fact, fen, 'student'))),
    computer: 'linesStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { not: 'plan choices read off the engine\'s lines: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' }, think: THINK },
  },
  planThread: {
    // A plan aim is a claim the plan arc shares, and the student's plan thread.
    // Each line is said under its own kind (`PLAN_STATED_KIND`: the worst
    // piece's road is the student's wish), placed by the one group table.
    read: ({ thread, ...args }, fact) => safe(() => planThreadTurn(thread, args).map((l) => ({
      ...fact({
        key: l.claim, claims: [l.claim, ...(l.aim ? [l.aim] : [])], text: l.text, proof: l.proof, squares: l.squares, stakes: null,
        seat: l.seat, namesStudentMove: false, thread: l.aim ? threadKey('student', l.aim) : LOCAL_THREAD, fen: args.fenAfter,
        ...(l.arrows ? { marks: { route: l.arrows } } : {}),
      }),
      ...placeFact(l.kind, l.seat),
      stakes: stakesOf(l.kind, null),
    }))),
    computer: 'planThreadTurn',
    kind: 'plan-now',
    phase: ANY,
    surfaces: { lesson: { not: 'a lesson says ONE plan, the one the strongest games show where its line ends (openingGenerator.lessonPlanOutro → computedPlanAt); the per-move plan thread follows a game the student plays' }, learn: LEARN, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: { not: 'chat\'s plan question is answered by the same plan computer the thread speaks (groundedAnswer.assemblePlanMethodAnswer → planChoice.methodRead); the thread itself is one game\'s memory' }, tactics: TACTICS_NA, weaknesses: WEAK_PLAN_CHANCE, think: { not: 'a plan carried across a game\'s moves; a step board is one position' } },
  },
  tacticGeometry: {
    read: (ctx, fact) => safe(() => geometryReads(ctx).map((r) => fact({
      key: r.claim, claims: [r.claim], text: r.text, proof: r.proof, squares: r.squares, stakes: r.stakes ?? null,
      seat: 'student', namesStudentMove: r.namesMove, thread: LOCAL_THREAD, fen: ctx.fen,
      ...(r.motif ? { motif: r.motif } : {}),
      // A geometry idea is a habit of thought with no board claim of its own.
      ...(r.idea ? { heldForm: { text: r.idea, proof: NO_PROOF.method, squares: [...(r.ideaSquares ?? [])] } } : {}),
      ...(r.proof.line ? { lines: [r.proof.line] } : {}),
    }))),
    computer: 'geometryReads',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      // Learn and chat's position reads both go through the one producer.
      lesson: LESSON_BOARD,
      // Learn and chat's position reads both go through the one producer.
      learn: { wired: 'services/thinkAloud.ts' },
      review: REVIEW,
      play: PLAY_ASK,
      chat: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
      weaknesses: { wired: 'services/missedTacticService.ts' },
      think: THINK,
    },
  },
  castleByHand: {
    // His Scotch Gambit game, 2026-11-04: "the plan of castling by hand: the
    // king back up to f7, the rook swung to f8 or e8, and the king tucked back
    // to g8" · "h6 first". On a live board the route names the student's next
    // moves, so it is held there in a form that names none (`heldForm`).
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const mover = new Chess(fenBefore).turn();
      const mine = mover === student;
      const s = castleByHandMove(fenBefore, san, mine ? 'your' : 'their');
      if (!s) return null;
      const fen = boardAfter(fenBefore, san) ?? fenBefore;
      const held = mine && s.kind !== 'done'
        ? { text: s.kind === 'prep' ? 'That pawn move takes a square away from their knight, so your king can walk toward safety without a check.' : 'Your king has lost castling — walk it to safety by hand, a rook coming across behind it.', proof: NO_PROOF.method, squares: [] as string[] }
        : null;
      return fact({ key: s.key, claims: [s.key], text: s.text, proof: squaresProof(s.text, s.squares) ?? NO_PROOF.description, squares: s.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: !!held, thread: LOCAL_THREAD, fen, ...(held ? { heldForm: held } : {}),
        // Both ways: the king walk is the skill `positionPosed` files (king-stuck-center).
        ...(mine ? { skill: 'king-stuck-center' } : {}) });
    }),
    computer: 'castleByHandMove',
    kind: 'castling',
    phase: NOT_ENDING,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { wired: 'services/moveInsight.ts' }, think: THINK },
  },
  kingFromCentre: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const mine = new Chess(fenBefore).turn() === student;
      const r = kingFromCentre(fenBefore, san, mine ? 'your' : 'their');
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: NO_PROOF.method, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'kingFromCentre',
    kind: 'nugget',
    phase: NOT_ENDING,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { not: 'a rule of thumb poses no question of its own; the king walk it closes is recorded through castleByHand' }, think: THINK },
  },
  keptHome: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const mover = new Chess(fenBefore).turn();
      const mine = mover === student;
      const r = keptHome(fenBefore, san, mine ? 'your' : 'their');
      if (!r) return null;
      // The block is a move the student may play next: held on a live board
      // in a form that names no square.
      const held = mine ? { text: 'Your bishop stays home for now — it is there to block a queen check.', proof: NO_PROOF.method, squares: [] as string[] } : null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: !!held, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, ...(held ? { heldForm: held } : {}) });
    }),
    computer: 'keptHome',
    kind: 'held',
    phase: NOT_ENDING,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { not: 'a piece kept home on purpose is a choice, not a skill the board poses' }, think: THINK },
  },
  kingSquares: {
    // His 7…Kf8: "obviously not g6 or f6 — you'd get mated … the king to f8 is
    // the correct one". The square was chosen already, so nothing is held.
    read: ({ fenBefore, san, student, lines, bestUci }, fact) => safe(() => {
      const mine = new Chess(fenBefore).turn() === student;
      const r = kingSquares(fenBefore, san, mine ? 'your' : 'their', lines, bestUci);
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore,
        // Both ways: the mated square is the skill the record files
        // (`capabilityEvidence.kingSquareOutcome`).
        ...(mine ? { skill: 'missed-opponents-threat' } : {}) });
    }),
    computer: 'kingSquares',
    kind: 'contrast',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { wired: 'services/capabilityEvidence.ts' }, think: THINK },
  },
  knownSlip: {
    // THE KNOWN MISTAKES AND TRAPS (David 2026-11-04: "it needs to be in
    // review for sure"): "if they play X, that's a mistake because …", both
    // seats, from the club gem index. Called a trap only when it clears the
    // one trap bar (`isWeaponGem`). Review names moves freely — the game is
    // over; the opening pages teach the same index as their weapon section.
    read: (ctx, fact) => safe(() => knownSlipFact(knownSlip({ ...ctx, on: 'played' }), ctx.fen, fact)),
    computer: 'knownSlip',
    kind: 'common-wrong',
    phase: ANY,
    surfaces: KNOWN_SLIP_SURFACES,
  },
  trapAhead: {
    // The index's slip at the board a move reached, the game having gone
    // another way: "a known trap here: x% of club players play X, and …" —
    // a trap named before it lands, both seats.
    read: (ctx, fact) => safe(() => knownSlipFact(knownSlip({ ...ctx, on: 'reached' }), ctx.fen, fact)),
    computer: 'knownSlip',
    kind: 'trap-ahead',
    phase: ANY,
    surfaces: KNOWN_SLIP_SURFACES,
  },
  ifTheyPlay: {
    // His "if Black plays Qe7, you play d4, cementing the knight" · "if Black
    // takes on e5 you take back with the knight" · "if Black takes, e5 wins
    // the pinned knight". The replies are the ones a player at this level
    // plays (the human model), the answers the read's own line, said only
    // where the line proves them (`lineTrust`).
    read: (c, fact) => safe(() => {
      if (!c.replies || c.replies.length === 0) return null;
      const t = ifTheyPlay({ fen: c.fen, replies: c.replies, rating: c.rating, student: c.student, seconds: c.seconds, played: c.played, landed: c.madeBy ? landedSquare(c.madeBy) : null });
      if (!t || t.branches.length === 0) return null;
      const moverIsStudent = t.replier !== c.student;
      const seat: FactSeat = moverIsStudent ? 'student' : 'opponent';
      const first = lineSeatAt(c.fen, c.student);
      // An answer the student could play on the board in front of them names
      // their move (LEARN NAMES NO MOVE UNASKED).
      const playable = (b: ReplyBranch): boolean => !!c.liveBoard && moverIsStudent
        && namesPlayableStudentMove(namesMoves(c.student, c.liveBoard, namedSan(c.liveBoard, b.answer.san)));
      const stakesOfBranches = (bs: readonly ReplyBranch[]): FactStakes | null => {
        const m = bs.find((b) => b.kind === 'mate');
        if (m) return mateStakes(moverIsStudent ? 'you' : 'them', m.blowPlies + 1, true);
        const w = bs.filter((b) => b.kind === 'wins' && (b.winPawns ?? 0) > 0).sort((a, b) => (b.winPawns ?? 0) - (a.winPawns ?? 0))[0];
        return w ? { points: w.winPawns ?? 0, plies: w.blowPlies + 1 } : null;
      };
      const out: CoachFact[] = [];
      // The bait branch is said once — as the trap the student's move set
      // (`baitSet`), never again as a branch of the tree.
      const bait = baitBranch(t, c.student);
      const said = t.branches.filter((b) => b !== bait && !b.played && !playable(b) && sayable(t, b, c.student, c.tense));
      const text = treeSentence(t, said, c.student, c.tense);
      if (text && said.length) {
        const key = `reply-tree:${said.map((b) => `${b.reply.uci}>${b.answer.uci}`).join(',')}`;
        // A branch whose answer wins RULES OUT that reply — the same claim the
        // weighed moves make ("…bxa4 was tempting for them, but it fails"), so
        // it carries the same key and the say-once ledger hears it once (prod
        // Review audit 2026-11-09: "If they had taken on a4, d-pawn takes e6
        // would have won a knight", then on the next move "B-pawn takes a4 was
        // tempting for them, but it fails: …").
        const ruledOut = said.filter((b) => b.kind === 'wins' || b.kind === 'mate').map((b) => temptingKey(b.reply.uci));
        out.push(fact({
          key, claims: [key, ...said.map((b) => `reply-tree:${b.reply.uci}`), ...ruledOut], text,
          proof: legalLineProof(c.fen, said[0].uci, first) ?? NO_PROOF.description,
          squares: [...new Set(said.flatMap((b) => [b.reply.to, b.answer.to]))], stakes: stakesOfBranches(said),
          seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: c.fen,
          lines: said.map((b) => ({ fen: c.fen, sans: b.sans })),
        }));
      }
      // THE REPLY THAT CAME, ON A LIVE BOARD: the student's strong answer is
      // their next move to find — said without the move or its square.
      const came = t.branches.find((b) => b.played && b.trust.name && (b.kind === 'wins' || b.kind === 'mate') && playable(b));
      if (came) {
        const live = treeSentence(t, [{ ...came, played: false }], c.student, 'live');
        const key = `reply-tree:came:${came.reply.uci}>${came.answer.uci}`;
        // What the answer DOES, never the move or its square, pointing at the
        // motif's own skill so the record decides whether it is said
        // (`HeldForm.points`). "You have a strong answer here" said nothing
        // (prod focus audit 2026-11-07).
        const answerMotif = came.kind === 'mate' ? 'mate' : came.motif ? MOTIF_OF_TACTIC[came.motif] ?? null : null;
        const heldText = `${came.reply.capture ? 'They took' : 'After their move'}, one move of yours ${came.kind === 'mate' ? 'starts a mate' : 'wins material'} here — find it.`;
        if (live) {
          out.push(fact({
            key, claims: [key], text: live, proof: legalLineProof(c.fen, came.uci, first) ?? NO_PROOF.description,
            squares: [came.reply.to, came.answer.to], stakes: stakesOfBranches([came]),
            seat, namesStudentMove: true, thread: LOCAL_THREAD, fen: c.fen,
            heldForm: { text: heldText, proof: NO_PROOF.withheld, squares: [came.reply.to], ...(answerMotif ? { points: MOTIFS[answerMotif].yours } : {}) },
          }));
        }
      }
      return out.length ? out : null;
    }),
    computer: 'ifTheyPlay',
    kind: 'reply-tree',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: PLAY_READ,
      chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a tree of replies is said beside the move it follows; the answer, when the reply comes, is graded as the mover\'s own next move' },
      think: THINK,
    },
  },
  baitSet: {
    // THE BAIT (WO-COACH-NEXT-TO-YOU-01 C4, David 2026-11-06: "teaching you
    // how to … induce mistakes"): the student's sound move left a reply many
    // players at this level choose that loses — "This sets a trap: many
    // players at this level answer …d5, and Nxf7 wins a knight." Said once the
    // game went another way in the past tense, the answer held while the
    // student could still play it (LEARN NAMES NO MOVE UNASKED). The reply
    // that falls for it is a chance on the board — the focus's question.
    read: (c, fact) => safe(() => {
      if (!c.replies || c.replies.length === 0) return null;
      const t = ifTheyPlay({ fen: c.fen, replies: c.replies, rating: c.rating, student: c.student, seconds: c.seconds, played: c.played, landed: c.madeBy ? landedSquare(c.madeBy) : null });
      if (!t) return null;
      const b = baitBranch(t, c.student);
      if (!b || b.played) return null;
      const nameAnswer = !(c.liveBoard && namesPlayableStudentMove(namesMoves(c.student, c.liveBoard, namedSan(c.liveBoard, b.answer.san))));
      const text = baitSentence(t, b, c.student, c.tense, nameAnswer);
      if (!text) return null;
      const key = `bait:${b.reply.uci}>${b.answer.uci}`;
      return fact({
        key, claims: [key, `reply-tree:${b.reply.uci}`, ...((landedOn) => (landedOn && b.reply.capture && b.reply.to === landedOn ? [`bait-take:${landedOn}`] : []))(c.madeBy ? landedSquare(c.madeBy) : null)], text,
        proof: legalLineProof(c.fen, b.uci, lineSeatAt(c.fen, c.student)) ?? NO_PROOF.description,
        squares: nameAnswer ? [b.reply.to, b.answer.to] : [b.reply.to],
        stakes: b.kind === 'mate' ? mateStakes('you', b.blowPlies + 1, true) : { points: b.winPawns ?? 0, plies: b.blowPlies + 1 },
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: c.fen,
        ...(nameAnswer ? { lines: [{ fen: c.fen, sans: b.sans }] } : {}),
      });
    }),
    computer: 'baitBranch',
    kind: 'trap-set',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: PLAY_READ,
      chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'no record row for inducing mistakes yet — grey, taught in full; the reply that falls for it is recorded as the focus chance it leaves' },
      think: THINK,
    },
  },
  temptingRefuted: {
    // His "the natural doubling with Rg8 and Rg2 fails to Rh4" (8.6% of his
    // notes): a candidate the eye weighs, a pawn or more worse than the move
    // played, refuted by the engine's line after it — said only when that
    // line proves the cost and may be named (`costReason`, `lineTrust`). The
    // candidate was not played, so its line names no move on the real board.
    read: ({ fenBefore, san, student, rating, reads, priorMove }, fact) => safe(() => {
      if (!reads || reads.length < 2) return null;
      const r = temptingRefuted({ fenBefore, san, student, rating, reads, priorMove });
      if (!r) return null;
      const mine = new Chess(fenBefore).turn() === student;
      return fact({ key: r.key, claims: r.claims, text: r.text, proof: r.proof ?? squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares,
        stakes: costStakes(r.costCp), seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore,
        ...(r.proof?.line ? { lines: [r.proof.line] } : {}) });
    }),
    computer: 'temptingRefuted',
    kind: 'refuted',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { not: 'a move not played poses nothing to record; the move played is graded by its own cost' }, think: THINK },
  },
  temptingNow: {
    // His "Ng5+ is tempting, but after …Kg7 and …Rg3 Black parries the
    // threats" — said of the board before anyone moves: the move a player is
    // drawn to, measured against the engine's best, refuted by its own line
    // (the one reason walker, the one wording, the same claim as the move
    // ruled out after it is played). It names a move of the side to move: on
    // the student's turn that is a move still theirs to choose, so a live
    // board holds it (Learn names no move unasked); an asked read says it.
    read: ({ fen, student, rating, reads, priorMove }, fact) => safe(() => {
      if (!reads || reads.length < 2) return null;
      const r = temptingOnBoard({ fen, student, rating, reads, priorMove })[0];
      const mine = new Chess(fen).turn() === student;
      if (!r) {
        // The forcing try that wins nothing ("Nxe7+ Rxe7 gives no relief"):
        // the same rule-out claim, proven by the trades its line finishes.
        const e = standingRefutations({ fen, student, rating, reads })[0];
        if (!e) return null;
        return fact({ key: e.key, claims: e.claims, text: e.text, proof: squaresProof(e.text, e.squares) ?? NO_PROOF.description, squares: e.squares,
          stakes: costStakes(e.costCp), seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen });
      }
      return fact({ key: r.key, claims: r.claims, text: r.text, proof: r.proof ?? squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares,
        stakes: costStakes(r.costCp), seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen,
        ...(r.proof?.line ? { lines: [r.proof.line] } : {}) });
    }),
    computer: 'temptingOnBoard',
    kind: 'refuted',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: { not: 'before the move it names the student\'s own next move (held); once played, temptingRefuted says the same claim about the move played' },
      review: { not: 'Review walks moves already played: temptingRefuted says the same claim against the move played' },
      play: PLAY_ASK,
      chat: { wired: 'services/groundedAnswer.ts' },
      tactics: TACTICS_NA,
      weaknesses: { not: 'a move not played poses nothing to record' },
      think: { not: 'owed — a step board reads its own step reads (STEP_BOARD_READS), not the lesson\'s board reads after a move' },
    },
  },
  alsoGood: {
    // His "Qe7 or Qc6 — Qc6, the bishop is still great" (2.3%): two moves of
    // one worth and the board's difference between them. On a live board the
    // other move may still be the student's to play, so it is held there in
    // a form that names no move (`heldForm`).
    read: ({ fenBefore, san, student, rating, reads }, fact) => safe(() => {
      if (!reads || reads.length < 2) return null;
      const r = alsoGood({ fenBefore, san, student, rating, reads });
      if (!r) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const held = mine ? { text: r.heldText, proof: NO_PROOF.method, squares: [] as string[] } : null;
      // "Both keep the win, take your pick" is ONE idea however many moves
      // it is said of: one claim, so the say-once ledger says it once a game
      // (the Danya Review tapes said it 55 times in 20 games).
      const claims = r.difference === null ? ['also-good:both-win'] : [r.key];
      return fact({ key: r.key, claims, text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: !!held, thread: LOCAL_THREAD, fen: fenBefore, ...(held ? { heldForm: held } : {}) });
    }),
    computer: 'alsoGood',
    kind: 'contrast',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { not: 'two moves of one worth pose no question the student can miss' }, think: THINK },
  },
  squareChoice: {
    // His "Bf4 runs into Nxd4, Bg5 is kicked by h6, Bd2 hangs the knight —
    // fianchetto instead" (2.9%): the piece's other squares the eye weighs and
    // what the board shows goes wrong on each. Said about the move played; a
    // square that fails is no move to find.
    read: ({ fenBefore, san, student, rating, reads, priorMove, beaten, namesStudentMoves }, fact) => safe(() => {
      const r = squareChoice({ fenBefore, san, student, rating, reads, priorMove, beaten, namesStudentMoves });
      if (!r) return null;
      const mine = new Chess(fenBefore).turn() === student;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'squareChoice',
    kind: 'contrast',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ, weaknesses: { not: 'a square ruled out is a choice explained, not a skill the board poses' }, think: THINK },
  },
  pawnBreak: {
    // His "c5 attacking the base of the pawn chain", "open the d-file", "f4,
    // opening everything up": the break named as a break with what it is for,
    // both seats, said about the move just played — so it names no move still
    // to find.
    read: ({ fenBefore, san, student, lastTo, namesStudentMoves }, fact) => safe(() => {
      const mine = new Chess(fenBefore).turn() === student;
      const r = pawnBreak(fenBefore, san, mine ? 'your' : 'their', lastTo, namesStudentMoves);
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: r.proof ?? squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore,
        ...(r.proof?.line ? { lines: [r.proof.line] } : {}) });
    }),
    computer: 'pawnBreak',
    kind: 'pawn-break',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a break named after it is played is graded by the move\'s own cost; its timing is breakRace\'s question (mistimed-pawn-break)' },
      think: THINK,
    },
  },
  oppositeBishops: {
    // His Ruy Lopez speedrun (NFUuaZsR2S8), from move 14: his dark bishop
    // against their light one, rooks on — the bishops were his read of the
    // whole stretch. Said once, on the move that settles the shape or takes
    // the heavy pieces off, either seat.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const r = oppositeBishops(fenBefore, san, student);
      if (!r) return null;
      return fact({ key: r.key, claims: r.claims, text: r.text, proof: r.proof, squares: r.squares, stakes: null,
        seat: r.seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'oppositeBishops',
    kind: 'opposite-bishops',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board said once — no question of the student\'s posed' },
      think: THINK,
    },
  },
  planOfTheBoard: {
    // Danya's plans are a goal and a way the best line plays ("the rook lift
    // Re1-e3-b3", "b4 then b5 to dislodge the c6 knight", "build the gun on
    // the d-file"), never a state ("their rook is well placed"): the one plan
    // the board's best line starts, both seats.
    read: ({ fen, lines, student, namesMoves }, fact) => safe(() => {
      const p = planOfTheBoard({ fen, lines, student, namesMoves });
      if (!p) return null;
      const mover: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      const mine = mover === student;
      const key = `plan-of-board:${mover}:${p.kind}:${p.target ?? p.squares[0] ?? ''}`;
      const proof = legalLineProof(fen, lines[0]?.moves ?? [], lineSeatAt(fen, student)) ?? NO_PROOF.description;
      // The step that led to the plan is one claim with its own computer's
      // fact (their break the best move takes away is `breakStopped`'s).
      return fact({ key, claims: [key, ...(p.why?.claims ?? [])], text: p.text, proof, squares: p.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine && namesMoves, thread: LOCAL_THREAD, fen });
    }),
    computer: 'planOfTheBoard',
    kind: 'plan-steps',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: { not: 'the board\'s plan is read on a board whose move is shown, not played — never as advice on a game already played (Learn speaks the move just played)' },
      review: { not: 'the board\'s plan is read on a board whose move is shown, not played — never as advice on a game already played (Review walks the moves played)' },
      play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' }, // `planPosed`: live Learn, both ways (no-plan)
      think: THINK,
    },
  },
  pictureVerdict: {
    // Danya's verdict comes AFTER the tries ("hanging on the precipice, but
    // very difficult to finish him off": …Qf6 is met by Rh5, …c4 fails to
    // Nxg5): the band is the check, the failed tries are the source. Said
    // only when the tries change the word — a band alone is the standing's.
    read: (c, fact) => safe(() => {
      const r = pictureConclusionsOf(c);
      if (!r || r.verdict.kind === 'plain') return null;
      const mine = r.mover === c.student;
      const key = `picture-verdict:${r.mover}:${r.verdict.kind}:${r.but.map((t) => t.uci).join(',')}`;
      const squares = [...new Set(r.but.flatMap((t) => [t.uci.slice(0, 2), t.uci.slice(2, 4)]))];
      const poses = mine && r.verdict.kind !== 'works-now';
      return fact({ key, claims: [key], text: r.verdict.text, proof: squaresProof(r.verdict.text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen: c.fen, ...(poses ? { skill: 'overvalued-attack' } : {}) });
    }),
    computer: 'pictureVerdict',
    kind: 'verdict',
    phase: ANY,
    surfaces: PICTURE_SURFACES,
  },
  picturePlan: {
    // "So the rook lift": the plan is the try that survives the failed ones,
    // with the computed link that makes it the answer (the bishop on f7 guards
    // the h-pawn …Rxh5 took after Rxa5).
    read: (c, fact) => safe(() => {
      const p = pictureConclusionsOf(c)?.plan;
      if (!p) return null;
      const mover: Color = sideToMove(c.fen);
      const mine = mover === c.student;
      const key = `picture-plan:${mover}:${p.uci}`;
      const proof = legalLineProof(c.fen, c.reads?.find((r) => r.moves[0] === p.uci)?.moves ?? [p.uci], lineSeatAt(c.fen, c.student)) ?? NO_PROOF.description;
      return fact({ key, claims: [key], text: p.text, proof, squares: p.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen: c.fen, ...(mine ? { skill: 'overvalued-attack' } : {}) });
    }),
    computer: 'picturePlan',
    kind: 'plan-now',
    phase: ANY,
    surfaces: PICTURE_SURFACES,
  },
  planSteps: {
    // The writers' "Bd3 and Qc2, both aimed at h7, then castle" (2026-11-12):
    // the plan's next steps off the engine's quiet line, said with what ties
    // them. A line with a capture or check in it is a fight, said elsewhere.
    read: ({ fenAfter, line, student, played }, fact) => safe(() => {
      const p = planSteps(fenAfter, line, played);
      if (!p) return null;
      const mover: Color = fenAfter.split(' ')[1] === 'w' ? 'b' : 'w';
      const mine = mover === student;
      const text = planStepsText(p, mine ? 'your' : 'their');
      const key = planStepsKey(p, mover);
      const proof = legalLineProof(fenAfter, p.line, lineSeatAt(fenAfter, student)) ?? NO_PROOF.description;
      return fact({ key, claims: [key], text, proof, squares: p.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen: fenAfter,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'planSteps',
    kind: 'plan-steps',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a plan read off the engine\'s line — no question of the student\'s posed' },
      think: THINK,
    },
  },
  compensation: {
    // The writers' "a pawn down, but slightly better" (2026-11-12): said only
    // when material and the engine disagree, with the board reason for it.
    read: ({ fenAfter, student, studentCp, line }, fact) => safe(() => {
      const a = compensation(fenAfter, student, studentCp, line);
      if (!a) return null;
      const key = `compensation:${a.who}:${a.down}`;
      return fact({ key, claims: [key], text: a.text, proof: squaresProof(a.text, a.squares) ?? NO_PROOF.description, squares: a.squares, stakes: null,
        seat: a.who === 'you' ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'compensation',
    kind: 'compensation',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the position — no question of the student\'s posed' },
      think: THINK,
    },
  },
  harmlessPin: {
    // His "rate a pin in two checks" (1Rejj 7.Bb5): a pawn guards the pinned
    // piece, and the engine's line ends the pin within two of their moves.
    read: ({ fenBefore, san, student, line }, fact) => safe(() => {
      const h = harmlessPin(fenBefore, san, line);
      if (!h) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = h.pinnerColor === student;
      const text = harmlessPinLine(h, mine, fenAfter);
      const squares = [h.pinner.square, h.pinned.square, h.target.square, h.guard, h.end.square];
      return fact({ key: h.key, claims: [h.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        // The end of the pin is the pinned side's move: named when that is the student.
        seat: mine ? 'student' : 'opponent', namesStudentMove: !mine, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'harmlessPin',
    kind: 'defence-idea',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  queenNet: {
    // His "list its escapes: everything is covered except …Qe6" (hv0P 12.Nd4).
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const n = queenNet(fenBefore, san);
      if (!n) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = n.queenColor !== student;
      const text = queenNetLine(n, mine, fenAfter);
      const squares = [n.to, n.queen, ...n.taken, ...n.left];
      // One claim on the queen's squares with `queenHunt` (the same idea from
      // the hunter's side): a move says one of them.
      return fact({ key: n.key, claims: [n.key, `queen-run:${n.queen}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'queenNet',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  stalemateTrick: {
    // The losing side's half of the stalemate watch: the bait whose capture
    // stalemates its own king. Both seats: a chance to save the game, or the
    // capture the winning side must leave alone.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mover: Color = new Chess(fenBefore).turn();
      // TWO MOVES DEEP (Saavedra review 2026-11-18): a move that sets the
      // trick for the other side's natural move. The underpromotion that
      // dodges it is the promotion choice's (`promotionChoice`), with the
      // queen's other failures — one producer for which piece to make.
      if (/=[RBN]/.test(san)) return null;
      const movedTo = ((): string | null => { try { return new Chess(fenBefore).move(san).to; } catch { return null; } })();
      const deep = stalemateTraps(fenAfter).find((tr) => tr.checkFrom === movedTo) ?? null;
      if (deep) {
        const text = stalemateTrapLine(deep, student);
        const squares = [...new Set(deep.squares.filter(Boolean))];
        const key = `stalemate-trap:${deep.natural}:${deep.check}:${fenAfter.split(' ')[0]}`;
        return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
          seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
      }
      const t = stalemateTrick(fenBefore, san);
      if (!t) return null;
      const mine = t.side === student;
      const text = stalemateTrickLine(t, mine, fenAfter);
      return fact({ key: t.key, claims: [t.key], text, proof: squaresProof(text, t.squares) ?? NO_PROOF.description, squares: t.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'stalemateTrick',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  bothSaved: {
    // His "rook and knight both hang: find a knight move that also defends
    // the rook" (FozbG 27.Ne7). The sibling of the desperado.
    read: ({ fenBefore, san, student, replies }, fact) => safe(() => {
      const b = bothSaved(fenBefore, san, replies);
      if (!b) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = new Chess(fenBefore).turn() === student;
      const text = bothSavedLine(b, mine ? 'your' : 'their', fenAfter);
      const squares = [b.moved.from, b.moved.to, b.other.square];
      return fact({ key: b.key, claims: [b.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'bothSaved',
    kind: 'defence-idea',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  perpetualCheck: {
    // His "list the checking squares and check whether the king can run"
    // (8QxDmN): checks that come back to the same board, the king with no way
    // out, both seats. The move that starts it, or the one that allows it.
    read: ({ fenBefore, san, student, replies }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san);
      if (!fenAfter) return null;
      const mover = new Chess(fenBefore).turn();
      const started = perpetualStartedBy(fenBefore, san);
      const p = started ?? perpetualCheck(fenAfter);
      if (!p || winningAnyway(replies, p.side)) return null;
      const mine = p.side === student;
      const text = perpetualLine(p, mine, !!started, fenAfter);
      const from = started ? fenBefore : fenAfter;
      const proof = legalLineProof(from, p.line, lineSeatAt(from, student), true) ?? NO_PROOF.description;
      const squares = [...p.from.map((f) => f.square), p.king];
      // One claim with the windmill (the same checks, read for what they win):
      // a move says one of them.
      return fact({ key: p.key, claims: [p.key, `repeating-checks:${p.side}`], text, proof, squares, stakes: null,
        // The checks are the side to move's next moves when it did not start them.
        seat: mine ? 'student' : 'opponent', namesStudentMove: !started && mine && p.side !== mover, thread: LOCAL_THREAD, fen: fenAfter,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'perpetualCheck',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  windmill: {
    // His "windmills are often overrated" (-Y5bZ): the piece that checks,
    // steps out with a discovered check and takes, and comes back — both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san);
      if (!fenAfter) return null;
      const mover = new Chess(fenBefore).turn();
      const started = windmillStartedBy(fenBefore, san);
      const w = started ?? windmill(fenAfter);
      if (!w) return null;
      const mine = w.side === student;
      const text = windmillLine(w, mine, !!started, fenAfter);
      const from = started ? fenBefore : fenAfter;
      const proof = legalLineProof(from, w.line, lineSeatAt(from, student), true) ?? NO_PROOF.description;
      const squares = [w.sail.square, w.axle.square, ...w.takes.map((t) => t.square)];
      return fact({ key: w.key, claims: [w.key, `repeating-checks:${w.side}`], text, proof, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: !started && mine && w.side !== mover, thread: LOCAL_THREAD, fen: fenAfter,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'windmill',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  minorMatchup: {
    // The minors' matchup (David 2026-11-17): "you trade into a good knight
    // against their bad bishop", both seats, on the move that makes it.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const m = minorMatchup(fenBefore, san, student);
      if (!m) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      return fact({ key: m.key, claims: [m.key], text: m.text, proof: squaresProof(m.text, m.squares) ?? NO_PROOF.description, squares: m.squares, stakes: null,
        seat: m.winner === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'minorMatchup',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board said once — no question of the student\'s posed' },
    },
  },
  kingSiege: {
    // His "four pieces in the attack and only the knight to defend; the
    // rook on a8 cannot get over in time" — both kings, the move that makes it.
    read: ({ fenBefore, san, student, replies }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san);
      if (!fenAfter) return null;
      const top = replies[0];
      const whiteCp = !top || (top.cp === null && top.mate === null) ? null : seatCp({ evaluation: top.cp ?? 0, mate: top.mate }, 'w');
      const out: CoachFact[] = [];
      for (const defender of ['w', 'b'] as const) {
        const atkCp = whiteCp === null ? null : defender === 'b' ? whiteCp : -whiteCp;
        const now = kingSiege(fenAfter, defender);
        if (!now || !siegeSpeaks(fenAfter, now, atkCp)) continue;
        const was = kingSiege(fenBefore, defender);
        if (was && siegeSpeaks(fenBefore, was, atkCp)) continue;
        const text = siegeLine(now, student, fenAfter);
        const squares = siegeSquares(now);
        const attacker = defender === 'w' ? 'b' : 'w';
        out.push(fact({ key: now.key, claims: [now.key, `king-attack:${now.king}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
          seat: attacker === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter }));
      }
      return out.length ? out : null;
    }),
    computer: 'kingSiege',
    kind: 'king-read',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board said once — no question of the student\'s posed' },
    },
  },
  backRankWeakness: {
    // His "the back rank is weak: no luft, and only the rook holds it".
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san);
      if (!fenAfter) return null;
      const out: CoachFact[] = [];
      for (const defender of ['w', 'b'] as const) {
        const now = backRankWeakness(fenAfter, defender);
        if (!now || backRankWeakness(fenBefore, defender)) continue;
        const text = backRankLine(now, student, fenAfter);
        const squares = backRankSquares(now);
        const attackerIsStudent = defender !== student;
        out.push(fact({ key: now.key, claims: [now.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
          seat: attackerIsStudent ? 'student' : 'opponent', namesStudentMove: attackerIsStudent, thread: LOCAL_THREAD, fen: fenAfter }));
      }
      return out.length ? out : null;
    }),
    computer: 'backRankWeakness',
    kind: 'king-read',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board said once — no question of the student\'s posed' },
    },
  },
  loadedDiscovery: {
    // His "the knight is all that blocks the bishop: every knight move is
    // check, so it takes what it likes".
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san);
      if (!fenAfter) return null;
      const out: CoachFact[] = [];
      for (const side of ['w', 'b'] as const) {
        const now = loadedDiscovery(fenAfter, side);
        if (!now || !discoverySpeaks(now)) continue;
        const was = loadedDiscovery(fenBefore, side);
        if (was && discoverySpeaks(was) && was.key === now.key) continue;
        const text = discoveryLine(now, student, fenAfter);
        const squares = discoverySquares(now);
        out.push(fact({ key: now.key, claims: [now.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
          seat: side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter }));
      }
      return out.length ? out : null;
    }),
    computer: 'loadedDiscovery',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  kingSacrifice: {
    // His "Bxh7+ gives up the bishop, but after Kxh7 Ng5+ the king is out in
    // the open" — what the sacrifice opens and the follow-up that proves it.
    read: ({ fenBefore, san, student, replies, seconds }, fact) => safe(() => {
      const top = replies[0];
      if (!top) return null;
      const mover = sideToMove(fenBefore);
      const moverCp = top.cp === null ? null : mover === 'w' ? top.cp : -top.cp;
      const moverMate = top.mate === null ? null : mover === 'w' ? top.mate : -top.mate;
      const k = kingSacrifice(fenBefore, san, top.moves, moverCp, moverMate);
      if (!k || !sacLineNamed(fenBefore, k.line, seconds, k.mover)) return null;
      const text = kingSacrificeLine(k, student);
      const proof = legalLineProof(fenBefore, k.line, lineSeatAt(fenBefore, student), k.outcome === 'mate') ?? NO_PROOF.description;
      const squares = kingSacrificeSquares(k);
      return fact({ key: k.key, claims: [k.key], text, proof, squares, stakes: null,
        seat: k.mover === student ? 'student' : 'opponent', namesStudentMove: k.mover === student, thread: LOCAL_THREAD, fen: fenBefore,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'kingSacrifice',
    kind: 'sac-why',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  deepCombination: {
    // His "Nxe5! looks like it drops the queen, but after …Bxd1 Bxf7+ Ke7 Nd5
    // is mate" — what is given, the forced follow-up, and what it wins.
    read: ({ fenBefore, san, student, replies, seconds }, fact) => safe(() => {
      const top = replies[0];
      if (!top) return null;
      const mover = sideToMove(fenBefore);
      const moverCp = top.cp === null ? null : mover === 'w' ? top.cp : -top.cp;
      const moverMate = top.mate === null ? null : mover === 'w' ? top.mate : -top.mate;
      const d = deepCombination(fenBefore, san, top.moves, moverCp, moverMate);
      if (!d || !sacLineNamed(fenBefore, d.line, seconds, d.mover)) return null;
      const text = deepCombinationLine(d, student, fenBefore);
      const proof = legalLineProof(fenBefore, d.line, lineSeatAt(fenBefore, student), d.outcome === 'mate') ?? NO_PROOF.description;
      const mine = d.mover === student;
      const stakes = d.outcome === 'mate' ? mateStakes(mine ? 'you' : 'them', d.line.length, true) : d.outcome === 'ahead' ? { points: d.net, plies: d.line.length } : null;
      return fact({ key: d.key, claims: [d.key], text, proof, squares: deepCombinationSquares(d), stakes,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen: fenBefore,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'deepCombination',
    kind: 'sac-why',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  intoTheirCamp: {
    // His "you infiltrate with the rook to d7", "you reach the seventh",
    // "you lift the rook to f3", "the queen to d2, connecting the rooks".
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const x = intoTheirCamp(fenBefore, san);
      if (!x) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = new Chess(fenBefore).turn() === student;
      const text = intoTheirCampLine(x, mine ? 'your' : 'their', fenAfter);
      // One claim with the structure read's doubled seventh, so a turn says it once.
      // Each piece it hits is the move's pressure on that square — the same
      // claim the board teacher and the chain base make ("your rook hits their
      // pawn on c2"), so a turn says the hit once.
      const hits = x.targets.map((t) => moveIdeaClaim(fenBefore, san, 'pressure', [t.square])).filter((c): c is string => !!c);
      const claims = x.kind === 'seventh-doubled' ? [x.key] : [x.key, `camp:${x.kind}:${x.moved.to}`, ...hits];
      return fact({ key: x.key, claims, text, proof: squaresProof(text, x.squares) ?? NO_PROOF.description, squares: x.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'intoTheirCamp',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  breakPrep: {
    // His "first the queen must come to c1, then b4-b5": the move that gets
    // the break ready, said with what it changed.
    read: ({ fenBefore, san, student, lineAfter, costCp }, fact) => safe(() => {
      if (costCp === null || costCp > PRESSURE_COST_CP) return null;
      const x = breakPrep(fenBefore, san, lineAfter);
      if (!x) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = breakPrepLine(x, fenBefore, mine ? 'your' : 'their');
      return fact({ key: x.key, claims: [x.key], text, proof: squaresProof(text, x.squares) ?? NO_PROOF.description, squares: x.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'breakPrep',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  breakStopped: {
    // His "a4, stopping …b5 once and for all": prophylaxis against a break.
    read: ({ fenBefore, san, student, costCp }, fact) => safe(() => {
      if (costCp === null || costCp > PRESSURE_COST_CP) return null;
      const x = breakStopped(fenBefore, san);
      if (!x) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = breakStoppedLine(x, fenBefore, mine ? 'your' : 'their');
      // One claim with the opening story's stop of the masters' break
      // (`moveStops.stopsBreak`, claim `stops-break:<san>`): a turn says it once.
      const dot = `${new Chess(fenBefore).turn() === 'w' ? '…' : ''}${x.brk.san}`;
      return fact({ key: x.key, claims: [x.key, `stops-break:${dot}`], text, proof: squaresProof(text, x.squares) ?? NO_PROOF.description, squares: x.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'breakStopped',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  targetPressure: {
    // His "doubling rooks is always a good way to begin", "there is no better
    // time to bring out the Gun!" — the pressure on a pawn no pawn can guard.
    read: ({ fenBefore, san, student, lineAfter, costCp }, fact) => safe(() => {
      if (costCp === null || costCp > PRESSURE_COST_CP) return null;
      const x = pressureOf(fenBefore, san, lineAfter);
      if (!x) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = pressureLine(x, fenBefore, mine ? 'your' : 'their');
      const hit = moveIdeaClaim(fenBefore, san, 'pressure', [x.target]);
      return fact({ key: x.key, claims: [x.key, ...(hit ? [hit] : [])], text, proof: squaresProof(text, x.squares) ?? NO_PROOF.description, squares: x.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'pressureOf',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  flexibleMove: {
    // The option principle (Adams 1939, Berliner 1999): of moves as good as
    // each other, the one that keeps the most important moves open — his
    // "Bishop to c4 this early commits the bishop", "play d3 before castling,
    // it keeps the castling decision open". Both seats.
    read: ({ fenBefore, san, student, reads }, fact) => safe(() => {
      const f = flexibleMove(fenBefore, san, reads);
      if (!f) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = new Chess(fenBefore).turn() === student;
      const text = flexibleMoveLine(f, mine ? 'your' : 'their', fenAfter);
      if (!text) return null;
      const squares = flexibleMoveSquares(f);
      return fact({ key: f.key, claims: [f.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'flexibleMove',
    kind: 'move-order',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  exchangeSacrifice: {
    // His "give up the rook, because in return you get a monster" and "take
    // with the rook, sacrificing the exchange to keep the light bishop as the
    // main attacker": the exchange given on purpose and what it buys, both seats.
    read: ({ fenBefore, san, student, reads }, fact) => safe(() => {
      const x = exchangeSacrifice(fenBefore, san, reads);
      if (!x) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = x.side === student;
      const text = exchangeSacrificeLine(x, mine, fenAfter);
      const squares = exchangeSacrificeSquares(x);
      // The trade played out is the proof: the move, their capture, the take-back.
      const proof = legalLineProof(fenBefore, x.line, lineSeatAt(fenBefore, student), true) ?? squaresProof(text, squares) ?? NO_PROOF.description;
      // One claim with the exchange for the key attacker (`exchangeIdeas`):
      // the same rook given on the same square is one idea.
      return fact({ key: x.key, claims: [x.key, `exchange-for-attacker:${x.square}`], text, proof, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'exchangeSacrifice',
    kind: 'sac-why',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  pawnMajority: {
    // His "White gets a queenside pawn majority, you get a kingside majority"
    // and "kingside pawn majority you could push with g4": the wing majority
    // a move makes, cripples, gives up or sets moving, both seats.
    read: ({ fenBefore, san, student, prior }, fact) => safe(() => {
      const x = pawnMajority(fenBefore, san, prior);
      if (!x) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const text = pawnMajorityLine(x, student, fenAfter);
      const squares = pawnMajoritySquares(x);
      // A split is one trade: its two majorities are one claim.
      const claims = x.split ? [x.key, `pawn-majority:created:${x.split.side}:${x.split.wing}`] : [x.key];
      return fact({ key: x.key, claims, text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: x.majority.side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'pawnMajority',
    kind: 'structure',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  fortress: {
    // His "a fortress plus an active king can draw even down material when
    // there's no way in": the draw a piece down, and the board's reason,
    // both seats.
    read: ({ fenBefore, san, student, replies }, fact) => safe(() => {
      const f = fortress(fenBefore, san, replies);
      if (!f) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = f.defender === student;
      const text = fortressLine(f, mine, fenAfter);
      const squares = fortressSquares(f);
      return fact({ key: f.key, claims: [f.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'fortress',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board said once — no question of the student\'s posed' },
    },
  },
  pieceItinerary: {
    // The piece's journey in the game, both seats: the move that completes a
    // minor piece's reroute to an advanced square.
    read: ({ fenBefore, san, student, history }, fact) => safe(() => {
      const r = itineraryAt(fenBefore, history, san);
      if (!r) return null;
      const mine = r.mover === student;
      const text = itineraryLine(r.itin, mine);
      const squares = r.itin.route.slice(-3);
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      return fact({ key: `itinerary:${r.itin.route.join('-')}`, claims: [`itinerary:${squares[squares.length - 1]}`], text,
        proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'itineraryAt',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'a reading of the game behind the move — no question of the student\'s posed' },
    },
  },
  forcedRun: {
    // The finish that is forced, both seats: the move that begins a checking
    // run to mate.
    read: ({ fenBefore, san, student, history, line, evalsAfter }, fact) => safe(() => {
      const r = forcedRunAt(history, san, line, evalsAfter);
      if (!r) return null;
      const mine = r.mater === student;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      // The run's proof is the run itself: the move and the line that mates,
      // every move legal on the board.
      const proof = line ? legalLineProof(fenBefore, [san, ...line], lineSeatAt(fenBefore, student)) : null;
      if (!proof) return null;
      return fact({ key: `forced-run:${r.startPly}:${r.length}`, claims: ['forced-run'], text: FORCED_RUN_LINE,
        proof, squares: [], stakes: mateStakes(mine ? 'you' : 'them', 2, true),
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'detectForcedMatingSequence',
    kind: 'forced',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'a reading of the line ahead — no question of the student\'s posed' },
    },
  },
  threatPurpose: {
    // What a threat is really for, both seats: the decisive line's first
    // move looks aimed at one piece, and the line wins something else.
    read: ({ line, student }, fact) => safe(() => {
      if (!line || line.plies.length < 3) return null;
      const text = threatPurpose(line, student);
      if (!text) return null;
      const first = line.plies[0];
      const mine = (first.moverColor === 'white' ? 'w' : 'b') === student;
      const squares = [first.uci.slice(0, 2), first.uci.slice(2, 4)];
      const proof = lineProofFromUci(first.fenBefore, line.plies.map((p) => p.uci), lineSeatAt(first.fenBefore, student));
      if (!proof) return null;
      return fact({ key: `purpose:${line.plies.map((p) => p.uci).join(' ')}`, claims: [`purpose:${first.uci}`], text,
        proof, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: first.fenBefore });
    }),
    computer: 'threatPurpose',
    kind: 'threat',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of a line — no question of the student\'s posed' },
    },
  },
  temptingCapture: {
    // The capture the mover leaves alone, and why it fails, both seats (or
    // no seat, side names from the board).
    read: ({ fenBefore, san, student, line }, fact) => safe(() => {
      const mover: Color = new Chess(fenBefore).turn();
      const r = temptingCaptureRead(fenBefore, san, student === null ? 'neutral' : mover === student ? 'you' : 'they', line);
      if (!r) return null;
      const squares = [r.key.slice(0, 2), r.key.slice(2, 4)];
      return fact({ key: r.key, claims: [`tempting-capture:${r.key}`], text: r.text,
        proof: squaresProof(r.text, squares) ?? NO_PROOF.stated, squares, stakes: null,
        seat: student === null || mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'explainTemptingCapture',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/projectedLineVoice.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a capture left alone — no question of the student\'s posed' },
    },
  },
  count: {
    read: ({ fen, student }, fact) => safe(() => {
      const reads = attackerDefenderCount(fen, student);
      if (reads.length === 0) return null;
      // The habit said once, each piece its own sentence on a rotated stem.
      const text = countSaid(reads, fen);
      // A count that says the piece has to move is the tempo the move that
      // attacked it gained: one claim (`ideaClaim('tempo')`), said once
      // (composerSaysOnce, g4 against the bishop on f5).
      return fact({ key: `count:${text}`, claims: [`count:${fen.split(' ')[0]}`, ...reads.filter((r) => r.tempo).map((r) => ideaClaim('tempo', [r.square]))], text, proof: NO_PROOF.description,
        // Every piece the count names is lit (a named square is a marked one).
        squares: reads.map((r) => r.square), stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'attackerDefenderCount',
    kind: 'count',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a count on the board, no question of the student\'s posed' },
    },
  },
  royal: {
    read: ({ fen, student }, fact) => safe(() => {
      const text = (() => { const t = royalDefenderTarget(fen, student); return t ? `${openSentence(t)}.` : null; })();
      if (!text) return null;
      return fact({ key: `royal:${text}`, claims: [`royal:${fen.split(' ')[0]}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'royalDefenderTarget',
    kind: 'royal',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board, no question of the student\'s posed' },
    },
  },
  rook7: {
    read: ({ fen, student }, fact) => safe(() => {
      const text = (() => { const t = rookOnSeventh(fen, student); return t ? `${openSentence(t)}.` : null; })();
      if (!text) return null;
      return fact({ key: `rook7:${text}`, claims: [`rook7:${fen.split(' ')[0]}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'rookOnSeventh',
    kind: 'rook7',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost — the record needs the played move to say whether it was taken' },
    },
  },
  badBishop: {
    read: ({ fen, student }, fact) => safe(() => {
      const text = (() => { const t = badEnemyBishop(fen, student); if (!t) return null; const image = imageryFor('badbishop', stemKeyOf(`${fen}|badbishop`)); return `${openSentence(t)}.${image ? ` ${image}` : ''}`; })();
      if (!text) return null;
      return fact({ key: `badBishop:${text}`, claims: [`badBishop:${fen.split(' ')[0]}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'badEnemyBishop',
    kind: 'badbishop',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board, no question of the student\'s posed' },
    },
  },
  // ── THE REVIEW WALK'S READS (basket, walk) — each the one writer of its words.
  whyItEnded: {
    read: ({ plies, student }, fact) => safe(() => endReadFact(whyItEnded(plies, student), plies, fact)),
    computer: 'whyItEnded',
    kind: 'game-end',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_WHOLE_GAME },
  },
  idlePiece: {
    read: ({ plies, student }, fact) => safe(() => endReadFact(idlePiece(plies, student), plies, fact)),
    computer: 'idlePiece',
    kind: 'game-end',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_WHOLE_GAME },
  },
  quietDecider: {
    read: ({ plies, student }, fact) => safe(() => endReadFact(quietDecider(plies, student), plies, fact)),
    computer: 'quietDecider',
    kind: 'game-end',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_WHOLE_GAME },
  },
  exploreInvite: {
    read: ({ plies, index, student }, fact) => safe(() => endReadFact(exploreInvite(plies, index, student), plies, fact)),
    computer: 'exploreInvite',
    kind: 'game-end',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_WHOLE_GAME },
  },
  murkyRead: {
    read: ({ plies, index, student }, fact) => safe(() => endReadFact(plies[index] ? murkyRead(plies[index], index, student) : null, plies, fact)),
    computer: 'murkyRead',
    kind: 'murky',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_WHOLE_GAME },
  },
  pawnEndingCount: {
    read: ({ fenBefore, san, replySan, cpLoss, evalAfterCp }, fact) => safe(() => {
      const t = pawnEndingTrade(fenBefore, san, replySan, cpLoss, evalAfterCp);
      if (!t) return null;
      return fact({ key: `pawn-ending:${t.verdict}:${fenBefore.split(' ')[0]}`, claims: [`pawn-ending:${fenBefore.split(' ')[0]}`], text: t.text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'pawnEndingTrade',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_PLAYED_JUDGED },
  },
  passerDecoy: {
    // The passer's file leads the key (once a game per file).
    read: ({ fen, student }, fact) => safe(() => {
      const d = outsidePasserDecoy(fen, student);
      if (!d) return null;
      return fact({ key: `${d.passer[0]}:${d.passer}`, claims: [`decoy:${d.passer}`], text: d.text, proof: squaresProof(d.text, d.squares) ?? NO_PROOF.description, squares: d.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'outsidePasserDecoy',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost — the record needs the played move to say whether it was taken' } },
  },
  zugzwangAt: {
    // The tablebase read is fetched by the surface (it is a request); its
    // words and proof are written here, from the student's seat.
    read: ({ fen, read, studentToMove }, fact) => safe(() => {
      const zKey = `zugzwang:${fen.split(' ').slice(0, 2).join(' ')}`;
      return fact({ key: zKey, claims: [zKey], text: zugzwangSentence(read, studentToMove), proof: zugzwangProof(read, studentToMove), squares: [], stakes: null,
        seat: studentToMove ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'readZugzwang',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: { not: 'the tablebase read is a request a surface makes; the record\'s board read makes none' } },
  },
  mateLineAt: {
    read: ({ fenBefore, lineUci, student, san }, fact) => safe(() => {
      const ml = mateLine(fenBefore, lineUci, student, san);
      if (!ml) return null;
      const sans = ml.sans.map((x) => x.replace(/^…/, ''));
      const proof = lineProof({ fen: fenBefore, sans }, lineSeatAt(fenBefore, student));
      if (!proof) return null;
      // The mate the board offered the student: the record files it held or
      // missed under the mate row (both ways).
      return fact({ key: `mate-line:${fenBefore.split(' ')[0]}:${sans.join(',')}`, claims: [`mate-line:${sans.join(',')}`], text: ml.text, proof, squares: ml.taken, stakes: mateStakes('you', 0, true),
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, lines: [{ fen: fenBefore, sans }], skill: 'missed-your-mate' });
    }),
    computer: 'mateLine',
    kind: 'tactic',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: { wired: 'services/moveInsight.ts' } },
  },
  lineWinsAt: {
    read: ({ fenBefore, lineUci, student, san, prior, seconds }, fact) => safe(() => {
      const won = lineWins(fenBefore, lineUci, student, san, prior, seconds);
      if (!won) return null;
      const text = `That wins ${won.what}: ${lineShape(won.sans, lineSeatAt(fenBefore, student), fenBefore, 'first')}.`;
      const sans = won.sans.map((x) => x.replace(/^…/, ''));
      const proof = lineProof({ fen: fenBefore, sans }, lineSeatAt(fenBefore, student));
      if (!proof) return null;
      return fact({ key: `line-wins:${fenBefore.split(' ')[0]}:${sans.join(',')}`, claims: [`line-wins:${sans.join(',')}`], text, proof, squares: [], stakes: { points: won.net, plies: 0 },
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, lines: [{ fen: fenBefore, sans }] });
    }),
    computer: 'lineWins',
    kind: 'tactic',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: { not: 'the line a move played starts, said after it: the board\'s winning shot is posed under the shot\'s own name (capabilityOutcomes, namedShotTags)' } },
  },
  attackAsks: {
    // Their attack on `target`: what it asks of the student this move.
    read: ({ fenAfter, target, mover }, fact) => safe(() => {
      const ask = whatItAsks(fenAfter, target, mover, THEIRS);
      if (!ask) return null;
      return fact({ key: `asks:${target}`, claims: [`asks:${target}`], text: `${ask}.`, proof: NO_PROOF.description, squares: [target], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'whatItAsks',
    kind: 'move-job',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  theirOpeningChoice: {
    read: ({ history, student, cpLoss, coachChose, fen }, fact) => safe(() => {
      const text = theirOpeningVerdict(history, student, cpLoss, coachChose);
      if (!text) return null;
      return fact({ key: `their-opening:${history.length}`, claims: [`their-opening:${history.length}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'theirOpeningVerdict',
    kind: 'opening',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_OPENING_TOLD },
  },
  openingNamed: {
    read: ({ det, history, spokenName, student, transposed, fen }, fact) => safe(() => {
      const text = openingAnnouncementForGame(det, history, spokenName, student, transposed);
      if (!text) return null;
      return fact({ key: `opening-name:${det?.name ?? ''}`, claims: [`opening-name:${det?.name ?? ''}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'openingAnnouncementForGame',
    kind: 'opening',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_OPENING_TOLD },
  },
  sacPayoff: {
    // The student's sacrifice: what they get for it. A clause about a king
    // stuck in the centre is left out once that has been taught, and the key
    // says whether this one teaches it (`sacPayoffTeachesKing`).
    read: ({ fenAfter, mover, student, moverPovEvalCp, moverPovBeforeCp, kingCentreTaught }, fact) => safe(() => {
      const stuck = (c: string): boolean => /stuck in the cent/i.test(c);
      const mine = mover === student;
      const comp = sacrificeCompensation(fenAfter, mover, moverPovEvalCp, mine, moverPovBeforeCp).filter((c) => !(kingCentreTaught && stuck(c)));
      if (comp.length === 0) return null;
      const text = `Look what ${mine ? 'you get' : 'they get'} for it: ${oxfordJoin(comp)}.`;
      return fact({ key: `${comp.some(stuck) ? 'k' : '-'}:${fenAfter.split(' ')[0]}`, claims: [`sac-payoff:${fenAfter.split(' ')[0]}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'sacrificeCompensation',
    kind: 'sac-why',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_SAC_TOLD },
  },
  sacShield: {
    read: ({ fenBefore, san }, fact) => safe(() => {
      const clause = describeSacBreaksKingShield(fenBefore, san);
      if (!clause) return null;
      const withCheck = /\+$/.test(san) ? ', and it lands with check' : '';
      return fact({ key: `sac-shield:${fenBefore.split(' ')[0]}:${san}`, claims: [`sac-shield:${san}`], text: `${clause}${withCheck}.`, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'describeSacBreaksKingShield',
    kind: 'sac',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_SAC_TOLD },
  },
  takeStock: {
    // A genuine edge with at least two board-true reasons — never a verdict
    // on a level board (empty > generic).
    read: ({ fenBefore, san, fen, student, studentPovCp }, fact) => safe(() => {
      const a = assessPositionalEdge(fen, student, studentPovCp, lastMoveFromSan(fenBefore, san));
      if (a.reasons.length < 2 || !a.verdict || a.verdict === 'balanced') return null;
      const text = `Step back and take stock — you're ${a.verdict} here, and it's worth knowing exactly why: ${oxfordJoin(a.reasons)}.`;
      return fact({ key: `take-stock:${a.verdict}:${a.reasonKeys.join(',')}`, claims: ['take-stock'], text, proof: NO_PROOF.description, squares: a.reasonSquares.flat(), stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'assessPositionalEdge',
    kind: 'verdict',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_BOARD_VERDICT },
  },
  kingHuntCue: {
    // Their king in the centre, read as the cue to attack it now.
    read: ({ fen, student }, fact) => safe(() => {
      if (!enemyKingStuckInCenter(fen, student)) return null;
      const text = 'Look at their king — still in the centre, no castling in sight, and the files are opening around it. That is your cue: this is the moment to throw your pieces at it, before they ever wriggle to safety.';
      return fact({ key: `king-hunt:${fen.split(' ')[0]}`, claims: ['king-centre'], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'enemyKingStuckInCenter',
    kind: 'king',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: { not: 'their king left in the centre: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' } },
  },
  opponentTarget: {
    read: ({ fenBefore, san, student }, fact) => safe(() => planBeatFact(buildOpponentMoveTeaching(fenBefore, san, student), fenBefore, 'opponent', fact)),
    computer: 'buildOpponentMoveTeaching',
    kind: 'opp-target',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  causalChain: {
    // The chain PLAYED on this move, else (on the student's move) the one
    // their move ALLOWED, else the win they MISSED. Its stance, its arrows and
    // its story key ride the key (`causalChainRead`).
    read: ({ sans, ply, student, rating, fen }, fact) => safe(() => {
      const studentMove = new Chess(fenOfGame(sans.slice(0, ply - 1))).turn() === student;
      const chain = buildCausalChain({ historySans: sans.slice(0, ply) })
        ?? (studentMove ? findAllowedChain(sans, ply, student) : null)
        ?? (studentMove ? findMissedChain(sans, ply, student) : null);
      if (!chain) return null;
      const lines = renderCausalChain(chain, { register: 'review', studentColor: student, rating });
      if (lines.length === 0) return null;
      const arrows = chain.stance === 'played' || chain.stance === 'allowed' ? causalChainArrows(chain).map((a) => `${a.from}${a.to}`).join(',') : '';
      const chainKey = causalChainKey(chain);
      return fact({ key: `${chain.stance}~${arrows}~${chainKey}`, claims: [chainKey], text: lines.join(' '), proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'buildCausalChain',
    kind: 'consequence',
    phase: ANY,
    surfaces: { ...walkSurfaces(), weaknesses: WEAK_MOVE_DESCRIBED },
  },
  endgamePhase: {
    read: ({ fen }, fact) => safe(() => {
      const text = (() => { const p = nameEndgamePhase(fen); return p ? `You've reached ${p}.` : null; })();
      if (!text) return null;
      return fact({ key: `endgamePhase:${text}`, claims: [`endgamePhase:${fen.split(' ')[0]}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'nameEndgamePhase',
    kind: 'endgame',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'the ending named, no question of the student\'s posed' },
    },
  },
  // ── LEARN'S READS OF THE STUDENT'S MOVE (`studentMoveTeaching`, the bundle
  // Review's rule kinds and the lessons' named lanes read too). Each key
  // carries what the page keeps of the read (its analytics event, its arrow)
  // after `|`, read back by `learnReadKey`.
  recapture: {
    // WHICH PIECE TAKES BACK, AND WHY — on a recapture the grader does not call
    // a fault. A faulty recapture is the one error computer's.
    read: ({ fenBefore, san, theirLast, reply, faultCp, namesStudentMoves }, fact) => safe(() => {
      const tookOn = theirLast ? /x([a-h][1-8])/.exec(theirLast)?.[1] ?? null : null;
      const to = moveTo(fenBefore, san);
      if (faultCp !== 0 || !tookOn || to !== tookOn || !san.includes('x')) return null;
      const rc = recaptureChoice(fenBefore, san, reply, namesStudentMoves);
      if (!rc) return null;
      const proof = squaresProof(rc, [to]);
      if (!proof) return null;
      return fact({ key: `recapture-${to}`, claims: [`recapture-${to}`], text: rc, proof, squares: [to], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'recaptureChoice',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, weaknesses: { not: 'the right recapture held is recorded by Learn (capture-toward-centre); a miss is the slip capture\'s' } },
  },
  mateLine: {
    // THE LINE BEHIND A WINNING MOVE: the student played the engine's move and
    // its line mates — said to the mate, drawn ply by ply (`lines`). The line
    // goes on with the student's own moves: theirs to find (OS-10).
    read: ({ fenBefore, san, bestSan, lineUci, reply }, fact) => safe(() => {
      if (!bestSan || bareSan(bestSan) !== bareSan(san) || lineUci.length === 0) return null;
      const me = sideToMove(fenBefore);
      const ml = mateLine(fenBefore, lineUci, me, san);
      if (!ml) return null;
      const to = moveTo(fenBefore, san);
      const sq = [to, ...ml.taken];
      const proof = lineProof({ fen: fenBefore, sans: ml.sans }, 'you') ?? squaresProof(ml.text, sq);
      if (!proof) return null;
      return fact({ key: `${ml.quiet ? 'quiet' : '-'}|wins-line:${posKey(fenBefore)}`, claims: [`wins-line:${posKey(fenBefore)}`], text: ml.text,
        proof, squares: sq, stakes: null,
        seat: 'student', namesStudentMove: namesPlayableStudentMove(studentMovesInLine(fenBefore, ml.sans, me, boardAfterSans(fenBefore, [san, reply]), 1)),
        thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, lines: [{ fen: fenBefore, sans: ml.sans }] });
    }),
    computer: 'mateLine',
    kind: 'point',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'Review draws the winning line itself (coachFeatureService, the line behind a winning move)' }, lesson: { not: 'the lesson\'s own played-out line says it (LESSON_STUDENT_LANE movePoint: null)' }, weaknesses: { not: 'a line found, not a question missed' } },
  },
  winsLine: {
    read: ({ fenBefore, san, bestSan, lineUci, reply, prior, seconds }, fact) => safe(() => {
      if (!bestSan || bareSan(bestSan) !== bareSan(san) || lineUci.length === 0) return null;
      const me = sideToMove(fenBefore);
      const w = lineWins(fenBefore, lineUci, me, san, prior, seconds);
      if (!w) return null;
      const to = moveTo(fenBefore, san);
      const proof = lineProof({ fen: fenBefore, sans: w.sans }, 'you') ?? squaresProof(`That wins ${w.what}`, [to]);
      if (!proof) return null;
      return fact({ key: `wins-line:${posKey(fenBefore)}`, claims: [`wins-line:${posKey(fenBefore)}`], text: `That wins ${w.what}: ${lineShape(w.sans, 'you', fenBefore, 'first')}.`,
        proof, squares: [to], stakes: null,
        seat: 'student', namesStudentMove: namesPlayableStudentMove(studentMovesInLine(fenBefore, w.sans, me, boardAfterSans(fenBefore, [san, reply]), 1)),
        thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, lines: [{ fen: fenBefore, sans: w.sans }] });
    }),
    computer: 'lineWins',
    kind: 'point',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'Review draws the winning line itself (coachFeatureService, the line behind a winning move)' }, lesson: { not: 'the lesson\'s own played-out line says it (LESSON_STUDENT_LANE movePoint: null)' }, weaknesses: { not: 'a line found, not a question missed' } },
  },
  kneeJerk: {
    // QUESTION THE KNEE-JERK: the reflex recapture that cost.
    read: ({ fenBefore, san, theirLast, bestSan, faultCp }, fact) => safe(() => {
      const kj = kneeJerk(theirLast, san, bestSan, faultCp);
      if (!kj) return null;
      return fact({ key: 'method:knee-jerk', claims: ['method:knee-jerk'], text: kj, proof: NO_PROOF.method, squares: [moveTo(fenBefore, san)], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'kneeJerk',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, lesson: SLIP_HABIT_LESSON, weaknesses: SLIP_HABIT_WEAK },
  },
  strongChoice: {
    // A STRONG PLAYER'S CHOICE HERE — from the games DB, depersonalized. A bare
    // affirmation teaches once a game; naming a DIFFERENT strong move teaches
    // every time (David 2026-10-06).
    read: ({ fenBefore, san, ply }, fact) => safe(() => {
      const sc = strongChoice(fenBefore, san);
      if (!sc) return null;
      const claim = sc.same ? 'strong-choice:affirm' : `strong-choice:${ply}`;
      return fact({ key: `${sc.same ? 'same' : '-'}|${claim}`, claims: [claim], text: sc.text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'strongChoice',
    kind: 'quality',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'a statistic, not a rule: Review reads only the bundle\'s rule kinds' }, lesson: { not: 'a games-database statistic is not a reason (LESSON_STUDENT_LANE strongChoice: null)' }, think: { not: 'a games-database statistic, not a reason a step can teach' }, weaknesses: { not: 'a statistic, no question of the student\'s posed' } },
  },
  fileClaimed: {
    // THE OPEN FILE, TAKEN (planRace file collision): both sides wanted it and
    // the student's rook got there on a clean move.
    read: ({ fenBefore, san, cpLoss }, fact) => safe(() => {
      if (cpLoss === null || cpLoss >= 50) return null;
      const fc = fileClaimed(fenBefore, san);
      if (!fc) return null;
      const to = moveTo(fenBefore, san);
      return fact({ key: `${fc.contested ? 'contested' : '-'}|file-race:${fc.file}`, claims: [`file-race:${fc.file}`], text: fc.text, proof: squaresProof(fc.text, [to]) ?? NO_PROOF.stated, squares: [to], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'fileClaimed',
    kind: 'point',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'Review says the file race through its plan-race facet' }, weaknesses: { not: 'the file taken is recorded held by Learn (passive-rook); a miss is the slip capture\'s' } },
  },
  blunderCheck: {
    // THE BLUNDER CHECK, earned only by what the board did — with its stake
    // and its square: what they took is what rode on it (Learn audit 2026-10-14).
    read: ({ fenBefore, san, reply, faultCp, again, ply }, fact) => safe(() => {
      const bc = blunderCheck(fenBefore, san, reply, faultCp, again);
      if (!bc) return null;
      let lost: { square: string; piece: string } | null = null;
      try {
        const c = new Chess(fenBefore); c.move(san);
        const r = reply ? c.move(reply.replace(/^…/, '')) : null;
        if (r?.captured) lost = { square: r.to, piece: r.captured };
      } catch { lost = null; }
      // The callback carries its own move's claim: said once per blunder.
      const claim = again ? `${liveHabitKey('blunder-check')}:${ply}` : liveHabitKey('blunder-check');
      return fact({ key: claim, claims: [claim], text: bc, proof: NO_PROOF.method, squares: lost ? [lost.square] : [],
        stakes: lost ? { points: piecePoints(lost.piece), plies: 1 } : null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'blunderCheck',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, lesson: SLIP_HABIT_LESSON, weaknesses: SLIP_HABIT_WEAK },
  },
  autopilot: {
    read: ({ fenBefore, san, faultCp, popularTopSan }, fact) => safe(() => {
      const ap = autopilotGuard(san, faultCp, popularTopSan);
      if (!ap) return null;
      return fact({ key: 'method:autopilot', claims: ['method:autopilot'], text: ap, proof: NO_PROOF.method, squares: [moveTo(fenBefore, san)], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'autopilotGuard',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, lesson: SLIP_HABIT_LESSON, weaknesses: SLIP_HABIT_WEAK },
  },
  spareTempo: {
    // THE PAWN ENDING (Naroditsky's endgame series): the spare tempo wasted.
    read: ({ fenBefore, san, bestSan, cpLoss }, fact) => safe(() => {
      const st = spareTempoWasted(fenBefore, san, bestSan, cpLoss);
      if (!st) return null;
      return fact({ key: 'method:spare-tempo', claims: ['method:spare-tempo'], text: st, proof: NO_PROOF.method, squares: [moveTo(fenBefore, san)], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'spareTempoWasted',
    kind: 'method',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { wired: 'services/coachFeatureService.ts' }, weaknesses: { not: 'a habit said after the slip; the slip itself is the capture\'s' } },
  },
  pawnEndingCounted: {
    // COUNT THE PAWN ENDING BEFORE YOU TRADE INTO IT.
    read: ({ fenBefore, san, reply, faultCp, cpAfter }, fact) => safe(() => {
      const pe = pawnEndingTrade(fenBefore, san, reply, faultCp, cpAfter);
      if (!pe) return null;
      const to = moveTo(fenBefore, san);
      return fact({ key: `${pe.verdict}|method:pawn-ending-trade`, claims: ['method:pawn-ending-trade'], text: pe.text,
        proof: (reply ? legalLineProof(fenBefore, [san, reply], 'you') : null) ?? squaresProof(pe.text, [to]) ?? NO_PROOF.stated, squares: [to], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'pawnEndingTrade',
    kind: 'method',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'Review says the pawn-ending reads through its own producers' }, weaknesses: { not: 'the trade counted; its miss is graded as the move\'s cost' } },
  },
  outsidePasserDecoy: {
    // Once only kings and pawns remain, an outside passer is a decoy.
    read: ({ fenBefore, san }, fact) => safe(() => {
      const after = boardAfter(fenBefore, san);
      if (!after) return null;
      const decoy = outsidePasserDecoy(after, sideToMove(fenBefore));
      if (!decoy) return null;
      return fact({ key: `decoy:${decoy.passer[0]}`, claims: [`decoy:${decoy.passer[0]}`], text: decoy.text, proof: squaresProof(decoy.text, decoy.squares) ?? NO_PROOF.stated, squares: decoy.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: after });
    }),
    computer: 'outsidePasserDecoy',
    kind: 'method',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'Review says the pawn-ending reads through its own producers' }, weaknesses: { not: 'a plan named, no question of the student\'s posed' } },
  },
  keepPressing: {
    read: ({ fenBefore, san, bestSan, faultCp, cpAfter }, fact) => safe(() => {
      const kp = keepPressing(fenBefore, san, bestSan, faultCp, cpAfter);
      if (!kp) return null;
      return fact({ key: 'method:keep-pressing', claims: ['method:keep-pressing'], text: kp, proof: NO_PROOF.method, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'keepPressing',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, lesson: SLIP_HABIT_LESSON, weaknesses: SLIP_HABIT_WEAK },
  },
  tradeDeal: {
    // WAS THE TRADE A GOOD DEAL — a like-for-like trade the reply completed,
    // judged by the first reason the board supports.
    read: ({ fenBefore, san, reply, faultCp, values, prior, namesStudentMoves, ply }, fact) => safe(() => {
      const tj = tradeJudgement(fenBefore, san, reply, sideToMove(fenBefore), faultCp, values, prior, namesStudentMoves);
      if (!tj) return null;
      const to = moveTo(fenBefore, san);
      return fact({ key: `${tj.reason}|trade:${to}:${ply}`, claims: [`trade-${tj.reason}`, `capture:${to}:${ply}`, ...(tj.reason === 'their-best' ? [`piece-quality:${to}`] : [])], text: tj.text,
        proof: (reply ? legalLineProof(fenBefore, [san, reply], 'you') : null) ?? squaresProof(tj.text, tj.squares) ?? NO_PROOF.stated, squares: tj.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'tradeJudgement',
    kind: 'trade',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, review: { not: 'Review says the trade through its own trade read' }, weaknesses: { not: 'a good trade chosen is recorded held by Learn (bad-trade); a bad one is graded as the move\'s cost' } },
  },
  kingAttack: {
    // BRINGING PIECES TO THEIR KING — not on a move that cost a pawn; that
    // move's lesson is the cost. "…heads for their king — Qg3 next" names the
    // student's next move: drawn as the move to play (`marks.play`).
    read: ({ fenBefore, san, reply, cpLoss, namesStudentMoves, linesAfter }, fact) => safe(() => {
      if (cpLoss === null || cpLoss >= 100) return null;
      const ka = kingAttack(fenBefore, san, false, namesStudentMoves, linesAfter);
      if (!ka) return null;
      const next = ka.next ? { from: ka.next.uci.slice(0, 2), to: ka.next.uci.slice(2, 4) } : null;
      return fact({ key: `${ka.kind}|${ka.next?.uci ?? '-'}`,
        // "Qe1 heads for their king — Qg3 next" and "Qe1 prepares Qg3" are one idea.
        claims: [`king-attack-${ka.kind}`, ...(ka.next ? [`prepares:${ka.next.uci}`] : [])], text: ka.text,
        proof: squaresProof(ka.text, ka.squares) ?? NO_PROOF.stated, squares: ka.squares, stakes: null,
        seat: 'student', namesStudentMove: next ? namesPlayableStudentMove(namesMoves(sideToMove(fenBefore), boardAfterSans(fenBefore, [san, reply]), next)) : false,
        thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, ...(next ? { marks: { play: next } } : {}) });
    }),
    computer: 'kingAttack',
    kind: 'rule',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, weaknesses: { not: 'an attack built, no question of the student\'s missed' } },
  },
  ruleException: {
    // A RULE AND ITS EXCEPTION — only on a move the engine agrees with, so the
    // exception is proven, not excused. "…here it hits the pawn on g2": the
    // sight line, only while the target still stands there after their reply
    // (its square rides the key).
    read: ({ fenBefore, san, history, reply, bothCp, cpLoss }, fact) => safe(() => {
      if (!bothCp || cpLoss === null || cpLoss > 20) return null;
      const rx = ruleException(fenBefore, san, history);
      if (!rx) return null;
      const to = moveTo(fenBefore, san);
      const hitSq = rx.squares[1];
      let stillThere = false;
      try { const live = new Chess(fenBefore); live.move(san); if (reply) live.move(reply.replace(/^…/, '')); stillThere = !!hitSq && !!live.get(hitSq as Square); } catch { stillThere = false; }
      return fact({ key: `${rx.rule}|${stillThere ? hitSq : '-'}`, claims: [`rule-${rx.rule}-${to}`], text: rx.text, proof: squaresProof(rx.text, rx.squares) ?? NO_PROOF.stated, squares: rx.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'ruleException',
    kind: 'rule-exception',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, weaknesses: { not: 'a rule broken for a proven reason; no question of the student\'s missed' } },
  },
  falseAlarm: {
    // DON'T PANIC — their last move made a real threat and the engine's move
    // ignores it. Their threat is drawn (`marks.theirs`) only while it is
    // still coming, never once played.
    read: ({ theirFenBefore, fenBefore, studentSan, bestLine, reply }, fact) => safe(() => {
      const fa = falseAlarm(theirFenBefore, fenBefore, bestLine, reply);
      if (!fa) return null;
      const played = !!reply && reply.replace(/^…/, '') === fa.threat.san;
      return fact({ key: `${fa.threat.kind}|false-alarm-${fa.threat.landing}`, claims: [`false-alarm-${fa.threat.landing}`], text: fa.text, proof: squaresProof(fa.text, fa.squares) ?? NO_PROOF.stated, squares: fa.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: (studentSan ? boardAfter(fenBefore, studentSan) : null) ?? fenBefore, ...(played ? {} : { marks: { theirs: { from: fa.threat.from, to: fa.threat.landing } } }) });
    }),
    computer: 'falseAlarm',
    kind: 'false-alarm',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, weaknesses: { not: 'a threat rightly ignored is recorded held by Learn (missed-opponents-threat)' } },
  },
  pushOrHold: {
    // PUSH OR HOLD — what a pawn up or down is worth in THIS ending, only while
    // the engine keeps it in the band where the choice matters.
    read: ({ fenBefore, san, cpAfter }, fact) => safe(() => {
      if (cpAfter === null) return null;
      const after = boardAfter(fenBefore, san);
      if (!after) return null;
      const ph = pushOrHold(after, sideToMove(fenBefore), cpAfter);
      if (!ph) return null;
      return fact({ key: `${ph.cls}|${ph.side}`, claims: [`ending-${ph.cls}-${ph.side}`], text: ph.text, proof: NO_PROOF.method, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: after });
    }),
    computer: 'pushOrHold',
    kind: 'push-or-hold',
    phase: ANY,
    surfaces: { ...BUNDLE_SURFACES, weaknesses: { not: 'an ending named, no question of the student\'s posed' } },
  },
  counterThreat: {
    // THEIR counter-threat is danger to the student: staked at what ignoring
    // the hit piece costs (`threatStakes`), so it ranks as present danger. The
    // proof is the line that punishes taking the piece left (`lines`).
    read: ({ fenBefore, san, student, studentMoveCostCp }, fact) => safe(() => {
      const c = counterThreat(fenBefore, san);
      if (!c) return null;
      const byStudent = sideToMove(fenBefore) === student;
      if (byStudent && (studentMoveCostCp === null || studentMoveCostCp >= COUNTER_THREAT_HELD_CP)) return null;
      const text = counterThreatLine(c, byStudent);
      const after = boardAfter(fenBefore, san);
      const stakes = !byStudent && after ? threatStakes(after, student, [c.hit.square]) : null;
      const claim = `danger-levels:${c.left.square}>${c.hit.square}`;
      return fact({ key: claim, claims: [claim], text,
        proof: (c.line ? lineProof(c.line, lineSeatAt(c.line.fen, student), true) : null) ?? squaresProof(text, c.squares) ?? NO_PROOF.description, squares: c.squares, stakes,
        seat: byStudent ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: after ?? fenBefore, role: 'teach',
        ...(c.line && !byStudent ? { lines: [c.line] } : {}) });
    }),
    computer: 'counterThreat',
    kind: 'must-defend',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, lesson: LEARN_BUNDLE, review: { not: 'Review reads the left piece as a loose piece and the hit as a threat, through its own facets' }, play: PLAY_ASK, chat: { not: 'chat answers a threat through its own threat lane (groundedAnswer)' }, tactics: TACTICS_NA, weaknesses: { not: 'the threat ignored is filed by the threat lane\'s record' }, think: { not: 'a step board poses the threat as its own step (answer-danger)' } },
  },
  playedConcept: {
    // THE CONCEPT A MOVE JUST PLAYED, either seat (David 2026-10-18), with its
    // definition the first time a game meets it. The concept rides the key
    // (`<type>|…`): a student's own play is counted toward proving it.
    read: ({ fenBefore, san, student, define }, fact) => safe(() => {
      const c = playedConcept(fenBefore, san);
      if (!c) return null;
      const text = `${playedConceptLine(c, student)}${define(c.type)}`;
      const squares = c.squares.filter((s) => /^[a-h][1-8]$/.test(s));
      const claims = [conceptInstanceKey(c.type, squares), ...[tacticGeometryKey(squares)].filter((k): k is string => !!k)];
      return fact({ key: `${c.type}|${claims[0]}`, claims, text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: c.mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, role: 'teach' });
    }),
    computer: 'playedConcept',
    kind: 'concept',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, lesson: { not: 'a lesson names its tactic through the move aspects (moveAspects)' }, review: { not: 'Review names the tactic through its own tactic facet' }, play: PLAY_ASK, chat: { not: 'chat names a tactic through its own tactic lane' }, tactics: { not: 'a puzzle names its own theme' }, weaknesses: { not: 'the concept played is recorded by conceptRecord, not the weakness record' }, think: { not: 'a step board asks for the tactic; it is never named first' } },
  },
  tempoCount: {
    // The count IS the proof — read off the game's own moves (exact).
    read: ({ history, student }, fact) => safe(() => {
      const t = tempoCount(history, student);
      if (!t) return null;
      const fen = fenOfGame(history);
      return fact({ key: `${t.moves}|tempo-count:${t.pieceId}`, claims: [`tempo-count:${t.pieceId}`], text: t.text,
        proof: { kind: 'count', exact: true, short: `${t.moves} moves with one piece`, full: `that piece has now moved ${t.moves} times`, squares: t.squares }, squares: t.squares, stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'tempoCount',
    kind: 'opp-dev',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a lesson\'s line is a model line, no slow development of theirs to count' }, review: { not: 'Review counts the tempo through its own trade ledger' }, tactics: TACTICS_NA, weaknesses: { not: 'their slow development, no question of the student\'s posed' }, think: { not: 'a step board is one position, not a game\'s move count' } },
  },
  stalemateWatch: {
    read: ({ fen, student }, fact) => safe(() => {
      const w = stalemateWatch(fen, student);
      if (!w) return null;
      const claim = `stalemate-watch:${fen.split(' ')[0]}`;
      return fact({ key: `${w.moves.length}|${claim}`, claims: [claim], text: w.text, proof: squaresProof(w.text, w.squares) ?? NO_PROOF.stated, squares: w.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'stalemateWatch',
    kind: 'deliberation',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a model line never offers a stalemate to avoid' }, review: { not: 'Review says the stalemate trick through its own computer (stalemateTrick)' }, tactics: TACTICS_NA, weaknesses: { not: 'a warning before the move; a stalemate given is the game\'s result' }, think: { not: 'a step board is not a won ending' } },
  },
  checkMethod: {
    read: ({ fen, student, bestUci }, fact) => safe(() => {
      const m = checkMethod(fen, student, bestUci);
      if (!m) return null;
      return fact({ key: `${m.kinds.join(',')}|check-method`, claims: ['check-method'], text: m.text, proof: NO_PROOF.method, squares: m.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'checkMethod',
    kind: 'deliberation',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a model line answers its checks itself' }, review: { not: 'Review grades the answer to check as the move\'s cost' }, tactics: TACTICS_NA, weaknesses: { not: 'a method named before the move; the answer is graded' }, think: { not: 'a step board asks the forcing moves as its own step' } },
  },
  planChoice: {
    read: ({ fen, lines, student, lastMove }, fact) => safe(() => {
      const pc = planChoice(fen, lines, student === 'w' ? 'white' : 'black', lastMove);
      if (!pc) return null;
      return fact({ key: pc.key, claims: ['plan-choice', pc.key], text: pc.text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'planChoice',
    kind: 'plan-arc',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, lesson: LEARN_BUNDLE, play: PLAY_ASK, review: { not: 'Review says the plans through its plan arc' }, chat: { not: 'chat\'s plan answer reads the plan arc (planArcAnswerLines)' }, tactics: TACTICS_NA, weaknesses: { not: 'two plans named, no question of the student\'s posed' }, think: { not: 'a step board asks the plan as its own step' } },
  },
  zugzwang: {
    // ZUGZWANG at the student's turn (tablebase, ≤7 pieces) — the fact that
    // decides pawn endings, said once per position.
    read: ({ fen, read: z }, fact) => safe(() => {
      const claim = `zugzwang:${posKey(fen)}`;
      return fact({ key: `${z.mutual ? 'mutual' : '-'}|${claim}`, claims: [claim], text: zugzwangSentence(z, true), proof: zugzwangProof(z, true), squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'readZugzwang',
    kind: 'method',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_ASK, chat: { not: 'chat answers an ending through its own endgame lane' }, lesson: { not: 'an endgame lesson says zugzwang in its authored beats' }, review: { not: 'Review reads no tablebase on its walk' }, tactics: TACTICS_NA, weaknesses: { not: 'a fact of the ending, no question of the student\'s posed' }, think: { not: 'a step board reads no tablebase' } },
  },
  kingCourse: {
    read: ({ fen, student }, fact) => safe(() => {
      const kc = kingCourse(fen, student);
      if (!kc) return null;
      const proof = squaresProof(kc.text, [kc.target]);
      if (!proof) return null;
      return fact({ key: 'king-course', claims: ['king-course'], text: kc.text, proof, squares: [kc.target], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'kingCourse',
    kind: 'method',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_ASK, chat: { not: 'chat answers an ending through its own endgame lane' }, lesson: { not: 'an endgame lesson charts its king in its authored beats' }, review: { not: 'Review says the ending\'s plan through its endgame facets' }, tactics: TACTICS_NA, weaknesses: { not: 'a plan named, no question of the student\'s posed' }, think: { not: 'a step board is not a pawn ending' } },
  },
  foundMove: {
    // THE LINE THAT MAKES IT WORK (pass-2 walk 2026-09-30): when the found move
    // is the engine's and its own line mates or wins material, the line is said
    // to where it lands, and drawn (`lines`). Else the first tempting move that
    // failed is the line the board plays. The decision moment is the board
    // before the move: the verdict is computed there.
    read: ({ fenBefore, san, preLines, student, prevCapture, prior }, fact) => safe(() => {
      if (preLines.length < 2) return null;
      const read = readCriticalMoment({ topLines: preLines, moverColor: student, fen: fenBefore });
      const found = criticalMomentFound(read, san, prevCapture, fenBefore);
      if (!found) return null;
      const line = preLines[0]?.moves ?? [];
      const ml = mateLine(fenBefore, line, student, san);
      const won = ml ? null : lineWins(fenBefore, line, student, san, prior, [preLines[0]?.earlier?.moves ?? null]);
      const text = ml ? `${found} ${ml.text}` : won ? `${found} It wins ${won.what}: ${lineShape(won.sans, 'you', fenBefore, 'first')}.` : found;
      const failed = read?.discardedProofs?.[0]?.line ?? null;
      const sans = ml?.sans ?? won?.sans ?? null;
      return fact({ key: `${ml ? 'mate' : won ? 'won' : '-'}|found-${san}`, claims: [`found-${san}`, ...(won || ml ? [`wins-line:${posKey(fenBefore)}`] : [])], text,
        proof: (sans ? lineProof({ fen: fenBefore, sans }, lineSeatAt(fenBefore, student)) : failed ? lineProof(failed, lineSeatAt(failed.fen, student)) : null) ?? NO_PROOF.description,
        squares: [moveTo(fenBefore, san)], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, ...(sans ? { lines: [{ fen: fenBefore, sans }] } : {}) });
    }),
    computer: 'criticalMomentFound',
    kind: 'quality',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_ASK, lesson: { not: 'the lesson grades its own answers' }, review: { not: 'Review says the found move through its critical-moment facet' }, chat: { not: 'chat answers about the board in front of it, not a move found live' }, tactics: { not: 'a puzzle credits its own solution' }, weaknesses: { not: 'a find is recorded held by Learn (calculation-depth)' }, think: { not: 'credits a move the student found live — the lesson grades its own answers' } },
  },
  theirDeepFact: {
    // THEIR move: what it sets up (the deep fact, two moves on, five when the
    // link is proven and the strike wins) — said with their move, the same
    // claim as their prepared move. "…once your b4 opens the diagonal" names a
    // move of the student's: held while it is theirs to play. Their prepared
    // move is drawn (`marks.theirs`).
    // Their move's deep fact in the one fact set (`deepThought`).
    read: (ctx, fact) => ('words' in ctx ? safe(() => deepThought(fact, ctx.words, ctx.line)) : safe(() => {
      const { fenBefore, theirSan, lineAfter, student } = ctx;
      const deep = deepFact(fenBefore, theirSan, lineAfter, false);
      if (!deep || !lineAfter) return null;
      const fenAfter = boardAfter(fenBefore, theirSan);
      if (!fenAfter) return null;
      const sans = [theirSan, ...lineAfter.slice(0, deep.lineIndex + 1)];
      const text = `They play ${theirSan}, ${deep.text}.`;
      const claim = `their-prepares:${deep.follow.uci}`;
      return fact({ key: `${sans.length - 1}|${claim}`, claims: [claim], text,
        proof: lineProof({ fen: fenBefore, sans }, 'they') ?? squaresProof(text, deep.squares) ?? NO_PROOF.description, squares: deep.squares,
        stakes: { points: deep.hit.type === 'k' ? 1 : CAPTURE_VALUE[deep.hit.type] ?? 1, plies: sans.length - 1 },
        seat: 'opponent', namesStudentMove: deep.opener ? namesPlayableStudentMove(namesMoves(student, fenAfter, { from: deep.opener.from, to: deep.opener.to })) : false,
        thread: LOCAL_THREAD, fen: fenBefore, role: 'teach', marks: { theirs: { from: deep.follow.from, to: deep.follow.to } } });
    })),
    computer: 'deepFact',
    kind: 'opponent-intent',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_READ, lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, chat: { wired: 'services/moveThoughtFacts.ts' }, tactics: TACTICS_READ, weaknesses: { not: 'what their move set up; the miss is the move\'s cost' }, think: { wired: 'services/moveThoughtFacts.ts' } },
  },
  studentDeepFact: {
    // YOUR DEEP FACT names your next move, so Learn holds it and says it when
    // you play it: the fact is the promise's words, its piece, square and the
    // hit it must still make ride the key (`<piece>|<square>|<hit>|<type>|…`).
    // The student's move's deep fact in the one fact set (`deepThought`).
    read: (ctx, fact) => ('words' in ctx ? safe(() => deepThought(fact, ctx.words, ctx.line)) : safe(() => {
      const { fenBefore, san, reply, lineAfterReply } = ctx;
      if (!reply || !lineAfterReply || lineAfterReply.length === 0) return null;
      const deep = deepFact(fenBefore, san, [reply.replace(/^…/, ''), ...lineAfterReply], true);
      if (!deep) return null;
      const piece = POISON_NAME[deep.follow.piece] ?? 'piece';
      const text = `Your ${piece} on ${deep.follow.to} ${deep.hit.words} now — ${sayYourMove(san, fenBefore)} made that possible.`;
      const claim = `deep:${deep.follow.uci}`;
      return fact({ key: `${deep.follow.piece}|${deep.follow.to}|${deep.hit.square}|${deep.hit.type}|${claim}`, claims: [claim], text,
        proof: squaresProof(text, [deep.follow.to, deep.hit.square]) ?? NO_PROOF.description, squares: [deep.follow.to, deep.hit.square], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    })),
    computer: 'deepFact',
    kind: 'point',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_READ, lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, chat: { wired: 'services/moveThoughtFacts.ts' }, tactics: TACTICS_READ, weaknesses: { not: 'a promise kept, no question of the student\'s missed' }, think: { wired: 'services/moveThoughtFacts.ts' } },
  },
  binding: {
    // YOUR MOVE AGAINST THEIR LAST ONE — their target and how the move answers
    // it. The binding's "this" is the student's move: said as "your move",
    // never by name (David 2026-11-09).
    // THE ANSWER TO THEIR LAST MOVE in the one fact set, either seat: what it
    // aimed at, and how this move meets it, from the move's own point (what it
    // sets up or threatens — `point` — else what the moved piece hits).
    read: (ctx, fact) => ('words' in ctx ? safe(() => {
      const w = ctx.words;
      const mine = w.moverIsStudent !== false;
      const tgt = theirTarget(ctx.theirLast, mine, ctx.plainSeen);
      if (!tgt) return null;
      const bind = bindingFact(w.fenBefore, w.san, tgt, ctx.point ?? moveHit(w.fenBefore, w.san), mine);
      if (!bind) return null;
      const text = `${openSentence(tgt.text)}, ${bind.text}`;
      return moveIdeaFact(fact, w, { kind: 'binding', idea: bind.idea, weight: 62, text, alsoText: text, squares: [tgt.square] });
    }) : safe(() => {
      const { fenBefore, san, prior, plainSeen, ply } = ctx;
      const tgt = theirTarget(prior, true, plainSeen);
      if (!tgt) return null;
      const bind = binding(fenBefore, san, tgt, moveHit(fenBefore, san), true);
      if (!bind) return null;
      const text = `${openSentence(tgt.text)}, ${bind.replace(/\bthis\b/, 'your move')}.`;
      const claim = `binding:${tgt.square}:${ply}`;
      return fact({ key: claim, claims: [claim], text, proof: squaresProof(text, [tgt.by, tgt.square]) ?? NO_PROOF.stated, squares: [tgt.by, tgt.square], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, role: 'teach' });
    })),
    computer: 'bindingFact',
    kind: 'point',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_READ, lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, chat: { wired: 'services/moveThoughtFacts.ts' }, tactics: TACTICS_READ, weaknesses: { not: 'a reason for a move, no question of the student\'s missed' }, think: { wired: 'services/moveThoughtFacts.ts' } },
  },
  boardTeacherOwn: {
    // WHAT THE STUDENT'S MOVE DID, from the board teacher — Learn's fallback
    // own-move reason. The piece must still stand where it went; the move is
    // "your move", never its name (David 2026-11-09). An idea said in full
    // once is referred to after (`idea:<key>:<n>` claims).
    // The student's move in the one fact set (`boardTeacherThought`).
    read: (ctx, fact) => ('words' in ctx ? safe(() => boardTeacherThought(fact, ctx.words, ctx.phrases)) : safe(() => {
      const { fenBefore, san, fenNow, spokenIdeas } = ctx;
      if (!stillStands(fenBefore, san, fenNow)) return null;
      const read = teacherWithIdeas(fenBefore, san, true, spokenIdeas);
      if (!read) return null;
      const text = withSubject(read.fact.text, 'Your move');
      return fact({ key: `board-teacher:${san}:${posKey(fenBefore)}`, claims: [`board-teacher:${san}:${posKey(fenBefore)}`, ...(read.fact.claim ? [read.fact.claim] : []), ...read.ideaClaims], text,
        proof: squaresProof(text, read.fact.squares) ?? NO_PROOF.description, squares: read.fact.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    })),
    computer: 'buildReviewMoveTeachingFact',
    kind: 'point',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_READ, lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, chat: { wired: 'services/moveThoughtFacts.ts' }, tactics: TACTICS_READ, weaknesses: { not: 'a reason for a move, no question of the student\'s missed' }, think: { wired: 'services/moveThoughtFacts.ts' } },
  },
  boardTeacherTheirs: {
    // THEIR MOVE'S BOARD JOB (golden speedrun 2026-10-20): the same board
    // teacher, from their seat — the why of their move, never an aside.
    // Their move in the one fact set (`boardTeacherThought`).
    read: (ctx, fact) => ('words' in ctx ? safe(() => boardTeacherThought(fact, ctx.words, ctx.phrases)) : safe(() => {
      const { fenBefore, san, fenNow, spokenIdeas } = ctx;
      if (!stillStands(fenBefore, san, fenNow)) return null;
      const read = teacherWithIdeas(fenBefore, san, false, spokenIdeas);
      if (!read) return null;
      const text = withSubject(read.fact.text.replace(/^The (?=(?:king|queen|rook|bishop|knight|pawn)\b)/, 'Their '), `Their ${san}`);
      return fact({ key: `their-board:${san}:${posKey(fenBefore)}`, claims: [`their-board:${san}:${posKey(fenBefore)}`, ...read.ideaClaims], text,
        proof: squaresProof(text, read.fact.squares) ?? NO_PROOF.description, squares: [moveTo(fenBefore, san), ...read.fact.squares], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, role: 'teach' });
    })),
    computer: 'buildReviewMoveTeachingFact',
    kind: 'opponent-intent',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_READ, lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, chat: { wired: 'services/moveThoughtFacts.ts' }, tactics: TACTICS_READ, weaknesses: { not: 'their move\'s job, no question of the student\'s missed' }, think: { wired: 'services/moveThoughtFacts.ts' } },
  },
  prize: {
    // The sentence is the reason it can be won, from the board: nothing guards
    // it; a cheaper piece hits it; more pieces hit it than guard it — else only
    // that the guard is not enough. The prize is marked, never the taker (lead
    // 2026-10-20, option b); the method is its own sentence, said once a game.
    read: ({ fen, square, student, stem }, fact) => safe(() => {
      const board = new Chess(fen);
      if (board.turn() !== student) return null;
      const piece = board.get(square as Square);
      if (!piece || piece.color === student || piece.type === 'k') return null;
      if (legalSeeGainFor(fen, square as Square, student) <= 0) return null;
      const them: Color = student === 'w' ? 'b' : 'w';
      const name = POISON_NAME[piece.type] ?? 'piece';
      const value = CAPTURE_VALUE[piece.type] ?? 0;
      const takers = board.moves({ verbose: true }).filter((m) => m.to === square && m.captured)
        .sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 0) - (CAPTURE_VALUE[b.piece] ?? 0));
      if (takers.length === 0) return null;
      const guards = board.attackers(square as Square, them).length;
      const caution = 'Before you take, check what taking it allows.';
      const text = ((): string => {
        if (guards === 0) {
          const stems = [
            `Their ${name} has nothing defending it — find it, and taking it costs you nothing back.`,
            `Nothing guards one of their pieces — whatever takes it is not taken back.`,
            `${openSentence(withArticle(name))} of theirs is unguarded: win it and nothing recaptures.`,
          ];
          return `${stems[stem % stems.length]} ${caution}`;
        }
        if ((CAPTURE_VALUE[takers[0].piece] ?? 0) < value) return `Their ${name} is guarded, but a cheaper piece of yours hits it — a guard does not save it. ${caution}`;
        const hitters = new Set(takers.map((m) => m.from)).size;
        if (hitters > guards) return `One of their pieces is hit ${timesWord(hitters)} and guarded only ${timesWord(guards)} — you win it in the trades. ${caution}`;
        return `Their ${name} can be won — its guard is not enough. ${caution}`;
      })();
      return fact({ key: `prize:${square}`, claims: [`prize:${square}`], text, proof: NO_PROOF.withheld, squares: [square], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'prizeTeaching',
    kind: 'loose',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_ASK, lesson: { not: 'a model line\'s won piece is said as the move that wins it' }, review: { not: 'Review names the loose piece through its loose facet, the square included (the moment is past)' }, chat: { not: 'chat answers a question about what can be won, with the move named (asked)' }, tactics: { not: 'a puzzle poses the piece to win itself' }, weaknesses: { not: 'the miss is recorded by the focus as the chance\'s answer' }, think: { not: 'a step board asks the question as its own step (their-targets)' } },
  },
  gambitPoint: {
    // A GAMBIT THEY ACCEPTED (fresh-game walk 2026-09-27): their reply took the
    // piece the student's move put down and it cannot be won straight back —
    // so it was an offer, and the teaching is what it opened: a pawn passed now
    // (a breakthrough), a file a rook of theirs can use, or — when nothing
    // opened — the time the engine rates it for.
    read: ({ fenBefore, fenAfterMove, fenAfterReply, san, to, student: me }, fact) => safe(() => {
      const reply = new Chess(fenAfterMove).moves({ verbose: true })
        .find((r) => { const c = new Chess(fenAfterMove); c.move(r.san); return c.fen().split(' ')[0] === fenAfterReply.split(' ')[0]; });
      if (!reply || reply.to !== to || !reply.captured) return null;
      // A trade is not a gambit: the move itself captured, or the piece can be won straight back.
      if (san.includes('x')) return null;
      const wonBack = signedCaptureRead(fenAfterReply, to, me);
      if (wonBack === null || wonBack > 0) return null;
      const pawnFiles = (fen: string): Set<string> => new Set(new Chess(fen).board().flat()
        .filter((c) => c && c.type === 'p' && c.color === me).map((c) => (c as { square: string }).square[0]));
      const before = pawnFiles(fenBefore); const after = pawnFiles(fenAfterReply);
      const opened = [...before].filter((f) => !after.has(f)).sort();
      const what = POISON_NAME[reply.captured] ?? 'pawn';
      // A BREAKTHROUGH, NOT A FILE (hand walk 2026-09-27, a pawn ending).
      const passed = (fen: string): Set<string> => {
        const cells = new Chess(fen).board().flat().filter((c) => c && c.type === 'p') as Array<{ square: string; color: Color }>;
        const dir = me === 'w' ? 1 : -1;
        return new Set(cells.filter((pc) => pc.color === me && !cells.some((e) => e.color !== me
          && Math.abs(e.square.charCodeAt(0) - pc.square.charCodeAt(0)) <= 1
          && (Number(e.square[1]) - Number(pc.square[1])) * dir > 0)).map((pc) => pc.square));
      };
      const was = passed(fenBefore);
      const fresh = [...passed(fenAfterReply)].filter((sq) => !was.has(sq) && ![...was].some((w) => w[0] === sq[0]));
      // OPEN ONLY IF IT IS OPEN, AND ONLY FOR A ROOK THAT GETS THERE (hand walk 1690, 2026-09-27).
      const file = opened[0];
      const theirPawnOnFile = file !== undefined && new Chess(fenAfterReply).board().flat()
        .some((c) => c?.type === 'p' && c.color !== me && c.square[0] === file);
      const text = fresh.length > 0
        ? `${san} was a breakthrough — they took the ${what}, and now your ${fresh[0][0]}-pawn is passed.`
        : file !== undefined && rookReachesFile(fenAfterReply, me, file)
          ? `${san} was a gambit — they took the ${what}, and in return the ${file}-file is ${theirPawnOnFile ? 'half-open' : 'open'} for your rook.`
          : opened.length > 0 ? null
            : `${san} was a gambit — they took the ${what}, and the engine rates the trade of it for time as sound.`;
      if (!text) return null;
      return fact({ key: `gambit:${to}`, claims: [`gambit:${to}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfterReply });
    }),
    computer: 'gambitPoint',
    kind: 'point',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_ASK, lesson: { not: 'a gambit line\'s lesson says what the pawn bought in its authored beats' }, review: { not: 'Review says the sacrifice through its sac and compensation facets' }, chat: { not: 'chat answers about the board in front of it' }, tactics: TACTICS_NA, weaknesses: { not: 'a sacrifice explained, no question of the student\'s missed' }, think: { not: 'a step board is one position, not a gambit accepted' } },
  },
  structureNaming: {
    read: ({ fen, student, openingName }, fact) => safe(() => {
      const struct = namedPawnStructure(fen, student);
      if (!struct) return null;
      const transfer = structureTransfer(struct.name, openingName);
      const claim = `structure:${struct.name}`;
      return fact({ key: claim, claims: [claim], text: `${struct.name} — ${struct.plan}.${transfer ? ` ${transfer}` : ''}`, proof: NO_PROOF.name, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'structureNamingLine',
    kind: 'structure',
    phase: ANY,
    surfaces: { learn: LEARN_BUNDLE, play: PLAY_ASK, lesson: { not: 'a lesson names its structure in its authored beats' }, review: { not: 'Review names the structure through its own structure facet' }, chat: { not: 'chat names the structure through its structure lane (groundedAnswer)' }, tactics: TACTICS_NA, weaknesses: { not: 'a structure named, no question of the student\'s posed' }, think: { not: 'a step board asks the plan as its own step' } },
  },
  quietMovePoint: {
    // WHAT A QUIET MOVE IS FOR (Play on demand, David 2026-10-02): quiet moves
    // only — a capture's point is the trade.
    read: ({ fenBefore, san, prevCapture, student }, fact) => safe(() => {
      if (/x/.test(san) || sideToMove(fenBefore) !== student) return null;
      const point = studentMovePoint(fenBefore, san, prevCapture, null);
      if (!point) return null;
      return fact({ key: `quiet-point:${san}:${posKey(fenBefore)}`, claims: [`quiet-point:${san}:${posKey(fenBefore)}`], text: point, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'studentMovePoint',
    kind: 'point',
    phase: ANY,
    surfaces: { learn: { not: 'Learn reads the move\'s point through its own point lane (studentMovePointFact)' }, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a lesson reads the move\'s job (moveJob)' }, review: { not: 'Review reads the move\'s job (moveJob)' }, tactics: TACTICS_NA, weaknesses: { not: 'a reason for a move, no question of the student\'s missed' }, think: { not: 'a step board asks the move as its own step' } },
  },
  slipAnswer: {
    read: ({ fen, prevCapture, answerSan, lineUci, register }, fact) => safe(() => {
      const text = slipAnswerText(fen, prevCapture, answerSan, register, lineUci);
      if (!text) return null;
      return fact({ key: `slip-answer:${answerSan ?? '-'}:${posKey(fen)}`, claims: [`slip-answer:${posKey(fen)}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'slipAnswerText',
    kind: 'point',
    phase: ANY,
    surfaces: { learn: { not: 'Learn says the answer to their slip after it is found (its own slip-answer lane), never before' }, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a model line\'s slips are its punish lessons' }, review: REVIEW, tactics: TACTICS_NA, weaknesses: { not: 'the answer missed is recorded by the focus' }, think: { not: 'credits a move the student found live' } },
  },
  countWarning: {
    read: ({ fen, student }, fact) => safe(() => {
      const c = countWarning(fen, student);
      if (!c) return null;
      return fact({ key: countKey(c.square), claims: [countKey(c.square)], text: c.text, proof: squaresProof(c.text, [c.square]) ?? NO_PROOF.method, squares: [c.square], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'countWarning',
    kind: 'count',
    phase: ANY,
    surfaces: { learn: { not: 'Learn says the count after the move (countMethod)' }, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a model line counts its own trades (captureOrder)' }, review: { not: 'Review says the count after the move (countMethod)' }, tactics: TACTICS_NA, weaknesses: { not: 'a warning before the move; the miss is countMethod\'s' }, think: { not: 'a step board asks the count as its own step (is-my-move-safe)' } },
  },
  wingsRace: {
    read: ({ fen, student }, fact) => safe(() => {
      const race = oppositeWingsRace(fen, student, 'live');
      if (!race) return null;
      return fact({ key: `wings-race:${race.myWing}`, claims: [`wings-race:${race.myWing}`], text: race.text, proof: race.proof, squares: race.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'oppositeWingsRace',
    kind: 'plan-race',
    phase: ANY,
    surfaces: { learn: { not: 'Learn says the race through the plan race (raceOfPlans)' }, play: LEARN_BUNDLE, chat: LEARN_BUNDLE, lesson: { not: 'a lesson says its plans in its authored beats' }, review: { not: 'Review says the race through the plan race (raceOfPlans)' }, tactics: TACTICS_NA, weaknesses: { not: 'a race named, no question of the student\'s posed' }, think: { not: 'a step board asks the plan as its own step' } },
  },
  kingInCentre: {
    read: ({ fen, student }, fact) => safe(() => {
      if (!enemyKingStuckInCenter(fen, student)) return null;
      const text = 'Their king is stuck in the centre with a central file open on it.';
      return fact({ key: `king-centre:${fen.split(' ')[0]}`, claims: ['king-centre'], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'enemyKingStuckInCenter',
    kind: 'king',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
    },
  },
  notYet: {
    // NOT YET — FIRST THIS, about the move just played (the one fact set):
    // a capture is on the board, this move is a different forcing move, and
    // the capture is still there later in the line that follows. Both seats.
    read: (ctx, fact) => ('words' in ctx ? safe(() => {
      const w = ctx.words;
      const mine = w.moverIsStudent !== false;
      const ib = inBetweenMove(w.fenBefore, pvSanToUci(w.fenBefore, [w.san, ...ctx.line]), { reads: ctx.fan });
      if (!ib) return null;
      const first = ib.check ? 'The check' : 'The threat';
      const said = closeSentence(mine
        ? `Taking on ${ib.captureSquare} can wait — it isn't going anywhere. ${first} comes first, and you take after`
        : `They don't take on ${ib.captureSquare} yet — it isn't going anywhere. ${first} comes first, and they take after`);
      const m = new Chess(w.fenBefore).move(w.san);
      const claim = `not-yet:${m.from}${m.to}:${ib.captureSquare}`;
      return fact({ key: claim, claims: [claim], text: said, squares: [ib.captureSquare], stakes: null,
        proof: lineProof({ fen: w.fenBefore, sans: ib.line }, mine ? 'you' : 'they') ?? NO_PROOF.description, seat: moveSeat(w), namesStudentMove: false, thread: LOCAL_THREAD,
        fen: boardAfter(w.fenBefore, w.san) ?? w.fenBefore, altFen: w.fenBefore });
    }) : safe(() => {
      const { fen, bestSan, pv, student } = ctx;
      // ONE DETECTOR (A-plan P7): the in-between move the tactic record reads too.
      const ib = inBetweenMove(fen, [...pv], 'best');
      if (!ib) return null;
      const text = `The capture on ${ib.captureSquare} is not going anywhere. Not yet — first ${sayMoveClause(bestSan, fen)}${ib.check ? ' with check' : ''}, and take after.`;
      const line = { fen, sans: [...ib.line] };
      // Its proof is the engine's line through the capture: the capture is
      // still there after the forcing move (an engine line, never recited as fact).
      const key = `notyet:${ib.captureSquare}`;
      return fact({ key, claims: [key], text, proof: lineProof(line, lineSeatAt(fen, student)) ?? NO_PROOF.description, squares: [ib.captureSquare], stakes: null,
        seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen, lines: [line] });
    })),
    computer: 'inBetweenMove',
    kind: 'not-yet',
    phase: ANY,
    surfaces: {
      learn: { wired: 'services/thinkAloud.ts' },
      chat: { wired: 'services/thinkAloud.ts' },
      review: { wired: 'services/moveThoughtFacts.ts' },
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      play: PLAY_READ,
      tactics: TACTICS_READ,
      weaknesses: WEAK_PLAYED_JUDGED,
      think: { wired: 'services/moveThoughtFacts.ts' },
    },
  },
  obviousStop: {
    // ONE COMPUTER OWNS THEIR WANTED PIN, KICK OR FORK (OS-1 root cause 1):
    // `findProphylaxis` finds it and its stop; this reads only the VERDICT on
    // that stop. A pawn stop that hands them a hook fails only when the ENGINE
    // agrees — it ranked the stop a notable step below the best move.
    // Otherwise the stop is the held answer (`prophylaxis`), never both.
    read: ({ fen, student, lines }, fact) => safe(() => {
      if (sideToMove(fen) !== student) return null;
      const p = findProphylaxis(fen);
      if (!p || p.prevention.piece !== 'p') return null;
      const hook = hookCreated(fen, p.prevention.san);
      if (!hook) return null;
      if (!stopRefuted(fen, `${p.prevention.from}${p.prevention.to}`, lines)) return null;
      const verb = p.kind === 'pin' ? 'pinning' : p.kind === 'fork' ? 'forking' : 'hitting';
      const text = `They want ${sayMoveClause(p.intent.san, p.threat.line.fen)}, ${verb} your ${POISON_NAME[p.victim.piece] ?? 'piece'} on ${p.victim.square}. The obvious stop is ${sayMoveClause(p.prevention.san, fen)}, but that pawn becomes a hook for their pawn on ${hook.pawn} — find another way.`;
      const key = prophylaxisKey(p.intent.to);
      return fact({ key, claims: [key], text, proof: prophylaxisThreatProof(p), squares: [...p.threat.squares], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen,
        lines: [{ fen: p.threat.line.fen, sans: [...p.threat.line.sans] }],
        marks: { play: { from: p.prevention.from, to: p.prevention.to }, theirs: { from: p.intent.from, to: p.intent.to } },
        ...(p.threat.motif ? { motif: p.threat.motif } : {}) });
    }),
    computer: 'findProphylaxis',
    kind: 'stop-flaw',
    phase: ANY,
    surfaces: {
      learn: { wired: 'services/thinkAloud.ts' },
      chat: { wired: 'services/thinkAloud.ts' },
      review: { not: 'Review says the stop after it was missed (prophylaxisMissed), never as advice on a game already played' },
      lesson: { not: 'a lesson plays the model line; there is no obvious stop of the student\'s to refute' },
      play: PLAY_ASK,
      tactics: TACTICS_NA,
      weaknesses: { not: 'the miss is the obvious stop played, filed by its own cost; the stop that works is filed by moveInsight.prophylaxisAnswer' },
      think: { not: 'owed — the step board reads the composer, not the live depth read (depthClauses)' },
    },
  },
  keyDefenderNow: {
    // The piece of theirs doing a job alone, when the engine's best line
    // trades it off — the same computer the move thought speaks when a move
    // does it (`keyDefender`), read here for the board as it stands.
    read: ({ fen, student, line }, fact) => safe(() => {
      const plan = keyDefenderPlan(fen, line);
      if (!plan) return null;
      const mine = plan.defender.side !== student;
      const text = keyDefenderLine(plan, mine, true, fen);
      const squares = defenderSquares(plan);
      return fact({ key: plan.key, claims: [plan.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, role: 'teach' });
    }),
    computer: 'keyDefenderPlan',
    kind: 'trade',
    phase: ANY,
    surfaces: {
      chat: { wired: 'services/groundedAnswer.ts' },
      lesson: { not: 'a lesson says the trade as the move that makes it (keyDefender)' },
      review: { not: 'Review says the trade as the move that makes it (keyDefender)' },
      learn: { not: 'Learn says the trade as the move that makes it (keyDefender, through the one composer)' },
      play: PLAY_ASK,
      tactics: { not: 'a puzzle poses one tactic; trading off a key defender is a game move\'s plan' },
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
      think: { not: 'owed — the step board reads the composer, not the standing read' },
    },
  },
  positionRead: {
    // Every observation, both sides, most urgent first; the asker decides how
    // far down the list to read. The key carries the observation's own kind
    // (`positionReadKind`).
    read: ({ fen, student }, fact) => safe(() => {
      const obs = readPosition(fen, student === 'w' ? 'white' : 'black');
      if (obs.length === 0) return null;
      return obs.map((o) => {
        const squares = [...(o.squares ?? [])];
        return fact({ key: `${o.kind}|${o.key}`, claims: [o.key, ...(o.aliases ?? [])], text: o.text, proof: squaresProof(o.text, squares) ?? NO_PROOF.description, squares, stakes: null,
          seat: o.side === 'student' ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
      });
    }),
    computer: 'readPosition',
    kind: 'structure-plan',
    phase: ANY,
    surfaces: {
      chat: { wired: 'services/groundedAnswer.ts' },
      play: { wired: 'services/positionFacts.ts' },
      lesson: LESSON_READ,
      review: { not: 'Review walks moves; the standing read answers an asked question' },
      learn: { wired: 'services/positionFacts.ts' },
      tactics: TACTICS_COMPOSER,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
      think: { not: 'owed — the step board reads the composer' },
    },
  },
  kingExposure: {
    read: ({ fen, side, student, owner }, fact) => safe(() => {
      const exposure = detectKingExposure(fen, side);
      if (!exposure) return null;
      const clause = kingExposureClause(exposure);
      const lead = side === student ? 'Your king' : 'Their king';
      // kingExposureClause is written third-person; chat fronts it with the owner.
      const text = owner ? (clause ? `${lead}: ${clause}` : `${lead} is reasonably safe.`) : clause;
      if (!text) return null;
      const key = `exposure:${side}`;
      return fact({ key, claims: [key], text, proof: NO_PROOF.description, squares: [exposure.kingSquare, ...exposure.attackerSquares], stakes: null,
        seat: side === student ? 'opponent' : 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen,
        // Your own king's shelter is the skill the board asks you to keep.
        ...(side === student ? { skill: 'weakened-king-safety' } : {}) });
    }),
    computer: 'detectKingExposure',
    kind: 'king',
    phase: ANY,
    surfaces: {
      chat: { wired: 'services/groundedAnswer.ts' },
      play: { wired: 'services/positionFacts.ts' },
      lesson: LESSON_READ,
      review: { not: 'owed — Review reads the king through its own walk' },
      learn: { wired: 'services/positionFacts.ts' },
      tactics: TACTICS_COMPOSER,
      weaknesses: { wired: 'services/moveInsight.ts' },
      think: { not: 'owed — the step board reads the composer' },
    },
  },
  shelterCracked: {
    read: ({ fen, student }, fact) => safe(() => {
      const exp = detectKingExposure(fen, student === 'w' ? 'b' : 'w');
      if (!exp || exp.missingShield < 2) return null;
      const text = `Their shelter is cracked — ${exp.missingShield === 3 ? 'all three' : `${countWord(exp.missingShield)} of the three`} pawns in front of the king are gone.`;
      const key = `shelter:${student === 'w' ? 'b' : 'w'}`;
      return fact({ key, claims: [key], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'detectKingExposure',
    kind: 'king',
    phase: ANY,
    surfaces: {
      chat: { wired: 'services/groundedAnswer.ts' },
      play: PLAY_ASK,
      lesson: { not: 'a lesson composes each move from the move\'s own facts' },
      review: { not: 'owed — Review reads the king through its own walk' },
      learn: { not: 'owed — Learn reaches it through the composer (positionFacts)' },
      tactics: TACTICS_NA,
      weaknesses: { not: 'their king\'s cracked shelter: an opportunity the move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost' },
      think: { not: 'owed — the step board reads the composer' },
    },
  },
  trappedPiece: {
    // A rook or queen with no safe square, either side.
    read: ({ fen, student, lineUci }, fact) => safe(() => {
      const enemy: Color = student === 'w' ? 'b' : 'w';
      const out: CoachFact[] = [];
      const theirs = findTrappedPiece(fen, enemy, lineUci);
      if (theirs) {
        const text = `Their ${theirs.piece} on ${theirs.square} is trapped — attacked by the ${theirs.attackerPiece} on ${theirs.attackerSquare}, and every escape square is covered. It's coming off the board.`;
        const squares = [theirs.square, theirs.attackerSquare];
        out.push(fact({ key: `trapped:${theirs.square}`, claims: [`trapped:${theirs.square}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: exchangeStakes(fen, [theirs.square]),
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen, skill: 'missed-your-trapped-piece' }));
      }
      const mine = findTrappedPiece(fen, student, lineUci);
      if (mine) {
        const text = `Careful — your ${mine.piece} on ${mine.square} is trapped: attacked by the ${mine.attackerPiece} on ${mine.attackerSquare} with no safe square. Look for the cheapest way out.`;
        const squares = [mine.square, mine.attackerSquare];
        out.push(fact({ key: `trapped:${mine.square}`, claims: [`trapped:${mine.square}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: exchangeStakes(fen, [mine.square]),
          seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, skill: 'hung-material' }));
      }
      return out.length ? out : null;
    }),
    computer: 'findTrappedPiece',
    kind: 'trapped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  worstPiece: {
    read: ({ fen, student, movedTo }, fact) => safe(() => {
      const wish = pieceWish(fen, student, movedTo);
      if (!wish) return null;
      const squares = [wish.square, ...wish.via, wish.target];
      return fact({ key: `wish:${wish.square}:${wish.target}`, claims: [`wish:${wish.square}`], text: wish.text, proof: squaresProof(wish.text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'pieceWish',
    kind: 'worst',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost — the record needs the played move to say whether it was taken' },
    },
  },
  passerPush: {
    read: ({ fen, student, pushed }, fact) => safe(() => {
      const passer = describeStructure(fen)?.pawns.passedPawns[student][0] ?? null;
      if (!passer || passer === pushed) return null;
      const note = passedPawnPush(fen, student, passer);
      if (!note) return null;
      const text = `${openSentence(note)}.`;
      return fact({ key: `passer:${passer}`, claims: [`passer:${passer}`], text, proof: squaresProof(text, [passer]) ?? NO_PROOF.description, squares: [passer], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'passedPawnPush',
    kind: 'passer',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it, so held cannot be read off the cost — the record needs the played move to say whether it was taken' },
    },
  },
  minority: {
    // A minority attack, either side.
    read: ({ fen, student }, fact) => safe(() => {
      const enemy: Color = student === 'w' ? 'b' : 'w';
      const out: CoachFact[] = [];
      const mine = findMinorityAttack(fen, student);
      if (mine) {
        const text = `You have a minority attack on the ${mine.flank} — ${mine.leverSan} makes contact and leaves them a weak pawn on ${mine.target}.`;
        out.push(fact({ key: `minority:${student}:${mine.target}|${mine.leverSan}`, claims: [`minority:${mine.target}`], text, proof: squaresProof(text, [mine.target]) ?? NO_PROOF.description, squares: [mine.target], stakes: null,
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      const theirs = findMinorityAttack(fen, enemy);
      if (theirs) {
        const text = `They have a minority attack on the ${theirs.flank} — ${theirs.leverSan} is the lever, leaving you a weak pawn on ${theirs.target} to watch.`;
        out.push(fact({ key: `minority:${enemy}:${theirs.target}|${theirs.leverSan}`, claims: [`minority:${theirs.target}`], text, proof: squaresProof(text, [theirs.target]) ?? NO_PROOF.description, squares: [theirs.target], stakes: null,
          seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      return out.length ? out : null;
    }),
    computer: 'findMinorityAttack',
    kind: 'minority',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
    },
  },
  colourComplex: {
    // A weak colour complex, either side: two holes are named, more are
    // counted and lit.
    read: ({ fen, student }, fact) => safe(() => {
      const enemy: Color = student === 'w' ? 'b' : 'w';
      const all = findColorComplexWeakness(fen);
      const out: CoachFact[] = [];
      const theirs = all.find((cc) => cc.side === enemy);
      if (theirs) {
        const sqs = theirs.squares.length <= 2 ? listAnd([...theirs.squares]) : `${countWord(theirs.squares.length)} squares`;
        const text = `Their ${theirs.complex} squares are weak: ${sqs} ${theirs.squares.length === 1 ? 'is a hole' : 'are holes'} no bishop of theirs covers. ${theirs.by === 'knight' ? 'A knight belongs on one' : 'Your bishop can work on them'}.`;
        out.push(fact({ key: `complex:${enemy}:${theirs.complex}`, claims: [`complex:${enemy}:${theirs.complex}`], text, proof: squaresProof(text, theirs.squares) ?? NO_PROOF.description, squares: [...theirs.squares], stakes: null,
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      const mine = all.find((cc) => cc.side === student);
      if (mine) {
        const text = mine.squares.length <= 2
          ? `Your ${mine.complex} squares are weak: with no bishop of that colour, no pawn or bishop of yours can cover ${listAnd([...mine.squares])}.`
          : `Your ${mine.complex} squares are weak: with no bishop of that colour, ${countWord(mine.squares.length)} of them have no pawn or bishop of yours to cover them.`;
        out.push(fact({ key: `complex:${student}:${mine.complex}`, claims: [`complex:${student}:${mine.complex}`], text, proof: squaresProof(text, mine.squares) ?? NO_PROOF.description, squares: [...mine.squares], stakes: null,
          seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      return out.length ? out : null;
    }),
    computer: 'findColorComplexWeakness',
    kind: 'complex',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
    },
  },
  raceOfPlans: {
    read: ({ fen, student }, fact) => safe(() => {
      const race = planRaceClause(fen, student, 'review');
      if (!race) return null;
      const text = `${openSentence(race)}.`;
      return fact({ key: `race:${fen.split(' ')[0]}`, claims: ['plan-race'], text, proof: planRaceProof(fen, student) ?? NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'planRaceClause',
    kind: 'plan-race',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
    },
  },
  theirCost: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const cost = theirMoveCost(fenBefore, san, student);
      if (!cost) return null;
      const after = boardAfter(fenBefore, san) ?? fenBefore;
      // ONE HOLE, ONE KEY: a hole is said under `hole:<sq>` by every computer
      // that names it, so the opening story's line and this one are one claim.
      const claim = cost.kind === 'hole' && cost.squares[0] ? holeKey(cost.squares[0]) : `cost-${cost.kind}-${cost.squares[0]}`;
      return fact({ key: `${cost.kind}:${cost.squares.join('-')}`, claims: [claim], text: cost.text, proof: NO_PROOF.description, squares: [...cost.squares], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: after, role: 'teach',
        ...(cost.heldText ? { heldForm: { text: cost.heldText, proof: NO_PROOF.description, squares: cost.squares.slice(0, 1), points: 'misplaced-piece' } } : {}) });
    }),
    computer: 'theirMoveCost',
    kind: 'their-cost',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/learnBoardTeaching.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'what their move gave up — no question of the student\'s posed' },
    },
  },
  threatStopped: {
    // What their reply was for: the threat of the student's it took away.
    read: ({ studentFenBefore, studentFenAfter, reply, student }, fact) => safe(() => {
      const stop = threatStoppedBy(studentFenBefore, studentFenAfter, reply, student);
      if (!stop) return null;
      const replySquares = ((): string[] => { try { const m = new Chess(studentFenAfter).move(reply); return [m.from, m.to]; } catch { return []; } })();
      const squares = [stop.threat.from, stop.threat.landing, ...replySquares.slice(1)];
      const flipped = flipSideToMove(studentFenAfter);
      return fact({ key: `stopped:${stop.threat.san}:${reply}`, claims: [`stopped:${stop.threat.landing}`], text: stop.text, proof: squaresProof(stop.text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: studentFenAfter,
        lines: [{ fen: studentFenAfter, sans: [reply] }, ...(flipped ? [{ fen: flipped, sans: [stop.threat.san] }] : [])] });
    }),
    computer: 'threatStoppedBy',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'what a move was for — no question of the student\'s posed' },
    },
  },
  playItAnyway: {
    read: ({ studentFenBefore, studentFenAfter, reply, fenNow, lines, student }, fact) => safe(() => {
      const stop = threatStoppedBy(studentFenBefore, studentFenAfter, reply, student);
      const any = stop && lines.length > 0 ? playItAnyway(stop, fenNow, lines, student) : null;
      if (!any) return null;
      const proof = lineProof({ fen: fenNow, sans: any.line }, lineSeatAt(fenNow, student));
      if (!proof) return null;
      return fact({ key: `anyway:${any.san}`, claims: [`anyway:${any.san}`], text: any.text, proof, squares: [...any.squares], stakes: null,
        seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen: fenNow, lines: [{ fen: fenNow, sans: any.line }] });
    }),
    computer: 'playItAnyway',
    kind: 'prevent-test',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'what a move was for — no question of the student\'s posed' },
    },
  },
  trickSidestepped: {
    // The fork trick a quiet move took off the board, either seat.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const mover: Color = new Chess(fenBefore).turn();
      const trick = trickSidestepped(fenBefore, san, mover, mover === student ? 'their' : 'your');
      if (!trick) return null;
      return fact({ key: `trick:${san}:${trick.squares.join('-')}`, claims: [`trick:${trick.squares[0] ?? san}`], text: trick.text, proof: squaresProof(trick.text, trick.squares) ?? NO_PROOF.description, squares: [...trick.squares], stakes: null,
        seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore, lines: [trick.line] });
    }),
    computer: 'trickSidestepped',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'what a move was for — no question of the student\'s posed' },
    },
  },
  theirHabit: {
    read: ({ history, student, sound }, fact) => safe(() => {
      const side: Color = student === 'w' ? 'b' : 'w';
      const hs: Array<{ kind: string; text: string }> = [...opponentHabits(history, side, sound)];
      // THE TEMPO COMPUTER (`tempoCount`, census P2 #7): their piece moved
      // again while the student develops — said with the habits, before the
      // count of their pieces still at home.
      const t = tempoCount(history, student);
      if (t) {
        const at = hs.findIndex((h) => h.kind === 'undeveloped');
        hs.splice(at < 0 ? hs.length : at, 0, { kind: 'tempo', text: t.text });
      }
      if (hs.length === 0) return null;
      return hs.map((h) => fact({ key: `theirHabit:${h.kind}`, claims: [`habit:their:${h.kind}`], text: h.text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenOfGame(history) }));
    }),
    computer: 'opponentHabits',
    kind: 'their-habit',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: { not: 'a habit is read across a game; a step board is one position' },
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'a reading of the game — no question of the student\'s posed' },
    },
  },
  yourHabit: {
    read: ({ history, student, sound }, fact) => safe(() => {
      const side: Color = student;
      const hs = habitsOf(history, side, 'your', sound);
      if (hs.length === 0) return null;
      return hs.map((h) => fact({ key: `yourHabit:${h.kind}`, claims: [`habit:your:${h.kind}`], text: h.text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenOfGame(history) }));
    }),
    computer: 'habitsOf',
    kind: 'your-habit',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: { not: 'a habit is read across a game; a step board is one position' },
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'a reading of the game — no question of the student\'s posed' },
    },
  },
  knownAttack: {
    read: ({ fen, student, studentCp }, fact) => safe(() => {
      const ka = knownAttack(fen, student, studentCp);
      if (!ka) return null;
      return fact({ key: ka.claim, claims: [ka.claim], text: ka.text, proof: ka.proof, squares: [...ka.squares], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'knownAttack',
    kind: 'attack-pattern',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the game — no question of the student\'s posed' },
    },
  },
  theirRead: {
    read: ({ fenBefore, san, student, lines, prev, flagged }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const out = readTheirMove({ fenBefore, san, student, topLines: lines, prev, theirMoveFlagged: flagged })
        .filter((r) => READ_FACT_KIND[r.kind] === 'their-read')
        .map((r) => fact({ key: `${r.kind}|${r.claim}`, claims: [r.claim], text: r.text, proof: r.proof, squares: [...r.squares], stakes: r.stakes ?? null,
          seat: 'opponent', namesStudentMove: r.namesMove, thread: LOCAL_THREAD, fen: fenAfter }));
      return out.length ? out : null;
    }),
    computer: 'readTheirMove',
    kind: 'their-read',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of their move — no question of the student\'s posed' },
    },
  },
  theirPreventTest: {
    read: ({ fenBefore, san, student, lines, prev, flagged }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const out = readTheirMove({ fenBefore, san, student, topLines: lines, prev, theirMoveFlagged: flagged })
        .filter((r) => READ_FACT_KIND[r.kind] === 'prevent-test')
        .map((r) => fact({ key: `${r.kind}|${r.claim}`, claims: [r.claim], text: r.text, proof: r.proof, squares: [...r.squares], stakes: r.stakes ?? null,
          seat: 'opponent', namesStudentMove: r.namesMove, thread: LOCAL_THREAD, fen: fenAfter }));
      return out.length ? out : null;
    }),
    computer: 'readTheirMove',
    kind: 'prevent-test',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of their move — no question of the student\'s posed' },
    },
  },
  theirTrigger: {
    read: ({ fenBefore, san, student, lines, prev, flagged }, fact) => safe(() => {
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const out = readTheirMove({ fenBefore, san, student, topLines: lines, prev, theirMoveFlagged: flagged })
        .filter((r) => READ_FACT_KIND[r.kind] === 'their-trigger')
        .map((r) => fact({ key: `${r.kind}|${r.claim}`, claims: [r.claim], text: r.text, proof: r.proof, squares: [...r.squares], stakes: r.stakes ?? null,
          seat: 'opponent', namesStudentMove: r.namesMove, thread: LOCAL_THREAD, fen: fenAfter }));
      return out.length ? out : null;
    }),
    computer: 'readTheirMove',
    kind: 'their-trigger',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of their move — no question of the student\'s posed' },
    },
  },
  timing: {
    // A quiet move played at the right moment (a capture or a check is its
    // own reason, run J 2026-09-30).
    read: ({ fenBefore, san, history, student }, fact) => safe(() => {
      if (/[x+#]/.test(san) || history.length < 2) return null;
      const early = new Chess();
      for (const m of history.slice(0, -2)) early.move(m);
      const t = readTiming(early.fen(), fenBefore, san);
      if (!t) return null;
      const to = new Chess(fenBefore).move(san).to;
      const text = `${timingClause(t)}.`;
      const mover: Color = new Chess(fenBefore).turn();
      return fact({ key: `timing:${san}`, claims: [`timing:${san}`], text, proof: squaresProof(timingClause(t), [to, t.square]) ?? NO_PROOF.stated, squares: [to, t.square], stakes: null,
        seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'readTiming',
    kind: 'timing',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  bluff: {
    read: ({ fenBefore, san, reply, student }, fact) => safe(() => {
      if (new Chess(fenBefore).turn() === student) return null;
      const b = detectBluff(fenBefore, san, reply);
      if (!b) return null;
      const opening = Number(fenBefore.split(' ')[5] ?? '1') <= 10;
      const text = `${bluffClause(b, opening)}.`;
      const squares = [b.square, ...b.targets.map((x) => x.square)];
      return fact({ key: `bluff:${san}:${b.square}`, claims: [`bluff:${b.square}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'detectBluff',
    kind: 'bluff',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  newThreat: {
    read: ({ fenBefore, fenAfter, mover, student, answerSan }, fact) => safe(() => {
      const t = detectNewThreat(fenBefore, fenAfter, mover);
      if (!t) return null;
      const mine = mover === student;
      const prevention = !mine && answerSan ? describeThreatPrevention(fenAfter, t, answerSan, mover) : null;
      const text = mine
        ? `${openSentence(`you're now threatening ${t.san} — it ${t.detail}`)}.`
        : `Careful — their move threatens ${t.san}: it ${t.detail}.${prevention ? ` The answer: ${prevention}.` : ''}`;
      // The proof is the geometry: the piece, where it lands, what it hits.
      const squares = [t.from, t.landing, ...t.targetSquares];
      return fact({ key: `${t.san}|${t.kind}|${t.landing}|${[...t.targetSquares].sort().join(',')}`, claims: [`threat:${t.landing}`], text,
        proof: squaresProof(text, squares) ?? NO_PROOF.description, squares,
        // The threat cashes on the threatener's next move: two plies away.
        stakes: t.kind === 'mate'
          ? mateStakes(mine ? 'you' : 'them', 2, false)
          : t.kind === 'fork'
            ? { points: forkPoints(piecesOn(fenAfter, t.targetSquares)), plies: 2 }
            : { points: t.rank, plies: 2 },
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter,
        marks: { theirs: { from: t.from, to: t.landing } } });
    }),
    computer: 'detectNewThreat',
    kind: 'threat',
    phase: ANY,
    surfaces: {
      lesson: { not: 'the lesson composer reads the new threat inside its move aspects (`reviewMoveBriefing`)' },
      review: REVIEW, play: PLAY_ASK, chat: { not: 'chat answers a threat through its own threat lane (`groundedAnswer`)' },
      think: { not: 'the thinking steps read the threat inside the move aspects' },
      learn: { not: 'Learn reads the new threat through its threat lane and the move aspects' },
      tactics: TACTICS_NA,
      weaknesses: { not: 'what a move threatens — the miss is filed by the threat lane' },
    },
  },
  // THE ONE FACT SET'S READS (the basket, 2026-11-19: "We are unifying the
  // computers so all surfaces can use them"). Each reads one computer on one
  // move and says it with the surface's writer settings (`MoveWords`): its
  // seat, its tense and whether it may name the move — never a second copy of
  // the sentence. Each fact carries its idea, weight and extra on its key
  // (`thoughtKey`); its place is the kind its computer stated (`moveIdeaFact`).
  moveAspect: {
    // THE BRIEFING'S ASPECTS — the threat, the material, the trade, the tactic,
    // the check, the promotion, the king cover, the structure made or conceded
    // — or the mate. A capture's gain is said only when it stands in every
    // line that follows (task 172). The long horizon is a fixed phrase: said
    // with its first two changes of its kind (the WHY rule). The threat's
    // square rides the tag (the binding reads it as the move's own point).
    read: ({ words: w, prev, follow, phrases }, fact) => safe(() => {
      const r = moveAspects({ fenBefore: w.fenBefore, san: w.san, prev, moverIsStudent: w.moverIsStudent, follow });
      if (!r) return null;
      if (r.mate) {
        const who = w.moverIsStudent === undefined ? 'This delivers' : w.moverIsStudent ? 'You deliver' : 'They deliver';
        return moveIdeaFact(fact, w, { kind: 'checkmate', idea: 'mate', weight: 100, text: `${who} checkmate — the king has no reply`, squares: [] });
      }
      return r.aspects.flatMap((a) => {
        const verb = a.horizon && horizonSaid(phrases, a.kind) ? `${a.verb}${a.horizon}` : a.verb;
        const f = moveIdeaFact(fact, w, { kind: a.kind, idea: a.idea, weight: a.weight, text: moveLead(w, verb), alsoText: `It also ${verb}`, squares: a.squares, restates: a.restates === true, tag: a.kind === 'aspect-threat' ? a.squares[0] ?? '' : '' });
        return f ? [f] : [];
      });
    }),
    computer: 'moveAspects',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveThreatDeep: {
    // WHAT THE MOVE THREATENS, DEEPER (fix 3, 2026-11-13): a threat two or
    // three moves long (Bg5 → Bxf6 and cxd5), read off the null-move line.
    read: ({ words: w, reads, student }, fact) => safe(() => {
      const t = moveThreat(w.fenBefore, w.san, reads, student);
      if (!t) return null;
      const mate = /^threatens mate/.test(t.clause);
      return moveIdeaFact(fact, w, { kind: 'aspect-threat', idea: mate ? 'mate' : 'threat', weight: mate ? 94 : 86, text: moveLead(w, t.clause), alsoText: `It also ${t.clause}`, squares: t.squares });
    }),
    computer: 'moveThreat',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveAllows: {
    // WHAT A COSTLY MOVE ALLOWS (fix 1, 2026-11-13): the line that punishes
    // it — the one cost computer every surface grades with (`costReason`),
    // worded by its one renderer, both seats from the student's.
    read: ({ words: w, student, costCp, after, against }, fact) => safe(() => {
      const earlier = after.earlier?.moves;
      const r = costReason({
        fenBefore: w.fenBefore, playedSan: w.san, mover: sideToMove(w.fenBefore), student, costCp,
        after: { uci: after.moves, source: 'deep', seconds: earlier && earlier.length > 0 ? [earlier] : [] },
        before: null, priorMove: null, against,
      });
      const clause = r ? allowedClause(r, student) : null;
      if (!r || !clause) return null;
      const sq = r.plies.slice(0, r.blowPlies).map((p) => p.uci.slice(2, 4));
      return moveIdeaFact(fact, w, { kind: 'consequence', idea: r.mate ? 'mate' : 'win-material', weight: 92, text: moveLead(w, clause), alsoText: `It ${clause}`, squares: sq, extraClaims: [`allows:${r.plies[0]?.uci ?? ''}`] });
    }),
    computer: 'allowedClause',
    kind: 'consequence',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveJobRead: {
    // THE MOVE'S JOB, from the speaker's seat; a take-back reads the capture
    // before it. A JOB SAID MANY TIMES A LESSON OR A GAME ROTATES ITS WORDS
    // (v5 re-run 2026-10-29), and the context that makes a guard matter is
    // said with its first guard only. A job that says the check carries the
    // check's claim; a castling made ready carries that claim.
    read: ({ words: w, theirLast, follow, phrases }, fact) => safe(() => {
      const prior = (() => {
        if (!theirLast || !/x/.test(theirLast.san)) return null;
        try { const pm = new Chess(theirLast.fenBefore).move(theirLast.san); return pm.captured ? { to: pm.to, captured: pm.captured, promoted: !!pm.promotion } : null; } catch { return null; }
      })();
      const job = moveJob(w.fenBefore, w.san, sideToMove(w.fenBefore), w.moverIsStudent !== false ? MINE : THEIRS, prior, follow);
      if (!job) return null;
      const m = new Chess(w.fenBefore).move(w.san);
      const worded = job.contextKey && job.compact
        ? sayIdea(phrases, `job-context:${job.contextKey}`, [job.clause, job.compact])
        : job.forms?.length ? sayIdea(phrases, `job-kind:${job.kind}`, job.forms) : job.clause;
      const clause = worded.replace(/^it\s+/i, '');
      const saysCheck = /^gives check\b/.test(clause);
      const idea: IdeaKind = job.clause === 'it gives check' ? 'check' : BOOK_JOB_IDEA[job.kind];
      return moveIdeaFact(fact, w, { kind: 'move-job', idea, weight: JOB_WEIGHT[job.kind], text: moveLead(w, clause), alsoText: `It also ${clause}`, squares: job.squares, restates: isBareJob(job), extraClaims: [
        ...(saysCheck ? [`move:${m.from}${m.to}:${ideaClaim('check', [])}`] : []),
        ...(job.prepsCastle ? [castlePrepClaim(m.from, m.to)] : []),
      ] });
    }),
    computer: 'moveJob',
    kind: 'move-job',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveFundamentals: {
    // THE FUNDAMENTALS — worded from the mover's own seat ("saves the queen
    // from their bishop"), their move's turned to the student's. A push the
    // rule calls prepared is one a line goes on to play (task 172); developing
    // with tempo is a tempo; a stock phrase is taught in full once a lesson.
    read: ({ words: w, follow }, fact) => safe(() => {
      const fenAfter = boardAfter(w.fenBefore, w.san);
      if (!fenAfter) return null;
      const seated = (clause: string): string => (w.moverIsStudent !== false ? clause : toOtherSeat(clause));
      const out: CoachFact[] = [];
      for (const f of computeMoveFundamentals(w.fenBefore, w.san, sideToMove(w.fenBefore) === 'w' ? 'white' : 'black')) {
        if (f.id === 'prepare-break' && f.names && follow.length > 0 && !follow.some((line) => linePlays(fenAfter, line, f.names as { from: string; to: string }))) continue;
        const idea: IdeaKind = f.id === 'development' && f.forcing ? 'tempo' : FUNDAMENTAL_IDEA[f.id];
        const made = moveIdeaFact(fact, w, { kind: 'fundamental', idea, weight: f.weight, text: moveLead(w, seated(f.led)), alsoText: `It also ${seated(f.led)}`, squares: f.squares, extraClaims: STOCK_PHRASE.has(idea) ? [`phrase:${idea}`] : [] });
        if (made) out.push(made);
      }
      return out;
    }),
    computer: 'computeMoveFundamentals',
    kind: 'fundamental',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  theirAim: {
    // WHAT THEIR MOVE AIMS AT, on their move (WO-STORY-MATRIX-01 P1-9) — only
    // an aim the student has to answer: a piece that really falls
    // (`computeMustDefend`, SEE-checked). When the reply in the line answers
    // it, the reply's binding says the aim and the answer in one breath.
    read: ({ words: w, line, plainSeen }, fact) => safe(() => {
      const fenAfter = boardAfter(w.fenBefore, w.san);
      const aim = theirTarget({ fenBefore: w.fenBefore, san: w.san }, true, plainSeen);
      if (!aim || !fenAfter) return null;
      if (!computeMustDefend(fenAfter, sideToMove(fenAfter)).pieces.some((p) => p.square === aim.square)) return null;
      if (replyAnswers(fenAfter, line, aim)) return null;
      return moveIdeaFact(fact, w, { kind: 'opp-target', idea: 'threat', weight: 45, text: openSentence(aim.text), alsoText: openSentence(aim.text), squares: [aim.square, aim.by], extraClaims: [`aim:${aim.by}:${aim.square}`] });
    }),
    computer: 'theirTarget',
    kind: 'opp-target',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  outFirst: {
    // A PIECE OUT BEFORE ITS PAWN SHUTS IT IN (gap B1): "…Bf5 comes out before
    // …e6, which would shut the bishop in", read off the line that follows.
    // Said as theory teaches it, the question first (gap E1), rotated on the
    // board — a sentence of its own step, never a second intro of the move.
    read: ({ words: w, line }, fact) => safe(() => {
      const o = pieceOutFirst(w.fenBefore, w.san, line);
      if (!o) return null;
      const also = rotateStem([
        `The ${o.piece} comes out before ${o.pawn}, which would have shut it in`,
        `Why not ${o.pawn} first? It would have shut the ${o.piece} in`,
      ], stemKeyOf(`${w.fenBefore}|${w.san}`));
      return moveIdeaFact(fact, w, { kind: 'move-order', idea: 'order', weight: 72, text: also, alsoText: also, squares: o.squares, extraClaims: [`out-first:${o.squares.join('')}`] });
    }),
    computer: 'pieceOutFirst',
    kind: 'move-order',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  orderFirst: {
    // THE ORDER, READ OFF THE BOARD (gap B1): the mover's next move in the
    // line, played first, would let them pin, fork or kick — said only when
    // the engine agrees it is worse (`orderMatters`). One claim with the stop
    // on the same reply: the stop says it.
    read: ({ words: w, line, fan }, fact) => safe(() => {
      const order = orderByThreat(w.fenBefore, w.san, line, w.moverIsStudent !== false, followPvOf(w.fenBefore, line[1], fan));
      if (!order || !orderMatters(w.fenBefore, w.san, order.follow, fan)) return null;
      const does = order.would.replace(/^would (\w+)/, (_m, v: string) => `${v}s`);
      const said = rotateStem([
        `Why not ${order.follow} first? It would allow ${order.answer}, which ${does}`,
        `The order matters: ${order.follow} straight away would allow ${order.answer}, which ${does}`,
      ], stemKeyOf(`${w.fenBefore}|${w.san}|order`));
      return moveIdeaFact(fact, w, { kind: 'move-order', idea: 'order', weight: 72, text: said, alsoText: said, squares: order.squares, extraClaims: [`order-board:${order.follow}>${order.answer}`, `stops:${order.answer}`] });
    }),
    computer: 'orderByThreat',
    kind: 'move-order',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  desperadoMove: {
    // TWO PIECES HANGING: SELL THE ONE YOU CANNOT SAVE (desperado, Danya
    // 1Rejj): the engine's best move is a capture by one of two hanging pieces.
    read: ({ words: w, bestUci }, fact) => safe(() => {
      const d = desperadoAt(w.fenBefore, w.san, bestUci);
      if (!d) return null;
      return moveIdeaFact(fact, w, { kind: 'defence-idea', idea: 'rescue', weight: 66, text: desperadoLine(d, w.moverIsStudent !== false ? 'your' : 'their', w.fenBefore), squares: [d.from, d.to, ...(d.other ? [d.other.square] : [])], extraClaims: [`desperado:${d.from}${d.to}`] });
    }),
    computer: 'desperadoAt',
    kind: 'defence-idea',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  emptyCheckMove: {
    // A CHECK THAT GOES NOWHERE (Danya Ytkf3): it cost half a pawn and the
    // engine's answer is a block or a king step.
    read: ({ words: w, costCp, replyUci }, fact) => safe(() => {
      const e = emptyCheckAt(w.fenBefore, w.san, costCp, replyUci);
      if (!e) return null;
      return moveIdeaFact(fact, w, { kind: 'method', idea: 'check', weight: 58, text: emptyCheckLine(e, w.moverIsStudent !== false ? 'your' : 'their', w.fenBefore), squares: e.squares, extraClaims: [`empty-check:${e.squares.join('')}`] });
    }),
    computer: 'emptyCheckAt',
    kind: 'method',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  transposition: {
    // TRANSPOSITION AND ANALOGY (gaps A7, A11): "this transposes into the
    // Exchange French"; "a reversed Sicilian". Every name is a real DB
    // position (the offline index).
    read: ({ words: w, history }, fact) => safe(() => {
      const fenAfter = boardAfter(w.fenBefore, w.san);
      if (!fenAfter) return null;
      const after = [...history, w.san];
      const to = new Chess(w.fenBefore).move(w.san).to;
      const into = transposedOpening(fenAfter, after.length, detectOpeningByOrder(after));
      const out: CoachFact[] = [];
      const t = into ? moveIdeaFact(fact, w, { kind: 'equivalence', idea: 'theory', weight: 44, text: moveLead(w, `transposes into the ${into}`), alsoText: `It transposes into the ${into}`, squares: [to], extraClaims: [`transposed:${into}`] }) : null;
      if (t) out.push(t);
      const mine = w.moverIsStudent !== false;
      const eq = openingEquivalence(after, mine === (sideToMove(w.fenBefore) === 'w') ? 'w' : 'b');
      const e = eq ? moveIdeaFact(fact, w, { kind: 'equivalence', idea: 'theory', weight: 42, text: eq.text, alsoText: eq.text, squares: eq.squares, extraClaims: [eq.claim] }) : null;
      if (e) out.push(e);
      return out;
    }),
    computer: 'openingEquivalence',
    kind: 'equivalence',
    phase: ANY,
    surfaces: { ...FACT_SET_SURFACES, think: THINK_BOOK },
  },
  mastersBreak: {
    // THE MASTERS' BREAK THE MOVE PREPARES (David 2026-10-27, "the a3
    // Sicilian": 2.a3 covers b4, and masters push b4 in 56% of their games):
    // the move's own job, read in the composer like every other.
    read: ({ words: w, history }, fact) => safe(() => {
      const prep = preparesBreakClause(w.fenBefore, w.san, storyPlanAfter([...history, w.san]), w.moverIsStudent !== false);
      if (!prep) return null;
      return moveIdeaFact(fact, w, { kind: 'move-job', idea: 'prepare', weight: 62, text: moveLead(w, prep.clause), alsoText: `It also ${prep.clause}`, squares: prep.squares, extraClaims: [`prepares-break:${prep.squares[1]}`] });
    }),
    computer: 'preparesBreakClause',
    kind: 'move-job',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  structureFormed: {
    // THE STRUCTURE BY NAME, WITH ITS PLANS (gap D1): said when the move
    // creates it, from the student's seat.
    read: ({ words: w }, fact) => safe(() => {
      const formed = namedStructureFormed(w.fenBefore, w.san);
      if (!formed) return null;
      const line = namedStructureLine(formed, (w.moverIsStudent !== false) === (sideToMove(w.fenBefore) === 'w') ? 'w' : 'b');
      return moveIdeaFact(fact, w, { kind: 'structure-plan', idea: 'structure', weight: 58, text: line, alsoText: line, squares: formed.squares, extraClaims: [`structure:${formed.name}`] });
    }),
    computer: 'namedStructureFormed',
    kind: 'structure-plan',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveCut: {
    // WHAT THE MOVE CUTS (gap B3): "Bd3 cuts the queen off from d4".
    read: ({ words: w }, fact) => safe(() => {
      const cut = lineCut(w.fenBefore, w.san, w.moverIsStudent !== false);
      if (!cut) return null;
      return moveIdeaFact(fact, w, { kind: 'aspect-own-weakness', idea: 'weakness', weight: 46, text: moveLead(w, `cuts ${cut.piece} off from ${cut.lost}`), alsoText: `It also cuts ${cut.piece} off from ${cut.lost}`, squares: cut.squares, extraClaims: [`cut:${cut.squares.join('')}`] });
    }),
    computer: 'lineCut',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveCage: {
    // THE CAGE (Danya, 32.e4: "e4 takes d5; the knight can only shuttle
    // between b6 and a8"): the move takes the squares their knight needs.
    read: ({ words: w }, fact) => safe(() => {
      const cage = pieceCage(w.fenBefore, w.san, w.moverIsStudent !== false);
      if (!cage) return null;
      return moveIdeaFact(fact, w, { kind: 'aspect-their-weakness', idea: 'prevent', weight: 62, text: moveLead(w, cage.clause), alsoText: `It also ${cage.clause}`, squares: cage.squares, extraClaims: [`cage:${cage.knight}`] });
    }),
    computer: 'pieceCage',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveStopsBreak: {
    // THEIR BREAK, STOPPED ("a5, stopping b4"): the pawn break their side
    // plays in master games from here, which the move makes lose material.
    read: ({ words: w, history }, fact) => safe(() => {
      const plan = storyPlanAfter(history);
      const theirBreak = plan ? (sideToMove(w.fenBefore) === 'w' ? plan.black : plan.white) : null;
      const brk = theirBreak ? stopsBreak(w.fenBefore, w.san, theirBreak.san, w.moverIsStudent !== false) : null;
      if (!brk) return null;
      return moveIdeaFact(fact, w, { kind: 'stop', idea: 'prevent', weight: 72, text: moveLead(w, brk.clause), alsoText: `It also ${brk.clause}`, squares: brk.squares, extraClaims: [`stops-break:${brk.san}`] });
    }),
    computer: 'stopsBreak',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  moveRoute: {
    // THE PIECE'S TRIP down the line that follows — not when the deep fact's
    // follow-up already walks it (`skipFrom`).
    read: ({ words: w, line, skipFrom }, fact) => safe(() => {
      const route = pieceRoute(w.fenBefore, w.san, line);
      if (!route || (skipFrom !== null && route.path.includes(skipFrom))) return null;
      return moveIdeaFact(fact, w, { kind: 'route', idea: 'route', weight: 52, text: moveGerund(w, route.text), alsoText: `It also ${route.verb}`, squares: route.path });
    }),
    computer: 'pieceRoute',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  followUpFirst: {
    // THE ORDER MATTERS (`moveOrder`, census #1): the mover's follow-up played
    // first would have run into an answer that costs material or mates — read
    // off the engine's line after this move and its line where the follow-up
    // came first. Both seats; the lesson shows its line, so the moves are named.
    read: ({ words: w, followFirst, line }, fact) => safe(() => {
      const seat = moveSeat(w);
      const mo = moveOrder(w.fenBefore, w.san, followFirst.uci, line, followFirst.line, seat, true);
      if (!mo) return null;
      const m = new Chess(w.fenBefore).move(w.san);
      const fenAfter = boardAfter(w.fenBefore, w.san) ?? w.fenBefore;
      const said = closeSentence(mo.text);
      const key = `order:${m.from}${m.to}>${mo.followUp.uci}`;
      return fact({ key, claims: [key], text: said, squares: mo.squares.filter((s) => s !== m.from && s !== m.to).filter((s, k, a) => a.indexOf(s) === k),
        stakes: costStakes(mo.costCp), proof: squaresProof(said, mo.squares) ?? NO_PROOF.description, seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter, altFen: w.fenBefore });
    }),
    computer: 'moveOrder',
    kind: 'move-order',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  takesAway: {
    // THE STOP: the other side's wanted pin, kick or fork, and this is the
    // move that stops it ("h3 takes away g4: Bg4 would pin your knight on f3").
    // BOTH SEATS: worded from the mover's seat, turned to the student's.
    read: ({ words: w }, fact) => safe(() => {
      const stop = findProphylaxis(w.fenBefore);
      if (!stop || stop.prevention.san.replace(/[+#]$/, '') !== w.san.replace(/[+#!?]+$/, '')) return null;
      const verb = stop.kind === 'pin' ? 'pin' : stop.kind === 'fork' ? 'fork' : 'hit';
      const raw = `${stop.intent.san} would ${verb} your ${POISON_NAME[stop.victim.piece] ?? 'piece'} on ${stop.victim.square}`;
      const why = w.moverIsStudent !== false ? raw : toOtherSeat(raw);
      return moveIdeaFact(fact, w, { kind: 'stop', idea: 'prevent', weight: 72, text: moveLead(w, `takes away ${stop.intent.to}: ${why}`), alsoText: `It also takes away ${stop.intent.to}: ${why}`, squares: stop.squares });
    }),
    computer: 'findProphylaxis',
    kind: 'point',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  gambitOffer: {
    // A GAMBIT (fix 4, 2026-11-13): what the move gives, what comes back along
    // the line that takes it, and the engine's verdict, said apart. The
    // square of the gift rides the tag (the opening's own line about it is
    // the same claim).
    read: ({ words: w, after, student, costCp }, fact) => safe(() => {
      const g = gambitIdea(w.fenBefore, w.san, after, student, costCp);
      if (!g) return null;
      return moveIdeaFact(fact, w, { kind: 'compensation', idea: 'eval', weight: 80, text: `${moveLead(w, g.clause)}. ${g.verdict}`, alsoText: `It ${g.clause}. ${g.verdict}`, squares: g.squares, extraClaims: [`gambit:${g.sans[0]}`], tag: g.captureSquare });
    }),
    computer: 'gambitIdea',
    kind: 'compensation',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  standingRead: {
    // THE STANDING WHEN THE MOVE CHANGED IT — Review's verdict and its board
    // reason, the one producer (`evalReading`). ONE STANDING IS ONE CLAIM.
    read: ({ words: w, student, before, after, lines }, fact) => safe(() => {
      const fenAfter = boardAfter(w.fenBefore, w.san);
      if (!fenAfter) return null;
      const pov = (cp: number): number => cp * (student === 'w' ? 1 : -1);
      const m = (() => { try { return new Chess(w.fenBefore).move(w.san); } catch { return null; } })();
      const text = evalReading(fenAfter, pov(before.evaluation), pov(after.evaluation), null, student, m ? { to: m.to, captured: m.captured ?? null } : null, lines);
      if (!text) return null;
      return moveIdeaFact(fact, w, { kind: 'eval', idea: 'eval', weight: 45, text, squares: [], extraClaims: [`standing:${signedBand(pov(after.evaluation))}`] });
    }),
    computer: 'evalReading',
    kind: 'eval',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  movePurpose: {
    // WHAT THE MOVE PREPARES, PROVEN, WITH THE RULE BEHIND IT
    // (WO-STORY-MATRIX-01 P1-9c): the follow-up the move made possible, read
    // against the null-move reads (`moveIntent`), and once a lesson the
    // principle that makes it worth it (`intentRule`), said on the board after
    // the reply (`ruleBoard`, with the rules the lesson has taught). A move
    // that loses big prepares nothing worth saying (3.Ke2?? "prepares Qe1").
    read: ({ words: w, reads, line, costCp, ruleBoard }, fact) => safe(() => {
      if (w.moverIsStudent === undefined) return null;
      if (reads.passBefore.length === 0 && reads.passAfter.length === 0) return null;
      const mover = sideToMove(w.fenBefore);
      const a0 = reads.after[0];
      const mated = !!a0 && a0.mate !== null && a0.mate !== undefined && (mover === 'w' ? a0.mate < 0 : a0.mate > 0);
      if (mated || (costCp !== null && costCp >= BLUNDER_CP)) return null;
      const seat = moveSeat(w);
      const lineAfter: string[] = [];
      if (w.tense === 'now' && line) {
        try { const c = new Chess(w.fenBefore); c.move(w.san); for (const s of line) { const m = c.move(s); lineAfter.push(`${m.from}${m.to}${m.promotion ?? ''}`); } } catch { /* the playable prefix */ }
      }
      const intent = moveIntent(w.fenBefore, w.san, lineAfter.length ? { ...reads, lineAfter } : reads, seat);
      if (!intent?.prepares) return null;
      const studentColor: 'white' | 'black' = (mover === 'w') === w.moverIsStudent ? 'white' : 'black';
      const rule = ruleBoard ? safe(() => intentRule(intent, ruleBoard.fen, studentColor, ruleBoard.taught)) : null;
      const text = rule ? `${intent.text.replace(/\.$/, '')} — ${rule.text}.` : intent.text;
      const kind = w.moverIsStudent ? 'point' : 'opponent-intent';
      const m = new Chess(w.fenBefore).move(w.san);
      const f = fact({ key: intent.prepares.uci, claims: [
        `purpose:prepares:${intent.prepares.uci}`,
        ...(/^O-O/.test(intent.prepares.san) ? [castlePrepClaim(m.from, m.to)] : []),
        ...(rule?.keys.map((k) => STORY_KEY.principle(k)) ?? []),
      ], text: closeSentence(text), squares: intent.squares, stakes: costStakes(intent.prepares.gainCp),
        proof: squaresProof(text, intent.squares) ?? NO_PROOF.description, seat, namesStudentMove: false, thread: LOCAL_THREAD, fen: w.fenBefore });
      return placedAs(f, kind, costStakes(intent.prepares.gainCp));
    }),
    computer: 'moveIntent',
    kind: 'point',
    phase: ANY,
    surfaces: { ...FACT_SET_SURFACES, review: { not: 'Review says the move\'s purpose through its own intent read' }, learn: { not: 'Learn says the move\'s purpose through its own intent lane' }, play: PLAY_ASK, tactics: TACTICS_NA, think: { not: 'a step board reads the move\'s own facts; the purpose is the lesson\'s and chat\'s' } },
  },
  onlyMoveRead: {
    // THE ONLY MOVE (gap B6): said with the next best and what it gives up —
    // never a bare "only move".
    read: ({ words: w, fan }, fact) => safe(() => {
      const m = new Chess(w.fenBefore).move(w.san);
      const only = onlyMove(w.fenBefore, `${m.from}${m.to}`, fan);
      if (!only) return null;
      return moveIdeaFact(fact, w, { kind: 'key-moment', idea: 'choice', weight: 66, text: moveLead(w, `is the only move that holds here — the next best, ${only.secondSan}, ${only.gives}`), alsoText: `It's the only move that holds here: the next best, ${only.secondSan}, ${only.gives}`, squares: [m.to], extraClaims: [`only:${m.from}${m.to}`] });
    }),
    computer: 'onlyMove',
    kind: 'key-moment',
    phase: ANY,
    surfaces: FACT_SET_SURFACES,
  },
  principle: {
    // The key carries what a surface keeps of the read: whether this is the
    // first statement of the rule this game (`1`) or a stem (`0`), whether it
    // leads the move (`h`), and the rule's id — `principleKey` reads it back.
    // Its full-again words behind a line that named the move ride `alsoText`.
    read: ({ fenBefore, san, student, taught, stemKey, namesPlayedMove }, fact) => safe(() => {
      // The rule the STUDENT's clean move kept — never said about their move
      // ("castle your king" over their castling).
      if (new Chess(fenBefore).turn() !== student) return null;
      const r = principleLine(fenBefore, san, student === 'w' ? 'white' : 'black', taught, stemKey, namesPlayedMove);
      if (!r) return null;
      const fen = boardAfter(fenBefore, san) ?? fenBefore;
      return fact({ key: `${r.first ? '1' : '0'}${r.headsMove ? 'h' : '-'}|${r.id}`, claims: [`rule:${r.id}`], text: r.text, proof: NO_PROOF.stated, squares: r.squares, stakes: null,
        seat: 'student', namesStudentMove: namesPlayedMove, thread: LOCAL_THREAD, fen, ...(r.names ? { marks: { play: r.names } } : {}), ...(r.follow ? { alsoText: r.follow } : {}) });
    }),
    computer: 'principleLine',
    kind: 'rule',
    phase: ANY,
    surfaces: {
      lesson: LESSON_READ,
      review: REVIEW, play: COMPOSER, chat: COMPOSER,
      think: { not: 'the rule a move kept is said once a game from the live read and Review, which hold the ledger of rules already taught' },
      learn: COMPOSER,
      tactics: TACTICS_COMPOSER,
      weaknesses: { not: 'a clean move\'s why — no question of the student\'s missed' },
    },
  },
  principleContrast: {
    read: ({ fenBefore, san, bestSan, student, taught, stemKey }, fact) => safe(() => {
      if (new Chess(fenBefore).turn() !== student) return null;
      const r = principleContrastLine(fenBefore, san, bestSan, student === 'w' ? 'white' : 'black', taught, stemKey);
      if (!r) return null;
      return fact({ key: `${r.first ? '1' : '0'}-|${r.id}`, claims: [`rule:${r.id}`], text: r.text, proof: NO_PROOF.stated, squares: r.squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'principleContrastLine',
    kind: 'rule',
    phase: ANY,
    surfaces: {
      lesson: LESSON_READ,
      review: REVIEW, play: COMPOSER, chat: COMPOSER,
      think: { not: 'the rule the better move kept is said once a game from the live read and Review, which hold the ledger of rules already taught' },
      learn: COMPOSER,
      tactics: TACTICS_COMPOSER,
      weaknesses: { not: 'a clean move\'s why — no question of the student\'s missed' },
    },
  },
  contrast: {
    read: ({ fenBefore, san, bestSan, student }, fact) => safe(() => {
      const strip = (x: string): string => x.replace(/[+#!?]+$/, '');
      if (strip(bestSan) === strip(san)) return null;
      const c = contrastMoves(fenBefore, san, bestSan);
      if (!c) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      // The piece it names must stand on that square on the REAL board after
      // the move played — the other candidate's board is hypothetical.
      const p = new Chess(fenAfter).get(c.square as Square);
      if (!p || p.type !== c.piece || p.color !== student) return null;
      const text = `${contrastClause(c, fenAfter, student, san)}.`;
      return fact({ key: `contrast:${san}:${bestSan}`, claims: [`contrast:${c.square}`], text, proof: squaresProof(text, [c.square]) ?? NO_PROOF.description, squares: [c.square], stakes: null,
        seat: 'student', namesStudentMove: true, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'contrastMoves',
    kind: 'contrast',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  oppositionRead: {
    // His "1.Kd6 meets with 1...Kd8, when it is Black who has the opposition":
    // the king move that takes it, what it forces, both seats.
    read: ({ fenBefore, san, student, afterCp }, fact) => safe(() => {
      const t = oppositionTaken(fenBefore, san);
      if (!t) return null;
      const text = oppositionLine(t.read, student, 'took', afterCp);
      const squares = oppositionSquares(t.read);
      return fact({ key: t.read.key, claims: [t.read.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: t.read.holder === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: t.fenAfter });
    }),
    computer: 'oppositionTaken',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...ENDING_SURFACES, play: PLAY_READ },
  },
  zugzwangRead: {
    // His "this straightforward move already places White in Zugzwang": the
    // move after which the side to move would rather pass, both seats.
    read: ({ fenBefore, san, student, after, passAfter }, fact) => safe(() => {
      const reads = after && passAfter && after.length > 0 && passAfter.length > 0 ? { lines: after, pass: passAfter } : null;
      const z = zugzwangMade(fenBefore, san, reads);
      if (!z) return null;
      const text = zugzwangSyncLine(z.read, student, true);
      const mover = new Chess(fenBefore).turn();
      return fact({ key: z.read.key, claims: [z.read.key], text, proof: zugzwangSyncProof(z.read, student), squares: [], stakes: null,
        seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: z.fenAfter });
    }),
    computer: 'zugzwangMade',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...ENDING_SURFACES, play: PLAY_READ },
  },
  theoreticalEnding: {
    // His "the bridge-building maneuver", "Black does not have opposition, and
    // a draw is inevitable": the named ending a move reaches, and its steps.
    read: ({ fenBefore, san, student, afterCp }, fact) => safe(() => {
      const m = theoreticalEndingMade(fenBefore, san, afterCp);
      if (!m) return null;
      const text = theoreticalEndingMadeLine(m, student);
      const squares = m.ending.squares;
      const mover = new Chess(fenBefore).turn();
      return fact({ key: `${m.ending.key}:${m.step}`, claims: [m.ending.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: m.fenAfter });
    }),
    computer: 'theoreticalEndingMade',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...ENDING_SURFACES, play: PLAY_READ },
  },
  raceCount: {
    // His "Black's king is too far away to stop White's advanced pawn" and
    // "the pawns promote simultaneously, but you know the rest": the race,
    // counted and played out, both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const r = raceCountMade(fenBefore, san);
      if (!r) return null;
      const text = raceCountLine(r.read, student);
      const squares = raceCountSquares(r.read);
      const proof = (r.read.line.length ? legalLineProof(r.fenAfter, r.read.line, lineSeatAt(r.fenAfter, student), true) : null) ?? squaresProof(text, squares) ?? NO_PROOF.description;
      const side = r.read.first ?? (r.read.runners.w ? 'w' : 'b');
      return fact({ key: r.read.key, claims: [r.read.key], text, proof, squares, stakes: null,
        seat: side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: r.fenAfter });
    }),
    computer: 'raceCountMade',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...ENDING_SURFACES, play: PLAY_READ },
  },
  promotionChoice: {
    // His "there are only two circumstances under which it makes sense to
    // underpromote": the piece made and why the queen fails, both seats.
    read: ({ fenBefore, san, student, before }, fact) => safe(() => {
      const p = promotionPlayed(fenBefore, san, before);
      if (!p) return null;
      const pc = p.choice;
      const text = p.queenMissed ? queenMissedLine(pc, student) : promotionChoiceLine(pc, student, true);
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const squares = [pc.from, pc.to];
      // The queen's trap keeps the stalemate trick's claim shape, so the
      // trick said before the move (a lesson's line) and this are one idea.
      const trapKey = pc.reason.kind === 'queen-trap' ? [`stalemate-trap:${pc.reason.trap.natural}:${pc.reason.trap.check}:${fenAfter.split(' ')[0]}`] : [];
      const proof = pc.reason.kind === 'queen-trap'
        ? legalLineProof(fenBefore, [pc.queenSan, pc.reason.trap.check, pc.reason.trap.capture], lineSeatAt(fenBefore, student), true) ?? NO_PROOF.description
        : squaresProof(text, squares) ?? NO_PROOF.description;
      return fact({ key: pc.key, claims: [pc.key, ...trapKey], text, proof, squares, stakes: null,
        seat: pc.side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'promotionPlayed',
    kind: 'technique',
    phase: ANY,
    surfaces: { ...ENDING_SURFACES, play: PLAY_READ },
  },
  keyDefender: {
    // His "exchanging your opponent's strongest (or most important) piece often
    // removes the cog that makes his position run": the defender doing a job
    // alone, and the trade that takes it off, both seats.
    read: ({ fenBefore, san, student, costCp, after }, fact) => safe(() => {
      const t = defenderTradeMade(fenBefore, san, costCp, after);
      if (!t) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = t.defender.side !== student;
      const text = keyDefenderLine(t, mine, false, fenBefore);
      const squares = defenderSquares(t);
      return fact({ key: t.key, claims: [t.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter, role: 'teach' });
    }),
    computer: 'defenderTradeMade',
    kind: 'trade',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  practicalChance: {
    // His "ask your opponent some questions; give him an opportunity to
    // falter" and "the complications are not all that easy to calculate": the
    // worse side's move that leaves one good reply, sets a grab that gives the
    // edge back, or makes the way through long, both seats.
    read: ({ fenBefore, san, student, reads }, fact) => safe(() => {
      const p = practicalChance(fenBefore, san, reads);
      if (!p) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = p.side === student;
      const text = practicalChanceLine(p, mine, fenBefore);
      const squares = practicalChanceSquares(p);
      // The engine's line after the move is the proof: their reply, then their
      // way through. On the opponent's seat that line starts with the
      // student's own answer, which is theirs to find: the squares only.
      const proof = (mine ? legalLineProof(fenAfter, p.bestLine.slice(0, 8), lineSeatAt(fenAfter, student)) : null) ?? squaresProof(text, squares) ?? NO_PROOF.description;
      return fact({ key: p.key, claims: [p.key], text, proof, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter, role: 'teach' });
    }),
    computer: 'practicalChance',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  pawnCutsGuard: {
    // His "…c4 cuts the line between the b3 queen and the f7 bishop", "…c3
    // interferes: it blocks the queen's diagonal to a5": the guard the pawn
    // cut and the piece left hanging, both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => pawnLineFact(pawnCutsGuard(fenBefore, san, new Chess(fenBefore).turn() === student), fenBefore, san, fact)),
    computer: 'pawnCutsGuard',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'the hanging piece it leaves is graded and filed by the move\'s own cost and the threat record' },
      think: THINK,
    },
  },
  chainBase: {
    // His "f4 is the base of the chain; if it falls e3 follows, so guard it
    // with …Bh6" (lyUZn39V6TY): the piece that comes to a chain's base, to
    // guard it or to hit it, both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const mine = new Chess(fenBefore).turn() === student;
      const r = chainBase(fenBefore, san, mine);
      if (!r) return null;
      // A hit on their base is the move's pressure on that pawn: one claim
      // with the board teacher's "your rook hits their pawn on c2, which has
      // no guard" (`ideaClaim('pressure', …)`), so a turn says the hit once.
      // A hit on an UNGUARDED base is also Review's "their knight now hits
      // your h-pawn, and nothing guards it" (`loose:<sq>`): one claim.
      const base = r.key.split(':')[2];
      const pressure = r.act === 'hit' && base ? moveIdeaClaim(fenBefore, san, 'pressure', [base]) : null;
      const hitClaim = [...(pressure ? [pressure] : []), ...(r.act === 'hit' && r.loose && base ? [`loose:${base}`] : [])];
      return fact({ key: r.key, claims: [r.key, ...hitClaim], text: r.text, proof: r.proof ?? NO_PROOF.description, squares: r.squares,
        stakes: r.gain ? { points: r.gain, plies: 1 } : null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'chainBase',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move just played — the pawn it guards or wins is graded by the move\'s own cost' },
      think: THINK,
    },
  },
  pinnedPawnGuard: {
    // His "f7 is pinned to the king, so e6 is weak; Rc6 threatens Rxe6+"
    // (-Am8glebGwQ): the square whose pawn guard can't take back, both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const mine = new Chess(fenBefore).turn() === student;
      const r = pinnedPawnGuard(fenBefore, san, mine);
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: r.proof ?? NO_PROOF.description, squares: r.squares,
        stakes: { points: r.gain, plies: 1 },
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'pinnedPawnGuard',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'the square it wins is graded by the move\'s own cost; the pin itself is recorded by the pin readers' },
      think: THINK,
    },
  },
  // S4, his speedruns' opening ideas (2026-11-17). "f3 opens the g1–a7
  // diagonal; with Black's bishop on c5, White can no longer castle short" ·
  // "on b4 the bishop covers f8 and stops Black castling".
  castlingTaken: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const r = castlingTakenAway(fenBefore, san, student);
      if (!r) return null;
      const mine = new Chess(fenBefore).turn() === student;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'castlingTakenAway',
    kind: 'king-read',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT,
      review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move just played — the castling it costs is recorded by the king-stuck-center watch' }, think: THINK,
    },
  },
  // "Castle long: Black's g- and h-pawns are gone, so castling short hands
  // him open files to attack."
  castlingWing: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const r = castlingWing(fenBefore, san, student);
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: r.mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'castlingWing',
    kind: 'king-read',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT,
      review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the castling move just played — no question of the student\'s posed' }, think: THINK,
    },
  },
  // "White's bishop has moved five times for nothing" · "Bd7 then Bg4 spends
  // two moves on one bishop".
  pieceMovedAgain: {
    read: ({ history, fenBefore, san, student, costCp }, fact) => safe(() => {
      // The moves must be this board's game from the start, or the count is
      // of another game's pieces (a lesson line set up mid-game).
      const board = new Chess();
      for (const m of history) board.move(m);
      if (board.fen().split(' ')[0] !== fenBefore.split(' ')[0]) return null;
      const r = pieceMovedAgain(history, san, student, costCp);
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: r.mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'pieceMovedAgain',
    kind: 'fundamental',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT,
      review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'the record half is principleAttribution\'s same-piece-twice on the student\'s own costly move' },
      think: { not: 'it counts a piece\'s trips across the game\'s moves; a step board is one position' },
    },
  },
  // His "you develop the knight to c3 with tempo, hitting the queen on d5"
  // and "Ng5 hits the queen": the early queen chased, with the time count —
  // the queen's moves against the pieces its side has out. Both seats.
  queenChased: {
    read: ({ history, fenBefore, san, student }, fact) => safe(() => {
      // The moves must be this board's game from the start, or the count is
      // of another game's queen (a lesson line set up mid-game).
      const board = new Chess();
      for (const m of history) board.move(m);
      if (board.fen().split(' ')[0] !== fenBefore.split(' ')[0]) return null;
      const q = queenChased(history, san);
      if (!q) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = q.queenSide !== student;
      const text = queenChasedLine(q, mine ? 'their' : 'your', fenAfter);
      const squares = [q.queen, q.hitter.square];
      // One claim with the queen hunt and the queen's escapes (the same queen
      // hit), and with the briefing's pressure on the queen's square: a turn
      // says the hit once.
      const hit = moveIdeaClaim(fenBefore, san, 'pressure', [q.queen]);
      return fact({ key: q.key, claims: [q.key, `queen-run:${q.queen}`, ...(hit ? [hit] : [])], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'queenChased',
    kind: 'move-job',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NO_HISTORY,
      weaknesses: { not: 'the record half is principleAttribution\'s early-queen-sortie on the student\'s own queen move' },
      think: { not: 'it counts the queen\'s trips across the game\'s moves; a step board is one position' },
    },
  },
  // His "you already have the dream: a blockading knight on d5" and "Black
  // throws the rook to b8 to blockade the pawn" — and the blockader that
  // walks away. Both seats.
  blockade: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const b = blockade(fenBefore, san);
      if (!b) return null;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      const mine = b.side === student;
      const text = blockadeLine(b, mine ? 'your' : 'their', fenAfter);
      const squares = [b.square, b.pawn];
      return fact({ key: b.key, claims: [b.key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'blockade',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — no question of the student\'s posed' },
    },
  },
  tradeOffer: {
    read: ({ fenBefore, san, student, costCp, afterCp }, fact) => safe(() => {
      const mine = sideToMove(fenBefore) === student;
      const o = tradeOfferAt(fenBefore, san, costCp, afterCp, mine);
      if (!o) return null;
      const text = tradeOfferLine(o, mine, fenBefore);
      const squares = [o.square, o.facing.square];
      const key = `offer:${o.square}${o.facing.square}`;
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, role: 'teach' });
    }),
    computer: 'tradeOfferAt',
    kind: 'trade',
    phase: ANY,
    surfaces: TRADE_SURFACES,
  },
  fileTrade: {
    read: ({ fenBefore, san, student, costCp, line }, fact) => safe(() => {
      const t = fileTradeAt(fenBefore, san, costCp, line);
      if (!t) return null;
      const mine = sideToMove(fenBefore) === student;
      const text = fileTradeLine(t, mine, fenBefore);
      const squares = t.kind === 'challenge' ? [t.rook, t.facing.square] : [t.on, t.next.from, t.next.to];
      const key = `file:${t.file}`;
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, role: 'teach' });
    }),
    computer: 'fileTradeAt',
    kind: 'trade',
    phase: ANY,
    surfaces: TRADE_SURFACES,
  },
  pawnEndingTrade: {
    read: ({ fenBefore, san, student, costCp, after }, fact) => safe(() => {
      const t = pawnEndingTradeAt(fenBefore, san, after, costCp);
      if (!t) return null;
      const mine = sideToMove(fenBefore) === student;
      const text = pawnEndingTradeLine(t, mine, fenBefore);
      // One claim a game: the next trade on the way into the same ending is
      // the same idea.
      const key = 'pawn-ending';
      return fact({ key, claims: [`trade:${key}`], text, proof: squaresProof(text, t.squares) ?? NO_PROOF.description, squares: t.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore, role: 'teach',
        lines: [{ fen: fenBefore, sans: t.sans }] });
    }),
    computer: 'pawnEndingTradeAt',
    kind: 'trade',
    phase: ANY,
    surfaces: TRADE_SURFACES,
  },
  tradeKept: {
    read: (ctx, fact) => safe(() => {
      const k = tradeKeptAt(ctx);
      if (!k) return null;
      const mine = sideToMove(ctx.fenBefore) === ctx.student;
      const text = tradeKeptLine(k, mine, ctx.fenBefore);
      const r = k.reason;
      const squares = [k.trade.from, k.trade.to, ...(r.kind === 'guard' ? [r.guarded.square, r.by.square] : r.kind === 'pressure' ? r.squares : [])];
      const key = `kept:${k.trade.from}${k.trade.to}:${r.kind}`;
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(ctx.fenBefore, ctx.san) ?? ctx.fenBefore, role: 'teach' });
    }),
    computer: 'tradeKeptAt',
    kind: 'capture-choice',
    phase: ANY,
    surfaces: TRADE_SURFACES,
  },
  queenHunt: {
    // His "…Bg4 attacks it and it has no safe square" and "after …Qa2, Ra1
    // traps it" (S4 king group): the queen's safe squares read with the
    // trapped-piece computer's rule, both seats.
    read: ({ fenBefore, san, student, line }, fact) => safe(() => {
      const h = queenHunt(fenBefore, san, line);
      if (!h) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = queenHuntLine(h, mine ? 'your' : 'their', fenBefore);
      const key = `queen-hunt:${h.shape}:${h.queen}`;
      // The queen is what rides on it: hit now, or caught on its one square.
      const stakes = h.shape === 'one-square' && !h.net ? null : { points: 9, plies: h.shape === 'boxed' ? 1 : 2 };
      // …and one with the briefing's "your bishop goes after their queen on
      // a4" (`pressure` on the queen's square): a turn says the hunt once.
      const hit = moveIdeaClaim(fenBefore, san, 'pressure', [h.queen]);
      return fact({ key, claims: [key, `queen-run:${h.queen}`, ...(hit ? [hit] : [])], text, proof: squaresProof(text, h.squares) ?? NO_PROOF.description, squares: h.squares, stakes,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine && h.shape === 'one-square' && !!h.net, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'queenHunt',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: LESSON_BOARD, learn: LEARN_VIA_THOUGHT, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of the move — the queen lost or kept is graded by the move\'s own cost' },
      think: THINK,
    },
  },
  secondAttacker: {
    // His "Qf3 adds a second attacker to f6, so taking twice on f6 becomes the
    // threat" and the queen-and-bishop pair on f7 (S4 king group).
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const a = secondAttacker(fenBefore, san);
      if (!a) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = secondAttackerLine(a, mine ? 'your' : 'their', fenBefore);
      const squares = [a.target, a.newcomer.square, a.partner.square];
      const key = `second-attacker:${a.target}:${a.mate ? 'mate' : 'win'}`;
      const stakes = a.mate ? mateStakes(mine ? 'you' : 'them', 1, false) : { points: a.gain, plies: 1 };
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes,
        seat: mine ? 'student' : 'opponent', namesStudentMove: mine, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'secondAttacker',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: LESSON_BOARD, learn: LEARN_VIA_THOUGHT, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'the threat the count makes — its answer or its miss is graded by the reply\'s own cost' },
      think: THINK,
    },
  },
  outOfReach: {
    // His "put the bishop where nothing can attack it; on f5 it could be
    // chased by g4" (S4 king group): said only against a chaseable square.
    read: ({ fenBefore, san, student, altUcis }, fact) => safe(() => {
      const o = outOfReach(fenBefore, san, altUcis);
      if (!o) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = outOfReachLine(o, mine ? 'your' : 'their', fenBefore);
      const squares = [o.square, o.contrast.square];
      const key = `out-of-reach:${o.square}:${o.contrast.left && 'now' in o.contrast.chase ? 'rescue' : 'square'}`;
      // One claim with the square choice's "safe there" (`safe-route:<sq>`): a
      // move says the piece is out of reach once.
      // …and with "Why that square for your knight?" (`squareChoice`): both
      // answer why the piece went there, so a turn says one of them.
      const why = squareChoiceClaim(fenBefore, san);
      return fact({ key, claims: [key, `safe-route:${o.square}`, ...(why ? [why] : [])], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'outOfReach',
    kind: 'contrast',
    phase: ANY,
    surfaces: {
      lesson: LESSON_BOARD, learn: LEARN_VIA_THOUGHT, review: { wired: 'services/reviewFullData.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a reading of where a piece stands — no question of the student\'s posed' },
      think: THINK,
    },
  },
  poisonedPiece: {
    // His "if …fxg5, Bxh5+ Rxh5 Qxh5 is mate, so the g5 bishop can't be
    // taken" (S4 king group): the mate read by brute force, so it is exact.
    read: ({ fenBefore, san, student, fan }, fact) => safe(() => {
      const p = poisonedPiece(fenBefore, san);
      const mine = new Chess(fenBefore).turn() === student;
      const fenAfter = boardAfter(fenBefore, san) ?? fenBefore;
      if (!p) {
        // BY THE LINE (WO-DANYA-READS-01 group 8): the piece that just landed
        // looks free, and every capture of it loses what the read proves.
        if (!fan || fan.replies.length === 0) return null;
        let mv: Move;
        try { mv = new Chess(fenBefore).move(san); } catch { return null; }
        if (mv.piece === 'k') return null;
        const replier: Color = mv.color === 'w' ? 'b' : 'w';
        const free = legalSeeGainFor(fenAfter, mv.to, replier) >= 1;
        const b = everyTakeLoses({ fen: fenAfter, replies: fan.replies, rating: fan.rating, student, seconds: [], landed: mv.to }, free);
        if (!b) return null;
        const text = everyTakeSentence({ fen: fenAfter, replier }, b, POISON_NAME[mv.piece], student, true);
        if (!text) return null;
        const key = `poisoned:${mv.to}`;
        const proof = legalLineProof(fenAfter, b.uci, lineSeatAt(fenAfter, student), b.kind === 'mate') ?? squaresProof(text, [mv.to]) ?? NO_PROOF.description;
        return fact({ key, claims: [key, `bait-take:${mv.to}`, `reply-tree:${b.reply.uci}`], text, proof, squares: [mv.to],
          stakes: b.kind === 'mate' ? mateStakes(mine ? 'you' : 'them', b.blowPlies + 1, true) : { points: b.winPawns ?? 0, plies: b.blowPlies + 1 },
          seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter,
          ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
      }
      const text = poisonedPieceLine(p, mine ? 'your' : 'their', fenBefore);
      const key = `poisoned:${p.square}`;
      const proof = legalLineProof(fenAfter, [p.capture, ...p.mate], lineSeatAt(fenAfter, student), true) ?? squaresProof(text, [p.square]) ?? NO_PROOF.description;
      return fact({ key, claims: [key], text, proof, squares: [p.square], stakes: mateStakes(mine ? 'you' : 'them', 1 + 2 * Math.ceil(p.mate.length / 2), false),
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter,
        ...(isProof(proof) && proof.line ? { lines: [proof.line] } : {}) });
    }),
    computer: 'poisonedPiece',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: LESSON_BOARD, learn: LEARN_VIA_THOUGHT, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a capture refused is graded by the reply\'s own cost; the mate missed by missed-their-mate' },
      think: THINK,
    },
  },
  everyMate: {
    // His "after Kf1 there are two mates in one, …Qf2# and …Bh3#; look for
    // both" (S4 king group): every mating move counted by chess.js.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const e = everyMate(fenBefore, san);
      if (!e) return null;
      const mine = new Chess(fenBefore).turn() === student;
      const text = everyMateLine(e, mine ? 'your' : 'their', fenBefore);
      const key = `every-mate:${[e.played, ...e.others].join(',')}`;
      // The proof is the mating squares, each one played by chess.js on the board.
      const squares = [e.played, ...e.others].flatMap((m) => { try { return [new Chess(fenBefore).move(m).to as string]; } catch { return []; } });
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'everyMate',
    kind: 'move-job',
    phase: ANY,
    surfaces: {
      lesson: LESSON_BOARD, learn: LEARN_VIA_THOUGHT, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'the game is over on a mate — no question of the student\'s left to grade' },
      think: THINK,
    },
  },
  // ── THE DANYA HAVE-CHECK COMPUTERS (2026-11-19, basket-new) ──
  pawnCentre: {
    // "Black has built an impressive pawn center": a side's d/e pawns the
    // other side has nothing to contest, both seats.
    read: ({ fen, student }, fact) => safe(() => {
      const c = pawnCentre(fen, student);
      if (!c) return null;
      const side = c.side;
      const key = `pawn-centre:${side}:${[...c.pawns].sort().join(',')}`;
      return fact({ key, claims: [key], text: c.text, proof: squaresProof(c.text, c.squares) ?? NO_PROOF.description, squares: [...c.squares], stakes: null,
        seat: side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'pawnCentre',
    kind: 'structure',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a standing description of the centre: no move answers it, so a clean move would be a false green' },
    },
  },
  centreDuo: {
    read: ({ fen, student }, fact) => safe(() => {
      const d = centreDuo(fen, student);
      if (!d) return null;
      const side = d.side;
      const key = `centre-duo:${side}:${d.duo.join(',')}`;
      return fact({ key, claims: [key], text: d.text, proof: squaresProof(d.text, d.squares) ?? NO_PROOF.description, squares: [...d.squares], stakes: null,
        seat: side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'centreDuo',
    kind: 'structure',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a standing description of the centre: no move answers it, so a clean move would be a false green' },
    },
  },
  harmlessWeakPawns: {
    // "Piece placement trumps pawn structure": doubled pawns guarded by a
    // piece and out of reach, both seats.
    read: ({ fen, student, best }, fact) => safe(() => {
      const h = harmlessWeakPawns(fen, student, best);
      if (!h) return null;
      const side = h.side;
      const key = `harmless-weak:${side}:${h.pawns.map((x) => x.square).sort().join(',')}`;
      return fact({ key, claims: [key], text: h.text, proof: squaresProof(h.text, h.squares) ?? NO_PROOF.description, squares: [...h.squares], stakes: null,
        seat: side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'harmlessWeakPawns',
    kind: 'structure',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a judgement that a weakness does not matter: no move answers it' },
    },
  },
  noSafeChecks: {
    // "I am all out of meaningful checks": the side to move — either seat —
    // has only checks that hand the piece over, the other side safe ones.
    read: ({ fen, student }, fact) => safe(() => {
      const n = noSafeChecks(fen, student);
      if (!n) return null;
      const side = n.side;
      // Said once a game for each side: the next board where it still holds
      // is the same lesson again (colle800 Bh6, then Bf6).
      const key = `no-safe-checks:${side}`;
      return fact({ key, claims: [key], text: n.text, proof: NO_PROOF.description, squares: [...n.squares], stakes: null,
        seat: side === student ? 'opponent' : 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen,
        // Both ways: their safe checks are a threat the student's move answers or ignores.
        ...(side === student ? { skill: 'missed-opponents-threat' } : {}) });
    }),
    computer: 'noSafeChecks',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  kingRace: {
    // "Everything hinges on whether White's king reaches g7": the kings'
    // count to the passer's escort square, both seats.
    read: ({ fen, student }, fact) => safe(() => {
      const r = kingRace(fen, student);
      if (!r) return null;
      const side = r.side;
      const key = `king-race:${r.pawn}:${r.escort}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen,
        // Both ways: a king race on the board asks the student's king to run.
        skill: 'passive-king-endgame' });
    }),
    computer: 'kingRace',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  kingBox: {
    // The box method: the rook move that shrinks the lone king's box, both
    // seats (the student boxing, or their king boxed).
    read: ({ fenBefore, san, student, namesPlayedMove }, fact) => safe(() => {
      const b = kingBoxMove(fenBefore, san, student);
      if (!b) return null;
      const mine = sideToMove(fenBefore) === student;
      const text = namesPlayedMove || !mine ? b.text : b.text.replace(new RegExp(`^${san.replace(/[+#]/g, '\\$&')}`), 'Your move');
      const key = `king-box:${fenBefore.split(' ')[0]}:${san}`;
      return fact({ key, claims: [`king-box:${b.after.area}`], text, proof: squaresProof(text, b.squares) ?? NO_PROOF.description, squares: [...b.squares], stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'kingBoxMove',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a technique a move may use or not: a clean move is no answer to it, so held cannot be read off the cost' },
    },
  },
  promotionWithCheck: {
    // "1.b6+ drives the king to the eighth rank so every promotion later comes
    // with check" — said of the student's own check.
    read: ({ fenBefore, san, reply, student, namesPlayedMove }, fact) => safe(() => {
      const p = promotionWithCheck(fenBefore, san, reply, student);
      if (!p) return null;
      const mine = sideToMove(fenBefore) === student;
      const text = namesPlayedMove || !mine ? p.text : p.text.replace(new RegExp(`^${san.replace(/[+#]/g, '\\$&')}`), 'Your check');
      const key = `promotion-check:${p.pawn}:${p.kingTo}`;
      return fact({ key, claims: [key], text, proof: squaresProof(text, p.squares) ?? NO_PROOF.description, squares: [...p.squares], stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'promotionWithCheck',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an order a move may find or not: a clean move is no answer to it, so held cannot be read off the cost' },
    },
  },
  inaccessibleHole: {
    // "Weak squares, who cares?": the hole a pawn move leaves that no enemy
    // piece reaches soon, both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const h = inaccessibleHole(fenBefore, san, student);
      if (!h) return null;
      const key = `inaccessible:${h.hole}`;
      return fact({ key, claims: [key], text: h.text, proof: squaresProof(h.text, h.squares) ?? NO_PROOF.description, squares: [...h.squares], stakes: null,
        seat: sideToMove(fenBefore) === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'inaccessibleHole',
    kind: 'structure',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a judgement that a weakness does not matter: the move made it on purpose, no question posed' },
    },
  },
  wingWithoutPieces: {
    // "To open the b-file White must bring a piece to the queenside": a wing
    // lever with none of the pusher's pieces near it. Worded to the mover.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const w = wingWithoutPieces(fenBefore, san, student);
      if (!w) return null;
      const key = `wing-without-pieces:${w.push.from}${w.push.to}`;
      return fact({ key, claims: [key], text: w.text, proof: squaresProof(w.text, w.squares) ?? NO_PROOF.description, squares: [...w.squares], stakes: null,
        seat: sideToMove(fenBefore) === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'wingWithoutPieces',
    kind: 'structure',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/capabilityEvidence.ts' },
    },
  },
  urgentStrike: {
    // "White does not have unlimited time": the strike that works now, and the slow move whose reply closes it. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = urgentStrike(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `urgent:${r.strike}:${r.reply}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'urgentStrike',
    kind: 'timing',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { not: 'Review keeps one line after the move: the comparison needs the engine\'s other top lines on the board' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'its question needs the engine\'s other top lines on the board, and the record keeps one line a move' },
    },
  },
  misplacedQueen: {
    // "The passive queen on e2": a queen doing little, and the square the engine's line gives it. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = misplacedQueen(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `misplaced-queen:${r.from}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'misplacedQueen',
    kind: 'quality',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it' },
    },
  },
  theirWorstPiece: {
    // "Black's a8 bishop is dreadful": the other side's worst piece, out of the game in the engine's line.
    read: (ctx, fact) => safe(() => {
      const r = theirWorstPiece(ctx.fen, ctx.student, ctx.bestLine);
      if (!r) return null;
      const key = `their-worst:${r.square}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'theirWorstPiece',
    kind: 'quality',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a standing description of their piece: no move of the student\'s answers it' },
    },
  },
  kingInOpen: {
    // "With the king exposed, material equality doesn't matter": a king off its shelter with checks against it. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = kingInOpen(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `king-open:${r.king}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen,
        // The student's own king in the open: the record files the king's
        // safety held or broken on the move (both ways).
        ...(r.side === ctx.student ? { skill: 'weakened-king-safety' } : {}) });
    }),
    computer: 'kingInOpen',
    kind: 'king-read',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  kingActivityGap: {
    // "In the endgame the king should be active rather than safe": the two kings compared. Both seats; the record files the student's passive king.
    read: (ctx, fact) => safe(() => {
      const r = kingActivityGap(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `king-activity:${r.activeKing}:${r.passiveKing}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.active === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, ...(r.active !== ctx.student ? { skill: 'passive-king-endgame' } : {}) });
    }),
    computer: 'kingActivityGap',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  kingSiegeNow: {
    // His "White has a formidable mass of pieces on the kingside while Black's
    // rooks are far from the king", read on the board as it stands — the move
    // read (`kingSiege`) says a siege only on the move that makes it, so a
    // read of a standing board never heard one. Both kings, the student's first.
    read: ({ fen, student, studentCp }, fact) => safe(() => {
      const out: CoachFact[] = [];
      for (const defender of [student, student === 'w' ? 'b' : 'w'] as const) {
        const attacker = defender === 'w' ? 'b' : 'w';
        const atkCp = studentCp === null ? null : attacker === student ? studentCp : -studentCp;
        const s = kingSiege(fen, defender);
        if (!s || !siegeSpeaks(fen, s, atkCp)) continue;
        const text = siegeLine(s, student, fen);
        const squares = siegeSquares(s);
        out.push(fact({ key: s.key, claims: [s.key, `king-attack:${s.king}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
          seat: attacker === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen,
          // Both ways: the student's own king under siege asks for its defence.
          ...(defender === student ? { skill: 'weakened-king-safety' } : {}) }));
      }
      return out.length ? out : null;
    }),
    computer: 'kingSiege',
    kind: 'king-read',
    phase: ANY,
    surfaces: {
      learn: { wired: 'services/boardReadFacts.ts' }, play: { wired: 'services/boardReadFacts.ts' }, review: { wired: 'services/boardReadFacts.ts' },
      lesson: { wired: 'services/boardReadFacts.ts' }, tactics: { wired: 'services/boardReadFacts.ts' },
      chat: CHAT_VIA_THOUGHT, think: THINK,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  zugzwangIfPassed: {
    // "With Black to move it would be zugzwang: triangulate": the zugzwang that is theirs only if they have to move. Both seats; the record files the tempo to lose.
    read: (ctx, fact) => safe(() => {
      const r = zugzwangIfPassed(ctx.fen, ctx.student);
      if (!r) return null;
      const key = `zz-if-passed:${ctx.fen.split(' ').slice(0, 2).join(' ')}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, ...(r.side === ctx.student ? { skill: 'passive-king-endgame' } : {}) });
    }),
    computer: 'zugzwangIfPassed',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  leverPasser: {
    // "Create an outside passer": the lever in the engine's line that makes a passed pawn. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = leverPasser(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `lever-passer:${r.lever}:${r.passer[0]}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'leverPasser',
    kind: 'structure',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it' },
    },
  },
  coordinationGap: {
    // "White's army is excellently coordinated": one side guarded and working, the other loose or idle. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = coordinationGap(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `coordination:${r.side}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'coordinationGap',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a judgement of both armies: no single move answers it' },
    },
  },
  endgameVerdict: {
    // "Nothing better than to repeat checks" / "no way to make progress" / "hunker down": the verdict on a board with nothing to force.
    read: (ctx, fact) => safe(() => {
      const r = endgameVerdict(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = r.draw ? `verdict:drawn:${r.draw}:${r.side}` : `verdict:${r.kind}:${r.side}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.kind === 'checksRepeat' && r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'endgameVerdict',
    kind: 'verdict',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a verdict on how to play the board: a clean move is no answer to it' },
    },
  },
  defenderInTime: {
    // "Nd3-b4 fails to ...Kf7-e6": the knight's route to a loose pawn against the king that gets there first. Both seats.
    read: (ctx, fact) => safe(() => {
      // EVERY race, one fact a knight-and-pawn pair (G4.5); the claim is the
      // pawn, so two knights after one pawn are one claim to the door.
      const out = defenderInTime(ctx.fen, ctx.lines, ctx.student).map((r) => {
        const claim = `defender-in-time:${r.pawn}`;
        return fact({ key: `${claim}:${r.knight}`, claims: [claim], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
          seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen });
      });
      return out.length ? out : null;
    }),
    computer: 'defenderInTime',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a plan that does not work yet: no move is a fault against it' },
    },
  },
  tactify: {
    // "Tactify the position so the opponent must calculate": among equal moves, the one that asks questions. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = tactify(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `tactify:${r.move}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'tactify',
    kind: 'method',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { not: 'Review keeps one line after the move: the comparison needs the engine\'s other top lines on the board' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'a practical choice between equal moves: no move is a fault against it' },
    },
  },
  seventhRankMate: {
    // "Two rooks on the seventh can almost never mate by themselves": the
    // mating-square census — what keeps every check from mating. Both seats;
    // the record files the student's back rank held or let go.
    read: (ctx, fact) => safe(() => {
      const r = seventhRankMate(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `seventh-no-mate:${r.heavies.join('')}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.attacker === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen,
        ...(r.attacker !== ctx.student ? { skill: 'missed-opponents-threat' } : {}) });
    }),
    computer: 'seventhRankMate',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  pieceTempo: {
    // "The knight on d7 can move away with gain of tempo": a piece move that
    // lands safe and hits a piece they must answer. Both seats.
    read: (ctx, fact) => safe(() => {
      const r = pieceTempo(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `piece-tempo:${r.from}:${r.target}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'pieceTempo',
    kind: 'timing',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'an opportunity a move may take or leave without a fault: a clean move is no answer to it' },
    },
  },
  // "No such invasion exists … open a second front": one wing held with no way in. Both seats.
  secondFront: {
    read: (ctx, fact) => safe(() => {
      const r = secondFront(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `second-front:${r.side}:${r.lever}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'secondFront',
    kind: 'judgement',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' }, // `planPosed`: live Learn, both ways (no-plan)
    },
  },
  // "The rooks fulfil a defensive duty on the g-file": the raiding rook guards sideways. Both seats.
  lateralRookDefence: {
    read: (ctx, fact) => safe(() => {
      const r = lateralRookDefence(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `lateral-rook:${r.from}:${r.guards}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen, ...(r.side === ctx.student ? { skill: 'hung-material' } : {}) });
    }),
    computer: 'lateralRookDefence',
    kind: 'defence-idea',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // "Weakened e5 but totally restricted the c8 bishop": a square for a piece. Both seats.
  squareForPiece: {
    read: (ctx, fact) => safe(() => {
      const r = squareForPiece(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `square-for-piece:${r.hole}:${r.buried}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen });
    }),
    computer: 'squareForPiece',
    kind: 'structure',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' }, // `planPosed`: live Learn, both ways (no-plan)
    },
  },
  // "Trade pieces to lessen White's space advantage": the side short of room trades. Both seats.
  tradeRelievesCramp: {
    read: (ctx, fact) => safe(() => {
      const r = tradeRelievesCramp(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `cramp-trade:${r.target}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.cramped === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.cramped === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen, lines: [r.line] });
    }),
    computer: 'tradeRelievesCramp',
    kind: 'trade',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' }, // `planPosed`: live Learn, both ways (no-plan)
    },
  },
  // "Queen and knight coordinate in an instant": the pair leaves the king one square or none. Both seats; the record files the student's net held or missed.
  queenKnightNet: {
    read: (ctx, fact) => safe(() => {
      const r = queenKnightNet(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `qn-net:${r.king}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, ...(r.side === ctx.student ? { skill: 'missed-tactic' } : {}) });
    }),
    computer: 'queenKnightNet',
    kind: 'king-read',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // "Bh8!!: the only square on the long diagonal not in the king's way". Both seats; the record files the student's race.
  selfBlock: {
    read: (ctx, fact) => safe(() => {
      const r = selfBlock(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `self-block:${r.piece}:${r.escort}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen, ...(r.side === ctx.student ? { skill: 'passive-king-endgame' } : {}) });
    }),
    computer: 'selfBlock',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // "The threat of mate should be used to transform the advantage". Both seats; the record files the student's lever.
  mateThreatLever: {
    read: (ctx, fact) => safe(() => {
      const r = mateThreatLever(ctx.fen, ctx.lines, ctx.student);
      if (!r) return null;
      const key = `mate-lever:${r.move}:${r.mate}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen, ...(r.side === ctx.student ? { skill: 'missed-tactic' } : {}) });
    }),
    computer: 'mateThreatLever',
    kind: 'tactic',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // "A feeling of immunity (the queens are off!) leads to carelessness": the checkmate check. Both seats, filed both ways.
  queenlessMate: {
    read: (ctx, fact) => safe(() => {
      const r = queenlessMate(ctx.fen, ctx.student);
      if (!r) return null;
      const key = `queenless-mate:${r.mate}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: (r.side === ctx.student ? 'student' : 'opponent'), namesStudentMove: r.side === ctx.student, thread: LOCAL_THREAD, fen: ctx.fen, skill: r.side === ctx.student ? 'missed-your-mate' : 'missed-their-mate' });
    }),
    computer: 'queenlessMate',
    kind: 'method',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // "…and the king is imprisoned": the king with no square to go to and a
  // mate in one there, whatever draws the net. Both seats; the student's mate
  // is held (never named), theirs is said. Filed both ways.
  matingNet: {
    read: (ctx, fact) => safe(() => {
      const r = matingNet(ctx.fen, ctx.student);
      if (!r) return null;
      const key = `mating-net:${r.king}`;
      const mine = r.side === ctx.student;
      return fact({ key, claims: [key, `queenless-mate:${r.mate}`], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, skill: mine ? 'missed-your-mate' : 'missed-their-mate' });
    }),
    computer: 'matingNet',
    kind: 'king-read',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // "The a6 pawn will fall, while the entire queenside is frozen": the weak
  // pawn that cannot move, no pawn to its aid, out-counted over two moves.
  // Both seats; the record files the student's own frozen pawn.
  frozenTarget: {
    read: (ctx, fact) => safe(() => {
      const r = frozenTarget(ctx.fen, ctx.student);
      if (!r) return null;
      const key = `frozen-target:${r.pawn}`;
      const mine = r.side === ctx.student;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, [...r.squares]) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, ...(mine ? {} : { skill: 'created-pawn-weakness' }) });
    }),
    computer: 'frozenTarget',
    kind: 'structure',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  tensionKept: {
    // "To take is a mistake": the tension capture the engine wants left
    // alone, and what taking first hands them. Worded to the side to move.
    read: ({ fen, lines, student }, fact) => safe(() => {
      const r = tensionKept(fen, lines, student);
      if (!r) return null;
      const key = `tension-kept:${r.capture}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: sideToMove(fen) === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'tensionKept',
    kind: 'trade-idea',
    phase: MIDDLEGAME,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { not: 'Review keeps one line after the move: the per-capture lines this reads on the board before it are never stored' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { not: 'its held half needs every capture\'s own engine line before the move, and the record keeps one line a move; the release half is filed (tensionReleased, capabilityEvidence)' },
    },
  },
  tensionReleased: {
    // The capture that released tension too early, and what it handed them.
    read: ({ fenBefore, san, lines, playedCp, reply, student }, fact) => safe(() => {
      const r = tensionReleased(fenBefore, san, lines, playedCp, reply, student);
      if (!r) return null;
      const key = `tension-released:${fenBefore.split(' ')[0]}:${san}`;
      return fact({ key, claims: [`tension-released:${r.capture}`], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: [...r.squares], stakes: null,
        seat: sideToMove(fenBefore) === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'tensionReleased',
    kind: 'trade-idea',
    phase: MIDDLEGAME,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/capabilityEvidence.ts' },
    },
  },
  keySquareRead: {
    // His "Kc5 takes the opposition and the king reaches the key square": the
    // passed pawn's key squares and whose king has them. Both seats; the record
    // files the student's king that can step onto one.
    read: ({ fen, student }, fact) => safe(() => {
      const r = keySquaresOn(fen, student);
      if (!r) return null;
      const text = keySquareLine(r, student);
      const squares = keySquareSquares(r);
      const asks = r.side === student && sideToMove(fen) === student && r.kind === 'steps';
      return fact({ key: r.key, claims: [`key-squares:${r.pawn}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: r.side === student ? 'student' : 'opponent', namesStudentMove: asks, thread: LOCAL_THREAD, fen, ...(asks ? { skill: 'passive-king-endgame' } : {}) });
    }),
    computer: 'keySquaresOn',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  kpDrawRead: {
    // His "White cannot make progress" and "the king gets there first": a
    // kings-and-pawns board the exact solver proves drawn although one side has
    // more pawns, and why — the defending king in front of the pawn or on its
    // key square first, or every try met. Both seats; the record files the
    // student's draw to hold when it is the student's move.
    read: ({ fen, student }, fact) => safe(() => {
      const r = kpDrawReason(fen, student, { budget: KP_FAST_BUDGET });
      if (!r) return null;
      const defender: Color = r.attacker === 'w' ? 'b' : 'w';
      const asks = defender === student && sideToMove(fen) === student;
      const key = `kp-draw:${fen.split(' ').slice(0, 2).join(' ')}`;
      return fact({ key, claims: [key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: defender === student ? 'student' : 'opponent', namesStudentMove: asks && !!r.answer, thread: LOCAL_THREAD, fen, ...(asks ? { skill: 'passive-king-endgame' } : {}) });
    }),
    computer: 'kpDrawReason',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  shoulderRead: {
    // His "White's king is pushed away from the e-pawn": the king kept from a
    // passed pawn by the other king or a rook's wall, counted. Both seats; the
    // record files the student's shoulder to keep.
    read: ({ fen, student }, fact) => safe(() => {
      const r = shoulderOn(fen, student);
      if (!r) return null;
      const text = shoulderLine(r, student);
      const squares = shoulderSquares(r);
      const asks = r.side === student && sideToMove(fen) === student;
      return fact({ key: r.key, claims: [`shoulder:${r.king}:${r.pawn}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: r.side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(asks ? { skill: 'passive-king-endgame' } : {}) });
    }),
    computer: 'shoulderOn',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  connectedPassers: {
    // His "the connected passers will seal the deal": two connected passed
    // pawns a lone rook or minor cannot stop, proven by search. Both seats;
    // the record files the student's pawns to push.
    read: ({ fen, student }, fact) => safe(() => {
      const r = connectedPassersOn(fen);
      if (!r) return null;
      const text = connectedPassersLine(r, student);
      const squares = connectedPassersSquares(r);
      const asks = r.side === student && sideToMove(fen) === student;
      return fact({ key: r.key, claims: [`connected-passers:${r.pawns.join('')}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: r.side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(asks ? { skill: 'passed-pawn-neglected' } : {}) });
    }),
    computer: 'connectedPassersOn',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  wonEndingRead: {
    // The win's why, the twin of kpDrawRead: a kings-and-pawns board the
    // exact solver proves won, and the shape that wins it. Both seats; the
    // record files the student's won ending to convert when it is the
    // student's move.
    read: ({ fen, student }, fact) => safe(() => {
      const r = wonEnding(fen, student, KP_FAST_BUDGET);
      if (!r) return null;
      const asks = r.side === student && sideToMove(fen) === student;
      return fact({ key: r.key, claims: [`won-ending:${r.reason}:${fen.split(' ').slice(0, 2).join(' ')}`], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: r.side === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen, ...(asks ? { skill: 'botched-conversion' } : {}) });
    }),
    computer: 'wonEnding',
    kind: 'technique',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  // THE PICTURE'S CONCLUSIONS (WO-PICTURE-01 P3): what Danya works out before
  // he weighs a try — the ledger of what works and what can be got at, the
  // other side's one resource, the target picked by comparison. Each rests on
  // the facts the other computers produced on the board (`pictureLedger.ts`).
  // The record: your weakness they outnumber with you to move (guard it), and
  // their break your next move kills (stop it), are threats to answer; your
  // target with the best move going after it is the plan to start.
  pictureLedger: {
    read: (ctx, fact) => safe(() => {
      const ledger = pictureLedger(ctx.facts, ctx.fen, ctx.lines);
      if (!ledger) return null;
      const text = ledgerText(ledger, ctx.student);
      if (!text) return null;
      const squares = ledgerSquares(ledger);
      const them: Color = ctx.student === 'w' ? 'b' : 'w';
      const asks = sideToMove(ctx.fen) === ctx.student && (pictureTarget(ctx.facts, ctx.fen, ctx.lines, them)?.now ?? null) !== null;
      // One claim per ledger: the same entries on two boards are the same idea.
      const key = `ledger:${ledgerKey(ledger)}`;
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, ...(asks ? { skill: 'missed-opponents-threat' } : {}) });
    }),
    computer: 'pictureLedger',
    kind: 'stock',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  pictureCounterplay: {
    read: (ctx, fact) => safe(() => {
      const them: Color = ctx.student === 'w' ? 'b' : 'w';
      const r = pictureCounterplay(ctx.facts, ctx.fen, ctx.lines, them);
      if (!r) return null;
      const text = counterplayText(r, ctx.student, ctx.fen, ctx.lines);
      if (!text) return null;
      const squares = [r.from, r.to, ...r.hits];
      const studentFirst = sideToMove(ctx.fen) === ctx.student;
      const asks = r.state === 'dead' && r.ply === 0 && studentFirst;
      // The stopper named is the student's move when it falls on their ply.
      const namesStudentMove = r.state === 'dead' && r.ply !== null && (r.ply % 2 === 0) === studentFirst;
      const key = `counterplay:${r.from}${r.to}:${r.state}`;
      // A DEAD break is one idea with the stopped break (`breakStopped`'s and
      // the board plan's claim `stops-break:<san>`): "their …g6 break is dead"
      // and "it takes the …g6 break away" are said once.
      const stops = r.state === 'dead' ? [`stops-break:${them === 'b' ? '…' : ''}${r.from[0] === r.to[0] ? r.to : `${r.from[0]}x${r.to}`}`] : [];
      return fact({ key, claims: [key, ...stops], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'opponent', namesStudentMove, thread: LOCAL_THREAD, fen: ctx.fen, ...(asks ? { skill: 'missed-opponents-threat' } : {}) });
    }),
    computer: 'pictureCounterplay',
    kind: 'opponent-intent',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
  pictureTarget: {
    read: (ctx, fact) => safe(() => {
      const c = pictureTarget(ctx.facts, ctx.fen, ctx.lines, ctx.student);
      const t = c?.now ?? null;
      // The plan's target: a race won in three or four moves, said beside the
      // target now when it is another thing, alone when there is none.
      const p0 = c?.plan ?? null;
      const p = p0 && p0.best.entry.object !== t?.best.entry.object ? p0 : null;
      const planText = p ? planTargetText(p, ctx.student) : null;
      if (!t && !planText) return null;
      const text = [t ? targetText(t, ctx.student) : null, planText].filter((x): x is string => !!x).join(' ');
      const planSquares = p && planText ? [p.best.entry.square, ...(p.best.decisive?.route ?? [])] : [];
      const squares = [...new Set([...(t ? [t.best.entry.square, ...(t.runnerUp ? [t.runnerUp.entry.square] : [])] : []), ...planSquares])];
      const first = ctx.lines[0]?.moves[0];
      const asks = sideToMove(ctx.fen) === ctx.student && ((t !== null && moveWorksOnTarget(t, first)) || (p !== null && !!planText && moveWorksOnPlan(p, first)));
      const key = t ? `target:${t.best.entry.square}` : `plan-target:${(p as NonNullable<typeof p>).best.entry.square}`;
      return fact({ key, claims: [key], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen, ...(asks ? { skill: 'no-plan' } : {}) });
    }),
    computer: 'pictureTarget',
    kind: 'priority',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_READ, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_READ,
      weaknesses: { wired: 'services/moveInsight.ts' },
    },
  },
} satisfies { [K in ComputerId]: ComputerSpec<BoardContexts[K]> };

/** The registry, read uniformly by id. */
const SPECS: { [K in ComputerId]: ComputerSpec<BoardContexts[K]> } = BOARD_COMPUTERS;

/** The board a computer's context reads, when it names one. */
function boardOf(ctx: object): string | null {
  for (const field of ['fen', 'fenAfterReply', 'fenAfter', 'fenBefore']) {
    const v = (ctx as Record<string, unknown>)[field];
    if (typeof v === 'string') return v;
  }
  return null;
}

/** Is the board outside the computer's phases? An ending is the one phase a
 *  computer can be out of today (`isEndgameByMaterial`, the one definition). */
function outOfPhase(phase: ReadonlySet<GamePhase | 'any'>, ctx: object): boolean {
  if (phase.has('any')) return false;
  const fen = boardOf(ctx);
  if (!fen) return false;
  try {
    // The opening, read off the board (`phaseOfFen`), for a computer the book can contradict.
    if (!phase.has('opening') && phaseOfFen(fen) === 'opening') return true;
    return !phase.has('endgame') && isEndgameByMaterial(fen);
  } catch { return false; }
}

/** The plan thread's adopt step (its state is the game's story's). */
export { adoptPlanTrial, type PlanThread } from './planThread';

/** THE KIND A COMPUTER'S FACTS CARRY: its row's, or — the one computer that
 *  states several — the opening story's beats' (`STORY_KIND`). Typed per
 *  computer, so a surface that speaks a computer under its own vocabulary
 *  (Review's facets, the live clauses) fails to compile on a kind it has no
 *  name for, as the per-surface relabel used to guarantee. */
type KindOf<K extends ComputerId> = K extends 'openingStory' ? (typeof STORY_KIND)[keyof typeof STORY_KIND] : K extends 'planThread' ? PlanLineKind : K extends FactSetMultiKind ? CoachFactKind : (typeof BOARD_COMPUTERS)[K]['kind'];
export type BoardFact<K extends ComputerId> = CoachFact & { kind: KindOf<K> };

/** Every fact, in speaking order. */
export function readBoardAll<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardFact<K>[] {
  const spec: ComputerSpec<BoardContexts[K]> = SPECS[id];
  if (outOfPhase(spec.phase, ctx)) return [];
  const fact: MakeFact = ({ key, stakes, ...p }) => ({ ...p, id: `${id}:${key}`, ...placeFact(spec.kind, p.seat), computer: spec.computer, stakes: stakesOf(spec.kind, stakes) });
  const r = spec.read(ctx, fact);
  // The kind is the row's or the story's by construction (`fact` above makes
  // every read but the story's, which `openingStoryAt` makes under STORY_KIND).
  return (r === null ? [] : Array.isArray(r) ? r : [r]) as BoardFact<K>[];
}

/** The one call a surface makes — the first fact, or null. */
export function readBoard<K extends ComputerId>(id: K, ctx: BoardContexts[K]): BoardFact<K> | null {
  return readBoardAll(id, ctx)[0] ?? null;
}

/** A basket fact said once per walk: `told` is the walk's own ledger of the
 *  facts already said (a lecture, a line), keyed by the fact's key. */
/** The board after a game's moves from the start (the start board if a move
 *  does not play). */
function fenOfGame(history: readonly string[]): string {
  const c = new Chess();
  try { for (const m of history) c.move(m); } catch { /* the board as far as it plays */ }
  return c.fen();
}

export function sayOnce(f: CoachFact | null, told: Set<string> | null): string | null {
  if (!f) return null;
  const k = readKey(f);
  if (told?.has(k)) return null;
  told?.add(k);
  return f.text;
}

/** What a positional verdict read says (`positionalVerdict`): its word and reasons. */
export function positionalVerdictOf(f: CoachFact): { word: string; reasons: string[] } {
  const k = readKey(f);
  const bar = k.indexOf('|');
  return { word: k.slice(0, bar), reasons: JSON.parse(k.slice(bar + 1)) as string[] };
}

/** WHERE A REVIEW FACET IS SAID (one-coach basket): Review's per-move facets
 *  read the registry; the other surfaces say these reads their own way today. */
function reviewFacetSurfaces(): Record<CoachSurface, SurfaceAnswer> {
  return {
    review: REVIEW,
    lesson: { not: 'a lesson composes each move from the move\'s own facts (moveThoughtFacts); this is Review\'s read of a played move' },
    learn: { not: 'owed — Learn\'s door (learnTurnDoor) reads its own lanes; this is Review\'s read of a played move' },
    play: PLAY_ASK,
    chat: { not: 'owed — chat answers through the one composer, which does not read this Review facet yet' },
    tactics: TACTICS_NA,
    weaknesses: WEAK_OWED,
    think: { not: 'owed — a step board reads the composer; this is Review\'s read of a played move' },
  };
}

/** What a move-influence read's key says (`moveInfluence`). */
export function influenceShapeOf(f: CoachFact): { hitsPiece: boolean; loose?: string } {
  const [h, loose] = readKey(f).split('|');
  return { hitsPiece: h === 'h', ...(loose ? { loose } : {}) };
}

/** The kind of their move's target read (`opponentMoveTeaching`), if any. */
export function oppTeachingKind(f: CoachFact): string | undefined {
  const k = readKey(f).split('|')[0];
  return k === '-' ? undefined : k;
}

/** An exchange idea's kind and say-once claim (`exchangeIdeas`). */
export function exchangeIdeaOf(f: CoachFact): { kind: ExchangeIdeaKind; claim: string } {
  const k = readKey(f);
  const bar = k.indexOf('|');
  return { kind: k.slice(0, bar) as ExchangeIdeaKind, claim: k.slice(bar + 1) };
}

/** What a played trade's reads need (`tradeJudged`, `tradeSettled`). */
interface TradePlayedCtx { fenBefore: string; fenAfter: string; san: string; moverIsStudent: boolean; student: Color | null; lineUci: readonly string[]; prior: { fenBefore: string; san: string } | null; costCp: number | null; moverCostCp: number | null }

/** THE TRADE'S PROOF: the capture, then every recapture on the square in
 *  least-valuable order — the exchange itself, exact (`seeSequence`). */
function tradeProofOf(fenBefore: string, fenAfter: string, san: string, sq: string, student: Color | null): FactProof | null {
  return lineProof({ fen: fenBefore, sans: [san, ...seeSequence(fenAfter, sq as Square)] }, lineSeatAt(fenBefore, student), true);
}

/** What a board-tactics read's key says (`boardTactics`): its motif, who it
 *  favours, its instance. */
export function tacticOf(f: CoachFact): { motif: string; beneficiary: Color | undefined; instance: string } {
  const k = readKey(f);
  const at = k.indexOf('@');
  const side = k[at + 1];
  return { motif: k.slice(0, at), beneficiary: side === 'w' || side === 'b' ? side : undefined, instance: k.slice(k.indexOf(':') + 1) };
}

// ── THE REVIEW WALK'S HELPERS (basket, walk) ─────────────────────────────────

/** Read by the Review walk today; every other surface either calls the
 *  computer through its own composer or never meets it (owed onto the
 *  registry with that surface's basket). */
function walkSurfaces(): Record<CoachSurface, SurfaceAnswer> {
  return {
    review: { wired: 'services/coachFeatureService.ts' },
    learn: { not: 'owed — Learn reads its own lanes (learnTurnDoor); this read joins with Learn\'s basket' },
    lesson: { not: 'a read of a played game on the Review walk; a lesson\'s line is a model line' },
    play: PLAY_ASK,
    chat: { not: 'owed — chat answers a move through the one composer (moveThoughtFacts), which does not read this yet' },
    tactics: TACTICS_NA,
    weaknesses: WEAK_OWED,
    think: { not: 'a read of a whole game\'s walk; a step board is one position' },
  };
}

/** Oxford-comma join of a short clause list ("a, b, and c"). */
function oxfordJoin(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/** A game-end read as the one fact, on the board of the ply it belongs to;
 *  its claim is its key. */
function endReadFact(r: EndRead | null, plies: readonly GamePly[], fact: MakeFact): CoachFact | null {
  if (!r) return null;
  const fen = plies[r.index]?.fenAfter ?? plies[plies.length - 1]?.fenAfter;
  if (!fen) return null;
  return fact({ key: r.claim, claims: [r.claim], text: r.text, proof: r.proof, squares: r.squares, stakes: r.stakes ?? null,
    seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
}

/** The fundamental verdict's half (`diagnosis` leads the beat, `how` closes
 *  it). `seen` is read, never written: the ids this read says for the first
 *  time ride the key (`fundamentalsSaid`), and the surface commits them. */
function verdictFact(ctx: BoardContexts['fundamentalVerdict'], fact: MakeFact, half: 'diagnosis' | 'how'): CoachFact | null {
  const local = new Set<FundamentalId>(ctx.seen);
  const v = renderFundamentalVerdict(ctx.attrs, { ply: ctx.ply, seen: local, replySan: ctx.replySan });
  const text = v[half];
  if (!text) return null;
  const added = [...local].filter((id) => !ctx.seen.has(id));
  return fact({ key: `${half}|${added.join(',')}|${ctx.ply}`, claims: [`${half === 'how' ? 'fundamental-how' : 'fundamental'}:${ctx.attrs[0].id}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
    seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen: ctx.fen });
}

/** The fundamentals a verdict read says for the first time in the game. */
export function fundamentalsSaid(f: CoachFact): FundamentalId[] {
  const mid = readKey(f).split('|')[1] ?? '';
  return mid ? (mid.split(',') as FundamentalId[]) : [];
}

/** A plan beat as the one fact; its arrows ride the key (`planBeatArrows`). */
function planBeatFact(beat: PlanBeat | null, fen: string, seat: FactSeat, fact: MakeFact): CoachFact | null {
  if (!beat) return null;
  return fact({ key: `${beat.id}|${JSON.stringify(beat.arrows)}`, claims: [beat.id], text: beat.text, proof: NO_PROOF.description, squares: [...beat.squares], stakes: null,
    seat, namesStudentMove: false, thread: LOCAL_THREAD, fen });
}

/** The arrows a plan beat leads the eye with. */
export function planBeatArrows(f: CoachFact): PlanArrow[] {
  const k = readKey(f);
  const bar = k.indexOf('|');
  if (bar < 0) return [];
  try { return JSON.parse(k.slice(bar + 1)) as PlanArrow[]; } catch { return []; }
}

/** Does a sacrifice's payoff teach the king stuck in the centre? */
export function sacPayoffTeachesKing(f: CoachFact): boolean {
  return readKey(f).startsWith('k:');
}

/** What a cause-across-moves read says beyond its words: its stance, the
 *  arrows (played or allowed only), and the key the story claims it under. */
export function causalChainRead(f: CoachFact): { stance: string; arrows: Array<{ from: string; to: string }>; chainKey: string } {
  const [stance, arrows, ...rest] = readKey(f).split('~');
  return {
    stance,
    arrows: arrows ? arrows.split(',').map((a) => ({ from: a.slice(0, 2), to: a.slice(2, 4) })) : [],
    chainKey: rest.join('~'),
  };
}
