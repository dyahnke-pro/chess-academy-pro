// "Get castled" with castling out of reach (fresh-game walk 2026-09-27,
// Carlsen–Topalov): the kingside right gone (…Rg8) and the long castle blocked
// by the c8-bishop and the d8-queen.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { castleRoute, castleAdvice, detectCentralKingDanger } from './kingSafety';

const GAME = 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O Nf6 Re1 a6 Bd3 b5 c4 g5 Nxg5 Ne5 Be2 bxc4 Na3 Rg8 Nxc4 Nxc4 d4 Nb6 Bh5 Nxh5 Qxh5 Rg7 Nxh7 Qd7 dxc5 dxc5 e5'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const s of GAME.slice(0, n)) c.move(s); return c.fen(); };

describe('castling advice only when castling is within reach', () => {
  it('after 12.d4: long castle blocked twice → no "get castled"', () => {
    const route = castleRoute(fenAt(23), 'b');
    expect(route?.side).toBe('long');
    expect(route?.blockers.map((b) => b.square)).toEqual(['c8', 'd8']);
    expect(detectCentralKingDanger(fenAt(23), 'b')).toBeNull();
  });
  it('one blocker → names the piece to move', () => {
    const route = castleRoute(fenAt(33), 'b');
    expect(route?.blockers.map((b) => b.square)).toEqual(['c8']);
    expect(castleAdvice(route!)).toBe('Move your bishop on c8, then castle long before the centre opens.');
  });
  it('no rights → null (negative control)', () => {
    expect(castleRoute('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'w')).toBeNull();
  });
});
