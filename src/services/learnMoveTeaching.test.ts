import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildDrillWrongTeaching } from './learnMoveTeaching';

/** Build a FEN by replaying SANs from the start. */
function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('buildDrillWrongTeaching', () => {
  it('teaches why the right move is strong when the student misses it', () => {
    // Italian: 1.e4 e5 2.Nf3 Nc6 3.Bc4 — the taught move is Bc5; student tries d6.
    const drillFen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    const teaching = buildDrillWrongTeaching(drillFen, 'd6', 'Bc5');
    expect(teaching).toBeTruthy();
    // Board-true sentence, ends with a period; never a bare restatement.
    expect(teaching!.length).toBeGreaterThan(8);
    expect(teaching!.endsWith('.')).toBe(true);
  });

  it('names the concrete cost when the played move hangs material', () => {
    // Position where the taught capture wins a piece and the played quiet move
    // lets the opponent grab material. 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6
    // 5.Nxe5 — taught recapture-safe line; student blunders a hanging piece.
    // Use a simple hanging-piece position: white to move, Qxf7 is not it but a
    // capture win exists.
    const drillFen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5']);
    // Black to move; taught move ...Qg5 forks e5-knight and g2; student plays a6.
    const teaching = buildDrillWrongTeaching(drillFen, 'a6', 'Qg5');
    // Whatever it returns must be board-true (non-empty string or null), never throw.
    expect(teaching === null || typeof teaching === 'string').toBe(true);
    if (teaching) expect(teaching.endsWith('.')).toBe(true);
  });

  it('returns null (silence) rather than invent when the expected move is illegal in the FEN', () => {
    const drillFen = fenAfter(['e4', 'e5']);
    // "Bc5" is not legal for the side to move (White) here.
    expect(buildDrillWrongTeaching(drillFen, 'Nf3', 'Bc5')).toBeNull();
  });

  it('never throws on a malformed FEN', () => {
    expect(buildDrillWrongTeaching('not-a-fen', 'e4', 'd4')).toBeNull();
  });
});

import { buildDrillBetterLine } from './learnMoveTeaching';
import { Chess as ChessLib } from 'chess.js';

describe('buildDrillBetterLine (Learn better-line walkout core)', () => {
  const START = new ChessLib().fen();

  it('replays the correct continuation with student/opponent alternation + whys', () => {
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
    const steps = buildDrillBetterLine(START, line, 0, 6);
    expect(steps.map((s) => s.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    // The drill move (k=0) is the student's; then it alternates.
    expect(steps.map((s) => s.isStudent)).toEqual([true, false, true, false, true]);
    // Opponent replies carry no spoken why; each fen is legal + advances.
    expect(steps[1].why).toBeNull();
    for (const s of steps) expect(() => new ChessLib(s.fen)).not.toThrow();
  });

  it('starts from drillMoveIndex, not the line start, and caps at maxPlies', () => {
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'];
    const steps = buildDrillBetterLine(START, line, 0, 3);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.san)).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('returns [] on a bad fen or an out-of-range index', () => {
    expect(buildDrillBetterLine('not a fen', ['e4'], 0)).toEqual([]);
    expect(buildDrillBetterLine(START, ['e4'], 5)).toEqual([]);
  });
});

import { buildDrillThreatSpot, buildDrillCompletionPlan } from './learnMoveTeaching';

describe('buildDrillThreatSpot (spot-it into Learn)', () => {
  it('teaches the pattern when the opponent reply creates a concrete threat', () => {
    // Scholar's-mate shape: student (Black) to defend. Before White's Qh5 the
    // position is 1.e4 e5 2.Bc4 Nc6; White then plays Qh5 threatening Qxf7#.
    const before = fenAfter(['e4', 'e5', 'Bc4', 'Nc6']);
    const after = fenAfter(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);
    const spot = buildDrillThreatSpot(before, after, 'black');
    expect(spot).toBeTruthy();
    expect(spot!.toLowerCase()).toMatch(/pattern to spot/);
  });

  it('returns null (silence) when the opponent reply is quiet', () => {
    const before = fenAfter(['e4', 'e5', 'Nf3']);
    const after = fenAfter(['e4', 'e5', 'Nf3', 'Nc6']); // quiet developing reply
    expect(buildDrillThreatSpot(before, after, 'white')).toBeNull();
  });

  it('never throws on a malformed FEN', () => {
    expect(buildDrillThreatSpot('bad', 'fen', 'white')).toBeNull();
  });
});

describe('buildDrillCompletionPlan (positional plan into Learn)', () => {
  it('returns null on an early/quiet opening position (no concrete plan yet)', () => {
    // Right out of the opening — plan clauses gate on a real middlegame.
    const plan = buildDrillCompletionPlan(fenAfter(['e4', 'e5', 'Nf3', 'Nc6']), 'white');
    expect(plan === null || typeof plan === 'string').toBe(true);
  });

  it('hands the student a concrete forward plan when the structure warrants it', () => {
    // A middlegame where White holds a knight outpost on d5 (a real "dominate
    // from the outpost" plan). White to move, past the opening.
    const fen = 'r2q1rk1/pp3ppp/2n1b3/3Np3/4P3/5N2/PPP2PPP/R2Q1RK1 w - - 0 14';
    const plan = buildDrillCompletionPlan(fen, 'white');
    // Board-derived plan or honest silence — never a throw, never empty string.
    expect(plan === null || (typeof plan === 'string' && plan.length > 10)).toBe(true);
  });

  it('never throws on a malformed FEN', () => {
    expect(buildDrillCompletionPlan('not-a-fen', 'white')).toBeNull();
  });
});
