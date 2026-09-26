// annotationKeys.json must list exactly the files in src/data/annotations/.
// The resolver trusts it to know which openings have annotations without
// importing them (they are fetched per opening since 2026-09-26). A file added
// without regenerating the list would be unreachable; a list entry with no
// file would 404. Regenerate with `node scripts/build-annotation-keys.mjs`.
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import keys from './annotationKeys.json';

describe('annotationKeys.json', () => {
  it('matches the annotation files on disk exactly', () => {
    const onDisk = readdirSync(join(__dirname, 'annotations'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
    expect(onDisk.length).toBeGreaterThan(1000);
    expect([...keys].sort()).toEqual(onDisk);
  });
});
