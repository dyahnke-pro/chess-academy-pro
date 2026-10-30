import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// A LOCAL PACKAGE THAT SHIPS ES MODULES SAYS SO (2026-10-30). The native
// Stockfish plugin's entry is ES module code (`import`/`export`), but its
// package.json carried no `"type": "module"`, so Node read the file as
// CommonJS and every node script whose imports reach the engine died at load
// ("does not provide an export named 'StockfishNative'") — the opening-plan
// coverage tool among them (gamesCourse → pvPlayback → stockfishEngine). Vite
// and vitest guess the format from the syntax and never saw it.
const ROOT = join(__dirname, '..', '..', 'native-plugins');
const ESM_SYNTAX = /^\s*(import|export)\s/m;

const packages = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, d.name, 'package.json')))
  .map((d) => {
    const dir = join(ROOT, d.name);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; main?: string; type?: string };
    const entry = pkg.main ? join(dir, pkg.main) : null;
    const esm = entry !== null && entry.endsWith('.js') && existsSync(entry) && ESM_SYNTAX.test(readFileSync(entry, 'utf8'));
    return { name: pkg.name, type: pkg.type, esm };
  });

describe('a local package whose entry is ES module code declares "type": "module"', () => {
  it('finds the local packages (never passes on an empty list)', () => {
    expect(packages.some((p) => p.name === 'capacitor-stockfish-native' && p.esm)).toBe(true);
  });

  it.each(packages.filter((p) => p.esm))('$name', ({ type }) => {
    expect(type).toBe('module');
  });
});
