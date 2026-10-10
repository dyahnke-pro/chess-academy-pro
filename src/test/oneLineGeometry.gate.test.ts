/**
 * ONE LINE GEOMETRY (census 2026-10-10). Three tactic detectors each kept a
 * copy of the ray helpers and the discovery test; the copies drifted (the
 * missed-tactic copy read through a piece moving along its own line, so a
 * discovery that never happened was filed as a miss). They live in
 * `services/lineGeometry.ts` now; a new private copy fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = 'src/services/lineGeometry.ts';
/** The kids' bishop game: its own `{file, rank}` board math for a sandbox,
 *  never a claim the coach makes about a position. */
const EXEMPT = new Set(['src/utils/bishopGameUtils.ts']);
const COPY = /function\s+(traceRay|squareToCoords|coordsToSquare|discoveryRevealed)\s*\(/;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('one line geometry', () => {
  it('ray helpers and the discovery test live only in lineGeometry', () => {
    const offenders = walk('src', [])
      .filter((f) => f !== HOME && !EXEMPT.has(f))
      .filter((f) => COPY.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
