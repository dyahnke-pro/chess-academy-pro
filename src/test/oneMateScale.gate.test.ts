// ONE MATE SCALE (2026-11-18): seven files kept a private MATE_CP, two of them
// at 10,000 and five at 100,000. The scale lives in `mateScale.ts`; no other
// file may declare its own.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe('one mate scale', () => {
  it('only mateScale.ts declares a mate score', () => {
    const offenders = walk('src').filter((p) => !p.endsWith('mateScale.ts'))
      .filter((p) => /\b(?:const|let|var)\s+MATE_(?:CP|SCORE)\s*=\s*\d/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
