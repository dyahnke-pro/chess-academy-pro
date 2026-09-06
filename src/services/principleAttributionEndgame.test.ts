import { describe, it, expect } from 'vitest';
import { attributePrinciples, type FundamentalId } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';

// Wave-1 endgame fundamentals. Each fixture is a REAL legal game (found by a
// capture-biased legal-playout search) that reaches an endgame where the
// engine's best neglects a specific endgame fundamental. historySans ends on the
// flagged (played) move; bestSan is the fundamental move. Every one is
// CO_OCCURRENCE — it surfaces only when no move-verified fundamental attached, so
// these are quiet endings by design (no hanging piece, no missed tactic).
const FIXTURES: { id: FundamentalId; best: string; hist: string[] }[] = [
  {
    id: 'passive-rook-endgame',
    best: 'Rf2',
    hist: ['a4', 'Nf6', 'Nf3', 'd6', 'Na3', 'Rg8', 'Ra2', 'g6', 'd4', 'Nh5', 'Nb5', 'Kd7', 'Nxc7', 'Nc6', 'Bh6', 'Qxc7', 'Ra3', 'Nxd4', 'Qxd4', 'Qxc2', 'Qxa7', 'Qxa4', 'Qxb7+', 'Bxb7', 'Bxf8', 'Kc8', 'Bxe7', 'Qg4', 'Bxd6', 'Nf6', 'Rxa8+', 'Bxa8', 'Nh4', 'Bxg2', 'Nxg6', 'Bxh1', 'Nf4', 'Qxe2+', 'Kxe2', 'Rg7', 'Bc7', 'Kxc7', 'b3', 'Nd7', 'Kd1', 'Kc8', 'Nd5', 'Bxd5', 'h3', 'Bxb3+', 'Ke2', 'Rg1', 'f4', 'Rxf1', 'f5', 'Rxf5', 'Kd3', 'Kd8'],
  },
  {
    id: 'passed-pawn-neglected',
    best: 'd3',
    hist: ['e3', 'h5', 'Qxh5', 'Rxh5', 'Ne2', 'Rc5', 'Rg1', 'Rxc2', 'b3', 'b5', 'Nf4', 'Rc4', 'bxc4', 'bxc4', 'Nh5', 'd6', 'Nxg7+', 'Kd7', 'Bxc4', 'Bxg7', 'Bxf7', 'Bxa1', 'h3', 'c5', 'Kd1', 'a5', 'Bxg8', 'Qxg8', 'Bb2', 'Qxa2', 'Na3', 'Qxa3', 'Bxa1', 'Qxa1+', 'Ke2', 'Qxg1', 'Kd3', 'Qxg2', 'h4', 'Qg7', 'f3', 'e6', 'e4', 'Qe7', 'Kc3', 'Qxh4', 'e5', 'Qf2', 'exd6', 'Qg1', 'Kb2', 'Kxd6', 'Ka3', 'Ke5', 'd3', 'Qg3', 'd4+', 'cxd4', 'Kb2', 'Qxf3', 'Kb1', 'Ra6', 'Ka2', 'Qf7', 'Kb1', 'Qf6', 'Kb2', 'Qf3', 'Ka1', 'Qh5', 'Ka2', 'Qg5', 'Kb1', 'Qg7', 'Ka1', 'a4', 'Kb1', 'Ra7', 'Ka1', 'Kf4', 'Kb1', 'Ke5', 'Ka2', 'a3', 'Kb3', 'Nc6', 'Ka2', 'Ra4', 'Kb3', 'Qd7', 'Kxa4', 'a2', 'Kb3', 'a1=R', 'Kc4', 'Qf7', 'Kb3', 'Re1', 'Ka4', 'Rf1', 'Kb5', 'Rc1', 'Ka4', 'Qa7+', 'Kb5', 'Ra1', 'Kxc6', 'Qb6+', 'Kxb6', 'Bd7'],
  },
  {
    id: 'lost-the-opposition',
    best: 'Kb4',
    hist: ['g4', 'Nc6', 'e3', 'Ne5', 'Ba6', 'Nxg4', 'Bxb7', 'Nxh2', 'Qf3', 'Nxf3+', 'Bxf3', 'Ba6', 'Rxh7', 'Rxh7', 'Bxa8', 'Qxa8', 'f4', 'Rh1', 'Kf2', 'e5', 'c3', 'exf4', 'exf4', 'Rxg1', 'Kxg1', 'g6', 'Kf2', 'Ke7', 'Kg3', 'Bc4', 'Kg4', 'Bxa2', 'Rxa2', 'Kd8', 'Rxa7', 'Qxa7', 'd3', 'Nf6+', 'Kf3', 'Ba3', 'Nxa3', 'Qxa3', 'bxa3', 'c5', 'Kg2', 'Nd5', 'Be3', 'Nxe3+', 'Kh2', 'f5', 'd4', 'cxd4', 'cxd4', 'Ng4+', 'Kh3', 'd5', 'Kg2', 'Ne5', 'Kf2', 'Ke8', 'Kg2', 'Nc4', 'Kf1', 'Nxa3', 'Kg2', 'Nb1', 'Kg1', 'Kd7', 'Kh2', 'Kc6', 'Kg3', 'Kc7', 'Kf2', 'Kc6', 'Kf1', 'Kb5', 'Kf2', 'Nd2', 'Ke1', 'g5', 'Kxd2', 'Ka6'],
  },
];

describe('endgame fundamentals — Wave 1 detectors fire on real legal games', () => {
  for (const { id, best, hist } of FIXTURES) {
    it(`${id} is attributed and proven`, () => {
      const out = attributePrinciples({ historySans: hist, bestSan: best, classification: 'mistake' });
      const a = out.find((x) => x.id === id);
      expect(a, `${id} not in [${out.map((x) => x.id).join(', ')}]`).toBeTruthy();
      expect(a!.evidence.moves).toContain(best);
      expect(a!.evidence.counterfactualClean).toBe(true);
      // it speaks, in the student's perspective (you/your, never we/our)
      const text = renderFundamentalVerdict([a!], { ply: hist.length, seen: new Set() });
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toMatch(/\b(we|our|us)\b/i);
    });
  }

  it('attaches nothing when the move is not flagged', () => {
    const { hist, best } = FIXTURES[0];
    expect(attributePrinciples({ historySans: hist, bestSan: best, classification: 'good' })).toEqual([]);
  });
});
