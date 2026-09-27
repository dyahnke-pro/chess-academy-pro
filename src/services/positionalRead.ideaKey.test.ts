// Fresh-game walk 2026-09-27 (Carlsen–Topalov, Sinquefield 2015, Black at
// 1500): "your rook on g8/g7/g6 has the half-open g-file" four times as the
// rook slid down the file, and "their passed pawn on h2/h4/h5 is the danger"
// three times as it ran. The say-once key named the SQUARE, so every step was
// news. One idea, one key.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildPositionalRead } from './positionalRead';

const GAME = 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O Nf6 Re1 a6 Bd3 b5 c4 g5 Nxg5 Ne5 Be2 bxc4 Na3 Rg8 Nxc4 Nxc4 d4 Nb6 Bh5 Nxh5 Qxh5 Rg7 Nxh7 Qd7 dxc5 dxc5 e5 Qc6 f3 Qg6 Nf6+ Kd8 Qxg6 Rxg6 Ne4 Bb7 h4 Rc8 h5 Rg8 Bd2 Nc4 Bc3 Bh6 Rad1+ Ke8 Rd3 Bf4 Nf2 Bc6 Nh3 Bg3 Re2 Bb5'.split(' ');
const fenAt = (plies: number): string => { const c = new Chess(); for (const s of GAME.slice(0, plies)) c.move(s); return c.fen(); };

describe('a positional idea is said once, wherever its piece stands', () => {
  it('across the whole game, no idea is spoken twice', () => {
    const said = new Set<string>();
    const spoken: string[] = [];
    for (let p = 2; p <= GAME.length; p += 2) {
      const o = buildPositionalRead(fenAt(p), 'black', said);
      if (o) spoken.push(o.text);
    }
    const gFile = spoken.filter((t) => /half-open g-file/.test(t));
    const hPasser = spoken.filter((t) => /passed pawn on h\d is the danger/.test(t));
    const dFile = spoken.filter((t) => /d-file/.test(t));
    expect(gFile.length).toBeLessThanOrEqual(1);
    expect(hPasser.length).toBeLessThanOrEqual(1);
    expect(dFile.length).toBeLessThanOrEqual(1);
  });

  it('a fresh ledger still reads the idea (negative control)', () => {
    const o = buildPositionalRead(fenAt(40), 'black', new Set());
    expect(o).not.toBeNull();
  });
});
