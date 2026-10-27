import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The review intro/closing are computed prose. A warm pass on them spoke the
// model's own "the facts weren't included" as the review's first line on prod
// (2026-09-24). They go through voiceFacts raw, never warm.
describe('review intro and closing are spoken raw', () => {
  const src = readFileSync(resolve(__dirname, 'coachFeatureService.ts'), 'utf8');
  const callsFor = (intent: string): string[] =>
    src.match(new RegExp(`voiceFacts\\([^)]*intent: '${intent}'[^)]*\\)`, 'g')) ?? [];
  it.each(['review-intro', 'review-closing'])('%s never asks the model to warm it', (intent) => {
    for (const c of callsFor(intent)) {
      expect(c).toContain('preferRaw: true');
      expect(c).not.toContain('warm: true');
    }
  });
  // The closing is no longer phrased at all (computed and spoken as is); the
  // intro still is, so the check above is not vacuous for it.
  it('the intro is still phrased through voiceFacts', () => {
    expect(callsFor('review-intro').length).toBeGreaterThan(0);
  });
});
