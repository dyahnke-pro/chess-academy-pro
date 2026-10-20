import { describe, it, expect } from 'vitest';
import { prizeTeaching } from './learnBoardTeaching';

// Learn tape 2026-10-07, game 1: the coach (White) gave away a bishop and then
// a queen, each with a guard, and the "something to win" lane said nothing —
// it read only pieces with no defender at all.
describe('prizeTeaching — what can be won, and the board reason why', () => {
  it('hit twice, guarded once (21.Be8: both rooks hit e8, only the queen guards it)', () => {
    const r = prizeTeaching('2krB2r/Bpp2ppp/3q4/3p4/8/2N5/PPP1Q1P1/R5K1 b - - 4 21', 'e8', 'b', 0);
    // THE SQUARE IS WITHHELD (OS-10): the opportunity is said, the find is the
    // student's — no square, no taker, nothing marked.
    expect(r?.text).toBe('One of their pieces is hit twice and guarded only once — you win it in the trades. Before you take, check what taking it allows.');
    expect(r?.text).not.toMatch(/\b[a-h][1-8]\b/);
    expect(r?.squares).toEqual([]);
  });

  it('a cheaper attacker: a guard does not save it (22.Qe4: the c3 knight guards, the d5 pawn hits)', () => {
    const r = prizeTeaching('2k1r2r/Bpp2ppp/3q4/3p4/4Q3/2N5/PPP3P1/R5K1 b - - 1 22', 'e4', 'b', 0);
    expect(r?.text).toBe('Their queen is guarded, but a cheaper piece of yours hits it — a guard does not save it. Before you take, check what taking it allows.');
    expect(r?.text).not.toMatch(/\b[a-h][1-8]\b/);
    expect(r?.squares).toEqual([]);
  });

  it('nothing guards it: the sentence the lane always said', () => {
    // their knight on e5 alone; your d6 pawn hits it
    expect(prizeTeaching('4k3/8/3p4/4n3/8/8/8/4K3 b - - 0 1', 'e5', 'w', 0)).toBeNull(); // not the student's move
    const free = prizeTeaching('4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1', 'e5', 'b', 0);
    expect(free?.text).toBe('Their knight has nothing defending it — find it, and taking it costs you nothing back. Before you take, check what taking it allows.');
    expect(free?.text).not.toMatch(/\b[a-h][1-8]\b/);
    expect(free?.squares).toEqual([]);
  });

  it('an even swap wins nothing, so nothing is said', () => {
    // their knight on e5, guarded by d4, hit only by your knight on c6
    expect(prizeTeaching('4k3/8/2n5/4N3/3P4/8/8/4K3 b - - 0 1', 'e5', 'b', 0)).toBeNull();
  });
});

describe('the free-piece fact rotates its words; the method is its own sentence (prod Learn 2026-10-16, V7)', () => {
  it('three prizes in a game are three different sentences, each ending on the same method sentence the ledger says once', () => {
    const fen = '4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1';
    const texts = [0, 1, 2].map((n) => prizeTeaching(fen, 'e5', 'b', n)?.text ?? '');
    const facts = texts.map((t) => t.replace(/ Before you take, check what taking it allows\.$/, ''));
    expect(new Set(facts).size).toBe(3);
    for (const t of texts) expect(t).toMatch(/\. Before you take, check what taking it allows\.$/);
  });
});

describe('every free-piece stem carries its own reason (the method after it is said once a game)', () => {
  it('each fact, with the method sentence taken off, still says why it is free', () => {
    const fen = '4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1';
    const facts = [0, 1, 2].map((n) => (prizeTeaching(fen, 'e5', 'b', n)?.text ?? '').replace(/ Before you take, check what taking it allows\.$/, ''));
    for (const f of facts) expect(f).toMatch(/costs you nothing back|is not taken back|nothing recaptures/);
  });
});
