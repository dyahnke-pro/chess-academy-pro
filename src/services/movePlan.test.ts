import { describe, it, expect } from 'vitest';
import { classifyPlan, missedPlanClause } from './movePlan';

describe('classifyPlan — board-true plan classes', () => {
  it('recognizes castling', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(classifyPlan(fen, 'e1g1')).toBe('castle');
  });

  it('recognizes a central pawn break that hits an enemy centre pawn', () => {
    // 1.e4 e6 2.d4 — now …d5 strikes White's e4 pawn (…d5 attacks e4).
    const fen = 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2';
    expect(classifyPlan(fen, 'd7d5')).toBe('center-break');
  });

  it('a quiet flank/develop move is neither', () => {
    const fen = 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2';
    expect(classifyPlan(fen, 'a7a6')).toBe('other');
  });
});

describe('missedPlanClause — names the idea only on a clear divergence', () => {
  it('flags king-safety when the best move castles and the played move does not', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    // best = O-O (e1g1), played = a quiet a3.
    const c = missedPlanClause(fen, 'a2a3', 'e1g1');
    expect(c).toMatch(/king to safety|castl/i);
  });

  it('flags the central strike when the best move is a break and the played move is not', () => {
    const fen = 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2';
    // best = …d5 (break), played = …a6.
    const c = missedPlanClause(fen, 'a7a6', 'd7d5');
    expect(c).toMatch(/centre|center/i);
    expect(c).toMatch(/d5/);
  });

  it('stays silent when both moves share a plan class (no vague claim)', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    // both develop-ish quiet moves → 'other' vs 'other' → nothing.
    expect(missedPlanClause(fen, 'a2a3', 'h2h3')).toBe('');
  });

  it('stays silent when the played move IS the best move', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(missedPlanClause(fen, 'e1g1', 'e1g1')).toBe('');
  });
});
