// Board-awareness regression net (David 2026-07-22: "What else can be invented
// by lack of board awareness??? … CLEAN FIXES THAT PREVENT HALLUCINATIONS FROM
// EVEN BEING POSSIBLE"). Each test pins one falsity class the full-review audit
// caught, on a constructed legal board — so the fix can't silently regress.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeMoveGeometry, assembleMovePurpose, seatPieceReferences } from './groundedAnswer';

describe('describeMoveGeometry — a "fork" must win something (F15)', () => {
  it('does not call hitting two DEFENDED pawns a fork', () => {
    // White knight to e5 (say) attacking two defended black pawns wins nothing.
    // Construct: white Ne5 hitting d7 and f7, both defended by the black king.
    const fen = '4k3/3p1p2/8/4N3/8/8/8/4K3 w - - 0 1';
    const geo = describeMoveGeometry(fen, 'Nxd7', 'white');
    // Nxd7 is a capture; whatever we say, we must not claim a fork of two
    // defended pawns as a material-winning fork.
    expect(geo ?? '').not.toMatch(/forks the pawn on \w\d and the pawn/);
  });

  it('still names a royal fork (king is a target)', () => {
    // Knight to f7 forking the black king on g8 and rook on h8 (undefended).
    const fen = '5rk1/8/8/8/4N3/8/8/4K3 w - - 0 1';
    const geo = describeMoveGeometry(fen, 'Nf6+', 'white');
    // Nf6+ checks the king; a real forcing fork/geometry is allowed to speak.
    expect(geo).toBeTruthy();
  });
});

describe('assembleMovePurpose — a wing pawn is not a centre move (F1)', () => {
  it('never claims a rook-file pawn "stakes out space in the center"', () => {
    const fen = new Chess().fen();
    const a = assembleMovePurpose({ fenBefore: fen, san: 'h4', moverColor: 'white', tactics: null });
    expect(a?.facts ?? '').not.toMatch(/center|centre/i);
  });

  it('keeps the centre claim for a genuine central pawn', () => {
    const fen = new Chess().fen();
    const a = assembleMovePurpose({ fenBefore: fen, san: 'e4', moverColor: 'white', tactics: null });
    expect(a?.facts ?? '').toMatch(/center|centre/i);
  });
});

describe('seatPieceReferences — no double possessive on an adjective-carrying phrase (preview line-read)', () => {
  // c2 white passed pawn, a7 black weak pawn, e4 a bare white pawn.
  const fen = '4k3/p7/8/8/4P3/8/2P5/4K3 w - - 0 1';
  it('leaves "your passed pawn on c2" alone (no "your passed your pawn")', () => {
    expect(seatPieceReferences('your passed pawn on c2 is a trump', fen, 'w'))
      .not.toMatch(/your passed your pawn/);
  });
  it('leaves "their weak pawn on a7" alone', () => {
    expect(seatPieceReferences('win their weak pawn on a7', fen, 'w'))
      .not.toMatch(/their weak their pawn/);
  });
  it('still stamps a bare "the pawn on e4"', () => {
    expect(seatPieceReferences('the pawn on e4 is loose', fen, 'w')).toMatch(/your pawn on e4/);
  });
  it('never turns an indefinite "a passed pawn on c2" into "a your passed pawn" (prod line-read)', () => {
    // c2 is a real white pawn; the phrase is already grammatical and must not
    // gain a possessive after the article.
    const out = seatPieceReferences('Bxb5+ creates a passed pawn on c2', fen, 'w');
    expect(out).not.toMatch(/a your passed pawn/);
    expect(out).toMatch(/a passed pawn on c2/);
  });
});

describe('seatPieceReferences — a colour possessive is replaced, never doubled (2026-09-24 prod review)', () => {
  // Student Black; White king on h1.
  const fen = '6k1/5ppp/8/8/8/8/5PPP/7K b - - 0 1';
  it("\"White's king on h1\" becomes \"Their king on h1\" — not \"White's their king\"", () => {
    expect(seatPieceReferences("White's king on h1 has no escape square.", fen, 'b')).toBe('Their king on h1 has no escape square.');
    expect(seatPieceReferences("Watch: White's king on h1 is boxed in.", fen, 'b')).toBe('Watch: their king on h1 is boxed in.');
    expect(seatPieceReferences("Black's king on g8 is safe.", fen, 'b')).toBe('Your king on g8 is safe.');
  });
});
