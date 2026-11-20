// ONE RENDERER WRITES THE TEACHING SENTENCE (CLAUDE.md rule 2): no new
// hand-written teaching sentence outside `teachingSentence.ts` — every string
// or template literal that reads as spoken English, not only `text:` fields
// (the try sentences worded by their computers escaped that). The count per
// file and in total only falls; the renderer's own are counted by the same
// rule and reported apart. Refresh (to LOWER it) with
// `node scripts/voice/sentence-templates.mjs --write`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — a plain .mjs script, no types
import { countTemplates, countRenderer, COMPOSING_SURFACES } from '../../scripts/voice/sentence-templates.mjs';

const baseline = JSON.parse(readFileSync('src/test/fixtures/sentence-templates.baseline.json', 'utf8')) as Record<string, number>;

describe('one renderer', () => {
  const now = countTemplates() as Record<string, number>;
  it('no file gains a hand-written template', () => {
    const grew = Object.entries(now).filter(([f, n]) => n > (baseline[f] ?? 0)).map(([f, n]) => `${f}: ${baseline[f] ?? 0} → ${n}`);
    expect(grew, grew.join('\n')).toEqual([]);
  });
  it('the total only falls', () => {
    const sum = (m: Record<string, number>): number => Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(now)).toBeLessThanOrEqual(sum(baseline));
  });
  it('the renderer is counted by the same rule (a moved template shows up inside it)', () => {
    expect(countRenderer() as number).toBeGreaterThan(0);
  });
  it('every composing surface is counted (none escapes)', () => {
    expect((COMPOSING_SURFACES as string[]).length).toBeGreaterThanOrEqual(18);
  });
});
