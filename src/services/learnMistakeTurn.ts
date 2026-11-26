// THE LEARN MISTAKE TURN (WO-LEARN-MISTAKES-ONLY, Phase 2 step 5).
//
// Learn speaks only after the student has played, only on a mistake by either
// side (`mistakeLesson`), and — the one exception — one line on a real
// decision the student found while that skill is red or grey. This module is
// the bridge from the page's engine reads to the lesson: the one error
// computer (`errorWhy`) reads the cause, `composeMistakeLesson` words it.
//
// Both seats go through the same door with the same reads:
//   - THEIR mistake (the coach's move) is said after the student's reply, so
//     the student's actual reply is known (`studentReplySan`) and no move the
//     student could still play is named;
//   - YOUR mistake is said with your move, after their lesson when there is
//     one (`seatLed`: yours then opens on "Your…").
// PURE: no Dexie, no engine. The page passes the reads it already has.
import { Chess } from 'chess.js';
import { errorWhy, secondReadsOf, type PriorMove } from './inaccuracyCall';
import { composeGoodDecision, composeMistakeLesson, type MistakeGameMemory, type MistakeLesson } from './mistakeLesson';
import { mateContext } from '../utils/mateContext';
import { lineProofFromUci, type Proof } from './proof';
import { lineSeatAt } from '../utils/andList';
import { BLUNDER_CP, INACCURACY_CP, MISTAKE_CP, type SpokenGradeLabel } from './engineConstants';
import type { HoldRecord } from './holdRate';

/** The slice of an engine read the turn uses. */
export interface TurnRead {
  isMate: boolean;
  mateIn: number | null;
  evaluation: number;
  topLines?: ReadonlyArray<{ evaluation: number; mate?: number | null; moves: string[]; earlier?: { moves: string[] } | null }>;
}

export interface LearnMistakeInput {
  /** Whose move: the student's own, or the opponent's. */
  seat: 'you' | 'them';
  fenBefore: string;
  playedSan: string;
  moverColor: 'white' | 'black';
  /** The read of the board the move was played from, and of the board after. */
  before: TurnRead;
  after: TurnRead;
  /** What the move cost the mover (the one price), or null when unpriced. */
  costCp: number | null;
  bestSan: string | null;
  priorMove: PriorMove;
  /** On the student's move: their reply as played, once it is on the board. */
  theirReplySan: string | null;
  /** On their move: the student's reply as played. */
  studentReplySan: string | null;
  holdOf: (tag: string) => HoldRecord | undefined;
  memory: MistakeGameMemory;
  ply: number;
  /** Their lesson leads this turn. */
  seatLed: boolean;
}

/** The grade a cost carries. */
export function gradeOfCost(costCp: number | null): SpokenGradeLabel {
  const c = costCp ?? 0;
  return c >= BLUNDER_CP ? 'blunder' : c >= MISTAKE_CP ? 'mistake' : 'inaccuracy';
}

/** THE MISTAKE TURN: errorWhy's cause, worded by the one recipe table, with
 *  the proof the line gives (marked on the board). */
export function learnMistakeTurn(i: LearnMistakeInput): MistakeLesson & { proof: Proof | null } {
  const sign = i.moverColor === 'white' ? 1 : -1;
  const bestLineUci = i.before.topLines?.[0]?.moves ?? [];
  const replyLineUci = i.after.topLines?.[0]?.moves ?? [];
  const ew = errorWhy({
    secondReads: secondReadsOf(i.before, i.after),
    costCp: i.costCp,
    fenBefore: i.fenBefore,
    playedSan: i.playedSan,
    moverColor: i.moverColor,
    bestSan: i.bestSan,
    bestLineUci,
    replyLineUci,
    replySan: i.seat === 'you' ? i.theirReplySan : null,
    ...mateContext(i.before, i.after, i.moverColor),
    quality: gradeOfCost(i.costCp),
    priorMove: i.priorMove,
    namesBetterMove: false,
  });
  const evalBeforeCp = i.before.isMate
    ? (i.before.mateIn !== null && i.before.mateIn * sign > 0 ? 100_000 : -100_000)
    : i.before.evaluation * sign;
  const out = composeMistakeLesson({
    ew, fenBefore: i.fenBefore, playedSan: i.playedSan, replyLineUci, bestSan: i.bestSan, bestLineUci,
    seat: i.seat, costCp: i.costCp, evalBeforeCp, surface: 'learn', holdOf: i.holdOf, ply: i.ply, memory: i.memory,
    theirReplySan: i.seat === 'you' ? i.theirReplySan : null,
    studentReplySan: i.seat === 'them' ? i.studentReplySan : null,
    seatLed: i.seatLed,
  });
  return { ...out, proof: out.text ? proofOf(i, ew.allowedReasonLine ?? ew.missedReasonLine ?? null) : null };
}

/** The line the lesson rests on, from the student's seat. */
function proofOf(i: LearnMistakeInput, line: { fen: string; uci: readonly string[] } | null): Proof | null {
  const mover = i.moverColor === 'white' ? 'w' : 'b';
  const student = i.seat === 'you' ? mover : (mover === 'w' ? 'b' : 'w');
  const l = line ?? (() => {
    const reply = i.after.topLines?.[0]?.moves ?? [];
    try { const c = new Chess(i.fenBefore); return c.move(i.playedSan) && reply.length ? { fen: c.fen(), uci: reply } : null; } catch { return null; }
  })();
  return l ? lineProofFromUci(l.fen, l.uci, lineSeatAt(l.fen, student)) : null;
}

/** Is a cost a fault (an inaccuracy or worse)? */
export function isFault(costCp: number | null): boolean {
  return costCp !== null && costCp >= INACCURACY_CP;
}

/** THE GOOD DECISION: a sound move of the student's at a real decision, while
 *  the skill is red or grey. Never while the focus owns the move. */
export function learnGoodDecision(i: {
  fenBefore: string; playedSan: string; before: TurnRead; holdOf: (tag: string) => HoldRecord | undefined;
  memory: MistakeGameMemory; ply: number; priorMove: PriorMove; seatLed: boolean; focusOwnsMove: boolean;
}): ReturnType<typeof composeGoodDecision> {
  if (i.focusOwnsMove) return null;
  const lines = (i.before.topLines ?? []).map((l) => ({ evaluation: l.evaluation, mate: l.mate ?? null, moves: l.moves }));
  if (lines.length < 2) return null;
  return composeGoodDecision({ fenBefore: i.fenBefore, playedSan: i.playedSan, lines, holdOf: i.holdOf, ply: i.ply, memory: i.memory, priorMove: i.priorMove, seatLed: i.seatLed });
}
