import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { WeaknessSignal } from './weaknessSignal';

describe('review remembers the green direction — the same computer Learn speaks (2026-10-15)', () => {
  it('a clean move answering a question failed in another game says "This time you held it"', { timeout: 60_000 }, async () => {
    const { buildReviewSegmentsForTests } = await import('./coachFeatureService');
    const c = new Chess();
    const inputs = ['e4', 'c5', 'c3', 'Nf6'].map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, isCoachMove: i % 2 === 0, classification: 'good' as const, evaluation: 30, preMoveEval: 30, bestMove: null, fenAfter: c.fen() };
    });
    // …Nf6 develops: the board posed `neglected-development`, which this
    // student's record holds from an earlier game.
    const sig = { clusterId: 'neglected-development', bucket: 'opening', label: 'Neglected development', openCount: 2, severity: 50, puzzleThemes: [], total: 2, games: [{ gameId: 'earlier', opponentName: 'Sam' }], capabilityTag: null } as unknown as WeaknessSignal;
    const segs = buildReviewSegmentsForTests(inputs, 'black', null, true, 1500, [sig], undefined, 'now');
    expect(segs.find((s) => s.ply === 4)?.narration ?? '').toMatch(/That one has caught you before — neglected development — the last one was against Sam\. This time you held it\./);
  });
});
