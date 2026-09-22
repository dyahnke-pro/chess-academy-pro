// B3: the "Why?" answer is composed with the student model's need half — the
// caller's context reaches the composer, and a null is an honest null, not a
// dropped field. Negative control: remove `studentNeedContext:
// input.studentNeedContext` from the computePositionFacts call → both fail.
import { describe, it, expect, vi } from 'vitest';
import { coldStudent } from './needScore';

const computePositionFacts = vi.fn(async (_input: unknown) => ({ clauses: [], remember: [] }));
vi.mock('./positionFacts', () => ({
  computePositionFacts: (input: unknown) => computePositionFacts(input),
  clauseText: () => [],
}));

const { computeWhyBestMove } = await import('./whyBestMove');

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const analysis = { bestMove: 'e2e4', evaluation: 30, isMate: false, mateIn: null, depth: 12, seldepth: 12, topLines: [{ rank: 1, evaluation: 30, moves: ['e2e4'], mate: null }] };

describe('computeWhyBestMove forwards the need context (B3)', () => {
  it('a loaded context reaches the composer', async () => {
    const ctx = { ...coldStudent(1400), gamesPlayed: 7 };
    await computeWhyBestMove({ fen: FEN, studentColor: 'white', analysis, studentNeedContext: ctx });
    const seen = computePositionFacts.mock.calls.at(-1)?.[0] as { studentNeedContext?: { gamesPlayed: number } | null };
    expect(seen.studentNeedContext?.gamesPlayed).toBe(7);
  });
  it('null stays null — recorded as ABSENT, never invented', async () => {
    await computeWhyBestMove({ fen: FEN, studentColor: 'white', analysis, studentNeedContext: null });
    const seen = computePositionFacts.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect('studentNeedContext' in seen).toBe(true);
    expect(seen.studentNeedContext).toBeNull();
  });
});
