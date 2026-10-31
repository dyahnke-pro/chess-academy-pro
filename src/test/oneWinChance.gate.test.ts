/**
 * ONE WIN-CHANCE CONVERTER (WO-STORY-MATRIX-01 P1-2, 2026-10-30). Lichess's
 * curve was written out three times (accuracy, the turning points, the
 * human-move model), each with its own copy of the slope, and "a line's value
 * from one seat" five more times, each with its own mate constant. They read
 * `winChance.ts` now (the rot rule, David 2026-09-08: "FIX ANY PROBLEMS LIKE
 * THIS WHEN YOU COME ACROSS THEM").
 *
 * 1. The slope lives in the leaf alone — a fourth copy fails here.
 * 2. The private mate folds that remain (`mate > 0 ? 100000 : -100000` and its
 *    spellings) are a ceiling that only shrinks. Two of them fold the mate
 *    DISTANCE in (`decisiveReason`, `moveIntent`) and are a different read; the
 *    rest are the same fold and move to the leaf as their files are touched.
 *    A new one fails here — call `seatCp` / `moverCp` instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = join('src', 'services', 'winChance.ts');
const CEILING = 15;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Comments blanked, line numbers kept: a comment naming the slope is not a copy. */
function codeLines(src: string): string[] {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'));
}

const sources = (): string[] => [...walk('src', []), ...walk('api', [])].filter((f) => f !== HOME);

describe('one win-chance converter', () => {
  it('the curve\'s slope lives in winChance.ts alone', () => {
    const copies: string[] = [];
    for (const f of sources()) {
      codeLines(readFileSync(f, 'utf8')).forEach((l, i) => {
        if (/0\.00368208/.test(l)) copies.push(`${f}:${i + 1}`);
      });
    }
    expect(copies, copies.join('\n')).toEqual([]);
  });

  it('private mate folds only shrink', () => {
    const folds: string[] = [];
    for (const f of sources()) {
      codeLines(readFileSync(f, 'utf8')).forEach((l, i) => {
        if (/\bmate\s*>\s*0\s*\?\s*\(?\s*(?:MATE\w*|\d[\d_]{4,})/.test(l)) folds.push(`${f}:${i + 1}`);
      });
    }
    expect(folds.length, folds.join('\n')).toBeLessThanOrEqual(CEILING);
  });
});
