// ONE READ PER BOARD, ACROSS GAMES (#155, 2026-11-09). After 6.h3 the
// student's …Nc6 was "a mistake — Bh5 was the move" in one game and "a blunder
// — Bxf3" in the next: Learn judged the move from a fresh time-capped read each
// game. The board's read and the move's price are kept, and read first.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { BOARD_READ_LINES, forgetKeptBoards, keepBoardRead, keepMovePrice, keptBoardRead, keptMovePrice, readBoardOnce } from './boardReadStore';
import { clearMovePriceMemo, studentMovePrice } from './playedMoveGrade';
import { stockfishEngine } from './stockfishEngine';
import { COACH_TURN_DEPTH } from './engineConstants';
import type { StockfishAnalysis } from '../types';

// After 1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 … — any real board will do; this is
// the Philidor board after 6.h3 the defect was heard on, Black to move.
const BOARD = 'rn1qkbnr/ppp2ppp/3p4/4p3/3PP1b1/5N1P/PPP2PP1/RNBQKB1R b KQkq - 0 4';
const BOARD_LATER_IN_GAME = BOARD.replace(/ 0 4$/, ' 0 9');

function read(best: string, depth: number, lines = BOARD_READ_LINES): StockfishAnalysis {
  const ucis = [best, 'g4f3', 'g4e6', 'g4d7', 'b8c6', 'g8f6', 'a7a6'].slice(0, lines);
  return {
    bestMove: best, evaluation: 40, isMate: false, mateIn: null, depth, nodesPerSecond: 0,
    topLines: ucis.map((m, i) => ({ rank: i + 1, moves: [m], evaluation: 40 - i * 30, mate: null, depth })),
  } as unknown as StockfishAnalysis;
}

beforeEach(async () => { await forgetKeptBoards(); clearMovePriceMemo(); });

describe('one read per board', () => {
  it('a second game on the board reads the first game\'s read — the search is not run again', async () => {
    const first = await readBoardOnce(BOARD, async () => read('g4h5', COACH_TURN_DEPTH));
    const fresh = vi.fn(async () => read('g4f3', COACH_TURN_DEPTH));
    const second = await readBoardOnce(BOARD_LATER_IN_GAME, fresh);
    expect(first?.bestMove).toBe('g4h5');
    expect(second?.bestMove).toBe('g4h5');
    expect(fresh).not.toHaveBeenCalled();
  });

  it('a read cut short is a draft: one full read replaces it, then the board never changes again', async () => {
    await readBoardOnce(BOARD, async () => read('g4f3', COACH_TURN_DEPTH - 4));
    await keepMovePrice(BOARD, 'b8c6', { costCp: 140, scores: null, settled: true });
    // A second short read does not move the draft.
    expect((await readBoardOnce(BOARD, async () => read('g4e6', COACH_TURN_DEPTH - 2)))?.bestMove).toBe('g4f3');
    // A full read replaces it, and the draft's price goes with it.
    expect((await readBoardOnce(BOARD, async () => read('g4h5', COACH_TURN_DEPTH)))?.bestMove).toBe('g4h5');
    expect(await keptMovePrice(BOARD, 'b8c6')).toBeNull();
    expect((await readBoardOnce(BOARD, async () => read('g4d7', COACH_TURN_DEPTH + 4)))?.bestMove).toBe('g4h5');
  });

  it('the eval bar\'s three-line read is never kept: the next game\'s but-turn reads six lines', async () => {
    await keepBoardRead(BOARD, read('g4h5', COACH_TURN_DEPTH, 3));
    expect(await keptBoardRead(BOARD)).toBeNull();
  });

  it('a price is kept only against a kept read, settled, and the first one wins', async () => {
    await keepMovePrice(BOARD, 'b8c6', { costCp: 90, scores: null, settled: true });
    expect(await keptMovePrice(BOARD, 'b8c6')).toBeNull();
    await keepBoardRead(BOARD, read('g4h5', COACH_TURN_DEPTH));
    await keepMovePrice(BOARD, 'b8c6', { costCp: 90, scores: null, settled: false });
    expect(await keptMovePrice(BOARD, 'b8c6')).toBeNull();
    await keepMovePrice(BOARD, 'b8c6', { costCp: 90, scores: null, settled: true });
    await keepMovePrice(BOARD, 'b8c6', { costCp: 250, scores: null, settled: true });
    expect((await keptMovePrice(BOARD_LATER_IN_GAME, 'b8c6'))?.costCp).toBe(90);
  });
});

type Dispatch = (fen: string, depth: number, options?: Record<string, string | number>) => Promise<StockfishAnalysis>;

describe('the student\'s price is the same in every game on the board', () => {
  it('game 2 hears game 1\'s price for the same move, even when a new search would say otherwise', async () => {
    const engineAny = stockfishEngine as unknown as { _dispatchAnalysis: Dispatch };
    // White-POV scores; Black to move. Game 1: …Be7 costs 150 (a mistake).
    let playedWhiteCp = 110;
    const spy = vi.spyOn(engineAny, '_dispatchAnalysis').mockImplementation(async (_fen, depth) => ({
      bestMove: 'g4h5', evaluation: -40, isMate: false, mateIn: null, depth, nodesPerSecond: 0,
      topLines: [
        { rank: 1, moves: ['g4h5'], evaluation: -40, mate: null, depth },
        { rank: 2, moves: ['f8e7'], evaluation: playedWhiteCp, mate: null, depth },
      ],
    }) as unknown as StockfishAnalysis);
    try {
      const fan = await readBoardOnce(BOARD, async () => read('g4h5', COACH_TURN_DEPTH));
      const game1 = await studentMovePrice(BOARD, 'f8e7', fan, COACH_TURN_DEPTH);
      clearMovePriceMemo(); // a new page, a new game
      playedWhiteCp = 360; // the same search, landing elsewhere, would call it a blunder
      const game2 = await studentMovePrice(BOARD_LATER_IN_GAME, 'f8e7', await keptBoardRead(BOARD), COACH_TURN_DEPTH);
      expect(game1?.costCp).toBe(150);
      expect(game2?.costCp).toBe(150);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Learn reads every board through the kept read', () => {
  const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
  it('the next-board read the move is graded from', () => {
    expect(page).toMatch(/const nextBoardRead: Promise<StockfishAnalysis \| null> = nextBoardFen\s*\? readBoardOnce\(nextBoardFen,/);
  });
  it('the eval bar, the grade\'s fallback', () => {
    expect(page).toMatch(/const kept = await keptBoardRead\(fen\);[\s\S]{0,200}kept && !isDraftRead\(kept\)/);
  });
});
