import { describe, it, expect } from 'vitest';
import { prizeTeaching } from './learnBoardTeaching';

// Learn tape 2026-10-07, game 1: the coach (White) gave away a bishop and then
// a queen, each with a guard, and the "something to win" lane said nothing —
// it read only pieces with no defender at all.
describe('prizeTeaching — what can be won, and the board reason why', () => {
  it('hit twice, guarded once (21.Be8: both rooks hit e8, only the queen guards it)', () => {
    const r = prizeTeaching('2krB2r/Bpp2ppp/3q4/3p4/8/2N5/PPP1Q1P1/R5K1 b - - 4 21', 'e8', 'b');
    expect(r?.text).toBe('Their bishop on e8 is hit twice and guarded only once. Before you take, check what taking it allows.');
    expect(r?.squares).toEqual(expect.arrayContaining(['e8', 'd8', 'h8']));
  });

  it('a cheaper attacker: a guard does not save it (22.Qe4: the c3 knight guards, the d5 pawn hits)', () => {
    const r = prizeTeaching('2k1r2r/Bpp2ppp/3q4/3p4/4Q3/2N5/PPP3P1/R5K1 b - - 1 22', 'e4', 'b');
    expect(r?.text).toBe('Their queen on e4 is guarded, but your pawn on d5 is worth less — a guard does not save it. Before you take, check what taking it allows.');
    expect(r?.squares).toEqual(['e4', 'd5']);
  });

  it('nothing guards it: the sentence the lane always said', () => {
    // their knight on e5 alone; your d6 pawn hits it
    expect(prizeTeaching('4k3/8/3p4/4n3/8/8/8/4K3 b - - 0 1', 'e5', 'w')).toBeNull(); // not the student's move
    expect(prizeTeaching('4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1', 'e5', 'b')?.text)
      .toBe('Their knight on e5 has nothing defending it — before you take, check what taking it allows.');
  });

  it('an even swap wins nothing, so nothing is said', () => {
    // their knight on e5, guarded by d4, hit only by your knight on c6
    expect(prizeTeaching('4k3/8/2n5/4N3/3P4/8/8/4K3 b - - 0 1', 'e5', 'b')).toBeNull();
  });
});
