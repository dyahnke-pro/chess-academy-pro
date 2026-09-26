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
import { layerStandings } from './teachingLayers';
import { seatBare } from '../utils/seatPieces';
import { detectBluff, bluffClause, type Bluff } from './bluffDetector';
import { readConversion } from './conversionMethod';
import type { StockfishAnalysis } from '../types';
import { computeCriticality, criticalitySignalsFromAnalysis, type CriticalityRead } from './criticality';
import { Chess } from 'chess.js';
import { strategicWhyImperative, principleLine } from './moveFundamentals';
import { isBookLine } from './openingDetectionService';
import { refutedFromFan, candidatesFromAmateur, type FanLine, type RefutedAlternative } from './refutedAlternativeCore';
import { threatStoppedBy } from './opponentMovePurpose';
import { trickSidestepped } from './forkTrick';
import { phaseVerdictLine } from './reviewPositionalAssessment';
import { stemKeyOf } from '../utils/rotateStem';
import { type ImportanceVerdict, type ImportanceSignals } from './narrationImportance';
import { judgeMoment, decide, type SurfacePosture } from './coachDecider';
import { isMateEval } from './engineConstants';
import { boardStateAfter, mateInOneOnBoard, type BoardState } from './boardState';
import type { QuietFact } from './factSelector';
import { criticalityThresholds, type Severity } from './criticalityScan';
import { computeMustDefend, type MustDefend } from './threatOut';
import { computeLeansOn, type LeansOn, type EvalBoardFn } from './perturbation';
import { buildDeliberation, deliberationFacts, type Deliberation } from './deliberation';
import { detectLatentFork, latentForkClause, type LatentFork } from './latentFork';
import { detectLatentDanger, latentDangerClause, detectTradeCreatesPin, tradeDangerClause, type LatentDanger, type TradeDanger } from './latentDanger';
import { detectKingExposure, kingExposureClause, detectCentralKingDanger, centralKingDangerClause, type KingExposure, type CentralKingDanger } from './kingSafety';
import { buildOpponentIntent, opponentIntentFacts, type OpponentIntent } from './opponentIntent';
import { structurePlanFact } from './boardPlan';
import { stepPlan, EMPTY_PLAN_STATE } from './planMemory';
import { matchClauseKind, matchTacticPattern, boostFor, type WeaknessSignal } from './weaknessSignal';
import { studentMomentBoost } from './studentMomentBoost';
import { capabilitiesPosed, movePlayedCleanly } from './capabilityEvidence';
import { attributeLiveFundamental, uciToSanAt, type LiveFundamentalReads } from './liveFundamental';

/**
 * THE ENGINE READS AROUND THE STUDENT'S LAST MOVE, raw (C4). White-POV
 * centipawns and UCI lines exactly as the surface holds them; the composer
 * attributes the neglected FUNDAMENTAL from them (`attributeLiveFundamental`)
 * and hands the id to need — the same id Learn speaks, computed once.
 */
export interface LiveMoveReads extends Pick<LiveFundamentalReads, 'historySans' | 'bestPvUci' | 'playedPvUci' | 'evalBeforeWhiteCp' | 'evalAfterWhiteCp' | 'missedMate' | 'allowedMate'> {
  /** The engine's best move at `fenBefore`, UCI, or null when no read landed. */
  bestMoveUci: string | null;
}

/**
 * The move just played and the board it was played on — plus the reads. `reads`
 * is REQUIRED: `null` is the honest answer for a surface that never graded the
 * move (a phase transition, "read this position"), and a new surface must say
 * so rather than inherit a silent gap the way the live lane did until C4.
 */
/** The played move's cost, student POV: the fan's grade when the move was in
 *  it, else the SAME cost read off the two evaluations the surface already
 *  holds (best before the move, the position after it). A move outside a
 *  3-line fan is not a mistake by that fact — 11.Qe1 in the 1380 speedrun sat
 *  4th at the page's depth, cost ~20 cp, and was silenced as "ungraded" while
 *  its point (off the d-file before e5) was the lesson. Null only when neither
 *  source exists — a mate on either side is not a centipawn cost. */
export function gradedLoss(lm: Pick<LastMoveInput, 'cpLoss' | 'reads'>, studentColor: 'w' | 'b'): number | null {
  if (lm.cpLoss !== null) return lm.cpLoss;
  const before = lm.reads?.evalBeforeWhiteCp;
  const after = lm.reads?.evalAfterWhiteCp;
  if (before === undefined || after === undefined) return null;
  const sign = studentColor === 'w' ? 1 : -1;
  return Math.max(0, (before - after) * sign);
}

export interface LastMoveInput {
  fenBefore: string;
  san: string;
  cpLoss: number | null;
  /** RAW DATA: every SAN of the game up to AND INCLUDING this move, or null
   *  when the surface has no move list. REQUIRED. The composer asks the ONE
   *  book test (`isBookLine`) whether the move is theory — a book move is never
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
import { conceptForBoard } from './conceptEngine';
import { liveMethodBeat, habitIsOwed } from './methodBeat';
import { habitNeedFrom } from './coachDecider';
import { computeNeed, type StudentNeedContext } from './needScore';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { readCriticalMoment, criticalMomentStatement, type CriticalMomentRead } from './criticalMoment';
import { costStakes, exchangeStakes, forkPoints, lineTacticPoints, type FactStakes } from './factStakes';
import { nextMoveAdvice, type MoveAdviceVerdict } from './nextMoveAdvice';
import { classifyPhase } from './gamePhaseService';

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface PositionFactsInput {
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
  /** The spoken sentences that are STANDING facts — union these into the set
   *  the caller passes back as `alreadySaid` next ply, and each is said once
   *  per game instead of once per ply. A caller that ignores this keeps the old
   *  behaviour; nothing breaks, it just repeats. */
  remember: string[];
  /** The id of the opening principle that SPOKE this ply (S2), or null — the
   *  surface adds it to `taughtPrinciples` so it is never taught twice. */
  principleSpoken: string | null;
  /** Did this moment earn naming the student's next move, and why — null on
   *  the opponent's ply. Surfaces gate their own move-choice lines on it (the
   *  but-turn / hedge / compare), so there is one decision, not one per lane. */
  moveAdvice: MoveAdviceVerdict | null;
}

export type ClauseKind = 'status' | 'deliberation' | 'latent-danger' | 'latent-chance' | 'must-defend' | 'key-moment' | 'opponent-intent' | 'student-leans' | 'opponent-leans' | 'fundamental' | 'structure-plan' | 'convert' | 'concept' | 'method' | 'bluff'
  // WO-TEACH-02: the same four teaching kinds review carries as facets — one
  // name on both sides, so FACT_ROLE / FACT_LAYER / TIE_ORDER answer once.
  | 'refuted' | 'rule' | 'stopped' | 'stock';

/** STATUS bands from the student's POV (cp). The general's opening read. */
type StatusBand = 'lost' | 'worse' | 'level' | 'better' | 'winning';
const STATUS_RANK: Record<StatusBand, number> = { lost: 0, worse: 1, level: 2, better: 3, winning: 4 };
function statusBand(studentCp: number): StatusBand {
  if (studentCp >= 300) return 'winning';
  if (studentCp >= 90) return 'better';
  if (studentCp > -90) return 'level';
  if (studentCp > -300) return 'worse';
  return 'lost';
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
  /** For a `concept` clause: the concept's id (a TacticPatternType for tactic
   *  concepts) so the weakness boost can match it to the student's SPECIFIC
   *  hole through the canonical vocabulary bridge — a fork concept lands on a
   *  fork-blind student's `analysis:tactic:fork`, not on a generic bucket. */
  conceptId?: string;
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

export function planChangedText(text: string): string {
  return `The plan changes here: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

const SAY_ONCE_KINDS: ReadonlySet<ClauseKind> = new Set<ClauseKind>([
  'structure-plan', 'latent-danger', 'student-leans', 'opponent-leans',
]);

/** A move's from/to squares on the board it is played from — empty when it
 *  does not play there (never a guess). */
function moveSquares(fen: string, san: string): string[] {
  try { const m = new Chess(fen).move(san); return [m.from, m.to]; } catch { return []; }
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
  const deliberation = (!openingPhase && studentToMove)
    ? buildDeliberation({ analysis, fenBefore: fen, moverColor, opponentLastSan: input.opponentLastMove?.san ?? null })
    : null;

  // The prevention layer — a pin/skewer in waiting on the student's own king or
  // queen (the heartbreak class). Pure board geometry, no engine. Prophylactic,
  // so it's the student's concern on their move, out of the opening.
  const latentDanger = (!openingPhase && studentToMove)
    ? detectLatentDanger(fen, studentColor, { latentOnly: true })
    : null;
  // v2 — a TRADE that would CREATE a pin on your own king/queen (the more
  // actionable warning: "before you trade on X…").
  const tradeDanger = (!openingPhase && studentToMove)
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

  // §9 king-safety — a castled king with a broken shelter AND real attackers on
  // it. Both conditions, so it never fires on a harmlessly-nicked shield.
  const kingExposure = (!openingPhase && studentToMove)
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
  const opponentIntent = (!openingPhase && !studentToMove)
    ? buildOpponentIntent({ analysis, fen })
    : null;

  // STATUS band-change — the general's opening read, only when the caller tracks
  // a prior eval AND the assessment crossed a band (out of the opening, where
  // evals swing on book). The one standing fact that leads the briefing.
  const sSign = studentColor === 'w' ? 1 : -1;
  const statusText = (!openingPhase && input.prevEvalCpWhitePov != null)
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
      const attrs = attributeLiveFundamental({
        fenBefore: lm.fenBefore,
        playedSan: lm.san,
        studentColor: input.studentColor === 'w' ? 'white' : 'black',
        bestSan: uciToSanAt(lm.fenBefore, lm.reads.bestMoveUci),
        historySans: lm.reads.historySans,
        bestPvUci: lm.reads.bestPvUci,
        playedPvUci: lm.reads.playedPvUci,
        evalBeforeWhiteCp: lm.reads.evalBeforeWhiteCp,
        evalAfterWhiteCp: lm.reads.evalAfterWhiteCp,
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
  // door (`decide()`, which DOES get the boost) can only rank facts that exist.
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
  if (importance.speak && input.evalBoard && !openingPhase && importance.rank >= 45) {
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
  const planFact = (!openingPhase && importance.speak) ? structurePlanFact(fen, studentColor) : null;
  const priorPlans = [...(input.alreadySaid ?? [])]
    .map((k) => /^plan:(.+)#(\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ id: m[1], n: Number(m[2]) }))
    .sort((a, b) => b.n - a.n);
  const lastPlan = priorPlans[0] ?? null;
  // ONE identity rule for "the same plan" — `planMemory.stepPlan`, the fold
  // review's selector already runs — so the two surfaces cannot disagree.
  const planEvent = stepPlan(lastPlan ? { plan: null, id: lastPlan.id, announcedAt: null } : EMPTY_PLAN_STATE, plyNumberForPlan(fen), planFact).event;
  const planKey = planFact && (planEvent === 'announce' || planEvent === 'changed') ? `plan:${planFact.id}#${(lastPlan?.n ?? 0) + 1}` : null;
  const structureText = planFact && planEvent === 'announce' ? planFact.text
    : planFact && planEvent === 'changed' ? planChangedText(planFact.text)
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
  if (studentToMove && !openingPhase && (importance.speak || input.teachingBeat) && bestSanHere) {
    const idea = strategicWhyImperative(fen, bestSanHere, moverColor === 'w' ? 'white' : 'black');
    if (idea) fundamentalText = `The plan here: ${idea}.`;
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
  let concept: { id: string; source: string; full: string; squares: readonly string[]; boardFen?: string } | null = null;
  try {
    const lead = conceptForBoard(fen, { analysis, studentSide: studentColor === 'w' ? 'white' : 'black', rating, max: 1 })[0];
    // The board the concept is ABOUT travels with it — a concept found on the
    // board after the best move ("Rook on f5 forks king on f8") seats on THAT
    // board; seated on this one it came out half-owned (the rook not there yet).
    // A rule with no pieces named is not spoken live (16.Rxf3 "A trapped piece
    // has no safe square…" about nothing on the board).
    if (lead && lead.source !== 'positional' && !lead.bare) concept = { id: lead.id, source: lead.source, full: lead.full, squares: lead.squares, boardFen: lead.boardFen };
  } catch { concept = null; }

  // THE METHOD BEAT — the same computer the review path uses, in its live
  // register. Its signals are already on the table: the engine's move here, and
  // whether a real threat is STANDING (the must-defend probe, not the prose).
  // `studentToMove` is the mover test — you teach the habit to the player.
  // Stems rotate on the position's own halfmove count so a long game never
  // repeats one verbatim.
  let methodBeat: string | null = null;
  let methodKey: string | null = null;
  try {
    const halfmove = Number.parseInt(fen.split(' ')[5] ?? '0', 10) || 0;
    const mb = liveMethodBeat({
      bestSan: bestSanHere,
      threatStanding: mustDefend.net > 0,
      isStudentMove: studentToMove,
      realChoice: !!deliberation?.isRealChoice,
      tier: importance.tier,
    }, halfmove, input.alreadySaid);
    methodBeat = mb?.text ?? null;
    methodKey = mb?.key ?? null;
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
  const ruleHere = !refutedHere && studentToMove && lm && input.taughtPrinciples
    // GRADED clean only — an ungraded move is not a clean one. The 2026-09-24
    // Learn tape praised "O-O-O does what the opening asks" one line after
    // another lane called O-O-O a mistake: the grade had not reached here yet.
    && ((lm.historySans !== null && isBookLine(lm.historySans)) || ((gradedLoss(lm, studentColor) ?? Infinity) < 50))
    ? principleLine(lm.fenBefore, lm.san, studentSeat, input.taughtPrinciples, stemKeyOf(lm.fenBefore))
    : null;
  // S3 — the opponent's reply took the student's threat off the board.
  const stoppedReply = studentToMove && lm && input.opponentLastMove
    ? threatStoppedBy(lm.fenBefore, input.opponentLastMove.fenBefore, input.opponentLastMove.san, studentColor)
    : null;
  // The fork trick, both seats (re-walk 1380: 7.Bb3 sidestepping …Nxe4 Nxe4
  // d5 said nothing): the student's own move took theirs off the board, or
  // their reply took the student's.
  const stoppedHere: Array<{ text: string; squares: readonly string[] }> = [];
  if (stoppedReply) stoppedHere.push({ text: stoppedReply.text, squares: [stoppedReply.threat.from, stoppedReply.threat.landing] });
  if (studentToMove && lm) {
    const own = trickSidestepped(lm.fenBefore, lm.san, studentColor, 'their');
    if (own) stoppedHere.push(own);
  }
  if (studentToMove && input.opponentLastMove && !stoppedReply) {
    const theirs = trickSidestepped(input.opponentLastMove.fenBefore, input.opponentLastMove.san, opponentColor, 'your');
    if (theirs) stoppedHere.push(theirs);
  }
  // S4 — who's better, and why, at the turn of the game.
  const stockHere = input.phaseTurn && !analysis.isMate
    ? phaseVerdictLine(fen, studentColor, evalCpWhitePov * sSign, input.phaseTurn)
    : null;

  const composedAll = applyWeaknessBoost(
    buildClauses({ refuted: refutedHere && lm ? { fact: refutedHere, squares: moveSquares(lm.fenBefore, refutedHere.alt) } : null, rule: ruleHere && lm ? { text: ruleHere.text, squares: ruleHere.squares } : null, stopped: stoppedHere, stock: stockHere, fen: input.fen, slowDownOwed: habitIsOwed(habitNeedFrom(input.studentWeaknesses ?? []), 'slow-down'), criticalRead, plyNumber, importance, speaks, mustDefend, leansOn, opponentLeansOn, studentToMove, openingPhase, deliberation, latentDanger, latentFork, studentSeat, tradeDanger, opponentIntent, statusText, structureText, fundamentalText, studentEvalCp: evalCpWhitePov * sSign, kingExposure, centralKingDanger, concept, methodBeat, bluff: studentToMove && input.opponentLastMove ? detectBluff(input.opponentLastMove.fenBefore, input.opponentLastMove.san) : null, alreadySaid: input.alreadySaid }),
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
      phase: classifyPhase(fen, plyNumber),
      weaknesses: input.studentWeaknesses ?? [],
      motifHole: needFor.hole,
    })
    : null;
  const adviceDropped = moveAdvice && !moveAdvice.speak
    ? composedAll.filter((c) => c.kind !== 'deliberation')
    : composedAll;
  // ONE FACT ONCE: the verdict ("The move is Nf3 — it takes aim at the
  // center…") and the fundamental ("The plan here: take aim at the center…")
  // are the same computer on the same move. Where the verdict speaks, the plan
  // line is its echo (hand walk 2340: said back to back).
  const verdictSpeaks = !!deliberation?.bestWhy && adviceDropped.some((c) => c.kind === 'deliberation' && / The move is /.test(` ${c.text}`));
  const composed = verdictSpeaks ? adviceDropped.filter((c) => c.kind !== 'fundamental') : adviceDropped;
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
  const producedBy = studentToMove ? input.opponentLastMove : input.lastMove;
  const boardHere: BoardState = producedBy
    ? boardStateAfter(producedBy.fenBefore, producedBy.san, fen, evalCpWhitePov)
    : { inFlux: null, mateOnBoard: isMateEval(evalCpWhitePov) || mateInOneOnBoard(fen) };
  const decision = decide(
    momentSignals,
    {
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
    },
    {
      facts: composed.map((c) => c.text),
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
      alreadySaid: input.alreadySaid,
    },
    input.posture,
    // No method context: this composer already emits its own method beat in the
    // PRESENT-tense register (`liveMethodBeatFor`). Passing one here would
    // append the RETROSPECTIVE stem too — two habits, one of them a lie about a
    // move nobody has played yet.
  );
  const clauses = decision.spoken.flatMap((t) => { const c = clauseByText.get(t); return c ? [c] : []; });

  return {
    importance, criticality, mustDefend, leansOn, opponentLeansOn, deliberation, latentDanger, latentFork, tradeDanger, opponentIntent,
    clauses,
    /** Every clause the door silenced, and why — the observability trail. */
    quiet: decision.quiet,
    // What the caller should carry forward so a standing fact is said once.
    // A method habit is keyed on the HABIT (its stems rotate), once per game.
    remember: [
      ...clauses.filter((c) => SAY_ONCE_KINDS.has(c.kind)).map((c) => c.text),
      ...(methodKey && clauses.some((c) => c.kind === 'method') ? [methodKey] : []),
      ...(planKey && clauses.some((c) => c.kind === 'structure-plan') ? [planKey] : []),
      ...convertRemember(clauses, input.fen, studentSeat),
    ],
    // Only a principle the door actually SPOKE is committed as taught.
    principleSpoken: ruleHere && clauses.some((c) => c.kind === 'rule') ? ruleHere.id : null,
    moveAdvice,
  };
}

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
  return c.kind === 'concept'
    ? (c.conceptId ? matchTacticPattern(c.conceptId as TacticPatternType, signals) : null)
    : matchClauseKind(c.kind, signals);
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
  /** Does this student's own record still owe them the slow-down teaching?
   *  Computed by the caller from the weakness lifecycle (`habitNeedFrom`), not
   *  re-derived here — one door, one answer. */
  slowDownOwed: boolean;
  /** THE ONE CRITICAL-MOMENT READ (`criticalMoment`) — how many moves still
   *  hold and what they hold. Null when the fan carried nothing to count. */
  criticalRead: CriticalMomentRead | null;
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
  refuted: { fact: RefutedAlternative; squares: readonly string[] } | null;
  rule: { text: string; squares: readonly string[] } | null;
  stopped: ReadonlyArray<{ text: string; squares: readonly string[] }>;
  stock: string | null;
  leansOn: LeansOn | null;
  opponentLeansOn: LeansOn | null;
  studentToMove: boolean;
  openingPhase: boolean;
  deliberation: Deliberation | null;
  latentDanger: LatentDanger | null;
  latentFork: LatentFork | null;
  /** 🔒 The student's seat — REQUIRED by `latentForkClause`, because the same
   *  fork geometry is an opportunity from one chair and a warning from the
   *  other. Never inferred here. */
  studentSeat: 'white' | 'black';
  tradeDanger: TradeDanger | null;
  opponentIntent: OpponentIntent | null;
  statusText: string;
  structureText: string;
  fundamentalText: string;
  /** Student-POV eval (cp) at this position. Gates the prophylaxis clause. */
  studentEvalCp: number;
  kingExposure: KingExposure | null;
  centralKingDanger: CentralKingDanger | null;
  /** The lead COMPUTED CONCEPT of the position (conceptEngine, from the same
   *  analysis) — the teachable idea, joined to the briefing as a ranked fact.
   *  Null when nothing teachable / positional-only (no walk-over). */
  concept: { id: string; source: string; full: string; squares: readonly string[]; boardFen?: string } | null;
  /** The habit to run in this position, present tense. Null when none earned. */
  methodBeat: string | null;
}): ClauseItem[] {
  const { importance, speaks, criticalRead, plyNumber, mustDefend, leansOn, opponentLeansOn, studentToMove, openingPhase, deliberation, latentDanger, latentFork, studentSeat, tradeDanger, opponentIntent, statusText, structureText, fundamentalText, studentEvalCp, kingExposure, centralKingDanger, concept } = a;
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
  if (statusText) ranked.push({ kind: 'status', rank: 96, text: statusText });

  // THE WEIGHING LEADS (David 2026-08-26, the keystone) — narrate the choice, not
  // just the winner: the tempting alternatives + why each falls short, then the
  // move. Highest rank so it opens the discussion. Only fires on a genuine
  // student choice out of the opening (gated at computePositionFacts).
  if (deliberation?.isRealChoice) {
    const text = deliberationFacts(deliberation);
    // The choice is worth what the tempting alternative would cost.
    const worst = Math.max(0, ...deliberation.alternatives.map((c) => c.deltaCp));
    if (text) ranked.push({ kind: 'deliberation', rank: 95, text, stakes: costStakes(worst) ?? undefined });
  }

  // The prevention layer — a pin/skewer on your own king/queen, guide-don't-tell.
  // Prefer the actionable TRADE warning ("before you trade on X…") when present;
  // otherwise the standing-alignment warning. Only one, never both.
  if (tradeDanger) {
    ranked.push({
      kind: 'latent-danger', rank: 82, text: tradeDangerClause(tradeDanger),
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
      kind: 'latent-danger', rank: 80, text: latentDangerClause(latentDanger),
      squares: [latentDanger.enemySquare, latentDanger.frontSquare, latentDanger.backSquare],
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
  if (latentFork) {
    ranked.push({
      // 🔒 THE SEAT DECIDES THE KIND. `latentForkClause` has always rendered the
      // two seats differently; the KIND did not, and three consumers read it:
      // the `incoming` tie-break above (which says in its own comment "your own
      // assets are not" questions you must answer, and then received them),
      // `matchClauseKind` (which joined a fork the student can PLAY to a "you
      // get pinned" hole), and the importance signal. One root, one fix.
      kind: latentFork.forker === studentSeat ? 'latent-chance' : 'latent-danger',
      rank: 70, text: latentForkClause(latentFork, studentSeat),
      // The destination and both targets ARE the claim — so a tactic clause
      // about the same geometry subsumes this one rather than stacking on it.
      squares: [latentFork.square, ...latentFork.targets.map((t) => t.square)],
      // The fork wins the lesser target, `moves` moves away.
      stakes: { points: forkPoints(latentFork.targets.map((t) => t.piece)), plies: 2 * latentFork.moves },
    });
  }

  // §9 king-safety — an exposed castled king under real fire. Ranks just below
  // the pin/skewer warnings: a drafty king is a standing danger, not a routine
  // plan. Uses the 'latent-danger' kind (same prophylactic family).
  if (kingExposure) {
    ranked.push({
      kind: 'latent-danger', rank: 78, text: kingExposureClause(kingExposure),
      squares: [kingExposure.kingSquare, ...kingExposure.attackerSquares],
    });
  }

  // Incoming fire — the opponent's standing threat against the student (their
  // intent, and the student's must-defend). Board-true, named. This is the ONE
  // fact that speaks in the opening: a genuinely dropped piece is worth saying
  // even on move two.
  if (mustDefend.net >= 3 && mustDefend.pieces[0]) {
    const p = mustDefend.pieces[0];
    // PROPHYLAXIS FRAMING (§9 "ignored threat / prophylaxis"): the material fact
    // is the same standing threat, but when the student is clearly WINNING the
    // teaching shifts from "you must survive" to "don't let them punch back in"
    // — the beginner leak of pressing your own plan while up material. Board-true
    // (the threat is the null-move probe's, the advantage is the eval); only the
    // framing changes, so it never invents a threat that isn't there.
    const winning = studentToMove && studentEvalCp >= 200;
    ranked.push({
      kind: 'must-defend',
      rank: 75,
      text: winning
        ? `You're on top — don't let them punch back: they're threatening the ${PNAME[p.piece.toLowerCase()]} on ${p.square}, so shore that up before you press.`
        : `They're threatening to win the ${PNAME[p.piece.toLowerCase()]} on ${p.square} — that has to be met first.`,
      squares: [p.square],
      // The null-move probe's own net: taken on their next move.
      stakes: { points: mustDefend.net, plies: studentToMove ? 2 : 1 },
    });
  }
  // THE BLUFF (WO-LAYERS-01 step 4) — speaks in the opening too: "the knight
  // jumps to d4, a move designed to scare a beginner". Only when a real threat
  // is NOT standing (a must-defend above means something is genuinely hit).
  if (a.bluff && !(mustDefend.net >= 3)) {
    const bluff = a.bluff;
    {
      ranked.push({
        kind: 'bluff', rank: 72,
        text: `${bluffClause(bluff, openingPhase)}.`,
        squares: [bluff.square, ...bluff.targets.map((t) => t.square)],
      });
    }
  }
  // WO-TEACH-02 — the same four teaching facts review carries as `[refuted]`,
  // `[rule]`, `[stopped]` and `[stock]`, ranked where their review twins sit.
  if (a.refuted) {
    ranked.push({ kind: 'refuted', rank: 82, text: a.refuted.fact.text, stakes: costStakes(a.refuted.fact.costCp) ?? undefined, squares: [...a.refuted.squares] });
  }
  if (a.rule) ranked.push({ kind: 'rule', rank: 29, text: a.rule.text, squares: [...a.rule.squares] });
  for (const st of a.stopped) ranked.push({ kind: 'stopped', rank: 27, text: st.text, squares: [...st.squares] });
  if (a.stock) ranked.push({ kind: 'stock', rank: 35, text: a.stock });
  // §9 delayed-castling — speaks IN the opening too (the "castle now" moment),
  // ranked just under a live hanging threat. Its gate (central king + tension +
  // aligned enemy heavy) is tight enough to stay off calm development.
  if (centralKingDanger) {
    ranked.push({
      kind: 'latent-danger', rank: 74, text: centralKingDangerClause(centralKingDanger),
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
  else if (conversion) ranked.push({ kind: 'convert', rank: 36, text: conversion.text });
  else if (importance.tier === 'convert') ranked.push({ kind: 'convert', rank: 20, text: `This is technique now — convert it cleanly, no heroics.` });
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
  if (concept) {
    const rank = concept.source === 'tactic' ? 70 : 39;
    ranked.push({
      // SEATED — the detector's instance names bare pieces (hand walk
      // 2026-09-24: "Bishop on h5 pins knight on e2 against queen on d1").
      kind: 'concept', rank, text: concept.source === 'tactic' ? seatBare(concept.full, concept.boardFen ?? a.fen, studentSeat === 'white' ? 'w' : 'b') : concept.full,
      conceptId: concept.source === 'tactic' ? concept.id : undefined,
      // `ComputedConcept.squares` is the engine's own lead-the-eye set (agent
      // first, then targets) — exactly the geometry the sentence names.
      squares: concept.squares,
      // What the idea wins on its own targets (agent first, then targets).
      stakes: concept.source === 'tactic' ? (exchangeStakes(a.fen, concept.squares.slice(1)) ?? undefined) : undefined,
    });
  }

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
  const criticalStatement = criticalMomentStatement(criticalRead, plyNumber);
  if (studentToMove && a.slowDownOwed && criticalStatement && criticalRead) {
    ranked.push({
      kind: 'key-moment',
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
        kind: 'opponent-intent', rank: 55, text: opponentIntentFacts(opponentIntent, { revealReply: false }),
        // The idea the sentence actually names is plan[0] — couple ITS squares,
        // not every plan's, or the set stops describing the claim.
        squares: opponentIntent.plans[0]?.squares,
      });
    } else if (importance.tier === 'only-move') {
      ranked.push({ kind: 'opponent-intent', rank: 55, text: `The opponent is on a knife-edge here — only one move keeps them in it.` });
    } else if (importance.tier === 'critical') {
      ranked.push({ kind: 'opponent-intent', rank: 50, text: `This is where the opponent has to find something — the position is sharp for them.` });
    }
  }
  // The campaign — the student's asset, and the opponent's (with the counter).
  if (leansOn) ranked.push({
    kind: 'student-leans', rank: 40,
    text: `Your ${leansOn.piece} on ${leansOn.square} does its work because your ${leansOn.leansOn.piece} on ${leansOn.leansOn.square} holds it there — keep that ${leansOn.leansOn.piece} in place.`,
    squares: [leansOn.square, leansOn.leansOn.square],
  });
  if (opponentLeansOn) ranked.push({
    kind: 'opponent-leans', rank: 45,
    text: `Their ${opponentLeansOn.piece} on ${opponentLeansOn.square} is their best piece — but it leans on the ${opponentLeansOn.leansOn.piece} on ${opponentLeansOn.leansOn.square}; take that away and it's ordinary.`,
    squares: [opponentLeansOn.square, opponentLeansOn.leansOn.square],
  });
  // The FUNDAMENTAL the student's best move serves — the teaching idea, ranked
  // just above the structural plan (it is the concrete plan for THIS move).
  if (fundamentalText) ranked.push({ kind: 'fundamental', rank: 38, text: fundamentalText });
  // The campaign's structural plan — the textbook idea the pawn structure sets.
  if (structureText) ranked.push({ kind: 'structure-plan', rank: 35, text: structureText });
  // Convert-mode — decided game, one beat.
  // THE METHOD, last (David 2026-09-16: "Calling out pins and forks isn't
  // teaching. Future moves, how to think, threat identification, that is
  // teaching"). Until now the habit teaching reached post-game review ONLY; the
  // four live surfaces that share this composer taught none. Ranked lowest on
  // purpose so it CLOSES the beat — the board fact, then the idea, then the
  // routine that finds it next time. Gated on the same computed signals as the
  // retrospective register, so it is never generic advice on a quiet board.
  if (a.methodBeat) ranked.push({ kind: 'method', rank: 10, text: a.methodBeat });

  return ranked.sort((a2, b2) => b2.rank - a2.rank);
}
