// WHY HAS THE GEM LANE NEVER FIRED? Measure, do not guess (PLAN.md #68).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { getAllPunishGems, isSurfaceableGem, isWeaponGem, gemId } from '../data/lessons/punishGems';
import { findLivePunishment } from './gemCrushLines';

describe('gem lane probe', () => {
  it('counts the pool at each filter and proves the lookup on a real gem', () => {
    const all = getAllPunishGems();
    const weapon = all.filter(isWeaponGem);
    const surfaceable = all.filter(isSurfaceableGem);

    // How deep is a gem's spine? A live game only reaches it if the whole
    // spine is played — the deeper it is, the rarer that is.
    const depths = surfaceable.map((g) => g.lineMoves.trim().split(/\s+/).filter(Boolean).length).sort((a, b) => a - b);
    const pct = (p: number): number => depths[Math.floor(depths.length * p)] ?? 0;

    // THE LOOKUP ITSELF, driven exactly the way CoachTeachPage drives it:
    // findLivePunishment(null, fullHistoryFromMoveOne).
    let exactWorks = 0;
    const failures: string[] = [];
    for (const g of surfaceable.slice(0, 60)) {
      const sans = g.lineMoves.trim().split(/\s+/).filter(Boolean);
      const c = new Chess();
      let legal = true;
      for (const s of sans) { try { if (!c.move(s)) { legal = false; break; } } catch { legal = false; break; } }
      if (!legal) { failures.push(`${gemId(g)}: spine illegal`); continue; }
      let inacc = false;
      try { inacc = Boolean(c.move(g.inaccuracy)); } catch { inacc = false; }
      if (!inacc) { failures.push(`${gemId(g)}: inaccuracy ${g.inaccuracy} illegal from its own spine`); continue; }
      const history = [...sans, g.inaccuracy];
      // Driven exactly as the surface drives it: the FULL history from move
      // one, no opening id. Both arms of the lookup are exercised by this —
      // the exact move-order match and, for a spine reached another way, the
      // position index.
      const hit = findLivePunishment(null, history);
      if (hit) exactWorks += 1; else failures.push(`${gemId(g)}: NO HIT on its own line`);
    }

    const report = {
      gemsTotal: all.length,
      weaponTier: weapon.length,
      surfaceable: surfaceable.length,
      spinePlies: { min: depths[0], p25: pct(0.25), median: pct(0.5), p75: pct(0.75), max: depths[depths.length - 1] },
      lookupProbe: { tried: Math.min(60, surfaceable.length), hits: exactWorks },
      firstFailures: failures.slice(0, 8),
      openingsCovered: [...new Set(surfaceable.map((g) => g.openingId))].length,
    };
    console.log(JSON.stringify(report, null, 2));
    expect(all.length).toBeGreaterThan(0);
  });
});
