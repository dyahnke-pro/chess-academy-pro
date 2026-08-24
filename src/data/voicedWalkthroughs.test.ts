import { describe, it, expect } from 'vitest';
import { resolveVoicedWalkthrough, listVoicedWalkthroughs, resolveVoicedMatchup, listVoicedMatchups } from './voicedWalkthroughs';

describe('resolveVoicedWalkthrough', () => {
  it('resolves a single-opening teach request to a voiced tree', () => {
    const caro = resolveVoicedWalkthrough('teach me the caro-kann');
    expect(caro).not.toBeNull();
    expect(caro?.openingName.toLowerCase()).toContain('caro');

    const italian = resolveVoicedWalkthrough('Italian Game');
    expect(italian?.openingName.toLowerCase()).toContain('italian');

    const kid = resolveVoicedWalkthrough('kings indian');
    expect(kid?.openingName.toLowerCase()).toContain('indian');
  });

  it('DECLINES an "X vs Y" matchup so the matchup planner owns it', () => {
    // A matchup is two openings colliding on one board — never one side's
    // voiced walkthrough. These must return null so planOpeningMatchup runs.
    expect(resolveVoicedWalkthrough('Italian vs French')).toBeNull();
    expect(resolveVoicedWalkthrough('show me Italian vs French')).toBeNull();
    expect(resolveVoicedWalkthrough('London versus Kings Indian')).toBeNull();
    expect(resolveVoicedWalkthrough('Ruy Lopez against the Sicilian')).toBeNull();
  });

  it('returns null for empty / no-content queries', () => {
    expect(resolveVoicedWalkthrough('')).toBeNull();
    expect(resolveVoicedWalkthrough('   ')).toBeNull();
    expect(resolveVoicedWalkthrough('zzz qqq nonsense')).toBeNull();
  });

  it('resolves a "X vs Y" matchup to a voiced walkthrough built from real videos', () => {
    // KIA vs French — we have a real video of exactly this pairing.
    const kf = resolveVoicedMatchup('KIA vs French');
    expect(kf).not.toBeNull();
    expect(kf?.openingName.toLowerCase()).toContain('indian attack');
    expect(kf?.openingName.toLowerCase()).toContain('french');
    // sides match in either order.
    expect(resolveVoicedMatchup('French vs KIA')?.openingName).toBe(kf?.openingName);
    expect(resolveVoicedMatchup("King's Indian Attack against the French")?.openingName).toBe(kf?.openingName);
  });

  it('returns null for a matchup we have no video of (caller constructs it)', () => {
    // A pairing with no real video in the corpus → null → planOpeningMatchup builds it.
    expect(resolveVoicedMatchup('Grünfeld vs Dutch')).toBeNull();
    // Not a matchup at all.
    expect(resolveVoicedMatchup('teach me the caro-kann')).toBeNull();
  });

  it('every matchup tree is a legal, note-bearing walkthrough', () => {
    for (const m of listVoicedMatchups()) {
      expect(m.matchupName).toContain(' vs ');
      expect(m.narratedNodes).toBeGreaterThan(0);
    }
  });

  it('every voiced tree in the catalogue is a legal, non-empty walkthrough', () => {
    const all = listVoicedWalkthroughs();
    expect(all.length).toBeGreaterThan(0);
    for (const w of all) {
      expect(w.openingName.length).toBeGreaterThan(2);
      expect(w.narratedNodes).toBeGreaterThan(0);
      expect(['white', 'black']).toContain(w.studentSide);
    }
  });
});
