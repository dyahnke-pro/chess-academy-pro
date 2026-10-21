// A LOOSE PIECE IS TAUGHT ONCE, THEN NAMED AS A HABIT, THEN QUIET (review audit
// 2026-10-15: "…now eyes the pawn on c5 — nothing guards it" said three times;
// David: "Strengthen teaching too"). The second time names the pattern — what
// the opponent keeps doing wrong and the habit that finds it next time.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';

const ALAPIN = 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 Nc6 Nc3 Nb6 Nf3 d6 exd6 Qxd6 Be2 Bg4 Nb5 Qd7 Bf4 Nd5 Ne5 Bxe2 Qxe2 Nxf4 Nxd7 Nxe2 Nc7+ Kxd7 Nxa8 Nexd4 Rd1 e5 a3 Bc5 b4 Nxb4 axb4 Bxb4+ Kf1 Rxa8 Rb1 a5 h4 Rc8'.split(' ');

describe('loose pieces across a review', () => {
  it('the second loose piece of theirs names the habit, and no owner hears the bare formula a third time', () => {
    const c = new Chess();
    const inputs = ALAPIN.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const said = buildReviewSegmentsForTests(inputs, 'black', 'Sicilian Defense: Alapin Variation', true, 1500).map((s) => s.narration ?? '').join(' ');
    expect(said).toMatch(/that's the second time they've left a piece with no guard: after every move of theirs, look first for what it leaves loose/);
    for (const owner of ['their', 'your']) {
      const bare = said.match(new RegExp(`(?: — nothing guards ${owner} \\w+ on [a-h][1-8]| — ${owner} \\w+ on [a-h][1-8] has no guard|, and ${owner} \\w+ on [a-h][1-8] is loose)`, 'g')) ?? [];
      expect(bare.length, owner).toBeLessThanOrEqual(1);
    }
  }, 120000);
});
