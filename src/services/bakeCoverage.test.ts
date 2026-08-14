// The registry must match what is actually on disk, in both directions.
//
// A corpus that exists but is not declared ships SILENT — not merely unbaked.
// Most of a farm is FLOATING notes (no lineSan, reached by concept or tactic
// tag), and a floating note is deliberately mute until baked, because its
// original prose names a foreign game's squares and would be false read over a
// live board. On 2026-08-14 four farms were wired into the app, counted in
// every coverage number, gated by `secondaryTeachings`, and shipped — with all
// 3,585 of their notes unable to reach a student. Nothing errored.
//
// The cause was seven hand-maintained lists; six were updated. `corpora.json`
// is now the single declaration every consumer reads, so this gate has one job:
// keep the registry honest about the files that exist.
import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import registry from '../data/corpora.json';

/** Corpora found on DISK, never from a list — a list is what failed. */
function onDisk(): string[] {
  const out: string[] = [];
  for (const dir of ['src/data', 'public/data']) {
    for (const f of readdirSync(dir)) {
      if (/-teachings\.json$/.test(f)) out.push(`${dir}/${f}`);
    }
  }
  return out.sort();
}

describe('corpus registry', () => {
  const declared = registry.corpora.map((c) => c.path).sort();
  const disk = onDisk();

  it('finds corpora at all (guards the guard)', () => {
    // Empty on either side would make every assertion below pass vacuously.
    expect(disk.length).toBeGreaterThan(0);
    expect(declared.length).toBeGreaterThan(0);
  });

  it('declares every corpus that exists on disk', () => {
    const undeclared = disk.filter((p) => !declared.includes(p));
    expect(
      undeclared,
      `these corpora exist but are not in src/data/corpora.json, so nothing — `
        + `not the loader, not the bake, not the gates — will see them: ${undeclared.join(', ')}`,
    ).toEqual([]);
  });

  it('declares nothing that is missing from disk', () => {
    const phantom = declared.filter((p) => !existsSync(p));
    expect(
      phantom,
      `declared in src/data/corpora.json but absent from disk: ${phantom.join(', ')}`,
    ).toEqual([]);
  });

  it('the bake reads the registry rather than its own list', () => {
    // The specific regression: a second, hand-maintained copy of this list.
    const bake = readFileSync('scripts/bake-spoken-notes.mjs', 'utf8');
    expect(bake).toContain('corpora.json');
    for (const p of declared) {
      expect(
        bake.includes(`'${p}'`) || bake.includes(`"${p}"`),
        `${p} is hardcoded in the bake script — it must come from the registry`,
      ).toBe(false);
    }
  });

  it('every id prefix is unique (the coach dedupes notes by id across corpora)', () => {
    const prefixes = registry.corpora.map((c) => c.idPrefix);
    expect(new Set(prefixes).size, `duplicate idPrefix in ${prefixes.join(', ')}`).toBe(prefixes.length);
  });

  it('each corpus actually uses the prefix it declares', () => {
    for (const c of registry.corpora) {
      const notes = (JSON.parse(readFileSync(c.path, 'utf8')) as { notes: Array<{ id: string }> }).notes;
      const seen = new Set(notes.slice(0, 200).map((n) => String(n.id).split('-')[0]));
      expect(
        [...seen],
        `${c.key} declares idPrefix "${c.idPrefix}" but its notes use ${[...seen].join('/')}`,
      ).toEqual([c.idPrefix]);
    }
  });

  it('exactly one corpus is primary', () => {
    expect(registry.corpora.filter((c) => c.primary)).toHaveLength(1);
  });
});
