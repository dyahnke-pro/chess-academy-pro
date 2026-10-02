import { describe, it, expect } from 'vitest';
import { familyLabel, groupByOpeningFamily, OTHER_FAMILY } from './openingBlunderService';

describe('opening trap groups read as opening names (OT1)', () => {
  it('a punctuation-stripped Lichess tag gets the DB name back', () => {
    expect(familyLabel('kings_pawn_game')).toBe("King's Pawn Game");
    expect(familyLabel('sicilian_defense')).toBe('Sicilian Defense');
  });

  it('the untagged bucket is named and sorts last', () => {
    expect(familyLabel(OTHER_FAMILY)).toBe('Other openings');
    const fams = groupByOpeningFamily();
    const i = fams.findIndex((f) => f.family === OTHER_FAMILY);
    if (i >= 0) expect(i).toBe(fams.length - 1);
    expect(fams.every((f) => /^[A-Z]/.test(f.label))).toBe(true);
  });
});
