import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import registry from './corpora.json';

/**
 * Gate — A BUNDLED CORPUS MAY ONLY CARRY NOTES THE APP CAN ANCHOR (2026-09-19).
 *
 * David: "no more non-positioned phrases at boot."
 *
 * `dist/index.html` modulepreloads the entry AND every `appdata-*` chunk, so a
 * `load: 'static'` corpus is 1:1 boot payload for every user — measured at
 * 32.8 MB of JS before a square is drawn. `danya-teachings.json` was 6.8 MB of
 * that and carried ZERO positioned notes, so not one of those bytes could
 * answer a position query. It rode there for weeks because nothing measured it.
 *
 * A note is anchorable iff it has its own `lineSan` or one that
 * `note-anchors.json` recovers from its prose. Anything else is reached by
 * opening NAME or by CONCEPT, and belongs in the corpus's `floatingPath` half,
 * which is fetched on demand — NOT deleted (all 10,022 of danya's are reachable
 * by a live tier; archiving them cut phase-transition coverage from 19 of 20
 * openings to 10).
 *
 * This is the "make the wrong answer impossible to express" half. A future
 * re-farm that ships un-positioned notes into a bundled corpus fails here
 * rather than silently adding megabytes to every user's first paint.
 */
describe('bundled corpus is position-only', () => {
  const root = process.cwd();
  const anchors: Record<string, string[]> =
    JSON.parse(readFileSync(resolve(root, 'src/data/note-anchors.json'), 'utf8')).anchors ?? {};
  const isPositioned = (n: { id: string; lineSan?: string[] }): boolean =>
    (Array.isArray(n.lineSan) && n.lineSan.length > 0) ||
    (Array.isArray(anchors[n.id]) && anchors[n.id].length > 0);

  const bundled = registry.corpora.filter((c) => c.load === 'static');

  it('finds a bundled corpus at all (guards the guard)', () => {
    // Zero bundled corpora would make the assertion below pass vacuously —
    // and "the corpus quietly stopped being bundled" is itself a regression
    // worth catching, since the boot-synchronous position tier is the point.
    expect(bundled.length).toBeGreaterThan(0);
  });

  it.each(bundled.map((c) => [c.key, c] as const))(
    '%s ships no un-positioned note',
    (_key, c) => {
      const notes = (
        JSON.parse(readFileSync(resolve(root, c.path), 'utf8')) as {
          notes: Array<{ id: string; lineSan?: string[] }>;
        }
      ).notes;
      expect(notes.length, 'an empty corpus would pass vacuously').toBeGreaterThan(0);
      const floating = notes.filter((n) => !isPositioned(n));
      expect(
        floating.length,
        `${c.key} bundles ${floating.length} un-positioned notes (e.g. ${floating
          .slice(0, 3)
          .map((n) => n.id)
          .join(', ')}). They belong in its floatingPath half, which is fetched.`,
      ).toBe(0);
    },
  );

  it('a corpus with a floating half declares where it lives', () => {
    for (const c of bundled) {
      const floatingPath = (c as { floatingPath?: string }).floatingPath;
      if (!floatingPath) continue;
      expect(
        () => readFileSync(resolve(root, floatingPath), 'utf8'),
        `${c.key} declares floatingPath ${floatingPath} but it is not on disk`,
      ).not.toThrow();
    }
  });
});
