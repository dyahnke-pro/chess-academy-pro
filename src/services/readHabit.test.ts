// THE HABIT THAT CLOSES A BOARD READ (WO-DANYA-READS-01 group 9). A correction
// ended on its habit; a read of the board did not.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readHabit, READ_HABIT } from './methodBeat';

describe('readHabit', () => {
  it('a shot for the student is the forcing scan', () => {
    expect(readHabit({ studentShot: true, theirThreat: true, decidingMoment: true })?.habit).toBe('forcing-scan');
  });
  it('their threat, with no shot of yours, is "their move first"', () => {
    expect(readHabit({ studentShot: false, theirThreat: true, decidingMoment: true })?.habit).toBe('opponent-threat');
  });
  it('an only-move moment is "slow down"', () => {
    expect(readHabit({ studentShot: false, theirThreat: false, decidingMoment: true })?.habit).toBe('slow-down');
  });
  it('a quiet board gets no habit', () => {
    expect(readHabit({ studentShot: false, theirThreat: false, decidingMoment: false })).toBeNull();
  });
  it('each habit has one fixed wording (repetition builds the habit)', () => {
    for (const t of Object.values(READ_HABIT)) expect(t).toMatch(/^[A-Z].*[.]$/);
  });
});

describe('the board read closes on it', () => {
  it('composePositionRead ends on the habit, and never on a puzzle being solved', () => {
    const src = readFileSync('src/services/positionReadComposer.ts', 'utf8');
    expect(src).toMatch(/const habitLine = marks \? null : readHabit\(/);
    expect(src).toMatch(/\.\.\.readLines, habitLine \?\? ''\]/);
  });
});
