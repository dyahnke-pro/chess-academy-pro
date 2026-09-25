// A conversion STEP is said once (re-walk 1380, 2026-09-25). Keyed on the text,
// "you're a rook up — trade pieces, not pawns" and "you're a piece up — trade
// pieces, not pawns" were two facts, and the same step spoke three moves
// running. The step is the idea; the edge is not.
import { describe, it, expect } from 'vitest';
import { computePositionFacts, convertKey } from './positionFacts';

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const up = (cp: number) => ({ topLines: [line(1, cp), line(2, cp - 20), line(3, cp - 40)], evaluation: cp, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 900, draw: 90, loss: 10 } });

// White castled, pieces out, a ROOK up / then a PIECE up — same step: trade pieces.
const ROOK_UP = '3q1rk1/ppp2ppp/2n1b3/8/8/2N1B3/PPPQ1PPP/R4RK1 w - - 0 20';
const PIECE_UP = '3q1rk1/ppp2ppp/2n1b3/8/8/2N1BN2/PPPQ1PPP/5RK1 w - - 0 21';

const convertOf = async (fen: string, cp: number, alreadySaid?: ReadonlySet<string>) => {
  const r = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis: up(cp), alreadySaid } as never);
  return { clause: r.clauses.find((c) => c.kind === 'convert'), remember: r.remember };
};

describe('the conversion step speaks once', () => {
  it('a rook up: the trade-pieces step speaks and is remembered by its STEP', async () => {
    const a = await convertOf(ROOK_UP, 500);
    expect(a.clause?.text).toMatch(/a rook up — trade pieces/);
    expect(a.remember).toContain(convertKey('trade-pieces'));
  });
  it('a piece up next: the same step does not speak again', async () => {
    const a = await convertOf(ROOK_UP, 500);
    const b = await convertOf(PIECE_UP, 320, new Set(a.remember));
    expect(b.clause, 'a new edge is not a new idea').toBeUndefined();
    // …and without the memory it WOULD speak (non-vacuous).
    expect((await convertOf(PIECE_UP, 320)).clause?.text).toMatch(/a piece up — trade pieces/);
  });
});
