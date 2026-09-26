// ONE WORDING FOR A LIST OF FILES (walk 900, 2026-09-26: "the b, c-file" was
// read aloud as "the bishop, c-file"). Lists of files go through
// `utils/andList.fileList`; a hand-joined list reopens the defect.
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

describe('file lists are worded by fileList, never hand-joined', () => {
  it('no source joins file letters straight into "-file"', () => {
    const bad: string[] = [];
    for (const f of walk('src')) {
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (/join\([^)]*\)\}-files?\b/.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
