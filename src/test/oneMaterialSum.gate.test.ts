/**
 * ONE SIDE-MATERIAL SUM (census 2026-10-10). Five files kept a private
 * `material(chess, color)` with its own loop and table; they read
 * `pieceValues.sideMaterial` now. A new private sum fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('one side-material sum', () => {
  it('every private material(board, color) reads sideMaterial', () => {
    const offenders: string[] = [];
    for (const f of walk('src', [])) {
      const src = readFileSync(f, 'utf8');
      const re = /function\s+material\s*\(\s*\w+\s*:\s*(?:Chess|Board)\s*,/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const body = src.slice(m.index, src.indexOf('\n}\n', m.index));
        // A signature string (endgameTechnique) is a different claim.
        if (/:\s*string\s*\{/.test(body.split('\n')[0])) continue;
        if (!/sideMaterial\(/.test(body)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
