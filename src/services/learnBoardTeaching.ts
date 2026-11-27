// LEARN BOARD TEACHING — the board-level teaching computers, composed ONCE
// (surfaceComposition gate: the page must not import each computer directly).
//
// For the STUDENT's move: which piece took back and why (census #8), what it
// adds to the attack on their king (#2), a rule it breaks for a reason (#10),
// and a threat of theirs it rightly ignored (#7). For THEIR move: what it cost
// them (#5). Each returns the line, the squares it names and the claims it
// makes; the page queues them into the Learn door, which ranks them.
//
// Pure: the engine reads are handed in by the page.
import { habitNeedFrom } from './coachDecider';
import { weaknessSignalsNow } from './weaknessSignalLoader';
import { flipSideToMove } from './threatOut';
import { type PlayedConcept } from './playedConcept';
import { MATERIAL_VALUE } from './pieceValues';
import { lineProof, squaresProof, NO_PROOF, type FactProof } from './proof';
import { lineSeatAt } from '../utils/andList';
import { Chess, type Color, type Square } from 'chess.js';
import { hangingLine, lostLastGuard } from './hangingLine';
import { signedLegalSeeFor, takingTheAttackerAnswers } from './positionReadingService';
import { moverFault } from './accuracyService';
import { lineArrows } from './lineCalc';
/** A line as board arrows, ply by ply (one door for the page). */
export { lineArrows as lineArrowClaims };
import type { MisconceptionTagId } from '../data/misconceptionTags';
// The one fact a board-teaching computer hands on (P1-6b), made in its own
// leaf so `orderTeaching` builds it without importing this module.
import { teachingFact, type TeachingFact } from './teachingFact';
export type { TeachingFact } from './teachingFact';
import { recordLaneEvidence } from './capabilityEvidence';
import type { StudentSeat } from './recordSeat';
import { recordTermForThreat, seesPlainThreats, threatInputFor, threatVisibility, threatVoice, type RecordTerm, type ThreatPattern, type ThreatProducer, type ThreatVoice, type VisibilityTerm } from './learnRecordTerms';
import type { HeatState } from './heatMap';
import { newThreatsAtTurn, recordThreatAnswer } from './threatAnswerEvidence';
import type { StudentRecord } from './studentRecord';
export type { ThreatProducer } from './learnRecordTerms';
// The Learn page reads these through this module (one facade, not one more
// direct import per computer — surfaceComposition's ceiling).
export { mistakeTurnLine } from './mistakeTurnLine';
export { NAMES_NO_MOVE, namesMoves, namedSan, namesFromArrows, namesPlayableStudentMove, studentMovesInLine, type NamesStudentMove } from './studentMoveNaming';
import { correctionHabit, habitSaidKey } from './methodBeat';
export { habitSaidKey } from './methodBeat';
import { stepForMethodClaim, THINKING_STEPS } from './thinkingSteps';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import type { AnalysisLine } from '../types';
import { decisiveReason, reasonEarned, reasonPosed, REASON_WAIT_CEILING_MS, VERDICT_WAIT_CEILING_MS, type DecisiveReason } from './decisiveReason';
import { emitDecisiveReason } from './decisiveReasonEvents';
import type { IntentReads } from './moveIntent';
import type { LearnLane } from './learnTurnDoor';
import type { ArrowClaim } from './arrowDoor';
import { orderTeaching } from './orderTeaching';
import { readBoard, readBoardAll, readKey, learnReadKey, structureMoveRead } from './boardComputers';
import type { CoachFact } from './coachFact';
import { mastersPlanRead, planStillAhead, type MastersPlanRead } from './mastersPlanRead';
import { masterMovesCachedSync } from './masterPlayLookup';
import { prefetchOpeningStory } from './openingStory';
import { lastMoveFromSan } from './material';
import type { PieceValue } from './pieceValueRead';
import { BLUNDER_CHECK_QUESTION } from './safetyHabits';
export { BLUNDER_CHECK_QUESTION };
import { readZugzwang } from './zugzwang';
import { warmStrongChoice } from './strongChoice';
import { type CriticalFanLine } from './criticalMoment';
import { SAID_BEFORE_MOVE } from './computerRoles';
import { sayMoveNoun } from './spokenMove';
import { type PlanChoiceLine } from './planChooser';
import { planFor } from './openingIdentity';
// The Learn page reaches the opening facts through this module, never directly
// (surfaceComposition): the warm-up and the opening's length in plies.
export { warmOpeningIdentity } from './openingIdentity';

/** WARM THE OPENING'S STORY before it is read: the next two plies of master
 *  book and the plan tree from `fen`, into memory and the device cache. Learn's
 *  reads are synchronous, so a position never looked up reads as unknown. */
export function warmOpeningStory(fen: string): void {
  void prefetchOpeningStory(fen, 'coach-teach').catch(() => undefined);
}
import { ruledOutSans, extractMentionedSanSpans } from './arrowEngine';
import { gameArcs } from './lookaheadPlan';
import { isStaked, mateStakes, exchangeStakes, forkPoints, piecesOn, type FactStakes } from './factStakes';
import { writerFor, slipRegister, namesStudentMovesFor } from './writerRegister';

/** Learn's writer settings, and the asked answer's ("was that a good move?"). */
const LEARN_WRITER = writerFor('learn');
const CHAT_WRITER = writerFor('chat');

/** The board after `san` from `fen` — the board a fact about that move is
 *  computed on (`fen` itself when the move does not play). */
const boardAfterMove = (fen: string, san: string): string => boardAfterSans(fen, [san]);

export interface StudentMoveInput {
  fenBefore: string;
  /** The student's move, SAN. */
  san: string;
  /** Every SAN of the game up to AND INCLUDING the student's move. */
  history: readonly string[];
  /** Cost of the move against the engine's best, centipawns, student POV —
   *  the ONE price. Null when nobody could price it: every cost-graded hint
   *  stays quiet rather than read "unpriced" as "free". */
  cpLoss: number | null;
  /** REQUIRED: what an unpriced move is to the praise rule
   *  (`WriterSettings.unpricedCredit`: a lesson's taught line is credited). */
  unpricedCredit: UnpricedCredit;
  /** Both engine reads are centipawns (no mate on either side). */
  bothCp: boolean;
  /** The engine's best move at `fenBefore`, SAN. */
  bestSan: string | null;
  /** The engine's best line at `fenBefore` (White POV). */
  bestLine: AnalysisLine | undefined;
  /** Their answer to the student's move, SAN, when already on the board. */
  reply: string | null;
  /** REQUIRED: the engine's lines from the board AFTER the student's move
   *  (UCI, their reply first), best first — every follow-up a lane names
   *  must be a move one of them plays (pass-3: "…Be7 heads for their king —
   *  one more bishop move" with no bishop move in any line). Empty when the
   *  surface read none: then no follow-up is named. */
  linesAfter: ReadonlyArray<readonly string[]>;
  /** The engine's per-piece table (`evalBoard`) at `fenBefore` — fetched by the
   *  page only when the move completed a trade, for the good-piece /
   *  bad-piece read. Absent → the trade is judged without it. */
  evalBefore?: readonly PieceValue[];
  /** The move most players at the student's level play at `fenBefore` (the
   *  amateur cache's top move), for the autopilot guard. Absent → silent. */
  popularTopSan?: string | null;
  /** The engine's eval AFTER the student's move, centipawns, student POV; null
   *  when either read is a mate. */
  cpAfter: number | null;
  /** The engine's multi-PV lines at `fenBefore` (White POV), best first — for
   *  the stock shot that fails here (`patternFails`). Absent → that lane is
   *  silent. */
  topLines?: readonly AnalysisLine[];
  /** Say-once keys already spoken this game (the game story's sentence keys,
   *  `learnMemory.story`), so a habit asked in full once is asked again as a
   *  short callback. */
  saidClaims?: ReadonlySet<string>;
  /** REQUIRED: may this surface speak opening THEORY — the named opening this
   *  board equals (`openingEquivalence`), the book move? Review's walk, its
   *  Theory button, Learn, chat and the lessons say yes (David 2026-11-12,
   *  option B); the book's statistics are the opening story's own gate. */
  theory: boolean;
  /** REQUIRED: may the move just played be named? Review, the lessons and an
   *  asked question yes; Learn says "your move" (David 2026-11-09: "the user
   *  knows that, they see it play out"). */
  namesStudentMoves: boolean;
}

/** ONE VOCABULARY (plan "methodBeat — the live coach names the lesson STEP"):
 *  a method line ends by naming the thinking step it is, in the step's own
 *  words, so live play and the lessons teach the same habit by the same name.
 *  Keyed on the line's claim (`method:<id>` → `stepForMethodClaim`), never on
 *  its prose. Rotated on the move, never rolled. */
export function namedStep(h: TeachingFact): TeachingFact {
  const step = h.claims.map((c) => stepForMethodClaim(c)).find((x) => x !== null);
  if (!step) return h;
  const name = THINKING_STEPS[step].name;
  const tail = rotateStem([`That is the “${name}” habit.`, `That's what “${name}” is for.`], stemKeyOf(h.text));
  return { ...h, text: `${h.text.trim().replace(/[.!]?$/, '.')} ${tail}` };
}

/** A REGISTRY READ AS LEARN'S TEACHING FACT — the one fact the registry made
 *  (its words, proof, squares, claims, kind and computer), with what the page
 *  does with it beside it: the lane it rides, its event, its arrows and the
 *  held answer it records. Its id is the board-teaching id (`teachingFact`). */
function fromBoard(lane: LearnLane, f: CoachFact, ride: Parameters<typeof teachingFact>[2]): TeachingFact {
  const t = teachingFact(lane, {
    computer: f.computer, kind: f.kind, seat: f.seat, fen: f.fen, text: f.text, proof: f.proof, names: NAMES_NO_MOVE,
    squares: f.squares, claims: f.claims, ...(isStaked(f.stakes) ? { stakes: f.stakes } : {}),
    ...(f.role ? { role: f.role } : {}), ...(f.heldForm ? { heldForm: f.heldForm } : {}), ...(f.alsoText ? { alsoText: f.alsoText } : {}),
  }, ride);
  return { ...t, namesStudentMove: f.namesStudentMove };
}

/** The line a read says (`lines`), as arrows ply by ply, each on the board
 *  before it, in the colour of the side that plays it. */
function lineArrowsOf(f: CoachFact, student: 'w' | 'b', source: string): ArrowClaim[] {
  const line = f.lines?.[0];
  if (!line) return [];
  const out: ArrowClaim[] = [];
  try {
    const b = new Chess(line.fen);
    for (const s of line.sans) {
      const before = b.fen();
      const m = b.move(s.replace(/^…/, ''));
      out.push({ from: m.from, to: m.to, role: m.color === student ? 'play' : 'theirs', fen: before, source });
    }
  } catch { /* the plies replayed so far still draw */ }
  return out;
}

/** Everything the student's move teaches on the board, in no particular order —
 *  the Learn door ranks. */
/** Learn's own read of the student's move: the register's credit rule comes
 *  from the Learn writer, decided once here, never by the page. */
export function learnStudentMoveTeaching(i: Omit<StudentMoveInput, 'unpricedCredit'>): TeachingFact[] {
  return studentMoveTeaching({ ...i, unpricedCredit: LEARN_WRITER.unpricedCredit });
}

export function studentMoveTeaching(i: StudentMoveInput): TeachingFact[] {
  const out: TeachingFact[] = [];
  // Every fact here is about the student's move, computed on the board after
  // it — the board the page grades it on. REVIEW SPEAKS THIS BUNDLE'S RULES:
  // the facts it files under their own kind are the `rule`s below; the rest it
  // says through its own producers (the winning line, the pawn-ending reads,
  // the trade read, the timing facet, the plan race, the opening facets).
  // Learn's door still places each by its lane until it reads the fact's own
  // place (P1-6e), so where a rule's lane says otherwise (a habit, a trade, a
  // point) the two answers are named in the design (WO-STORY-MATRIX-01 §P1-6).
  let to = '';
  try { to = new Chess(i.fenBefore).move(i.san).to; } catch { return out; }
  // BATCH 1 — opening equivalence, order and timing (`orderTeaching`).
  // Every order lesson is graded by the move's cost: an unpriced move gets none.
  const pricedCost = i.cpLoss;
  if (pricedCost !== null) { try { out.push(...orderTeaching({ ...i, cpLoss: pricedCost })); } catch { /* a bonus, never a blocker */ } }
  // THE COST A LANE MAY NAME AS A FAULT is the graded one (clean-pass walks
  // 11–12: "Blunder check … your rook on c8" on 27.Rc8, +12 → +6.9). One
  // grader for every lane that calls the move a mistake; a move it does not
  // grade as a fault cost nothing here. The lanes that teach a CLEAN move keep
  // reading the raw cost — "clean" is a narrower question.
  const faultCp = i.cpLoss !== null && moverFault(i.cpLoss, i.cpAfter) ? i.cpLoss : 0;

  const me: 'w' | 'b' = i.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  const theirLast = i.history.length >= 2 ? i.history[i.history.length - 2] : null;
  const ply = i.history.length;
  // WHICH PIECE TAKES BACK, AND WHY — on a recapture the grader does not call
  // a fault. A faulty recapture is the one error computer's: it names the
  // better move with its reason, and a second reason here contradicted it
  // (Colle replay 2026-11-05, 20.Qxf4). The right recapture chosen answers the
  // capture-toward-centre question — held (P4 dual-use).
  const rc = readBoard('recapture', { fenBefore: i.fenBefore, san: i.san, theirLast, reply: i.reply, faultCp, namesStudentMoves: i.namesStudentMoves, costCp: i.cpLoss, unpricedCredit: i.unpricedCredit });
  if (rc) out.push(fromBoard('recapture', rc, { event: null, arrows: [], evidence: { tag: 'capture-toward-centre' as const, posedImportance: 60 } }));

  // THE LINE BEHIND A WINNING MOVE (David 2026-09-30: "teach more line
  // calculations"): the student played the engine's move and its line wins
  // material — said to where it lands, and drawn. One claim with the
  // found-move line, so a critical moment says it once.
  {
    const lineUci = i.bestLine?.moves ?? [];
    const ml = readBoard('mateLine', { fenBefore: i.fenBefore, san: i.san, bestSan: i.bestSan, lineUci, reply: i.reply });
    const w = ml ? null : readBoard('winsLine', { fenBefore: i.fenBefore, san: i.san, bestSan: i.bestSan, lineUci, reply: i.reply, prior: priorFromHistory(i.history, i.fenBefore), seconds: [i.bestLine?.earlier?.moves ?? null] });
    if (ml) out.push(fromBoard('movePoint', ml, { event: { name: 'coach_mate_line', props: { surface: 'coach-teach', quiet: learnReadKey(ml)[0] === 'quiet' } }, arrows: lineArrowsOf(ml, me, 'learn.foundMove.mate') }));
    if (w) out.push(fromBoard('movePoint', w, { event: { name: 'coach_winning_line', props: { surface: 'coach-teach' } }, arrows: lineArrowsOf(w, me, 'learn.foundMove.line') }));
  }

  // QUESTION THE KNEE-JERK (P3 method beat): the reflex recapture that cost.
  const kj = readBoard('kneeJerk', { fenBefore: i.fenBefore, san: i.san, theirLast, bestSan: i.bestSan, faultCp });
  if (kj) out.push(fromBoard('kneeJerk', kj, { event: { name: 'coach_knee_jerk_taught', props: { surface: 'coach-teach' } }, arrows: [] }));

  // A STRONG PLAYER'S CHOICE HERE — from the games DB, depersonalized, said
  // after the move (P3 "his data on the live board").
  warmStrongChoice();
  const sc = readBoard('strongChoice', { fenBefore: i.fenBefore, san: i.san, ply });
  if (sc) out.push(fromBoard('strongChoice', sc, { event: { name: 'coach_strong_choice_named', props: { surface: 'coach-teach', same: learnReadKey(sc)[0] === 'same' } }, arrows: [] }));

  // THE OPEN FILE, TAKEN (planRace file collision, live — P3): said after the
  // move, and it records: the board asked who takes the file.
  const fc = readBoard('fileClaimed', { fenBefore: i.fenBefore, san: i.san, cpLoss: i.cpLoss });
  if (fc) out.push(fromBoard('fileRace', fc, { event: { name: 'coach_file_claimed', props: { surface: 'coach-teach', contested: learnReadKey(fc)[0] === 'contested' } }, arrows: [], evidence: { tag: 'passive-rook', posedImportance: 60 } }));

  // THE SAFETY HABITS (P3 method beats) — earned only by what the board did.
  const again = i.saidClaims?.has(habitSaidKey('blunder-check')) ?? false;
  const bc = readBoard('blunderCheck', { fenBefore: i.fenBefore, san: i.san, reply: i.reply, faultCp, again, ply });
  if (bc) out.push(fromBoard('blunderCheck', bc, { event: { name: 'coach_blunder_check_taught', props: { surface: 'coach-teach' } }, arrows: [] }));
  const ap = readBoard('autopilot', { fenBefore: i.fenBefore, san: i.san, faultCp, popularTopSan: i.popularTopSan ?? null });
  if (ap) out.push(fromBoard('autopilot', ap, { event: { name: 'coach_autopilot_taught', props: { surface: 'coach-teach' } }, arrows: [] }));
  // THE PAWN ENDING (Naroditsky's endgame series): the move that takes the
  // last pieces off is counted first; and once only kings and pawns remain,
  // an outside passer is a decoy. Each once per game (claims).
  const st = readBoard('spareTempo', { fenBefore: i.fenBefore, san: i.san, bestSan: i.bestSan, cpLoss: faultCp });
  if (st) out.push(fromBoard('pawnEnding', st, { event: { name: 'coach_spare_tempo_taught', props: { surface: 'coach-teach' } }, arrows: [] }));
  const pe = readBoard('pawnEndingCounted', { fenBefore: i.fenBefore, san: i.san, reply: i.reply, faultCp, cpAfter: i.cpAfter });
  if (pe) out.push(fromBoard('pawnEnding', pe, { event: { name: 'coach_pawn_ending_trade', props: { surface: 'coach-teach', verdict: learnReadKey(pe)[0] } }, arrows: [] }));
  const decoy = readBoard('outsidePasserDecoy', { fenBefore: i.fenBefore, san: i.san });
  if (decoy) out.push(fromBoard('pawnEnding', decoy, { event: { name: 'coach_outside_passer_decoy', props: { surface: 'coach-teach' } }, arrows: [] }));
  const kp = readBoard('keepPressing', { fenBefore: i.fenBefore, san: i.san, bestSan: i.bestSan, faultCp, cpAfter: i.cpAfter });
  if (kp) out.push(fromBoard('keepPressing', kp, { event: { name: 'coach_keep_pressing_taught', props: { surface: 'coach-teach' } }, arrows: [] }));

  // WAS THE TRADE A GOOD DEAL (P3, T3 #45) — a like-for-like trade the reply
  // completed, judged by the first reason the board supports. A good trade
  // the student chose is the 'bad-trade' question answered well.
  {
    const pm = priorFromHistory(i.history, i.fenBefore);
    const tj = readBoard('tradeDeal', { fenBefore: i.fenBefore, san: i.san, reply: i.reply, faultCp, values: i.evalBefore, prior: pm ? lastMoveFromSan(pm.fenBefore, pm.san) : null, namesStudentMoves: i.namesStudentMoves, ply });
    const reason = tj ? learnReadKey(tj)[0] : '';
    if (tj) out.push(fromBoard('trade', tj, { event: { name: 'coach_trade_judged', props: { surface: 'coach-teach', reason } }, arrows: [],
      ...(reason !== 'behind' && reason !== 'gave-best' && reason !== 'bad' ? { evidence: { tag: 'bad-trade' as const, posedImportance: 60 } } : {}) }));
  }

  // THE TIMING (capability parity with review, WO-TEACH-GAPS P3): "b4 is
  // finally right — a move earlier their queen would have taken on b3". Only on
  // a sound move; the board a move earlier is replayed from the game itself.
  // QUIET MOVES ONLY (run J, 2026-09-30: "The timing of Ncxd4 matters" on a
  // recapture, "The timing of Qh2+" on a check). The lesson is a quiet move
  // played at the right moment; a capture or a check is its own reason.
  if (i.cpLoss !== null && i.cpLoss < 50 && i.history.length >= 3 && !/[x+#]/.test(i.san)) {
    const t = readBoard('timing', { fenBefore: i.fenBefore, san: i.san, history: i.history.slice(0, -1), student: me });
    // A pawn push played at the right moment answers the mistimed-break question.
    if (t) out.push(fromBoard('timing', t, { event: { name: 'coach_move_timing_named', props: { surface: 'coach-teach' } }, arrows: [],
      ...(/^[a-h]/.test(i.san) ? { evidence: { tag: 'mistimed-pawn-break' as const, posedImportance: 70 } } : {}) }));
  }

  // BRINGING PIECES TO THEIR KING — "…heads for their king — Qg3 next": the
  // next hop, as the move to play.
  const ka = readBoard('kingAttack', { fenBefore: i.fenBefore, san: i.san, reply: i.reply, cpLoss: i.cpLoss, namesStudentMoves: i.namesStudentMoves, linesAfter: i.linesAfter, unpricedCredit: i.unpricedCredit });
  if (ka) {
    const next = ka.marks?.play;
    out.push(fromBoard('kingAttack', ka, {
      event: { name: 'coach_king_attack_named', props: { surface: 'coach-teach', kind: learnReadKey(ka)[0] } },
      arrows: next ? [{ from: next.from, to: next.to, role: 'play', source: 'learn.kingAttack' }] : [],
    }));
  }

  // A RULE AND ITS EXCEPTION — only on a move the engine agrees with, so the
  // exception is proven, not excused. Its sight line is drawn only while the
  // target still stands there (the read keeps that square).
  const rx = readBoard('ruleException', { fenBefore: i.fenBefore, san: i.san, history: i.history.slice(0, -1), reply: i.reply, bothCp: i.bothCp, cpLoss: i.cpLoss });
  if (rx) {
    const [rule, hitSq] = learnReadKey(rx);
    out.push(fromBoard('ruleException', rx, {
      event: { name: 'coach_rule_exception_named', props: { surface: 'coach-teach', rule } },
      arrows: hitSq && hitSq !== '-' ? [{ from: to, to: hitSq, role: 'vision', source: 'learn.ruleException' }] : [],
    }));
  }

  // DON'T PANIC — their last move made a real threat, the engine's move
  // ignored it, and the student played exactly that move. The board before
  // their move is replayed from the game and must lead to this board.
  if (i.bothCp && i.cpLoss !== null && i.cpLoss <= 20 && i.bestSan === i.san && i.history.length >= 2) {
    const beforeTheirs = priorFromHistory(i.history, i.fenBefore)?.fenBefore ?? null;
    const fa = beforeTheirs ? readBoard('falseAlarm', { theirFenBefore: beforeTheirs, fenBefore: i.fenBefore, studentSan: i.san, bestLine: i.bestLine, reply: i.reply }) : null;
    if (fa) {
      // Their threat, red — only while it is still coming (not once played).
      const threat = fa.marks?.theirs;
      out.push(fromBoard('falseAlarm', fa, {
        event: { name: 'coach_false_alarm_named', props: { surface: 'coach-teach', kind: learnReadKey(fa)[0] } },
        arrows: threat ? [{ from: threat.from, to: threat.to, role: 'threat', source: 'learn.falseAlarm' }] : [],
        // A threat rightly ignored (the engine's move, and not worse) is the
        // opponent-threat question answered — held (P4 dual-use).
        evidence: { tag: 'missed-opponents-threat', posedImportance: 70 },
      }));
    }
  }
  // PUSH OR HOLD — what a pawn up or down is worth in THIS ending, only while
  // the engine keeps it in the band where the choice matters.
  const ph = readBoard('pushOrHold', { fenBefore: i.fenBefore, san: i.san, cpAfter: i.cpAfter });
  if (ph) {
    const [cls, side] = learnReadKey(ph);
    out.push(fromBoard('pushOrHold', ph, { event: { name: 'coach_push_or_hold_named', props: { surface: 'coach-teach', cls, side } }, arrows: [] }));
  }
  // THE STRUCTURE JUDGEMENTS (batch 6, `structureReads`): what the move did
  // to the structure, the squares and the plan. Each carries its proof; a
  // correct choice records HELD on its own tag (a miss is the live slip
  // capture's).
  if (i.cpLoss !== null) {
    for (const s of readBoardAll('structureMove', { fenBefore: i.fenBefore, san: i.san, student: me, cpLoss: i.cpLoss, bestSan: i.bestSan, bestUci: i.bestLine?.moves ?? [], reply: i.reply, namesBetterMove: false, namesStudentMoves: i.namesStudentMoves })) {
      const read = structureMoveRead(s);
      out.push(fromBoard('structureJudgement', s, { event: { name: 'coach_structure_judgement', props: { surface: 'coach-teach', act: read?.act ?? '' } }, arrows: [], ...(read?.held ? { evidence: read.held } : {}) }));
    }
  }
  return out.map(namedStep);
}

/** What THEIR move cost them, for the student to use — "…e6 opens a square your
 *  knight jumps into", "the passive …d6 blocks in the bishop". */
export function theirMoveTeaching(fenBefore: string, san: string, student: 'w' | 'b'): TeachingFact | null {
  const cost = readBoard('theirCost', { fenBefore, san, student });
  if (!cost) return null;
  const kind = readKey(cost).split(':')[0];
  // A hole your knight can use: its first hop, as the move to play.
  const arrows: ArrowClaim[] = kind === 'hole' && cost.squares.length >= 2
    ? [{ from: cost.squares[1], to: cost.squares[2] ?? cost.squares[0], role: 'play', source: 'learn.theirMoveCost' }]
    : [];
  const after = cost.fen;
  return teachingFact('theirMoveCost', {
    // The hole's first knight hop is the student's move to play (its arrow is 'play').
    computer: 'theirMoveCost', kind: 'their-cost', seat: 'opponent', fen: after, names: namesMoves(student, after, ...arrows.filter((x) => x.role === 'play').map((x) => ({ from: x.from, to: x.to }))), proof: NO_PROOF.description, text: cost.text, squares: cost.squares,
    claims: cost.claims,
    // A lasting cost (a hole, a shut bishop, castling gone) is a consequence,
    // the why of their move — never an aside (A-plan P6: held 2 of 4).
    role: 'teach',
    // The hole without the knight's first hop: a pointer at the student's next
    // decision, said by the record (`HeldForm.points`).
    ...(cost.heldForm ? { heldForm: cost.heldForm } : {}),
  }, {
    event: { name: 'coach_their_move_cost_named', props: { surface: 'coach-teach', kind } },
    arrows,
  });
}

/** DANGER LEVELS (David 2026-10-18): a move that left an attacked piece and
 *  hit a bigger one instead. `fenBefore` is the board the move was played
 *  from. Their move: why the piece was left, and the line that punishes
 *  taking it (drawn ply by ply). The student's move: the find, named. */
export function counterThreatTeaching(
  fenBefore: string,
  san: string,
  student: 'w' | 'b',
  /** REQUIRED: the engine's cost of the STUDENT's move (null when ungraded).
   *  The pattern is credited only when the move held: 14.Rd5 left a bishop and
   *  hit the queen, cost two points, and was praised as "the bigger threat
   *  comes first" (replay 2026-10-19). Ignored for their move. */
  studentMoveCostCp: number | null,
): TeachingFact | null {
  const c = readBoard('counterThreat', { fenBefore, san, student, studentMoveCostCp });
  if (!c) return null;
  return fromBoard('dangerLevels', c, {
    event: { name: 'coach_danger_levels_named', props: { surface: 'coach-teach', by: c.seat === 'student' ? 'student' : 'opponent' } },
    // The line that punishes taking the piece left, ply by ply.
    arrows: lineArrowsOf(c, student, 'learn.dangerLevels').map((a) => ({ ...a, role: 'line' as const })),
  });
}

/** THE CONCEPT A MOVE JUST PLAYED, either seat (David 2026-10-18). The line
 *  is null on a concept the student has proven (`proven`, conceptRecord); the
 *  concept itself is returned either way, so a student's own play is counted
 *  toward proving it. `define` adds the definition the first time a game meets it. */
export function playedConceptTeaching(
  fenBefore: string, san: string, student: 'w' | 'b',
  proven: ReadonlySet<string>, define: (type: string) => string,
): { hint: TeachingFact | null; concept: Pick<PlayedConcept, 'type'> | null } {
  const f = readBoard('playedConcept', { fenBefore, san, student, define });
  if (!f) return { hint: null, concept: null };
  const concept = { type: learnReadKey(f)[0] };
  if (proven.has(concept.type)) return { hint: null, concept };
  return {
    concept,
    hint: fromBoard('playedConcept', f, {
      event: { name: 'coach_played_concept_named', props: { surface: 'coach-teach', concept: concept.type, by: f.seat === 'student' ? 'student' : 'opponent' } },
      arrows: [],
    }),
  };
}

export { loadProvenConcepts, recordConceptPlayed } from './conceptRecord';

/** Tempo, counted (P2 #7): their reply is a piece's third move in the opening
 *  while the student has more pieces out. `history` ends with THEIR reply. */
export function tempoTeaching(history: readonly string[], student: 'w' | 'b'): TeachingFact | null {
  const t = readBoard('tempoCount', { history, student });
  if (!t) return null;
  return fromBoard('tempo', t, { event: { name: 'coach_tempo_counted', props: { surface: 'coach-teach', moves: Number(learnReadKey(t)[0]) } }, arrows: [] });
}

/** Stalemate watch (P2 #9): student to move at `fen`, winning, and one of
 *  their moves stalemates the opponent. */
export function stalemateTeaching(fen: string, student: 'w' | 'b'): TeachingFact | null {
  const w = readBoard('stalemateWatch', { fen, student });
  if (!w) return null;
  return fromBoard('stalemate', w, { event: { name: 'coach_stalemate_warned', props: { surface: 'coach-teach', moves: Number(learnReadKey(w)[0]) } }, arrows: [] });
}

/** Three ways to meet check (P3 method beat): the student is in check and the
 *  best answer is not the king move. Names the kinds, never the move. */
export function checkMethodTeaching(fen: string, student: 'w' | 'b', bestUci: string | null): TeachingFact | null {
  const m = readBoard('checkMethod', { fen, student, bestUci });
  if (!m) return null;
  return fromBoard('checkMethod', m, { event: { name: 'coach_check_method_taught', props: { surface: 'coach-teach', kinds: learnReadKey(m)[0] } }, arrows: [] });
}

/** The plan chooser (census #52): the engine's two best lines carry
 *  different plans for the student — level, or one clearly stronger. */
export function planChoiceTeaching(
  fen: string, lines: readonly PlanChoiceLine[], studentColor: 'white' | 'black',
  lastMove: { fenBefore: string; san: string } | null,
): TeachingFact | null {
  const pc = readBoard('planChoice', { fen, lines, student: studentColor === 'white' ? 'w' : 'b', lastMove });
  if (!pc) return null;
  return fromBoard('planArc', pc, { event: { name: 'coach_plan_choice_named', props: { surface: 'coach-teach' } }, arrows: [] });
}

/** EVERY MOVE A LINE NAMES GETS ITS ARROW (G6; the walk 2026-09-30 drew
 *  arrows on 7 of 64 plies, and on 2026-10-02 still 60 of 143 named moves —
 *  "Their Bg3 prepares h4", "Rxe1+ was the trade" and "Kd8 refutes it" all
 *  spoke with none). Each SAN the sentence names, resolved on its board:
 *   • a RUN of moves ("…Nf5+ Kg4 …Nd4 Rxb4") is a LINE, drawn ply by ply,
 *     each ply on the board before it — not just its first move;
 *   • a single move on this board (or with the other side to move) is that
 *     side's move, vouched by the engine (every sentence here is computed);
 *   • the move JUST PLAYED is already lit on the board — no second arrow;
 *   • a move only legal on the board BEFORE the last move ("Ne3 was
 *     cleaner") is the better move missed there.
 *  A move the sentence rules out is said, never arrowed. */
export function namedMoveArrows(text: string, fen: string, student: 'w' | 'b', prevFen?: string | null): ArrowClaim[] {
  const out: ArrowClaim[] = [];
  const seen = new Set<string>();
  const ruledOut = ruledOutSans(text);
  const push = (c: ArrowClaim): void => {
    const k = `${c.from}${c.to}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  const tryMove = (f: string, san: string): { from: string; to: string; color: 'w' | 'b'; after: string } | null => {
    try {
      const c = new Chess(f);
      const mv = c.move(san.replace(/^…/, ''));
      return mv ? { from: mv.from, to: mv.to, color: mv.color, after: c.fen() } : null;
    } catch { return null; }
  };
  const boardOf = (f: string): string => f.split(' ').slice(0, 2).join(' ');
  const playedHere = (san: string): boolean => {
    if (!prevFen) return false;
    const m = tryMove(prevFen, san);
    return !!m && boardOf(m.after).split(' ')[0] === boardOf(fen).split(' ')[0];
  };

  // Group the mentioned moves into runs: tokens separated only by spaces,
  // commas, ellipses or "and".
  const spans = extractMentionedSanSpans(text);
  const runs: string[][] = [];
  for (let i = 0; i < spans.length; i++) {
    const gap = i > 0 ? spans[i].text.slice(spans[i - 1].end, spans[i].index) : null;
    // "e5, and after dxe5 you win a pawn" is one line too (marks sweep
    // 2026-11-08: the known slip and its punishment drew nothing).
    if (gap !== null && /^[\s,…]*(?:and\s+(?:after\s+)?|then\s+|after\s+)?…?$/.test(gap) && runs.length > 0) runs[runs.length - 1].push(spans[i].san);
    else runs.push([spans[i].san]);
  }

  for (const run of runs) {
    const live = run.filter((s) => !ruledOut.has(s));
    if (live.length === 0) continue;
    if (run.length >= 2 && live.length === run.length) {
      // A LINE: find the board its first move is played on, then walk it.
      // The other side's board only when it can exist (a side in check cannot
      // pass — threatOut.flipSideToMove, the one null-move rule).
      const starts = [fen, flipSideToMove(fen), ...(prevFen ? [prevFen] : [])].filter((f): f is string => !!f);
      let drawn = false;
      for (const start of starts) {
        let f = start;
        const plies: ArrowClaim[] = [];
        for (const san of run) {
          const m = tryMove(f, san);
          if (!m) break;
          plies.push({ from: m.from, to: m.to, role: 'line', fen: f, source: 'learn.namedLine' });
          f = m.after;
        }
        if (plies.length >= 2) { plies.forEach(push); drawn = true; break; }
      }
      if (drawn) continue;
    }
    for (const san of live) {
      if (playedHere(san)) continue;
      let placed = false;
      for (const f of [fen, flipSideToMove(fen)].filter((x): x is string => !!x)) {
        const m = tryMove(f, san);
        if (!m) continue;
        push({ from: m.from, to: m.to, role: m.color === student ? 'play' : 'theirs', fen: f, vouchedBy: 'engine', source: 'learn.namedMove' });
        placed = true;
        break;
      }
      if (placed || !prevFen) continue;
      const m = tryMove(prevFen, san);
      // A move from the board before: the student's better move ('missed'),
      // or the other side's alternative to the move they played ("Masters
      // also play …Be4 here") — drawn in their colour, and only while its
      // piece still stands on its square (an arrow from an empty square shows
      // nothing: "…Nbd7" after the knight went to c6).
      if (!m) continue;
      let still = false;
      try { const p0 = new Chess(prevFen).get(m.from as Square); const p1 = new Chess(fen).get(m.from as Square); still = !!p0 && !!p1 && p0.type === p1.type && p0.color === p1.color; } catch { still = false; }
      if (still) push({ from: m.from, to: m.to, role: m.color === student ? 'missed' : 'theirs', fen: prevFen, vouchedBy: 'engine', source: 'learn.namedMissed' });
    }
  }
  return out;
}

/** A held row for a lane the page composes itself (moveOrder, moveIntent, a
 *  plan arriving) — the same writer, the same honesty about `prompted`. */
export function recordHeld(tag: MisconceptionTagId, posedImportance: number, ctx: { fen: string; playedSan: string; prompted: boolean; gameId: string | null; studentSeat: StudentSeat }): void {
  recordTeachingEvidence({ evidence: { tag, posedImportance } }, ctx);
}

/** Write the line's evidence row, if it carries one (P4 dual-use). The ONE
 *  impure export here: the page hands every queued hint through it so a lane
 *  that teaches also records. `prompted` = the student was told the moment
 *  before they moved (the critical-moment announcement). */
export function recordTeachingEvidence(h: Pick<TeachingFact, 'evidence'>, ctx: { fen: string; playedSan: string; prompted: boolean; gameId: string | null; studentSeat: StudentSeat }): void {
  if (!h.evidence) return;
  void recordLaneEvidence({
    lane: 'teaching', studentSeat: ctx.studentSeat, tag: h.evidence.tag, outcome: 'held', fen: ctx.fen, playedSan: ctx.playedSan,
    posedImportance: h.evidence.posedImportance, origin: 'learn', prompted: ctx.prompted,
    ...(ctx.gameId ? { sourceGameId: ctx.gameId } : {}),
  });
}

/** THE PLAN LEARN READS (2026-10-14). The live walk over the masters file
 *  when another surface already has it in memory — it reads THIS board — and
 *  otherwise the line's own plan, computed by the same `mastersPlanRead` at
 *  build time (`opening-identity.json`). Learn never loads the 37 MB file for
 *  it: that parse is the memory spike a phone kills the app for, and the plan
 *  lane was offered zero times in a Learn game while it waited on it. */
function learnPlanRead(fen: string, openingName: string | null): MastersPlanRead | null {
  return mastersPlanRead(fen, masterMovesCachedSync) ?? (openingName ? planStillAhead(planFor(openingName), fen) : null);
}

/**
 * WHAT CAN BE WON, AND WHY (Learn tape 2026-10-07: 21.Be8 and 22.Qe4 gave away
 * a bishop and a queen and the coach said nothing — the lane read only pieces
 * with NO defender). The student is to move; `square` holds a piece of theirs
 * the legal exchange wins (`findHangingBySee`). The sentence is the reason it
 * can be won, from the board:
 *   · nothing guards it;
 *   · a cheaper piece hits it — a guard does not help against that;
 *   · more pieces hit it than guard it — "hit twice, guarded once".
 * When none of those three is plainly true (an x-ray, a pinned guard), it says
 * only that the guard is not enough.
 * THE SQUARE IS WITHHELD (OS-10, David's record 2026-10-19, move 27: "Their
 * bishop on g4 has nothing defending it, so taking it costs you nothing back"
 * — the square is the capture, said before he played it). It names the opportunity and the piece, never the square or the taker in
 * words. The board marks the prize's square only (prod audit 2026-10-20: "Their
 * rook is guarded, but a cheaper piece of yours hits it" pointed at nothing) —
 * never the taker, so the move is still the student's to find. Null when the exchange does not actually win anything.
 */
export function prizeTeaching(fen: string, square: string, student: 'w' | 'b',
  /** The per-game occurrence (`nextStem(mem, 'prize')`) — REQUIRED, so the
   *  free-piece fact rotates its words instead of repeating one formula (prod
   *  Learn 2026-10-16: said three times in one game, V7). */
  stem: number,
): { text: string; squares: string[] } | null {
  const f = readBoard('prize', { fen, square, student, stem });
  return f ? { text: f.text, squares: [...f.squares] } : null;
}

/** THE OPENING SUMMARY (census #52): the opening is over — did the student get
 *  the break the opening is played for? Read against the board, never assumed:
 *  played it; still there to play (legal now); or the position moved past it. */
export function openingSummaryLine(brk: { san: string; square: string }, studentSans: readonly string[], fenNow: string): string | null {
  const bare = (x: string): string => x.replace(/[+#!?]+$/, '');
  // The break was read at an earlier position, so no board: a pawn break needs none.
  const say = sayMoveNoun(brk.san, null);
  if (studentSans.some((s) => bare(s) === bare(brk.san))) {
    return `The opening is over, and you got its break in — ${say}, the move this opening is played for.`;
  }
  let legalNow = false;
  try {
    const c = new Chess(fenNow);
    legalNow = c.moves().some((m) => bare(m) === bare(brk.san));
  } catch { legalNow = false; }
  return legalNow
    ? `The opening is over and its break, ${say}, has not come yet — it is still there to play when it is prepared.`
    : `The opening is over without its break, ${say} — the position has moved past it, so the plan now comes from the middlegame.`;
}

/** The student's own master-game break at `fen` (the one `openingPlanTeaching`
 *  names), for the opening summary later (`openingSummaryLine`). */
export function openingBreakFor(fen: string, student: 'w' | 'b', openingName: string | null): { san: string; square: string } | null {
  const read = learnPlanRead(fen, openingName);
  const mine = read ? (student === 'w' ? read.white : read.black) : null;
  return mine ? { san: mine.san, square: mine.square } : null;
}

/** THE VERDICT ON A FOUND MOVE (P2 #2): at a real decision moment on the board
 *  before the move, the student played one of the only moves that held. */
export function foundMoveTeaching(fenBefore: string, san: string, preLines: readonly CriticalFanLine[] | undefined, student: 'w' | 'b', _to: string, history: readonly string[]): TeachingFact | null {
  if (!preLines) return null;
  // The capture run before the move, from the game's own history (checked to
  // reach this board): winning the piece they gave is a find, taking back
  // their trade is not (`takesBack`).
  const prior = priorFromHistory(history, fenBefore);
  const prevCapture = prior ? captureRunOfMoves(null, history.slice(0, -1)) : null;
  const f = readBoard('foundMove', { fenBefore, san, preLines, student, prevCapture, prior });
  if (!f) return null;
  // A real decision moment (only one or two moves held) answered is calculation
  // proven — importance 90, above the green bar, because the board posed it.
  const how = learnReadKey(f)[0];
  return fromBoard('foundMove', f, { event: { name: 'coach_found_move_named', props: { surface: 'coach-teach' } }, arrows: how === 'mate' ? lineArrowsOf(f, student, 'learn.foundMove.mate') : how === 'won' ? lineArrowsOf(f, student, 'learn.foundMove.line') : [], evidence: { tag: 'calculation-depth', posedImportance: 90 } });
}

// ── PLAY ASKS THE SAME COMPUTERS (David 2026-09-30: "Play still needs access to
// these computers to answer questions on demand"). One composer for Learn's
// narration and Play's answers, so a question gets the same fact the lesson
// would have said. TEXT ONLY: answering a question never writes evidence — the
// move was already recorded when it was played.

/** The opponent's move that led to `fenBefore`, read off `history` (which
 *  ends with the student's move), or null when the history does not lead
 *  there. A winning line that opens by taking back counts from before it. */
export function priorFromHistory(history: readonly string[], fenBefore: string): { fenBefore: string; san: string } | null {
  if (history.length < 2) return null;
  const pre = replayTo(history, history.length - 2);
  if (!pre) return null;
  try {
    const c = new Chess(pre);
    if (!c.move(history[history.length - 2])) return null;
    const key = (f: string): string => positionOf(f);
    return key(c.fen()) === key(fenBefore) ? { fenBefore: pre, san: history[history.length - 2] } : null;
  } catch { return null; }
}

function replayTo(history: readonly string[], ply: number): string | null {
  try { const c = new Chess(); for (const san of history.slice(0, ply)) c.move(san); return c.fen(); } catch { return null; }
}

/** "Was that a good move?" — every board-level teaching line for the student's
 *  move at `ply` (0-based index into `history`). */
export function studentMoveAnswerLines(history: readonly string[], ply: number, cpLoss: number, bestSan: string | null): string[] {
  const fenBefore = replayTo(history, ply);
  if (!fenBefore || ply < 0 || ply >= history.length) return [];
  // The student asked ("was that a good move?"): theory may answer.
  const hints = studentMoveTeaching({
    theory: CHAT_WRITER.theory, namesStudentMoves: CHAT_WRITER.namesStudentMoves, unpricedCredit: CHAT_WRITER.unpricedCredit,
    fenBefore, san: history[ply], history: history.slice(0, ply + 1), cpLoss, bothCp: true,
    bestSan, bestLine: undefined, reply: history[ply + 1] ?? null, cpAfter: null,
    // No engine line after the move is read here: no follow-up is named.
    linesAfter: [],
  });
  const out = hints.map((h) => h.text);
  // WHAT A QUIET MOVE IS FOR — Learn's move point (Play on demand, David
  // 2026-10-02). Quiet moves only: a capture's point is the trade. The point
  // answers "what was that for" and leads; a description of the board the
  // move made (a pawn duo, a square it covers) follows it, never replaces it.
  // Quiet moves only (the read says so) — nothing material is claimed.
  const point = readBoard('quietMovePoint', { fenBefore, san: history[ply], prevCapture: captureRunOfMoves(null, history.slice(0, ply)), student: fenBefore.split(' ')[1] === 'b' ? 'b' : 'w' })?.text;
  if (point && !out.includes(point)) out.unshift(point);
  return out;
}

/** WHAT THEIR MOVE WAS FOR, when a board computer can say it: the threat of
 *  yours it stopped, or the fork trick it sidestepped. The one source for
 *  "their move has a point" — an answer that has none may call it quiet, one
 *  that has one never does (escalating walk 2026-10-17). */
export function theirMovePoint(history: readonly string[], ply: number, student: 'w' | 'b'): string | null {
  const fenBefore = replayTo(history, ply);
  if (!fenBefore || ply < 0 || ply >= history.length) return null;
  const prev = ply >= 1 ? replayTo(history, ply - 1) : null;
  const stop = prev ? readBoard('threatStopped', { studentFenBefore: prev, studentFenAfter: fenBefore, reply: history[ply], student }) : null;
  if (stop) return stop.text;
  return readBoard('trickSidestepped', { fenBefore, san: history[ply], student })?.text ?? null;
}

/** "What did their move do? Do I have to deal with it?" — what it cost them,
 *  the tempo count, and — when their move is the last on the board and the
 *  engine's best line at the current position is known — whether its threat can
 *  wait (`falseAlarm`). `ply` is the index of THEIR move. */
export function theirMoveAnswerLines(history: readonly string[], ply: number, student: 'w' | 'b', best?: AnalysisLine): string[] {
  const fenBefore = replayTo(history, ply);
  if (!fenBefore || ply < 0 || ply >= history.length) return [];
  const out: string[] = [];
  if (best && ply === history.length - 1) {
    const after = replayTo(history, ply + 1);
    const fa = after ? readBoard('falseAlarm', { theirFenBefore: fenBefore, fenBefore: after, studentSan: null, bestLine: best, reply: null }) : null;
    if (fa) out.push(fa.text);
  }
  // WHAT IT STOPPED — the threat of yours their move took away, or the fork
  // trick it sidestepped. The same static computers Learn and Review speak
  // (Play on demand, David 2026-10-02).
  const point = theirMovePoint(history, ply, student);
  if (point) out.push(point);
  const cost = theirMoveTeaching(fenBefore, history[ply], student);
  if (cost) out.push(cost.text);
  const tempo = tempoTeaching(history.slice(0, ply + 1), student);
  if (tempo) out.push(tempo.text);
  // YOUR ANSWER, when their move left you clearly better — the move and its
  // point. Asked for, so it is named (the student's own question).
  if (best && ply === history.length - 1 && best.moves[0]) {
    const studentPov = student === 'w' ? best.evaluation : -best.evaluation;
    const after = replayTo(history, ply + 1);
    if (after && studentPov >= 100) {
      try {
        const u = best.moves[0];
        const answerSan = new Chess(after).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })?.san ?? null;
        const text = readBoard('slipAnswer', { fen: after, prevCapture: captureRunOfMoves(null, history.slice(0, ply + 1)), answerSan, lineUci: best.moves, register: slipRegister(CHAT_WRITER) })?.text;
        if (text) out.push(text);
      } catch { /* the answer is a bonus */ }
    }
  }
  return out;
}

/** "What's the plan?" — the plan each side has been building so far, from the
 *  same plan-arc computer Learn speaks live and Review reads over the game
 *  (Play on demand, David 2026-10-02). The latest plan per side that EMERGED
 *  or ARRIVED; yours first. */
export function planArcAnswerLines(history: readonly string[], studentColor: 'white' | 'black'): string[] {
  const arcs = gameArcs(history, studentColor);
  const plies = [...arcs.keys()].sort((a, b) => b - a);
  const out: string[] = [];
  for (const seat of ['student', 'opponent'] as const) {
    for (const p of plies) {
      const ev = (arcs.get(p) ?? []).find((e) => e.seat === seat);
      if (ev) { out.push(ev.text); break; }
    }
  }
  return out;
}

/** "How am I doing / what should I watch?" — the warnings the board earns now:
 *  a move that would stalemate them, and the three ways to meet a check. */
export function dangerAnswerLines(fen: string, student: 'w' | 'b', bestUci: string | null): string[] {
  const out: string[] = [];
  const st = stalemateTeaching(fen, student);
  if (st) out.push(st.text);
  const cm = checkMethodTeaching(fen, student, bestUci);
  if (cm) out.push(cm.text);
  const cnt = readBoard('countWarning', { fen, student });
  if (cnt) out.push(cnt.text);
  const race = readBoard('wingsRace', { fen, student });
  if (race) out.push(race.text);
  return out;
}

/** True when a turn spoke a lane that warns BEFORE the student moves (a threat,
 *  a tactic, a stalemate, how to meet check). The page marks that board
 *  so the student's next move from it is filed as PROMPTED — told, not proven. */
export function announcesTheMove(spoke: readonly LearnLane[]): boolean {
  return spoke.some((l) => SAID_BEFORE_MOVE.has(l));
}

/** ZUGZWANG at the student's turn (tablebase, ≤7 pieces) — the fact that
 *  decides pawn endings, said once per position. Null out of range. */
export async function zugzwangTeaching(fen: string): Promise<TeachingFact | null> {
  if (fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length > 7) return null;
  // The tablebase read is fetched here (the engine reads are handed in); the
  // registry says it.
  const z = await readZugzwang(fen);
  const f = z ? readBoard('zugzwang', { fen, read: z }) : null;
  if (!f) return null;
  return fromBoard('pawnEnding', f, { event: { name: 'coach_zugzwang_named', props: { surface: 'coach-teach', mutual: learnReadKey(f)[0] === 'mutual' } }, arrows: [] });
}

/** CHART A COURSE at the student's turn (kings and pawns only): the king's
 *  target is the weak pawn, not the centre. Once per game (claim). */
export function kingCourseTeaching(fen: string, student: 'w' | 'b'): TeachingFact | null {
  const kc = readBoard('kingCourse', { fen, student });
  if (!kc) return null;
  return fromBoard('pawnEnding', kc, { event: { name: 'coach_king_course', props: { surface: 'coach-teach' } }, arrows: [] });
}

// ─── THE THREAD ACROSS MOVES + THE STUDENT'S SLIPS (David 2026-10-06) ──────
// The data lives in the game's story (`GameStory` events, P1-8c — pure memory,
// shared by Learn and Review); what counts as paying an idea off is a board
// question, so it is answered here.
import { promisesOpen, slipCount, type GamePromise, type StoryStore } from './gameStory';
import { positionOf } from '../utils/samePosition';
import { captureRunOfMoves, type PrevCaptureContext } from './captureRun';
import { NAMES_NO_MOVE, namesMoves, boardAfterSans } from './studentMoveNaming';
import type { UnpricedCredit } from './engineConstants';

export type { GamePromise } from './gameStory';

/** How long a promise stays open, in plies. Past it the moment has moved on. */
const PROMISE_PLIES = 16;

/** Note a slip at `ply` and return its this-game prefix ('' the first time). */
export function noteSlip(story: StoryStore, id: string, ply: number): string {
  story.note(ply, [{ kind: 'slip', id }]);
  const n = slipCount(story.current(), id);
  // ONE SENTENCE WITH THE DIAGNOSIS (Learn prod audit 2026-11-14: "That's the
  // second time this game." spoken on its own, its diagnosis said apart) — a
  // clause, never a sentence of its own, so nothing can separate the two.
  // ONE VOICE FOR THE REPEAT: the fundamental's own repeat stem already says
  // it ("You missed a forcing move again", `principleVoice.shortVerdict`), so
  // the count is added only where it adds something — the third slip, the
  // habit to fix (decision baseline 2026-11-14: "Second time this game: You
  // missed a forcing move again").
  return n === 3 ? 'Third time this game, and this is the habit to fix: ' : '';
}

/** The story event that remembers an idea — once per key while it is open.
 *  Null when the same idea is already waiting to be paid off. A producer whose
 *  idea is SAID rides it on its line (`StoryStore.offer`), so the game
 *  remembers the idea only when the door kept the line; one whose line is held
 *  for the move (`studentDeepFactPromise`) notes it outright. */
export function promiseEvent(story: StoryStore, p: GamePromise, ply: number): { kind: 'promise'; promise: GamePromise } | null {
  return promisesOpen(story.current(), ply, PROMISE_PLIES).some((q) => q.key === p.key) ? null : { kind: 'promise', promise: p };
}

/** Remember an idea now, once per key while it is open — for an idea whose
 *  line waits for the move (nothing is said until the student plays it). */
export function notePromise(story: StoryStore, p: GamePromise, ply: number): void {
  const e = promiseEvent(story, p, ply);
  if (e) story.note(ply, [e]);
}

/**
 * THE THREE FACTS IN LEARN (WO-THINK-01, David 2026-10-29: "We deepened the
 * depth calculator … I feel it hasn't been wired in yet"). Review and every
 * lesson said them through the one briefing (`threeFacts`); Learn's live game
 * never read them. Same computers, the Learn rules:
 *   · THEIR move: what it sets up (the deep fact, two moves on, five when the
 *     link is proven and the strike wins) — said with their move, in place of
 *     the shallow board job for that move (the same claim);
 *   · YOUR move: what their last move was aimed at and how yours answers it
 *     (the target and the binding) — your move's reason;
 *   · YOUR deep fact names your next move, so Learn holds it (no move named
 *     unasked) and says it when you play it (`studentDeepFactPromise`).
 */
export function theirDeepFactTeaching(fenBefore: string, theirSan: string, lineAfter: readonly string[] | null, student: 'w' | 'b'): TeachingFact | null {
  const f = readBoard('theirDeepFact', { fenBefore, theirSan, lineAfter, student });
  if (!f) return null;
  const follow = f.marks?.theirs;
  return fromBoard('theirIntent', f, {
    event: { name: 'coach_their_deep_fact', props: { surface: 'coach-teach', plies: Number(learnReadKey(f)[0]) } },
    arrows: follow ? [{ from: follow.from, to: follow.to, role: 'theirs', fen: boardAfterMove(fenBefore, theirSan), source: 'learn.theirDeepFact' }] : [],
  });
}

/** YOUR MOVE AGAINST THEIR LAST ONE — their target and how your move answers
 *  it ("Their b4 is aimed at your pawn on c5, so your bishop to g7 hits back on
 *  the side they're attacking"). `history` ends with the student's move; the
 *  game is replayed from the start, and a history that does not lead to
 *  `fenBefore` (a game set up from a position) says nothing. */
export function bindingTeaching(i: { fenBefore: string; san: string; history: readonly string[];
  /** REQUIRED: the student's record of seeing plain threats
   *  (`StudentRecord.plainThreats`), read by the one rule (`seesPlainThreats`). */
  plainThreats: HeatState }): TeachingFact | null {
  const f = readBoard('binding', { fenBefore: i.fenBefore, san: i.san, prior: priorFromHistory(i.history, i.fenBefore), plainSeen: seesPlainThreats(i.plainThreats), ply: i.history.length });
  if (!f) return null;
  return fromBoard('movePoint', f, { event: { name: 'coach_move_binding', props: { surface: 'coach-teach' } }, arrows: [], ownMoveReason: true });
}

/** YOUR DEEP FACT, KEPT FOR WHEN YOU PLAY IT: the move it sets up names your
 *  next move, so it is not said before you play it; when you do (within the
 *  promise's window) and the hit still stands on the board, it is said then.
 *  `lineAfterReply` is the engine's line from the board after their reply. */
export function studentDeepFactPromise(fenBefore: string, san: string, reply: string | null, lineAfterReply: readonly string[] | null): GamePromise | null {
  const f = readBoard('studentDeepFact', { fenBefore, san, reply, lineAfterReply });
  if (!f) return null;
  const [piece, square, hitSq, hitType] = learnReadKey(f);
  return { key: f.claims[0], piece, square, say: f.text, hits: { square: hitSq, type: hitType } };
}

/** The student's move pays an open promise off → its closing line, and the
 *  promise is spent: the MOVE paid it, so it is noted paid at `ply` whether or
 *  not the line is heard. A promise older than `PROMISE_PLIES` is not open.
 *  `mv` is the student's move, parsed by the caller (the story stays pure memory). */
export function payoffFor(story: StoryStore, mv: { piece: string; to: string; captured?: string; san: string; after?: string } | null, ply: number): { say: string; square: string; key: string } | null {
  if (!mv) return null;
  const castleSquare = mv.san.startsWith('O-O') ? mv.to : null;
  const hit = promisesOpen(story.current(), ply, PROMISE_PLIES).find((q) => (q.piece === mv.piece || (q.piece === 'k' && castleSquare)) && q.square === (castleSquare ?? mv.to) && (!q.takes || !!mv.captured));
  if (!hit) return null;
  story.note(ply, [{ kind: 'paid', key: hit.key }]);
  if (hit.hits && !hitStands(mv.after ?? null, hit.square, hit.hits)) return null;
  return { say: hit.say, square: hit.square, key: hit.key };
}

/** Does the piece on `from` still hit `target` on this board? No board → no. */
function hitStands(fen: string | null, from: string, target: { square: string; type: string }): boolean {
  if (!fen) return false;
  try {
    const b = new Chess(fen);
    const hitter = b.get(from as Square);
    const victim = b.get(target.square as Square);
    if (!hitter || !victim || victim.type !== target.type || victim.color === hitter.color) return false;
    return b.attackers(target.square as Square, hitter.color).includes(from as Square);
  } catch { return false; }
}

/** Was the student's coming move TOLD? The key-moment line poses the question,
 *  and every lane that names the move ("The move is X", the compare, the
 *  priority-first, the speed-run reads) speaks only where the move advice
 *  speaks — pass `false` when the move was HELD back (a deciding moment), since
 *  a held move is the student's own find. A move played after a named one is
 *  prompted, never proof the student found it alone (it must not turn the heat
 *  map green). */
export function studentMoveIsPrompted(clauseKinds: readonly string[], moveAdviceSpeaks: boolean): boolean {
  return moveAdviceSpeaks || clauseKinds.includes('key-moment');
}

/**
 * THE QUESTION THAT CATCHES THIS SLIP (David 2026-10-14: "teaching is showing
 * you how to think" — the verdict says what went wrong; this says the question
 * that finds it next time). A slip that lost a piece failed one of two steps of
 * the thinking routine (`THINKING_STEPS`), read off the board, never guessed:
 *   · the piece was ALREADY losable before the move — the danger was standing
 *     and went unanswered (`answer-danger`);
 *   · otherwise THIS move made it losable — the blunder check
 *     (`is-my-move-safe`).
 * A slip that lost nothing gets its habit too: the forcing scan when the move
 * that was there was forcing, else the candidate moves (`correctionHabit`, the
 * one reader Review's method beat shares).
 *
 * EVERY CORRECTION, THE SAME WORDS (David 2026-11-18: "the same habit phrase
 * every time"). The "once per step per game" rule this replaces is DELETED:
 * on the Learn preview it left 15 of 16 corrections without a habit. The key is
 * still the habit's claim, so one turn never says one habit twice.
 */
export function slipQuestion(
  fenBefore: string,
  playedSan: string,
  lostSquare: string | null | undefined,
  student: 'w' | 'b',
  /** The square or piece the moved piece stopped guarding, when that is why the
   *  move failed (`BackwardLook.guardLeft`). REQUIRED — `null` when it is not —
   *  so every caller answers: a guard left is caught by its own question. */
  guardLeft: string | null,
  /** The line the grade named, their reply first (`BackwardLook.punishLine`).
   *  REQUIRED — `null` when there is none — so the habit says how the piece
   *  actually fell (`slipHabit`, WO-DEPTH-01). */
  punishLine: { fen: string; uci: readonly string[] } | null,
  /** REQUIRED — the move that was there, SAN, or null when it is unknown. */
  bestSan: string | null,
  /** REQUIRED — what the move cost, centipawns. */
  cpLoss: number,
  /** REQUIRED — the grade named what the move allowed (their reply does
   *  something), not only a better move it missed (`correctionHabit`). */
  allowed: boolean,
): { text: string; key: string } | null {
  const h = correctionHabit({ bestSan, cpLossCp: cpLoss, ignoredThreat: false, allowed, slip: { fenBefore, san: playedSan, lostSquare: lostSquare ?? null, guardLeft, student, punishLine }, habitNeed: habitNeedFrom(weaknessSignalsNow() ?? []) });
  if (!h) return null;
  const key = habitSaidKey(h.habit);
  return { text: h.text, key };
}

/** The one answer-the-danger question (`safetyHabits`). */
export { answerDangerQuestion } from './safetyHabits';

const HIT_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** HOW OFTEN EACH ROTATED IDEA HAS BEEN SPOKEN THIS GAME, read off the kept
 *  claims (`idea:<key>:<n>`). The board teacher says an idea in full once and
 *  then refers to it (the DNA template) — but Learn's two readers passed it no
 *  memory, so every saying was the full form (Learn audit 2026-10-20: "trains
 *  on … — pressure you have to answer" three times in one game). Counted from
 *  what SPOKE, never from what was offered: the claims are remembered only for
 *  kept facts (`rememberKeptClaims`). */
export function spokenIdeaCounts(...said: ReadonlyArray<ReadonlySet<string>>): Map<string, number> {
  const out = new Map<string, number>();
  for (const set of said) {
    for (const c of set) {
      const m = /^idea:([a-z0-9-]+):(\d+)$/.exec(c);
      if (m) out.set(m[1], Math.max(out.get(m[1]) ?? 0, Number(m[2]) + 1));
    }
  }
  return out;
}

/** WHAT THE STUDENT'S MOVE DID, from the board teacher (the per-move reason
 *  Review already speaks) — Learn's fallback own-move reason when no sharper
 *  computer (the move's point, its intent, a found move) had one (Learn audit
 *  2026-10-15: 36 of 56 turns offered no reason for the student's move at all).
 *  Null when the board teacher has nothing true to say. */
export function boardTeacherPoint(fenBefore: string, san: string, fenNow: string, spokenIdeas: ReadonlyMap<string, number>): TeachingFact | null {
  const f = readBoard('boardTeacherOwn', { fenBefore, san, fenNow, spokenIdeas });
  if (!f) return null;
  return fromBoard('movePoint', f, { event: { name: 'coach_move_point_named', props: { surface: 'coach-teach', source: 'board-teacher' } }, arrows: [] });
}

/** THEIR MOVE'S BOARD JOB (golden speedrun 2026-10-20: from move 8 on the
 *  app stopped teaching their plan — their Nc3 guarding e4, Kh2 making room
 *  for a rook on g1, gxf3 opening the g-file at your king). The same board
 *  teacher the student's moves get, from their seat. Null when it has nothing
 *  true to say, or their piece no longer stands where it went. */
export function theirBoardPoint(fenBefore: string, san: string, fenNow: string, spokenIdeas: ReadonlyMap<string, number>): TeachingFact | null {
  const f = readBoard('boardTeacherTheirs', { fenBefore, san, fenNow, spokenIdeas });
  if (!f) return null;
  return fromBoard('theirPurpose', f, { event: { name: 'coach_their_point_named', props: { surface: 'coach-teach', source: 'board-teacher' } }, arrows: [] });
}

/** THE RECORD DECIDES HOW LOUD A THREAT IS (OS-4, David 2026-10-19: "It's
 *  narrating a one move threat to me"). The ONE decider for Learn's threat
 *  line — `seenOneMoveAttack` (quiet on a merely-answered skill, blind to
 *  long lines and pins) is gone. A threat the student would miss (red or
 *  grey on their record) speaks in full; green + simple (the piece that just
 *  moved hits a loose piece, in plain sight) is silent — no voice and no
 *  arrow, so the board asks the question unprompted (David 2026-10-20); green +
 *  hidden speaks short — `skill` names the tag that decided, so the door's
 *  fade shortens it. A check or a mate in one is never simple. */
interface ThreatVoiceDecision {
  voice: ThreatVoice;
  /** The heat tag whose record decided — the fact's `skill` for the fade. */
  skill: MisconceptionTagId;
  term: RecordTerm;
  visibility: VisibilityTerm;
  pattern: ThreatPattern;
}
export function learnThreatVoice(
  producer: ThreatProducer,
  move: { fenBefore: string; opponentSan: string },
  record: StudentRecord,
): ThreatVoiceDecision {
  const input = threatInputFor(producer, move);
  const visibility = threatVisibility(input.sighting);
  const term = recordTermForThreat(input.pattern, record, visibility.visibility);
  const { voice } = threatVoice(term.state, visibility.visibility);
  return {
    voice,
    skill: term.skill,
    term,
    visibility,
    pattern: input.pattern,
  };
}

/** THE OTHER HALF — every opponent motif standing at the student's turn is a
 *  question, and their move is the answer, recorded held or broken whether the
 *  coach said it or stayed quiet (the record is not the UI). `said` = the
 *  threat the coach spoke on this board, if any: a motif touching its squares
 *  is PROMPTED (being told proves nothing). Fire-and-forget. */
export function recordThreatAnswersAtMove(a: {
  fen: string;
  prevFen: string | null;
  playedSan: string;
  engine?: { evalBeforeCp: number | null; cpLoss: number | null };
  said: { fen: string; squares: readonly string[] } | null;
  gameId: string | null;
  /** REQUIRED — the student's seat (`recordSeat`). */
  studentSeat: StudentSeat;
}): void {
  const said = a.said && a.said.fen.split(' ').slice(0, 4).join(' ') === a.fen.split(' ').slice(0, 4).join(' ') ? new Set(a.said.squares) : new Set<string>();
  for (const t of newThreatsAtTurn(a.fen, a.prevFen)) {
    void recordThreatAnswer({
      fen: a.fen, studentSeat: a.studentSeat, playedSan: a.playedSan, pattern: t.pattern, targets: t.targets,
      prompted: t.targets.some((sq) => said.has(sq)) || said.has(t.attacker),
      origin: 'learn',
      ...(a.engine ? { engine: a.engine } : {}),
      ...(a.gameId ? { sourceGameId: a.gameId } : {}),
    });
  }
}

/** A piece of yours attacked by a CHEAPER one, said with why it matters (Learn
 *  audit 2026-10-14: "Careful — their bishop on d2 hits your queen on a5."
 *  named the attack and stopped). The attacker is worth less by construction,
 *  so a guard does not save the piece: trading it for the attacker loses.
 *  The line gives the REASON only; the outcome ("Rxd1 wins your queen for their
 *  rook") is the proof's, said once (David 2026-10-18: both said it). */
export function cheaperAttackerLine(by: string, bySq: string, piece: string, sq: string, rot: number): string {
  const attacker = HIT_NAME[by] ?? 'piece';
  const target = HIT_NAME[piece] ?? 'piece';
  // ROTATED, not repeated (David 2026-10-14: no reason formula more than twice
  // a game) — keyed on the caller's move number, never Math.random.
  const stems = [
    `Careful — their ${attacker} on ${bySq} hits your ${target} on ${sq}, and a guard does not help: the ${attacker} is worth less than your ${target}.`,
    `Careful — their ${attacker} on ${bySq} attacks your ${target} on ${sq}. Guarding it does not save it: the ${attacker} is the cheaper piece.`,
    `Their ${attacker} on ${bySq} is after your ${target} on ${sq} — a guard does not help, because the ${attacker} is the cheaper piece.`,
  ];
  return stems[((rot % stems.length) + stems.length) % stems.length];
}

/** One prevention rule for every surface — see `moveIntent.preventsNamedIdea`. */
export { preventsNamedIdea, STOPPED_THEIR_IDEA, preventStakes } from './moveIntent';

// ── THE REASON, IN LEARN (David 2026-10-17) ──────────────────────────────────
// One door for both seats: the student's move and the coach's reply each get
// the reason that accounts for their gap over the next-best, with the board
// evidence as its proof, reported to the audit in the same breath. The page
// asks once; it never composes the computer, the proof and the emission itself.

/** WHAT THE LEARN REPLY WAITS ON BEFORE IT IS PLAYED (David 2026-10-17:
 *  "Delay the computer move obviously" — the reason lands with the move, not
 *  after the student has moved again).
 *  - `warmReason`: at a real decision out of book, the reads the reason is
 *    built from (`learnReasonDue`), for at most `REASON_WAIT_CEILING_MS`.
 *  - `waitPrice`: whenever a verdict may be due — the move is out of book and
 *    either ungraded or graded a fault by the read before it — the move's
 *    price and the board between the moves, the two reads the verdict is
 *    built from. A late wave whose board the student has already left is
 *    thrown away, so without them a quick student never heard the verdict
 *    (local focus audit 2026-11-09: 7 of 11 turns dropped). A known fault (the
 *    grade said so, or the student missed a focus chance) waits up to
 *    `VERDICT_WAIT_CEILING_MS`; an ungraded move the reason's ceiling.
 *  A quiet move in book replies at once. */
export function learnReplyWait(i: {
  lines: readonly AnalysisLine[] | undefined;
  mover: 'w' | 'b';
  inBook: boolean;
  /** The move was priced before it was played (it is in the read's lines). */
  graded: boolean;
  /** The pre-move read graded it a fault. */
  gradeFault: boolean;
  /** The student missed a focus chance with it (the focus punishes it). */
  focusMiss: boolean;
}): { ceilingMs: number; warmReason: boolean; waitPrice: boolean } {
  const warmReason = learnReasonDue(i.lines, i.mover, i.inBook);
  const knownFault = i.focusMiss || (!i.inBook && i.gradeFault);
  const waitPrice = knownFault || (!i.inBook && !i.graded);
  const ceilingMs = Math.max(warmReason ? REASON_WAIT_CEILING_MS : 0, knownFault ? VERDICT_WAIT_CEILING_MS : waitPrice ? REASON_WAIT_CEILING_MS : 0);
  return { ceilingMs, warmReason, waitPrice };
}

/** Is there a reason to give for this move at all — a real decision, out of book? */
export function learnReasonDue(lines: readonly AnalysisLine[] | undefined, mover: 'w' | 'b', inBook: boolean): boolean {
  return !inBook && reasonEarned(lines, mover);
}

interface LearnReason {
  reason: DecisiveReason;
  proof: FactProof;
  /** The skill the student showed (their own move only). */
  posed: { tag: MisconceptionTagId; posedImportance: number } | null;
}

export function learnMoveReason(input: { fenBefore: string; san: string; reads: IntentReads; seat: 'student' | 'opponent'; prevCapture: PrevCaptureContext | null; asksToSee?: boolean }): LearnReason | null {
  // Learn: the student's next move is held — the prepared move is said by its piece (OS-10).
  const reason = decisiveReason({ ...input, namesStudentMoves: namesStudentMovesFor(LEARN_WRITER, input.seat === 'student') });
  if (!reason) return null;
  const posed = input.seat === 'student' ? reasonPosed(reason) : null;
  emitDecisiveReason({ surface: 'learn', kind: reason.kind, source: reason.source, about: reason.about, gapCp: reason.gapCp, stakeCp: reason.stakeCp, posedTag: posed?.tag ?? null, outcome: posed ? 'held' : 'explained' });
  const proof = (reason.line ? lineProof(reason.line, lineSeatAt(reason.line.fen, (input.fenBefore.split(' ')[1] === 'b') === (input.seat === 'student') ? 'b' : 'w')) : null) ?? squaresProof(reason.text, reason.squares) ?? NO_PROOF.description;
  return { reason, proof, posed };
}

/** THE ALTERNATIVE A REASON CALLS WORSE, AS A RED ARROW (hand walk
 *  2026-10-19 #12, 29.h4: "Anything else, like b4, gives up about half a
 *  point" drew b3–b4 green, as a move to play). From the reason's own
 *  `nextBestSan` on the board it was weighed on — never read back out of the
 *  sentence — and only when the sentence says it (its tail rides). */
export function refutedAlternativeClaims(reason: DecisiveReason, fenBefore: string): ArrowClaim[] {
  if (!reason.tail || !reason.nextBestSan) return [];
  try {
    const mv = new Chess(fenBefore).move(reason.nextBestSan);
    return mv ? [{ from: mv.from, to: mv.to, role: 'refuted', fen: fenBefore, source: 'learn.refutedAlternative' }] : [];
  } catch { return []; }
}

/** WHAT A SPOKEN TACTIC WINS — its stakes, for the turn door's ranking: a
 *  forced mate (from the `mate:N` key), else the most an exchange on the
 *  tactic's squares wins from their pieces, else a fork's second target.
 *  Undefined when the board shows no gain (the door then ranks it unstaked). */
export function tacticStakesFor(fen: string, tacticKey: string, squares: readonly string[], tacticType: string | null, foe: 'w' | 'b'): FactStakes | undefined {
  const mateN = /^mate:(\d+)$/.exec(tacticKey);
  if (mateN) return mateStakes('you', Number(mateN[1]) * 2 - 1, true);
  const exchange = exchangeStakes(fen, squares, foe);
  if (exchange) return exchange;
  if (tacticType !== 'fork') return undefined;
  const points = forkPoints(piecesOn(fen, squares));
  return points > 0 ? { points, plies: 1 } : undefined;
}

/** THE STRUCTURE, NAMED the moment it crystallises: its name, its plan and,
 *  when it came from another opening's home, where it is usually met. One
 *  composition for the Learn lane; the owner is `nextPlans.namedPawnStructure`. */
export function structureNamingLine(
  fen: string,
  student: 'w' | 'b',
  openingName: string | null,
): { text: string; claim: string } | null {
  const f = readBoard('structureNaming', { fen, student, openingName });
  return f ? { text: f.text, claim: f.claims[0] } : null;
}

// ── THREE READS LEARN USED TO COMPUTE INSIDE THE PAGE (WO-STORY-MATRIX-01
// P1-6f) — moved here unchanged, each a computer the catalog names:
// `kingPawnUnderFire`, `cheaperAttackerHit`, `gambitPoint`.

/** A pawn touching the student's king that the opponent can win outright. */
export interface KingPawnHit { pawn: Square; king: Square; attackers: number }

/** A PAWN IN FRONT OF YOUR KING IS NOT "SMALL STUFF" (fresh-game walk
 *  2026-09-27, 14.Qxh5: queen and knight both hit f7, only the king guarded
 *  it, and the coach talked about the bishop pair — …Rg7 was the only
 *  defence). The pawn exception to "pieces only": the first pawn touching the
 *  king that the opponent wins by force. */
export function kingPawnUnderFire(fen: string, student: Color): KingPawnHit | null {
  try {
    const b = new Chess(fen);
    const king = b.board().flat().find((c) => c && c.type === 'k' && c.color === student)?.square;
    if (!king) return null;
    const foe: Color = student === 'w' ? 'b' : 'w';
    for (const c of b.board().flat()) {
      if (!c || c.type !== 'p' || c.color !== student) continue;
      const near = Math.abs(c.square.charCodeAt(0) - king.charCodeAt(0)) <= 1 && Math.abs(Number(c.square[1]) - Number(king[1])) <= 1;
      if (!near) continue;
      if (signedLegalSeeFor(fen, c.square, foe) > 0) return { pawn: c.square, king, attackers: b.attackers(c.square, foe).length };
    }
  } catch { /* an unreadable board names no pawn */ }
  return null;
}

/** A piece of the student's attacked by a cheaper piece of the opponent's. */
export interface CheaperHit { sq: Square; piece: string; by: string; bySq: Square }

/** ATTACKED BY A SMALLER PIECE: the most valuable minor or major of the
 *  student's that a cheaper enemy piece attacks — unless taking the attacker
 *  loses nothing, when the answer is to take it, not to move away. Not only
 *  when it is FREE: a defended pawn traded pawn-for-pawn answers the attack
 *  just the same (hand walk 2026-09-30, Ruy 14.d4 cxd4). SIGNED: a capture
 *  that loses material is no answer (6.h3 Bxh3 gxh3, both Learn tapes of
 *  2026-10-07). */
export function cheaperAttackerHit(fen: string, student: Color): CheaperHit | null {
  try {
    const board = new Chess(fen);
    const foe: Color = student === 'w' ? 'b' : 'w';
    const value = (t: string): number => MATERIAL_VALUE[t] ?? 0;
    let hit: CheaperHit | null = null;
    for (const row of board.board()) for (const cell of row) {
      if (!cell || cell.color !== student || value(cell.type) < 3) continue;
      const low = board.attackers(cell.square, foe)
        .map((a) => ({ a, t: board.get(a)?.type ?? 'k' }))
        .filter((x) => x.t !== 'k' && value(x.t) < value(cell.type))
        .sort((x, y) => value(x.t) - value(y.t))[0];
      const answeredByCapture = !!low && takingTheAttackerAnswers(fen, low.a, student);
      if (low && !answeredByCapture && (!hit || value(cell.type) > value(hit.piece))) hit = { sq: cell.square, piece: cell.type, by: low.t, bySq: low.a };
    }
    return hit;
  } catch { return null; }
}

/** A GAMBIT THEY ACCEPTED (fresh-game walk 2026-09-27, …g5 Nxg5: the pawn
 *  went and nothing said what it bought). Their reply took the piece the
 *  student's move put down, and the piece cannot be won straight back — so it
 *  was an offer, and the teaching is what it opened: a pawn of the student's
 *  passed now (a breakthrough), or a file a rook of theirs can use, or — when
 *  nothing opened — the time the engine rates it for. Null for a trade (the
 *  move captured, or the piece is won back) or when a file opened that no rook
 *  can use. */
export function gambitPoint(p: { fenBefore: string; fenAfterMove: string; fenAfterReply: string; san: string; to: string; student: Color }): string | null {
  return readBoard('gambitPoint', p)?.text ?? null;
}

/** LEARN'S HANGING-PIECE WARNING — the one wording (`hangingLine`, shared with
 *  Review's loose facet), read with whether the reply took the piece's last
 *  guard. `still` is the second telling, after the student moved and left it. */
export function learnHangingWarning(i: { fenBefore: string; fenAfter: string; square: string; viewer: Color; still: boolean }): string | null {
  return hangingLine({ fen: i.fenAfter, squares: [i.square], viewer: i.viewer, lostGuard: lostLastGuard(i.fenBefore, i.square), still: i.still });
}
