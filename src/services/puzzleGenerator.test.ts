import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { generatePuzzlesFromPgn, generatePuzzlesFromPositions, pliesFromPgn, themesFor, type PuzzleAnalyze } from './puzzleGenerator';
import { MASTER_TIER_RATING } from './puzzleDifficulty';
import type { AnalysisLine } from '../types';

const line = (moves: string[], evaluation: number, mate: number | null = null, rank = 1): AnalysisLine => ({ rank, evaluation, moves, mate });

/** A canned engine: answers by FEN, quiet everywhere else. */
function canned(table: Record<string, { topLines: AnalysisLine[]; evaluation: number }>): PuzzleAnalyze {
  return async (fen) => table[fen] ?? { topLines: [line(['e1d1'], 0), line(['e1f1'], 0, null, 2)], evaluation: 0 };
}

// Black (to move) plays …b5; White then has Nc7+ forking king + rook — a real,
// unique, winning find. Lichess shape: fen BEFORE …b5, moves = b7b5 + solution.
const BEFORE_SETUP = 'r3k3/1p6/4N3/8/8/8/8/4K3 b - - 0 1';
const solverFen = (() => { const c = new Chess(BEFORE_SETUP); c.move('b5'); return c.fen(); })();

describe('generatePuzzlesFromPositions — the one source-agnostic generator', () => {
  const plies = [
    { fenBefore: BEFORE_SETUP, uci: 'b7b5' },
    { fenBefore: solverFen, uci: 'e6c7' },
  ];

  it('emits a Lichess-shaped puzzle with a COMPUTED concept, tags and rating', async () => {
    const analyze = canned({ [solverFen]: { evaluation: 650, topLines: [line(['e6c7', 'e8d8', 'c7a8'], 650), line(['e1d2'], 20, null, 2)] } });
    const out = await generatePuzzlesFromPositions(plies, { analyze, source: 'own-game', sourceGameId: 'g1' });
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.fen).toBe(BEFORE_SETUP);
    expect(p.moves).toBe('b7b5 e6c7 e8d8 c7a8');
    expect(p.concepts[0].id).toBe('fork');
    expect(p.themes).toContain('fork');
    expect(p.themes).toContain('crushing');
    expect(p.sideToSolve).toBe('white');
    expect(p.rating).toBeGreaterThanOrEqual(600);
    expect(p.rating).toBeLessThanOrEqual(3000);
    expect(p.swingCp).toBe(630);
    expect(p.source).toBe('own-game');
    expect(p.sourceGameId).toBe('g1');
    expect(p.id).toMatch(/^gen-own-game-/);
  });

  it('HARD RULE: no computed concept → no puzzle, even with a big swing', async () => {
    // A unique winning move the concept engine classifies as nothing tactical
    // (a quiet king step in the same position) is not served.
    const analyze = canned({ [solverFen]: { evaluation: 400, topLines: [line(['e1d1'], 400), line(['e1f1'], 0, null, 2)] } });
    const out = await generatePuzzlesFromPositions(plies, { analyze });
    expect(out).toHaveLength(0);
  });

  it('not unique (runner-up close) → no puzzle; not winning → no puzzle', async () => {
    const close = canned({ [solverFen]: { evaluation: 650, topLines: [line(['e6c7', 'e8d8', 'c7a8'], 650), line(['e1d2'], 600, null, 2)] } });
    expect(await generatePuzzlesFromPositions(plies, { analyze: close })).toHaveLength(0);
    const losing = canned({ [solverFen]: { evaluation: -300, topLines: [line(['e6c7'], -300), line(['e1d2'], -900, null, 2)] } });
    expect(await generatePuzzlesFromPositions(plies, { analyze: losing })).toHaveLength(0);
  });

  it('the solution always ends on the SOLVER\'s move and respects the cap', async () => {
    const analyze = canned({ [solverFen]: { evaluation: 650, topLines: [line(['e6c7', 'e8d8', 'c7a8', 'd8c8', 'a8b6'], 650), line(['e1d2'], 20, null, 2)] } });
    const out = await generatePuzzlesFromPositions(plies, { analyze, maxSolutionPlies: 4 });
    // cap 4 → 3 solver-first plies (ends on White's move)
    expect(out[0].moves.split(' ')).toHaveLength(1 + 3);
  });

  it('a mating line is tagged mateInN and the mate pattern names the concept', async () => {
    // …Kh8 then Re8# (back-rank). fen before …Kh8: 6k1/5ppp/8/8/8/8/4RPPP/6K1 b
    const before = '6k1/5ppp/8/8/8/8/4RPPP/6K1 b - - 0 1';
    const c = new Chess(before); c.move('Kh8'); const sf = c.fen();
    const analyze = canned({ [sf]: { evaluation: 9999, topLines: [line(['e2e8'], 9999, 1), line(['e2e7'], 0, null, 2)] } });
    const out = await generatePuzzlesFromPositions([{ fenBefore: before, uci: 'g8h8' }, { fenBefore: sf, uci: 'e2e8' }], { analyze });
    expect(out).toHaveLength(1);
    expect(out[0].concepts[0].id).toBe('back-rank-mate');
    expect(out[0].themes).toEqual(expect.arrayContaining(['mate', 'mateIn1', 'backRankMate']));
  });

  it('positions INSIDE a found combination are not emitted again', async () => {
    const after1 = (() => { const c = new Chess(solverFen); c.move('Nc7+'); return c.fen(); })();
    const after2 = (() => { const c = new Chess(after1); c.move('Kd8'); return c.fen(); })();
    const analyze = canned({
      [solverFen]: { evaluation: 650, topLines: [line(['e6c7', 'e8d8', 'c7a8'], 650), line(['e1d2'], 20, null, 2)] },
      [after2]: { evaluation: 650, topLines: [line(['c7a8'], 650), line(['c7e6'], 0, null, 2)] },
    });
    const out = await generatePuzzlesFromPositions([
      { fenBefore: BEFORE_SETUP, uci: 'b7b5' }, { fenBefore: solverFen, uci: 'e6c7' },
      { fenBefore: after1, uci: 'e8d8' }, { fenBefore: after2, uci: 'c7a8' },
    ], { analyze });
    expect(out).toHaveLength(1);
  });
});

describe('generatePuzzlesFromPgn + helpers', () => {
  it('replays a PGN into fenBefore/uci plies and never throws on garbage', () => {
    expect(pliesFromPgn('1. e4 e5 2. Nf3 Nc6')).toHaveLength(4);
    expect(pliesFromPgn('not a pgn at all')).toEqual([]);
  });

  it('runs the generator over a PGN (engine canned quiet → no puzzles, no throw)', async () => {
    const out = await generatePuzzlesFromPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', { analyze: canned({}) });
    expect(out).toEqual([]);
  });

  it('themesFor maps concepts + shape to Lichess-style tags', () => {
    const tags = themesFor([{ id: 'lucena', source: 'technique' }], 4, null, 300);
    expect(tags).toEqual(expect.arrayContaining(['endgame', 'rookEndgame', 'veryLong', 'advantage']));
  });

  it('the master tier is a rating filter, not a source', () => {
    expect(MASTER_TIER_RATING).toBe(2400);
  });
});
