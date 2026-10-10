import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { discoveryRevealed } from './lineGeometry';
import { legacyTacticGeometry } from './missedTacticService';

// Black queen d8, pawn d7, a white knight on d4 down the file.
const FEN = '3qk3/3p4/8/8/3N4/8/8/4K3 b - - 0 1';

describe('lineGeometry — the one discovery test', () => {
  it('a pawn that steps ALONG its line still blocks it: nothing is discovered', () => {
    const c = new Chess(FEN); c.move('d6');
    expect(discoveryRevealed(c, 'd7', 'd6', 'b')).toBeNull();
    // The missed-tactic copy read straight through d6 and called it a
    // discovered attack on the knight (census 2026-10-10).
    expect(legacyTacticGeometry(FEN, 'd7d6')).not.toBe('discovered_attack');
  });
  it('a pawn that steps OFF the line uncovers the queen on the knight', () => {
    const fen = '3qk3/3p4/4B3/8/3N4/8/8/4K3 b - - 0 1';
    const c = new Chess(fen); c.move('dxe6');
    const d = discoveryRevealed(c, 'd7', 'e6', 'b');
    expect(d?.behind.square).toBe('d8');
    expect(d?.target.square).toBe('d4');
  });
});
