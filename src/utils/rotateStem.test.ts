import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { rotateStem } from './rotateStem';

describe('rotateStem — varied, but ROTATED, not rolled', () => {
  const stems = ['a', 'b', 'c'];

  it('is a pure function of the key — the property Math.random destroys', () => {
    // Resume-safety in one assertion: the same moment always says the same
    // thing, so reopening a review does not re-voice it differently.
    expect(rotateStem(stems, 7)).toBe(rotateStem(stems, 7));
  });

  it('actually varies across consecutive keys', () => {
    // A roll repeats by chance — the complaint that opened this was one stem
    // firing three times in a five-ply run. A rotation structurally cannot.
    expect([0, 1, 2].map((k) => rotateStem(stems, k))).toEqual(['a', 'b', 'c']);
  });

  it('survives a negative key rather than indexing off the array', () => {
    expect(rotateStem(stems, -1)).toBe('b');
    expect(rotateStem(stems, -4)).toBe('b');
  });

  it('survives a fractional key', () => {
    expect(rotateStem(stems, 4.9)).toBe('b');
  });

  it('returns empty rather than undefined for an empty list', () => {
    expect(rotateStem([], 3)).toBe('');
  });
});

// ─── THE SWEEP ───────────────────────────────────────────────────────────────
// Fixing the six sites that were found is a spot-fix; this is what stops a
// seventh. `Math.random` is legitimate in exactly two places — the OPPONENT's
// move choice (deliberately random, CLAUDE.md's three tiers) and non-narration
// machinery like ids and puzzle sampling — so this scans the NARRATION services
// only and holds them at zero.
describe('no narration service rolls its phrasing', () => {
  // Services whose job is to produce SPOKEN TEXT. Listed explicitly rather than
  // scanned by heuristic: a heuristic would either miss a renamed file or drag
  // in the puzzle sampler and force a false exemption.
  const NARRATION_SERVICES = [
    'coachTemplates.ts',
    'endgameRecapService.ts',
    'tacticNarrationService.ts',
    'methodBeat.ts',
  ];

  for (const f of NARRATION_SERVICES) {
    it(`${f} rotates its stems instead of rolling them`, () => {
      const src = readFileSync(join('src/services', f), 'utf8');
      const hits = src.split('\n')
        .map((l, i) => ({ l, i: i + 1 }))
        .filter(({ l }) => /Math\.random/.test(l) && !/^\s*(\/\/|\*)/.test(l));
      expect(
        hits.map((h) => `${f}:${h.i} ${h.l.trim()}`),
        'a rolled stem is not resume-safe and not testable — key it on the ply/index instead',
      ).toEqual([]);
    });
  }

  it('the rotation helper itself has no second copy', () => {
    // `methodBeat` had the idiom first; a fourth hand-written copy is how the
    // duplicated-constant rot starts. One helper, imported.
    const copies: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(p) || /\.test\.tsx?$/.test(p)) continue;
        if (p.endsWith('rotateStem.ts')) continue;
        const src = readFileSync(p, 'utf8');
        if (/\[Math\.abs\([A-Za-z]+\)\s*%\s*[A-Za-z]+\.length\]/.test(src)) copies.push(p);
      }
    };
    walk('src');
    // methodBeat's private `pick` is the original and is allowed to stay until
    // it is migrated; nothing NEW may add one.
    expect(copies.filter((p) => !p.endsWith('methodBeat.ts'))).toEqual([]);
  });
});
