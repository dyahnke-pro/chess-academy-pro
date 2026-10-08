// Computers batch 2 — reading their move, every read on a real chess.js board,
// each with the negative case where it must stay silent.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  quietDanger, ideaCondition, obligationLifts, bishopOffPlan, wronglyExpected,
  helpedYou, wedgedPawn, readTheirMove, matesInOne, type Read, type EngineLine,
} from './opponentMoveReads';
import { isProof } from './proof';

const after = (sans: string[]): string => { const c = new Chess(); sans.forEach((s) => c.move(s)); return c.fen(); };
const line = (moves: string[], evaluation: number): EngineLine => ({ moves, evaluation, mate: null });

/** The voice rules every read keeps: seat (you / they, never we), no counts
 *  or percentages (a digit is allowed only as a square's rank), no move numbers. */
function voiced(r: Read | null): Read {
  expect(r).not.toBeNull();
  const read = r as Read;
  expect(read.text).not.toMatch(/\b(we|our|us)\b/i);
  expect(read.text).not.toMatch(/(?<![a-h])\d/);
  expect(isProof(read.proof)).toBe(true);
  expect(read.squares.length).toBeGreaterThan(0);
  return read;
}

describe('quietDanger — the quiet move, not the checks', () => {
  const BEFORE = 'r5k1/2q2ppp/8/8/8/R7/1B3PPP/6K1 b - - 0 1';
  it('their quiet rook move threatens mate while their checks were on the board', () => {
    const r = voiced(quietDanger(BEFORE, 'Rd8', 'w'));
    expect(r.text).toMatch(/rook to d8/);
    expect(r.text).toMatch(/mate/);
    expect(r.proof.exact).toBe(true);
    expect(r.proof.line?.sans).toEqual(['Rd1#']);
    expect(r.stakes?.points).toBe(100);
  });
  it('stays silent on a quiet move that threatens nothing', () => {
    expect(quietDanger(BEFORE, 'h6', 'w')).toBeNull();
  });
  it('stays silent on a check (a check is the loud move, not the quiet one)', () => {
    expect(quietDanger(BEFORE, 'Qc1+', 'w')).toBeNull();
  });
});

describe('ideaCondition — their idea needs one square', () => {
  const FEN = '4r1k1/5ppp/8/8/Q2np3/8/1P3PPP/R5K1 w - - 0 1';
  it('the knight jump to e2 forks only if the rook goes to c1, which the engine rates down', () => {
    const r = voiced(ideaCondition(FEN, 'w', [line(['b2b3'], 0), line(['a1c1', 'd4e2'], -300)]));
    expect(r.text).toMatch(/knight to e2/);
    expect(r.text).toMatch(/rook/);
    expect(r.text).toMatch(/c1/);
    expect(r.proof.line?.sans).toEqual(['Rc1', 'Ne2+']);
    expect(r.namesMove).toBe(false);
  });
  it('stays silent when the engine does not punish the condition move', () => {
    expect(ideaCondition(FEN, 'w', [line(['b2b3'], 0), line(['a1c1', 'd4e2'], -20)])).toBeNull();
  });
});

describe('obligationLifts — the piece that no longer hangs', () => {
  const PREV = '6k1/5ppp/3b4/4P3/8/2N5/5PPP/6K1 w - - 0 1';
  it('their bishop retreating from d6 frees the move you owed e5', () => {
    const r = voiced(obligationLifts(PREV, 'Nb5', 'Be7', 'w'));
    expect(r.text).toMatch(/pawn on e5/);
    expect(r.squares).toEqual(['e5', 'd6', 'e7']);
  });
  it('stays silent when their move leaves the attacker where it was', () => {
    expect(obligationLifts(PREV, 'Nb5', 'h6', 'w')).toBeNull();
  });
  it('stays silent when you guarded it yourself', () => {
    expect(obligationLifts(PREV, 'f4', 'Be7', 'w')).toBeNull();
  });
});

describe('bishopOffPlan — their bishop against their own setup', () => {
  it('their bishop to d3 runs into their own pawns on c4 and e4', () => {
    const r = voiced(bishopOffPlan(after(['e4', 'e5', 'c4', 'Nc6']), 'Bd3', 'b', []));
    expect(r.text).toMatch(/their own pawn/);
  });
  it('one safe pawn shuts the diagonal the bishop came out for', () => {
    const r = voiced(bishopOffPlan(after(['e4', 'd6']), 'Bc4', 'b', [line(['e7e6'], 30)]));
    expect(r.text).toMatch(/aims at f7/);
    expect(r.text).toMatch(/e6/);
    expect(r.namesMove).toBe(true);
  });
  it('stays silent on a knight move', () => {
    expect(bishopOffPlan(after(['e4', 'd6']), 'Nf3', 'b', [line(['e7e6'], 30)])).toBeNull();
  });
});

describe('wronglyExpected — the grab that was not free', () => {
  const FEN = '6k1/pp3ppp/1q6/8/8/2N5/PP3PPP/3R2K1 b - - 0 1';
  it('their queen takes b2; the engine says the rook to b1 hits back', () => {
    const r = voiced(wronglyExpected(FEN, 'Qxb2', 'w', [line(['d1b1', 'b2a3', 'b1b7'], 150)]));
    expect(r.text).toMatch(/pawn on b2/);
    expect(r.text).toMatch(/rook to b1/);
    expect(r.proof.exact).toBe(false);
  });
  it('stays silent when the engine agrees the pawn was free', () => {
    expect(wronglyExpected(FEN, 'Qxb2', 'w', [line(['d1b1', 'b2a3', 'b1b7'], -180)])).toBeNull();
  });
});

describe('helpedYou — their move made yours possible', () => {
  const BEFORE = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'h3']);
  it('their bishop to h5 lets the g-pawn come with gain of time', () => {
    const r = voiced(helpedYou(BEFORE, 'Bh5', 'w', [line(['g2g4', 'h5g6'], 50)]));
    expect(r.text).toMatch(/gain of time/);
    expect(r.text).toMatch(/bishop they just moved/);
  });
  it('stays silent on a plain take-back', () => {
    expect(helpedYou(BEFORE, 'Bxf3', 'w', [line(['d1f3'], 50)])).toBeNull();
  });
});

describe('wedgedPawn — clear it so no pawn of theirs stays', () => {
  it('the queen takes the pawn wedged on f6 by the king', () => {
    const r = voiced(wedgedPawn('3q2k1/6pp/5P2/8/8/8/5PPP/6K1 b - - 0 1', 'b', [line(['d8f6'], 0)]));
    expect(r.text).toMatch(/f6/);
    expect(r.text).toMatch(/queen takes f6/);
  });
  it('stays silent when a pawn of theirs would simply come back', () => {
    expect(wedgedPawn('3q2k1/6pp/5P2/4P3/8/8/5PPP/6K1 b - - 0 1', 'b', [line(['d8f6'], 0)])).toBeNull();
  });
});

describe('readTheirMove — the one producer', () => {
  it('returns the quiet danger, and every read it returns carries a proof', () => {
    const reads = readTheirMove({ fenBefore: 'r5k1/2q2ppp/8/8/8/R7/1B3PPP/6K1 b - - 0 1', san: 'Rd8', student: 'w', topLines: [] });
    expect(reads.map((r) => r.kind)).toContain('quiet-danger');
    for (const r of reads) expect(isProof(r.proof)).toBe(true);
  });
  it('matesInOne finds the back-rank mate and nothing on the opening board', () => {
    expect(matesInOne('3r2k1/2q2ppp/8/8/8/R7/1B3PPP/6K1 b - - 1 2').map((m) => m.san)).toContain('Rd1#');
    expect(matesInOne(new Chess().fen())).toEqual([]);
  });
});
