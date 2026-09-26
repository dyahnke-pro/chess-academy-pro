// ONE READING OF DEVELOPMENT (2026-09-26). Fifteen computers kept a private
// copy of the starting squares and they disagreed about a knight on f1. The
// table lives in `services/development.ts`; a second copy reopens the split.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

// A pair of home squares written side by side is the fingerprint of a copy.
const COPY = /'(?:b1', ?'g1|b8', ?'g8|c1', ?'f1|c8', ?'f8)'/;
// Level data for a kid mini-game places pieces on those squares on purpose.
const ALLOWED = new Set(['src/services/development.ts', 'src/data/rowClearerLevels.ts']);

describe('starting squares have one home', () => {
  it('no source keeps its own copy of the minor-piece home squares', () => {
    const bad: string[] = [];
    for (const f of walk('src')) {
      if (ALLOWED.has(f)) continue;
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (COPY.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
