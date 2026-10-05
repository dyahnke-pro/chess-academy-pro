// His reasons for ruling a move out, computed (game 1, GwJ8yk2hsT8 full
// transcript, 2026-10-05): "we don't want to exchange queens because we have
// more space — the effect of a space advantage is greatly diminished if the
// queens are off the board."
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildDeliberation, deliberationFacts } from './deliberation';

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
    const d = buildDeliberation({ fenBefore: fen, analysis: analysis(-20), moverColor: 'w', opponentLastSan: 'd6' } as never);
    const alt = d?.alternatives.find((a) => a.san === 'O-O');
    expect(alt?.shortfall).toBe('trades-queens');
    expect(deliberationFacts(d as never)).toMatch(/O-O\? O-O trades the queens — with more space or an attack going, you want them on/);
  });
  it('not when the engine says the trade costs nothing (non-vacuous)', () => {
    const d = buildDeliberation({ fenBefore: fen, analysis: analysis(35), moverColor: 'w', opponentLastSan: 'd6' } as never);
    expect(d?.alternatives.find((a) => a.san === 'O-O')?.shortfall).not.toBe('trades-queens');
  });
});
