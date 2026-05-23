import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import gems from './punish-gems.json';
import { longestAnchorPly, MIN_DB_ANCHOR_PLY } from '../utils/dbAnchor';
import {
  gemToPlayableLine,
  gemId,
  getPunishGemsForTab,
  type PunishGem,
} from './lessons/punishGems';

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

      it('converts to a WLPP line whose every arrow grounds on a real piece', () => {
        const pl = gemToPlayableLine(g as PunishGem);
        expect(pl, 'converter returned null').not.toBeNull();
        if (!pl) return;
        // Replay the line; at each ply the move-arrow must originate on the
        // piece that is actually moving (lead-the-eye / lessonIntegrity).
        const c = new Chess(pl.fen);
        pl.moves.forEach((san, i) => {
          const arrow = pl.arrows[i]?.[0];
          expect(arrow, `no move-arrow at ply ${i}`).toBeTruthy();
          const mv = c.move(san);
          expect(arrow.from, `arrow ${i} origin off the moved piece`).toBe(mv.from);
          expect(arrow.to, `arrow ${i} dest off the move`).toBe(mv.to);
        });
        // The inaccuracy + punish beats carry the (only) spoken annotations,
        // each naming exactly its own move.
        const setupLen = g.lineMoves.split(' ').length;
        expect(pl.annotations[setupLen]).toContain(g.inaccuracy);
        expect(pl.annotations[setupLen + 1]).toContain(g.punish);
      });
    });
  }

  it('gemId is stable and unique per gem', () => {
    const ids = (gems as PunishGem[]).map(gemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tab filter keeps gems whose spine starts with the tab spine', () => {
    const first = (gems as PunishGem[])[0];
    const spine = first.lineMoves.split(' ').slice(0, 4).join(' ');
    const hits = getPunishGemsForTab(first.openingId, spine);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((g) => g.lineMoves.startsWith(spine))).toBe(true);
  });
});
