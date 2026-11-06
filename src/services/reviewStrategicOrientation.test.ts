import { describe, it, expect } from 'vitest';
import { buildMiddlegameOrientation } from './reviewStrategicOrientation';

describe('buildMiddlegameOrientation (§1 anchor + §2 both-sides plans)', () => {
  it('names opposite-side castling as a race + draws storm arrows', () => {
    // White O-O-O (Kc1), Black O-O (Kg8) — opposite wings.
    const fen = 'r1bq1rk1/pppp1ppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/2KRQB1R w - - 0 1';
    const beat = buildMiddlegameOrientation(fen, 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/opposite wings|race/i);
    expect(beat!.arrows.length).toBeGreaterThan(0);
  });

  it('one plan per side: the race is the plan, a majority on the other wing is not said (unity U5, walk #24)', () => {
    // White Kc1, Black Kg8: White storms the kingside; White's queenside
    // majority sits on White's OWN king's wing and is not a second plan.
    const fen = 'r2qr1k1/p1n2ppp/1b6/8/8/1B6/PPPN1PPP/2KRQ2R w - - 0 1';
    const beat = buildMiddlegameOrientation(fen, 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/race/i);
    expect(beat!.text).not.toMatch(/queenside pawn majority/i);
  });

  it("states the student's plan from a clear queenside majority + arrows the pawns", () => {
    const fen = '4k3/p4ppp/8/8/8/8/PPP2PP1/4K3 w - - 0 1';
    const beat = buildMiddlegameOrientation(fen, 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/queenside/i);
    expect(beat!.text).toMatch(/plan/i);
    // Arrows point the queenside pawns forward.
    expect(beat!.arrows.some((a) => ['a', 'b', 'c'].includes(a.startSquare[0]))).toBe(true);
  });

  it("frames the opponent's plan when THEY hold the majority", () => {
    const fen = '4k3/p4ppp/8/8/8/8/PPP2PP1/4K3 w - - 0 1';
    const beat = buildMiddlegameOrientation(fen, 'b');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/opponent/i);
  });

  it("keeps each side's plan on its own move (WO-TEACH-02 SEAT)", () => {
    // Black student; White holds the queenside majority.
    const fen = '4k3/p4ppp/8/8/8/8/PPP2PP1/4K3 w - - 0 1';
    const mine = buildMiddlegameOrientation(fen, 'b', undefined, 'student')?.text ?? '';
    const theirs = buildMiddlegameOrientation(fen, 'b', undefined, 'opponent')?.text ?? '';
    expect(mine).not.toMatch(/opponent's plan/);
    expect(theirs).toMatch(/opponent's plan/);
    expect(theirs).not.toMatch(/your plan/i);
    expect(buildMiddlegameOrientation(fen, 'b', undefined, 'both')?.text).toMatch(/opponent's plan/);
  });

  it('stays silent when the pawns are symmetric — no clear plan (empty > generic)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(buildMiddlegameOrientation(fen, 'w')).toBeNull();
  });
});

describe('buildMiddlegameOrientation — a middlegame orientation needs a middlegame (WO-STANDARD-01 D-15, 2026-09-22)', () => {
  it('is silent in the OPENING even when the pawn count is asymmetric', () => {
    // Ruy Lopez Exchange after 6.Nxd4: White already has a 4v3 kingside
    // majority and Black doubled c-pawns — the structure prod narrated as
    // "Your plan is to advance your kingside majority; your opponent's plan
    // is to push on the queenside" at move 7 — with one minor piece developed
    // between them. `phaseOfFen` reads this as the opening.
    const fen = 'r1bqkbnr/1pp2ppp/p1p5/8/3NP3/8/PPP2PPP/RNBQK2R b KQkq - 0 6';
    expect(buildMiddlegameOrientation(fen, 'w')).toBeNull();
    expect(buildMiddlegameOrientation(fen, 'b')).toBeNull();
  });
  it('NEGATIVE CONTROL: the SAME structure once the phase is past the opening still gets its plan', () => {
    // Queens traded (7.Qxd8+ Kxd8 in the same line): the board computer
    // calls a major-piece trade a middlegame, so the majority plan speaks —
    // proving the gate is the phase, not the structure.
    const traded = 'r1b1kbnr/1pp2ppp/p1p5/8/3NP3/8/PPP2PPP/RNB1K2R b KQkq - 0 7';
    expect(buildMiddlegameOrientation(traded, 'w')).not.toBeNull();
    const ending = '4k3/p4ppp/8/8/8/8/PPP2PP1/4K3 w - - 0 1';
    expect(buildMiddlegameOrientation(ending, 'w')).not.toBeNull();
  });
});
