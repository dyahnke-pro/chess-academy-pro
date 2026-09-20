/**
 * No audit may BLOCK on a data-testid that nothing in `src/` renders.
 *
 * The calibration-bubble gate (`noDeadCalibrationBubble.test.ts`) guards ONE
 * dead selector. This is the class. A testid that has gone away fails
 * SILENTLY in an audit: the wait times out, the `.catch` swallows it, the run
 * continues, and the only symptom is wall-clock — or, worse, a false finding.
 * PLAN §C #59 ("read-position: voice fires but the banner never appears") sat
 * open for two months because `audit-read-position-prod` waited on
 * `position-narration-banner`, deleted from the app on 2026-07-10.
 *
 * Measured 2026-09-19 with this extractor: 1,695 testids rendered in src; 5
 * blocking actions (waitFor / click / fill / innerText / waitForSelector) on
 * ids nothing renders, across 3 scripts (4 ids). Those are the baseline below, and it
 * can only SHRINK. A selector in an alternation list with a live fallback is
 * NOT blamed — that is a legitimate cross-build fallback; only a lone dead id
 * that the script then acts on is.
 *
 * If an id in the baseline comes back to life, remove it from the baseline —
 * do not leave it, or the next reader cannot tell a fixed entry from a stale one.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');

function walk(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (ext.test(e.name)) out.push(p);
  }
  return out;
}

/** Every testid the app can render: literal `data-testid="x"`, the
 *  `xTestId="x"` / `testid: 'x'` prop forms, and template PREFIXES
 *  (`` `card-${id}` `` → `card-`). */
function renderedTestids(): { ids: Set<string>; prefixes: Set<string>; suffixes: Set<string> } {
  const ids = new Set<string>();
  const prefixes = new Set<string>();
  // `${testId}-modal` — a SUFFIX template: the id is a known id plus this tail.
  // Missing this made `gameplay-coaching-row-modal` (SettingsModalRow) read
  // as dead on the first measurement (2026-09-19) — the gate lying by omission.
  const suffixes = new Set<string>();
  for (const f of walk(join(ROOT, 'src'), /\.tsx?$/)) {
    if (/\.test\.tsx?$/.test(f)) continue;
    const s = readFileSync(f, 'utf-8');
    for (const m of s.matchAll(/(?:data-testid=\{?|[tT]estId\s*[:=]\s*\{?|testid:\s*)["'`]([^"'`{}$]+)["'`]/g)) ids.add(m[1]);
    for (const m of s.matchAll(/["'`]([a-z0-9]+(?:-[a-z0-9]+)*-)\$\{/g)) prefixes.add(m[1]);
    for (const m of s.matchAll(/\$\{[a-zA-Z.]+\}(-[a-z0-9]+(?:-[a-z0-9]+)*)["'`]/g)) suffixes.add(m[1]);
  }
  return { ids, prefixes, suffixes };
}

/** A lone `[data-testid="x"]` selector the script then ACTS on. */
const BLOCKING = [
  /(?:locator|\$|waitForSelector)\(\s*['"`]\[data-testid="([^"$]+)"\]['"`]\s*\)(?:\.first\(\)|\.last\(\)|\.nth\(\d+\))?\.(?:waitFor|click|fill|pressSequentially|innerText|textContent)\(/g,
  /waitForSelector\(\s*['"`]\[data-testid="([^"$]+)"\]['"`]/g,
];

// SHRINK-ONLY. Measured 2026-09-19. Fix the script (or the id) and delete the line.
const BASELINE = new Set([
  'filter-all',
  'featured-pro-openings',
  'review-full-detail-toggle',
  'coach-play-redirect',
]);

describe('no audit blocks on a testid nothing in src renders', () => {
  const { ids, prefixes, suffixes } = renderedTestids();
  const audits = walk(join(ROOT, 'scripts'), /^audit-.*\.mjs$/);
  const known = (t: string): boolean =>
    ids.has(t)
    || [...prefixes].some((p) => t.startsWith(p))
    || [...suffixes].some((sf) => t.endsWith(sf) && ids.has(t.slice(0, -sf.length)));

  it('finds the app and the fleet at all (non-vacuous)', () => {
    expect(ids.size).toBeGreaterThan(1000);
    expect(audits.length).toBeGreaterThan(200);
    // The extractor must see the prop forms, or every LessonScaffold id reads as dead.
    for (const t of ['lesson-title', 'lesson-back', 'line-player-back', 'read-position-btn', 'chat-message-assistant', 'gameplay-coaching-row-modal', 'gameplay-coaching-row-close']) expect(known(t), t).toBe(true);
  });

  it('every blocking action on a dead testid is in the shrink-only baseline', () => {
    const dead = new Map<string, Set<string>>();
    for (const f of audits) {
      const s = readFileSync(f, 'utf-8');
      for (const re of BLOCKING) for (const m of s.matchAll(re)) {
        const t = m[1];
        if (known(t)) continue;
        if (!dead.has(t)) dead.set(t, new Set());
        dead.get(t)!.add(f.replace(`${ROOT}/`, ''));
      }
    }
    const fresh = [...dead.entries()].filter(([t]) => !BASELINE.has(t)).map(([t, fs]) => `${t} ← ${[...fs].join(', ')}`);
    expect(fresh, 'a NEW blocking wait on a testid nothing renders (dead selector — see file header)').toEqual([]);
    // The baseline shrinks: an entry whose script no longer blocks on it must go.
    const stale = [...BASELINE].filter((t) => !dead.has(t));
    expect(stale, 'baseline entries no longer needed — delete them').toEqual([]);
  });
});
