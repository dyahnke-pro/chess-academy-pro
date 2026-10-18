import { describe, it, expect } from 'vitest';
import { playedConcept, playedConceptLine } from './playedConcept';
import { provenConcepts } from './conceptRecord';

// A knight fork of king and rook: White Nc7+ from d5.
const FORK_BEFORE = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';

describe('the concept a move just played, for either side (David 2026-10-18)', () => {
  it('names the fork when the student plays it', () => {
    const c = playedConcept(FORK_BEFORE, 'Nc7+');
    expect(c?.type).toBe('fork');
    const line = playedConceptLine(c!, 'w');
    expect(line).toBe('With Nc7+, your knight on c7 forks their rook on a8 and their king on e8.');
  });
  it('names it from the student\'s seat when THEY play it', () => {
    const c = playedConcept(FORK_BEFORE, 'Nc7+');
    expect(playedConceptLine(c!, 'b')).toBe('With their Nc7+, their knight on c7 forks your rook on a8 and your king on e8.');
  });
  it('NEGATIVE CONTROL: a quiet move plays no concept', () => {
    expect(playedConcept(FORK_BEFORE, 'Ke2')).toBeNull();
  });
  it('proven from puzzles OR from their games; grey is not proven', () => {
    expect(provenConcepts([{ theme: 'fork', accuracy: 0.9, attempts: 12 }], {})).toContain('fork');
    expect(provenConcepts([{ theme: 'fork', accuracy: 0.9, attempts: 4 }], {})).not.toContain('fork');
    expect(provenConcepts([], { pin: 3 })).toContain('pin');
    expect(provenConcepts([], {}).size).toBe(0);
  });
});
