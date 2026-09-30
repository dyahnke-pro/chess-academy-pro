import { describe, expect, it } from 'vitest';
import { phraseFrom, type Aim } from './planArc';

describe('phraseFrom — a route said from where the piece stands now', () => {
  const aim = { id: 'route:r', kind: 'route', squares: ['e1', 'e2'], goal: 'e2', phrase: 'getting the rook to e2, by way of e1', from: 'f1' } as Aim;
  it('drops the square already reached (walk 2026-09-30, game 1)', () => {
    expect(phraseFrom(aim, 'e1')).toBe('getting the rook to e2');
  });
  it('a square off the route keeps the original phrase', () => {
    expect(phraseFrom(aim, 'a1')).toBe('getting the rook to e2, by way of e1');
  });
});

describe('aimWalkableNow — a passer must be on the board', () => {
  it('no g-pawn, no "passed pawn on the g-file" (walk 2026-09-30)', async () => {
    const { aimWalkableNow } = await import('./planArc');
    const fen = 'r1bqr1k1/p1p2p2/2pp1n1p/2b1P3/8/2N2pB1/PPP2PPP/R2Q1RK1 w - - 0 14';
    const g = { id: 'passer:g', kind: 'passer' as const, squares: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'], goal: null, phrase: 'a passed pawn on the g-file' };
    expect(aimWalkableNow(g, fen, 'b')).toBe(false);
    // A real passer on the a-file (nothing on a/b ahead of it) stays.
    const a = { ...g, id: 'passer:a', squares: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'] };
    expect(aimWalkableNow(a, '4k3/8/8/8/8/8/P7/4K3 w - - 0 1', 'w')).toBe(true);
  });
});
