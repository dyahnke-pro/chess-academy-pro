import { describe, it, expect } from 'vitest';
import { splitPosition, kingCommitted } from './splitPosition';
import { Chess } from 'chess.js';

describe('split the position: opposite-side castling', () => {
  it('names the two races when the kings sit on opposite wings with queens on', () => {
    const s = splitPosition('2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1'.replace('2kr3r', '2kr3r').replace('8/8/8/8', '3q4/8/8/3Q4'), 'w');
    expect(s?.text).toMatch(/^The kings are on opposite wings, so split the board: your pawns go after their king on the queenside, theirs come at yours on the kingside/);
  });
  it('silent with both kings on one wing, or queens off (negative controls)', () => {
    expect(splitPosition('r4rk1/ppp2ppp/3q4/8/8/3Q4/PPP2PPP/R4RK1 w - - 0 1', 'w')).toBeNull();
    expect(splitPosition('2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1', 'w')).toBeNull();
  });
});

describe('their king committed, yours did not (Alekhine walk 2026-10-19)', () => {
  const at = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };
  const game = ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'f4', 'dxe5', 'fxe5', 'Nc6', 'Be3', 'Bf5', 'Nc3', 'Qd7', 'Nf3', 'Bg4', 'Be2', 'O-O-O'];
  it('the move their king castles long, your queenside pawns become attackers', () => {
    const r = kingCommitted(at(game), 'w', 'O-O-O');
    expect(r?.text).toBe('Their king went queenside, and yours is still in the centre — so the plan changes: your pawns on a2, b2 and c4 now face it. Pushed, they pry open files toward their king.');
    expect(r?.text).not.toMatch(/\b[a-h][1-8]\b.*\b(b4|b5|c5)\b/);
  });
  it('NEGATIVE CONTROLS: not their castling, or your king already castled', () => {
    expect(kingCommitted(at(game), 'w', 'Qd7')).toBeNull();
    expect(kingCommitted(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O']), 'w', 'O-O')).toBeNull();
  });
});
