// A FOLLOW-UP THE LINE ITSELF MADE LEGAL WAS NOT PREPARED BY THE MOVE (Learn
// audit 2026-10-15: "Their castle kingside prepares c3"). The real game: after
// O-O the engine's line plays Nb5 first, and only that frees c3 for the pawn.
import { describe, it, expect } from 'vitest';
import { moveIntent } from './moveIntent';
import type { AnalysisLine } from '../types';

const L = (cp: number, pv: string[]): AnalysisLine => ({ rank: 1, evaluation: cp, moves: pv, mate: null });
const FEN = '2kr1b1r/ppp2ppp/2n5/q2p4/6n1/2N2N2/PPPBBPP1/R2QK2R w KQ - 0 11';

describe('line mode credits only what the move itself cleared', () => {
  it('O-O does not prepare c3 when the line\'s Nb5 is what vacates c3', () => {
    const reads = { before: [L(0, ['e1g1'])], after: [L(0, ['f8c5', 'c3b5', 'a5b6', 'c2c3'])], passBefore: [], passAfter: [] };
    for (const seat of ['opponent', 'student'] as const) {
      const out = moveIntent(FEN, 'O-O', reads, seat, { prepare: 'line', prevent: 'concrete' });
      expect(out?.prepares?.san ?? null, seat).not.toBe('c3');
    }
  });
});
