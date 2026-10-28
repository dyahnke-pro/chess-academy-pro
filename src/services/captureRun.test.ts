// A RUN OF CAPTURES ON ONE SQUARE (2026-10-28). Every reader looked one move
// back, so on the a3 Sicilian's …Nc6 branch (e4 c5 a3 Nc6 b4 cxb4 axb4 Nxb4)
// the lesson said "cxb4, winning the pawn" with axb4 coming next, and
// "Nxb4, taking back the pawn" on the move that wins it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { NO_PREV_CAPTURE, afterCapture } from './captureRun';
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
    const say = (i: number, student: boolean) => buildReviewMoveBriefing({ fenBefore: f[i], san: LINE[i], prev: runs[i], phrases: null, moverIsStudent: student }) ?? '';
    expect(say(5, true)).toContain('winning a pawn — if axb4, …Nxb4');
    expect(say(6, false)).toContain('taking back the pawn, but …Nxb4 takes again');
    expect(say(7, true)).toContain('winning the pawn');
    expect(say(7, true)).not.toContain('taking back');
  });

  it('an even trade is still a take-back', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'];
    const f = boards(sans);
    const runs = captureContextsAlong(f[0], sans);
    expect(buildReviewMoveBriefing({ fenBefore: f[7], san: 'dxc6', prev: runs[7], phrases: null, moverIsStudent: false })).toContain('taking back the bishop');
  });

  it('the chat reads the run off the game history too', () => {
    expect(lastCaptureOf(['e4', 'c5', 'a3', 'Nc6', 'b4', 'cxb4', 'axb4'])).toEqual({ square: 'b4', capturedValue: 1, net: 0 });
  });
});
