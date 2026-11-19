// THE LINE A REPLY'S WHY NAMES (marks sweep 2026-11-19): "It let you play Bf6,
// which threatens Qxg7#" drew Bf6 and nothing for the mate. Qxg7# is played on
// the board after Bf6 with the same side to move again, so the reply carries
// both boards: the reply, then the move its why names.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { allowedReply } from './inaccuracyCall';

// colle800, 22…Rac8: the engine's answer is Bf6, threatening Qxg7#.
const BEFORE = 'r3r1k1/1b3ppp/pq2p3/1p1p2B1/8/2P3Q1/P4PPP/R3R1K1 b - - 2 22';

describe('allowedReply carries the line its words name', () => {
  it('Bf6, then the Qxg7# it threatens, each on its own board', () => {
    const r = allowedReply(BEFORE, 'Rac8', ['g5f6', 'g7g6', 'h2h4'], 'black');
    expect(r?.said).toMatch(/Bf6, which threatens Qxg7#/);
    expect(r?.lines?.map((l) => l.sans)).toEqual([['Bf6'], ['Qxg7#']]);
    // Each board plays its move, and the second starts where the first ends.
    const [a, b] = r?.lines ?? [];
    const c = new Chess(a.fen); c.move(a.sans[0]);
    expect(b.fen.split(' ')[0]).toBe(c.fen().split(' ')[0]);
    expect(new Chess(b.fen).move(b.sans[0]).san).toBe('Qxg7#');
  });

  it('negative control: a why that names no move after the reply carries no extra line', () => {
    const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']) c.move(s);
    // …h6 lets Ng5, which attacks f7 — a why naming no move of its own.
    const r = allowedReply(c.fen(), 'h6', ['f3g5'], 'black');
    expect(r?.lines).toBeUndefined();
  });
});
