import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveTeaching, buildReviewConversionTeaching, nameEndgamePhase } from './reviewMoveTeaching';

/** Play a SAN list and return the FEN before the LAST move + that move. */
function beforeLast(sans: string[]): { fen: string; san: string } {
  const c = new Chess();
  for (let i = 0; i < sans.length - 1; i++) c.move(sans[i]);
  return { fen: c.fen(), san: sans[sans.length - 1] };
}

describe('buildReviewMoveTeaching (grounded per-move review why)', () => {
  it('names the center on a central pawn push', () => {
    const t = buildReviewMoveTeaching(new Chess().fen(), 'e4');
    expect(t).toMatch(/center/i);
  });

  it('calls castling king safety — never restates "castles"', () => {
    const { fen, san } = beforeLast(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/king/i);
    expect(t).not.toMatch(/^castles/i);
  });

  it('names only the central squares a knight genuinely controls (empty/enemy, not its own pawn)', () => {
    // 1.e4 e5 2.Nf3 — the knight controls e5 (enemy pawn), NOT d4 (empty here,
    // included) but never a square held by White's own pawn.
    const { fen, san } = beforeLast(['e4', 'e5', 'Nf3']);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/knight/i);
    expect(t).toMatch(/e5/); // the enemy pawn it hits
  });

  it('gives a light DEVELOPING tag on a blocked bishop — without overstating a diagonal it cannot use (R2)', () => {
    // 1.e4 d6 2.d4 g6 3.f4 e6 4.Be3 — the e3-bishop is blocked by its own d4/f4
    // pawns, so it must NOT claim a central diagonal; but R2 wants a why on
    // opening moves, so it gets the light developing tag (no false specifics).
    const { fen, san } = beforeLast(['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3']);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/develop/i);
    expect(t).not.toMatch(/rakes toward|bears down/i); // no invented central claim
  });

  it('gives a light developing tag on a quiet queen move — no invented specifics (R2)', () => {
    const { fen, san } = beforeLast(['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2']);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/develop|comes into the game/i);
  });

  it('names the created enemy weakness — a capture that isolates a pawn is a TARGET (§1)', () => {
    // White b6 captures a7 → Black is left with only b7, now isolated (no a/c
    // neighbor). The note must name the target, not just "opens a file".
    const t = buildReviewMoveTeaching('4k3/pp6/1P6/8/8/8/8/4K3 w - - 0 1', 'bxa7');
    expect(t).toMatch(/isolated/i);
    expect(t).toMatch(/target/i);
  });

  it('opens a file on a capture that leaves a half-open file behind', () => {
    // …exd6 leaves White with no e-pawn → e-file half-open.
    const line = ['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2', 'Nf6', 'Bd3', 'Na6', 'Nf3', 'c6', 'O-O', 'Nc7', 'e5', 'Nd7', 'exd6'];
    const { fen, san } = beforeLast(line);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/e-file/i);
  });
});

describe('buildReviewConversionTeaching (§7 mate patterns)', () => {
  it('names a back-rank mate — king trapped behind its own pawns', () => {
    // Rook to a8 mates the g8 king boxed by f7/g7/h7.
    const t = buildReviewConversionTeaching('6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', 'Ra8#');
    expect(t).toMatch(/back-rank/i);
  });

  it('names a smothered mate — knight, king boxed by its own pieces', () => {
    // Knight h6→f7 mates the h8 king with g8-rook + g7/h7 pawns around it.
    const t = buildReviewConversionTeaching('6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', 'Nf7#');
    expect(t).toMatch(/smothered/i);
  });

  it('stays silent on a quiet middlegame move (no per-move filler)', () => {
    // A developing rook lift, nothing forcing — silence.
    expect(buildReviewConversionTeaching('r2q1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8', 'Re1')).toBeNull();
  });
});

describe('nameEndgamePhase (§7 endgame naming)', () => {
  it('names a rook endgame when both sides have rooks and no queens', () => {
    const p = nameEndgamePhase('4k3/5ppp/8/8/8/8/5PPP/R3K2r w - - 0 1');
    expect(p).toMatch(/rook endgame/i);
  });

  it('names a queen endgame when both sides have queens', () => {
    const p = nameEndgamePhase('4k3/5ppp/8/8/8/8/5PPP/3QK2q w - - 0 1');
    expect(p).toMatch(/queen endgame/i);
  });

  it('stays silent when major material is mixed (Q vs R) — no overstatement', () => {
    expect(nameEndgamePhase('4k3/5ppp/8/8/8/8/5PPP/3QK2r w - - 0 1')).toBeNull();
  });

  it('stays silent in a full middlegame (not an endgame)', () => {
    expect(nameEndgamePhase('r2q1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8')).toBeNull();
  });
});

describe('new grounded coverage — luft + king centralization (§2)', () => {
  it('names luft when a pawn beside the castled king makes air (h3)', () => {
    // White castled kingside (Kg1), plays h3 — a breathing hole.
    const fen = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7';
    const t = buildReviewMoveTeaching(fen, 'h3');
    expect(t).toMatch(/luft|breathing hole|back-rank/i);
  });

  it('does NOT call luft before the king has castled (Kh3-air is not luft on e1)', () => {
    // King still on e1; h3 is just a pawn move, not luft.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const t = buildReviewMoveTeaching(fen, 'h3');
    expect(t == null || !/luft/i.test(t)).toBe(true);
  });

  it('names king centralization in an endgame (Ke1-e2 toward the center)', () => {
    // K+P endgame; White king steps toward the center (e2 is empty).
    const fen = '8/5k2/8/4p3/8/8/3P4/4K3 w - - 0 1';
    const t = buildReviewConversionTeaching(fen, 'Ke2');
    expect(t).toMatch(/center|fighting piece|active king/i);
  });

  it('does NOT call king centralization with queens still on (not an endgame)', () => {
    const fen = '3qk3/8/8/8/8/8/3Q4/4K3 w - - 0 1';
    const t = buildReviewConversionTeaching(fen, 'Ke2');
    expect(t == null || !/fighting piece/i.test(t)).toBe(true);
  });
});
