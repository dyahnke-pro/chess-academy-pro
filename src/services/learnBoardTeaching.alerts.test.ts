// The three reads Learn used to compute inside the page (P1-6f), each with a
// position that fires it and one that must not.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { cheaperAttackerHit, gambitPoint, kingPawnUnderFire } from './learnBoardTeaching';

function fensAfter(sans: readonly string[]): string[] {
  const c = new Chess();
  const out = [c.fen()];
  for (const s of sans) { c.move(s); out.push(c.fen()); }
  return out;
}

describe('kingPawnUnderFire', () => {
  it('names the pawn beside the king that queen and knight win', () => {
    expect(kingPawnUnderFire('6k1/8/8/8/6nq/8/5PPP/6K1 w - - 0 1', 'w')).toEqual({ pawn: 'f2', king: 'g1', attackers: 2 });
  });
  it('is silent when nothing hits the king\'s pawns', () => {
    expect(kingPawnUnderFire('6k1/8/8/8/8/8/5PPP/6K1 w - - 0 1', 'w')).toBeNull();
  });
});

describe('cheaperAttackerHit', () => {
  it('names a knight a defended pawn attacks', () => {
    expect(cheaperAttackerHit('4k3/8/5p2/4p3/3N4/8/8/4K3 w - - 0 1', 'w')).toEqual({ sq: 'd4', piece: 'n', by: 'p', bySq: 'e5' });
  });
  it('is silent when taking the attacker answers it', () => {
    // The pawn on b5 hits the bishop, and axb5 wins it.
    expect(cheaperAttackerHit('4k3/8/8/1p6/P1B5/8/8/4K3 w - - 0 1', 'w')).toBeNull();
  });
});

describe('gambitPoint', () => {
  it('says what a piece they took and cannot be won back bought', () => {
    const f = fensAfter(['e4', 'a6', 'Bb5', 'axb5']);
    expect(gambitPoint({ fenBefore: f[2], fenAfterMove: f[3], fenAfterReply: f[4], san: 'Bb5', to: 'b5', student: 'w' }))
      .toBe('Bb5 was a gambit — they took the bishop, and the engine rates the trade of it for time as sound.');
  });
  it('is no gambit when the piece is won straight back (a trade)', () => {
    const f = fensAfter(['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3']);
    expect(gambitPoint({ fenBefore: f[4], fenAfterMove: f[5], fenAfterReply: f[6], san: 'c3', to: 'c3', student: 'w' })).toBeNull();
  });
});
