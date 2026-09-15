// THE DEFECTS DAVID READ OFF A REAL PROD REVIEW TRANSCRIPT (2026-09-15: "I want
// you reading and evaluating the actual narration outputs. Fire does not equal
// green."). Each test pins one thing the coach actually said wrong on his own
// Alapin game, so the phrasing cannot silently come back.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { worstPlacedFriendlyPiece, findWorstPlacedPiece, deriveNextPlans } from './reviewTeachingPoints';

describe('seat — a clause written from the mover\'s seat flips on the opponent\'s move', () => {
  // White's rook takes an open file while the STUDENT is Black: "their position"
  // would name the student's own camp.
  const fen = 'r3k2r/pp3ppp/8/8/8/8/PP3PPP/R3K2R w KQkq - 0 12';
  it('a student move keeps "their position"', () => {
    const t = buildReviewMoveTeaching(fen, 'Rc1', true);
    if (t && /open c-file/.test(t)) expect(t).toMatch(/their position/);
  });
  it('an opponent move says "your position", never "their"', () => {
    const t = buildReviewMoveTeaching(fen, 'Rc1', false);
    if (t && /open c-file/.test(t)) {
      expect(t).toMatch(/your position/);
      expect(t).not.toMatch(/their position/);
    }
  });
});

describe('the worst-placed piece — one finder, gated', () => {
  it('stays silent while a king is in check (the plan IS the check)', () => {
    // Black to move, in check from the c7 knight forking the a8 rook.
    const inCheck = 'r3kb1r/ppNNpppp/2n5/8/3P4/8/PP2nPPP/R3K2R b KQkq - 1 15';
    const c = new Chess(inCheck);
    expect(c.isCheck()).toBe(true);
    expect(worstPlacedFriendlyPiece(inCheck, 'b')).toBeNull();
    expect(findWorstPlacedPiece(c, 'b')).toBeNull();
    expect(deriveNextPlans(inCheck, 'b').join(' ')).not.toMatch(/rescue your worst piece/);
  });
  it('never calls a knight on its own outpost the worst piece', () => {
    // Black knight on d4 anchored by the e5 pawn, no white pawn can hit d4.
    // The real board after 17...e5 in David's Alapin: the d4 knight is anchored
    // by the e5 pawn and no white pawn can ever hit d4.
    const fen = 'N4b1r/pp1k1ppp/2n5/4p3/3n4/8/PP3PPP/3RK2R w K - 0 18';
    const c = new Chess(fen);
    const worst = findWorstPlacedPiece(c, 'b');
    expect(worst?.sq).not.toBe('d4');
    expect(deriveNextPlans(fen, 'b').join(' ')).not.toMatch(/worst piece, the knight on d4/);
  });
  it('the facet and the plan agree — they share one finder', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 12';
    const c = new Chess(fen);
    const worst = findWorstPlacedPiece(c, 'w');
    const facet = worstPlacedFriendlyPiece(fen, 'w');
    const plan = deriveNextPlans(fen, 'w').find((p) => /rescue your worst piece/.test(p));
    if (worst) {
      expect(facet).toContain(worst.sq);
      expect(plan).toContain(worst.sq);
    } else {
      expect(facet).toBeNull();
      expect(plan).toBeUndefined();
    }
  });
});
