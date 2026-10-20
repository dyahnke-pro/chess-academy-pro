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
    const r = kingCommitted(at(game), 'w');
    expect(r?.text).toBe('Their king went queenside, and yours is still in the centre — so the plan changes: your pawns on a2, b2 and c4 now face it. Pushed, they pry open files toward their king.');
    expect(r?.text).not.toMatch(/\b[a-h][1-8]\b.*\b(b4|b5|c5)\b/);
  });
  it('still true a move later, so a held turn does not lose it (prod walk 2026-10-19)', () => {
    expect(kingCommitted(at([...game, 'c5', 'Nd5']), 'w')?.text).toMatch(/^Their king went queenside/);
  });
  it('NEGATIVE CONTROLS: their king not castled, or yours already castled', () => {
    expect(kingCommitted(at(game.slice(0, -1)), 'w')).toBeNull();
    expect(kingCommitted(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O']), 'w')).toBeNull();
  });
});

describe('the storm plan reads where your own king is going (OS-11 item 6 b)', () => {
  it('g3 after 7…O-O: your route is short (blocker g1), so no "push f2, g2, h2"', () => {
    expect(kingCommitted('r1bq1rk1/1ppp1ppp/p2b1n2/n3p3/2P5/NP2P3/PB1PBPPP/R2QK1NR w KQ - 1 8', 'w')).toBeNull();
  });
  it('g4 after 5.O-O: your route is short (blocker f8), so no "push f7, g7, h7"', () => {
    expect(kingCommitted('r1b1kb1r/ppppnppp/2n2q2/1B2p3/4P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 7 5', 'b')).toBeNull();
  });
});
