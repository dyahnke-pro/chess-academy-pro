import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';

// chesscom-1040709576 (2026-10-13): the student's mating Qxh2# was narrated as
// "Your queen on h2 and your bishop on g3 form a battery … Your plan is to
// advance your kingside pawn majority" — the default (uncapped) builder never
// carried the checkmate beat.
const PGN = '1. e4 c5 2. Nf3 Nc6 3. c3 d6 4. d4 cxd4 5. cxd4 Bg4 6. Bc4 e6 7. Be3 Nf6 8. Nc3 Nxe4 9. Nxe4 d5 10. Bd3 dxe4 11. Bxe4 Bb4+ 12. Bd2 Bxf3 13. Bxf3 Qxd4 14. O-O Qxd2 15. Qb3 O-O 16. Rfd1 Nd4 17. Qc4 Nxf3+ 18. gxf3 Qg5+ 19. Kh1 Bc5 20. f4 Qh5 21. Rd7 Qf3+ 22. Kg1 Bxf2+ 23. Kf1 Bg3+ 24. Kg1 Qf2+ 25. Kh1 Qxh2#';

describe('the mating ply is the mate, on every review builder', () => {
  const c = new Chess(); c.loadPgn(PGN);
  const moves: ReviewMoveInput[] = c.history({ verbose: true }).map((mv, i) => ({
    ply: i + 1, san: mv.san, isCoachMove: i % 2 === 0, classification: 'good',
    evaluation: i >= 40 ? -30000 : -400, preMoveEval: i >= 41 ? -30000 : -400, bestMove: null, fenAfter: mv.after,
  }));
  for (const uncapped of [true, false]) {
    it(`uncapped=${uncapped}: names the mate and its pattern, and nothing else`, () => {
      const segs = buildReviewSegmentsForTests(moves, 'black', 'Sicilian Defense', uncapped);
      const last = segs.find((s) => s.ply === 50);
      expect(last?.narration).toMatch(/checkmate/);
      expect(last?.narration).toMatch(/Greco's Mate/);
      expect(last?.narration).not.toMatch(/majority|battery/);
    }, 60_000);
  }
});
