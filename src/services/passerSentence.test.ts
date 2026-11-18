import { describe, it, expect } from 'vitest';
import { passerTrumpSentence } from './nextPlans';
import { readPosition } from './positionalRead';
import { assemblePositionAssessment } from './groundedAnswer';

// Danya article boards 2026-11-18: one fixed passer sentence for every passer
// — "a long-term trump" for a pawn one push from queening, "get a piece in
// front of it" with a king already standing there, "every trade that clears
// its path" in a pawn ending, "their passed pawn is the danger" while yours
// queens first. The sentence is now what the board makes of the passer.
describe('a passed pawn is said as what the board makes of it', () => {
  it('their passer with your king in front of it is held, not "get a piece in front of it"', () => {
    const t = passerTrumpSentence('2kr4/ppp3Pp/4RP1B/2r5/5P2/8/PP1p3P/3K4 w - - 0 30', 'd2', false);
    expect(t).toMatch(/held: your king on d1 stands in front of it/);
    expect(t).not.toMatch(/get a piece in front/);
  });
  it('a pawn one push from queening is counted, never "a long-term trump"', () => {
    const t = passerTrumpSentence('2kr4/ppp3Pp/4RP1B/2r5/5P2/8/PP1p3P/3K4 w - - 0 30', 'g7', true);
    expect(t).toMatch(/one push from queening/);
    expect(t).not.toMatch(/long-term/);
  });
  it('a pawn behind its own rook is one push away once the rook steps aside', () => {
    const t = passerTrumpSentence('5R2/5P1k/4N1p1/3pn3/1b6/3Br3/1PK5/8 w - - 0 48', 'f7', true);
    expect(t).toBe('Your passed pawn on f7 is one push from queening once your rook on f8 steps aside — every move counts now.');
  });
  it('two runners: the race is said once, from your side; theirs is not "the danger" beside it', () => {
    const fen = '8/1pRP4/p7/1kP2p2/1p6/4K2r/P7/8 w - - 0 67';
    expect(passerTrumpSentence(fen, 'd7', true)).toMatch(/^Both sides have a runner: yours on d7 is one push from queening, theirs on f5 is four/);
    expect(passerTrumpSentence(fen, 'f5', false)).toBeNull();
    const said = readPosition(fen, 'white').map((o) => o.text).join(' ');
    expect(said).not.toMatch(/f5 is the danger/);
  });
  it('a pawn ending names the king as the only stopper, no "trade"', () => {
    const t = passerTrumpSentence('8/8/3k4/1P4p1/2K1ppP1/8/5P2/8 w - - 0 59', 'b5', true);
    expect(t).not.toMatch(/trade/);
    expect(t).toMatch(/only their king can stop it/);
  });
  it('still the long-term trump where it is one: a far passer with pieces on the board', () => {
    expect(passerTrumpSentence('3r2k1/2p1nqbp/2p2pp1/2B1p3/1P2P3/4QP2/P3N1PP/1KR5 w - - 0 32', 'a2', true))
      .toBe('Your passed pawn on a2 is a long-term trump — every trade that clears its path makes it stronger.');
  });
  it('the position read never tells you to blockade a passer your piece already blockades', () => {
    const r = assemblePositionAssessment({ tempting: null, evalCp: -876, mateIn: null, studentColor: 'white', fen: '2kr4/ppp3Pp/4RP1B/2r5/5P2/8/PP1p3P/3K4 w - - 0 30', bestUci: 'e6e3' });
    expect(r?.facts ?? '').not.toMatch(/d2 is the danger/);
    expect((r?.facts ?? '').match(/d2/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
  it('their passer still at home is a long-term asset, not "the danger … before it runs"', () => {
    const t = passerTrumpSentence('3Q1bk1/pp5p/r3b1p1/8/4Nq2/5P2/PP6/K2RR3 w - - 0 30', 'h7', false);
    expect(t).toBe('Their passed pawn on h7 is a long-term trump for them — still five pushes from queening.');
  });
});
