/**
 * Opening-tab content-consistency gate (Phase 0 of the content-fix plan,
 * docs/plans/2026-06-25-opening-content-audit-fixes.md).
 *
 * Each detector returns a set of violation keys; the gate asserts the CURRENT
 * set exactly equals the recorded baseline. The baseline can only SHRINK — a
 * NEW violation fails the build, and fixing a violation requires removing its
 * key from the baseline in the same commit. Goal: every category → [].
 */
import { describe, it, expect } from 'vitest';
import { detectAllViolations } from './contentConsistency';
import baseline from './contentConsistency.baseline.json';

describe('opening content consistency (shrinking baseline → 0)', () => {
  const current = detectAllViolations();

  for (const category of Object.keys(current)) {
    it(`${category}: no new violations beyond the baseline`, () => {
      const now = [...current[category]].sort();
      const allowed = [...(((baseline as Record<string, string[]>)[category]) ?? [])].sort();

      const introduced = now.filter((k) => !allowed.includes(k));
      const fixedButStillBaselined = allowed.filter((k) => !now.includes(k));

      // Hard fail on any NEW violation.
      expect(introduced, `NEW ${category} violations — fix the content or they regress`).toEqual([]);
      // Keep the baseline honest: once fixed, prune the key (baseline only shrinks).
      expect(fixedButStillBaselined, `${category} entries fixed but still in baseline — prune them`).toEqual([]);
    });
  }
});
