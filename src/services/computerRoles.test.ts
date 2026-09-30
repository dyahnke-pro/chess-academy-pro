// The dual-role gate: every lane answers teach / held / broken / askable, and
// every `wired` claim names a code path that exists. `owed` only shrinks.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { COMPUTER_ROLES, owedRoles } from './computerRoles';
import { LEARN_LANES } from './learnTurnDoor';

/** Shrink-only. Lower it when an owed half is wired; never raise it. */
const OWED_CEILING = 1;

function allSource(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) allSource(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

describe('every computer is dual-use — the role table', () => {
  it('covers exactly the Learn lanes (the Record type enforces it; this proves the runtime too)', () => {
    expect(Object.keys(COMPUTER_ROLES).sort()).toEqual(Object.keys(LEARN_LANES).sort());
  });

  it('every wired claim names something that exists in production code', () => {
    const src = allSource('src').filter((p) => !p.endsWith('computerRoles.ts')).map((p) => readFileSync(p, 'utf8')).join('\n');
    const missing: string[] = [];
    for (const [lane, r] of Object.entries(COMPUTER_ROLES)) {
      for (const k of ['held', 'broken', 'askable'] as const) {
        const s = r[k];
        if (s.state !== 'wired') continue;
        const name = s.via.split(/[ (]/)[0];
        if (!new RegExp(`\\b${name}\\b`).test(src)) missing.push(`${lane}.${k}: ${s.via}`);
      }
    }
    expect(missing, 'a wired claim with no code behind it is a false green').toEqual([]);
  });

  it('every n/a carries its reason', () => {
    for (const [lane, r] of Object.entries(COMPUTER_ROLES)) {
      for (const k of ['held', 'broken', 'askable'] as const) {
        const s = r[k];
        if (s.state === 'na') expect(s.why.length, `${lane}.${k}`).toBeGreaterThan(15);
      }
    }
  });

  it(`owed halves only shrink (≤ ${OWED_CEILING})`, () => {
    const owed = owedRoles();
    expect(owed.length, owed.join('\n')).toBeLessThanOrEqual(OWED_CEILING);
  });
});
