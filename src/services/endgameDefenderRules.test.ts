import { describe, it, expect } from 'vitest';
import { DEFENDER_RULES, DEFENDER_RULE_TECHNIQUE } from './endgameDefenderRules';

describe('the defender rules, by ending class', () => {
  it('every ending the defender can hold names at least one rule; every rule is used', () => {
    const none = new Set(['pieces-vs-pawns', 'mating-material', 'complex', 'non-endgame']);
    for (const [cls, rules] of Object.entries(DEFENDER_RULES)) if (!none.has(cls)) expect(rules.length, cls).toBeGreaterThan(0);
    const used = new Set(Object.values(DEFENDER_RULES).flat());
    expect(Object.keys(DEFENDER_RULE_TECHNIQUE).filter((r) => !used.has(r as never))).toEqual([]);
  });
});
