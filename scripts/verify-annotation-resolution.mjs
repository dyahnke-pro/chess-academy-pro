#!/usr/bin/env node
/**
 * scripts/verify-annotation-resolution.mjs
 *
 * Four-part openings-tab data integrity check:
 *
 *   1. PRO_SUFFIX_TO_BASE: every value resolves to a real `*.json`.
 *   2. LEGACY_ID_TO_BASE:  every value resolves to a real `*.json`.
 *   3. Reachability:       every entry in repertoire.json and
 *      gambits.json has a resolvable annotation (via direct match,
 *      legacy-id map, or pro-suffix map). Pro-repertoires.json
 *      already audited under part 1's suffix set.
 *   4. NAME_ALIASES:       every value in
 *      openingDetectionService.NAME_ALIASES is a real entry name
 *      in openings-lichess.json — typed shortcuts that no longer
 *      resolve to a DB row return null silently.
 *
 * Exit 1 + report mismatches when any check fails.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const ANNOTATIONS_DIR = join(REPO, 'src/data/annotations');
const SERVICE_PATH = join(REPO, 'src/services/annotationService.ts');
const DETECT_PATH = join(REPO, 'src/services/openingDetectionService.ts');

const src = readFileSync(SERVICE_PATH, 'utf8');
const detectSrc = readFileSync(DETECT_PATH, 'utf8');
const annotationKeys = new Set(
  readdirSync(ANNOTATIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, '')),
);

function parseSingleQuotedMap(source, varName) {
  const start = source.indexOf(varName);
  if (start < 0) return {};
  const open = source.indexOf('{', start);
  const close = source.indexOf('};', open);
  const body = source.slice(open + 1, close);
  const out = {};
  for (const m of body.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function parseNameAliasesMap(source, varName) {
  // NAME_ALIASES values often contain apostrophes ("Queen's
  // Gambit"), so the file alternates between single + double
  // quotes per entry. Accept both quote flavours per side.
  const start = source.indexOf(varName);
  if (start < 0) return {};
  const open = source.indexOf('{', start);
  const close = source.indexOf('};', open);
  const body = source.slice(open + 1, close);
  const out = {};
  const re = /(['"])([^'"]+)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out[m[2]] = m[4];
  }
  return out;
}

const PRO_SUFFIX_TO_BASE = parseSingleQuotedMap(src, 'PRO_SUFFIX_TO_BASE');
const LEGACY_ID_TO_BASE = parseSingleQuotedMap(src, 'LEGACY_ID_TO_BASE');
const NAME_ALIASES = parseNameAliasesMap(detectSrc, 'NAME_ALIASES');

const errors = [];

// Part 1 — PRO_SUFFIX_TO_BASE
for (const [suffix, base] of Object.entries(PRO_SUFFIX_TO_BASE)) {
  if (!annotationKeys.has(base)) {
    errors.push(`PRO_SUFFIX_TO_BASE['${suffix}'] → '${base}' missing`);
  }
}

// Part 2 — LEGACY_ID_TO_BASE
for (const [legacy, base] of Object.entries(LEGACY_ID_TO_BASE)) {
  if (!annotationKeys.has(base)) {
    errors.push(`LEGACY_ID_TO_BASE['${legacy}'] → '${base}' missing`);
  }
}

// Part 3 — reachability for repertoire + gambits via resolver chain
function resolves(id) {
  if (annotationKeys.has(id)) return true;
  const legacy = LEGACY_ID_TO_BASE[id];
  if (legacy && annotationKeys.has(legacy)) return true;
  const proMatch = /^pro-[a-z]+-(.+)$/.exec(id);
  if (proMatch) {
    const base = PRO_SUFFIX_TO_BASE[proMatch[1]];
    if (base && annotationKeys.has(base)) return true;
  }
  const stripped = id.replace(/^[a-e]\d{2}-/, '');
  if (stripped !== id && annotationKeys.has(stripped)) return true;
  return false;
}

function auditList(jsonRelPath, label, accessor = (j) => j) {
  const data = accessor(
    JSON.parse(readFileSync(join(REPO, jsonRelPath), 'utf8')),
  );
  for (const entry of data) {
    if (!resolves(entry.id)) {
      errors.push(`${label}: '${entry.id}' unreachable (${entry.name})`);
    }
  }
}

auditList('src/data/repertoire.json', 'Repertoire');
auditList('src/data/gambits.json', 'Gambits');
auditList('src/data/pro-repertoires.json', 'Pro', (j) => j.openings);

// Part 4 — NAME_ALIASES → openings-lichess.json name presence
const lichessNames = new Set(
  JSON.parse(
    readFileSync(join(REPO, 'src/data/openings-lichess.json'), 'utf8'),
  ).map((r) => r.name),
);
for (const [alias, canonical] of Object.entries(NAME_ALIASES)) {
  if (!lichessNames.has(canonical)) {
    errors.push(
      `NAME_ALIASES['${alias}'] → '${canonical}' (not in openings-lichess.json)`,
    );
  }
}

if (errors.length === 0) {
  const proCount = Object.keys(PRO_SUFFIX_TO_BASE).length;
  const legacyCount = Object.keys(LEGACY_ID_TO_BASE).length;
  const aliasCount = Object.keys(NAME_ALIASES).length;
  console.log(
    `Openings-tab integrity OK: ${proCount} pro suffixes + ${legacyCount} legacy IDs + ${aliasCount} name-aliases all resolve; every repertoire/gambit/pro entry reaches an annotation file.`,
  );
  process.exit(0);
}

console.error(`Openings-tab integrity: ${errors.length} problems`);
for (const e of errors) console.error('  ' + e);
process.exit(1);
