import { describe, it, expect } from 'vitest';
import { resolveOpeningEntry } from './openingDetectionService';
import { openingAnnouncement, spokenOpeningLabel } from './openingAnnouncement';

// David 2026-11-16, his Caro with 3.f3: "It got the variation correct. Except
// most people call it 'the fantasy' variation". The DB names it after Maróczy.
describe('the Fantasy Caro-Kann is said and found by the name players use', () => {
  it('is said as the Fantasy Variation', () => {
    expect(spokenOpeningLabel('Caro-Kann Defense: Maróczy Variation')).toBe('Caro-Kann Defense: Fantasy Variation');
    expect(spokenOpeningLabel('Caro-Kann Defense: Maróczy Variation, Maróczy Gambit')).toBe('Caro-Kann Defense: Fantasy Variation, Maróczy Gambit');
    expect(openingAnnouncement({ name: 'Caro-Kann Defense: Maróczy Variation' }, null, null, 'b', null))
      .toBe('This game is the Caro-Kann Defense: Fantasy Variation.');
  });
  it('NEGATIVE CONTROL: a Maróczy line in another family keeps its own name', () => {
    expect(spokenOpeningLabel('Sicilian Defense: Maróczy Bind')).toBe('Sicilian Defense: Maróczy Bind');
  });
  it('a typed "Fantasy" asks for the 3.f3 line', () => {
    for (const ask of ['Fantasy Variation', 'fantasy caro', 'Caro-Kann Fantasy', 'the fantasy']) {
      expect(resolveOpeningEntry(ask)?.canonicalName, ask).toBe('Caro-Kann Defense: Maróczy Variation');
    }
  });
});
