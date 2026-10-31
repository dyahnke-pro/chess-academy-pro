// positionFacts — THE COMPOSER (G0). Ties the new board-truth computers into one
// ordered, DNA-voiced fact packet for a position, gated by the importance model.
// This is the runtime mirror of the offline render-briefing (docs/plans/
// 2026-08-26-position-facts-calculator.md): the COMPUTER selects (importance),
// orders (rank), and writes the clauses in the DNA register; the surface hands
// them to voiceFacts, which voices them in order (or preferRaw speaks them).
//
// RECONCILED, not duplicated:
//  • It takes the surface's EXISTING StockfishAnalysis (the warm eval-bar read) —
//    no second MultiPV scan.
//  • The decision-leverage bar reuses `criticalityThresholds` (scanCriticality's
//    band-free bars, B6), so the two never disagree.
//  • `computeCriticality` is the sharpness SCORE (from the same analysis);
//    `computeImportance` is the speak/rank verdict. One analysis, both reads.
//  • Perturbation (expensive) runs ONLY when importance says the moment matters.
import { NAMES_NO_MOVE, namesMoves, namedSan, type NamesStudentMove } from './studentMoveNaming';
import { fadeLevelsFrom, fadeText } from './fadeText';
import { evalBand } from './evalBand';
import { openSentence, continueSentence } from '../utils/openSentence';
import { lastMoveFromSan, lastMoveFromHistory } from './material';
import { readTrade, findTradeTarget } from './tradeQuality';
import { conceptInstanceKey, tacticGeometryKey, forkThreatKey, looseClaim, plyOfFen, outpostKey, kickKey, type LooseSpells } from './conceptKey';
import { OPPOSITE_WINGS_CLAIM } from './planRace';
import { layerStandings } from './teachingLayers';
import { seatBare } from '../utils/seatPieces';
import { detectBluff, bluffClause, type Bluff } from './bluffDetector';
import { readConversion } from './conversionMethod';
import type { StockfishAnalysis, TacticType } from '../types';
import { computeCriticality, criticalitySignalsFromAnalysis, type CriticalityRead } from './criticality';
import { Chess, type Square } from 'chess.js';
import type { GamePromise } from './learnBoardTeaching';
import { strategicWhyImperative, strategicReason, strategicClaims, principleLine, principleContrastLine, isForcedReply, MOVE_FUNDAMENTAL_TAG } from './moveFundamentals';
import { isTheoryLine } from './bookDeparture';
import { refutedFromFan, candidatesFromAmateur, type FanLine, type RefutedAlternative } from './refutedAlternativeCore';
import { threatStoppedBy } from './opponentMovePurpose';
import { trickSidestepped } from './forkTrick';
import { phaseVerdictLine, phaseVerdictKeys, phaseStockKey } from './reviewPositionalAssessment';
import { stemKeyOf, rotateStem } from '../utils/rotateStem';
import { findPinPressure, PIN_PRESSURE_PRINCIPLE, PIN_PRESSURE_WARNING, pieceName, type PinPressure } from './pinPressure';
import { findGuardRemovals, GUARD_REMOVAL_PRINCIPLE, GUARD_REMOVAL_WARNING, type GuardRemoval } from './guardRemoval';
import { type ImportanceVerdict, type ImportanceSignals } from './narrationImportance';
import { boardStructure } from './structureReads';
import { takingTheAttackerAnswers } from './positionReadingService';
import { readPosition } from './positionalRead';
import { boardPlanFacts, leverSentence } from './boardPlanFacts';
import { judgeMoment, coachTurn, type SurfacePosture } from './coachDecider';
import { rememberPositionFacts } from './positionFactsCache';
import { isMateEval } from './engineConstants';
import { boardStateAfter, inFluxAfter, mateInOneOnBoard, type BoardState } from './boardState';
import type { QuietFact } from './factSelector';
import { criticalityThresholds, type Severity } from './criticalityScan';
import { computeMustDefend, type MustDefend } from './threatOut';
import { computeLeansOn, type LeansOn, type EvalBoardFn } from './perturbation';
import { buildDeliberation, deliberationFacts, deliberationWeighing, deliberationVerdict, ruleOutClaims, NOTHING_SAID, type Deliberation, type HeldVerdict } from './deliberation';
import { detectLatentFork, latentForkClause, type LatentFork } from './latentFork';
import { lineTakesPiece, pawnHit } from './trappedPiece';
import { moverLineProof } from './exchangeLedger';
import { MATERIAL_VALUE } from './pieceValues';
import { detectLatentDanger, latentDangerClause, detectTradeCreatesPin, tradeDangerClause, type LatentDanger, type TradeDanger } from './latentDanger';
import { detectKingExposure, kingExposureClause, detectCentralKingDanger, centralKingDangerClause, type KingExposure, type CentralKingDanger } from './kingSafety';
import { buildOpponentIntent, opponentIntentFacts, type OpponentIntent } from './opponentIntent';
import { planAimKey, structurePlanFact } from './nextPlans';
import { BOARD_COMPUTERS, readBoard, type BoardRead, type LiveComputer } from './boardComputers';
import { detectTactics } from './tacticsDetector';
import { stepPlan, EMPTY_PLAN_STATE, planChangeSentence } from './planMemory';
import { matchClauseKind, matchTacticPattern, matchTag, boostFor, type WeaknessSignal } from './weaknessSignal';
import { studentMomentBoost, isGreyDecision } from './studentMomentBoost';
import { capabilitiesPosed, movePlayedCleanly } from './capabilityEvidence';
import { attributeLiveFundamental, uciToSanAt, type LiveFundamentalReads } from './liveFundamental';

/**
 * THE ENGINE READS AROUND THE STUDENT'S LAST MOVE, raw (C4). White-POV
 * centipawns and UCI lines exactly as the surface holds them; the composer
 * attributes the neglected FUNDAMENTAL from them (`attributeLiveFundamental`)
 * and hands the id to need — the same id Learn speaks, computed once.
 */
export interface LiveMoveReads extends Pick<LiveFundamentalReads, 'historySans' | 'price' | 'bestPvUci' | 'playedPvUci' | 'missedMate' | 'allowedMate'> {
  /** The engine's best move at `fenBefore`, UCI, or null when no read landed. */
  bestMoveUci: string | null;
}

/**
 * The move just played and the board it was played on — plus the reads. `reads`
 * is REQUIRED: `null` is the honest answer for a surface that never graded the
 * move (a phase transition, "read this position"), and a new surface must say
 * so rather than inherit a silent gap the way the live lane did until C4.
 */
/** The played move's cost, student POV: the surface's grade, else the move's
 *  ONE price (`liveMovePrice`, which scores a move outside the fan with
 *  `searchmoves` — 11.Qe1 in the 1380 speedrun sat 4th at the page's depth,
 *  cost ~20 cp, and is a lesson, not "ungraded"). Null when the move was never
 *  priced — never a read before minus a read after (#2 root cause 4). */
export function gradedLoss(lm: Pick<LastMoveInput, 'cpLoss' | 'reads'>): number | null {
  return lm.cpLoss ?? lm.reads?.price?.costCp ?? null;
}

/** The student's move as the one that led to `fen`, or null when it did not. */
function priorLeadingTo(lm: { fenBefore: string; san: string }, fen: string): ReturnType<typeof lastMoveFromSan> {
  try {
    const c = new Chess(lm.fenBefore);
    c.move(lm.san);
    return c.fen().split(' ')[0] === fen.split(' ')[0] ? lastMoveFromSan(lm.fenBefore, lm.san) : null;
  } catch { return null; }
}

export interface LastMoveInput {
  fenBefore: string;
  san: string;
  cpLoss: number | null;
  /** RAW DATA: every SAN of the game up to AND INCLUDING this move, or null
   *  when the surface has no move list. REQUIRED. The composer asks the ONE
   *  book test (`isTheoryLine`) whether the move is theory — a book move is never
   *  graded (`cpLoss` stays null, and the heat map must keep reading it as
   *  ungraded), yet it is by definition not a mistake, so the principle it
   *  follows may be taught. Before this, every book move was silent: 1.e4,
   *  2.Nf3, 3.d4 carried no "why" (re-walk 1380, 2026-09-25). Raw data, not a
   *  verdict, so no surface imports the book test (the composition ceiling). */
  historySans: readonly string[] | null;
  reads: LiveMoveReads | null;
  /** RAW DATA, not a computed answer (WO-TEACH-02 S2): the moves players at
   *  the student's level play at `fenBefore` (the amateur cache's entry), and
   *  the MultiPV fan the surface already read there. The composer costs the
   *  popular alternative off that fan — no new search. Absent / null = the
   *  surface has neither, and nothing is said. */
  popular?: ReadonlyArray<{ san: string; games: number; pct: number }> | null;
  fanBefore?: readonly FanLine[] | null;
}
import type { TacticPatternType } from '../types/tacticTypes';
import { conceptForBoard, definitionKey } from './conceptEngine';
import { lineProof, type FactProof, type Proof } from './proof';
import { lineSeatAt } from '../utils/andList';
import { threatProof } from './threatProof';
import { refutedAltProof } from './refutedAlternativeCore';
import { liveMethodBeat, habitIsOwed } from './methodBeat';
import { naturalDefenceFails, forcingLine, markSacrificeLine } from './methodSignals';
import { habitNeedFrom } from './coachDecider';
import { computeNeed, type StudentNeedContext } from './needScore';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { readCriticalMoment, criticalMomentStatement, opponentOnlyMoveStatement, type CriticalMomentRead } from './criticalMoment';
import { costStakes, exchangeStakes, forkPoints, lineTacticPoints, type FactStakes } from './factStakes';
import { nextMoveAdvice, type MoveAdviceVerdict } from './nextMoveAdvice';
import { depthClauses } from './thinkAloud';
import { classifyPhase } from './gamePhaseService';
import { looseTrigger } from './looseTrigger';
import { exchangeIdeas } from './exchangeIdeas';
import { positionOf } from '../utils/samePosition';

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

interface PositionFactsInput {
  /** HOW THIS SURFACE LISTENS — required, no default (CLAUDE.md §G4.5.15).
   *
   *  `'walk'` = the student asked for this sequence or tapped to hear it
   *  (a Learn lesson, "read this position"), so importance RANKS the moment and
   *  never silences it. `'interrupt'` = silence is the default and the coach has
   *  to earn the word (live play, phase transitions).
   *
   *  There is no safe default: guessing wrong in one direction makes a lesson
   *  mute, and in the other makes a play surface chatty. A new caller fails to
   *  compile until it says which it is. */
  posture: SurfacePosture;
  /** SENTENCES THIS SURFACE HAS ALREADY SPOKEN in this game/lesson — pass back
   *  what the previous call returned in `remember`, unioned.
   *
   *  A standing fact is true for as long as its geometry stands, so it re-earns
   *  its place on every ply: "your pawn on d4 and your queen share that file"
   *  spoke on two consecutive plies of a real game walk. That is the repetition
   *  these surfaces actually suffer from — not duplicate geometry. Omit it and
   *  nothing is suppressed (the wire is inert until a caller keeps the set). */
  alreadySaid?: ReadonlySet<string>;
  /** The spells of the student's loose pieces (Learn keeps them a game): the
   *  must-defend clause says a piece once, then once "still" (`looseClaim`). */
  looseSpells?: LooseSpells | null;
  fen: string;
  /** The side to move at `fen`. Decision-leverage belongs to this side. */
  moverColor: 'w' | 'b';
  /** The student's colour. When the student is to move, the decision facts are
   *  framed as theirs ("your critical moment"); when the OPPONENT is to move,
   *  the same facts are framed as the opponent's INTENT ("White is threatening…")
   *  — so the coach explains both sides, per the teach-both standard. */
  studentColor: 'w' | 'b';
  rating?: number;
  /** The surface's existing analysis (eval-bar read). topLines = the MultiPV fan. */
  analysis: Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl'>;
  /** Realized swing (cp cost, mover-POV) of a move JUST played, if grading one. */
  cpLossCp?: number | null;
  /** The eval (white-POV cp) at the PREVIOUS position, when the caller tracks it.
   *  Enables the STATUS band-change clause — the general's opening read ("you've
   *  taken the better side" / "you've slipped to worse") — which fires ONLY when
   *  the assessment crosses a band, never every ply. Omit → no status clause
   *  (surfaces that don't track a prior eval are unchanged). */
  prevEvalCpWhitePov?: number | null;
  /** A declared teaching beat here (opening name / plan / keystone). */
  teachingBeat?: boolean;
  /** Material hanging to the MOVER right now (they can grab it) — the criticality
   *  `loose` signal. Optional; 0 when not computed. */
  looseNow?: number;
  /** Injected static-eval fn for the perturbation probe. When omitted, leans-on
   *  is skipped (it's the one expensive fact). */
  evalBoard?: EvalBoardFn;
  /** THE STUDENT MODEL (Phase 1 of the unified coach). Precomputed once per
   *  game from getUnifiedWeaknessProfile + getWeaknessLifecycle. When a clause
   *  teaches to a hole THIS student keeps falling in, its rank is boosted so it
   *  leads the briefing — "most important TO THE USER first" (David 2026-09-08).
   *  OPTIONAL + inert: omitted or empty → identical behavior to before (the wire
   *  does nothing until a surface feeds it). NEVER passed on kid surfaces. */
  studentWeaknesses?: readonly WeaknessSignal[];
  /**
   * WHAT THE BOARD ASKED of the student on the move just played, plus whether
   * that move was clean enough to have DEMONSTRATED anything.
   *
   * 🚨 THE SURFACE HANDS OVER RAW BOARD DATA, NOT A COMPUTED ANSWER. The first
   * cut had the caller run `capabilitiesPosed` itself and pass the tags — which
   * made the component compose one more fact-computer and pushed
   * `CoachTeachPage` through its own composition ceiling (63 > 62). The ceiling
   * was right: "each surface composing its own producer is the tax on the ONE
   * mechanism the app grows by." A move's SAN and the board before it are facts
   * the surface already holds; the computing belongs here.
   *
   * `cpLoss: null` is honest for a ply the surface could not grade — green then
   * withholds (unknown is not clean) while GREY still teaches, because grey
   * asks only whether the question was posed.
   */
  lastMove?: LastMoveInput;
  /** THE OPPONENT'S MOVE that produced this board, when the student is to
   *  move — raw board data (the board before it + its SAN), so this composer
   *  can read what that move does TO the student: today, whether it is a BLUFF
   *  (WO-LAYERS-01 step 4 — looks aggressive, wins nothing). Absent = the
   *  surface has no such move; nothing is guessed. */
  opponentLastMove?: { fenBefore: string; san: string };
  /** The game's moves so far (SAN), for what the opponent keeps doing. */
  history?: readonly string[];
  /** WHO READS THE BOARD COMPUTERS (`boardComputers.ts`) — REQUIRED, so a new
   *  caller decides (David 2026-10-15: "Everything gets unified").
   *  `'composer'`: this read speaks them (chat, the tapped read, Play's live
   *  coach, phase narration). `'surface'`: the surface reads them in its own
   *  lanes already (Learn), and two producers of one claim would say it twice. */
  boardComputers: 'composer' | 'surface';
  /** The surface names the best move anyway ("Why?") — its line may speak. */
  namesBestMove?: boolean;
  /** WO-TEACH-02 S2 — the opening principles this game has ALREADY taught
   *  (carried by the surface, committed from `principleSpoken`), so each is
   *  taught once. Absent = the surface does not track them, and no principle
   *  clause is offered (a principle repeated every move is nagging). */
  taughtPrinciples?: ReadonlySet<string>;
  /** WO-TEACH-02 S4 — set when this board is the turn of the game: who's
   *  better, and why, is taken stock of once, here. */
  phaseTurn?: 'middlegame' | 'endgame';
  /** THE STUDENT'S NEED AT THIS PLY (N2) — the second half of the student model,
   *  and the half the live surfaces never had.
   *
   *  `studentWeaknesses` above says which holes this student keeps falling in,
   *  and it RAISES what leads. It cannot say the other thing: whether this
   *  student needs teaching HERE AT ALL. That verdict is `computeNeed` —
   *  book-departure history in this opening, weakness match for what the ply
   *  teaches, line familiarity (five correct repetitions DECAY it to silence),
   *  and their results in the opening. Review has computed it since N2; the
   *  live surfaces never did, so the coach repeated itself on a line the
   *  student has played right five times and pressed no harder on the line
   *  they keep losing. That is the "narrate where the data says they need it"
   *  standard (David 2026-09-15) applied to the surface they actually play on.
   *
   *  A VERDICT, not a context: `computeNeed` is pure but the context behind it
   *  is a Dexie read, and this module stays synchronous and pure. The caller
   *  loads once per game (`useStudentNeed`) and computes per ply.
   *
   *  🚨 THE DECIDER ONLY EVER SEES THIS ON THE STUDENT'S OWN PLY. `computeNeed`
   *  returns `speak: false` for an opponent move by contract — correct in
   *  review, where the walk narrates the student's moves. Live narrates BOTH
   *  sides ("they answer …e6"), so handing it through on an opponent ply would
   *  mute half of every game. On those plies the decider gets `null`, which
   *  reads as speak, and importance alone decides — exactly as before.
   *
   *  OPTIONAL + inert: omitted → identical behaviour to before. */
  studentNeedContext?: StudentNeedContext | null;
}

export interface PositionFactsResult {
  importance: ImportanceVerdict;
  criticality: CriticalityRead;
  /** What the STUDENT must defend (the opponent's standing threat). */
  mustDefend: MustDefend;
  /** The student's best-placed piece + what it leans on. */
  leansOn: LeansOn | null;
  /** The OPPONENT's best-placed piece + what it leans on — the counter, so the
   *  coach can explain their asset AND how to undermine it. */
  opponentLeansOn: LeansOn | null;
  /** The weighing — the top candidates + why each falls short (the discussion).
   *  Null when it's not the student's move or there's nothing to weigh. */
  deliberation: Deliberation | null;
  /** A pin/skewer in waiting on the student's own king/queen (the prevention
   *  layer). Null when the geometry isn't there. */
  latentDanger: LatentDanger | null;
  /** A knight fork exactly two quiet moves away, for EITHER side — the
   *  foresight sibling of `latentDanger`. Null when nothing survives its four
   *  gates. Exposed like its sibling so audits can read it back. */
  latentFork: LatentFork | null;
  /** A TRADE the student could make that would CREATE a pin on their own
   *  king/queen (v2). Null when no capture creates one. */
  tradeDanger: TradeDanger | null;
  /** What the opponent wants — named + branched, when they're on move. Null on
   *  the student's own move / in the opening. */
  opponentIntent: OpponentIntent | null;
  /** Board-true clauses, most-important-first, each TAGGED by kind so a surface
   *  can emit only what its existing lanes don't already cover (no walk-over).
   *  What survived the deciding computer — subsumed duplicates are gone. */
  clauses: ClauseItem[];
  /** Every clause the door did NOT speak, with its reason (`subsumed` + the
   *  winner, `below-bar`, or `said-already`). The observability trail: silence
   *  here is a computed verdict, and this is how you read it back. */
  quiet: QuietFact[];
  /** EVERY clause the computers produced at this board, before the door chose —
   *  with its squares, proof and stakes. The narration speaks `clauses`; a
   *  question asked about this board selects from these (positionFactsCache). */
  candidates: ClauseItem[];
  /** The spoken sentences that are STANDING facts — union these into the set
   *  the caller passes back as `alreadySaid` next ply, and each is said once
   *  per game instead of once per ply. A caller that ignores this keeps the old
   *  behaviour; nothing breaks, it just repeats. */
  remember: string[];
  /** `remember`, per clause (its text and the keys it carries). */
  rememberByClause: Array<{ text: string; keys: string[] }>;
  /** The id of the opening principle that SPOKE this ply (S2), or null — the
   *  surface adds it to `taughtPrinciples` so it is never taught twice. */
  principleSpoken: string | null;
  /** Did this moment earn naming the student's next move, and why — null on
   *  the opponent's ply. Surfaces gate their own move-choice lines on it (the
   *  but-turn / hedge / compare), so there is one decision, not one per lane. */
  moveAdvice: MoveAdviceVerdict | null;
  /** The move held back at a deciding moment, with its reason — the surface
   *  reveals it after the student has answered on the board (or on "show me").
   *  Null whenever the move was named, not earned, or has no computed reason. */
  heldVerdict: HeldVerdict | null;
}

export type ClauseKind = 'status' | 'deliberation' | 'latent-danger' | 'latent-chance' | 'must-defend' | 'key-moment' | 'opponent-intent' | 'student-leans' | 'opponent-leans' | 'fundamental' | 'structure-plan' | 'convert' | 'concept' | 'method' | 'bluff'
  // WO-TEACH-02: the same four teaching kinds review carries as facets — one
  // name on both sides, so FACT_ROLE / FACT_LAYER / TIE_ORDER answer once.
  | 'refuted' | 'rule' | 'stopped' | 'stock'
  // How good a trade is (`tradeQuality`) — the same name review's facet uses.
  | 'trade'
  // THE SPEED-RUN DEPTH (David 2026-10-05: "Should be from one place") — the
  // one producer `thinkAloud.depthClauses`, ranked by the one door like
  // every other fact.
  | 'not-yet' | 'line' | 'their-habit' | 'your-habit' | 'stop-flaw' | 'hole-access' | 'speedrun-read'
  // THE LINE TACTICS (tacticGeometry) — the same name review's facet uses.
  | 'tactic'
  // Attack, sacrifices and kings — `kingAttackReads`, through the same producer.
  | 'king-read'
  // Trades, defence and conversion, principles (`exchangeIdeas.ts`) — the
  // same three names review's facets carry.
  | 'trade-idea' | 'defence-idea' | 'nugget'
  // Batch 1 (opening, order and timing) — the same names review's facets use.
  | 'equivalence' | 'capture-choice' | 'kick' | 'plan-race' | 'timing'
  // Computers batch 2, from the same one producer: reading their move, testing
  // their prevention, a known attacking structure.
  | 'their-read' | 'prevent-test' | 'attack-pattern'
  // The registry's own kinds for the book move, the position's memory and the
  // priority (WO-STORY-MATRIX-01 P1-4): the live read no longer relabels a
  // registry read — it speaks the computer's kind (`BOARD_COMPUTERS[id].kind`).
  | 'opening' | 'last-here' | 'priority';

/** STATUS bands from the student's POV (cp). The general's opening read. */
type StatusBand = 'lost' | 'worse' | 'level' | 'better' | 'winning';
const STATUS_RANK: Record<StatusBand, number> = { lost: 0, worse: 1, level: 2, better: 3, winning: 4 };
function statusBand(studentCp: number): StatusBand {
  // The one ladder (evalBand, census 2026-10-10) — this kept 90/300.
  const band = evalBand(studentCp);
  if (band === 'level') return 'level';
  if (band === 'decisive') return studentCp > 0 ? 'winning' : 'lost';
  return studentCp > 0 ? 'better' : 'worse';
}

/**
 * The STATUS band-change line (student-POV, DNA-terse, directional), or '' when
 * the assessment did not cross a band. Speaks only on a real change — the
 * "say-once standing fact" done right, so it's the general's opening read, never
 * a per-ply "you're better" drumbeat.
 */
export function statusBandChange(studentCp: number, prevStudentCp: number): string {
  const cur = statusBand(studentCp);
  const prev = statusBand(prevStudentCp);
  if (cur === prev) return '';
  const improved = STATUS_RANK[cur] > STATUS_RANK[prev];
  if (improved) {
    if (cur === 'winning') return `You're winning this now — technique from here.`;
    if (cur === 'better') return `You've taken the better side of this.`;
    return `You've clawed it back to level.`;
  }
  if (cur === 'lost') return `This has slipped away — make it as hard as you can.`;
  if (cur === 'worse') return `You've drifted to the worse side here.`;
  return `The edge is gone — it's level again.`;
}
export interface ClauseItem {
  kind: ClauseKind;
  rank: number;
  text: string;
  /** WHICH OF THE STUDENT'S MOVES IT NAMES — REQUIRED (OS-10). */
  namesStudentMove: NamesStudentMove;
  /** The proof this clause rests on, from the computer that produced it
   *  (one-coach P3). A conclusion kind without one is counted at the door. */
  proof?: FactProof;
  /** For a `concept` clause: the concept's id (a TacticPatternType for tactic
   *  concepts) so the weakness boost can match it to the student's SPECIFIC
   *  hole through the canonical vocabulary bridge — a fork concept lands on a
   *  fork-blind student's `analysis:tactic:fork`, not on a generic bucket. */
  conceptId?: string;
  /** For a `tactic` clause: its motif in the analysis vocabulary, joined to
   *  the student's `analysis:tactic:<motif>` hole. */
  motif?: TacticType;
  /** THE GEOMETRY THIS CLAUSE IS ABOUT — coupled AT EMISSION from the computer
   *  that produced it, never scraped back out of the prose.
   *
   *  This is what lets `factSelector` recognise two clauses as ONE CLAIM: the
   *  pin warning and the must-defend can describe the same three squares, and
   *  only coupled geometry can prove it (CLAUDE.md §G4.5.1). A clause with NO
   *  squares is never collapsed — we cannot prove it is a duplicate, and
   *  silence must never be a guess — so leaving this undefined is the safe
   *  direction, not a shortcut. Omitted on purpose where the clause makes no
   *  board claim at all: `status` (an eval band), `key-moment` (a property of
   *  the moment), `convert`, and `method` (a habit, which must survive every
   *  collapse because it is never a restatement of a fact). */
  squares?: readonly string[];
  /** WHAT THIS CLAUSE IS WORTH ON THE BOARD — coupled at emission from the
   *  detector's own numbers (`factStakes.ts`), never inferred from the prose.
   *  The door orders by it. Omitted where the clause carries no material
   *  (a plan, the status band, a habit): those rank below every staked fact. */
  stakes?: FactStakes;
  /** THE CLAIM this clause makes, when it makes one another lane can make too
   *  (a tactic concept: `conceptInstanceKey`). The voice package drops a fact
   *  whose claim was already spoken this game — checked at SPEAK time, so a
   *  lane that ran before the claim was recorded cannot repeat it. */
  claim?: string;
  /** The skill this clause teaches (a MisconceptionTagId), so the fade can
   *  shorten it once the student's record proves it. */
  skill?: string;
  /** THE BOARD THIS CLAUSE DESCRIBES, when it is not the current one: the rule
   *  behind the student's LAST move speaks after their reply, and graded on
   *  the reply's board "challenge their pawn on e4" reads false once e4 has
   *  taken (prod audit 2026-10-06). The voice grades it here instead. */
  gradeFen?: string;
  /** An idea's payoff, for the surface's thread across moves (`learnMemory.notePromise`). */
  promise?: GamePromise;
  /** The lines the clause SAYS, each from the board it starts on — a concept
   *  on a future board is said with the line that reaches it ("If you play
   *  Qd2, …", "After Qd2, Nf6, …"); "g6 has a point: it stops the mate with
   *  Qxh7" names their reply and the threat it stopped (`VoiceFact.lines`). */
  lines?: ReadonlyArray<{ fen: string; sans: readonly string[] }>;
}

/** THE STANDING KINDS — say these once per game, not once per ply.
 *
 *  A pawn structure, a pin in waiting, which piece is doing the work: all true
 *  until the board changes, and all re-derived every ply, so without this the
 *  student hears the same sentence over and over. Deliberately NOT here: a
 *  `must-defend` (a piece STILL hanging must say so again), and anything
 *  move-specific — `concept`, `deliberation`, `fundamental`, `opponent-intent`,
 *  `key-moment`, `method` (which rotates its own stems), `convert`, `status`
 *  (already fires only on a band CHANGE). */
/** A structure plan that REPLACES the one the student last heard is said as a
 *  change — the plan moving is itself the teaching. */
function plyNumberForPlan(fen: string): number {
  const parts = fen.split(' ');
  const move = Number(parts[5] ?? '1') || 1;
  return (move - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}


const SAY_ONCE_KINDS: ReadonlySet<ClauseKind> = new Set<ClauseKind>(['their-habit', 'your-habit', 'hole-access', 
  'structure-plan', 'latent-danger', 'student-leans', 'opponent-leans',
]);

/** A move's from/to squares on the board it is played from — empty when it
 *  does not play there (never a guess). */
function moveSquares(fen: string, san: string): string[] {
  try { const m = new Chess(fen).move(san); return [m.from, m.to]; } catch { return []; }
}

/** A phase fact that names no student move — the same constant the clauses
 *  use, re-exported beside `PhaseFact` so a phase producer answers its
 *  required field from the module that defines it. */
export { NAMES_NO_MOVE };

/** One fact of a phase report, typed — never a sentence — as a surface hands
 *  it to its turn door (`decidePhaseWave`); the door reads its role off
 *  `factKind`. REQUIRED claims:
 *  without them the claim ledger can only match exact words, and a phase
 *  report that restates the turn's own read gets through (root cause 5). */
export interface PhaseFact {
  text: string;
  claims: readonly string[];
  proof: FactProof;
  /** REQUIRED (OS-10): the student move it names, so the door can hold it. */
  namesStudentMove: NamesStudentMove;
  squares?: readonly string[];
  stakes?: FactStakes;
  lines?: ReadonlyArray<{ fen: string; sans: readonly string[] }>;
  /** The board this fact describes when it is not the report's own. */
  gradeFen?: string;
  factKind?: string;
  skill?: string;
}

/** THE CLAIM KEYS of the `i`th spoken clause — the ONE answer every lane that
 *  offers a clause to a door gives, so the door's claim ledger can see that a
 *  phase report and the turn's own position-facts lane are saying ONE fact
 *  (Smith-Morra replay 2026-10-19: both lanes ran this computer on the same
 *  board and only exact words could match). The clause's own claim, its
 *  say-once keys, and its kind and squares on THIS board — position-scoped, so
 *  a fact is never blocked on a later board where it is news again. */
export function clauseClaims(pf: Pick<PositionFactsResult, 'clauses' | 'rememberByClause'>, i: number, fen: string): string[] {
  const c = pf.clauses[i];
  if (!c) return [];
  const where = (c.squares?.length ? [...c.squares].sort().join(',') : c.text.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return [...new Set([
    ...(c.claim ? [c.claim] : []),
    ...(pf.rememberByClause[i]?.keys ?? []),
    // A clause with no claim of its own is keyed by kind and squares on this
    // board; one that names its claim is that claim and nothing else.
    ...(c.claim ? [] : [`pf:${c.kind}:${where}@${fen.split(' ').slice(0, 2).join(' ')}`]),
  ])];
}

/** The ordered clause TEXT, optionally dropping kinds a surface already covers. */
export function clauseText(items: readonly ClauseItem[], exclude: readonly ClauseKind[] = []): string[] {
  return items.filter((c) => !exclude.includes(c.kind)).map((c) => c.text);
}

/** Best-for-the-mover minus runner-up, mover-POV (a bigger gap = more of an
 *  only-move) — READ OFF THE ONE FAN COMPUTER, not scored a second time here.
 *
 *  This used to be a private 10-line copy of `criticalMoment`'s scoring: the
 *  same mover-POV sign flip, the same flat ±100000 mate, the same "fewer than 2
 *  lines can't judge leverage" rule. Two copies of one calculation is the
 *  drifting constant the rot rule bans — they agreed today and nothing made
 *  them agree tomorrow, and the count clause below reads the OTHER one. One
 *  computer now answers both. */
function moverGap12(read: CriticalMomentRead | null): number {
  // Fewer than 2 lines = the MultiPV fan wasn't run wide enough to judge
  // decision-leverage. We can't tell a genuine only-move (1 legal move) from a
  // width-1 analysis without the legal-move count, so claim NO leverage rather
  // than a false only-move (scanCriticality uses legalCount for the real thing).
  return read?.gapCp ?? 0;
}

function severityFromGap(gapCp: number): Severity {
  const th = criticalityThresholds();
  return gapCp >= th.onlyMove ? 'only-move' : gapCp >= th.critical ? 'critical' : gapCp >= th.notable ? 'notable' : 'none';
}

export async function computePositionFacts(input: PositionFactsInput): Promise<PositionFactsResult> {
  const { fen, moverColor, studentColor, analysis } = input;
  const opponentColor: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  const rating = input.rating ?? DEFAULT_STUDENT_RATING;

  // OPENING PHASE — PositionFacts is a MIDDLEGAME live supply. The opening is
  // owned by corpus notes + baked narration (Tiers 1–2); a perturbation "best
  // piece" probe on a near-home position is noise ("their knight on b8 is doing
  // the most work — trade it off" on move one). So in the opening we suppress
  // the whole positional-campaign + decision-leverage set and keep ONLY a real
  // hanging threat (a genuinely dropped piece IS worth saying, even early).
  const fullmove = Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1;
  const openingPhase = fullmove < 10;
  // THE STUDENT ASKED (one coach, 2026-10-09). A question earns the WHOLE read:
  // the gates below exist so narration does not interrupt for nothing, and none
  // of them applies to a question. Every computer runs, the opening included,
  // and nothing is held back for having been said before.
  const asked = input.posture === 'asked';
  const quietOpening = openingPhase && !asked;
  const said = asked ? undefined : input.alreadySaid;

  // Cheap facts (no search): what the STUDENT must defend + the sharpness score.
  const mustDefend = computeMustDefend(fen, studentColor);
  const criticality = computeCriticality(
    criticalitySignalsFromAnalysis(analysis, { looseMaterial: input.looseNow ?? 0, threatNet: mustDefend.net }),
  );

  const evalCpWhitePov = analysis.isMate
    ? (analysis.mateIn ?? 0) > 0 ? 100000 : -100000
    : analysis.evaluation;

  // The weighing (the discussion) — the top candidates + why each falls short.
  // Only the STUDENT's own move is worth weighing out loud, and never in the
  // opening (book, nothing to deliberate). Cheap: no search, chess.js over the
  // fan we already have.
  const studentToMove = moverColor === studentColor;
  const deliberation = (!quietOpening && studentToMove)
    ? buildDeliberation({ analysis, fenBefore: fen, moverColor, opponentLastSan: input.opponentLastMove?.san ?? null })
    : null;

  // The prevention layer — a pin/skewer in waiting on the student's own king or
  // queen (the heartbreak class). Pure board geometry, no engine. Prophylactic,
  // so it's the student's concern on their move, out of the opening.
  const latentDanger = (!quietOpening && studentToMove)
    ? detectLatentDanger(fen, studentColor, { latentOnly: true })
    : null;
  // v2 — a TRADE that would CREATE a pin on your own king/queen (the more
  // actionable warning: "before you trade on X…").
  const tradeDanger = (!quietOpening && studentToMove)
    ? detectTradeCreatesPin(fen, studentColor)
    : null;
  // THE FORK TWO MOVES OUT — the foresight sibling of the pin-in-waiting above.
  // BOTH seats: the student's own opportunity AND the fork coming at them, the
  // student's first (a plan you can execute beats a plan you must prevent).
  // Unlike the pin warnings this runs in the opening too — the Sicilian's
  // Nb5–c7 IS an opening idea — and on either side's move, because a fork you
  // can see coming is worth naming whoever is about to move.
  const studentSeat = studentColor === 'w' ? 'white' as const : 'black' as const;
  // 🔒 THE TWO SEATS ARE TWO DIFFERENT FACTS AND MUST BE HELD APART (2026-09-21).
  // A fork the STUDENT can set up is an opportunity; the same geometry pointing
  // the other way is a danger. They are computed by one detector and they are
  // NOT one signal — folding them together is the seat-blindness the locked
  // "THE SEAT IS PART OF THE SELECTION" rule exists to stop, and it cost three
  // separate wrong answers downstream before this split landed (the must-defend
  // tier, the `incoming` tie-break, and the weakness join). Measured over 3,678
  // plies of real games: the student's own fork fires on 15.1% of plies and the
  // opponent's on 2.6%, so a merged signal is 83% opportunity wearing a threat's
  // label — the error is the COMMON case, not the corner one.
  const latentForkMine = detectLatentFork(fen, studentSeat);
  const latentForkTheirs = latentForkMine
    ? null
    : detectLatentFork(fen, studentSeat === 'white' ? 'black' : 'white');
  // The student's own first — a plan you can execute beats a plan you must
  // prevent — kept as ONE field because every renderer downstream already asks
  // `latentForkClause` for the seat-correct prose.
  const latentFork = latentForkMine ?? latentForkTheirs;

  // A TRAP YOU CAN SPRING (contract 2026-10-10: b4 traps the knight on a5 and
  // "any tactics?" never said so). The engine's best move is a pawn move that
  // leaves a piece no safe square, and its own line takes that piece — the
  // outcome proved, not a mobility count (WO-OUTCOME-01).
  const trapChance = ((): { san: string; to: string; square: string; type: string; proof: string | null } | null => {
    if (!studentToMove) return null;
    const line = analysis.topLines?.[0]?.moves;
    if (!line?.length) return null;
    try {
      const c = new Chess(fen);
      const mv = c.move({ from: line[0].slice(0, 2), to: line[0].slice(2, 4), promotion: line[0][4] });
      const hit = mv ? pawnHit(c.fen(), mv) : null;
      if (!mv || !hit?.trapped || !lineTakesPiece(fen, hit.square, line)) return null;
      return { san: mv.san, to: mv.to, square: hit.square, type: hit.type, proof: moverLineProof(fen, line, studentColor)?.short ?? null };
    } catch { return null; }
  })();

  // §9 king-safety — a castled king with a broken shelter AND real attackers on
  // it. Both conditions, so it never fires on a harmlessly-nicked shield.
  const kingExposure = (!quietOpening && studentToMove)
    ? detectKingExposure(fen, studentColor)
    : null;
  // §9 delayed-castling — an uncastled central king with a crackable centre AND
  // an enemy heavy aimed down its file. Allowed to speak IN the opening (this is
  // exactly the move 6–12 "castle now" lesson), past the first developing moves.
  const centralKingDanger = (studentToMove && fullmove >= 6)
    ? detectCentralKingDanger(fen, studentColor)
    : null;

  // What the OPPONENT wants — named, branched (their idea + your reply, straight
  // from the PVs). Only when they're on move, out of the opening.
  const opponentIntent = (!quietOpening && !studentToMove)
    ? buildOpponentIntent({ analysis, fen })
    : null;

  // STATUS band-change — the general's opening read, only when the caller tracks
  // a prior eval AND the assessment crossed a band (out of the opening, where
  // evals swing on book). The one standing fact that leads the briefing.
  const sSign = studentColor === 'w' ? 1 : -1;
  const statusText = (!quietOpening && input.prevEvalCpWhitePov != null)
    ? statusBandChange(evalCpWhitePov * sSign, input.prevEvalCpWhitePov * sSign)
    : '';

  // ── THE VERDICT ────────────────────────────────────────────────────────────
  // Step 1 of the ONE deciding computer (`coachDecider`). It runs HERE, below
  // the cheap chess.js probes, because two of its inputs come from them: a
  // standing danger this model has no other way to see, and the status band
  // change, which is a teaching beat.
  //
  // This composer used to call `computeImportance` itself and then carry a
  // PRIVATE escape hatch — "speak anyway if a pin/king-danger/band-change was
  // found" — because those probes are not among the importance model's inputs.
  // That escape was a second whether-rule living outside the door, and a second
  // rule is exactly what the merge exists to delete. Feeding the signals in
  // instead means the door decides and the carve-out survives as a REASON, not
  // as a bypass.
  // THE ONE CRITICAL-MOMENT READ for this position — how many moves still hold
  // and what they hold. Feeds BOTH the severity the door grades on and the
  // Learn statement below, so the two can never disagree about the same fan.
  // The ply comes off the FEN rather than from the caller: fullmove + side to
  // move give it exactly, and a derived number cannot drift the way four call
  // sites each passing their own would. Computed HERE (not at the need wire
  // below) because the critical-moment stem rotates on it.
  const plyNumber = (fullmove - 1) * 2 + (moverColor === 'b' ? 1 : 0) + 1;
  const criticalRead = readCriticalMoment({ topLines: analysis.topLines, moverColor });
  const gap12 = moverGap12(criticalRead);
  // A pin or skewer aimed at your own king/queen, a castled king with a broken
  // shelter under real fire, a central king with the file about to open, or a
  // trade that would create one of those. Pure geometry, no engine — and, like
  // must-defend, NOT gated by the contested test: a standing danger is most
  // dangerous precisely where the eval looks settled.
  // 🔴 `latentFork` WAS COMPUTED AND COULD NOT OPEN THE DOOR (T5, fixed
  // 2026-09-21 on David's read: "the algo should decide when a tactic gets
  // mentioned. If it cannot call a tactic two moves away we need to add that
  // capability").
  //
  // It was already detected above and already spoke as a FACT (rank 70, the
  // `latent-danger` clause below) — but it was missing from THIS disjunction,
  // so it never reached `judgeMoment`. On `walk` that is invisible, because
  // every ply speaks anyway. On `interrupt` it meant a fork two moves out could
  // be computed, be true, and never make the ply speak at all: the detector
  // decided WHAT was said once a ply had earned voice, and never WHETHER.
  // A computed fact that cannot reach the decision is not wired.
  //
  // It belongs with these four rather than with the engine signals for the same
  // reason they are here: this is board geometry the eval cannot see, and it is
  // most dangerous exactly where the eval looks settled — so, like must-defend,
  // it is NOT contested-gated.
  //
  // It does not turn the coach into a metronome: `detectLatentFork` stands down
  // at N = 1 (the live threat lane owns that, louder and already correct), and
  // its four gates are designed against precisely that failure — >= 2 targets
  // worth more than the knight, a piece that can ACTUALLY deliver it, reachable
  // in N >= 2 quiet moves, and a landing square that is safe on arrival.
  // DANGER is what is coming AT the student — every member here is computed for
  // the student's own colour, and `latentForkTheirs` is the only half of the
  // fork detector that belongs in that company.
  const standingDanger = !!(latentDanger || latentForkTheirs || tradeDanger || kingExposure || centralKingDanger);
  // CHANCE is its mirror: the fork the student can set up. It opens the door on
  // its own — that is the capability T5 was asked for, "the algo decides when a
  // tactic gets mentioned, including one two moves away" — but it opens it in
  // the TEACHING register, contested-gated, never as a defensive obligation.
  const standingChance = !!latentForkMine;
  // WHAT THE BOARD ASKED of the move just played — computed HERE from the raw
  // board data the surface handed over (see `lastMove`), so no surface has to
  // compose this computer itself.
  const posed: { tags: readonly import('../data/misconceptionTags').MisconceptionTagId[]; playedCleanly: boolean | undefined } = (() => {
    const lm = input.lastMove;
    if (!lm) return { tags: [], playedCleanly: undefined };
    try {
      return {
        tags: capabilitiesPosed(lm.fenBefore, lm.san, input.studentColor === 'w' ? 'white' : 'black').map((c) => c.tag),
        playedCleanly: lm.cpLoss == null ? undefined : movePlayedCleanly(lm.cpLoss),
      };
    } catch { return { tags: [], playedCleanly: undefined }; }
  })();
  // THE FUNDAMENTAL THE LAST MOVE NEGLECTED — computed HERE from the raw reads
  // (C4), by the same computer Learn speaks from, so the id need weighs and
  // the id the coach names are one id. `null` when the surface handed over no
  // reads, no best move, or the move was clean — absent, never guessed.
  const liveFundamentalId: string | null = (() => {
    const lm = input.lastMove;
    if (!lm?.reads) return null;
    try {
      // Their reply, when the move that produced this board answered `lm`.
      const olm = input.opponentLastMove;
      let replySan: string | null = null;
      if (olm) {
        try {
          const c = new Chess(lm.fenBefore);
          c.move(lm.san);
          if (positionOf(c.fen()) === positionOf(olm.fenBefore)) replySan = olm.san;
        } catch { replySan = null; }
      }
      const attrs = attributeLiveFundamental({
        fenBefore: lm.fenBefore,
        playedSan: lm.san,
        replySan,
        studentColor: input.studentColor === 'w' ? 'white' : 'black',
        bestSan: uciToSanAt(lm.fenBefore, lm.reads.bestMoveUci),
        historySans: lm.reads.historySans,
        bestPvUci: lm.reads.bestPvUci,
        playedPvUci: lm.reads.playedPvUci,
        price: lm.reads.price,
        missedMate: lm.reads.missedMate,
        allowedMate: lm.reads.allowedMate,
      });
      return attrs[0]?.id ?? null;
    } catch { return null; }
  })();

  // 🔴 THE PRE-GATE WAS BLIND TO THE STUDENT (fixed 2026-09-21; David: "the
  // algo/heatmap/decision computer all come together to decide when something
  // is spoken"). This `judgeMoment` used to be called with THREE arguments —
  // no student term — and its `importance.speak` is what gates the EXPENSIVE
  // facts below (`computeLeansOn`, `structurePlan`). So a moment this student's
  // own record would have raised never got those facts COMPUTED, and the real
  // door (`coachTurn()`, which DOES get the boost) can only rank facts that exist.
  // The heat map was excluded from the gate deciding what the heat map would
  // later choose between.
  //
  // 🚨 IT IS THE GREY HALF ONLY, AND THAT IS HONEST RATHER THAN LAZY. The boost
  // is `max(red, grey)`. RED needs `needFor.hole`, which is the clause->hole
  // join and cannot exist before the clauses do — computing a second, cheaper
  // hole join here is exactly the duplicated-judgement the rot rule bans. GREY
  // needs only what the board POSED plus the capability profile, both available
  // from `input`. So this passes a LOWER BOUND of the true boost: the pre-gate
  // can only ever become less strict, never raise a moment the real door would
  // not have raised.
  //
  // Grey is also the half that matters most here — "GREY MEANS TEACH IT": a
  // fresh install is 100% grey, and that is precisely the student who was
  // losing the expensive facts.
  const preGateBoost = studentMomentBoost({
    posedTags: posed.tags,
    capabilities: input.studentNeedContext?.capabilities,
  });
  // 🔒 ONE SIGNALS OBJECT, BUILT ONCE, HANDED TO BOTH STEPS (B1, 2026-09-22).
  // The pre-gate (`judgeMoment`, here) and the door (`decide`, below) used to
  // each build their own literal — and the door's copy had no `standingChance`,
  // so the fork-two-moves-out that opened the pre-gate on an interrupt surface
  // was then closed by the door as a legitimate 'importance' silence, with the
  // emission calling it correct. Two literals for one moment is the drift the
  // one-door rule exists to delete; a shared const cannot disagree with itself.
  const momentSignals: ImportanceSignals = {
    decision: { severity: severityFromGap(gap12), gapCp: gap12 },
    cpLossCp: input.cpLossCp ?? null,
    threatNet: mustDefend.net,
    // A band change IS a declared beat — "you've taken the better side" is the
    // general's read, and the importance model already knows how to rank one
    // (contested-gated to the convert beat in a decided game).
    // So is the TURN OF THE GAME (WO-TEACH-02 S4): taking stock of who is
    // better as the middlegame or endgame begins is a keystone, the same way
    // a band change is.
    teachingBeat: !!input.teachingBeat || statusText.length > 0 || !!input.phaseTurn,
    standingDanger,
    standingChance,
    evalCpWhitePov,
    // WdlRead {win,draw,loss} → the [w,d,l] tuple the importance model reads.
    // (Passing the object directly makes wdl[0]/wdl[2] undefined → every
    // position falsely reads "decided" and goes silent.)
    wdl: analysis.wdl ? [analysis.wdl.win, analysis.wdl.draw, analysis.wdl.loss] : null,
  };
  const { importance, speaks } = judgeMoment(momentSignals, input.posture, preGateBoost);

  // Perturbation is expensive → only when the moment earns it AND a probe fn was
  // supplied AND we're out of the opening. Probe BOTH sides: the student's
  // asset, and the opponent's best piece (name their asset + how to undermine
  // it). A teaching beat alone no longer opens this gate — the "best piece"
  // read is a real middlegame imbalance, not opening narration. Its own
  // thresholds still gate whether there's a genuine supporter.
  let leansOn: LeansOn | null = null;
  let opponentLeansOn: LeansOn | null = null;
  if ((asked || importance.speak) && input.evalBoard && !quietOpening && (asked || importance.rank >= 45)) {
    try { leansOn = await computeLeansOn(fen, studentColor, input.evalBoard); } catch { leansOn = null; }
    try { opponentLeansOn = await computeLeansOn(fen, opponentColor, input.evalBoard); } catch { opponentLeansOn = null; }
  }

  // STRUCTURE→PLAN — the campaign line, from a CLEAR pawn structure (passed pawn
  // / IQP). Board-true, textbook, conservative (null when ambiguous). Only when
  // the moment already earns voice, so it rides notable beats, not every ply.
  // SAID ONCE BY ITS PLAN, NOT ITS WORDS. The race counts change every push, so
  // "both sides have a runner: yours on d4 is 4…" then "…on d5 is 3…" were two
  // sentences to a text dedupe and one claim to the ear (hand walk 1200). The
  // plan id carries the verdict (`passer-race:you`), so a FLIP still speaks.
  //
  // AND WHEN THE PLAN CHANGES, SAY SO (David 2026-09-25: "If the structure plan
  // changes then coach should say so"). The memory keeps each spoken plan as
  // `plan:<id>#<n>`, n counting up, so the LAST plan spoken is recoverable from
  // a set: the same plan stays quiet, a different one — including a return to
  // an earlier one — speaks as a change.
  const planFact = (!quietOpening && (asked || importance.speak)) ? structurePlanFact(fen, studentColor) : null;
  const priorPlans = [...(said ?? [])]
    .map((k) => /^plan:(.+)#(\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ id: m[1], n: Number(m[2]) }))
    .sort((a, b) => b.n - a.n);
  const lastPlan = priorPlans[0] ?? null;
  // ONE identity rule for "the same plan" — `planMemory.stepPlan`, the fold
  // review's selector already runs — so the two surfaces cannot disagree.
  const planEvent = stepPlan(lastPlan ? { plan: null, id: lastPlan.id, announcedAt: null } : EMPTY_PLAN_STATE, plyNumberForPlan(fen), planFact).event;
  // The same idea already spoken by the positional read speaks nowhere else.
  // Heard under either of its keys: the positional read's idea, or the plan
  // thread's aim for the same goal (census 9: one passer plan, two keys).
  const planIdeaHeard = (!!planFact?.ideaKey && !!said?.has(planFact.ideaKey)) || (!!planFact?.aim && !!said?.has(planFact.aim));
  const planKey = planFact && !planIdeaHeard && (planEvent === 'announce' || planEvent === 'changed') ? `plan:${planFact.id}#${(lastPlan?.n ?? 0) + 1}` : null;
  const structureText = planIdeaHeard ? ''
    : planFact && planEvent === 'announce' ? planFact.text
    : planFact && planEvent === 'changed' ? planChangeSentence(planFact.text, 'statement')
      : '';

  // FUNDAMENTAL — the teaching idea the STUDENT's best move serves (development /
  // king safety / outpost / center / open file / king activity / passed pawn),
  // ranked + woven, fundamental-first (David 2026-09-06: "tie the fundamentals
  // into the main computer voice; DNA runs through all"). It teaches the IDEA in
  // the imperative, NEVER the SAN, so it never hands over the move on a live
  // board. Fires only on the student's move, out of the opening, when the moment
  // already earns voice or the caller flagged a teaching beat — so it rides the
  // notable moments, never every quiet ply.
  let fundamentalText = '';
  let fundamentalClaim: string | null = null;
  const bestUci = analysis.topLines?.[0]?.moves?.[0] ?? null;
  // The engine's move here as SAN, resolved ONCE. The fundamental clause needs
  // it, and so does the method beat — whose whole gate is "is the move that is
  // there a forcing one", which only the SAN can answer. Resolving it in one
  // place keeps the two from disagreeing about the same move.
  let bestSanHere: string | null = null;
  if (bestUci && bestUci.length >= 4) {
    try {
      const probe = new Chess(fen);
      const bm = probe.move({
        from: bestUci.slice(0, 2),
        to: bestUci.slice(2, 4),
        promotion: bestUci.length > 4 ? bestUci[4] : undefined,
      });
      bestSanHere = bm ? bm.san : null;
    } catch { bestSanHere = null; }
  }
  if (studentToMove && !quietOpening && (asked || importance.speak || input.teachingBeat) && bestSanHere) {
    const idea = strategicWhyImperative(fen, bestSanHere, moverColor === 'w' ? 'white' : 'black');
    // A plan names where it happens — "the plan here: develop into the game"
    // (hand walk 2026-09-27, a queenless ending) points at nothing on the board.
    if (idea && /\b[a-h][1-8]\b|-file\b|castle/.test(idea)) {
      const why = strategicReason(fen, bestSanHere, moverColor === 'w' ? 'white' : 'black');
      fundamentalText = why ? `The plan here: ${idea} — ${why}.` : `The plan here: ${idea}.`;
      fundamentalClaim = strategicClaims(fen, bestSanHere, moverColor === 'w' ? 'white' : 'black')[0] ?? null;
    }
  }

  // THE COMPUTED CONCEPT — the teachable idea of this position, from the SAME
  // analysis this briefing already holds (David 2026-09-14: one computational
  // system; "coach needs to be able to teach the concepts … during game play").
  // conceptForBoard walks the engine's PV and ranks by its swing; the lead joins
  // the briefing as a ranked `concept` clause (tactic 70 — under a must-defend,
  // above a generic "critical moment"; technique/principle 39 — just above
  // `fundamental`, it IS the teaching idea). Positional leads are excluded here:
  // `fundamental` / `structure-plan` already carry them — no walk-over. Never
  // fails the briefing.
  let concept: { id: string; source: string; full: string; short?: string; instance?: string; squares: readonly string[]; boardFen?: string; line?: string[]; pinMove?: { fen: string; san: string } } | null = null;
  try {
    // LEARN NAMES NO MOVE UNASKED, at the source (replay 2026-10-19, 25…Kg8:
    // "After Nhf6+, exf6, Nxf6+, your knight on f6 forks…"): on the student's
    // own turn the concept is read off the board AS IT STANDS — the engine's
    // line for their next move is walked only when the surface names it
    // ("Why?", chat). A Lucena on the board is still taught; the bridge move
    // is not given away.
    const conceptAnalysis = studentToMove && !input.namesBestMove ? undefined : analysis;
    const lead = conceptForBoard(fen, { analysis: conceptAnalysis, studentSide: studentColor === 'w' ? 'white' : 'black', rating, max: 1 })[0];
    // The board the concept is ABOUT travels with it — a concept found on the
    // board after the best move ("Rook on f5 forks king on f8") seats on THAT
    // board; seated on this one it came out half-owned (the rook not there yet).
    // A rule with no pieces named is not spoken live (16.Rxf3 "A trapped piece
    // has no safe square…" about nothing on the board).
    // A STANDING concept (an endgame technique, a matchup) is a claim about the
    // board as it stands, so it is false on a board in flux (hand walk
    // 2026-09-27: "pieces against bare pawns" after Rxf3, with exf3 pending —
    // the next move was a pure pawn ending). A tactic concept is about the
    // move and may still speak.
    const fluxBy = studentToMove ? input.opponentLastMove : input.lastMove;
    const inFlux = !!fluxBy && !!inFluxAfter(fluxBy.fenBefore, fluxBy.san);
    if (lead && lead.source !== 'positional' && !lead.bare && !(inFlux && lead.source !== 'tactic')) concept = { id: lead.id, source: lead.source, full: lead.full, short: lead.short, squares: lead.squares, boardFen: lead.boardFen, line: lead.line };
    // PP ON THE PP (David 2026-10-05) — the pin concept carries its principle
    // where it is RELEVANT: a pin on THIS board whose holder can pile on and
    // win the pinned piece (`findPinPressure`, both seats). Only when no other
    // concept led, or the lead was itself a pin; a pin with nothing to pile on
    // keeps today's clause exactly. Never on a board in flux — a pending
    // recapture changes what the pile-on wins.
    if (!inFlux && (!concept || (concept.source === 'tactic' && concept.id === 'pin'))) {
      const pp = pinPressureConcept(fen, studentColor);
      if (pp) concept = pp;
    }
    // REMOVE THE GUARD (David 2026-10-13: "All computers MUST work both
    // ways") — the same computer the record reads: a piece of theirs held by
    // one guard the student can take or chase, or the student's own piece
    // held by one guard they can. Only when no other concept led, or the lead
    // was itself a removal; never on a board in flux.
    if (!inFlux && (!concept || (concept.source === 'tactic' && concept.id === 'removal_of_guard'))) {
      const gr = guardRemovalConcept(fen, studentColor);
      if (gr) concept = gr;
    }
  } catch { concept = null; }

  // THE METHOD BEAT — the same computer the review path uses, in its live
  // register. Its signals are already on the table: the engine's move here, and
  // whether a real threat is STANDING (the must-defend probe, not the prose).
  // `studentToMove` is the mover test — you teach the habit to the player.
  // Stems rotate on the position's own halfmove count so a long game never
  // repeats one verbatim.
  let methodBeat: string | null = null;
  let methodKey: string | null = null;
  let methodProof: Proof | null = null;
  try {
    const halfmove = Number.parseInt(fen.split(' ')[5] ?? '0', 10) || 0;
    const mb = liveMethodBeat({
      bestSan: bestSanHere,
      threatStanding: mustDefend.net > 0,
      // Always the piece it hits, whatever its worth: the habit's question is
      // never asked without its answer (OS-1 g3 15.c5).
      threatTarget: mustDefend.pieces[0] ? `your ${PNAME[mustDefend.pieces[0].piece.toLowerCase()]} on ${mustDefend.pieces[0].square}` : null,
      isStudentMove: studentToMove,
      realChoice: !!deliberation?.isRealChoice,
      tier: importance.tier,
      looseTarget: studentToMove ? looseTrigger(fen, bestSanHere) : null,
      // Batch 2: look again, calculate on your turn, mark the line — each
      // earned by a line the engine already handed over (methodSignals).
      defenceFails: studentToMove ? naturalDefenceFails(fen, studentColor, analysis.topLines ?? []) : null,
      forcingLine: studentToMove ? forcingLine(fen, analysis.topLines?.[0]) : null,
      sacrificeLine: studentToMove ? markSacrificeLine(fen, analysis.topLines?.[0]) : null,
    }, halfmove, said);
    methodBeat = mb?.text ?? null;
    methodKey = mb?.key ?? null;
    methodProof = mb?.proof ?? null;
  } catch { methodBeat = null; }

  // ── WO-TEACH-02: the four teaching facts review carries as facets ─────────
  const lm = input.lastMove;
  // S2 — the move players at this level reach for, costed off the fan already
  // read at the board the student moved from; proven by its own line.
  const refutedHere = studentToMove && lm && lm.popular && lm.popular.length >= 2 && lm.fanBefore && lm.fanBefore.length > 0 && plyNumber <= 26
    ? refutedFromFan({ fenBefore: lm.fenBefore, playedSan: lm.san, candidates: candidatesFromAmateur(lm.popular), fan: lm.fanBefore, moverWB: studentColor })
    : null;
  // S2 — otherwise the why of a clean move: in the opening the principle it
  // kept (full once, a stem after); past it, its lead fundamental as a stem.
  // `principleLine` decides which, from the board.
  const lmBook = !!lm && lm.historySans != null && isTheoryLine(lm.historySans);
  const ruleHere = !refutedHere && studentToMove && lm && input.taughtPrinciples
    // GRADED clean only — an ungraded move is not a clean one. The 2026-09-24
    // Learn tape praised "O-O-O does what the opening asks" one line after
    // another lane called O-O-O a mistake: the grade had not reached here yet.
    && (lmBook || ((gradedLoss(lm) ?? Infinity) < 50))
    ? (principleLine(lm.fenBefore, lm.san, studentSeat, input.taughtPrinciples, stemKeyOf(lm.fenBefore))
      // A clean move that kept no opening rule: the rule the engine's move kept
      // (never on a book move — theory is not corrected).
      ?? (lmBook || !lm.reads ? null : principleContrastLine(lm.fenBefore, lm.san, uciToSanAt(lm.fenBefore, lm.reads.bestMoveUci), studentSeat, input.taughtPrinciples, stemKeyOf(lm.fenBefore))))
    : null;
  // S3 — the opponent's reply took the student's threat off the board.
  const stoppedReply = studentToMove && lm && input.opponentLastMove
    ? threatStoppedBy(lm.fenBefore, input.opponentLastMove.fenBefore, input.opponentLastMove.san, studentColor)
    : null;
  // The fork trick, both seats (re-walk 1380: 7.Bb3 sidestepping …Nxe4 Nxe4
  // d5 said nothing): the student's own move took theirs off the board, or
  // their reply took the student's.
  const stoppedHere: Array<{ text: string; squares: readonly string[]; lines?: ReadonlyArray<{ fen: string; sans: readonly string[] }> }> = [];
  if (stoppedReply && input.opponentLastMove) {
    // Both moves the sentence names, on the board BEFORE their reply: the
    // reply itself, and the student's threat it stopped (played as if it were
    // the student's turn — the threat is what their move had set up).
    const before = input.opponentLastMove.fenBefore;
    stoppedHere.push({
      text: stoppedReply.text,
      squares: [stoppedReply.threat.from, stoppedReply.threat.landing],
      lines: [{ fen: before, sans: [stoppedReply.reply] }, { fen: sideToMoveFlipped(before), sans: [stoppedReply.threat.san] }],
    });
  }
  if (studentToMove && lm) {
    const own = trickSidestepped(lm.fenBefore, lm.san, studentColor, 'their');
    if (own) stoppedHere.push(own);
  }
  if (studentToMove && input.opponentLastMove && !stoppedReply) {
    const theirs = trickSidestepped(input.opponentLastMove.fenBefore, input.opponentLastMove.san, opponentColor, 'your');
    if (theirs) stoppedHere.push(theirs);
  }
  // S4 — who's better, and why, at the turn of the game.
  // The move that produced `fen` — material in the verdict is read settled.
  const producedBy = studentToMove ? input.opponentLastMove : input.lastMove;
  const fenMove = producedBy ? lastMoveFromSan(producedBy.fenBefore, producedBy.san) : null;
  const stockHere = input.phaseTurn && !analysis.isMate
    ? phaseVerdictLine(fen, studentColor, evalCpWhitePov * sSign, input.phaseTurn, said ?? new Set(), fenMove)
    : null;
  const stockKeys = stockHere
    ? [...phaseVerdictKeys(fen, studentColor, evalCpWhitePov * sSign, said ?? new Set(), fenMove), ...(input.phaseTurn ? [phaseStockKey(input.phaseTurn)] : [])]
    : [];

  // TRADES, JUDGED (David 2026-09-27: "how well the trade benefits the
  // user"). The move just played on either side, and — with the student to
  // move — their worst piece against the opponent's best when one can reach
  // the other. The verdict never contradicts the engine: the student's own
  // move carries its graded cost; the opponent's is judged on the board alone.
  const tradeClauses: ClauseItem[] = [];
  let tradeTargetKey: string | null = null;
  try {
    if (lm) {
      const t = readTrade(lm.fenBefore, lm.san, studentColor, gradedLoss(lm),
        lastMoveFromHistory(lm.historySans?.slice(0, -1), lm.fenBefore));
      if (t) tradeClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'trade', rank: 36, text: t.text, squares: t.squares });
    }
    if (input.opponentLastMove) {
      const t = readTrade(input.opponentLastMove.fenBefore, input.opponentLastMove.san, studentColor, null,
        lm ? priorLeadingTo(lm, input.opponentLastMove.fenBefore) : null);
      if (t) tradeClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'trade', rank: 36, text: t.text, squares: t.squares });
    }
    if (studentToMove) {
      const tt = findTradeTarget(fen, studentColor);
      if (tt && !(said?.has(tt.key))) {
        tradeTargetKey = tt.key;
        tradeClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'trade', rank: 34, text: tt.text, squares: tt.squares });
      }
    }
  } catch { /* the trade read is a bonus, never a blocker */ }
  // THE PLAN FACTS ON A QUESTION (one coach, 2026-10-09): the same producer
  // chat's plan answer renders from — development, breaks, files, outposts,
  // the worst piece, and every plan the structure earns with its method. On a
  // question the read carries them; narration opts in after a live walk.
  const askedPlanClauses: ClauseItem[] = [];
  if (asked) {
    const pf = boardPlanFacts(fen, studentColor === 'w' ? 'white' : 'black');
    if (pf) {
      if (pf.trump && !structureText) askedPlanClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'structure-plan', rank: 36, text: pf.trump });
      for (const p of pf.plans) askedPlanClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'structure-plan', rank: 34, text: p });
      const levers = leverSentence(pf.levers);
      if (levers) askedPlanClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'structure-plan', rank: 33, text: levers, squares: pf.levers.flatMap((l) => l.squares) });
    }
    // THE POSITIONAL READ AND THE STRUCTURE JUDGEMENTS — the computers chat's
    // "how do I stand?" answered from, for both sides. Every one goes in; the
    // ranking decides (G4.5 — the old answer stopped after two).
    try {
      for (const o of readPosition(fen, studentColor === 'w' ? 'white' : 'black')) {
        askedPlanClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'structure-plan', rank: 30, text: o.text, squares: [...(o.squares ?? [])] });
      }
    } catch { /* a read is a bonus, never a blocker */ }
    try {
      for (const r of boardStructure(fen, studentColor)) {
        askedPlanClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'structure-plan', rank: 31, text: r.text, squares: [...r.squares] });
      }
    } catch { /* same */ }
  }
  const composedAll = applyWeaknessBoost(
    [...buildClauses({ refuted: refutedHere && lm ? { fact: refutedHere, squares: moveSquares(lm.fenBefore, refutedHere.alt), proof: refutedAltProof(lm.fenBefore, refutedHere) } : null, rule: ruleHere && lm ? { id: ruleHere.id, text: ruleHere.text, squares: ruleHere.squares, names: ruleHere.names && !input.namesBestMove ? namesMoves(studentColor, input.fen, ruleHere.names) : NAMES_NO_MOVE, gradeFen: ((): string | undefined => { try { const c = new Chess(lm.fenBefore); return c.move(lm.san) ? c.fen() : undefined; } catch { return undefined; } })() } : null, stopped: stoppedHere, stock: stockHere, fen: input.fen, slowDownOwed: habitIsOwed(habitNeedFrom(input.studentWeaknesses ?? []), 'slow-down') && !(bestSanHere && isForcedReply(input.fen, bestSanHere)), criticalRead, criticalAnchor: studentToMove && input.opponentLastMove ? input.opponentLastMove : null, plyNumber, importance, speaks, mustDefend, leansOn, opponentLeansOn, studentToMove, openingPhase, deliberation, latentDanger, latentFork, trapChance, studentSeat, tradeDanger, opponentIntent, statusText, structureText, structureSquares: planFact?.squares, structureClaim: planFact?.ideaKey, fundamentalText, fundamentalNames: fundamentalText && bestSanHere && !input.namesBestMove ? namesMoves(studentColor, fen, namedSan(fen, bestSanHere)) : NAMES_NO_MOVE, fundamentalClaim, studentEvalCp: evalCpWhitePov * sSign, kingExposure, centralKingDanger, namesMoves: !!input.namesBestMove, concept, methodBeat, methodProof, bluff: studentToMove && input.opponentLastMove ? detectBluff(input.opponentLastMove.fenBefore, input.opponentLastMove.san, bestSanHere) : null, alreadySaid: said, looseSpells: input.looseSpells ?? null }), ...tradeClauses],
    input.studentWeaknesses ?? [],
  );

  // ── THE DOOR, STEPS 3-6 ────────────────────────────────────────────────────
  // SUBSUME, then FLOOR, then ORDER. This is what these four surfaces were
  // missing: the clauses were each individually gated and ranked, but nothing
  // ever noticed that two of them could be ONE CLAIM about ONE geometry — two
  // readings of the same fork, or the same pin found by two probes. (Since B12
  // the collapse also requires the same claim FAMILY, so a must-defend and a
  // latent-danger over one geometry — the hang now and the pin that causes it
  // — are two claims and both speak.)
  //
  // THE ORDER IS THE DOOR'S (2026-09-23). Each clause hands over its STAKES —
  // the material it is about and how soon it lands — and the door computes the
  // order the same way it does for review. The floor sweeps descriptions only,
  // so no clause a probe proved is deleted as trivia.
  // THE STUDENT'S NEED (N2) — computed HERE, never at a call site.
  //
  // The ply comes off the FEN rather than from the caller: fullmove + side to
  // move give it exactly, and a derived number cannot drift the way four call
  // sites each passing their own would.
  //
  // 🚨 THE MOVER GUARD. `computeNeed` returns speak:false for an opponent move
  // by contract — right for review, whose walk narrates the student's moves.
  // The live surfaces narrate BOTH sides ("they answer …e6"), so asking it
  // about an opponent ply would mute half of every game. Need answers "does
  // THIS STUDENT need teaching here", which is only ever a question about their
  // own decision; on the opponent's ply it is null and importance decides.
  const studentIsMoving = input.moverColor === input.studentColor;
  const needFor = needClauseFor(composedAll, input.studentWeaknesses ?? []);
  // THE MOVE IS NAMED WHERE IT IS EARNED (David 2026-09-24: "I don't want to
  // hear the best move on every ply … key moments where the user generally
  // makes mistakes"). The weighing + "the move is X" speaks on a deciding
  // moment, or where THIS student's own record says they go wrong (their phase,
  // or a hole these facts hit — the join just above). Never the rating.
  const moveAdvice: MoveAdviceVerdict | null = studentIsMoving
    ? nextMoveAdvice({
      tier: importance.tier,
      phase: classifyPhase(fen, { ply: plyNumber }),
      weaknesses: input.studentWeaknesses ?? [],
      motifHole: needFor.hole,
    })
    : null;
  // QUESTION FIRST AT A DECIDING MOMENT (David 2026-10-02: "The safe version
  // holds the move only at deciding moments, and the student's next move on
  // the board is the answer, so nothing blocks play"). The bad moves are still
  // ruled out loud; the move that holds is HELD and handed back to the surface,
  // which reveals it once the student has played. Only the board's own fork in
  // the road holds — a move earned by the student's record is named as before.
  // LEARN NAMES NO MOVE UNASKED (David 2026-10-10: "Unify"): wherever the
  // moment earns the weighing — the board's fork in the road OR the student's
  // own record — the bad moves are ruled out loud and the move is HELD. It is
  // said only when they ask (Show me, Hint, a question).
  // GREY MEANS TEACH IT (A-plan P1, David 2026-10-17: choices graded C — the
  // weighing spoke on 1 of 67 turns because a fresh record never earned it).
  // A REASONED weighing — alternatives ruled out with the line or the piece
  // that proves it — speaks wherever the record has not proven the questions
  // this board asks; the move itself stays HELD, so nothing is named unasked.
  // Kept apart from `moveAdvice`, which also gates the recommendation lanes.
  // Whether the board POSES the decision is a fact about the board: what was
  // already said this game decides only which sentences of the weighing speak
  // (`heldWeighing`). Read through the said-filter, a rule-out heard earlier
  // un-held the move and its "you found it" credit never came (Learn prod
  // audit 2026-10-21: three credits a game fell to none).
  const weighingGrey = !!(studentIsMoving && deliberation && deliberationWeighing(deliberation, NOTHING_SAID)
    && isGreyDecision((() => {
      try { return capabilitiesPosed(fen, deliberation.best.san, input.studentColor === 'w' ? 'white' : 'black').map((c) => c.tag); } catch { return []; }
    })(), input.studentNeedContext?.capabilities));
  const weighEarned = !!moveAdvice?.speak || weighingGrey;
  const heldVerdict: HeldVerdict | null = weighEarned && deliberation
    ? deliberationVerdict(deliberation)
    : null;
  const heldWeighing = heldVerdict && deliberation ? deliberationWeighing(deliberation, said ?? NOTHING_SAID) : '';
  const adviceDropped = moveAdvice && !weighEarned
    ? composedAll.filter((c) => c.kind !== 'deliberation')
    : heldVerdict
      ? composedAll.flatMap((c) => (c.kind !== 'deliberation' ? [c] : heldWeighing ? [{ ...c, text: heldWeighing }] : []))
      : composedAll;
  // ONE FACT ONCE: the verdict ("The move is Nf3 — it takes aim at the
  // center…") and the fundamental ("The plan here: take aim at the center…")
  // are the same computer on the same move. Where the verdict speaks, the plan
  // line is its echo (hand walk 2340: said back to back).
  const verdictSpeaks = !!deliberation?.bestWhy && adviceDropped.some((c) => c.kind === 'deliberation' && / The move is /.test(` ${c.text}`));
  const composedBase = verdictSpeaks ? adviceDropped.filter((c) => c.kind !== 'fundamental') : adviceDropped;
  // THE SPEED-RUN DEPTH — from the one producer, as facts the door ranks. The
  // line names the move, so it speaks only where the move is earned or the
  // surface names it anyway, and never where the move is held back.
  const depth: ClauseItem[] = depthClauses({
    fen,
    history: input.history ?? [],
    topLines: input.analysis?.topLines ?? [],
    studentColor: studentSeat === 'white' ? 'w' : 'b',
    // "Why?" names the move anyway; elsewhere a held move stays held.
    nameMove: !!input.namesBestMove,
    ...(input.lastMove ? { lastStudentMove: { fenBefore: input.lastMove.fenBefore, san: input.lastMove.san } } : {}),
    ...(input.opponentLastMove ? { lastOpponentMove: input.opponentLastMove } : {}),
  }).map((d) => ({ namesStudentMove: d.namesStudentMove ?? NAMES_NO_MOVE, kind: d.kind, rank: d.kind === 'not-yet' ? 90 : d.kind === 'tactic' ? 84 : d.kind === 'refuted' || d.kind === 'capture-choice' ? 80 : d.kind === 'king-read' ? 76 : d.kind === 'their-read' ? 75 : d.kind === 'stop-flaw' ? 70 : d.kind === 'line' || d.kind === 'kick' || d.kind === 'plan-race' ? 60 : d.kind === 'timing' ? 55 : d.kind === 'hole-access' ? 50 : d.kind === 'speedrun-read' ? 45 : d.kind === 'prevent-test' ? 44 : d.kind === 'attack-pattern' ? 42 : 40, text: d.text, ...(d.proof ? { proof: d.proof } : {}), ...(d.motif ? { motif: d.motif } : {}), ...(d.squares ? { squares: d.squares } : {}), ...(d.lines ? { lines: d.lines } : {}), ...(d.stakes ? { stakes: d.stakes } : {}), ...(d.claim ? { claim: d.claim } : {}), ...(d.promise ? { promise: d.promise } : {}) }));
  // TRADES, DEFENCE AND CONVERSION, PRINCIPLES (computers batch 5) — every
  // read carries its proof and its say-once claim; a read that names the
  // student's next move speaks only where the move is earned, like the depth.
  const ideaClauses: ClauseItem[] = [];
  try {
    const lmCost = lm ? gradedLoss(lm) : null;
    const lmBest = lm?.reads?.bestMoveUci ? uciToSanAt(lm.fenBefore, lm.reads.bestMoveUci) : null;
    for (const x of exchangeIdeas({
      fen,
      student: studentColor,
      lines: input.analysis.topLines,
      studentMove: lm ? { fenBefore: lm.fenBefore, san: lm.san, costCp: lmCost, bestSan: lmBest, history: lm.historySans } : null,
      opponentMove: input.opponentLastMove ?? null,
      nameMove: !!input.namesBestMove,
    })) {
      if (said?.has(x.claim)) continue;
      ideaClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: x.kind, rank: x.kind === 'nugget' ? 30 : 55, text: x.text, squares: x.squares, proof: x.proof, claim: x.claim, ...(x.stakes ? { stakes: x.stakes } : {}) });
    }
  } catch { /* a read is a bonus, never a blocker */ }
  // THE BOARD COMPUTERS Learn speaks, through the one registry, for every
  // surface that does not read them itself — the student to move, each said
  // once through the `alreadySaid` claims. A read that names the student's
  // move speaks it only where the move is earned (as the depth does).
  const registryClauses: ClauseItem[] = [];
  if (input.boardComputers === 'composer' && studentIsMoving) {
    // Each read under its computer's own kind (`BOARD_COMPUTERS[id].kind`),
    // the kind Review and Learn speak it under too (WO-STORY-MATRIX-01 P1-4).
    const push = (id: LiveComputer, rank: number, r: BoardRead | null): void => {
      if (!r || said?.has(r.key)) return;
      const kind: ClauseKind = BOARD_COMPUTERS[id].kind;
      if (r.namesMove && !input.namesBestMove) {
        // The held idea keeps its own proof, squares and line (OS-1 root cause
        // 1) — and IS the read's claim, the move withheld: one key.
        if (r.idea) registryClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'speedrun-read', rank: 45, text: r.idea.text, proof: r.idea.proof, ...(r.idea.squares.length ? { squares: [...r.idea.squares] } : {}), ...(r.idea.lines ? { lines: r.idea.lines.map((l) => ({ fen: l.fen, sans: [...l.sans] })) } : {}), ...(r.idea.motif ? { motif: r.idea.motif } : {}), claim: r.key });
        return;
      }
      registryClauses.push({ namesStudentMove: NAMES_NO_MOVE, kind, rank, text: r.text, squares: [...r.squares], proof: r.proof, claim: r.key, ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.lines ? { lines: r.lines.map((l) => ({ fen: l.fen, sans: [...l.sans] })) } : {}) });
    };
    try {
      push('trapped', 84, readBoard('trapped', { fen, student: studentColor }));
      push('queenGrabTrap', 82, readBoard('queenGrabTrap', { fen }));
      push('pinBreakOwn', 80, readBoard('pinBreakOwn', { fen, student: studentColor }));
      for (const t of detectTactics(fen).tactics) {
        if (t.type === 'pin' && t.beneficiary === studentColor && t.involvedSquares[1]) push('pinBreakTheirs', 80, readBoard('pinBreakTheirs', { fen, student: studentColor, pinned: t.involvedSquares[1] }));
      }
      const first = input.analysis.topLines.map((l) => l.moves[0]).filter((m): m is string => !!m);
      push('prophylaxis', 55, readBoard('prophylaxis', { fen, engineFirstMoves: first }));
      // The priority (unified with Learn, 2026-10-17).
      const bestHere = input.analysis.topLines[0]?.moves?.[0];
      if (bestHere) push('priorityFirst', 28, readBoard('priorityFirst', { fen, student: studentColor, bestUci: bestHere }));
      const order = readBoard('moveOrder', { fen, pv: input.analysis.topLines[0]?.moves ?? [] });
      if (order && input.namesBestMove) push('moveOrder', 55, order);
      if (input.opponentLastMove) push('obligationLifted', 75, readBoard('obligationLifted', { fenBefore: input.opponentLastMove.fenBefore, fenAfter: fen, student: studentColor }));
      if (input.history?.length) push('bookMove', 40, readBoard('bookMove', { history: input.history, student: studentColor }));
      const own = input.lastMove;
      // The count, only when the student's last move lost it.
      if (own) push('countMethod', 30, readBoard('countMethod', { fenBefore: own.fenBefore, playedSan: own.san, student: studentColor, costCp: own.cpLoss }));
      if (own && input.opponentLastMove) push('tiedDefender', 60, readBoard('tiedDefender', { fenBefore: own.fenBefore, fenAfterMove: input.opponentLastMove.fenBefore, fenAfterReply: fen, student: studentColor }));
      const rows = input.studentNeedContext?.bookDepartures ?? [];
      if (own && rows.length) push('lastTimeHere', 70, readBoard('lastTimeHere', { fenBefore: own.fenBefore, playedSan: own.san, rows, currentGameId: null }));
    } catch { /* a read is a bonus, never a blocker */ }
  }
  const composed = [...composedBase, ...depth, ...ideaClauses, ...registryClauses, ...askedPlanClauses];
  const needVerdict = studentIsMoving && input.studentNeedContext
    ? computeNeed({
      ply: plyNumber,
      studentMove: true,
      // See `needClauseFor`: without these the weakness term cannot fire, and a
      // known hole on a familiar line is silent.
      clauseKind: needFor.clauseKind,
      conceptId: needFor.conceptId,
      /**
       * THE EXACT FUNDAMENTAL THIS MOVE BROKE — attributed above from the raw
       * reads the surface handed over (C4, 2026-09-22), by the ONE live
       * computer Learn also speaks from, so the id the need score weighs and
       * the sentence the coach says can never disagree. Review has done the
       * same since `attributeGameFundamentals`; this is the live lane's half.
       * `null` when the surface passed no reads (a phase transition, "read this
       * position") — absent data reads as TEACH, never as silence.
       */
      fundamentalId: liveFundamentalId,
      // THE HEAT MAP ON THE LIVE LANE. Tags and guard travel together — see
      // `posed` on the input.
      posedTags: posed.tags,
      playedCleanly: posed.playedCleanly,
    }, input.studentNeedContext)
    : null;

  const clauseByText = new Map<string, ClauseItem>();
  for (const c of composed) if (!clauseByText.has(c.text)) clauseByText.set(c.text, c);
  const boardHere: BoardState = producedBy
    ? boardStateAfter(producedBy.fenBefore, producedBy.san, fen, evalCpWhitePov)
    : { inFlux: null, mateOnBoard: isMateEval(evalCpWhitePov) || mateInOneOnBoard(fen) };
  const decision = coachTurn({ signals: momentSignals, student: {
      rating,
      weaknesses: input.studentWeaknesses ?? [],
      // THE DATA TERM (algo-based supreme law): matched HERE, where the clauses
      // are still structured. By the time they reach the door they are prose.
      // ONE BOOST COMPUTER, fed by every lane (`studentMomentBoost`): red from
      // the clause->hole join this surface already holds, grey from what the
      // board posed. Replaces the weakness-only boost, which could not see the
      // heat map at all.
      momentBoost: studentMomentBoost({
        hole: needFor.hole,
        posedTags: posed.tags,
        capabilities: input.studentNeedContext?.capabilities,
      }),
      // The mover guard — see `studentNeed` on the input. Need answers "does
      // THIS STUDENT need teaching here", which is only a question about their
      // own move; on the opponent's ply it is null and importance decides.
      need: needVerdict,
      moveAdvice,
      // The student's standing per teaching layer — the same record that
      // feeds the boost above, read as layers (WO-LAYERS-01).
      layers: layerStandings(input.studentWeaknesses ?? [], input.studentNeedContext?.capabilities),
      fade: fadeLevelsFrom(input.studentNeedContext?.heat),
    }, bundle: {
      facts: composed.map((c) => c.text),
      skillOf: new Map(composed.flatMap((c) => (c.skill ? [[c.text, c.skill] as const] : []))),
      proofs: new Map(composed.flatMap((c) => (c.proof ? [[c.text, c.proof] as const] : []))),
      squares: new Map(composed.flatMap((c) => (c.squares && c.squares.length ? [[c.text, c.squares] as const] : []))),
      // WHAT THEY ARE DOING TO YOU — the tie-break inside a same-claim group,
      // taken from the clause KIND (which computer produced it), never guessed
      // from the prose. Their threat, their idea and their best piece are all
      // questions you have to answer; your own assets are not.
      incoming: new Set(composed.filter((c) => c.kind === 'must-defend' || c.kind === 'opponent-intent' || c.kind === 'opponent-leans' || c.kind === 'latent-danger').map((c) => c.text)),
      // WHAT EACH CLAUSE IS WORTH — coupled at emission; the door orders by it.
      stakes: new Map(composed.flatMap((c) => (c.stakes ? [[c.text, c.stakes] as const] : []))),
      // The hole each clause meets in this student's record — the SAME join the
      // need score reads (`clauseHole`), so relevance and need cannot disagree.
      holeByFact: new Map(composed.map((c) => [c.text, clauseHole(c, input.studentWeaknesses ?? [])] as const)),
      // THE CLAIM FAMILY — the clause's own kind, coupled at emission (B12).
      // Two clauses over one geometry collapse only when the same computer
      // produced them; a must-defend and a pin-in-waiting on the same three
      // squares are two claims (now / next move) and both speak.
      family: new Map(composed.map((c) => [c.text, c.kind] as const)),
      // THE BOARD (`boardState`) — the move that produced it is the opponent's
      // when the student is to move, the student's otherwise.
      board: boardHere,
      alreadySaid: said,
    }, posture: input.posture,
    // No method context: this composer already emits its own method beat in the
    // PRESENT-tense register (`liveMethodBeatFor`). Passing one here would
    // append the RETROSPECTIVE stem too — two habits, one of them a lie about a
    // move nobody has played yet.
  });
  const clauses = decision.spoken.flatMap((t) => { const c = clauseByText.get(t); return c ? [c] : []; });

  // What to carry forward so a standing fact is said once — per clause.
  // A method habit is keyed on the HABIT (its stems rotate), once per game.
  const rememberFor = (c: (typeof clauses)[number]): string[] => [
    ...(SAY_ONCE_KINDS.has(c.kind) ? [c.text] : []),
    ...(c.kind === 'method' && methodKey ? [methodKey] : []),
    // A rule-out's loss is said once a game (`ruleOutClaims`).
    ...(c.kind === 'deliberation' && deliberation ? ruleOutClaims(deliberation, said ?? NOTHING_SAID) : []),
    // THE RACE IS THE KING-ATTACK PLAN (OS-11 item 6a): the opposite-wings race
    // carries the plan thread's aim too, so the door keeps one of the two.
    ...(c.kind === 'king-read' && c.claim === OPPOSITE_WINGS_CLAIM ? [planAimKey('king-attack', null) as string] : []),
    ...(c.kind === 'trade' && c.rank === 34 && tradeTargetKey ? [tradeTargetKey] : []),
    // A batch-5 read is said once a game, keyed on its own claim.
    ...((c.kind === 'trade-idea' || c.kind === 'defence-idea' || c.kind === 'nugget') && c.claim ? [c.claim] : []),
    ...(c.kind === 'structure-plan' && planKey ? [planKey, ...(planFact?.ideaKey ? [planFact.ideaKey] : []), ...(planFact?.aim ? [planFact.aim] : [])] : []),
    ...convertRemember([c], input.fen, studentSeat),
    // The passer's shared idea key, so the plan does not re-announce the pawn
    // the conversion line already talked about.
    ...(c.kind === 'convert' && c.claim && /-passer-[a-h]$/.test(c.claim) ? [c.claim] : []),
    // The balance sheet's reasons, under the keys the positional read uses.
    ...(c.kind === 'stock' ? stockKeys : []),
    ...(c.kind === 'concept' && concept?.source === 'tactic' ? [definitionKey(concept.id), conceptInstanceKey(concept.id, concept.squares), ...[tacticGeometryKey(concept.squares)].filter((k): k is string => !!k)] : []),
    // A technique's definition is said once a game too (walk 2026-09-30).
    ...(c.kind === 'concept' && concept?.source === 'technique' ? [definitionKey(concept.id)] : []),
  ];
  const result: PositionFactsResult = {
    importance, criticality, mustDefend, leansOn, opponentLeansOn, deliberation, latentDanger, latentFork, tradeDanger, opponentIntent,
    // Said SHORTER where the student has shown the skill (one fade rule with
    // Learn); the say-once memory above keeps the full text's key.
    clauses: clauses.map((c) => { const l = decision.faded.get(c.text); return l ? { ...c, text: fadeText(c.text, l) } : c; }),
    candidates: [...clauseByText.values()],
    /** Every clause the door silenced, and why — the observability trail. */
    quiet: decision.quiet,
    // What the caller should carry forward so a standing fact is said once.
    // A method habit is keyed on the HABIT (its stems rotate), once per game.
    remember: [...new Set(clauses.flatMap(rememberFor))],
    // …the same keys, per clause, so a surface whose own door may still hold a
    // clause marks said only what it spoke (Learn: a held habit or method was
    // marked said unheard — prod 2026-10-16).
    rememberByClause: clauses.map((c) => ({ text: c.text, keys: rememberFor(c) })),
    // Only a principle the door actually SPOKE is committed as taught.
    principleSpoken: ruleHere && clauses.some((c) => c.kind === 'rule') ? ruleHere.id : null,
    moveAdvice,
    heldVerdict,
  };
  // ONE COMPUTATION, READ BY THE QUESTION THAT FOLLOWS (positionFactsCache).
  rememberPositionFacts(fen, studentColor, input.posture, result);
  return result;
}

/** The say-once key for one tactic INSTANCE — its type on its squares. */
export { conceptInstanceKey };


/**
 * Re-rank the briefing by the STUDENT'S holes — the Phase-1 selector wire. A
 * clause whose kind teaches to a hole this student keeps falling in gets its
 * rank boosted (deterministic, lifecycle-keyed, capped at MAX_WEAKNESS_BOOST so
 * a live safety-critical fact still leads), then the clauses re-sort. Empty
 * signals → identity: the input order (already rank-sorted) is returned
 * untouched, so the wire is inert until a surface feeds a profile. Pure: never
 * mutates the input clauses. G0 — the SPINE decides, the LLM never sees this.
 */
/**
 * THE MOMENT'S STUDENT TERM — the largest boost any clause here earns from this
 * student's own recorded mistakes, for `coachDecider`'s importance step.
 *
 * It reuses `applyWeaknessBoost`'s join EXACTLY (concept id through the tactic
 * bridge, else the clause kind) rather than introducing a second, coarser one —
 * a moment is more worth interrupting for when a fact AT it matches a hole they
 * keep falling in. Returns 0 when there is no data, no match, or the lifecycle
 * marks the hole `fixed`: raise-only, because nothing records CORRECT play yet
 * and absent is not the same as mastered.
 */
/**
 * THE ONE clause→hole join, and the only place it is written.
 *
 * It was hand-written TWICE and a third copy was about to be added for the need
 * wire below. A duplicated join is the drifting-constant the rot rule bans: the
 * two copies agreed today, and nothing made them agree tomorrow.
 *
 * Consumers now: `applyWeaknessBoost` (fact ordering) and `needClauseFor`
 * (which feeds both the need score and, via its matched hole, the ranker).
 */
function clauseHole(c: ClauseItem, signals: readonly WeaknessSignal[]): WeaknessSignal | null {
  if (c.kind === 'concept') return c.conceptId ? matchTacticPattern(c.conceptId as TacticPatternType, signals, 'finds') : null;
  // A line tactic with a motif joins its own `analysis:tactic:<motif>` hole first.
  return (c.kind === 'tactic' && c.motif ? matchTag(`analysis:tactic:${c.motif}`, signals) : null) ?? matchClauseKind(c.kind, signals);
}


/**
 * WHICH CLAUSE THE NEED SCORE IS ABOUT — the fix for a live coach that could
 * not see the student's holes.
 *
 * `computeNeed` takes a `clauseKind`/`conceptId` and re-runs the same join
 * internally (`weaknessTerm`). This call site passed NEITHER, so on every live
 * surface that term — the biggest in the score, at 55 of a 50 bar — was
 * structurally dead, while `input.studentWeaknesses` sat right here feeding
 * `momentBoost`. Measured on a real-shaped profile: a student with a
 * persistent, worsening hanging-piece hole, on a line they had played
 * correctly five times, scored 0 and the coach went SILENT; handed the clause
 * kind it already had, the same ply scores 55 and speaks.
 *
 * No prod audit could see it. Every audit runs on a fresh device, where
 * `gamesPlayed < COLD_START_GAMES` makes the cold-start prior 100 and masks
 * the dead term completely — green on the one profile that cannot show it.
 *
 * Prefer the clause that MATCHES a hole (that is the one need is about); with
 * no match, the top-ranked clause still honestly names what this ply teaches.
 */
function needClauseFor(
  clauses: readonly ClauseItem[],
  signals: readonly WeaknessSignal[],
): { clauseKind: string | null; conceptId: TacticPatternType | null; hole: WeaknessSignal | null } {
  let best: ClauseItem | null = null;
  let bestHole: WeaknessSignal | null = null;
  let bestB = 0;
  for (const c of clauses) {
    const match = clauseHole(c, signals);
    if (!match) continue;
    const b = boostFor(match);
    if (b > bestB) { bestB = b; best = c; bestHole = match; }
  }
  const pick = best ?? clauses[0] ?? null;
  if (!pick) return { clauseKind: null, conceptId: null, hole: bestHole };
  return {
    clauseKind: pick.kind,
    conceptId: pick.kind === 'concept' && pick.conceptId ? (pick.conceptId as TacticPatternType) : null,
    hole: bestHole,
  };
}

function applyWeaknessBoost(clauses: ClauseItem[], signals: readonly WeaknessSignal[]): ClauseItem[] {
  if (signals.length === 0) return clauses;
  let changed = false;
  const boosted = clauses.map((c) => {
    // A CONCEPT clause matches the student's hole by its concept id through the
    // canonical vocabulary bridge (weakness → selector wire, unified-coach P1):
    // a fork concept meets a fork-blind student's hole exactly. Non-tactic
    // concepts (technique/matchup) have no honest single-hole mapping → no boost.
    const match = clauseHole(c, signals);
    if (!match) return c;
    const b = boostFor(match);
    if (b <= 0) return c;
    changed = true;
    return { ...c, rank: c.rank + b };
  });
  if (!changed) return clauses;
  return boosted.sort((a, b) => b.rank - a.rank);
}

/** Fact → board-true DNA clause, emitted most-important-first (rank order). Each
 *  names only what the board really has (the pieces come straight from the
 *  probes, which read the live FEN). The decision-leverage clause is framed by
 *  whose move it is: the STUDENT's ("your critical moment") or, when the opponent
 *  is to move, the opponent's INTENT ("they have a real decision") — so the coach
 *  explains both sides. Empty when nothing earns voice. */
/** The say-once key for a conversion step — the step, never the text. */
/** The skill a rule line teaches — the same table the record writes with
 *  (`MOVE_FUNDAMENTAL_TAG`), read off the rule's own id ("develop",
 *  "mg:outpost|mg-rule:outpost"), never off its prose. */
function ruleSkill(id: string): string | undefined {
  for (const part of id.split('|')) {
    const key = part.replace(/^mg(-rule)?:/, '').split(':')[0];
    const tag = (MOVE_FUNDAMENTAL_TAG as Record<string, string | null | undefined>)[key];
    if (tag) return tag;
  }
  return undefined;
}

export function convertKey(step: string): string { return `convert:${step}`; }

function convertRemember(clauses: readonly { kind: string }[], fen: string, seat: 'white' | 'black'): string[] {
  if (!clauses.some((c) => c.kind === 'convert')) return [];
  const conv = readConversion(fen, seat === 'white' ? 'w' : 'b');
  return conv ? [convertKey(conv.step)] : [];
}

function buildClauses(a: {
  /** The board the clauses describe — the stakes computer reads it. */
  fen: string;
  /** What the student already heard — a conversion STEP is said once (its
   *  text changes with the edge: "a rook up" → "a piece up"). */
  alreadySaid?: ReadonlySet<string>;
  looseSpells?: LooseSpells | null;
  /** Does this student's own record still owe them the slow-down teaching?
   *  Computed by the caller from the weakness lifecycle (`habitNeedFrom`), not
   *  re-derived here — one door, one answer. False when the one move that holds
   *  is a FORCED reply (a plain recapture, a check escape): "slow down —
   *  exactly one move keeps you level" before …dxe5 is not a decision
   *  (Blumenfeld re-walk). */
  slowDownOwed: boolean;
  /** THE ONE CRITICAL-MOMENT READ (`criticalMoment`) — how many moves still
   *  hold and what they hold. Null when the fan carried nothing to count. */
  criticalRead: CriticalMomentRead | null;
  /** The reply that made the board `criticalRead` counted — the statement
   *  names it, so its count is never heard as one about the move before. */
  criticalAnchor: { san: string; fenBefore: string } | null;
  /** Keys the statement's stem rotation — resume-safe, never `Math.random`. */
  plyNumber: number;
  importance: ImportanceVerdict;
  /** The door's verdict for this surface's posture — whether the moment speaks
   *  at all. Distinct from `importance.speak`, which is posture-blind. */
  speaks: boolean;
  mustDefend: MustDefend;
  /** The opponent's last move, read as a bluff (null = none, or no move given). */
  bluff: Bluff | null;
  /** WO-TEACH-02 — see `computePositionFacts`. */
  /** The alternative, plus its squares on the board it was an alternative ON
   *  (the student's pre-move board — coupled there, never from prose). */
  refuted: { fact: RefutedAlternative; squares: readonly string[]; proof?: Proof | null } | null;
  rule: { id: string; text: string; squares: readonly string[]; names: NamesStudentMove; gradeFen?: string } | null;
  stopped: ReadonlyArray<{ text: string; squares: readonly string[]; lines?: ReadonlyArray<{ fen: string; sans: readonly string[] }> }>;
  stock: string | null;
  leansOn: LeansOn | null;
  opponentLeansOn: LeansOn | null;
  studentToMove: boolean;
  openingPhase: boolean;
  deliberation: Deliberation | null;
  latentDanger: LatentDanger | null;
  trapChance: { san: string; to: string; square: string; type: string; proof: string | null } | null;
  latentFork: LatentFork | null;
  /** 🔒 The student's seat — REQUIRED by `latentForkClause`, because the same
   *  fork geometry is an opportunity from one chair and a warning from the
   *  other. Never inferred here. */
  studentSeat: 'white' | 'black';
  tradeDanger: TradeDanger | null;
  opponentIntent: OpponentIntent | null;
  statusText: string;
  structureText: string;
  /** The structure plan's squares and idea key (`StructurePlanFact`). */
  structureSquares?: readonly string[];
  structureClaim?: string;
  fundamentalText: string;
  /** The student's move the fundamental clause is built from. */
  fundamentalNames: NamesStudentMove;
  /** The claim key the fundamental makes (`strategicClaims`), or null. */
  fundamentalClaim?: string | null;
  /** Student-POV eval (cp) at this position. Gates the prophylaxis clause. */
  studentEvalCp: number;
  kingExposure: KingExposure | null;
  centralKingDanger: CentralKingDanger | null;
  /** REQUIRED: may a clause name the student's next move (review, an asked answer)? */
  namesMoves: boolean;
  /** The lead COMPUTED CONCEPT of the position (conceptEngine, from the same
   *  analysis) — the teachable idea, joined to the briefing as a ranked fact.
   *  Null when nothing teachable / positional-only (no walk-over). */
  concept: { id: string; source: string; full: string; short?: string; instance?: string; squares: readonly string[]; boardFen?: string; line?: string[]; pinMove?: { fen: string; san: string } } | null;
  /** The habit to run in this position, present tense. Null when none earned. */
  methodBeat: string | null;
  /** The proof a method beat's earning fact carries (batch 2 habits). */
  methodProof?: Proof | null;
}): ClauseItem[] {
  const { importance, speaks, criticalRead, plyNumber, mustDefend, leansOn, opponentLeansOn, studentToMove, openingPhase, deliberation, latentDanger, latentFork, trapChance, studentSeat, tradeDanger, opponentIntent, statusText, structureText, fundamentalText, studentEvalCp, kingExposure, centralKingDanger, concept } = a;
  // THE WHETHER-QUESTION IS THE DOOR'S. This used to be a private escape hatch
  // here — "speak anyway if a pin / king-danger / band-change was found",
  // because the importance model had no input for any of them. Those signals
  // are fed to `judgeMoment` now (`standingDanger`, and a band change as a
  // teaching beat), so the carve-out lives in the model as a REASON instead of
  // living out here as a bypass, and every surface inherits it.
  if (!speaks) return [];
  const ranked: ClauseItem[] = [];

  // THE STATUS LINE LEADS the briefing (the general's opening read) — highest
  // rank, above the weighing. Only present on a real band-change out of the
  // opening (gated at computePositionFacts).
  if (statusText) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'status', rank: 96, text: statusText });

  // THE WEIGHING LEADS (David 2026-08-26, the keystone) — narrate the choice, not
  // just the winner: the tempting alternatives + why each falls short, then the
  // move. Highest rank so it opens the discussion. Only fires on a genuine
  // student choice out of the opening (gated at computePositionFacts).
  if (deliberation?.isRealChoice) {
    const text = deliberationFacts(deliberation, a.alreadySaid ?? NOTHING_SAID);
    // The choice is worth what the tempting alternative would cost.
    const worst = Math.max(0, ...deliberation.alternatives.map((c) => c.deltaCp));
    if (text) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'deliberation', rank: 95, text, stakes: costStakes(worst) ?? undefined });
  }

  // The prevention layer — a pin/skewer on your own king/queen, guide-don't-tell.
  // Prefer the actionable TRADE warning ("before you trade on X…") when present;
  // otherwise the standing-alignment warning. Only one, never both.
  if (tradeDanger) {
    ranked.push({
      namesStudentMove: NAMES_NO_MOVE, kind: 'latent-danger', rank: 82, text: tradeDangerClause(tradeDanger),
      // Said about the board AFTER the capture ("before you trade on e4: that
      // lines your bishop on e4 up…") — graded there, or it reads false now
      // (scale replay: the most-dropped line across 3,752 positions).
      ...((): { gradeFen?: string } => { try { const c = new Chess(a.fen); return c.move({ from: tradeDanger.tradeFrom, to: tradeDanger.tradeTo, promotion: 'q' }) ? { gradeFen: c.fen() } : {}; } catch { return {}; } })(),
      // The alignment AND the capture that creates it — that whole geometry is
      // the claim, so a must-defend about the same pieces is the same claim.
      squares: [tradeDanger.enemySquare, tradeDanger.frontSquare, tradeDanger.backSquare, tradeDanger.tradeFrom, tradeDanger.tradeTo],
      // The trade walks into the line now: it lands one move after it.
      stakes: { points: lineTacticPoints(tradeDanger.frontPiece, tradeDanger.backPiece), plies: 2 },
    });
  } else if (latentDanger) {
    // Only the pin IN WAITING. A standing one (the line already open) is a live
    // pin the tactic lanes name — hand walk 2340: "their bishop on g4 pins your
    // knight" followed by "your knight on f3 and your queen share that diagonal
    // — that diagonal is a pin". One fact once.
    ranked.push({
      namesStudentMove: NAMES_NO_MOVE, kind: 'latent-danger', rank: 80, text: latentDangerClause(latentDanger),
      squares: [latentDanger.enemySquare, latentDanger.frontSquare, latentDanger.backSquare, ...(latentDanger.shieldSquare ? [latentDanger.shieldSquare] : [])],
      // A LATENT line needs their piece to arrive first.
      stakes: { points: lineTacticPoints(latentDanger.frontPiece, latentDanger.backPiece), plies: 3 },
    });
  }

  // 🚨 RANK 70 — BELOW `must-defend` (75), DELIBERATELY. Its siblings above sit
  // at 78–82, which already puts a latent pin OVER a piece hanging right now;
  // copying that number would have put a fork TWO MOVES AWAY over live
  // material, which is plainly wrong. Foresight is valuable and it is not
  // urgent. (Whether the existing 80/82 is itself too high is a real question
  // and a separate one — not to be changed as a side effect of this build.)
  if (trapChance) {
    const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
    ranked.push({
      // Above the trade warning (82): a piece won now outranks a pin that only
      // opens if you choose to trade.
      kind: 'latent-chance', rank: 84,
      // The trapping move is the student's own next move.
      namesStudentMove: namesMoves(studentSeat === 'white' ? 'w' : 'b', a.fen, namedSan(a.fen, trapChance.san)),
      // The outcome is the ledger's, over the engine's line (outcome gate):
      // the board fact alone when the line proves nothing countable.
      text: `${trapChance.san} traps their ${NAME[trapChance.type] ?? 'piece'} on ${trapChance.square} — it has no safe square to run to${trapChance.proof ? `: ${trapChance.proof}` : ''}.`,
      squares: [trapChance.to, trapChance.square],
      stakes: { points: MATERIAL_VALUE[trapChance.type] ?? 3, plies: 3 },
    });
  }
  if (latentFork && !a.alreadySaid?.has(forkThreatKey(latentFork.square, latentFork.targets.map((t) => t.square)))) {
    ranked.push({
      // 🔒 THE SEAT DECIDES THE KIND. `latentForkClause` has always rendered the
      // two seats differently; the KIND did not, and three consumers read it:
      // the `incoming` tie-break above (which says in its own comment "your own
      // assets are not" questions you must answer, and then received them),
      // `matchClauseKind` (which joined a fork the student can PLAY to a "you
      // get pinned" hole), and the importance signal. One root, one fix.
      kind: latentFork.forker === studentSeat ? 'latent-chance' : 'latent-danger',
      // The route is withheld from the words (OS-10): the clause names no move.
      namesStudentMove: NAMES_NO_MOVE,
      rank: 70, text: latentForkClause(latentFork, studentSeat),
      // The destination and both targets ARE the claim — so a tactic clause
      // about the same geometry subsumes this one rather than stacking on it.
      squares: [latentFork.square, ...latentFork.targets.map((t) => t.square)],
      claim: forkThreatKey(latentFork.square, latentFork.targets.map((t) => t.square)),
      // The fork wins the lesser target, `moves` moves away.
      stakes: { points: forkPoints(latentFork.targets.map((t) => t.piece)), plies: 2 * latentFork.moves },
    });
  }

  // §9 king-safety — an exposed castled king under real fire. Ranks just below
  // the pin/skewer warnings: a drafty king is a standing danger, not a routine
  // plan. Uses the 'latent-danger' kind (same prophylactic family).
  if (kingExposure) {
    ranked.push({
      namesStudentMove: NAMES_NO_MOVE, kind: 'latent-danger', rank: 78, text: kingExposureClause(kingExposure),
      squares: [kingExposure.kingSquare, ...kingExposure.attackerSquares],
    });
  }

  // Incoming fire — the opponent's standing threat against the student (their
  // intent, and the student's must-defend). Board-true, named. This is the ONE
  // fact that speaks in the opening: a genuinely dropped piece is worth saying
  // even on move two.
  // ONE CLAIM, ONE KEY (Blumenfeld walk F28; #4 2026-10-20): the instant
  // lane's "Careful — your rook on c8 is attacked" and this clause are one
  // warning (`looseClaim`): said once, and if the student moves and leaves the
  // piece, once more as "still" — the door's say-once decides, by the claim.
  if (mustDefend.net >= 3 && mustDefend.pieces[0]) {
    const p = mustDefend.pieces[0];
    const loose = looseClaim(p.square, plyOfFen(a.fen), a.looseSpells);
    // PROPHYLAXIS FRAMING (§9 "ignored threat / prophylaxis"): the material fact
    // is the same standing threat, but when the student is clearly WINNING the
    // teaching shifts from "you must survive" to "don't let them punch back in"
    // — the beginner leak of pressing your own plan while up material. Board-true
    // (the threat is the null-move probe's, the advantage is the eval); only the
    // framing changes, so it never invents a threat that isn't there.
    const winning = studentToMove && studentEvalCp >= 200;
    // THE ANSWER THE BOARD ALLOWS, AS A FACT (one coach, 2026-10-09): when
    // their attacker can simply be taken without losing material, say so.
    const takeable = !!(studentToMove && p.attackerSquare && takingTheAttackerAnswers(a.fen, p.attackerSquare as Square, studentSeat === 'white' ? 'w' : 'b'));
    ranked.push({
      namesStudentMove: NAMES_NO_MOVE, kind: 'must-defend',
      rank: 75,
      // THE BOARD FACT, NOT THE OUTCOME OR THE ORDER (WO-OUTCOME-01 C): the
      // probe is a static swap count with no engine line, so it may name the
      // attacker and the missing guard — never "they win it", and never "that
      // has to be met first" (the best move sometimes ignores it).
      text: (() => {
        // A board fact like the rest, never the order "take it first" (the
        // best move sometimes ignores the threat; WO-OUTCOME-01 C).
        const hit = `${p.attacker ? `their ${PNAME[p.attacker]}${takeable ? ` on ${p.attackerSquare}` : ''}` : 'they'} ${p.attacker ? 'attacks' : 'attack'} your ${PNAME[p.piece.toLowerCase()]} on ${p.square}${p.defenders === 0 ? ', and nothing defends it' : ''}${takeable ? ' — and you can take the attacker without losing material' : ''}`;
        if (loose.still) return `Still — ${hit}.`;
        return winning
          ? `You're on top — watch the counterpunch: ${hit}.`
          : `${openSentence(hit)}.`;
      })(),
      claim: loose.key,
      // The attacker's square is part of the claim whenever the words name it
      // (geometry coupled at emission, never read back out of the prose).
      squares: takeable && p.attackerSquare ? [p.square, p.attackerSquare] : [p.square],
      // The null-move probe's own net: taken on their next move.
      stakes: { points: mustDefend.net, plies: studentToMove ? 2 : 1 },
      // Its proof — the count and the capture, the same read Learn's warning
      // speaks (`threatProof`, one computer).
      proof: threatProof(a.fen, studentSeat === 'white' ? 'w' : 'b', [p.square]) ?? undefined,
    });
  }
  // THE BLUFF (WO-LAYERS-01 step 4) — speaks in the opening too: "the knight
  // jumps to d4, a move designed to scare a beginner". Only when a real threat
  // is NOT standing (a must-defend above means something is genuinely hit).
  if (a.bluff && !(mustDefend.net >= 3)) {
    const bluff = a.bluff;
    {
      ranked.push({
        namesStudentMove: NAMES_NO_MOVE, kind: 'bluff', rank: 72,
        text: `${bluffClause(bluff, openingPhase)}.`,
        squares: [bluff.square, ...bluff.targets.map((t) => t.square)],
      });
    }
  }
  // WO-TEACH-02 — the same four teaching facts review carries as `[refuted]`,
  // `[rule]`, `[stopped]` and `[stock]`, ranked where their review twins sit.
  if (a.refuted) {
    // The alternative names a move of the student's: held while it is theirs to play (OS-10,
    // David's record move 4: "Bishop to c4 is a common try here" before his Bc4).
    ranked.push({ kind: 'refuted', rank: 82, namesStudentMove: a.refuted.squares.length >= 2 ? namesMoves(studentSeat === 'white' ? 'w' : 'b', a.fen, { from: a.refuted.squares[0], to: a.refuted.squares[1] }) : NAMES_NO_MOVE, text: a.refuted.fact.text, stakes: costStakes(a.refuted.fact.costCp) ?? undefined, squares: [...a.refuted.squares], proof: a.refuted.proof ?? undefined });
  }
  // A rook or queen principle about a FILE claims that file — the key the
  // positional read's "owns the open d-file" writes too, so one file is one
  // saying across lanes (hand walk 2026-09-27, Rad8: said twice in one turn).
  if (a.rule) ranked.push({ namesStudentMove: a.rule.names, kind: 'rule', rank: 29, text: a.rule.text, squares: [...a.rule.squares], ...(a.rule.gradeFen ? { gradeFen: a.rule.gradeFen } : {}), ...(ruleSkill(a.rule.id) ? { skill: ruleSkill(a.rule.id) } : {}), claim: /open-file|semi-open/.test(a.rule.id) && a.rule.squares[0] ? `file-${a.rule.squares[0][0]}` : /(^|:)outpost(:|$)/.test(a.rule.id) && a.rule.squares[0] ? outpostKey(a.rule.squares[0]) : /(^|:)tempo(:|$)/.test(a.rule.id) && a.rule.squares[1] ? kickKey(a.rule.squares[1]) : undefined });
  for (const st of a.stopped) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'stopped', rank: 27, text: st.text, squares: [...st.squares], lines: st.lines, proof: st.lines?.[0] ? lineProof(st.lines[0], lineSeatAt(st.lines[0].fen, studentSeat === 'white' ? 'w' : 'b')) ?? undefined : undefined });
  if (a.stock) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'stock', rank: 35, text: a.stock });
  // §9 delayed-castling — speaks IN the opening too (the "castle now" moment),
  // ranked just under a live hanging threat. Its gate (central king + tension +
  // aligned enemy heavy) is tight enough to stay off calm development.
  if (centralKingDanger) {
    ranked.push({
      namesStudentMove: NAMES_NO_MOVE, kind: 'latent-danger', rank: 74, text: centralKingDangerClause(centralKingDanger, a.namesMoves),
      squares: [centralKingDanger.kingSquare, centralKingDanger.aimedFrom, centralKingDanger.tensionSquare],
    });
  }
  // In the opening, nothing but a real hanging threat / castle-now speaks — no
  // "critical moment" / "knife-edge" / "best piece, trade it off" on move one.
  // THE METHOD, not the task (WO-LAYERS-01 step 5): the one conversion step
  // this board is on — finish developing, trade pieces, make a passer, escort
  // it, cut off the king. Only on the student's move, when they are a piece or
  // more up. The old generic line stays for a decided game with no such edge.
  const conversion = studentToMove ? readConversion(a.fen, studentSeat === 'white' ? 'w' : 'b') : null;
  // SAID ONCE PER STEP (re-walk 1380, 2026-09-25): keyed on the text, "a rook
  // up — trade pieces" and "a piece up — trade pieces" were two facts, and the
  // same step spoke on three moves running. The step is the idea.
  if (conversion && a.alreadySaid?.has(convertKey(conversion.step))) { /* heard this step already */ }
  // The escort step speaks about ONE passer — the claim the behaviour lane's
  // "long-term trump" writes too, so the pawn is praised once a turn.
  // The step's own key is the claim (walk 2026-10-01: "a piece up — trade
  // pieces" and, two plies on, the character switch "up material — trade
  // down" — one idea, and the switch could not see it had been said).
  // The passer is ONE claim across the plan, the conversion and the
  // positional read: `<seat>-passer-<file>` (the file, so a pawn that advances
  // is the same idea), and its square, so the decider collapses the two.
  else if (conversion) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'convert', rank: 36, text: conversion.text, ...(conversion.step === 'escort-passer' && conversion.passer ? { claim: `student-passer-${conversion.passer[0]}`, squares: [conversion.passer] } : { claim: convertKey(conversion.step) }) });
  else if (importance.tier === 'convert') ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'convert', rank: 20, text: `This is technique now — convert it cleanly, no heroics.` });
  const pushConcept = (): void => {
    if (!concept || (concept.source === 'tactic' && a.alreadySaid?.has(conceptInstanceKey(concept.id, concept.squares)))) return;
    const rank = concept.source === 'tactic' ? 70 : 39;
    // The pile-on move of a pin of the student's is their own next move.
    const pinMover = ((): 'w' | 'b' | null => { try { return concept.pinMove ? new Chess(concept.pinMove.fen).turn() : null; } catch { return null; } })();
    const studentWB: 'w' | 'b' = studentSeat === 'white' ? 'w' : 'b';
    ranked.push({
      namesStudentMove: concept.pinMove && pinMover === studentWB ? namesMoves(studentWB, a.fen, namedSan(concept.pinMove.fen, concept.pinMove.san)) : NAMES_NO_MOVE,
      // SEATED — the detector's instance names bare pieces (hand walk
      // 2026-09-24: "Bishop on h5 pins knight on e2 against queen on d1").
      // The definition is taught once a game (`definitionKey`); after that the
      // board fact speaks alone.
      kind: 'concept', rank, text: concept.pinMove ? concept.full : concept.source === 'tactic' ? afterLine(concept.line, concept.boardFen, a.fen, studentSeat === 'white' ? 'w' : 'b', seatBare(concept.instance && a.alreadySaid?.has(definitionKey(concept.id)) ? `${concept.instance}.` : concept.full, concept.boardFen ?? a.fen, studentSeat === 'white' ? 'w' : 'b')) : (concept.source === 'technique' && concept.boardFen && concept.line?.length && concept.boardFen.split(' ')[0] !== a.fen.split(' ')[0]
        // A technique read off a FUTURE board is said with the line that reaches
        // it, like a tactic — never as if the rook already stood there.
        ? afterLine(concept.line, concept.boardFen, a.fen, studentSeat === 'white' ? 'w' : 'b', concept.full)
        : concept.source === 'technique' && a.alreadySaid?.has(definitionKey(concept.id)) && concept.short ? concept.short : concept.full),
      conceptId: concept.source === 'tactic' ? concept.id : undefined,
      // `ComputedConcept.squares` is the engine's own lead-the-eye set (agent
      // first, then targets) — exactly the geometry the sentence names.
      squares: concept.squares,
      // What the idea wins on its own targets (agent first, then targets).
      stakes: concept.source === 'tactic' ? (exchangeStakes(a.fen, concept.squares.slice(1)) ?? undefined) : undefined,
      claim: concept.source === 'tactic' ? conceptInstanceKey(concept.id, concept.squares) : undefined,
      // The line `afterLine` names is the one drawn — only when it named one.
      // A pile-on names its move, so the move is drawn (G6).
      lines: concept.pinMove ? [{ fen: concept.pinMove.fen, sans: [concept.pinMove.san] }] : (concept.source === 'tactic' || concept.source === 'technique') && concept.line && concept.line.length > 0 && concept.boardFen && !samePlacementFen(concept.boardFen, a.fen) ? [{ fen: a.fen, sans: concept.line }] : undefined,
    });
  };

  // PP on the PP wins material, so — like a hanging piece — it speaks in the
  // opening too (the Bg5 pin and e4-e5 is an opening staple). Every other
  // concept still waits for the middlegame, below.
  if (concept?.pinMove) pushConcept();
  if (openingPhase) return ranked;

  // THE COMPUTED CONCEPT — the teachable idea of this position, from the SAME
  // analysis this briefing already holds (David 2026-09-14: one computational
  // system; "coach needs to be able to teach the concepts … during game play").
  // conceptForBoard walks the engine's PV and ranks by its swing; here the lead
  // concept joins the spoken briefing as a ranked fact:
  //   • a tactic/mate concept (the engine's decisive line) ranks 70 — under a
  //     must-defend (75), above a generic "critical moment" (65): a NAMED winning
  //     idea beats an unnamed one;
  //   • an endgame technique/principle ranks 39 — just above `fundamental` (38),
  //     because it IS the teaching idea for the position.
  // Positional supports are excluded here on purpose: `fundamental` and
  // `structure-plan` already carry them — no walk-over. Text is the engine's
  // gate-clean sentence, spoken verbatim (G0).
  // THE SAME IDEA ON THE SAME SQUARES is not news on the next move (Blumenfeld
  // walk F26: "After Qe6, your queen on e6 and your rook on d6 form a battery…"
  // on two moves running). A tactic concept is keyed by type + squares.
  if (!concept?.pinMove) pushConcept();

  // Decision leverage — framed by whose move it is.
  //
  // FORWARD-LOOKING AND ALGO-GATED (David 2026-09-16: "this should also be algo
  // based. All narrations should. If the user finds the correct move more often
  // than not maybe it can stay quiet. But a more complicated position similar to
  // where the user has misstepped before would warrant the warning").
  //
  // This clause is the LIVE, pre-move half of the slow-down teaching — it fires
  // while the student is still choosing, which is the register Learn and Play
  // need (review's is retrospective and lives in `methodBeat`). It used to gate
  // on TIER ALONE, so a student who reliably handles only-move positions heard
  // it every single time. Now their own lifecycle decides: a CLOSED or FADING
  // slow-down habit means they find these, so the coach stays quiet and lets
  // them play. An OPEN one — or no record at all — still speaks, because this
  // is the shape they have misstepped in before, and because a cold student
  // must never meet a mute coach.
  //
  // 🔒 THE COUNT IS THE TRIGGER, AND THE STAKE IS COMPUTED (David 2026-09-18:
  // "maybe say how many moves keep equality? Algo that for users."). This used
  // to be two hardcoded sentences keyed on the importance TIER, and neither
  // said the two things the student actually needs: HOW MANY moves still hold,
  // and WHAT they hold. "Keeps equality" is a claim about the evaluation and it
  // is false in both directions — when they are winning the move keeps the WIN,
  // when they are lost it cannot promise a draw that is not there. Both facts
  // now come off the SAME fan the door graded severity on, so the sentence and
  // the ranking can never disagree.
  //
  // RANK still reflects how much hinges, because that is what rank is for: a
  // genuine only-move outranks a critical moment outranks a two-move fork. The
  // tier comes from the door (which sees cpLoss and threats too); the TEXT
  // comes from the count.
  const criticalStatement = criticalMomentStatement(criticalRead, plyNumber, a.criticalAnchor);
  if (studentToMove && a.slowDownOwed && criticalStatement && criticalRead) {
    ranked.push({
      namesStudentMove: NAMES_NO_MOVE, kind: 'key-moment',
      rank: importance.tier === 'only-move' ? 85 : criticalRead.count === 1 ? 65 : 60,
      text: criticalStatement,
      // The decision is now; missing it costs the gap the fan measured.
      stakes: costStakes(criticalRead.gapCp) ?? undefined,
    });
  } else if (studentToMove) {
    // Owed nothing here — their record says they handle these. Silence is the
    // computed verdict, not an absence.
  } else {
    // The opponent is on move → explain their intent, not a "slow down" to the
    // student who isn't choosing anything right now. Prefer the CONCRETE named
    // intent from the fan (guide-don't-tell: their idea, your reply withheld);
    // fall back to the generic sharpness line when there's no concrete move.
    if (opponentIntent) {
      ranked.push({
        namesStudentMove: NAMES_NO_MOVE, kind: 'opponent-intent', rank: 55, text: opponentIntentFacts(opponentIntent),
        // The idea the sentence actually names is plan[0] — couple ITS squares,
        // not every plan's, or the set stops describing the claim.
        squares: opponentIntent.plans[0]?.squares,
      });
    } else if (opponentOnlyMoveStatement(criticalRead)) {
      // The count is the one computer's, never the tier's: a tier can read
      // "only move" off a gap the fan cannot prove (a runner-up a hair under
      // the band, a bounded score).
      ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'opponent-intent', rank: 55, text: opponentOnlyMoveStatement(criticalRead) as string });
    } else if (importance.tier === 'critical') {
      ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'opponent-intent', rank: 50, text: `This is where the opponent has to find something — the position is sharp for them.` });
    }
  }
  // The campaign — the student's asset, and the opponent's (with the counter).
  if (leansOn) ranked.push({
    namesStudentMove: NAMES_NO_MOVE, kind: 'student-leans', rank: 40,
    text: `Your ${leansOn.piece} on ${leansOn.square} does its work because your ${leansOn.leansOn.piece} on ${leansOn.leansOn.square} holds it there — keep that ${leansOn.leansOn.piece} in place.`,
    squares: [leansOn.square, leansOn.leansOn.square],
  });
  if (opponentLeansOn) ranked.push({
    namesStudentMove: NAMES_NO_MOVE, kind: 'opponent-leans', rank: 45,
    text: `Their ${opponentLeansOn.piece} on ${opponentLeansOn.square} is their best piece — but it leans on the ${opponentLeansOn.leansOn.piece} on ${opponentLeansOn.leansOn.square}; take that away and it's ordinary.`,
    squares: [opponentLeansOn.square, opponentLeansOn.leansOn.square],
  });
  // The FUNDAMENTAL the student's best move serves — the teaching idea, ranked
  // just above the structural plan (it is the concrete plan for THIS move).
  // "The plan here: castle…" is the claim the positional read's "castling is
  // ready" makes — one key, so the ledger says it once.
  // Likewise "take the half-open b-file" claims that file. Computed from the
  // fundamental, never read back out of the sentence.
  // Built FROM the engine's move for the student (strategicWhyImperative on
  // bestSanHere): "The plan here: kick their knight off a5 with a pawn" is that
  // move (OS-11 g3, before 12.b4), so it says so and the door holds it.
  if (fundamentalText) ranked.push({ namesStudentMove: a.fundamentalNames, kind: 'fundamental', rank: 38, text: fundamentalText, claim: a.fundamentalClaim ?? undefined });
  // The campaign's structural plan — the textbook idea the pawn structure sets.
  if (structureText) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'structure-plan', rank: 35, text: structureText, ...(a.structureSquares?.length ? { squares: a.structureSquares } : {}), ...(a.structureClaim ? { claim: a.structureClaim } : {}) });
  // Convert-mode — decided game, one beat.
  // THE METHOD, last (David 2026-09-16: "Calling out pins and forks isn't
  // teaching. Future moves, how to think, threat identification, that is
  // teaching"). Until now the habit teaching reached post-game review ONLY; the
  // four live surfaces that share this composer taught none. Ranked lowest on
  // purpose so it CLOSES the beat — the board fact, then the idea, then the
  // routine that finds it next time. Gated on the same computed signals as the
  // retrospective register, so it is never generic advice on a quiet board.
  if (a.methodBeat) ranked.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'method', rank: 10, text: a.methodBeat, ...(a.methodProof ? { proof: a.methodProof } : {}) });

  // ONE CLAIM, ONE CLAUSE (one thread per move): two clauses that make the same
  // claim — the plan's "push your d3 pawn" and the conversion's "escort it" —
  // are one idea; the higher-ranked keeps it. Keyed on the claim the computers
  // couple at emission, never on the prose.
  const byRank = ranked.sort((a2, b2) => b2.rank - a2.rank);
  const claimed = new Set<string>();
  return byRank.filter((c) => {
    if (!c.claim) return true;
    if (claimed.has(c.claim)) return false;
    claimed.add(c.claim);
    return true;
  });
}

/**
 * PP ON THE PP — the pin concept with its principle, read from THIS board for
 * both seats (David 2026-10-05: "state it when it's relevant"). The student
 * holds the pin → the principle, the move and why it works; the opponent holds
 * it → the warning, their move and the student's way out. Null when neither
 * side can pile on and win (a pin alone is not this principle). Pieces are
 * named from their squares; the stem rotates on the board, never at random.
 */
function pinPressureConcept(fen: string, student: 'w' | 'b'): NonNullable<Parameters<typeof buildClauses>[0]['concept']> | null {
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const pick = (holder: 'w' | 'b'): PinPressure | null => findPinPressure(fen, holder)[0] ?? null;
  const name = (sq: string): string => pieceName(board.get(sq as Square)?.type ?? 'p');
  const key = stemKeyOf(fen.split(' ')[0]);
  const mine = pick(student);
  const theirs = mine ? null : pick(them);
  const pp = mine ?? theirs;
  if (!pp) return null;
  const move = pp.moves[0];
  const piece = pieceName(pp.pinnedPiece);
  const full = mine
    ? `Your ${name(pp.pinner)} on ${pp.pinner} pins their ${piece} on ${pp.pinned} to their ${name(pp.behind)} on ${pp.behind}. ${rotateStem(PIN_PRESSURE_PRINCIPLE, key)} ${move.san} adds ${move.byPawn ? 'a pawn' : 'a second attacker'} on the ${piece}, and it can't step away.`
    : (() => {
        const stem = move.byPawn ? PIN_PRESSURE_WARNING[0] : rotateStem(PIN_PRESSURE_WARNING, key);
        const way = stem === PIN_PRESSURE_WARNING[0] ? (move.byPawn ? ' Break the pin before it lands.' : ' Break the pin or add a defender before it lands.') : '';
        return `Their ${name(pp.pinner)} on ${pp.pinner} pins your ${piece} on ${pp.pinned} to your ${name(pp.behind)} on ${pp.behind}. ${stem} ${move.san} is the pile-on.${way}`;
      })();
  return {
    id: 'pin', source: 'tactic', full, short: full,
    squares: [pp.pinner, pp.pinned, pp.behind],
    boardFen: fen,
    pinMove: { fen: pp.side === board.turn() ? fen : sideToMoveFlipped(fen), san: move.san },
  };
}

/**
 * REMOVE THE GUARD, from the seat that has it (`findGuardRemovals`, both
 * ways). The student's chance is said WITHOUT the move — Learn names no move
 * unasked (2026-10-10): the target, its one guard, and the method. Their
 * chance names their move, because it is the danger, and the way out.
 */
function guardRemovalConcept(fen: string, student: 'w' | 'b'): NonNullable<Parameters<typeof buildClauses>[0]['concept']> | null {
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const pick = (holder: 'w' | 'b'): GuardRemoval | null => findGuardRemovals(fen, holder)[0] ?? null;
  const key = stemKeyOf(fen.split(' ')[0]);
  const mine = pick(student);
  const theirs = mine ? null : pick(them);
  const gr = mine ?? theirs;
  if (!gr) return null;
  const piece = pieceName(gr.targetPiece);
  const guard = pieceName(gr.guardPiece);
  const move = gr.moves[0];
  const full = mine
    ? `Their ${piece} on ${gr.target} has one guard, the ${guard} on ${gr.guard}. ${rotateStem(GUARD_REMOVAL_PRINCIPLE, key)}`
    : `Your ${piece} on ${gr.target} has one guard, the ${guard} on ${gr.guard}, and ${move.san} ${move.kind === 'chase' ? 'chases it off' : 'takes it'}. ${rotateStem(GUARD_REMOVAL_WARNING, key)}`;
  return {
    id: 'removal_of_guard', source: 'tactic', full, short: full,
    squares: [gr.target, gr.guard],
    boardFen: fen,
    ...(mine ? {} : { pinMove: { fen: gr.side === board.turn() ? fen : sideToMoveFlipped(fen), san: move.san } }),
  };
}

/** A concept that lives on a FUTURE board is said with the moves that reach
 *  it — "After cxb3+, moving your pawn on b3…" — never as a fact about the
 *  board on screen (walk 900, 27…Ba4+). When the line is ONE move of the
 *  student's own, it is their option, not something that happened: "If you
 *  play Qd2, your queen on d2…" (walk 3UqPa5eV2e0 ply 33 read "After Qd2, your
 *  queen on d2…" as if Qd2 had been played — it had not). */
export function afterLine(line: readonly string[] | undefined, boardFen: string | undefined, fenNow: string, student: 'w' | 'b', text: string): string {
  if (!line || line.length === 0 || !boardFen || samePlacementFen(boardFen, fenNow)) return text;
  const rest = continueSentence(text);
  // "If you play X, …" — the same comma-and-whole-sentence shape as "After …",
  // so it reads for every detector sentence ("If you play Nd4, moving the
  // knight on e5 would unveil…"); "Play X and moving…" did not.
  if (line.length === 1 && fenNow.split(' ')[1] === student) return `If you play ${line[0]}, ${rest}`;
  return `After ${line.join(', ')}, ${rest}`;
}

/** The same board with the other side to move (en passant cleared) — the
 *  position a THREAT is played on: what the mover had set up, as if it were
 *  their turn again. */
function sideToMoveFlipped(fen: string): string {
  const p = fen.split(' ');
  if (p.length < 4) return fen;
  p[1] = p[1] === 'w' ? 'b' : 'w';
  p[3] = '-';
  return p.join(' ');
}

function samePlacementFen(a: string, b: string): boolean {
  return a.split(' ')[0] === b.split(' ')[0];
}
