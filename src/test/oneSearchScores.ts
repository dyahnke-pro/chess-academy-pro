// A test's verdict scenario states the move's cost and where the mover stands
// after it — the picture of ONE search (best = after + cost, played = after).
// `withOneSearch` hands that pair over as the price's `scores`, which the grade
// now requires (#2 root cause 4, 2026-10-20), so every older fixture keeps the
// scenario it was written for. A mate sentinel or no "after" carries no scores.
import type { SameSearchScores } from '../services/moveCost';

export function withOneSearch<T extends {
  cpLoss: number;
  moverEvalAfterCp?: number | null;
  moverColor?: 'white' | 'black';
  studentColor?: 'white' | 'black';
  [k: string]: unknown;
}>(a: T): T & { scores: SameSearchScores | null } {
  const after = a.moverEvalAfterCp;
  const color = a.moverColor ?? a.studentColor ?? 'white';
  const sign = color === 'white' ? 1 : -1;
  const scores = typeof after === 'number' && Math.abs(after) < 10_000
    ? { bestWhiteCp: (after + a.cpLoss) * sign, playedWhiteCp: after * sign }
    : null;
  return { ...a, scores };
}
