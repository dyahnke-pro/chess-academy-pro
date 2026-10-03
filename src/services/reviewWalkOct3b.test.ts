import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectConcept, type ConceptCtx } from './reviewConcepts';

// Review walk oct3b, game 2 (White student): e4 c5 Bc4 e6 e5 Nc6 Qe2 a6 b3 Nd4
// Qd3 h6 c3 Nc6 Qf3 Nxe5 Qe2 Bd6 Nf3 Ng6 g3 Nf6 O-O b5 Bd3 Bb7 Bxg6 fxg6
const SANS = 'e4 c5 Bc4 e6 e5 Nc6 Qe2 a6 b3 Nd4 Qd3 h6 c3 Nc6 Qf3 Nxe5 Qe2 Bd6 Nf3 Ng6 g3 Nf6 O-O b5 Bd3 Bb7 Bxg6 fxg6'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const s of SANS.slice(0, n)) c.move(s); return c.fen(); };
const at = (ply: number, evalBefore: number, evalAfter: number): ConceptCtx => ({
  fenBefore: fenAt(ply - 1), fenAfter: fenAt(ply), san: SANS[ply - 1],
  moverColor: ply % 2 === 1 ? 'w' : 'b', evalBefore, evalAfter, studentColor: 'w',
  priorMove: { fenBefore: fenAt(ply - 2), san: SANS[ply - 2] },
});

describe('a pawn grab is not "simplifying" (ply 16, …Nxe5)', () => {
  it('…Nxe5 takes a loose pawn and hits the queen — nothing is traded', () => {
    expect(detectConcept(at(16, -200, -230))?.concept).not.toBe('simplify-when-ahead');
  });
  it('POSITIVE CONTROL: a recapture that finishes an even trade still is one', () => {
    // 1.e4 d5 2.exd5 Qxd5 — …Qxd5 takes back the pawn: an even trade.
    const s = 'e4 d5 exd5 Qxd5'.split(' ');
    const f = (n: number): string => { const c = new Chess(); for (const x of s.slice(0, n)) c.move(x); return c.fen(); };
    const beat = detectConcept({ fenBefore: f(3), fenAfter: f(4), san: 'Qxd5', moverColor: 'b', evalBefore: -300, evalAfter: -290, studentColor: 'b', priorMove: { fenBefore: f(2), san: 'exd5' } });
    expect(beat?.concept).toBe('simplify-when-ahead');
  });
});

describe('the bishop pair is said as it stands (ply 28, …fxg6)', () => {
  it('never "against your single minor" with a bishop and two knights on the other side', () => {
    const beat = detectConcept(at(28, -150, -160));
    expect(beat?.text ?? '').not.toMatch(/single minor/);
    if (beat?.concept === 'two-bishops') expect(beat.text).toMatch(/while you have one/);
  });
});
