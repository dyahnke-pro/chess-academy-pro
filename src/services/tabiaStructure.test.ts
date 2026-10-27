import { describe, expect, it } from 'vitest';
import { tabiaStructure } from './tabiaStructure';

// A French chain: White pawns d4+e5, Black d5+e6.
const FRENCH = 'r1bqkbnr/pp3ppp/2n1p3/2ppP3/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1';

describe('tabiaStructure', () => {
  it('names the structure and reads it from the student\'s seat', () => {
    const black = tabiaStructure(FRENCH, 'black') ?? '';
    const white = tabiaStructure(FRENCH, 'white') ?? '';
    expect(black).toContain('French-type pawn chain');
    expect(black).toMatch(/\byou\b/);
    // Same board, other seat: a different instruction, never the same words.
    expect(white).not.toBe(black);
  });

  it('is null on a board with no structure to name', () => {
    expect(tabiaStructure('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'white')).toBeNull();
  });
});
