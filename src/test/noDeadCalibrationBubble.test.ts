/**
 * No audit may WAIT on the strength-calibration bubble. It does not exist.
 *
 * It was deleted from the app on 2026-09-02 (David: "remove strength
 * calibration → go fully adaptive"). Nothing in `src/` renders
 * `data-testid="strength-calibration-bubble"` any more — and the audit fleet
 * went on waiting for it for two weeks, because a testid that has gone away
 * fails SILENTLY: the wait times out, the `.catch` swallows it, the run
 * continues, and the only symptom is wall-clock.
 *
 * Measured 2026-09-17 before the sweep: 159 scripts waiting, **52.6 minutes of
 * dead wall-clock per fleet run**, and two pro-rep audits
 * (`audit-pro-gothamchess-prod`, `audit-pro-naroditsky-full-9`) whose wait had
 * neither a `.catch` nor an enclosing `try` — those had been CRASHING outright
 * since the day the bubble was removed. After the sweep: 36s.
 *
 * TWO separate assertions, because they fail for different reasons:
 *
 *  1. NO WAIT. A script may still mention the testid in a comment or a CSS
 *     kill-list (`auto-dismiss.mjs` neutralises it for old builds and prod
 *     rollbacks, which is cheap and correct). What it may never do is BLOCK on
 *     it. This is the assertion that matters and it is absolute — zero.
 *  2. MENTIONS SHRINK ONLY. A baseline that can never rise, so the remaining
 *     references get cleaned up over time and no new script starts from a copy
 *     of an old one.
 *
 * If the bubble is ever brought BACK, do not weaken this — delete it and
 * restore the doctrine, so the rule and the product agree again.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const BUBBLE = 'strength-calibration-bubble';
const MENTION_BASELINE = 95;

function scripts(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scripts(p, out);
    else if (e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

describe('the strength-calibration bubble is gone (2026-09-02)', () => {
  const files = scripts(join(ROOT, 'scripts'));

  it('finds the audit fleet at all', () => {
    // Non-vacuous guard: a broken walk would otherwise report a clean sweep of
    // nothing, which is the exact failure mode this file exists to punish.
    expect(files.length).toBeGreaterThan(200);
  });

  it('no script BLOCKS on the bubble — a wait on it can only ever time out', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      if (!src.includes(BUBBLE)) continue;
      // Blame by STATEMENT, never by a character window. The first draft of
      // this gate used +/-300 chars and named 32 files, nearly all of them
      // innocent — a `waitForTimeout(1500)` two lines under a COMMENT about the
      // bubble is not waiting on the bubble. That is the same error as matching
      // "fen" inside "de-fen-se": fix the instrument, never the code it libels.
      const from = 0;
      for (let i = src.indexOf(BUBBLE); i !== -1; i = src.indexOf(BUBBLE, i + 1)) {
        const start = Math.max(src.lastIndexOf(';', i), src.lastIndexOf('{', i), from) + 1;
        const semi = src.indexOf(';', i);
        const stmt = src.slice(start, semi === -1 ? src.length : semi);
        // A comment line mentioning the bubble is not a wait on it.
        const code = stmt.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
        if (/\.waitFor\s*\(|waitForSelector\s*\(/.test(code) && code.includes(BUBBLE)) {
          offenders.push(`${f.replace(`${ROOT}/`, '')} :: ${code.trim().replace(/\s+/g, ' ').slice(0, 90)}`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('mentions only ever shrink', () => {
    const mentions = files.reduce((n, f) => n + (readFileSync(f, 'utf-8').split(BUBBLE).length - 1), 0);
    expect(mentions).toBeLessThanOrEqual(MENTION_BASELINE);
  });
});
