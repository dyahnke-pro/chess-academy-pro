// "You've got a skewer coming, 3 deep: …Nxh5, Qxh5, …Rg6" (fresh-game walk
// 2026-09-27, Carlsen–Topalov): the rook faced a queen-defended knight with a
// pawn on g2 behind it. Nothing had to move — not a skewer.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { scanUpcomingTactics } from './tacticClassifier';

const c = new Chess();
for (const s of 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O Nf6 Re1 a6 Bd3 b5 c4 g5 Nxg5 Ne5 Be2 bxc4 Na3 Rg8 Nxc4 Nxc4 d4 Nb6 Bh5'.split(' ')) c.move(s);

describe('a skewer forces the front piece to move', () => {
  it('rook facing a defended knight with a pawn behind is not a skewer', () => {
    const up = scanUpcomingTactics(c.fen(), [{ moves: ['b6d7', 'h5g4', 'g8g6'], evaluation: 0, mate: null }], 'b', 4);
    void up;
    const line = scanUpcomingTactics(c.fen(), [{ moves: ['f6h5', 'd1h5', 'g8g6'], evaluation: 0, mate: null }], 'b', 4);
    expect(line.filter((u) => u.pattern.type === 'skewer')).toEqual([]);
  });
  it('a real skewer (rook checks the king, rook behind undefended) still reads (negative control)', () => {
    // Black king e8, black rook a8 undefended; White rook to e-file? Use a rank skewer:
    // White rook moves to h8 checking the king on d8 with the a8 rook behind.
    const fen = 'r2k4/8/8/8/8/8/8/4K2R w - - 0 1';
    const line = scanUpcomingTactics(fen, [{ moves: ['h1h8', 'd8d7'], evaluation: 0, mate: null }], 'w', 4);
    expect(line.some((u) => u.pattern.type === 'skewer')).toBe(true);
  });
});
