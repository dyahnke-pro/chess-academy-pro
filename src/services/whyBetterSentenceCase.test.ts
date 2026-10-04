import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Review walk 2026-10-04, G2 (lichess VRUh4Qgh) 19…Nf2: "Why Bxh4 was better —
// it comes out 1 pawn better on material than Nf2. the line runs Bxh4" — the
// second sentence of the why-better join started lower-case.
describe('the why-better join starts every sentence with a capital', () => {
  it('capitalises each joined part after the first', () => {
    const src = readFileSync(resolve(__dirname, 'coachFeatureService.ts'), 'utf8');
    const at = src.indexOf('const parts = [why, proof ? `the line runs ${proof}` : null]');
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at, at + 300)).toMatch(/toUpperCase\(\)/);
  });
});
