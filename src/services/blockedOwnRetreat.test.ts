import { describe, it, expect } from 'vitest';
import { attributePrinciples, type AttributionInput } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';

// Review walk oct3b, game 2 ply 11 (2026-10-03): Qd3 was graded an inaccuracy
// and the beat opened on the bare grade — no fundamental could name it. The
// queen stood on d3, the Bc4's only way home (b3 holds a pawn, a6 covers b5,
// e6 covers d5, and e2/f1 lie behind d3), so …b5 traps the bishop. The engine
// line and best move are the review's own.
const QD3: AttributionInput = {
  replySan: null,
  historySans: ['e4', 'c5', 'Bc4', 'e6', 'e5', 'Nc6', 'Qe2', 'a6', 'b3', 'Nd4', 'Qd3'],
  bestSan: 'Qd1',
  classification: 'inaccuracy',
  pvAfterPlayed: ['b5', 'Qe4', 'bxc4', 'Qxa8', 'Nc2+', 'Ke2', 'Nxa1'],
  evalBefore: -40,
  evalAfterPlayed: -140,
};

describe('blocked-own-retreat', () => {
  it('names Qd3 taking the bishop on c4 its way home', () => {
    const why: string[] = [];
    const attrs = attributePrinciples(QD3, why);
    const a = attrs.find((x) => x.id === 'blocked-own-retreat');
    expect(a, why.join('\n')).toBeDefined();
    expect(a!.facts).toMatchObject({ piece: 'bishop', square: 'c4', blocker: 'queen', blockerSq: 'd3', retreat: 'd3', trap: 'b5' });
    // The yield calculation-depth makes for an immediate blow is now honoured.
    expect(why.join('\n')).not.toMatch(/YIELD UNHONOURED/);
  });

  it('leads the beat with the lesson', () => {
    const line = renderFundamentalVerdict(attributePrinciples(QD3), { ply: 11, seen: new Set(), replySan: null });
    expect(line).toMatch(/bishop/);
    expect(line).toMatch(/b5/);
    expect(line).toMatch(/d3/);
  });

  it('stays silent when the bishop still has a road home', () => {
    // Same game, the queen goes to e4 instead: d3, e2 and f1 stay open, so …b5
    // traps nothing.
    const qe4: AttributionInput = { ...QD3, historySans: [...QD3.historySans.slice(0, -1), 'Qe4'], pvAfterPlayed: ['b5', 'Bd3'] };
    expect(attributePrinciples(qe4).some((x) => x.id === 'blocked-own-retreat')).toBe(false);
  });

  it('stays silent when the line never wins the bishop', () => {
    expect(attributePrinciples({ ...QD3, pvAfterPlayed: ['b5'] }).some((x) => x.id === 'blocked-own-retreat')).toBe(false);
  });
});
