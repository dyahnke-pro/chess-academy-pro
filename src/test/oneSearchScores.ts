// A test's verdict scenario states the move's cost and where the mover stands
// after it — the picture of ONE search (best = after + cost, played = after).
// `withOneSearch` hands that pair over as the price's `scores`, which the grade
// now requires (#2 root cause 4, 2026-10-20), so every older fixture keeps the
// scenario it was written for. A mate sentinel or no "after" carries no scores.
import type { MovePrice, SameSearchScores } from '../services/moveCost';
import { NO_SECOND_READ, type SecondReads } from '../services/inaccuracyCall';

export function withOneSearch<T extends {
  cpLoss: number;
  moverEvalAfterCp?: number | null;
  moverColor?: 'white' | 'black';
  studentColor?: 'white' | 'black';
  [k: string]: unknown;
}>(a: T): T & { scores: SameSearchScores | null; secondReads: SecondReads } {
  const after = a.moverEvalAfterCp;
  const color = a.moverColor ?? a.studentColor ?? 'white';
  const sign = color === 'white' ? 1 : -1;
  const scores = typeof after === 'number' && Math.abs(after) < 10_000
    ? { bestWhiteCp: (after + a.cpLoss) * sign, playedWhiteCp: after * sign }
    : null;
  // One read of each board, unless the test gives its own second reads.
  const second = (a as { secondReads?: SecondReads }).secondReads ?? NO_SECOND_READ;
  return { ...a, scores, secondReads: second };
}

/** A live-fundamental fixture's scenario — a stated cost and/or the read
 *  before and the read after (White POV) — as the ONE price the computer now
 *  requires (#2 root cause 4). The legacy fields are stripped, so a fixture
 *  cannot carry a second cost beside the price. */
export function withPrice<T extends {
  costCp?: number | null;
  evalBeforeWhiteCp?: number;
  evalAfterWhiteCp?: number;
  studentColor: 'white' | 'black';
}>(a: T): Omit<T, 'costCp' | 'evalBeforeWhiteCp' | 'evalAfterWhiteCp'> & { price: MovePrice | null } {
  const { costCp, evalBeforeWhiteCp: before, evalAfterWhiteCp: after, ...rest } = a;
  const sign = a.studentColor === 'white' ? 1 : -1;
  const real = (cp: number | undefined): cp is number => typeof cp === 'number' && Math.abs(cp) < 10_000;
  let price: MovePrice | null = null;
  if (typeof costCp === 'number') {
    const best = real(before) ? before : real(after) ? after + costCp * sign : null;
    price = { costCp, scores: best !== null ? { bestWhiteCp: best, playedWhiteCp: best - costCp * sign } : null, settled: true };
  } else if (real(before) && real(after)) {
    const cost = Math.max(0, (before - after) * sign);
    price = { costCp: cost, scores: { bestWhiteCp: before, playedWhiteCp: after }, settled: true };
  }
  return { ...rest, price };
}

/** A fixture written as the old scenario (a cost and/or two reads) before
 *  `withPrice` turns it into the one price. */
export type WithLegacyCost<T> = Omit<T, 'price'> & { costCp?: number | null; evalBeforeWhiteCp?: number; evalAfterWhiteCp?: number };
