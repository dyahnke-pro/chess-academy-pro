// NO WHOLE-PREFERENCES WRITES (2026-10-22). A writer that copies the stored
// preferences, changes a key and writes the whole copy back undoes every
// change made since it read them — the Campaign track picked on the map was
// reverted at startup this way. Preferences are written ONLY through
// `preferencesPatch` / `changedPreferences` (src/db/profilePreferences.ts),
// which name their own keys; a profile is never `put` whole from a copy.
// Scanned per statement with comments stripped.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('preferences are written key by key, never whole', () => {
  const offenders: string[] = [];
  for (const file of files(SRC)) {
    const src = strip(readFileSync(file, 'utf8'));
    for (const stmt of src.split(';')) {
      const at = relative(SRC, file);
      if (/db\.profiles\.(update|put)\(/.test(stmt) && /\bpreferences\s*[:,}]/.test(stmt) && !/preferencesPatch|changedPreferences/.test(stmt)) offenders.push(`${at}: ${stmt.trim().slice(0, 120)}`);
      if (/db\.profiles\.put\(/.test(stmt)) offenders.push(`${at}: a whole-profile put — ${stmt.trim().slice(0, 100)}`);
      if (/updateProfile\([^)]*\{\s*preferences\s*:/.test(stmt)) offenders.push(`${at}: ${stmt.trim().slice(0, 120)}`);
    }
  }
  it('no writer replaces the whole preferences object or puts a whole profile', () => {
    expect(offenders).toEqual([]);
  });
});
