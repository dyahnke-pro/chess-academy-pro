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
const run = (key: string) => { const p = at(key); return kingAttack(p.fen, p.san); };

describe('kingAttack — bringing pieces to the king', () => {
  it('exf7+: "eliminating one of the pawns that form their kingside foundation"', () => {
    expect(run('AtNlFBWBWPw:23')?.kind).toBe('strips-shelter');
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
    expect(kingAttack('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4')).toBeNull();
  });
});
