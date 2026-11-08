// A central square is named with WHAT IT IS FOR, or not at all (David
// 2026-10-15: "Start replacing descriptions with teachings. That is how we keep
// narrations from running away").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { squareRole, namedSquares } from './squareRole';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

describe('squareRole', () => {
  it('their pawn\'s next step is a reason', () => {
    const c = new Chess('rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2');
    expect(squareRole(c, 'e5', 'w', 'their', 'covers')).toBe('holding back their e-pawn');
    expect(squareRole(c, 'e5', 'w', 'your', 'covers')).toBe('holding back your e-pawn');
  });
  it('a hole no pawn of theirs can reach is a reason', () => {
    // Black's c- and e-pawns are gone: d5 can never be covered by a black pawn.
    const c = new Chess('4k3/pp3ppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1');
    expect(squareRole(c, 'd5', 'w', 'their', 'covers')).toBe('a square no pawn of theirs can cover');
  });
  it('a square with no role is not named', () => {
    // Bare kings plus pawns that cover d5 and nothing of theirs wants it.
    const c = new Chess('4k3/2p1p3/8/8/8/8/8/4K3 w - - 0 1');
    expect(squareRole(c, 'd4', 'w', 'their', 'covers')).toBeNull();
  });
});

describe('the center fight teaches a reason or stays out of the line', () => {
  it('Nf3 against …d5 names e5 WITH its reason', () => {
    const note = buildReviewMoveTeaching('rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2', 'Nf3', true) ?? '';
    expect(note).not.toMatch(/fighting for the center\./);
    expect(note).toMatch(/e5, holding back their e-pawn/);
  });
});

describe('a role is never claimed for an occupied or back-rank square', () => {
  it('f7 with their pawn on it is not a hole — the pawn is what is attacked (Bc4 audit 2026-10-15)', () => {
    const c = new Chess('rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2');
    // Only their king guards it — the soft square, said as the target it is.
    expect(squareRole(c, 'f7', 'w', 'their', 'covers')).toBe('attacking their pawn there, which only their king guards');
    // Your own piece on the square has no role.
    expect(squareRole(c, 'e4', 'w', 'their', 'covers')).toBeNull();
  });
  it('items join with a comma before the last', () => {
    const note = buildReviewMoveTeaching('rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2', 'Nf3', true) ?? '';
    expect(note).toBe('Your knight bears down on d4, holding back their d-pawn, and e5, holding back their e-pawn.');
  });
});

describe('a piece standing on its own pawn\'s next square blocks the push (prod walk 2026-10-19)', () => {
  it('g6 covered backs …g6; a bishop standing on g6 does not', () => {
    const c = new Chess('2kr3r/pp3ppp/2n1pn2/q4b2/2BP4/2N2N2/PPPB1PPP/R2QK2R b KQ - 3 9');
    expect(squareRole(c, 'g6', 'b', 'their', 'covers')).toMatch(/backing/);
    expect(squareRole(c, 'g6', 'b', 'their', 'stands') ?? '').not.toMatch(/backing/);
  });
});


// A HIT IS A THREAT, OR IT IS NOT A REASON (David 2026-11-05: "I don't want
// 'it attacks x'"). The Colle read, 5…Nc6: "Their knight joins the fight for
// d4, attacking your pawn there" — the d4 pawn three pieces guard against two.
describe('an attacked piece is a reason only when the attack is a threat', () => {
  const colle = (): Chess => {
    const c = new Chess();
    for (const m of ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'c5', 'c3', 'Nc6']) c.move(m);
    return c;
  };
  it('a guarded pawn the move only adds to is not "attacked"', () => {
    expect(squareRole(colle(), 'd4', 'b', 'your', 'covers')).toBeNull();
    expect(namedSquares(colle(), ['d4', 'e5'], 'b', 'your')).toBe("e5, backing their e-pawn's push there");
  });
  it('an unguarded piece, or one worth more than its attacker, still is', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3']) c.move(m);
    expect(squareRole(c, 'e5', 'w', 'their', 'covers')).toBe('attacking their pawn there');
    const k = new Chess('4k3/8/4p3/3r4/8/2N5/8/4K3 b - - 0 1');
    expect(squareRole(k, 'd5', 'w', 'their', 'covers')).toBe('attacking their rook there');
  });
});
