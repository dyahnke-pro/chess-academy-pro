#!/usr/bin/env node
// Apply researched PGN replacements + header corrections to src/data/model-games.json
// Regenerates each criticalMoment's `fen` field from the new PGN at the stored
// (moveNumber, color) — i.e. FEN = position AFTER that side's move.
// If the moveNumber exceeds the new game's length, that critical moment is
// dropped (warning logged).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'src/data/model-games.json');

const games = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const gamesById = Object.fromEntries(games.map(g => [g.id, g]));

// Load all research outputs
const research = [];
const sources = [
  '/tmp/research-output-prefilled.json',
  '/tmp/research-output-A.json',
  '/tmp/research-output-B.json',
  '/tmp/research-output-C.json',
  '/tmp/research-output-D.json',
  '/tmp/research-output-E.json',
];
for (const s of sources) {
  if (!fs.existsSync(s)) {
    console.warn(`(skipping missing file: ${s})`);
    continue;
  }
  const arr = JSON.parse(fs.readFileSync(s, 'utf8'));
  for (const r of arr) research.push({ ...r, source: s });
}

console.log(`Loaded ${research.length} research entries`);

// Apply
const notFound = [];
const applied = [];
const warnings = [];

for (const r of research) {
  const g = gamesById[r.id];
  if (!g) { warnings.push(`Unknown id: ${r.id}`); continue; }
  if (r.status !== 'found') { notFound.push(r); continue; }

  // Validate PGN
  const tokens = r.pgn.trim().split(/\s+/);
  const chess = new Chess();
  let ok = true;
  const fensByPly = [chess.fen()];
  for (const tok of tokens) {
    let move;
    try { move = chess.move(tok); } catch { move = null; }
    if (!move) { ok = false; warnings.push(`${r.id}: PGN failed validation at "${tok}"`); break; }
    fensByPly.push(chess.fen());
  }
  if (!ok) continue;

  // Apply PGN
  g.pgn = tokens.join(' ');

  // Apply header corrections — only known ModelGame fields, skip research metadata
  const ALLOWED_FIELDS = new Set(['white', 'black', 'whiteElo', 'blackElo', 'result', 'year', 'event', 'openingId']);
  if (r.correctedHeader) {
    for (const [k, v] of Object.entries(r.correctedHeader)) {
      if (!ALLOWED_FIELDS.has(k)) continue; // skip note/openingNote/firstMoves/pgnPlies/etc.
      if (v !== undefined && v !== null && v !== '') {
        g[k] = v;
      }
    }
  }

  // Regenerate criticalMoment FENs
  const kept = [];
  for (const cm of g.criticalMoments ?? []) {
    const movePly = (cm.moveNumber - 1) * 2 + (cm.color === 'white' ? 1 : 2);
    if (movePly >= fensByPly.length) {
      warnings.push(`${r.id}: criticalMoment at move ${cm.moveNumber} ${cm.color} (ply ${movePly}) exceeds game length (${fensByPly.length - 1} plies). DROPPING.`);
      continue;
    }
    kept.push({ ...cm, fen: fensByPly[movePly] });
  }
  g.criticalMoments = kept;

  applied.push(r.id);
}

console.log(`Applied: ${applied.length}`);
console.log(`Not found: ${notFound.length}`);
console.log(`Warnings: ${warnings.length}`);
if (notFound.length) {
  console.log('\nNot found:');
  for (const r of notFound) console.log(`  ${r.id}: ${r.notes || '(no note)'}`);
}
if (warnings.length) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log(`  ${w}`);
}

// Build set of IDs to delete: any game in the original file with research status "not_found"
// or no research entry at all (still potentially broken from the audit).
const researchedIds = new Set(research.map(r => r.id));
const notFoundIds = new Set(research.filter(r => r.status === 'not_found').map(r => r.id));
const survivors = games.filter(g => !notFoundIds.has(g.id));
const deleted = games.length - survivors.length;

console.log(`\nDeleting ${deleted} not_found entries:`);
for (const id of notFoundIds) console.log(`  ✗ ${id}`);

if (process.argv.includes('--write')) {
  fs.writeFileSync(dataPath, JSON.stringify(survivors, null, 2) + '\n');
  console.log(`\nWROTE ${dataPath} — ${survivors.length} games remain`);
} else {
  console.log(`\nDRY RUN. Pass --write to persist.`);
}
