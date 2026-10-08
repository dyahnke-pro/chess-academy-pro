// Computers batch 2 — the three new method habits, each earned by a line the
// engine handed over, never by the position's mood.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { naturalDefenceFails, forcingLine, markSacrificeLine } from './methodSignals';
import { liveMethodBeat, liveHabitKey } from './methodBeat';
import { LIVE_HABIT_STEP } from './thinkingSteps';

const line = (moves: string[], evaluation: number): { moves: string[]; evaluation: number; mate: null } => ({ moves, evaluation, mate: null });
const after = (sans: string[]): string => { const c = new Chess(); sans.forEach((s) => c.move(s)); return c.fen(); };

describe('naturalDefenceFails — "the pawn defends, but look again"', () => {
  const FEN = '6k1/5ppp/1b6/7Q/3N4/8/2P2PPP/6K1 w - - 0 1';
  it('the plain defence c3 the engine rates far below its best is named, with its line', () => {
    const d = naturalDefenceFails(FEN, 'w', [line(['d4f3'], 0), line(['c2c3', 'b6d4', 'c3d4'], -250)]);
    expect(d?.defence).toBe('c3');
    expect(d?.target).toBe('your knight on d4');
    expect(d?.proof.line?.sans).toEqual(['c3', 'Bxd4', 'cxd4']);
  });
  it('stays silent when the defence holds in the engine\'s eyes', () => {
    expect(naturalDefenceFails(FEN, 'w', [line(['d4f3'], 0), line(['c2c3', 'b6d4', 'c3d4'], -40)])).toBeNull();
  });
});

describe('forcingLine — calculate on your turn', () => {
  const FEN = '3r2k1/3q1ppp/8/8/8/8/3R1PPP/3Q2K1 w - - 0 1';
  it('three captures from the first move', () => {
    expect(forcingLine(FEN, line(['d2d7', 'd8d7', 'd1d7'], 900))?.line?.sans).toEqual(['Rxd7', 'Rxd7', 'Qxd7']);
  });
  it('stays silent on a quiet first move', () => {
    expect(forcingLine(FEN, line(['h2h3', 'h7h6', 'd2d7'], 0))).toBeNull();
  });
});

describe('markSacrificeLine — forced or speculative', () => {
  const GREEK = after(['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7', 'Nf3', 'Be7', 'Bd3', 'O-O']);
  it('the Greek gift is speculative: after the knight check the king has real choices', () => {
    const m = markSacrificeLine(GREEK, line(['d3h7', 'g8h7', 'f3g5', 'h7g8', 'd1h5'], 150));
    expect(m?.mark).toBe('speculative');
  });
  it('stays silent when the engine\'s move gives nothing away', () => {
    expect(markSacrificeLine(GREEK, line(['h2h4', 'c7c5'], 50))).toBeNull();
  });
});

describe('liveMethodBeat — the new habits speak once, with their proof', () => {
  const proof = { kind: 'line' as const, exact: false, short: 'x', full: 'x' };
  it('look again: a deciding moment with a failing plain defence', () => {
    const b = liveMethodBeat({ bestSan: 'Nf3', threatStanding: true, isStudentMove: true, tier: 'critical', defenceFails: { target: 'your knight on d4', proof } }, 0);
    expect(b?.key).toBe(liveHabitKey('look-again'));
    expect(b?.text).toMatch(/look again/i);
    expect(b?.proof).toBe(proof);
    expect(liveMethodBeat({ bestSan: 'Nf3', threatStanding: true, isStudentMove: true, tier: 'critical', defenceFails: { target: 'your knight on d4', proof } }, 0, new Set([liveHabitKey('look-again')]))?.key).not.toBe(liveHabitKey('look-again'));
  });
  it('mark the line: a sacrifice at a deciding moment', () => {
    const b = liveMethodBeat({ bestSan: 'Bxh7+', threatStanding: false, isStudentMove: true, tier: 'critical', sacrificeLine: { mark: 'speculative', proof } }, 0, new Set([liveHabitKey('forcing-scan')]));
    expect(b?.key).toBe(liveHabitKey('mark-line'));
    expect(b?.text).toMatch(/speculative/);
  });
  it('calculate now: only after the forcing scan was taught', () => {
    const s = { bestSan: 'Rxd7', threatStanding: false, isStudentMove: true, tier: 'critical' as const, forcingLine: proof };
    expect(liveMethodBeat(s, 0)?.key).toBe(liveHabitKey('forcing-scan'));
    expect(liveMethodBeat(s, 0, new Set([liveHabitKey('forcing-scan')]))?.key).toBe(liveHabitKey('calc-now'));
  });
  it('none fires on a quiet moment, and none on the opponent\'s turn', () => {
    expect(liveMethodBeat({ bestSan: 'Nf3', threatStanding: false, isStudentMove: true, tier: 'none', defenceFails: { target: 'x', proof } }, 0)).toBeNull();
    expect(liveMethodBeat({ bestSan: 'Nf3', threatStanding: true, isStudentMove: false, tier: 'critical', defenceFails: { target: 'x', proof } }, 0)).toBeNull();
  });
  it('every new habit maps to a thinking step', () => {
    expect(LIVE_HABIT_STEP['look-again']).toBe('is-my-move-safe');
    expect(LIVE_HABIT_STEP['calc-now']).toBe('calculate');
    expect(LIVE_HABIT_STEP['mark-line']).toBe('calculate');
  });
});
