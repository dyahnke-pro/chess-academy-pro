import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Narration unification step 6: the deep-threat passes read the POOL, but they
// used to sit behind an unbounded wait on the one-at-a-time singleton chain
// (better line, threat confirmation). On a long game the 75s cap fired first
// and every deep line vanished together. Each wait on the chain is bounded.
describe('review deep threats are never starved by the singleton chain', () => {
  it('no composer waits on the singleton chain without a deadline', () => {
    const src = readFileSync(join(__dirname, 'coachFeatureService.ts'), 'utf8');
    expect(src).not.toMatch(/await\s+(betterDone|confirmDone)\.promise/);
    expect(src).toMatch(/raceTimeout\(betterDone\.promise/);
    expect(src).toMatch(/raceTimeout\(confirmDone\.promise/);
  });
});
