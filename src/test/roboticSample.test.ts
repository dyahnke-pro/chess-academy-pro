import { describe, it, expect } from 'vitest';
import { sampleOf } from '../../scripts/voice/robotic-marks.mjs';

// The voice count printed each sample as text.slice(0, 220), so a full line
// read as "…Bxh7+? Then" — a sentence the producer never cut.
describe('a robotic-count sample never ends mid-sentence', () => {
  const line = 'You go Qg3, which saves the queen from their knight on e5, and attacks that knight from g3. Their resource is the bishop on g5: from h4 it hits your queen on g3. But it is dead: after Bxg5 it no longer works. Bxh7+? Then they play Nxh7, and the bishop is lost.';
  it('cuts at a sentence end and marks that the line goes on', () => {
    const s = sampleOf(line);
    expect(s.length).toBeLessThanOrEqual(230);
    expect(s.endsWith('[…]')).toBe(true);
    expect(s).not.toMatch(/Then \[…\]$|Then$/);
    expect(s.replace(/ \[…\]$/, '')).toMatch(/[.!?]$/);
  });
  it('a short line is shown whole', () => {
    expect(sampleOf('Your knight is loose.')).toBe('Your knight is loose.');
  });
});
