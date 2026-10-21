// Review says the green half of "last time here": the student left theory from
// this board in another game at a cost, and this game they kept to it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { coldStudent } from './needScore';
import type { BookDepartureRow } from './bookDepartureWeakness';

const game = (sans: string[]): { ply: number; san: string; fenAfter: string }[] => {
  const c = new Chess();
  return sans.map((san, i) => { const m = c.move(san); return { ply: i + 1, san: m.san, fenAfter: c.fen() }; });
};

describe('review — last time here (2026-10-15)', () => {
  it('a book move where the student once left theory says so, once', { timeout: 60_000 }, async () => {
    const { buildReviewSegmentsForTests } = await import('./coachFeatureService');
    const moves = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6']);
    const inputs = moves.map((m) => ({
      ply: m.ply, san: m.san, isCoachMove: m.ply % 2 === 1, classification: 'book' as const,
      evaluation: 20, preMoveEval: 20, bestMove: null, fenAfter: m.fenAfter,
    }));
    const row: BookDepartureRow = {
      gameId: 'g-old', departurePly: 6, departedSan: 'Nd4', mainSan: 'Bc5', bookFen: moves[4].fenAfter,
      evalCostCp: 120, openingId: null, playedAt: Date.now() - 2 * 86_400_000,
    };
    const need = { ...coldStudent(1500), bookDepartures: [row] };
    const segs = buildReviewSegmentsForTests(inputs, 'black', null, true, 1500, [], need, 'g-now', new Map(), new Map());
    const said = segs.find((s) => s.ply === 6)?.narration ?? '';
    expect(said).toContain('Last time here you played Nd4 and it cost you about a point');
    expect(said).toContain('This time you kept to theory.');
    // Negative control: the same game with no record says nothing of it.
    const cold = buildReviewSegmentsForTests(inputs, 'black', null, true, 1500, [], coldStudent(1500), 'g-now', new Map(), new Map());
    expect(cold.map((s) => s.narration).join(' ')).not.toMatch(/Last time here/);
  });
});
