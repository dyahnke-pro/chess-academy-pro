// A sacrifice is material GIVEN: the review called two forced losses "a
// stunning queen sacrifice" (David's game chesscom-142972137384, 2026-10-28).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lossBeyondBestAlternative } from './voluntaryLoss';

describe('lossBeyondBestAlternative', () => {
  it('Qxc1 — the queen is pinned to the king, every move loses it for the rook: not given', () => {
    expect(lossBeyondBestAlternative('6k1/5p2/p5pB/1q2p3/8/3n4/PP1N1PPP/2rQ2K1 w - - 1 27', 'Qxc1')).toBe(0);
  });
  it('…Qxe5 — a check that also hits the queen: the trade for the bishop is the least loss, not given', () => {
    expect(lossBeyondBestAlternative('8/6k1/p5p1/4Bp2/4p2P/5NP1/Pq3P2/7K b - - 2 36', 'Qxe5')).toBe(0);
  });
  it('a real sacrifice: the Opera game\'s Rxd7 gives the rook when quiet moves lose nothing', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8']) c.move(m);
    expect(lossBeyondBestAlternative(c.fen(), 'Rxd7')).toBeGreaterThanOrEqual(1);
  });
});
