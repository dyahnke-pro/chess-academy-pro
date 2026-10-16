// A central square is named with WHAT IT IS FOR, or not at all (David
// 2026-10-15: "Start replacing descriptions with teachings. That is how we keep
// narrations from running away").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { squareRole } from './squareRole';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

describe('squareRole', () => {
  it('their pawn\'s next step is a reason', () => {
    const c = new Chess('rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2');
    expect(squareRole(c, 'e5', 'w', 'their')).toBe('holding back their e-pawn');
    expect(squareRole(c, 'e5', 'w', 'your')).toBe('holding back your e-pawn');
  });
  it('a hole no pawn of theirs can reach is a reason', () => {
    // Black's c- and e-pawns are gone: d5 can never be covered by a black pawn.
    const c = new Chess('4k3/pp3ppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1');
    expect(squareRole(c, 'd5', 'w', 'their')).toBe('a square no pawn of theirs can ever cover');
  });
  it('a square with no role is not named', () => {
    // Bare kings plus pawns that cover d5 and nothing of theirs wants it.
    const c = new Chess('4k3/2p1p3/8/8/8/8/8/4K3 w - - 0 1');
    expect(squareRole(c, 'd4', 'w', 'their')).toBeNull();
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
    expect(squareRole(c, 'f7', 'w', 'their')).toBe('attacking their pawn there');
    // Your own piece on the square has no role.
    expect(squareRole(c, 'e4', 'w', 'their')).toBeNull();
  });
  it('items join with a comma before the last', () => {
    const note = buildReviewMoveTeaching('rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2', 'Nf3', true) ?? '';
    expect(note).toBe('The knight bears down on d4, holding back their d-pawn, and e5, holding back their e-pawn.');
  });
});
