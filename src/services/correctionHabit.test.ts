// A HABIT THE RECORD SAYS THEY HAVE IS NOT TAUGHT AGAIN (sweep 2026-11-21):
// Learn's correction habit and the practice board hardcoded the habit standing
// ({'forcing-scan': 'open'}), so "start with checks, captures and threats" was
// said in Learn on a habit Review had already stopped saying.
import { describe, it, expect } from 'vitest';
import { correctionHabit } from './methodBeat';

const base = { bestSan: null, cpLossCp: 150, ignoredThreat: false, slip: null } as const;

describe('the correction habit reads the record', () => {
  it('a move that allowed something closes on the blunder check while it is owed', () => {
    expect(correctionHabit({ ...base, allowed: true, habitNeed: {} })?.habit).toBe('blunder-check');
  });
  it('a habit the record closed is not said', () => {
    expect(correctionHabit({ ...base, allowed: true, habitNeed: { 'blunder-check': 'closed' } })).toBeNull();
    expect(correctionHabit({ ...base, allowed: false, habitNeed: { candidates: 'closed' } })).toBeNull();
  });
});
