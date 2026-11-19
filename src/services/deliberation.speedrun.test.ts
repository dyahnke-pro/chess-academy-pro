// His reasons for ruling a move out, computed (game 1, GwJ8yk2hsT8 full
// transcript, 2026-10-05): "we don't want to exchange queens because we have
// more space — the effect of a space advantage is greatly diminished if the
// queens are off the board."
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildDeliberation, deliberationFacts, NOTHING_SAID } from './deliberation';

const fenAt = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };

describe('the queen trade that throws away space', () => {
  const fen = fenAt('e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 g6 Bc4 Nb6 Bb3 d6');
  const analysis = (altEval: number) => ({
    bestMove: 'd1e2', evaluation: 40, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 0,
    topLines: [
      { rank: 1, evaluation: 40, mate: null, moves: ['d1e2', 'f8g7', 'e1g1'] },
      { rank: 2, evaluation: altEval, mate: null, moves: ['e1g1', 'd6e5', 'd4e5', 'd8d1', 'f1d1'] },
    ],
  });
  it('castling into …dxe5 and the queen trade is ruled out for its reason', () => {
    const d = buildDeliberation({ priorMove: null, fenBefore: fen, analysis: analysis(-20), moverColor: 'w', prevCapture: null } as never);
    const alt = d?.alternatives.find((a) => a.san === 'O-O');
    expect(alt?.shortfall).toBe('trades-queens');
    expect(deliberationFacts(d as never, NOTHING_SAID, true)).toMatch(/O-O\? Then they play dxe5, you answer dxe5, they play Qxd1 and you answer Rxd1 — the queens come off — with more space or an attack going, you want them on/);
  });
  it('not when the engine says the trade costs nothing (non-vacuous)', () => {
    const d = buildDeliberation({ priorMove: null, fenBefore: fen, analysis: analysis(35), moverColor: 'w', prevCapture: null } as never);
    expect(d?.alternatives.find((a) => a.san === 'O-O')?.shortfall).not.toBe('trades-queens');
  });
});

describe('no queen trade where no queens are left (Alekhine walk 2026-10-19)', () => {
  it('a queenless ending never says a move "takes the last queen off"', () => {
    const fen = '2k5/1pprb3/4p1r1/2P1N2p/3P2p1/7P/P5PK/1R2R3 w - - 0 38';
    const d = buildDeliberation({ priorMove: null, fenBefore: fen, analysis: {
      bestMove: 'e5c4', evaluation: 250, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 0,
      topLines: [
        { rank: 1, evaluation: 250, mate: null, moves: ['e5c4', 'g4h3'] },
        { rank: 2, evaluation: 120, mate: null, moves: ['h3h4', 'g6g5'] },
      ],
    }, moverColor: 'w', prevCapture: null } as never);
    expect(d?.alternatives.find((a) => a.san === 'h4')?.shortfall).not.toBe('trades-queens');
    expect(deliberationFacts(d as never, NOTHING_SAID, true)).not.toMatch(/queen/);
  });
});

// Danya narration test 2026-11-19, how to ruin your pawn structure #0: White
// has no queen, so Bxd2 after …Kf8 wins Black's queen; no queens "come off".
describe('a queen trade needs a queen on each side', () => {
  it('…Kf8 Bxd2 is not "the queens come off"', () => {
    const fen = '1r2k2r/4bpp1/p2pbN1p/1p2p3/4P1P1/P3BP2/1PPq3P/1K1R1B1R b k - 0 17';
    const d = buildDeliberation({ priorMove: null, fenBefore: fen, moverColor: 'b', prevCapture: null, analysis: {
      bestMove: 'g7f6', evaluation: -7, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 0,
      topLines: [
        { rank: 1, evaluation: -7, mate: null, moves: 'g7f6 d1d2 h6h5 g4h5 h8h5 h1g1'.split(' ') },
        { rank: 2, evaluation: -1, mate: null, moves: 'e7f6 d1d2 b8d8 h2h4 d6d5 e4d5'.split(' ') },
        { rank: 3, evaluation: 53, mate: null, moves: 'e8f8 e3d2 g7f6 f1e2 b8d8 f3f4'.split(' ') },
      ] } } as never);
    expect(d?.alternatives.find((a) => a.san === 'Kf8')?.shortfall).not.toBe('trades-queens');
  });
});

// Danya narration test 2026-11-19, the importance of solving studies #0:
// Qxb7+ Qxb7 axb7 wins a knight on the way and the line turns on …gxf1=R+.
// The queens come off, but the trade is not why it falls short.
describe('a queen trade is the reason only when the line comes out even', () => {
  const fen = '8/kn4b1/P2B4/8/1Q6/6pP/1q4pP/5BK1 w - - 0 1';
  const analysis = {
    bestMove: 'd6c5', evaluation: 272, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 0,
    topLines: [
      { rank: 1, evaluation: 272, mate: null, moves: ['d6c5', 'b7c5', 'b4c5', 'b2b6'] },
      { rank: 2, evaluation: 14, mate: null, moves: ['b4b7', 'b2b7', 'a6b7', 'g2f1r', 'g1f1', 'g3g2', 'f1g2', 'a7b7'] },
      { rank: 3, evaluation: 12, mate: null, moves: ['b4b2', 'g2f1r', 'g1f1', 'g7b2'] },
    ],
  };
  it('Qxb7+ and Qxb2 are not "the queens come off"', () => {
    const d = buildDeliberation({ priorMove: null, fenBefore: fen, analysis, moverColor: 'w', prevCapture: null } as never);
    for (const san of ['Qxb7+', 'Qxb2']) expect(d?.alternatives.find((a) => a.san === san)?.shortfall).not.toBe('trades-queens');
    expect(deliberationFacts(d as never, NOTHING_SAID, true)).not.toMatch(/queens come off/);
  });
});
