// Carlsen–Aronian, 8…g5 (White to move): the lookahead announced "you've got a
// pin coming: Nxg5, hxg5, Bxg5" one sentence after the coach said Nxg5 falls
// apart. Only lines within a pawn of the engine's best are scanned.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildTacticsLiveContext } from './liveTacticsContext';
import type { StockfishAnalysis } from '../types';

const c = new Chess();
for (const s of 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5 Bg5 h6 Bh4 Nbd7 e3 g5'.split(' ')) c.move(s);
const fen = c.fen();
const analysisWith = (nxgEval: number): StockfishAnalysis => ({
  bestMove: 'h4g3', evaluation: 20, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 0,
  topLines: [
    { rank: 1, evaluation: 20, moves: ['h4g3', 'f6e4', 'd1c2'], mate: null },
    { rank: 2, evaluation: nxgEval, moves: ['f3g5', 'h6g5', 'h4g5', 'b4c3', 'b2c3'], mate: null },
  ],
} as unknown as StockfishAnalysis);

describe('the lookahead scans only playable lines', () => {
  it('a losing Nxg5 line announces no opportunity', () => {
    const ctx = buildTacticsLiveContext(fen, analysisWith(-250), 'w', 1500);
    expect(ctx.opportunities.filter((o) => o.line?.[0] === 'Nxg5')).toEqual([]);
  });
  it('NEGATIVE CONTROL: the same line at equal eval is still scanned', () => {
    const ctx = buildTacticsLiveContext(fen, analysisWith(10), 'w', 1500);
    expect(ctx.opportunities.some((o) => o.line?.[0] === 'Nxg5')).toBe(true);
  });
});
