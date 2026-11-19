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
import { legalSeeGainFor } from './positionReadingService';
import { NO_PROOF, squaresProof, isProof, legalLineProof, lineProofFromUci, type FactProof } from './proof';
import { lineSeatAt } from '../utils/andList';
import type { FactStakes } from './factStakes';
import { LOCAL_THREAD, placeFact, stakesOf, type CoachFact, type ComputerName, type FactSeat } from './coachFact';
import { threadKey } from './gameStory';
import { findPinBreaks, pinBreakLine, pinBreakProof } from './pinBreak';
import { findProphylaxis, prophylaxisKey, prophylaxisLine, prophylaxisIdea, prophylaxisProof, theirWantedMoves } from './prophylaxis';
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
import { buildPriorityFirst } from './playCommentary';
import { openingStoryAt, STORY_KIND } from './openingStory';
import { isEndgameByMaterial } from './gamePhaseService';
import type { FactKind } from './reviewFacetRank';
import type { GamePhase } from '../types';
import { packageForRegister } from './hintRegister';
import { FUNDAMENTAL_TAG } from './principleAttribution';
import { castleByHandMove, kingFromCentre, keptHome, kingSquares } from './kingWalk';
import { knownSlip, knownSlipIndexNow, knownSlipsAt, type KnownSlipContext } from './knownSlips';
import { ifTheyPlay, treeSentence, sayable, baitBranch, baitSentence, everyTakeLoses, everyTakeSentence, type ReplyRead, type ReplyBranch, type TreeTense, landedSquare } from './ifTheyPlay';
import { mateStakes } from './factStakes';
import { MOTIF_OF_TACTIC, MOTIFS } from '../data/tacticMotifs';
import { temptingRefuted, temptingOnBoard, alsoGood, squareChoice, type WeighRead } from './weighedMoves';
import { costStakes } from './factStakes';
import { pawnBreak } from './pawnBreak';
import { oppositeBishops } from './oppositeBishops';
import { planSteps, planStepsText, planStepsKey } from './planSteps';
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
import { fortress, fortressLine, fortressSquares } from './fortress';
import { itineraryAt, itineraryLine } from './reviewPieceItinerary';
import { forcedRunAt, FORCED_RUN_LINE } from './reviewForcedSequence';
import { threatPurpose } from './threatPurpose';
import { temptingCaptureRead, attackerDefenderCount, royalDefenderTarget, rookOnSeventh, badEnemyBishop } from './reviewTeachingPoints';
import { nameEndgamePhase } from './reviewMoveTeaching';
import { passedPawnPush, findTrappedPiece } from './reviewTeachingPoints';
import { enemyKingStuckInCenter } from './reviewSacrifice';
import { findMinorityAttack, findColorComplexWeakness } from './positionReadingService';
import { planRaceClause, planRaceProof } from './planRace';
import { pieceWish } from './pieceWish';
import { theirMoveCost } from './theirMoveCost';
import { threatStoppedBy, playItAnyway } from './opponentMovePurpose';
import { trickSidestepped } from './forkTrick';
import { habitsOf } from './thinkAloud';
import { knownAttack } from './attackLibrary';
import { readTiming, timingClause } from './moveTiming';
import { detectBluff, bluffClause } from './bluffDetector';
import { contrastMoves, contrastClause } from './moveContrast';
import { readTheirMove, READ_FACT_KIND, type EngineLine as ReadLine } from './opponentMoveReads';
import { lineProof } from './proof';
import { holeKey } from './conceptKey';
import { describeStructure } from './boardStructure';
import { exchangeStakes, forkPoints, piecesOn } from './factStakes';
import { detectNewThreat, describeThreatPrevention } from './groundedAnswer';
import { andList as listAnd, countWord } from '../utils/andList';
import { imageryFor } from './factImagery';
import { stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';
import type { PvLine } from './pvPlayback';
import { oppositionTaken, oppositionLine, oppositionSquares } from './oppositionRead';
import { zugzwangMade, zugzwangSyncLine, zugzwangSyncProof } from './zugzwangRead';
import { theoreticalEndingMade, theoreticalEndingMadeLine } from './theoreticalEnding';
import { raceCountMade, raceCountLine, raceCountSquares } from './raceCount';
import { promotionPlayed, promotionChoiceLine, queenMissedLine } from './promotionChoice';
import { defenderTradeMade, keyDefenderLine, defenderSquares } from './keyDefender';
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

type CoachSurface = 'learn' | 'review' | 'lesson' | 'play' | 'chat' | 'tactics' | 'weaknesses' | 'think';

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
  openingTheory: { history: readonly string[]; student: Color };
  /** What each of the last two moves of `history` stops, the order it kept,
   *  the line it cut (gaps B1-B3). `follow`: the line after, when known. */
  moveGains: { history: readonly string[]; student: Color };
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
  endgamePhase: { fen: string; student: Color };
  /** MORE BOARD READS from the student's seat after a move: their king stuck
   *  in the centre (`kingInCentre`), a rook or queen with no safe square,
   *  either side (`trappedPiece`, the played line read for the escape), the
   *  piece that wants a better square (`worstPiece`, never the one the
   *  student's move just put there: `movedTo`), the passed pawn to push
   *  (`passerPush`, not on the move that pushes it: `pushed`), a minority
   *  attack and a weak colour complex either side (`minority`,
   *  `colourComplex`), and the race of two same-kind plans (`raceOfPlans`). */
  kingInCentre: { fen: string; student: Color };
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
  promotionChoice: { fenBefore: string; san: string; student: Color };
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

const LEARN = { wired: 'components/Coach/CoachTeachPage.tsx' } as const;
const REVIEW = { wired: 'services/reviewFullData.ts' } as const;
const PLAY_ASK = { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING); reached on ask through the shared read — owed, one-coach P4' } as const;
/** CHAT ASKS ABOUT A MOVE THROUGH THE ONE COMPOSER (`questionThought` →
 *  `moveThoughtFacts`): a computer that file reads is in every move answer. */
const CHAT_VIA_THOUGHT = { wired: 'services/moveThoughtFacts.ts' } as const;
/** The live composer reads it for every surface that does not read it itself
 *  — chat's board answers and the tapped read on Play (2026-10-15). */
const COMPOSER = { wired: 'services/positionFacts.ts' } as const;
/** LEARN HOW TO THINK (one coach, David 2026-11-17): the step's teaching reads
 *  the composer and the step board's registry reads (`moveThoughtFacts.stepThought`). */
const THINK = { wired: 'services/moveThoughtFacts.ts' } as const;
/** LEARN HEARS THE ONE FACT SET (David 2026-11-17: "all computers feed the
 *  coach to all surfaces"): the live turn reads `moveThoughtFacts` for the
 *  student's move and their reply and hands its facts to the door on the
 *  `thought` lane (`learnSharedFacts`), which holds a move named unasked. */
const LEARN_VIA_THOUGHT = { wired: 'services/moveThoughtFacts.ts' } as const;
const THINK_BOOK = { not: 'opening book knowledge — taught by the opening lessons, not a step of thinking' } as const;
const TACTICS_NA = { not: 'a puzzle position poses one tactic; this computer explains a game move' } as const;
/** THE ENDGAME TECHNIQUE READS (WO-DANYA-READS-01 #5): read off a move by the
 *  one composer and the Review walk; the position read says them standing. */
const ENDING_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
  learn: LEARN_VIA_THOUGHT,
  tactics: { not: 'a puzzle poses one tactic; endgame technique is the ending\'s plan' },
  weaknesses: { not: 'a reading of the ending said once — no question of the student\'s posed' },
};
const WEAK_OWED = { not: 'owed — one-coach P3: the record keeps the proof' } as const;
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
/** Learn's turn door reads its lanes, not the registry's composer reads; a
 *  move read of the S4 king group joins it as a lane — owed. */
const KING_LEARN_OWED = { not: 'owed — Learn\'s door (learnTurnDoor) reads its own lanes; this read joins it as a lane' } as const;
const STRUCT_TACTICS = { not: 'a structural judgement is about a game\'s plan; a puzzle poses one tactic' } as const;
const STRUCT_WEAK = { not: 'owed — the weakness record keeps tags, not the structure read; the held rows ride recordTeachingEvidence' } as const;

/** The piece a poisoned-by-the-line sentence names. */
const POISON_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function safe<T>(f: () => T | null): T | null {
  try { return f(); } catch { return null; }
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
const SLIP_NOT_PLAY: SurfaceAnswer = { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING); the Openings Play rung calls out the live punish itself (findLivePunishment)' };
const SLIP_NOT_TACTICS: SurfaceAnswer = { not: 'a puzzle poses one tactic; a known slip is about a game move at a board the index holds' };
const SLIP_NOT_WEAK: SurfaceAnswer = { not: 'the slip played is graded as the move\'s own cost and filed by the record\'s writers; the index adds no skill of its own' };
/** The slip read on ONE move's board (`knownSlip`, `trapAhead`): the lesson
 *  and chat composer and the Review walk each read their own move. */
const KNOWN_SLIP_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: { wired: 'services/moveThoughtFacts.ts' },
  learn: { not: 'Learn reads both seats\' last two moves at once through slipsOnLine' },
  review: { wired: 'services/reviewFullData.ts' },
  play: SLIP_NOT_PLAY,
  chat: { wired: 'services/moveThoughtFacts.ts' },
  tactics: SLIP_NOT_TACTICS,
  weaknesses: SLIP_NOT_WEAK,
  think: THINK_BOOK,
};
/** The slips on the line just played (`slipsOnLine`): Learn's turn. */
const SLIPS_ON_LINE_SURFACES: Record<CoachSurface, SurfaceAnswer> = {
  lesson: { not: 'the lesson composer reads each move\'s board itself through knownSlip and trapAhead' },
  learn: LEARN,
  review: { not: 'the Review walk reads each ply\'s board itself through knownSlip and trapAhead' },
  play: SLIP_NOT_PLAY,
  chat: { not: 'the chat composer reads the move\'s board itself through knownSlip and trapAhead' },
  tactics: SLIP_NOT_TACTICS,
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
  learn: { not: 'owed: each reads the engine lines around the move (the cost, the lines before it, the line after), and Learn\'s door reads its history-only rows' },
  review: { wired: 'services/moveThoughtFacts.ts' },
  play: PLAY_ASK,
  chat: CHAT_VIA_THOUGHT,
  tactics: { not: 'a puzzle poses one tactic; a trade is a game move\'s choice' },
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
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: { not: 'owed — a pin puzzle could say the pin is illusory' }, weaknesses: WEAK_OWED, think: { not: 'the pin the student\'s move just made: a step board\'s own pins are read by pinBreakOwn' } },
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
        heldForm: prophylaxisIdea(ph) });
    }),
    computer: 'findProphylaxis',
    kind: 'timing',
    phase: ANY,
    surfaces: { lesson: { not: 'a lesson says the stop as the move that made it (moveThoughtFacts: findProphylaxis, kind stop); this is the stop still to play, which a model line plays' }, learn: LEARN, review: { not: 'Review says the stop after it was missed (prophylaxisMissed), never as advice on a game already played' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
    surfaces: { lesson: { not: 'a lesson plays the stop; there is no missed stop in a taught line' }, learn: { not: 'Learn says the stop before the move (prophylaxis), never the miss after it' }, review: REVIEW, play: PLAY_ASK, chat: { not: 'chat answers about the board in front of it, not a past stop' }, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: { not: 'a step board has no earlier move to have stopped it' } },
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
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: { not: 'needs the student\'s move and their reply; a step board stops at one move' } },
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
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
      play: PLAY_ASK,
      chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle has no opening story' },
      weaknesses: { not: 'owed — a named structure cost left unanswered is a broken answer the record could keep' },
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
      lesson: { not: 'a taught line is the book: there is no departure to name' },
      learn: LEARN,
      review: { not: "the walk speaks none: the Theory button says the book move at the student's departure (reviewOpeningTheory → bookMoveWhy); Review's deep dive is designed with David first" },
      play: COMPOSER,
      chat: COMPOSER,
      tactics: { not: 'a puzzle has no book departure' },
      weaknesses: { not: 'owed — the departure row (bookDepartureWeakness) could carry the job' },
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
    read: ({ history, student }, fact) => safe(() => {
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
    }),
    computer: 'openingTheoryFacts',
    // The door's word for a fact about the opening itself (the name group).
    kind: 'opening',
    phase: NOT_ENDING,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: { not: 'Play volunteers nothing; the Openings Play rung speaks its own slip lines' },
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: { not: 'a puzzle has no opening theory' },
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
    surfaces: SLIPS_ON_LINE_SURFACES,
  },
  moveGains: {
    // WHAT A MOVE STOPS, THE ORDER IT KEEPS, THE LINE IT CUTS (gaps B1-B3,
    // David 2026-11-12: "I want the gap filled" — on every surface). Learn
    // reads the student's move and the reply: "Your move stops …Bg4, which
    // would pin your knight on f3 against your queen on d1".
    read: ({ history, student }, fact) => safe(() => {
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
    }),
    computer: 'moveStops',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' },
      learn: LEARN,
      review: { wired: 'services/moveThoughtFacts.ts' },
      play: { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING)' },
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: { not: 'a puzzle poses one tactic' },
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
      play: { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING)' },
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_NA,
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
      play: { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING)' },
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: { not: 'a puzzle poses one tactic; the order is its solution, played out' },
      weaknesses: WEAK_OWED,
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
      play: { not: 'Play volunteers nothing (PLAY_VOLUNTEERS_COACHING)' },
      chat: { wired: 'services/moveThoughtFacts.ts' },
      tactics: TACTICS_NA,
      weaknesses: WEAK_OWED,
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
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
      lesson: { not: 'a lesson is not the student\'s game: no record of theirs is read back (David 2026-10-28)' },
      learn: LEARN,
      review: { wired: 'services/coachFeatureService.ts' },
      play: COMPOSER,
      chat: COMPOSER,
      tactics: { not: 'a puzzle has no book departure' },
      weaknesses: { not: 'owed — the departure row is the weakness itself' },
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
      return fact({ key, claims: [key], text: queenGrabTrapLine(t), proof, squares: [t.from, t.to, t.replyFrom, t.replyTo, ...(proof.squares ?? [])], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'findQueenGrabTraps',
    kind: 'tactic',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: { wired: 'services/reviewTeachingPoints.ts' }, play: COMPOSER, chat: COMPOSER, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: THINK },
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
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { not: 'chat\'s threat question reads the same must-defend computer (groundedAnswer.assembleThreatAnswer → computeMustDefend) and proves each target there; this read proves a warning another surface wrote' }, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: { not: 'said with a threat warning a surface named; the step\'s own question asks for the threat' } },
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
      play: PLAY_ASK, chat: { not: 'chat\'s threat question reads the same must-defend computer (assembleThreatAnswer → computeMustDefend: each target, what hits and guards it, the moves that keep it); "why that move?" says how a move meets a threat through the thought\'s rescue and guard facts' }, tactics: TACTICS_NA, weaknesses: WEAK_OWED,
      think: { not: 'answers a threat a surface just named; the answer-danger step names its own key' },
    },
  },
  structureMove: {
    // The surface says whether the better move and the move played may be
    // named (Learn holds both, David 2026-10-10; Review names them).
    read: (ctx, fact) => safe(() => studentMoveStructure(ctx).map((r) => structureFact(r, fact, ctx.fenBefore, 'student'))),
    computer: 'studentMoveStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_NO_STUDENT_MOVE, learn: { wired: 'services/learnBoardTeaching.ts' }, review: REVIEW, play: PLAY_ASK, chat: { not: 'a move judgement answers "why was my move bad"; chat reads the board judgements (structureBoard)' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK, think: { not: 'judges a move by its graded cost, which a step board\'s teaching does not compute' } },
  },
  structureTheirMove: {
    read: ({ fenBefore, san, student }, fact) => safe(() => theirMoveStructure(fenBefore, san, student).map((r) => structureFact(r, fact, fenBefore, 'opponent'))),
    computer: 'theirMoveStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK, think: THINK },
  },
  structureBoard: {
    read: ({ fen, student }, fact) => safe(() => boardStructure(fen, student).map((r) => structureFact(r, fact, fen, 'student'))),
    computer: 'boardStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: LESSON_BOARD, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: { wired: 'services/groundedAnswer.ts' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK, think: THINK },
  },
  structureLines: {
    read: ({ fen, student, lines, namesMoves }, fact) => safe(() => linesStructure(fen, student, lines, namesMoves).map((r) => structureFact(r, fact, fen, 'student'))),
    computer: 'linesStructure',
    kind: 'judgement',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: { not: 'chat\'s assessment has no MultiPV in hand' }, tactics: STRUCT_TACTICS, weaknesses: STRUCT_WEAK, think: THINK },
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
    surfaces: { lesson: { not: 'a lesson says ONE plan, the one the strongest games show where its line ends (openingGenerator.lessonPlanOutro → computedPlanAt); the per-move plan thread follows a game the student plays' }, learn: LEARN, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: { not: 'chat\'s plan question is answered by the same plan computer the thread speaks (groundedAnswer.assemblePlanMethodAnswer → planChoice.methodRead); the thread itself is one game\'s memory' }, tactics: TACTICS_NA, weaknesses: WEAK_OWED, think: { not: 'a plan carried across a game\'s moves; a step board is one position' } },
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
      weaknesses: { not: 'the record half is the classifier: missedTacticService.detectTacticType asks geometryMotif' },
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
        seat: mine ? 'student' : 'opponent', namesStudentMove: !!held, thread: LOCAL_THREAD, fen, ...(held ? { heldForm: held } : {}) });
    }),
    computer: 'castleByHandMove',
    kind: 'castling',
    phase: NOT_ENDING,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'the record half is positionPosed: castleByHand poses king-stuck-center' }, think: THINK },
  },
  kingFromCentre: {
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const r = kingFromCentre(fenBefore, san);
      if (!r) return null;
      const mine = new Chess(fenBefore).turn() === student;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: NO_PROOF.method, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'kingFromCentre',
    kind: 'nugget',
    phase: NOT_ENDING,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'a rule of thumb poses no question of its own; the king walk it closes is recorded through castleByHand' }, think: THINK },
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
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'a piece kept home on purpose is a choice, not a skill the board poses' }, think: THINK },
  },
  kingSquares: {
    // His 7…Kf8: "obviously not g6 or f6 — you'd get mated … the king to f8 is
    // the correct one". The square was chosen already, so nothing is held.
    read: ({ fenBefore, san, student, lines, bestUci }, fact) => safe(() => {
      const mine = new Chess(fenBefore).turn() === student;
      const r = kingSquares(fenBefore, san, mine ? 'your' : 'their', lines, bestUci);
      if (!r) return null;
      return fact({ key: r.key, claims: [r.key], text: r.text, proof: squaresProof(r.text, r.squares) ?? NO_PROOF.description, squares: r.squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: boardAfter(fenBefore, san) ?? fenBefore });
    }),
    computer: 'kingSquares',
    kind: 'contrast',
    phase: ANY,
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'the record half is capabilitiesPosed: a forced king walk with a mated square poses missed-opponents-threat' }, think: THINK },
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
      play: PLAY_ASK,
      chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      play: PLAY_ASK,
      chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'a move not played poses nothing to record; the move played is graded by its own cost' }, think: THINK },
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
      if (!r) return null;
      const mine = new Chess(fen).turn() === student;
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
      think: THINK,
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
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'two moves of one worth pose no question the student can miss' }, think: THINK },
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
    surfaces: { lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA, weaknesses: { not: 'a square ruled out is a choice explained, not a skill the board poses' }, think: THINK },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; a break is a plan of the game it is played in' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; the bishops are the game\'s structure' },
      weaknesses: { not: 'a reading of the board said once — no question of the student\'s posed' },
      think: THINK,
    },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; a plan is the quiet stretch of a game' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; compensation is the standing of a whole position' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; the minors\' matchup is the game\'s structure' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      return fact({ key: `forced-run:${r.startPly}:${r.length}`, claims: ['forced-run'], text: FORCED_RUN_LINE,
        proof: NO_PROOF.stated, squares: [], stakes: mateStakes(mine ? 'you' : 'them', 2, true),
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenAfter });
    }),
    computer: 'detectForcedMatingSequence',
    kind: 'forced',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      return fact({ key: `purpose:${line.plies.map((p) => p.uci).join(' ')}`, claims: [`purpose:${first.uci}`], text,
        proof: lineProofFromUci(first.fenBefore, line.plies.map((p) => p.uci), lineSeatAt(first.fenBefore, student)) ?? NO_PROOF.stated, squares, stakes: null,
        seat: mine ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: first.fenBefore });
    }),
    computer: 'threatPurpose',
    kind: 'threat',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/coachFeatureService.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: { wired: 'services/projectedLineVoice.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a capture left alone — no question of the student\'s posed' },
    },
  },
  count: {
    read: ({ fen, student }, fact) => safe(() => {
      const text = (() => { const t = attackerDefenderCount(fen, student); return t ? `${openSentence(t)}.` : null; })();
      if (!text) return null;
      return fact({ key: `count:${text}`, claims: [`count:${fen.split(' ')[0]}`], text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });
    }),
    computer: 'attackerDefenderCount',
    kind: 'count',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a reading of the board, no question of the student\'s posed' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a reading of the board, no question of the student\'s posed' },
    },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'the ending named, no question of the student\'s posed' },
    },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
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
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      const mine = findTrappedPiece(fen, student, lineUci);
      if (mine) {
        const text = `Careful — your ${mine.piece} on ${mine.square} is trapped: attacked by the ${mine.attackerPiece} on ${mine.attackerSquare} with no safe square. Look for the cheapest way out.`;
        const squares = [mine.square, mine.attackerSquare];
        out.push(fact({ key: `trapped:${mine.square}`, claims: [`trapped:${mine.square}`], text, proof: squaresProof(text, squares) ?? NO_PROOF.description, squares, stakes: exchangeStakes(fen, [mine.square]),
          seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      return out.length ? out : null;
    }),
    computer: 'findTrappedPiece',
    kind: 'trapped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'a reading of the board — no question of the student\'s posed' },
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
        out.push(fact({ key: `minority:${student}:${mine.target}`, claims: [`minority:${mine.target}`], text, proof: squaresProof(text, [mine.target]) ?? NO_PROOF.description, squares: [mine.target], stakes: null,
          seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      const theirs = findMinorityAttack(fen, enemy);
      if (theirs) {
        const text = `They have a minority attack on the ${theirs.flank} — ${theirs.leverSan} is the lever, leaving you a weak pawn on ${theirs.target} to watch.`;
        out.push(fact({ key: `minority:${enemy}:${theirs.target}`, claims: [`minority:${theirs.target}`], text, proof: squaresProof(text, [theirs.target]) ?? NO_PROOF.description, squares: [theirs.target], stakes: null,
          seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen }));
      }
      return out.length ? out : null;
    }),
    computer: 'findMinorityAttack',
    kind: 'minority',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/learnBoardTeaching.ts' },
      tactics: TACTICS_NA,
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
      const flipped = ((): string => { const p = studentFenAfter.split(' '); p[1] = p[1] === 'w' ? 'b' : 'w'; p[3] = '-'; return p.join(' '); })();
      return fact({ key: `stopped:${stop.threat.san}:${reply}`, claims: [`stopped:${stop.threat.landing}`], text: stop.text, proof: squaresProof(stop.text, squares) ?? NO_PROOF.description, squares, stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: studentFenAfter,
        lines: [{ fen: studentFenAfter, sans: [reply] }, { fen: flipped, sans: [stop.threat.san] }] });
    }),
    computer: 'threatStoppedBy',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
        seat: mover === student ? 'student' : 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenBefore });
    }),
    computer: 'trickSidestepped',
    kind: 'stopped',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
      weaknesses: { not: 'what a move was for — no question of the student\'s posed' },
    },
  },
  theirHabit: {
    read: ({ history, student, sound }, fact) => safe(() => {
      const side: Color = student === 'w' ? 'b' : 'w';
      const hs = habitsOf(history, side, 'their', sound);
      if (hs.length === 0) return null;
      return hs.map((h) => fact({ key: `theirHabit:${h.kind}`, claims: [`habit:their:${h.kind}`], text: h.text, proof: NO_PROOF.description, squares: [], stakes: null,
        seat: 'opponent', namesStudentMove: false, thread: LOCAL_THREAD, fen: fenOfGame(history) }));
    }),
    computer: 'opponentHabits',
    kind: 'their-habit',
    phase: ANY,
    surfaces: {
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: { wired: 'services/thinkAloud.ts' },
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { not: 'the rule a move kept is said once a game from the live read and Review, which hold the ledger of rules already taught' },
      review: REVIEW, play: PLAY_ASK, chat: COMPOSER,
      think: { not: 'the rule a move kept is said once a game from the live read and Review, which hold the ledger of rules already taught' },
      learn: COMPOSER,
      tactics: TACTICS_NA,
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
      lesson: { not: 'the rule the better move kept is said once a game from the live read and Review, which hold the ledger of rules already taught' },
      review: REVIEW, play: PLAY_ASK, chat: COMPOSER,
      think: { not: 'the rule the better move kept is said once a game from the live read and Review, which hold the ledger of rules already taught' },
      learn: COMPOSER,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
    surfaces: ENDING_SURFACES,
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
    surfaces: ENDING_SURFACES,
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
    surfaces: ENDING_SURFACES,
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
    surfaces: ENDING_SURFACES,
  },
  promotionChoice: {
    // His "there are only two circumstances under which it makes sense to
    // underpromote": the piece made and why the queen fails, both seats.
    read: ({ fenBefore, san, student }, fact) => safe(() => {
      const p = promotionPlayed(fenBefore, san);
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
    surfaces: ENDING_SURFACES,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; trading off a key defender is a game move\'s plan' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic with a known answer; practical chances are a worse side\'s game move' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'owed — a puzzle\'s interference is named by its classifier (detectTacticType); this reads a game move' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one tactic; a chain\'s base is the structure of a game' },
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, learn: LEARN_VIA_THOUGHT, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'owed — a puzzle\'s pin is named by its classifier (detectTacticType); this reads a game move' },
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
      review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA,
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
      review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA,
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
      review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: { wired: 'services/moveThoughtFacts.ts' }, review: REVIEW, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT, think: THINK,
      learn: LEARN_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: LESSON_BOARD, learn: KING_LEARN_OWED, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: LESSON_BOARD, learn: KING_LEARN_OWED, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: LESSON_BOARD, learn: KING_LEARN_OWED, review: { wired: 'services/reviewFullData.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: LESSON_BOARD, learn: KING_LEARN_OWED, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: TACTICS_NA,
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
      lesson: LESSON_BOARD, learn: KING_LEARN_OWED, review: { wired: 'services/moveThoughtFacts.ts' }, play: PLAY_ASK, chat: CHAT_VIA_THOUGHT,
      tactics: { not: 'a puzzle poses one mate; its other mates are the puzzle\'s alternative solutions' },
      weaknesses: { not: 'the game is over on a mate — no question of the student\'s left to grade' },
      think: THINK,
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
  if (phase.has('any') || phase.has('endgame')) return false;
  const fen = boardOf(ctx);
  if (!fen) return false;
  try { return isEndgameByMaterial(fen); } catch { return false; }
}

/** The plan thread's adopt step (its state is the game's story's). */
export { adoptPlanTrial, type PlanThread } from './planThread';

/** THE KIND A COMPUTER'S FACTS CARRY: its row's, or — the one computer that
 *  states several — the opening story's beats' (`STORY_KIND`). Typed per
 *  computer, so a surface that speaks a computer under its own vocabulary
 *  (Review's facets, the live clauses) fails to compile on a kind it has no
 *  name for, as the per-surface relabel used to guarantee. */
type KindOf<K extends ComputerId> = K extends 'openingStory' ? (typeof STORY_KIND)[keyof typeof STORY_KIND] : K extends 'planThread' ? PlanLineKind : (typeof BOARD_COMPUTERS)[K]['kind'];
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
