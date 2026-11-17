import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** THE BEGINNER REGISTER HAS ONE SWITCH (WO-SPEEDRUN-01 S5): every surface that
 *  speaks in it reads `beginnerRegister` (through its loader or hook). A
 *  register picked off the rating tier — chat's old `coreRatingTier(...) ===
 *  'beginner'` — is a second rule that never reads the record. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

describe('one beginner-register switch', () => {
  it('no surface picks the register off the rating tier', () => {
    const offenders = files('src').filter((p) => !p.endsWith('services/beginnerRegister.ts'))
      .filter((p) => /coreRatingTier\([^)]*\)\s*===\s*'beginner'/.test(readFileSync(p, 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')));
    expect(offenders).toEqual([]);
  });
  it('the old self-report switch is gone', () => {
    const offenders = files('src').filter((p) => /\bisBeginnerMode\b/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
