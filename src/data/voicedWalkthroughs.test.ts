import { describe, it, expect } from 'vitest';
import { resolveVoicedWalkthrough, listVoicedWalkthroughs } from './voicedWalkthroughs';

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
