/**
 * Every server route runs as ESM on Vercel, where a relative import must name
 * its file with `.js`. Vitest resolves `./_lib/x` without it, so a missing
 * extension passes every test and crashes the route on prod (2026-10-18:
 * `/api/data-drop` failed every request with ERR_MODULE_NOT_FOUND).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API = resolve(__dirname);

function serverFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...serverFiles(p));
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts') && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

export function extensionlessImports(src: string): string[] {
  const hits: string[] = [];
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*'(\.{1,2}\/[^']+)'/g)) {
    if (!/\.(js|json|mjs)$/.test(m[1])) hits.push(m[1]);
  }
  return hits;
}

describe('server routes import relative files with .js', () => {
  it('catches the shape that crashed /api/data-drop', () => {
    expect(extensionlessImports("import { a } from './_lib/auditTraffic';")).toEqual(['./_lib/auditTraffic']);
    expect(extensionlessImports("import { a } from './_lib/auditTraffic.js';")).toEqual([]);
  });

  it('no server file imports a relative module without .js', () => {
    const offenders: string[] = [];
    for (const f of serverFiles(API)) {
      for (const spec of extensionlessImports(readFileSync(f, 'utf8'))) offenders.push(`${f.slice(API.length + 1)}: ${spec}`);
    }
    expect(offenders).toEqual([]);
  });
});
