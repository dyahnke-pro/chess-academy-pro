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
import { countCoaching, countRenderer, COMPOSING_SURFACES, classOf } from '../../scripts/voice/sentence-templates.mjs';

const baseline = JSON.parse(readFileSync('src/test/fixtures/sentence-templates.baseline.json', 'utf8')) as Record<string, number>;

describe('one renderer', () => {
  // Only the COACHING class is gated (a computer's fact worded outside the
  // renderer); locked lines, course content, UI, dev and kid copy are
  // counted by the script and reported, never held here.
  const now = countCoaching() as Record<string, number>;
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
  it('a mixed or unknown file is coaching — nothing escapes the gate by class', () => {
    expect(classOf('src/services/someNewComputer.ts') as string).toBe('coaching');
    expect(classOf('src/services/groundedAnswer.ts') as string).toBe('coaching');
  });
  it('every composing surface is counted (none escapes)', () => {
    expect((COMPOSING_SURFACES as string[]).length).toBeGreaterThanOrEqual(18);
  });
});
