import { describe, it, expect } from 'vitest';
import { assembleTradeAnswer, findTradeMove } from './groundedAnswer';
import { tradeAsk, isCandidateMoveQuestion } from '../coach/questionIntents';

// Evals are real Stockfish 18, depth 18, White-POV turned to the student's side.
const BERLIN = 'r1bqkb1r/ppp2ppp/2p5/4Pn2/8/5N2/PPP2PPP/RNBQ1RK1 w kq - 1 8'; // Berlin endgame, +15 / +14 after Qxd8+
const SICILIAN_1200 = 'r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13';

describe('should I trade queens — the trade lane (question walk 2026-09-27)', () => {
  it('reads the piece kind off the ask', () => {
    expect(tradeAsk('Should I trade queens?')).toBe('q');
    expect(tradeAsk('is trading queens good?')).toBe('q');
    expect(tradeAsk('Should I exchange rooks')).toBe('r');
    expect(tradeAsk('should i trade pieces')).toBe('any');
    expect(tradeAsk('Why did they trade queens?')).toBeNull();
    expect(isCandidateMoveQuestion('Should I trade queens?')).toBe(false);
  });

  it('finds the queen trade on the board and says what it costs', () => {
    const t = findTradeMove(BERLIN, 'q');
    expect(t).toEqual({ san: 'Qxd8+', kind: 'capture' });
    const f = assembleTradeAnswer({
      fen: BERLIN, piece: 'q', studentColor: 'white', trade: t,
      bestEvalCp: 15, tradeEvalCp: 14, tradeMateIn: null, bestSan: 'Qxd8+', settled: true,
    })?.facts ?? '';
    expect(f).toMatch(/^Qxd8\+ trades the queens\. It's also the engine's first choice\./);
  });

  it('a trade that costs is said as a cost against the best move', () => {
    const f = assembleTradeAnswer({
      fen: BERLIN, piece: 'q', studentColor: 'white', trade: { san: 'Qxd8+', kind: 'capture' },
      bestEvalCp: 180, tradeEvalCp: 20, tradeMateIn: null, bestSan: 'Nc3', settled: true,
    })?.facts ?? '';
    expect(f).toMatch(/costs about 1\.6 points next to Nc3 — not now/);
  });

  it('with no queen trade on the board it says so, never a best move instead', () => {
    expect(findTradeMove(SICILIAN_1200, 'q')).toBeNull();
    const f = assembleTradeAnswer({
      fen: SICILIAN_1200, piece: 'q', studentColor: 'white', trade: null,
      bestEvalCp: null, tradeEvalCp: null, tradeMateIn: null, bestSan: null, settled: null,
    })?.facts ?? '';
    expect(f).toMatch(/There's no queen trade on the board this move/);
  });

  it('the material count adds the side-ahead principle', () => {
    // White a clean rook up: trades are on the student's side.
    const f = assembleTradeAnswer({
      fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', piece: 'any', studentColor: 'white', trade: null,
      bestEvalCp: null, tradeEvalCp: null, tradeMateIn: null, bestSan: null, settled: null,
    })?.facts ?? '';
    expect(f).toMatch(/You're ahead in material, so trades are on your side/);
  });
});
