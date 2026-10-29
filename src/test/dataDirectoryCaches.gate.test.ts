import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A DIRECTORY OF DATA FILES GETS ITS OWN CACHE AND ONE VERSION (2026-10-29).
 * The service worker's `/data/` rule is a 20-entry cache holding the masters
 * DB and the teaching corpora; a directory of small files read a piece at a
 * time (the master tree, the model-game index) would evict them all, and each
 * of its files would add a line to the per-session version file. Found when
 * the model-game index (321 files) shipped with neither.
 */
const vite = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
const dataDirs = readdirSync(join(process.cwd(), 'public/data')).filter((n) => statSync(join(process.cwd(), 'public/data', n)).isDirectory());

describe('every data directory has its own cache and one version', () => {
  it('finds the directories (not vacuous)', () => {
    expect(dataDirs).toContain('master-tree');
  });
  for (const dir of dataDirs) {
    it(`/data/${dir}/`, () => {
      const versioned = /const VERSIONED_AS_DIRECTORY = \[([^\]]*)\]/.exec(vite)?.[1] ?? '';
      expect(versioned).toContain(`'/data/${dir}/'`);
      const rule = vite.indexOf(`urlPattern: /\\/data\\/${dir}\\/`);
      const shared = vite.indexOf('urlPattern: /\\/data\\/.*\\.json$/i');
      expect(rule).toBeGreaterThan(-1);
      expect(rule).toBeLessThan(shared);
    });
  }
});
