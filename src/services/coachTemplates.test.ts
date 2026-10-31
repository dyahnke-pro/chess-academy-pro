import { describe, it, expect } from 'vitest';
import { getScenarioTemplate } from './coachTemplates';

describe('coachTemplates — the takeback reply', () => {
  it('returns a line', () => {
    expect(getScenarioTemplate('takeback_allowed', 0)).toBeTruthy();
  });

  // 🔴 THIS USED TO ASSERT "returns different results (random selection) on
  // multiple calls" — and it could not fail, because it only checked
  // `size >= 1`, which one repeated string satisfies. It encoded the ROLL as
  // the contract while proving nothing about it. Deleted rather than
  // annotated: phrasing is ROTATED on a stable key, so the same moment must
  // read the SAME way and different moments must differ.
  it('is stable for one moment and varies across moments', () => {
    const same = new Set([0, 0, 0].map((k) => getScenarioTemplate('takeback_allowed', k)));
    expect(same.size, 'the same key re-rolled — that is the defect').toBe(1);

    const across = new Set([0, 1].map((k) => getScenarioTemplate('takeback_allowed', k)));
    expect(across.size, 'consecutive keys returned one string — no variation at all')
      .toBeGreaterThan(1);
  });
});
