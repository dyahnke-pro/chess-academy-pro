/**
 * Piece-value tables only ever SHRINK toward the one home.
 *
 * 🔴 MEASURED 2026-09-21: 53 private `{ p: 1, n: 3, … }` tables across `src/`,
 * every one a local const, with NO canonical export anywhere. That is the
 * duplicated-constant rot the doctrine bans — and here it had already done
 * damage rather than merely risking it.
 *
 * The copies split 26 / 29 on the KING, and BOTH readings are correct:
 *   k: 0    MATERIAL — a king is never won, so it counts nothing.
 *   k: 100  CAPTURE  — a king must never be takeable in a SEE search.
 *
 * Two questions wearing one name. `verifyForkOnBoard` (CAPTURE) and
 * `computePlyFacts`'s inline check (MATERIAL) disagreed about whether a royal
 * fork was real on a board measured that day — the symptom that found this.
 *
 * WHY A CEILING RATHER THAN A SWEEP. Converting all 53 blind is exactly the
 * change this repo punishes: some tables omit `k` entirely, some key by
 * `pawn`/`knight`, and a few are deliberately local to a narrow calculation.
 * A blind rewrite would flip a semantic somewhere and no test would say so.
 * So this STOPS THE BLEEDING — a 54th table fails here — and the number comes
 * down as each file is converted with its own tests run. Lower the ceiling when
 * you convert; never raise it.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
/** The home itself is where the tables are ALLOWED to live. */
const HOME = 'services/pieceValues.ts';
const TABLE = /\{\s*p:\s*1,\s*n:\s*3,\s*b:\s*3,\s*r:\s*5,\s*q:\s*9|pawn:\s*1,\s*knight:\s*3,\s*bishop:\s*3/;

/** Every .ts/.tsx under src/, tests excluded (a fixture may legitimately inline one). */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (!/\.(ts|tsx)$/.test(p) || /\.test\.(ts|tsx)$/.test(p)) continue;
    out.push(p);
  }
  return out;
}

const CEILING = 51; // 53 measured, minus pvPlayback and tacticVerification (converted)

describe('piece-value tables converge on one home', () => {
  it('the home exists and names BOTH semantics', () => {
    const home = readFileSync(resolve(SRC, HOME), 'utf8');
    expect(home, 'MATERIAL_VALUE missing').toMatch(/export const MATERIAL_VALUE/);
    expect(home, 'CAPTURE_VALUE missing').toMatch(/export const CAPTURE_VALUE/);
    // The two must stay DIFFERENT — merging them is the wrong fix and would
    // silently change every SEE search in the app.
    expect(home).toMatch(/k:\s*0/);
    expect(home).toMatch(/k:\s*100/);
  });

  it('no NEW private table — the count only shrinks', () => {
    const offenders = walk(SRC)
      .filter((p) => !p.endsWith(HOME.replace('/', '/')))
      .filter((p) => TABLE.test(readFileSync(p, 'utf8')))
      .map((p) => p.slice(SRC.length + 1));

    // NON-VACUOUS: if the pattern ever stops matching, this gate would pass at
    // zero forever while 50 tables sat there. Prove it still finds them.
    expect(offenders.length, 'the scan found nothing — the pattern is broken, not the code')
      .toBeGreaterThan(10);

    expect(
      offenders.length,
      `${offenders.length} private piece-value table(s), ceiling ${CEILING}.\n` +
        'Import MATERIAL_VALUE (k:0, counting) or CAPTURE_VALUE (k:100, SEE) from ' +
        'services/pieceValues.ts instead of declaring a local one — and pick by SEMANTIC: ' +
        'does a king in your sum make the answer enormous (CAPTURE) or nothing (MATERIAL)?\n' +
        `First few: ${offenders.slice(0, 5).join(', ')}`,
    ).toBeLessThanOrEqual(CEILING);
  });
});
