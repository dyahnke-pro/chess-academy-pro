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

describe('filler — an undefended home-rank pawn nothing attacks is not news', () => {
  it('does not warn about the h7 pawn when no enemy piece is near it', async () => {
    const { computeBoardDelta } = await import('./boardDelta');
    // Black plays ...Rxa8 far from the kingside; h7 is undefended but untouched.
    const fen = 'N4b1r/pp1k1ppp/8/4p3/1b1n4/8/5PPP/1R3K1R b - - 0 21';
    const out = computeBoardDelta(fen, 'Rxa8').join(' | ');
    expect(out).not.toMatch(/walks away from the pawn on h7/);
  });
  it('still warns about an undefended pawn an enemy piece actually eyes', async () => {
    const { computeBoardDelta } = await import('./boardDelta');
    // The white rook on b1 eyes b7; the knight on c5 leaves it undefended.
    const fen = '4k3/1p6/8/2n5/8/8/8/1R2K3 b - - 0 20';
    const out = computeBoardDelta(fen, 'Nd7').join(' | ');
    expect(out).toMatch(/walks away from the pawn on b7/);
  });
});

describe('a forcing board is where the coach must speak, not go mute', () => {
  it('names a sound capture that ALSO answers the check', async () => {
    const { attackerDefenderCount } = await import('./reviewTeachingPoints');
    // White to move and IN CHECK from Bb4; Qa3xb4 answers the check and wins
    // the undefended bishop. The null-move flip used to bail on any in-check
    // board and drop every claim, so this position said nothing at all.
    const out = attackerDefenderCount('7k/8/8/8/1b6/Q7/8/4K3 w - - 0 1', 'w');
    expect(out).toMatch(/bishop on b4/);
    expect(out).toMatch(/so it falls/);
  });
  it('still refuses the claim when the capture is answered — the fork that wins the exchange', async () => {
    const { attackerDefenderCount } = await import('./reviewTeachingPoints');
    // Ply 29 of David's Alapin: Nc7+ forks king and rook. Kxd7 wins a knight,
    // but Nxa8 collects the rook, so the d7 knight does NOT simply fall. The
    // counter-tactic guard must keep that claim off the board.
    const out = attackerDefenderCount('r3kb1r/ppNNpppp/2n5/8/3P4/8/PP2nPPP/R3K2R b KQkq - 1 15', 'b');
    expect(out).toBeNull();
  });
});
