import { describe, expect, it } from 'vitest';
import { moverCp, seatCp, winChancePercent, winningChances } from './winChance';

// The three copies and the five seat reads this leaf replaced, written out as
// they stood (2026-10-30), so "byte-identical" is a test and not a claim: every
// reader of the leaf gets the bits its old copy gave.
const oldPercent = (cp: number): number => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
const oldChances = (cp: number): number => 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
const oldSeat = (l: { evaluation: number; mate?: number | null }, seat: 'w' | 'b'): number =>
  (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * (seat === 'w' ? 1 : -1);
const oldAtFen = (fen: string, l: { evaluation: number; mate?: number | null }): number => {
  const white = l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation;
  return fen.split(' ')[1] === 'w' ? white : -white;
};

const CPS: number[] = [];
for (let cp = -3000; cp <= 3000; cp++) CPS.push(cp);
for (let cp = -100000; cp <= 100000; cp += 997) CPS.push(cp);
CPS.push(0.5, -0.5, 12.25, -1499.75, 1500, -1500, 20000, -20000, 30000, -30000, 100000, -100000);

const WHITE_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('winChance — the one converter', () => {
  it('is lichess\'s curve: even is 50, two pawns about 67, symmetric', () => {
    expect(winChancePercent(0)).toBe(50);
    expect(winChancePercent(200)).toBeCloseTo(67.6, 1);
    expect(winningChances(0)).toBe(0);
    expect(winningChances(-300)).toBeCloseTo(-winningChances(300), 12);
  });

  it('gives the old copies\' bits on every score', () => {
    const off = CPS.filter((cp) => !Object.is(winChancePercent(cp), oldPercent(cp)) || !Object.is(winningChances(cp), oldChances(cp)));
    expect(off).toEqual([]);
  });

  it('reads a line for a seat: a mate folds to ±100000, Black sees the sign turned', () => {
    expect(seatCp({ evaluation: 35, mate: null }, 'w')).toBe(35);
    expect(seatCp({ evaluation: 35, mate: null }, 'b')).toBe(-35);
    expect(seatCp({ evaluation: 0, mate: 3 }, 'b')).toBe(-100000);
    expect(seatCp({ evaluation: 0, mate: -2 }, 'b')).toBe(100000);
    // A fan line may leave `mate` out altogether (`FanLine.mate?`).
    expect(seatCp({ evaluation: -80 }, 'w')).toBe(-80);
  });

  it('gives the old seat reads\' bits, by seat and by the side to move', () => {
    const off: string[] = [];
    for (const cp of CPS) {
      for (const mate of [null, undefined, 4, -4]) {
        const l = { evaluation: cp, mate };
        if (!Object.is(seatCp(l, 'w'), oldSeat(l, 'w')) || !Object.is(seatCp(l, 'b'), oldSeat(l, 'b'))) off.push(`seat ${cp} ${String(mate)}`);
        if (!Object.is(moverCp(WHITE_TO_MOVE, l), oldAtFen(WHITE_TO_MOVE, l)) || !Object.is(moverCp(BLACK_TO_MOVE, l), oldAtFen(BLACK_TO_MOVE, l))) off.push(`fen ${cp} ${String(mate)}`);
      }
    }
    expect(off).toEqual([]);
  });
});
