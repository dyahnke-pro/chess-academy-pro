// GATE: ONE SAME-CLAIM RULE (sweep 2026-11-21). Two facts are one claim only
// when their squares overlap AND they are the same kind (`factSelector.
// sameClaim`, the B12 fix: the loose bishop on e2 is not the pin through e2).
// Learn called the same function with no kind, so it merged on squares alone
// and still dropped the loose piece Review had stopped dropping. It fails when
// any caller passes no family.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('one same-claim rule', () => {
  it('no caller of sameClaim passes a fact with no kind', () => {
    const bad = files('src').filter((p) => /sameClaim\(\{[^}]*family:\s*null/.test(readFileSync(p, 'utf8')));
    expect(bad).toEqual([]);
  });
  it('every door reads the one claim family', () => {
    for (const p of ['src/services/factSelector.ts', 'src/services/learnTurnDoor.ts']) {
      expect(readFileSync(p, 'utf8')).toMatch(/family: claimFamily\(/);
    }
  });
});
