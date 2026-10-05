import { describe, it, expect } from 'vitest';
import { computePositionFacts } from './positionFacts';

// THE SPEED-RUN DEPTH THROUGH THE ONE DOOR (David 2026-10-05: "Should be from
// one place"). Game 2, before 20.Bb4+ — the skewer line comes out of
// positionFacts as a `line` clause carrying its own line (arrowed by the
// voice package), and only where the move may be named.
const FEN = '5rr1/ppb1k3/2p4p/4p1p1/3p2b1/1N1P4/PPPB1PPP/R3R1K1 w - - 0 20';
const analysis = {
  bestMove: 'd2b4', evaluation: 250, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 0,
  topLines: [
    { rank: 1, evaluation: 250, mate: null, moves: ['d2b4', 'e7d7', 'b4f8', 'g8f8'] },
    { rank: 2, evaluation: 120, mate: null, moves: ['b3d4', 'e5d4'] },
  ],
};
const history = 'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O Bc5 d3 Qh4 Nd2 c6 Bc4 d6 Nf3 Qh5 Ng5 Ke7 Bxf7 Qxd1 Rxd1 h6 Bxg8 Rxg8 Nf3 Bg4 Re1 g5 Nd2 Raf8 Nb3 Bb6 Bd2 Bc7 e5 dxe5'.split(' ');
const run = (namesBestMove: boolean) => computePositionFacts({ posture: 'walk', fen: FEN, moverColor: 'w', studentColor: 'w', analysis, history, namesBestMove } as never);

describe('depth facts come out of the door', () => {
  it('a surface that names the move gets the line, with the line attached for arrows', async () => {
    const r = await run(true);
    const line = r.clauses.find((c) => c.kind === 'line');
    expect(line?.text).toMatch(/bishop to b4, check/i);
    expect(line?.lines?.[0]?.sans[0]).toBe('Bb4+');
  });
});
