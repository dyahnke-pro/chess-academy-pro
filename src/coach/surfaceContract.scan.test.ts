// THE SURFACE-TABLE GATE (unified-coach N4, invariants 1, 2 and 4 of
// docs/plans/2026-09-15-one-coach-need-selector.md §3.0):
//   1. every CoachSurface is declared in SURFACE_CONTRACT (exhaustive);
//   2. no surface file hard-codes a register — `renderThesis(x, '<literal>')`
//      outside the selector is a surface deciding its own voice;
//   3. no surface file (components / hooks) calls a fact-computer for narration
//      directly — the selector is the only narration caller. The one
//      pre-existing call is a SHRINK-ONLY baseline; never add to it.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SURFACE_CONTRACT, COACH_SURFACES } from './surfaceContract';

const ROOT = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** The union members of `CoachSurface`, read from the source so the runtime
 *  list cannot drift from the type. */
function unionMembers(): string[] {
  const src = readFileSync(join(ROOT, 'coach/types.ts'), 'utf8');
  const m = /export type CoachSurface =([\s\S]*?);/.exec(src);
  if (!m) throw new Error('CoachSurface union not found');
  return [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
}

describe('surface table — exhaustive, the only place a surface differs', () => {
  it('every CoachSurface is declared, and nothing else is', () => {
    const union = unionMembers().sort();
    expect(Object.keys(SURFACE_CONTRACT).sort()).toEqual(union);
    expect([...COACH_SURFACES].sort()).toEqual(union);
  });
  it('review withholds the thesis until the answer; play speaks at transitions only; teach is present tense', () => {
    expect(SURFACE_CONTRACT.review).toEqual({ register: 'retrospective', withholds: 'thesis-until-answer', speaks: 'always' });
    expect(SURFACE_CONTRACT['phase-narration'].speaks).toBe('transitions-only');
    expect(SURFACE_CONTRACT.teach.register).toBe('present');
  });
});

describe('source scan — no surface decides its own voice', () => {
  const surfaceFiles = [...walk(join(ROOT, 'components')), ...walk(join(ROOT, 'hooks'))];

  it('no literal register in renderThesis() outside the selector', () => {
    const offenders: string[] = [];
    for (const f of [...surfaceFiles, ...walk(join(ROOT, 'services'))]) {
      if (f.endsWith('teachingSelector.ts')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/renderThesis\([^)]*'(retrospective|present)'/g)) offenders.push(`${f.replace(ROOT, 'src')}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  // SHRINK-ONLY baseline (CLAUDE.md sealed-gates rule): the ceiling may go
  // down when a call is routed through the selector; it may never go up.
  const FACT_COMPUTERS = ['turningPointCandidates(', 'landedTacticTeaching(', 'buildCausalChain(', 'structurePlan(', 'computeNeed(', 'refutedAlternative(', 'foldPlans('];
  const BASELINE_CEILING = 1; // CoachTeachPage.tsx: buildCausalChain (pre-N1 live-commentary chain)

  it(`components/hooks call the fact-computers directly at most ${BASELINE_CEILING} time(s)`, () => {
    const hits: string[] = [];
    for (const f of surfaceFiles) {
      const src = readFileSync(f, 'utf8');
      for (const fn of FACT_COMPUTERS) {
        let idx = src.indexOf(fn);
        while (idx !== -1) {
          // an import line is not a call
          const lineStart = src.lastIndexOf('\n', idx) + 1;
          const line = src.slice(lineStart, src.indexOf('\n', idx));
          if (!/^\s*import\b/.test(line)) hits.push(`${f.replace(ROOT, 'src')}: ${fn}`);
          idx = src.indexOf(fn, idx + 1);
        }
      }
    }
    expect(hits.length, hits.join('\n')).toBeLessThanOrEqual(BASELINE_CEILING);
  });
});
