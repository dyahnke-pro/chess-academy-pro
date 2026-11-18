import { describe, it, expect } from 'vitest';
import { secondWeakness, mirroredAsymmetry } from './pawnJudgement';

// Danya bench board (2026-11-17), Black to move: their a4 pawn is weak and
// …Nc3 adds the attacker that wins it. It does not "hold for now" — the
// structure read said "Their a4 pawn is defended enough today" beside the
// priority read "aim at it: Nc3 does".
describe('second weakness', () => {
  it('never calls a pawn safe when one more attacker wins it', () => {
    const r = secondWeakness('r4rk1/1p3ppp/2q1p3/1N1pn3/P3n3/4P2P/2P1B1P1/R2Q1RK1 b - - 0 20', 'b');
    expect(r?.text ?? '').not.toMatch(/a4 pawn is defended enough|Don't rush their a4/);
  });
});

// Danya article boards 2026-11-18: "Their g6 pawn is defended enough today.
// Open a second front against d5" while a pawn stood on f7 about to queen. A
// second front needs their pieces TIED to the first pawn — as many guards as
// attackers, so none can leave — and a piece that can reach the second one.
describe('second weakness needs tied guards and a reachable second pawn', () => {
  it('silent when the first pawn is better guarded than attacked (g6, king and nothing tied)', () => {
    expect(secondWeakness('5R2/5P1k/4N1p1/3pn3/1b6/3Br3/1PK5/8 w - - 0 48', 'w')).toBeNull();
  });
  it('silent in a minor-piece ending where c4 is held twice over', () => {
    expect(secondWeakness('8/1n6/pp1kb1p1/5p1p/2PNp2P/P1K1P1P1/4BP2/8 b - - 0 50', 'b')).toBeNull();
  });
});

// Danya article boards 2026-11-18: "They can never guard d4 the same way, so
// that square stays a hole for them" said in a rook ending, with no piece of
// the student's that could ever sit there. A hole is a hole to a piece that
// can use it.
describe('the mirrored hole needs a piece that can use it', () => {
  it('silent in a rook ending: no knight or bishop of yours to sit on d4', () => {
    expect(mirroredAsymmetry('6k1/pp3Rp1/2p1p2P/4P3/8/PP6/2rr2P1/1K3R2 b - - 0 33', 'b')).toBeNull();
  });
  it('said when your knight can get to the hole: d4 for Black', () => {
    expect(mirroredAsymmetry('r1b1r1k1/1pqn1ppp/p1pb1n2/5N2/2B1P3/2N4P/PPQ2PP1/R1BR2K1 b - - 0 14', 'b')?.text)
      .toBe('Your c-pawn can still guard d5. They can never guard d4 the same way, so that square stays a hole for them.');
  });
});
