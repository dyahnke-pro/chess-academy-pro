// Gate for the SEPARATE-LANE gambit punish-gems (David 2026-05-27). Mirrors the
// masterclass punishGems gate over the gambit-scoped files: every narrated gem
// is length-aligned to its playLine, surfaces, builds a playable line, and
// carries a source. Does NOT assert anything about the masterclass gems.
import { describe, it, expect } from 'vitest';
import gambitGems from '../gambit-punish-gems.json';
import { GAMBIT_GEM_NARRATION } from './gambitGemNarration';
import {
  getPunishGemsForOpening,
  isSurfaceableGem,
  gemToPlayableLine,
  gemId,
  type PunishGem,
} from './punishGems';

const GEMS = gambitGems as PunishGem[];

describe('gambit punish-gems (separate lane)', () => {
  it('every narrated gemId exists in the gambit gem file', () => {
    const ids = new Set(GEMS.map(gemId));
    for (const id of Object.keys(GAMBIT_GEM_NARRATION)) {
      expect(ids.has(id), `narration keyed to a non-existent gem: ${id}`).toBe(true);
    }
  });

  it('every narrated gem has watch/learn arrays length-matched to its playLine', () => {
    for (const gem of GEMS) {
      const n = GAMBIT_GEM_NARRATION[gemId(gem)];
      if (!n) continue;
      const plies = gem.playLine.split(/\s+/).filter(Boolean).length;
      expect(n.watch.length, `watch length for ${gemId(gem)}`).toBe(plies);
      expect(n.learn.length, `learn length for ${gemId(gem)}`).toBe(plies);
    }
  });

  it('every narrated gem carries at least one source', () => {
    for (const [id, n] of Object.entries(GAMBIT_GEM_NARRATION)) {
      expect((n.sources?.length ?? 0), `sources for ${id}`).toBeGreaterThan(0);
    }
  });

  it("King's Gambit surfaces exactly its narrated weapons and they build playable lines", () => {
    const surf = getPunishGemsForOpening('gambit-kings-gambit').filter(isSurfaceableGem);
    expect(surf.length).toBe(Object.keys(GAMBIT_GEM_NARRATION).length);
    for (const gem of surf) {
      const line = gemToPlayableLine(gem);
      expect(line, `playable line for ${gemId(gem)}`).not.toBeNull();
      // narration arrays drive annotations/learnCues — must match move count
      expect(line!.annotations.length).toBe(line!.moves.length);
      expect(line!.learnCues.length).toBe(line!.moves.length);
    }
  });
});
