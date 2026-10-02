// Teach walk 2026-09-27: "teach me the King's Indian Defense" opened the King's
// Indian ATTACK. Two causes: the teach pattern dropped "Defense" from the name,
// and "King's Indian" (apostrophe) missed the alias keyed "kings indian".
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveOpeningEntry } from './openingDetectionService';

describe('King\'s Indian Defense routes to the Defense', () => {
  it('the apostrophe spelling reaches the alias', () => {
    expect(resolveOpeningEntry("King's Indian")?.canonicalName).toBe("King's Indian Defense");
    expect(resolveOpeningEntry('Kings Indian')?.canonicalName).toBe("King's Indian Defense");
  });
  it('NEGATIVE CONTROL: the Attack still resolves to the Attack', () => {
    expect(resolveOpeningEntry("King's Indian Attack")?.canonicalName).toBe("King's Indian Attack");
  });
  it('the teach pattern keeps name words (Defense / Attack / Gambit)', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const line = src.split('\n').find((l) => l.includes('walk\\s*(?:me\\s+)?through') && l.includes('(.+?)'));
    expect(line).toBeDefined();
    const re = new RegExp(/\/(.*)\/i;\s*$/.exec(line!.trim())![1], 'i');
    expect(re.exec("teach me the King's Indian Defense")?.[2]).toBe("King's Indian Defense");
    expect(re.exec("teach me the Queen's Gambit")?.[2]).toBe("Queen's Gambit");
    expect(re.exec('teach me the Vienna opening')?.[2]).toBe('Vienna');
  });
});
