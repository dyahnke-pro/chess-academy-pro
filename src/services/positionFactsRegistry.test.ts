// ONE COACH (2026-10-15): the board computers Learn reads in its own lanes
// reach chat's board answers and the tapped read through the live composer —
// and never twice on Learn, which reads them itself.
import { describe, it, expect } from 'vitest';
import { computePositionFacts } from './positionFacts';

const line = (rank: number, evaluation: number, moves: string[] = []): { rank: number; evaluation: number; moves: string[]; mate: null } => ({ rank, evaluation, moves, mate: null });
const GRAB = 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17';
const read = (boardComputers: 'composer' | 'surface') => computePositionFacts({
  boardComputers, posture: 'walk', fen: GRAB, moverColor: 'w', studentColor: 'w',
  analysis: { topLines: [line(1, 0, ['c1e3']), line(2, -10)], evaluation: 0, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 300, draw: 400, loss: 300 } },
} as never);

describe('the live composer reads the board computers', () => {
  it('chat and the tapped read hear the queen-grab trap', async () => {
    const r = await read('composer');
    expect(r.clauses.some((c) => c.claim?.startsWith('grab:'))).toBe(true);
  }, 30_000);
  it('Learn reads it in its own lane, so the composer stays out', async () => {
    const r = await read('surface');
    expect(r.clauses.some((c) => c.claim?.startsWith('grab:'))).toBe(false);
  }, 30_000);
});
