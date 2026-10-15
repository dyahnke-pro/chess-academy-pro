import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// THE STUDENT'S MOVE GETS ITS POINT (Learn audit 2026-10-15: `moveIntent` gave
// one reason in 60 turns). Its "prepares" half reads what the student would
// play if the opponent passed — that read was handed in as an empty list, so
// the half almost never fired and the move got a board description instead.
describe('Learn hands moveIntent every read it needs', () => {
  const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
  it('the student-move call reads the student moving again', () => {
    expect(src).toMatch(/const againFen = nullMoveFen\(move\.fen\);/);
    expect(src).toMatch(/passAfter: againRead\?\.topLines \?\? \[\],/);
  });
  it('when the default read finds nothing, the engine line is tried', () => {
    expect(src).toMatch(/\?\? moveIntent\(fenBefore, move\.san, intentReads, 'student', \{ prepare: 'line', prevent: 'concrete'/);
  });
});

describe('the tempting move that fails is never capped by a count (G4.5, 2026-10-15)', () => {
  it('no per-game limit; each warning is said once by its own claim', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toMatch(/REJECTED_TEMPTING_MAX_PER_GAME|rejectedTemptingCountRef/);
    expect(src).toMatch(/\[`tempting:\$\{rt\.temptingSan\}:/);
  });
});
