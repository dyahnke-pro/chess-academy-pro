/**
 * A critical-moment count names the board it counted (David's Learn walk,
 * audit-reports/learn-rootcauses-2026-10-19.md, defect 3). "Kg6 was the only
 * move that kept the win" and "On this move, two moves keep the win" were both
 * true — about two different boards — and the second was heard as a claim
 * about Kg6. Boards and engine fans are the ones in the doc.
 */
import { describe, it, expect } from 'vitest';
import { computePositionFacts } from './positionFacts';
import { criticalMomentStatement, readCriticalMoment } from './criticalMoment';
import { foundMoveTeaching } from './learnBoardTeaching';
import type { AnalysisLine } from '../types';

const l = (rank: number, cp: number, uci: string): AnalysisLine => ({ rank, evaluation: cp, mate: null, moves: [uci] });

const BEFORE_KG6 = '6k1/1p6/3p4/1N5K/p3P3/8/8/8 w - - 0 46';
const BEFORE_D5 = '6k1/1p6/3p2K1/1N6/p3P3/8/8/8 b - - 1 46';
const AFTER_D5 = '6k1/1p6/6K1/1N1p4/p3P3/8/8/8 w - - 0 47';
const FAN_AFTER_D5 = [l(1, 584, 'e4e5'), l(2, 573, 'e4d5'), l(3, -40, 'b5c3'), l(4, -41, 'g6g5'), l(5, -41, 'g6h5'), l(6, -41, 'g6f5')];
const D5 = { san: 'd5', fenBefore: BEFORE_D5 };

describe('the two-moves count after 46...d5 names d5', () => {
  it('the key-moment clause opens on the reply it counted', async () => {
    const r = await computePositionFacts({
      boardComputers: 'surface', posture: 'walk', fen: AFTER_D5, moverColor: 'w', studentColor: 'w',
      analysis: { evaluation: 584, isMate: false, mateIn: null, depth: 14, topLines: FAN_AFTER_D5 },
      opponentLastMove: D5,
    });
    const t = r.clauses.find((c) => c.kind === 'key-moment')?.text;
    expect(t).toMatch(/two moves keep the win/);
    expect(t).toMatch(/^After their pawn to d5,/);
    expect(t).not.toMatch(/\bthis move\b/i);
  });

  it('no stem, anchored or not, says "this move" — at every ply of the rotation', () => {
    const read = readCriticalMoment({ topLines: FAN_AFTER_D5, moverColor: 'w' });
    for (let ply = 90; ply <= 97; ply += 1) {
      const anchored = criticalMomentStatement(read, ply, D5)!;
      expect(anchored).toMatch(/^After their pawn to d5, /);
      expect(anchored).not.toMatch(/\bthis move\b|fork in the road: .*this|Narrow on this/i);
      const bare = criticalMomentStatement(read, ply, null)!;
      expect(bare).toMatch(/^(Your move now|For your next move)/);
      expect(bare).not.toMatch(/\bthis move\b/i);
    }
  });

  it('the move before had its own, different, true count: Kg6 was the only move', () => {
    const fan = [l(1, 601, 'h5g6'), l(2, 21, 'h5g4'), l(3, 4, 'h5h4'), l(4, 0, 'b5c3'), l(5, 0, 'h5g5'), l(6, 0, 'h5h6')];
    const found = foundMoveTeaching(BEFORE_KG6, 'Kg6', fan, 'w', 'g6', []);
    expect(found?.text ?? '').toMatch(/^Kg6 was the only move that kept the win\./);
  });
});
