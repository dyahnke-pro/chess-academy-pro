// The Review free board graded an explored move as the read before minus a
// separate, time-boxed read after. Carlsen–Grischuk, Norway 2015, after
// 5…a6: exploring Ndb5 drops the knight to …axb5 (one search, Stockfish
// depth 14: Be3 +31, Ndb5 −321). A read of the position after the move that
// the budget cut short (−80 here) made the two-read grade a "mistake" of about
// a pawn; the one price says what one search says.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const { scoreMoves } = vi.hoisted(() => ({ scoreMoves: vi.fn() }));
vi.mock('./refutedAlternative', async (importOriginal) => {
  const real = await importOriginal<typeof import('./refutedAlternative')>();
  return { ...real, SINGLETON_SCORER: { ...real.SINGLETON_SCORER, scoreMoves } };
});

import { gradeExploredMove } from './exploredMoveGrade';
import { clearMovePriceMemo } from './playedMoveGrade';
import type { StockfishAnalysis } from '../types';

const NDB5_BOARD = 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6';
const line = (rank: number, evaluation: number, uci: string): StockfishAnalysis['topLines'][number] => ({ rank, evaluation, mate: null, moves: [uci] });
/** The free board's read at the explored position — Ndb5 is not in its fan. */
const BEFORE = { bestMove: 'c1e3', evaluation: 31, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 0, topLines: [line(1, 31, 'c1e3'), line(2, 25, 'f2f3')] } as StockfishAnalysis;

beforeEach(() => {
  clearMovePriceMemo();
  scoreMoves.mockReset();
  scoreMoves.mockResolvedValue([{ evaluation: 31, mate: null, moves: ['c1e3'] }, { evaluation: -321, mate: null, moves: ['d4b5'] }]);
});

describe('the free board grades an explored move from the one price', () => {
  it('Ndb5 is a blunder of about 3.5 points from one search, with Be3 the better move', async () => {
    const g = await gradeExploredMove({ fenBefore: NDB5_BOARD, san: 'Ndb5', before: BEFORE, depth: 12 });
    expect(g).toMatchObject({ costCp: 352, bestWhiteCp: 31, playedWhiteCp: -321, bestUci: 'c1e3', classification: 'blunder' });
    expect(scoreMoves).toHaveBeenCalledWith(NDB5_BOARD, ['c1e3', 'd4b5'], 12);
  });
  it("the engine's own move is graded at no cost and names no better move", async () => {
    const g = await gradeExploredMove({ fenBefore: NDB5_BOARD, san: 'Be3', before: BEFORE, depth: 12 });
    expect(g?.costCp).toBe(0);
    expect(g?.bestUci).toBeNull();
    expect(scoreMoves).not.toHaveBeenCalled();
  });
  it('Review reads no separate after-read for the grade (the two-read path is gone)', () => {
    const src = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');
    const start = src.indexOf('const narrateExploredMove = useCallback');
    const body = src.slice(start, src.indexOf('const narrateExploredMoveRef', start));
    expect(body).toContain('gradeExploredMove(');
    expect(body).not.toMatch(/classifyCpLoss\(|before\.evaluation\)?\s*-|after\.evaluation\)?\s*-/);
  });
});
