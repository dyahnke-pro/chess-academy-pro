// The deep-threat horizon, BOTH directions (David 2026-07-22: "I want to know
// that threats are called out 3+ moves in advance. Both for and against the
// user"). The engine is mocked to a canned multi-ply refutation line so the
// #5c AGAINST-the-user pass is exercised deterministically: after the
// opponent's quiet-looking ...Bc5, giving the opponent the move again runs
// Bxf2+ Kxf2 Qh4+ — a 3-ply swing ≥250cp toward the opponent. The pass must
// narrate the brewing idea AND close with the stored defense.
import { describe, it, expect, vi } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      evaluation: -400,
      bestMove: 'c5f2',
      topLines: [{ moves: ['c5f2', 'e1f2', 'd8h4'], evaluation: -400 }],
    }),
  },
}));

import { generateReviewNarration } from './coachFeatureService';
import type { ReviewMoveInput } from './coachFeatureService';
import { Chess } from 'chess.js';

describe('deep threat AGAINST the student (#5c)', () => {
  it('narrates the opponent\'s multi-move idea and names the stored defense', async () => {
    const sans = ['e4', 'e5', 'Nc3', 'Bc5', 'a3', 'Qh4'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return {
        ply,
        san,
        isCoachMove: ply % 2 === 0,
        classification: 'good',
        evaluation: -30,
        preMoveEval: -20,
        bestMove: ply === 5 ? 'g1f3' : null,
        fenAfter: c.fen(),
      } as unknown as ReviewMoveInput;
    });

    const n = await generateReviewNarration({
      moves,
      playerColor: 'white',
      openingName: null,
      result: '0-1',
      playerRating: 1500,
      coachNarration: 'silent',
    });

    const oppSeg = n.segments.find((s) => s.ply === 4); // ...Bc5, opponent 'good'
    expect(oppSeg).toBeTruthy();
    expect(oppSeg?.narration ?? '').toMatch(/Watch what they're building/);
    // The line is rendered ply-by-ply (Bxf2 appears in the narrated run).
    expect(oppSeg?.narration ?? '').toMatch(/Bxf2/);
    // The DEFENSE from the stored analysis (the student's next best move).
    expect(oppSeg?.narration ?? '').toMatch(/Your defense starts with Nf3/);
  });
});
