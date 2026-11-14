import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';

// Review prod audit 2026-11-14 (Giri–Carlsen, French, the student Black), 31…Kh8:
// "You went for Kh8, which unpins your g-pawn, freeing it to join the game.
// Kh8 unpins your pawn, freeing it to join the game." — one unpin, said twice.
const MOVES = '1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Bd7 6. Be2 Nge7 7. O-O cxd4 8. cxd4 Nf5 9. Nc3 Rc8 10. Kh1 a6 11. Bg5 Qb6 12. Na4 Qa7 13. Be3 Be7 14. a3 b5 15. Nc3 O-O 16. Bd3 Nxe3 17. fxe3 b4 18. axb4 Nxb4 19. e4 Nxd3 20. Qxd3 dxe4 21. Nxe4 h6 22. Rfe1 a5 23. Qd2 Bc6 24. Qf4 Qb8 25. Re2 a4 26. Qg4 Qb5 27. Rae1 Bb4 28. d5 Bxe1 29. Nd4 Qd3 30. Rxe1 Bxd5 31. Nf6+ Kh8 32. Nxd5';

describe('an unpin is said once', () => {
  it('31…Kh8 — one sentence frees the g-pawn', { timeout: 180_000 }, () => {
    const sans = MOVES.replace(/\d+\./g, '').trim().split(/\s+/);
    const c = new Chess();
    const game = sans.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: -30, evaluation: -30, bestMove: null } as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(game, 'black', null, true, 1200, [], coldStudent(1200), 'g');
    const said = segs.find((s) => s.ply === 62)?.narration ?? '';

    expect(said.match(/unpins/g) ?? []).toHaveLength(1);
  });
});
