/**
 * ONE COACH, ONE ANSWER — the surfaces must not disagree about the board.
 *
 * 🔴 WHY THIS EXISTS. On 2026-09-21 the same position produced three different
 * answers: review refused a fork, Learn asked *"Your queen can land a fork
 * here. What's the square?"*, and the live envelope announced `FORK`. Each
 * surface had reached for its own copy of "is this tactic real" — the exact
 * failure the unified-coach rule names ("all builds available at every site,
 * used differently").
 *
 * Fixing the copies is not enough, because nothing stopped the NEXT surface
 * from rolling its own. This is the standing check: one board, every surface,
 * same verdict.
 *
 * 🚨 IT ASSERTS AGREEMENT, NOT A PARTICULAR ANSWER. Whether a given board is a
 * fork is the computers' business and will change as they improve. What must
 * never come back is the student hearing one thing in review and another in
 * Learn. So a change that legitimately reclassifies a board keeps this green;
 * only a change that makes the surfaces DIVERGE fails it.
 */

import { describe, it, expect } from 'vitest';
import { plyFactsForMove, landedTacticFor } from '../services/pvPlayback';
import { Chess } from 'chess.js';
import { turningCause, turningQuestion } from '../services/turningPoints';

/** Real positions, both measured the day this was written. */
const BOARDS = [
  {
    name: 'Qf4+ — the forked QUEEN answers Qxf4, so the fork wins nothing',
    before: '6k1/5p2/5B1Q/1p1P1q2/4r3/1p6/6PK/6R1 b - - 1 36',
    san: 'Qf4+', uci: 'f5f4',
  },
  {
    name: 'Qxf2+ — a genuine royal fork (only Kh2/Kh1 are legal)',
    before: '4r1k1/3b1pB1/1b1p1Qn1/1p1P4/1p2P3/5NNP/2q2PP1/4R1K1 b - - 0 25',
    san: 'Qxf2+', uci: 'c2f2',
  },
];

describe('review and Learn agree about what a fork is', () => {
  for (const b of BOARDS) {
    it(b.name, () => {
      // REVIEW — the narrated clause.
      const review = /lands a fork/i.test(plyFactsForMove(b.before, b.san) ?? '');
      // THE QUESTION the student is asked at a turning point (review), built
      // from the cause the best move carries, against a played move that
      // lands nothing.
      const mover = b.before.split(' ')[1] === 'w' ? 'white' as const : 'black' as const;
      const other = new Chess(b.before).moves().find((m) => m !== b.san && landedTacticFor(b.before, m) === null) ?? '';
      const cause = turningCause({ ply: 1, san: other, fenBefore: b.before, classification: 'mistake', evalBefore: 0, evalAfter: 0, bestMoveUci: b.uci, bestMoveSan: b.san, playerColor: mover }, null);
      const question = turningQuestion(cause);
      const learn = /fork/i.test(question);
      // …and the shared judgement both are supposed to read.
      const shared = landedTacticFor(b.before, b.san) === 'fork';

      expect(learn, `Learn says ${learn}, review says ${review} — the surfaces have diverged`)
        .toBe(review);
      expect(shared, 'both must be reading the ONE shared judgement').toBe(review);
    });
  }
});
