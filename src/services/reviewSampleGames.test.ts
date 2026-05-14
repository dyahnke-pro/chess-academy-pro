import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { SAMPLE_GAMES } from './reviewSampleGames';

/**
 * Production-audit-driven regression test. The London sample PGN
 * (`sample-london-amateur-3`) shipped with multiple illegal moves
 * (8.Qxd3 blocked by Nd2, 17.Rae1 blocked by Qb1, 21.Rxe6 blocked by
 * e5-pawn). chess.js `loadPgn` correctly rejected the load,
 * `adaptGameRecord` returned null, and `CoachReviewSessionPage`
 * rendered "Loading game…" forever with no error path. The user-
 * facing struggle: tapping the London sample on /coach/review wedged
 * the page with no recovery.
 *
 * Every sample PGN must:
 *   1. Parse with chess.js's strict loadPgn.
 *   2. Produce at least one ply of history.
 *   3. Have every annotation entry land on a ply whose SAN matches
 *      the canonical history (no off-by-one between PGN + annotations).
 *
 * Adding a new sample? Run `npm test -- reviewSampleGames` first.
 */
describe('reviewSampleGames — PGN integrity', () => {
  for (const sample of SAMPLE_GAMES) {
    describe(`sample: ${sample.id}`, () => {
      it('PGN parses with chess.js strict loadPgn', () => {
        const chess = new Chess();
        expect(() => chess.loadPgn(sample.pgn)).not.toThrow();
        expect(chess.history().length).toBeGreaterThan(0);
      });

      it('annotations are ply-aligned with the PGN history', () => {
        const chess = new Chess();
        chess.loadPgn(sample.pgn);
        const history = chess.history();
        for (const annot of sample.annotations) {
          const plyIndex = (annot.m - 1) * 2 + (annot.c === 'white' ? 0 : 1);
          // Annotations may stop short of the PGN (e.g. game ends with
          // an evaluation pass that doesn't annotate the last move) —
          // only validate annotations that point INTO the played plies.
          if (plyIndex >= history.length) return;
          expect(
            history[plyIndex],
            `${sample.id} ply ${plyIndex + 1} (${annot.c} move ${annot.m}): annotated "${annot.san}" but history has "${history[plyIndex]}"`,
          ).toBe(annot.san);
        }
      });
    });
  }
});
