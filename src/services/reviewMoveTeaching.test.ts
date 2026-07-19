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

  it('stays SILENT on a bishop whose diagonals are blocked by its own pawns (no overstatement)', () => {
    // 1.e4 d6 2.d4 g6 3.f4 e6 4.Be3 — the e3-bishop is blocked by its own
    // d4 + f4 pawns; there is no central square it controls → silence.
    const { fen, san } = beforeLast(['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3']);
    expect(buildReviewMoveTeaching(fen, san)).toBeNull();
  });

  it('does not invent a reason for a quiet queen move', () => {
    const { fen, san } = beforeLast(['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2']);
    expect(buildReviewMoveTeaching(fen, san)).toBeNull();
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
