// ONE OUTPOST TEST (2026-09-26). Four computers kept a private copy with
// different rank zones; one had none, so a checking bishop in the enemy
// corner was "the h2 outpost". The test lives in services/outpost.ts.
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

describe('the outpost test has one home', () => {
  it('no source defines its own isOutpost', () => {
    const bad: string[] = [];
    for (const f of walk('src')) {
      if (f === 'src/services/outpost.ts') continue;
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/function\s+isOutpost\w*\s*\(/.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
