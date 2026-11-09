// A RUN OF CAPTURES ON ONE SQUARE (2026-10-28). Every reader looked one move
// back, so on the a3 Sicilian's …Nc6 branch (e4 c5 a3 Nc6 b4 cxb4 axb4 Nxb4)
// the lesson said "cxb4, winning the pawn" with axb4 coming next, and
// "Nxb4, taking back the pawn" on the move that wins it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { NO_PREV_CAPTURE, afterCapture, captureRunOfPgn, takesBack } from './captureRun';
import { captureContextsAlong, computePlyFacts } from './pvPlayback';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { lastCaptureOf } from './groundedAnswer';

const LINE = ['e4', 'c5', 'a3', 'Nc6', 'b4', 'cxb4', 'axb4', 'Nxb4'];

function boards(sans: string[]): string[] {
  const c = new Chess();
  const out = [c.fen()];
  for (const s of sans) { c.move(s); out.push(c.fen()); }
  return out;
}

describe('the capture run', () => {
  it('threads the net on the square', () => {
    const runs = captureContextsAlong(new Chess().fen(), LINE);
    expect(runs[6]).toEqual({ square: 'b4', capturedValue: 1, net: 1 }); // after cxb4
    expect(runs[7]).toEqual({ square: 'b4', capturedValue: 1, net: 0 }); // after axb4
    expect(runs[8]).toEqual({ square: 'b4', capturedValue: 1, net: 1 }); // after Nxb4
    expect(afterCapture(runs[8], { to: 'e4' })).toEqual(NO_PREV_CAPTURE);
  });

  it('reads …Nxb4 as the pawn won, and axb4 as a take-back that loses it again', () => {
    const f = boards(LINE);
    const runs = captureContextsAlong(f[0], LINE);
    const facts = (i: number) => {
      const m = new Chess(f[i]).move(LINE[i]);
      return computePlyFacts(f[i], f[i + 1], { captured: m.captured, san: m.san, color: m.color }, runs[i]);
    };
    expect(facts(5).materialGained).toBe(1);   // cxb4: the trade on b4 nets a pawn
    expect(facts(6).materialGained).toBe(-1);  // axb4: takes back into …Nxb4
    expect(facts(7).materialGained).toBe(1);   // Nxb4: the pawn is won
  });

  it('the lesson says the trade, never "winning the pawn" with axb4 to come', () => {
    const f = boards(LINE);
    const runs = captureContextsAlong(f[0], LINE);
    const say = (i: number, student: boolean) => buildReviewMoveBriefing({ line: null, theirLast: null, fenBefore: f[i], san: LINE[i], prev: runs[i], phrases: null, moverIsStudent: student }) ?? '';
    expect(say(5, true)).toContain('winning a pawn — if axb4, …Nxb4');
    // The capture said once — after its SAN only what it leads to (David 2026-10-30).
    expect(say(6, false)).toContain('keeping the trade going, with …Nxb4 next');
    expect(say(7, true)).toContain('winning a pawn');
    expect(say(7, true)).not.toContain('taking back');
  });

  it('an even trade is still a take-back', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'];
    const f = boards(sans);
    const runs = captureContextsAlong(f[0], sans);
    expect(buildReviewMoveBriefing({ line: null, theirLast: null, fenBefore: f[7], san: 'dxc6', prev: runs[7], phrases: null, moverIsStudent: false, criticalMoment: true })).toContain('completing the trade');
  });

  it('the chat reads the run off the game history too', () => {
    expect(lastCaptureOf(['e4', 'c5', 'a3', 'Nc6', 'b4', 'cxb4', 'axb4'])).toEqual({ square: 'b4', capturedValue: 1, net: 0 });
  });
});

// ONE "IS THIS A RECAPTURE?" READ (prod Learn audit 2026-11-09). Four
// producers guessed it from their SAN ("x on the same square"), which cannot
// see what was taken: after Bxe6 took a PAWN, …fxe6 wins the bishop, and the
// coach said "your f-pawn taking on e6 — it completes the trade".
const SCANDI = ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bg4', 'h3', 'Nc6', 'hxg4', 'O-O-O', 'Bd2', 'e6', 'Nb5', 'Nxd4', 'Bxa5', 'Nxg4', 'Nxa7+', 'Kb8', 'Nxd4', 'Kxa7', 'Nb3', 'Rxd1+', 'Rxd1', 'Bd6', 'Be2', 'Be5', 'Bxg4', 'Bxb2', 'Nc5', 'Be5', 'a4', 'Bd6', 'Nxb7', 'Kxb7', 'O-O', 'Bc5', 'Bh3', 'Bd6', 'Bxe6'];

describe('takesBack — the one recapture read', () => {
  it('a capture worth no more than what they took takes back; worth more, it wins', () => {
    const tookKnight = { square: 'g3', capturedValue: 3, net: 3 };
    const tookPawn = { square: 'g3', capturedValue: 1, net: 1 };
    expect(takesBack(tookKnight, { to: 'g3', captured: 'b' })).toBe(true);
    expect(takesBack(tookPawn, { to: 'g3', captured: 'b' })).toBe(false);
    expect(takesBack(tookKnight, { to: 'e4', captured: 'b' })).toBe(false);
    expect(takesBack(null, { to: 'g3', captured: 'b' })).toBe(false);
    expect(takesBack(tookKnight, { to: 'g3' })).toBe(false);
  });

  it('the run is built from a PGN, its start read off the header', () => {
    const c = new Chess('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    c.move('exd5');
    expect(captureRunOfPgn(c.pgn(), 1)).toEqual({ square: 'd5', capturedValue: 1, net: 1 });
    expect(captureRunOfPgn(c.pgn(), 0)).toEqual(NO_PREV_CAPTURE);
    expect(captureRunOfPgn(c.pgn(), 2)).toBeNull();
  });

  it('…fxe6 after Bxe6 took a pawn wins the bishop — the chat names it so', async () => {
    const { answerExplainLast } = await import('../coach/chatTurnAnswers');
    const board = new Chess();
    for (const san of SCANDI) board.move(san);
    const text = answerExplainLast(board, 'fxe6', 'b', SCANDI) ?? '';
    expect(text).toMatch(/fxe6 wins a bishop/);
    expect(text).not.toMatch(/completes the trade/);
  });

  it('an even trade still completes it', async () => {
    const { answerExplainLast } = await import('../coach/chatTurnAnswers');
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'];
    const board = new Chess();
    for (const san of sans) board.move(san);
    expect(answerExplainLast(board, 'dxc6', 'b', sans) ?? '').toMatch(/completes the trade/);
  });
});
