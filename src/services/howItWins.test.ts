import { describe, it, expect } from 'vitest';
import { howItWins } from './howItWins';

describe('how a winning position with no mate wins, as the board says', () => {
  it('a pawn ending with level material wins by queening (hard-chat audit, Lichess 0Fs8O)', () => {
    expect(howItWins('8/8/1p4pp/p2k1p2/P2P1P1P/4K1P1/8/8 w - - 0 35', 'white')).toMatch(/win comes from queening a pawn/);
  });
  it('an extra piece is material to convert', () => {
    expect(howItWins('4k3/8/8/8/8/8/3N4/4K3 w - - 0 1', 'white')).toBe('convert the material first and the mate will come');
  });
  it('level material with pieces on: the edge is in the position', () => {
    expect(howItWins('r3k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'black')).toMatch(/edge is in the position/);
  });
  it('the edge is read from the student\'s seat', () => {
    expect(howItWins('4k3/8/8/8/8/8/3n4/4K3 w - - 0 1', 'black')).toMatch(/convert the material/);
    expect(howItWins('4k3/8/8/8/8/8/3n4/4K3 w - - 0 1', 'white')).not.toMatch(/convert the material/);
  });
});
