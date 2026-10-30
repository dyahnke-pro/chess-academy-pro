// The lesson voice teaches the idea, not the square (WO-THINK-01 P4: each case
// is a real masterclass position where the written note teaches an idea the
// computed line missed). One board teacher, so Learn, Review and the lessons
// all say it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { squareRole } from './squareRole';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { deepFact } from './threeFacts';

const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const RUY_BREAK = 'rnbq1rk1/2p1bppp/p2p1n2/1p2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 w - - 1 10';
const RUY_BB7 = 'r1bq1rk1/2pnbppp/p2p1n2/1p2p3/3PP3/1BP2N1P/PP1N1PP1/R1BQR1K1 b - - 2 11';

describe('a piece only its king guards is the target (the Italian\'s f7)', () => {
  it('f7 after Bc4 is "their pawn there, which only their king guards"', () => {
    const c = new Chess(ITALIAN);
    c.move('Bc4');
    expect(squareRole(c, 'f7', 'w', 'their', 'covers')).toBe('attacking their pawn there, which only their king guards');
  });

  it('a pawn with another guard is only attacked (f7 once the rook is on f8)', () => {
    const c = new Chess('r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 4 6');
    expect(squareRole(c, 'f7', 'w', 'their', 'covers')).toBe('attacking their pawn there');
  });

  it('the Italian bishop says it', () => {
    expect(buildReviewMoveTeaching(ITALIAN, 'Bc4', true)).toMatch(/f7, attacking their pawn there, which only their king guards/);
  });
});

describe('the central break (the Ruy\'s d4)', () => {
  it('d4 strikes e5, and the c3 pawn keeps two pawns in the center', () => {
    expect(buildReviewMoveTeaching(RUY_BREAK, 'd4', true)).toBe('Strikes at their pawn on e5 — the break in the center: if they take, your c-pawn takes back and you keep two pawns in the center.');
  });

  it('said from their seat the other way round', () => {
    expect(buildReviewMoveTeaching(RUY_BREAK, 'd4', false)).toBe('Strikes at your pawn on e5 — the break in the center: if you take, their c-pawn takes back and they keep two pawns in the center.');
  });

  it('the Scotch\'s d4 is the break with no pawn to take back', () => {
    expect(buildReviewMoveTeaching(ITALIAN, 'd4', true)).toBe('Strikes at their pawn on e5 — the break in the center.');
  });

  it('a push that hits nothing stakes its claim as before', () => {
    expect(buildReviewMoveTeaching('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', true)).toBe('Stakes a claim in the center and opens lines for the pieces.');
  });
});

describe('what a fianchettoed bishop aims at (the Ruy\'s …Bb7)', () => {
  it('…Bb7 aims down the long diagonal at the pawn on e4', () => {
    expect(buildReviewMoveTeaching(RUY_BB7, 'Bb7', false)).toBe('The bishop takes aim along the long diagonal at your pawn on e4.');
  });

  it('the King\'s Indian …Bg7 aims past its own knight at the pawn on d4', () => {
    expect(buildReviewMoveTeaching('rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3', 'Bg7', false))
      .toBe('The bishop takes aim along the long diagonal at your pawn on d4, behind their knight on f6.');
  });

  it('a diagonal shut by its own pawn is waiting to open (the Ruy\'s …Bg7, the Glek\'s Bg2)', () => {
    expect(buildReviewMoveTeaching('r2qrbk1/1bpn1p1p/p2p1np1/1p2p1B1/3PP3/2P2NNP/PPB2PP1/R2QR1K1 b - - 1 15', 'Bg7', false))
      .toBe('The bishop waits behind their knight on f6 and their pawn on e5 — the long diagonal opens when those two move.');
    expect(buildReviewMoveTeaching('r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2N2NP1/PPPP1P1P/R1BQKB1R w KQkq - 1 5', 'Bg2', true))
      .toBe('The bishop waits behind your knight on f3 and your pawn on e4 — the long diagonal opens when those two move.');
  });
});

describe('the Dragon bishop aims past its own knight', () => {
  it('…Bg7 aims at the knight on d4, behind the knight on f6', () => {
    expect(buildReviewMoveTeaching('rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 1 6', 'Bg7', true))
      .toBe('The bishop takes aim along the long diagonal at their knight on d4, behind your knight on f6.');
  });
});

describe('a follow-up capture in the deep fact (P4: the Nimzo\'s …Bb4)', () => {
  const NIMZO = 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';
  it('…Bb4 … Bxc3+ Qxc3 is a trade, never "heading on to c3, where it gives check"', () => {
    expect(deepFact(NIMZO, 'Bb4', ['Qc2', 'O-O', 'a3', 'Bxc3+', 'Qxc3', 'd5'], true)).toBeNull();
  });
  it('a capture nobody takes back is said as the capture', () => {
    const fact = deepFact('6k1/8/3r4/8/4p3/8/8/1N4K1 w - - 0 1', 'Nc3', ['Kh8', 'Nxe4'], true);
    expect(fact?.text).toBe('taking their pawn on e4, where it hits their rook on d6');
  });
});
