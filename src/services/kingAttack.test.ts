// King attack (census #2) on his own games.
import { describe, it, expect } from 'vitest';
import { kingAttack } from './kingAttack';
import fixture from './__fixtures__/kingAttack-his.json';

interface P { key: string; fen: string; san: string }
const at = (key: string): P => {
  const p = (fixture as P[]).find((x) => x.key === key);
  if (!p) throw new Error(key);
  return p;
};
// The engine's lines after the move (native Stockfish, depth 16, MultiPV 3;
// UCI, their reply first): the next hop is said only where one of them plays it.
const LINES_AFTER: Record<string, string[][]> = {
  'vMY6Wr3niUg:29': [
    ['f6g5', 'h5g5', 'h6g5', 'e3e5', 'f7f6', 'e5e7', 'a8d8', 'e7e2', 'c6c5'],
    ['a8e8', 'e3g3', 'g8h8', 'f2f4', 'f6d6', 'f4f5', 'c6c5', 'f5f6', 'd6f6', 'h5d5'],
    ['f8e8', 'e3g3', 'e8e6', 'a1f1', 'a8e8', 'c3c4', 'f6d4', 'h5f5'],
  ],
  'xoS71OW-Re0:21': [
    ['f8e8', 'e4e5', 'c5b3', 'a2b3', 'd6e5', 'f4e5', 'f6d5', 'c1e3', 'd5e3', 'e1e3'],
    ['c5b3', 'a2b3', 'f8e8', 'e1g3', 'd6d5', 'e4e5', 'f6e4', 'c3e4', 'd5e4', 'f3d2'],
    ['c7c6', 'c1d2', 'd6d5', 'e4e5', 'f6e4', 'd2e3', 'c5b3', 'a2b3', 'f7f6', 'c3e4'],
  ],
};
const run = (key: string) => { const p = at(key); return kingAttack(p.fen, p.san, true, true, LINES_AFTER[key] ?? []); };

describe('kingAttack — bringing pieces to the king', () => {
  it('exf7+: "eliminating one of the pawns that form their kingside foundation"', () => {
    expect(run('AtNlFBWBWPw:23')?.kind).toBe('strips-shelter');
    // A capture leads with the move, never "Bxh6 takes away" (spoken "takes h6 takes away").
    expect(run('AtNlFBWBWPw:23')?.text ?? '').toMatch(/^With …?[A-Za-z0-9]*x[a-h][1-8][+#]?, one of the pawns in front of their king is gone/);
  });

  it('…Qh4: "you bring the queen into the attack"', () => {
    const out = run('TNaKFN65B5o:26');
    expect(out?.kind).toBe('adds-attacker');
    expect(out?.text).toMatch(/^…Qh4 brings your queen into the attack on their king/);
  });

  it('Re3: "lift the rook into the attack" — names where it goes next', () => {
    const out = run('vMY6Wr3niUg:29');
    expect(out?.kind).toBe('heads-for-king');
    expect(out?.text).toMatch(/Rg3 next brings the rook to bear/);
  });

  it('Qe1: "rerouting the queen to g3"', () => {
    expect(run('xoS71OW-Re0:21')?.text).toMatch(/^Qe1 heads for their king — Qg3 next/);
  });

  it('f6+: "pries the king\'s cover open and drags more pieces into the attack"', () => {
    expect(run('SXsVWpN8e1A:39')?.kind).toBe('opens-lines');
  });

  it('Rg3: the rook to the semi-open g-file bears on g7', () => {
    expect(run('wrk4e6bGi1Y:37')?.kind).toBe('adds-attacker');
  });

  it('says nothing on the mating move — mate has its own sentence', () => {
    expect(run('JwmxAagJ7bQ:57')).toBeNull();
  });

  it('says nothing on move one', () => {
    expect(kingAttack('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', true, true, [])).toBeNull();
  });
});

describe('removes-defender — only a piece standing by the king', () => {
  it('taking back a rook three squares from the king is a recapture, not an attack (walk 2026-09-30)', () => {
    const out = kingAttack('4r3/p1p2pk1/2pq3p/2b5/4R3/6B1/PPP2P1P/R4K2 b - - 0 21', 'Rxe4', true, true, []);
    expect(out?.kind).not.toBe('removes-defender');
  });
});

describe('heads-for-king — the hop is a move the engine plays (pass-3 false facts, class B)', () => {
  it('no line read, no hop: Re3 is not said to head for g3', () => {
    const p = at('vMY6Wr3niUg:29');
    expect(kingAttack(p.fen, p.san, true, true, [])?.kind).not.toBe('heads-for-king');
  });

  it('Petrov 7…Be7: no line plays …Bh4, so the bishop does not "head for their king"', () => {
    // 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 —
    // the old reader said "…Bh4 next brings the bishop to bear" off geometry
    // alone. The engine's lines (depth 16) go …Nf6/…O-O/…Nb4, …Nxc3/…O-O/…Bd6
    // (d6 is no square by their king), …Nxd2/…Bg4/…O-O.
    const fen = 'r1bqkb1r/ppp2ppp/2n5/3p4/3Pn3/3B1N2/PPP2PPP/RNBQ1RK1 b kq - 3 7';
    const lines = [
      ['c2c4', 'e4f6', 'h2h3', 'e8g8', 'b1c3', 'c6b4', 'd3e2', 'd5c4', 'e2c4', 'b4d5'],
      ['b1c3', 'e4c3', 'b2c3', 'e8g8', 'h2h3', 'e7d6', 'f3h2', 'f8e8', 'f2f4', 'c6a5'],
      ['b1d2', 'e4d2', 'c1d2', 'c8g4', 'c2c3', 'e8g8', 'd2f4', 'e7d6', 'f4g3', 'd8d7'],
    ];
    expect(kingAttack(fen, 'Be7', true, true, lines)).toBeNull();
    expect(kingAttack(fen, 'Be7', false, false, lines)).toBeNull();
  });

  it('the held form still speaks where the line plays the hop: "Your rook heads for their king"', () => {
    const p = at('vMY6Wr3niUg:29');
    const held = kingAttack(p.fen, p.san, false, false, LINES_AFTER['vMY6Wr3niUg:29']);
    expect(held?.text).toBe('Your rook heads for their king — one more move brings it to bear.');
    expect(held?.next).toBeUndefined();
    expect(held?.squares).not.toContain('g3');
  });
});
