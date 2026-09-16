/**
 * Every blocking card the review scrolls into view must EXIST.
 *
 * `review-turning-card` sat in the scroll-into-view selector list while the
 * rendered testid was `review-turning-point-card` — so the one card that blocks
 * the walk, and that withholds the selector's thesis until the student answers
 * it, was the only card never brought on-screen. On desktop it opened below the
 * fold inside the middle scroller: the exact "thin sliver below the board"
 * failure the effect was written to prevent.
 *
 * A string duplicated in two places drifts. This makes the drift impossible to
 * reopen: the selector list and the rendered attributes are read out of the same
 * file and compared.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(process.cwd(), 'src/components/Coach/CoachGameReview.tsx'), 'utf8');

/** The ids listed inside the scroll-the-open-card-into-view selector array. */
function scrollSelectorIds(): string[] {
  const start = SRC.indexOf('const card = container.querySelector(');
  expect(start).toBeGreaterThan(-1);
  const block = SRC.slice(start, SRC.indexOf('].join(\', \')', start));
  return [...block.matchAll(/'\[data-testid="([^"]+)"\]'/g)].map((m) => m[1]);
}

/** Every testid the component actually renders. */
function renderedIds(): Set<string> {
  return new Set([...SRC.matchAll(/data-testid=["'`]([a-z0-9-]+)["'`]/gi)].map((m) => m[1]));
}

describe('review card scroll-into-view selectors', () => {
  it('lists at least the blocking cards', () => {
    const ids = scrollSelectorIds();
    expect(ids.length).toBeGreaterThanOrEqual(13);
    expect(ids).toContain('review-turning-point-card');
    expect(ids).toContain('review-find-shot-card');
  });

  it('every selector matches a testid the component renders', () => {
    const rendered = renderedIds();
    const missing = scrollSelectorIds().filter((id) => !rendered.has(id));
    expect(missing, `selector ids with no rendered data-testid: ${missing.join(', ')}`).toEqual([]);
  });
});
