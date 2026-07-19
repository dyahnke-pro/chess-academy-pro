import { describe, it, expect } from 'vitest';
import { buildMiddlegameOrientation } from './reviewStrategicOrientation';

describe('buildMiddlegameOrientation (§1 anchor + §2 both-sides plans)', () => {
  it('names opposite-side castling as a race', () => {
    // White O-O-O (Kc1), Black O-O (Kg8) — opposite wings.
    const fen = 'r1bq1rk1/pppp1ppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/2KRQB1R w - - 0 1';
    const t = buildMiddlegameOrientation(fen, 'w');
    expect(t).toMatch(/opposite wings|race/i);
  });

  it("states the student's plan from a clear queenside majority", () => {
    // White has a,b,c pawns (3) vs Black's a-pawn only (1) on the queenside →
    // clear White queenside majority. Black has a kingside majority (f,g,h = 3
    // vs White f,g = 2) → both plans stated.
    const fen = '4k3/p4ppp/8/8/8/8/PPP2PP1/4K3 w - - 0 1';
    const t = buildMiddlegameOrientation(fen, 'w');
    expect(t).toMatch(/queenside/i);
    expect(t).toMatch(/plan/i);
  });

  it("frames the opponent's plan when THEY hold the majority", () => {
    // Same position from Black's POV: Black's plan = kingside; opponent (White)
    // = queenside.
    const fen = '4k3/p4ppp/8/8/8/8/PPP2PP1/4K3 w - - 0 1';
    const t = buildMiddlegameOrientation(fen, 'b');
    expect(t).toMatch(/opponent/i);
    expect(t).toMatch(/queenside|kingside/i);
  });

  it('stays silent when the pawns are symmetric — no clear plan (empty > generic)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(buildMiddlegameOrientation(fen, 'w')).toBeNull();
  });
});
