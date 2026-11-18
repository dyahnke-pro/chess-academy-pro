// A prepared pawn move the played move neither guards nor clears the road for
// is dropped — and with nothing stopped either, the move has no intent at all.
// Prod Learn 2026-11-18 (ply 42) spoke "Your move prepares ." because the
// "nothing to say" check ran before that last filter emptied both halves.
import { describe, it, expect } from 'vitest';
import { moveIntent } from './moveIntent';
import type { AnalysisLine } from '../types';

const line = (rank: number, evaluation: number, moves: string[]): AnalysisLine => ({ rank, evaluation, moves, mate: null });

describe('moveIntent — a prepared move dropped by the last filter leaves no sentence', () => {
  it('Nf3 with the engine heading for a3 (not its doing) says nothing, never "prepares ."', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    const reads = {
      before: [line(1, 60, ['g1f3', 'e7e5']), line(2, -40, ['a2a3', 'e7e5'])],
      after: [line(1, 60, ['e7e5', 'a2a3', 'b8c6'])],
      passBefore: [],
      passAfter: [],
    };
    for (const holdPlayed of [false, true]) {
      const out = moveIntent(start, 'Nf3', reads, 'student', { prepare: 'line', prevent: 'any+deny', holdPlayed });
      expect(out?.text ?? '').not.toMatch(/prepares \.|prepares $/);
      expect(out).toBeNull();
    }
  });
});
