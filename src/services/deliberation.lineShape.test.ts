import { describe, it, expect } from 'vitest';
import { buildDeliberation, deliberationWeighing, NOTHING_SAID, type Deliberation } from './deliberation';

const line = (rank: number, evaluation: number, uci: string, mate: number | null = null) => ({ rank, evaluation, moves: uci.split(' '), mate });

describe('a ruled-out move\'s line is said from the reply (hard-chat audit 2026-11-08, Lichess 0Cjqs)', () => {
  // Nc3 …Rh6 Qxh6 gxh6: four moves, shortened by the shaper to its first and
  // last, then cut to "Nc3? Then two moves later, they play gxh6" — the …Rh6
  // that hits the queen was never said.
  const fen = 'r2q1k1r/1pp1b1p1/p1b1pnQ1/8/3P4/P3PN2/1P4PP/RN3RK1 w - - 1 16';
  const d = buildDeliberation({ priorMove: null,
    fenBefore: fen, moverColor: 'w', prevCapture: null,
    analysis: { topLines: [line(1, 100000, 'f3g5 c6e8 g5e6 f8g8 g6g7', 3), line(2, -420, 'b1c3 h8h6 g6h6 g7h6')] } as never,
  }) as Deliberation;
  it('every move after the candidate is said', () => {
    const w = deliberationWeighing(d, NOTHING_SAID);
    expect(w).toMatch(/Nc3\? Then they play …?Rh6, you answer Qxh6 and they play …?gxh6 — you give up a queen for a rook/);
    expect(w).not.toMatch(/moves later/);
  });
});
