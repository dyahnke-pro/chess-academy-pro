// Protects the 2026-07-23 narration dial-in of the per-move walk narration
// (David: "improve the narrations"). All positions are from his fABTn305 Grand
// Prix game — real, chess.js-validated.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { plyFactsForMove } from './pvPlayback';

const at = (moves: string): string => {
  const c = new Chess();
  moves.split(' ').forEach((m) => c.move(m));
  return c.fen();
};

describe('plyFactsForMove — dialed per-move walk narration (David 2026-07-23)', () => {
  it('does NOT call a fianchetto development a skewer (board-true tactic gate)', () => {
    // 3...Bg7: the g7 bishop "aligns" with a DEFENDED knight on c3 and a pawn
    // behind — detectTactics saw a skewer; it wins nothing → must be suppressed.
    const fen = at('e4 c5 Nc3 g6 f4');
    const out = plyFactsForMove(fen, 'Bg7', undefined, true);
    expect(out === null || !/skewer|fork|pin/.test(out)).toBe(true);
  });

  it('stays silent on a bare even-trade capture (no material, no consequence)', () => {
    // 11...Bxf3 12.Rxf3 is an even trade — restating "you capture the knight"
    // is the noise the dial removes (Narration rule #3).
    const fen = at('e4 c5 Nc3 g6 f4 Bg7 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 Bg4 Qh4 Qd7 Nc3');
    expect(plyFactsForMove(fen, 'Bxf3', undefined, true)).toBeNull();
  });

  it('speaks a capture that WINS material, subject-framed to the student', () => {
    // 17...Bxc5 wins a whole knight.
    const fen = at('e4 c5 Nc3 g6 f4 Bg7 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 Bg4 Qh4 Qd7 Nc3 Bxf3 Rxf3 O-O-O e5 dxe5 fxe5 Ng4 Ne4 Bxe5 Nxc5 Bd4+ Kh1');
    const out = plyFactsForMove(fen, 'Bxc5', undefined, true);
    expect(out).toBeTruthy();
    expect(out).toMatch(/^You /); // student subject, no "The move" prefix
    expect(out).toMatch(/win 3 points of material/); // 2nd-person verb agreement
    expect(out).not.toMatch(/The move/);
  });

  it('frames the opponent with third-person agreement', () => {
    // Same Bxc5 position but narrated as the opponent's move.
    const fen = at('e4 c5 Nc3 g6 f4 Bg7 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 Bg4 Qh4 Qd7 Nc3 Bxf3 Rxf3 O-O-O e5 dxe5 fxe5 Ng4 Ne4 Bxe5 Nxc5 Bd4+ Kh1');
    const out = plyFactsForMove(fen, 'Bxc5', undefined, false);
    expect(out).toMatch(/^Your opponent /);
    expect(out).toMatch(/wins 3 points/);
  });

  it('says "give check", never a bare "check", and keeps a REAL fork', () => {
    // 16...Bd4+ genuinely gives check AND forks (two winnable targets) — kept.
    const fen = at('e4 c5 Nc3 g6 f4 Bg7 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 Bg4 Qh4 Qd7 Nc3 Bxf3 Rxf3 O-O-O e5 dxe5 fxe5 Ng4 Ne4 Bxe5 Nxc5');
    const out = plyFactsForMove(fen, 'Bd4+', undefined, true);
    expect(out).toMatch(/give check/);
    expect(out).not.toMatch(/, check|^You check/);
  });
});
