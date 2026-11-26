import { describe, expect, it } from 'vitest';
import { clubLore, knownLead, slipChip, slipHeading, slipNoun, warningTitle } from './trapWords';

describe('trapWords — the seat decides the word', () => {
  it('"trap" is only ever the opponent\'s slip into one', () => {
    expect(slipNoun('trap', 'opponent')).toBe('trap');
    expect(slipNoun('trap', 'student')).toBe('mistake');
    expect(slipNoun('known-mistake', 'opponent')).toBe('mistake');
  });
  it('every sentence, chip and heading follows', () => {
    expect(knownLead('trap', 'opponent')).toBe('a known trap');
    expect(clubLore('trap', 'student')).toBe("That's a known mistake at club level. ");
    expect(slipChip('trap', 'opponent')).toBe('A trap for them');
    expect(slipChip('known-mistake', 'opponent')).toBe('A known mistake');
    expect(slipChip('trap', 'student')).toBe('Watch out');
    expect(slipHeading('student', 1)).toBe('Watch out');
    expect(slipHeading('opponent', 2)).toBe('Their known mistakes');
  });
  it('a warning the student must avoid is titled "Watch out: …", the word trap dropped', () => {
    expect(warningTitle('Elephant Trap', 'student')).toBe('Watch out: Elephant');
    expect(warningTitle('Elephant Trap', 'opponent')).toBe('Elephant Trap');
  });
});
