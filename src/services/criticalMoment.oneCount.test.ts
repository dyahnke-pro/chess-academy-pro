/**
 * ONE COUNTER of the only-move claim (2026-10-20). positionFacts' knife-edge
 * line read the importance tier and hard-coded its stake; it now reads the
 * critical-moment computer every other "only move" sentence reads.
 */
import { describe, it, expect } from 'vitest';
import { computePositionFacts } from './positionFacts';
import { opponentOnlyMoveStatement, readCriticalMoment } from './criticalMoment';
import type { AnalysisLine } from '../types';

const l = (rank: number, cp: number, uci: string): AnalysisLine => ({ rank, evaluation: cp, mate: null, moves: [uci] });
// Black to move after 46.Kg6 (the doc's king-and-pawn ending); the student is White.
const BLACK_TO_MOVE = '6k1/1p6/3p2K1/1N6/p3P3/8/8/8 b - - 1 46';
const knifeEdge = (r: { clauses: Array<{ kind: string; text: string }> }): string | undefined =>
  r.clauses.find((c) => /knife-edge/.test(c.text))?.text;

describe('the opponent\'s only move is counted once', () => {
  it('a count the fan cannot prove says no knife-edge (old code spoke it off the tier)', async () => {
    // White-POV cp. Black holds level at +0.40, the runner-up reads −5.60 for
    // Black — a 600cp gap, so the tier is only-move — but that score is a
    // BOUND (the search cut off), so the count is unproven. The fan carries
    // no moves, as the tier-only branch did: no intent to name instead.
    const fan = [{ rank: 1, evaluation: -40, mate: null, moves: [] }, { rank: 2, evaluation: 560, mate: null, moves: [], bound: 'upper' as const }, { rank: 3, evaluation: 600, mate: null, moves: [] }];
    expect(readCriticalMoment({ topLines: fan, moverColor: 'b' })?.resolved).toBe(false);
    const r = await computePositionFacts({
      boardComputers: 'surface', posture: 'walk', fen: BLACK_TO_MOVE, moverColor: 'b', studentColor: 'w',
      analysis: { evaluation: -40, isMate: false, mateIn: null, depth: 14, topLines: fan },
    });
    expect(r.importance.tier).toBe('only-move');
    expect(knifeEdge(r)).toBeUndefined();
  });

  it('a proven single move speaks with the stake the count read, from their seat', () => {
    const read = readCriticalMoment({ topLines: [l(1, -40, 'g8f8'), l(2, 600, 'g8h8'), l(3, 650, 'b7b6')], moverColor: 'b' });
    expect(opponentOnlyMoveStatement(read)).toBe("They're on a knife-edge here — only one move keeps them level.");
  });
});
