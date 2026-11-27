// THE HABIT THAT CLOSES A BOARD READ (WO-DANYA-READS-01 group 9). A correction
// ended on its habit; a read of the board did not.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readHabit, READ_HABIT } from './methodBeat';

describe('readHabit', () => {
  it('a shot for the student is the forcing scan', () => {
    expect(readHabit({ studentShot: true, bestForcing: true })?.habit).toBe('forcing-scan');
  });
  it('a board with no shot gets no habit line — never clock advice (David 2026-11-19: "spend your clock" removed)', () => {
    expect(readHabit({ studentShot: false, bestForcing: null })).toBeNull();
    for (const t of Object.values(READ_HABIT)) expect(t).not.toMatch(/clock|spend (your )?time|save your time/i);
  });
  it('each habit has one fixed wording (repetition builds the habit)', () => {
    for (const t of Object.values(READ_HABIT)) expect(t).toMatch(/^[A-Z].*[.]$/);
  });
});

describe('the board read closes on it', () => {
  it('composePositionRead closes its opening on the habit the read decider picks (the deep part follows)', () => {
    const src = readFileSync('src/services/positionReadComposer.ts', 'utf8');
    // One order: their threat, the standing, both plans, the habit, then the deep part.
    expect(src).toMatch(/clean\(\[noteLine, \.\.\.opening\.map\(\(f\) => f\.text\), decided\.habit\]\)/);
    // The deep part says the habit only when the opening had none.
    expect(src).toMatch(/opening\.habit \? null : decided\.habit/);
  });
});
