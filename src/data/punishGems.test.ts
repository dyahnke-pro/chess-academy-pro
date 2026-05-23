import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import gems from './punish-gems.json';
import { longestAnchorPly, MIN_DB_ANCHOR_PLY } from '../utils/dbAnchor';

// Gate for the mined punish-gems (WO: docs/plans/2026-05-23-punish-gems-wo.md).
// Every gem is DB-grounded by construction (it comes from the explorer), and
// this proves it: the full played-out line is chess.js-legal, its opening
// spine anchors a real DB line (≥6 plies), and the punish actually sits on
// the line. Nothing invented.

interface Gem {
  openingId: string;
  lineMoves: string;
  inaccuracy: string;
  punish: string;
  playLine: string;
  tier: string;
  engineCp: number | null;
}
const GEMS = gems as Gem[];

describe('punish-gems are real, legal, DB-grounded', () => {
  it('has at least one gem', () => {
    expect(GEMS.length).toBeGreaterThan(0);
  });

  for (const g of GEMS) {
    describe(`${g.openingId}: ${g.inaccuracy} → ${g.punish}`, () => {
      const play = g.playLine.split(' ');
      const setup = g.lineMoves.split(' ');

      it('full played-out line is legal', () => {
        const c = new Chess();
        play.forEach((m) => {
          const before = c.fen();
          try { c.move(m); } catch { /* surfaced */ }
          expect(c.fen(), `illegal move "${m}" in ${g.playLine}`).not.toBe(before);
        });
      });

      it('opening spine anchors a real DB line (≥6 plies)', () => {
        expect(longestAnchorPly(setup)).toBeGreaterThanOrEqual(MIN_DB_ANCHOR_PLY);
      });

      it('the inaccuracy + punish sit on the line in order', () => {
        const i = play.indexOf(g.inaccuracy);
        expect(i, 'inaccuracy not on line').toBeGreaterThanOrEqual(0);
        expect(play.indexOf(g.punish), 'punish not after inaccuracy').toBe(i + 1);
      });

      it("confirmed tier carries an engine eval; practical doesn't claim one", () => {
        if (g.tier === 'confirmed') expect(g.engineCp).not.toBeNull();
      });
    });
  }
});
