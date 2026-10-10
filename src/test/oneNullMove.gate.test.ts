/**
 * ONE NULL-MOVE RULE (census 2026-10-10). "Let the other side move now" was
 * written out by hand in dozens of places; the named copies (six flips, ten
 * `withTurn`s) disagreed on the one rule that matters — a side in check
 * cannot pass — and most built impossible boards. They all call
 * `threatOut.flipSideToMove` / `sideToMoveAs` now. The inline copies (a
 * hand-cleared en-passant field, `[3] = '-'`) are a ceiling that only
 * shrinks; a new one fails here — call the rule instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CEILING = 90;
const HOME = 'src/services/threatOut.ts';

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('one null-move rule', () => {
  it('no named flip / withTurn helper has its own rule', () => {
    const offenders: string[] = [];
    for (const f of walk('src', [])) {
      if (f === HOME) continue;
      const src = readFileSync(f, 'utf8');
      const re = /function\s+(flipTurn|withTurn|nullMove\w*|flipSide\w*)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const body = src.slice(m.index, src.indexOf('\n}\n', m.index));
        if (!/sideToMoveAs\(|flipSideToMove\(/.test(body)) offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
  it('hand-written side flips only shrink', () => {
    let n = 0;
    for (const f of walk('src', [])) {
      if (f === HOME) continue;
      n += (readFileSync(f, 'utf8').match(/\[3\] = '-'/g) ?? []).length;
    }
    expect(n).toBeLessThanOrEqual(CEILING);
  });
});
