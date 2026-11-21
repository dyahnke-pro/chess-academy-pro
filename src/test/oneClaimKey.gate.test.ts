// ONE SAY-ONCE CLAIM KEY (U2, 2026-11-21). The spoken ledger keys a claim as
// `claim:<claim>`. The voice package and the method beat each spelled that
// prefix, the second "held equal by a test" because it could not import the
// first. One builder now (`claimKey.ts`, a leaf); a second spelling fails here.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = 'src/services/claimKey.ts';
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('one claim key', () => {
  it('no file but claimKey spells the claim: ledger prefix', () => {
    const offenders = sources('src').filter((f) => f !== HOME)
      .filter((f) => /[`'"]claim:/.test(readFileSync(f, 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')));
    expect(offenders).toEqual([]);
  });
});
