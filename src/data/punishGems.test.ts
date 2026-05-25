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
import { GEM_NARRATION } from './lessons/punishGemNarration';
import openingManifests from './opening-manifests.json';
import gemNarrationBaseline from './punishGemNarration.baseline.json';
import { sourcesAreValid } from './narrationSources';

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
        // Positional, not indexOf — a SAN like O-O can appear twice (both
        // sides castle), so the inaccuracy lives at exactly ply = |spine|.
        const i = setup.length;
        expect(play[i], 'inaccuracy not at the spine boundary').toBe(g.inaccuracy);
        expect(play[i + 1], 'punish not immediately after the inaccuracy').toBe(g.punish);
      });

      it('engine tiers carry a qualifying eval (confirmed ≥ +1.0, positional ≥ +0.5)', () => {
        if (g.tier === 'confirmed') {
          expect(g.engineCp, 'confirmed needs an eval').not.toBeNull();
          expect(g.engineCp as number, 'confirmed must be ≥ +1.0 (100cp)').toBeGreaterThanOrEqual(100);
        }
        if (g.tier === 'positional') {
          expect(g.engineCp, 'positional needs an eval').not.toBeNull();
          expect(g.engineCp as number, 'positional must be ≥ +0.5 (50cp)').toBeGreaterThanOrEqual(50);
          expect(g.engineCp as number, 'positional is below the +1.0 crush bar').toBeLessThan(100);
        }
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
        // The inaccuracy + punish beats must name their move — but hand-
        // authored prose may write "Qxe5 — check!" rather than the literal
        // "Qxe5+", so compare without check/mate symbols.
        const bare = (san: string): string => san.replace(/[+#]/g, '');
        expect(pl.annotations[setupLen]).toContain(bare(g.inaccuracy));
        expect(pl.annotations[setupLen + 1]).toContain(bare(g.punish));
      });
    });
  }

  // Hand-authored narration MUST stay aligned to the moves — a watch/learn
  // array shorter or longer than the playLine would slide a cue onto the wrong
  // move (David's exact worry). Every authored gemId must also be a real gem.
  describe('hand-authored narration is aligned to its gem', () => {
    const byId = new Map((gems as PunishGem[]).map((g) => [gemId(g), g]));
    for (const [id, narr] of Object.entries(GEM_NARRATION)) {
      it(`${id}: watch/learn arrays match the playLine length`, () => {
        const g = byId.get(id);
        expect(g, `narration for unknown gemId "${id}"`).toBeTruthy();
        if (!g) return;
        const plies = g.playLine.split(' ').length;
        expect(narr.watch.length, 'watch array length ≠ playLine plies').toBe(plies);
        expect(narr.learn.length, 'learn array length ≠ playLine plies').toBe(plies);
      });
    }
  });

  // COVERAGE GATE (David 2026-05-25): every masterclass gem MUST be hand-
  // narrated (full watch + short learn). Un-narrated gems don't surface, so the
  // app is safe — but they're an invisible backlog (Italian/Scotch/King's Gambit
  // had dozens mined-but-dark). This gate forces a narration entry for every
  // masterclass gem; the baseline holds the current backlog and only SHRINKS, so
  // a NEW masterclass opening can't ship gems without authoring their narration.
  describe('every masterclass gem is hand-narrated (coverage)', () => {
    const baseline = new Set((gemNarrationBaseline as { keys: string[] }).keys);
    const masterclass = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
    const missing = (gems as PunishGem[])
      .filter((g) => masterclass.has(g.openingId))
      .map(gemId)
      .filter((id) => !(id in GEM_NARRATION));

    it('introduces NO un-narrated masterclass gem beyond the baseline', () => {
      const novel = missing.filter((id) => !baseline.has(id));
      expect(novel, `New masterclass gems have no hand-narration (watch + learn). Author an entry in punishGemNarration.ts, or — only if deferred — add to punishGemNarration.baseline.json:\n${novel.join('\n')}`).toEqual([]);
    });

    // The coverage backlog can only SHRINK — a hard ceiling on the baseline
    // size blocks a future build from adding a new un-narrated gem to the
    // baseline to bypass the rule. All 134 gems narrated
    // 2026-05-25; never raise this.
    const GEM_COVERAGE_CEILING = 0;
    it(`coverage baseline never grows (ceiling ${GEM_COVERAGE_CEILING})`, () => {
      expect(baseline.size, 'punishGemNarration.baseline.json grew — narrate the gem instead of baselining it').toBeLessThanOrEqual(GEM_COVERAGE_CEILING);
    });
  });

  // NON-NEGOTIABLE INDEPENDENT-VERIFICATION GATE (David 2026-05-25: "use
  // independent verification — books, online — that's the gate"). Every
  // narrated masterclass gem MUST carry a `sources` ref that resolves (a
  // book/concept passage, or a reputable chess URL). NO baseline escape — all
  // 126 narrated gems were sourced 2026-05-25; a new one without a source fails.
  describe('narrated masterclass gems cite an independent verification source', () => {
    const masterclass = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
    const unverified = (gems as PunishGem[])
      .filter((g) => masterclass.has(g.openingId) && gemId(g) in GEM_NARRATION)
      .filter((g) => !sourcesAreValid(GEM_NARRATION[gemId(g)].sources))
      .map(gemId);

    it('EVERY narrated masterclass gem has a resolvable source — no exceptions', () => {
      expect(unverified, `Narrated masterclass gems missing a resolvable verification source (sources: ["book:<id>" | "concept:<id>" | reputable https URL]):\n${unverified.join('\n')}`).toEqual([]);
    });
  });

  it('gemId is stable and unique per gem', () => {
    const ids = (gems as PunishGem[]).map(gemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tab filter surfaces a gem when its spine is a prefix of the tab line', () => {
    const first = (gems as PunishGem[])[0];
    // A tab line is the curated (longer) variation; a gem sits on its early
    // part. Extend the gem's own line to simulate a deeper variation tab.
    const tabLine = `${first.lineMoves} Nf3 e6 Be2 c5`;
    const hits = getPunishGemsForTab(first.openingId, tabLine);
    expect(hits.some((g) => g.lineMoves === first.lineMoves)).toBe(true);
    // A tab that diverges before the gem's line must NOT surface it.
    const diverged = 'e4 c6 d4 d5 exd5 cxd5 Bd3';
    expect(getPunishGemsForTab(first.openingId, diverged).some((g) => g.lineMoves === first.lineMoves)).toBe(false);
  });
});
