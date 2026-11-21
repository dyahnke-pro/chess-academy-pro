// ONE SAME-CLAIM RULE (U2, 2026-11-21). "Are these two facts one claim about
// one geometry" decides subsumption on every surface (CLAUDE.md G4.5.1):
// Jaccard over the coupled squares (`SAME_CLAIM_JACCARD`), within one claim
// family. The Learn door and Review's selector read `factSelector.sameClaim`;
// the lesson composer wrote its own three by hand — "same step and ANY shared
// square" (the move steps, `oneClaim`, `speaksBehindLead`), `ideaKind.sameIdea`
// and the read decider's `mergeMoveJobs` — and the read decider inlined the
// Jaccard bar beside the function. The two grains are both right (one board's
// geometry vs one move's own job: reading the composer at Jaccard says "fights
// for d4" and then "bears down on d4" on one move), so the grain is a REQUIRED
// parameter of the one rule (`ClaimGrain`), never a second copy. One
// definition now; a second fails here.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = 'src/services/factSelector.ts';
// ideaKind and readDecider are listed so their hand-written copies stay gone.
/** The deciders: what they say once is decided by subsumption. */
const DECIDERS = [
  'src/services/thoughtComposer.ts', 'src/services/readDecider.ts', 'src/services/learnTurnDoor.ts',
  'src/services/ideaKind.ts',
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}
const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('one same-claim rule', () => {
  it('only factSelector defines the overlap measure or reads its bar', () => {
    const offenders = sources('src').filter((f) => f !== HOME)
      .filter((f) => /\bfunction\s+jaccard\s*\(|\bSAME_CLAIM_JACCARD\b|\bjaccard\s*\(/.test(code(f)));
    expect(offenders).toEqual([]);
  });
  it('no decider decides "the same claim" by any shared square', () => {
    // `x.squares.some((s) => y.squares.includes(s))` is a same-claim test
    // written by hand; a decider asks `sameClaim` and names its grain
    // (`geometry` across computers and seats, `one-move` inside one move's job).
    const any = /\.squares\.some\(\((\w+)\) => [\w.?[\]]+\.squares\.includes\(\1\)\)/;
    const offenders = DECIDERS.filter((f) => any.test(code(f)));
    expect(offenders).toEqual([]);
  });
  it('every decider that subsumes reads the one rule', () => {
    for (const f of DECIDERS) {
      expect(code(f), f).toMatch(/sameClaim/);
    }
  });
});
