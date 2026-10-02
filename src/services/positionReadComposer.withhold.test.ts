import { describe, it, expect } from 'vitest';
import { composePositionRead } from './positionReadComposer';
import type { StockfishAnalysis } from '../types';

// "Teach me this position" on a puzzle (David 2026-10-01): the read teaches
// the POSITION before the student answers and never gives the move away.
// Real puzzle from the walk (Lichess 0Flch): White to move, Nd6# smothered.
const FEN = 'r2qkb1r/pp1nppp1/3p1n1p/2pP4/4N3/2P5/PP2QPPP/RNB1K2R w KQkq - 2 10';
const ANALYSIS = {
  bestMove: 'e4d6', evaluation: 100000, isMate: true, mateIn: 1, depth: 14, nodesPerSecond: 0,
  topLines: [
    { rank: 1, evaluation: 100000, moves: ['e4d6'], mate: 1 },
    { rank: 2, evaluation: 90, moves: ['c1f4', 'e7e6'], mate: null },
    { rank: 3, evaluation: 60, moves: ['e1g1', 'e7e6'], mate: null },
  ],
} as unknown as StockfishAnalysis;

const read = (withhold: string | null): Promise<string> => composePositionRead({
  fen: FEN, pgn: '', playerColor: 'white', openingName: null, rating: 1400,
  analysis: ANALYSIS, tacticsSkill: undefined, studentWeaknesses: [], studentNeedContext: null,
  evalBoard: () => Promise.resolve('0'), isCancelled: () => false, corpusNotes: false, withhold,
});

describe('the position read withholds a puzzle answer', () => {
  it('before the answer: says something, never the move or its squares', async () => {
    const text = await read('Nd6#');
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/Nd6|\bd6\b|\be4\b/);
  });

  it('control: the same read without withholding does reach the answer', async () => {
    const text = await read(null);
    expect(text).toMatch(/Nd6|\bd6\b|\be4\b|mate/i);
  });
});
