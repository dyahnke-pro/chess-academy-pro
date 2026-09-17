#!/usr/bin/env node
/**
 * surface-map — THE PRE-BUILD CONTEXT GATE.
 *
 * David 2026-09-17, going to bed, non-negotiable: "You must gain context before
 * each build! Make that impossible to forget or bypass."
 *
 * CLAUDE.md has carried "🚨 MAP EVERY SURFACE BEFORE BUILDING" since 2026-09-08
 * and it was bypassed anyway — on 2026-09-17 a session read three bad sentences
 * off a 29-ply slice and patched three files without mapping anything. David
 * caught it: "you are not gaining context on the surface before making fixes."
 *
 * A rule in a markdown file is a CONVENTION, and this repo's own doctrine says
 * conventions rot while types and gates do not. So the rule stops being prose
 * and becomes a step in ship-check that FAILS THE PUSH.
 *
 * WHAT IT CANNOT DO: force anyone to read. What it CAN do, and does:
 *   1. The map is DERIVED FROM THE CODE, so it cannot be hand-waved. Every
 *      importer, call site, test and audit is found by walking the tree.
 *   2. `--verify` REGENERATES each map and diffs it against the committed one.
 *      A map written before the change no longer matches the code after it, so
 *      the gate proves the map is FRESH rather than taking my word for it.
 *   3. Generating it puts the blast radius — who calls this, which audit covers
 *      it, which locked rule governs it — into the session's context BEFORE the
 *      commit can land. That is the whole point: not a promise, a precondition.
 *
 * Usage:
 *   node scripts/surface-map.mjs src/services/foo.ts   # map these files
 *   node scripts/surface-map.mjs --changed             # map what this work changed
 *   node scripts/surface-map.mjs --verify              # ship-check gate
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_DIR = 'docs/surface-maps';

/**
 * WHICH FILES OWE A MAP.
 *
 * Scoped to the coach teaching spine, because that is where the shared
 * computers live: `positionFacts`, `coachDecider`, `voiceFacts`, the weakness
 * spine and the narration lanes feed review/learn/play/chat/tactics AT ONCE, so
 * a change to one reaches all of them (CLAUDE.md §MAP EVERY SURFACE). A data
 * JSON or a kid surface does not carry that blast radius and is not listed.
 */
const SURFACE_PATTERNS = [
  /^src\/components\/Coach\//,
  /^src\/coach\//,
  /^src\/hooks\/use(Teach|LiveCoach|PhaseNarration|PositionNarration|StrictNarration|WalkthroughRunner|ChessGame|DiscussionPractice)/,
  // `rating|amateur|theory` added 2026-09-17: ratingBands is THE rating→tier
  // and rating→explorer-band taxonomy (criticality, slip interjection, hint
  // register, and the band deciding whose games we quote back); amateurPlayCache
  // and theoryDeparture are its two biggest consumers and are fact producers in
  // their own right. All three carry spine blast radius and owed a map.
  /^src\/services\/(coach|narration|teaching|voice|weakness|review|tactic|position|concept|note|corpus|curated|method|fact|ply|opening|refuted|plan|grounded|mistake|drill|explain|pin|threat|importance|need|selector|decider|lookahead|dna|principle|exchange|criticality|attribut|transfer|foresight|habit|misconception|rating|amateur|theory)[A-Za-z]*\.ts$/,
];

const isSurface = (p) => SURFACE_PATTERNS.some((re) => re.test(p)) && /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p);

const slugFor = (p) => p.replace(/^src\//, '').replace(/[/]/g, '__').replace(/\.tsx?$/, '');

function git(args) {
  try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf-8' }); } catch { return ''; }
}

/** Every source file in the repo, once. */
let FILE_CACHE = null;
function allSourceFiles() {
  if (FILE_CACHE) return FILE_CACHE;
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(REPO, dir), { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) out.push(rel);
    }
  };
  for (const root of ['src', 'scripts', 'api']) {
    if (existsSync(join(REPO, root))) walk(root);
  }
  FILE_CACHE = out.sort();
  return out;
}

const readCache = new Map();
function read(p) {
  if (!readCache.has(p)) {
    try { readCache.set(p, readFileSync(join(REPO, p), 'utf-8')); } catch { readCache.set(p, ''); }
  }
  return readCache.get(p);
}

/** Exported symbols, in source order. */
function exportsOf(src) {
  const names = [];
  const re = /^export\s+(?:async\s+)?(?:default\s+)?(function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/gm;
  for (const m of src.matchAll(re)) names.push({ kind: m[1], name: m[2] });
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (n && /^[A-Za-z0-9_$]+$/.test(n)) names.push({ kind: 're-export', name: n });
    }
  }
  const seen = new Set();
  return names.filter((e) => (seen.has(e.name) ? false : seen.add(e.name)));
}

/** Files that import `target`, by module specifier ending in its basename. */
function importersOf(target) {
  const base = basename(target, extname(target));
  const hits = [];
  for (const f of allSourceFiles()) {
    if (f === target) continue;
    const src = read(f);
    if (!src.includes(base)) continue;
    const re = new RegExp(`from\\s+['"][^'"]*/${base}(\\.[a-z]+)?['"]|from\\s+['"]\\./${base}(\\.[a-z]+)?['"]`);
    if (re.test(src)) hits.push(f);
  }
  return hits;
}

/** Call sites of each exported symbol, outside its own file and its own tests. */
function callSites(target, names) {
  const out = new Map();
  for (const { name } of names) out.set(name, []);
  const wanted = names.map((n) => n.name);
  if (!wanted.length) return out;
  for (const f of allSourceFiles()) {
    if (f === target) continue;
    const src = read(f);
    if (!src) continue;
    const lines = src.split('\n');
    for (const name of wanted) {
      if (!src.includes(name)) continue;
      const re = new RegExp(`\\b${name}\\s*[(<]`);
      lines.forEach((ln, i) => {
        if (re.test(ln) && !/^\s*(\*|\/\/)/.test(ln)) out.get(name).push(`${f}:${i + 1}`);
      });
    }
  }
  return out;
}

/** Audit scripts that name the file or one of its symbols. */
function auditsFor(target, names) {
  const base = basename(target, extname(target));
  const needles = [base, ...names.map((n) => n.name)];
  return allSourceFiles()
    .filter((f) => f.startsWith('scripts/audit-'))
    .filter((f) => { const s = read(f); return needles.some((n) => s.includes(n)); });
}

/** CLAUDE.md sections that name the file or one of its symbols — the LOCKED
 *  rules that govern this surface. This is the part worth reading. */
function rulesFor(target, names) {
  const md = read('CLAUDE.md');
  if (!md) return [];
  const base = basename(target, extname(target));
  const needles = [base, ...names.map((n) => n.name)].filter((n) => n.length > 4);
  const lines = md.split('\n');
  const hits = [];
  let heading = '(top of file)';
  lines.forEach((ln, i) => {
    if (/^#{2,4}\s/.test(ln)) heading = ln.replace(/^#+\s*/, '').trim();
    const hit = needles.find((n) => ln.includes(n));
    if (hit) hits.push({ heading, line: i + 1, needle: hit });
  });
  const bySection = new Map();
  for (const h of hits) {
    if (!bySection.has(h.heading)) bySection.set(h.heading, { line: h.line, needles: new Set() });
    bySection.get(h.heading).needles.add(h.needle);
  }
  return [...bySection.entries()].map(([h, v]) => ({ heading: h, line: v.line, needles: [...v.needles].sort() }));
}

function testsFor(target) {
  const base = basename(target, extname(target));
  const dir = dirname(target);
  return allSourceFiles().filter((f) =>
    /\.test\.tsx?$/.test(f) && (f.startsWith(`${dir}/${base}.`) || f.startsWith(`${dir}/${base}`) || read(f).includes(`/${base}'`) || read(f).includes(`./${base}'`)));
}

function buildMap(target) {
  const src = read(target);
  if (!src) return null;
  const names = exportsOf(src);
  const importers = importersOf(target);
  const calls = callSites(target, names);
  const audits = auditsFor(target, names);
  const rules = rulesFor(target, names);
  const tests = testsFor(target);
  const loc = src.split('\n').length;

  const L = [];
  L.push(`# Surface map — \`${target}\``);
  L.push('');
  L.push('> GENERATED by `node scripts/surface-map.mjs`. Do not hand-edit — ship-check');
  L.push('> regenerates this and fails the push if it differs, which is how the map is');
  L.push('> proven FRESH rather than merely present. Read it before you change the file.');
  L.push('');
  L.push(`**${loc} lines · ${names.length} exports · ${importers.length} importers · ${tests.length} tests · ${audits.length} audits**`);
  L.push('');
  L.push('## Locked rules that govern this surface');
  L.push('');
  if (!rules.length) L.push('_No CLAUDE.md section names this file or its exports. That is itself worth knowing: nothing is written down, so the blast radius below is the only guide._');
  for (const r of rules) L.push(`- **${r.heading}** (CLAUDE.md:${r.line}) — names ${r.needles.map((n) => `\`${n}\``).join(', ')}`);
  L.push('');
  L.push('## Who calls in');
  L.push('');
  if (!importers.length) L.push('_Nothing imports this file. Either it is an entry point, or it is dead._');
  for (const f of importers) L.push(`- \`${f}\``);
  L.push('');
  L.push('## Exports and every call site');
  L.push('');
  if (!names.length) L.push('_No exports._');
  for (const { kind, name } of names) {
    const sites = calls.get(name) ?? [];
    L.push(`### \`${name}\` (${kind}) — ${sites.length} call site${sites.length === 1 ? '' : 's'}`);
    if (!sites.length) L.push('- _no call sites outside this file — unused, or reached only through a re-export_');
    for (const s of sites) L.push(`- \`${s}\``);
    L.push('');
  }
  L.push('## Tests');
  L.push('');
  if (!tests.length) L.push('_No test file references this module. A change here is unguarded._');
  for (const t of tests) L.push(`- \`${t}\``);
  L.push('');
  L.push('## Audits that reach it');
  L.push('');
  if (!audits.length) L.push('_No audit script names this file or its exports. Runtime behaviour here is unproven._');
  for (const a of audits) L.push(`- \`${a}\``);
  L.push('');
  return L.join('\n');
}

function changedSurfaceFiles() {
  const base = git(['merge-base', 'HEAD', 'origin/main']).trim() || 'HEAD~1';
  const names = new Set();
  for (const chunk of [git(['diff', '--name-only', base, 'HEAD']), git(['diff', '--name-only']), git(['diff', '--name-only', '--cached'])]) {
    for (const l of chunk.split('\n')) if (l.trim()) names.add(l.trim());
  }
  return [...names].filter(isSurface).filter((f) => existsSync(join(REPO, f))).sort();
}

const args = process.argv.slice(2);
mkdirSync(join(REPO, MAP_DIR), { recursive: true });

if (args[0] === '--verify') {
  const targets = changedSurfaceFiles();
  if (!targets.length) { console.log('no coach-surface files changed — nothing to map'); process.exit(0); }
  const stale = [];
  for (const t of targets) {
    const want = buildMap(t);
    const path = `${MAP_DIR}/${slugFor(t)}.md`;
    const have = existsSync(join(REPO, path)) ? readFileSync(join(REPO, path), 'utf-8') : null;
    if (have !== want) stale.push({ t, path, missing: have === null });
  }
  if (!stale.length) { console.log(`${targets.length} changed surface file(s), all maps fresh`); process.exit(0); }
  console.error('CONTEXT GATE FAILED — you changed a coach surface without a current map of it.\n');
  for (const s of stale) console.error(`  ${s.missing ? 'NO MAP' : 'STALE '}  ${s.t}  →  ${s.path}`);
  console.error('\nRun `node scripts/surface-map.mjs --changed`, READ the maps it writes, then commit them.');
  console.error('The map lists every caller, test, audit and locked rule for what you are about to change.');
  process.exit(1);
}

const targets = args[0] === '--changed' || args.length === 0 ? changedSurfaceFiles() : args.map((a) => relative(REPO, join(process.cwd(), a)));
if (!targets.length) { console.log('nothing to map'); process.exit(0); }
for (const t of targets) {
  const md = buildMap(t);
  if (!md) { console.error(`cannot read ${t}`); continue; }
  const path = `${MAP_DIR}/${slugFor(t)}.md`;
  writeFileSync(join(REPO, path), md);
  const head = md.split('\n').slice(0, 12).join('\n');
  console.log(`\n── ${t} → ${path}\n${head}\n`);
}
console.log(`\n${targets.length} map(s) written to ${MAP_DIR}/. READ THEM before you change these files.`);
