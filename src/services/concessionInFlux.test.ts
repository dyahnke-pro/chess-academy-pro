// A concession is read on a settled structure, never mid-exchange (Learn walk
// g9, 2026-09-27, ply 26: …cxd5 "splinters your structure — a new isolated
// pawn on d5", then exd5 took it and the isolani was White's).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeConcessions } from './reviewTeachingPoints';

const G9 = 'd4 d5 c4 Bf5 Nc3 dxc4 e4 Be6 d5 Bd7 Bxc4 c6 Bf4 e5 Bxe5 Ne7 Bf4 Qb6 b3 Na6 Be3 Qa5 Bd2 Nb4 a3'.split(' ');

describe('describeConcessions — never mid-exchange', () => {
  it('a recapturable capture names no concession', () => {
    const c = new Chess(); for (const s of G9.slice(0, 25)) c.move(s);
    expect(describeConcessions(c.fen(), 'cxd5', true)).toBeNull();
  });
  it('NEGATIVE CONTROL: a quiet move that thins the king cover still names it', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.O-O Be7 5.g4 — the g-pawn leaves the castled king.
    const c = new Chess(); for (const s of 'e4 e5 Nf3 Nc6 Bc4 Nf6 O-O Be7'.split(' ')) c.move(s);
    expect(describeConcessions(c.fen(), 'g4', true)).toMatch(/king's pawn cover thinned/);
  });
});
