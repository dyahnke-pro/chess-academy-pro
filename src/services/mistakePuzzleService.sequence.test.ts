import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildMistakePuzzle } from '../test/factories';

// ensureSequenceSolution turns a captured single-move `tactical_sequence`
// puzzle into the engine's multi-move forcing line (David 2026-07-14: "I want
// tactical sequences tho, just one move solves"). The engine is mocked so the
// test controls the PV — we're pinning the wiring, not Stockfish.

const mockAnalyze = vi.fn();
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    initialize: () => Promise.resolve(),
    analyzePosition: (...args: unknown[]) => mockAnalyze(...args),
  },
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function pv(moves: string[]): unknown {
  return { bestMove: moves[0], evaluation: 0, isMate: false, mateIn: null, depth: 16, topLines: [{ moves, evaluation: 0, mate: null }], nodesPerSecond: 0 };
}

// Import AFTER the mock is registered.
const { ensureSequenceSolution } = await import('./mistakePuzzleService');

beforeEach(async () => {
  await db.mistakePuzzles.clear();
  mockAnalyze.mockReset();
});

describe('ensureSequenceSolution', () => {
  it('extends a single-move tactical_sequence puzzle into the engine PV line', async () => {
    mockAnalyze.mockResolvedValue(pv(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4']));
    const puzzle = buildMistakePuzzle({
      id: 'seq1', fen: START, bestMove: 'e2e4', moves: 'e2e4',
      tacticType: 'tactical_sequence', playerColor: 'white',
    });
    await db.mistakePuzzles.add(puzzle);

    const out = await ensureSequenceSolution(puzzle);

    expect(out.moves).toBe('e2e4 e7e5 g1f3 b8c6 f1c4');
    // Persisted so it's a one-time cost.
    expect((await db.mistakePuzzles.get('seq1'))?.moves).toBe('e2e4 e7e5 g1f3 b8c6 f1c4');
  });

  it('leaves non-tactical_sequence puzzles untouched (no engine call)', async () => {
    const puzzle = buildMistakePuzzle({ fen: START, bestMove: 'e2e4', moves: 'e2e4', tacticType: 'fork' });
    const out = await ensureSequenceSolution(puzzle);
    expect(out.moves).toBe('e2e4');
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('leaves an already-multi-move puzzle untouched', async () => {
    const puzzle = buildMistakePuzzle({ fen: START, bestMove: 'e2e4', moves: 'e2e4 e7e5', tacticType: 'tactical_sequence' });
    const out = await ensureSequenceSolution(puzzle);
    expect(out.moves).toBe('e2e4 e7e5');
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('keeps the single move when the PV does not start with the puzzle best move', async () => {
    mockAnalyze.mockResolvedValue(pv(['d2d4', 'd7d5']));
    const puzzle = buildMistakePuzzle({ fen: START, bestMove: 'e2e4', moves: 'e2e4', tacticType: 'tactical_sequence' });
    const out = await ensureSequenceSolution(puzzle);
    expect(out.moves).toBe('e2e4');
  });

  it('keeps the single move (never throws) when the engine fails', async () => {
    mockAnalyze.mockRejectedValue(new Error('engine down'));
    const puzzle = buildMistakePuzzle({ fen: START, bestMove: 'e2e4', moves: 'e2e4', tacticType: 'tactical_sequence' });
    const out = await ensureSequenceSolution(puzzle);
    expect(out.moves).toBe('e2e4');
  });
});
