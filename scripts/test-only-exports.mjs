#!/usr/bin/env node
// test-only-exports — every exported VALUE in src/ that no production code
// reads (G8.5: built but not wired). An export whose only reference outside
// its own definition is a test is parked, not shipped. Types are out of scope
// (they cost nothing at runtime and a type-only export is often a contract).
//
// "Production" = every non-test source the app, the API, the workers or the
// scripts run: src/, api/, scripts/, workers/ and root configs, minus tests,
// src/test/ and __fixtures__. Comments are stripped before counting, so a
// comment naming a function never keeps it alive.
//
//   node scripts/test-only-exports.mjs            # list
//   node scripts/test-only-exports.mjs --json     # machine-readable
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

// Run from the repo root (npm scripts and vitest both are); vitest rewrites
// `import.meta.url`, so the module's own location is not reliable there.
const ROOT = `${process.cwd()}/`;
const PROD_DIRS = ['src', 'api', 'scripts', 'workers'];
const ROOT_FILES = ['vite.config.ts', 'vitest.config.ts', 'capacitor.config.ts', 'index.html'];
const SRC_EXT = /\.(ts|tsx|mjs|js|cjs|mts)$/;

const isTestPath = (p) =>
  /\.(test|spec)\.[cm]?[tj]sx?$/.test(p) || /(^|\/)src\/test\//.test(p) || /__fixtures__\//.test(p) || /(^|\/)e2e\//.test(p);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (SRC_EXT.test(name) || name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Strip comments, keeping strings intact enough for word counting. */
export function stripComments(src) {
  let out = '';
  let i = 0;
  let last = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      out += src.slice(last, i);
      while (i < src.length && src[i] !== '\n') i += 1;
      last = i;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      out += src.slice(last, i);
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      last = i;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    i += 1;
  }
  return out + src.slice(last);
}

const EXPORT_RE = /^export\s+(?:async\s+)?(?:function\*?|const|let|class|enum)\s+([A-Za-z_$][\w$]*)/gm;

export function scan() {
  const prodFiles = [
    ...PROD_DIRS.flatMap((d) => walk(join(ROOT, d))),
    ...ROOT_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
  ].filter((p) => !isTestPath(relative(ROOT, p)));
  const counts = new Map();
  const texts = new Map();
  for (const f of prodFiles) {
    const text = stripComments(readFileSync(f, 'utf8'));
    texts.set(f, text);
    for (const w of text.match(/[A-Za-z_$][\w$]*/g) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const unused = [];
  for (const f of prodFiles) {
    const rel = relative(ROOT, f);
    if (!rel.startsWith('src/') || !/\.tsx?$/.test(rel)) continue;
    for (const m of texts.get(f).matchAll(EXPORT_RE)) {
      const name = m[1];
      // The definition itself is one occurrence; anything more is a reader.
      if ((counts.get(name) ?? 0) <= 1) unused.push({ file: rel, name });
    }
  }
  // Whole modules no production file names in an import.
  const imported = new Set();
  for (const text of texts.values()) {
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"\n]+)['"]/g)) {
      imported.add(basename(m[1]).replace(/\.(tsx?|js|mjs)$/, ''));
    }
  }
  const deadModules = [];
  for (const f of prodFiles) {
    const rel = relative(ROOT, f);
    if (!rel.startsWith('src/') || !/\.tsx?$/.test(rel) || /\/(main|vite-env\.d)\.tsx?$/.test(rel) || rel.endsWith('.d.ts')) continue;
    if (!imported.has(basename(rel).replace(/\.tsx?$/, ''))) deadModules.push(rel);
  }
  return { unused, deadModules };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = scan();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  console.log(`dead modules (${r.deadModules.length}):`);
  for (const m of r.deadModules) console.log(`  ${m}`);
  console.log(`exports with no production reader (${r.unused.length}):`);
  for (const u of r.unused) console.log(`  ${u.file}  ${u.name}`);
}
