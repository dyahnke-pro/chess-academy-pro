#!/usr/bin/env node
/**
 * anchor-scout — which plies of a track sit on a line the repertoire teaches.
 *
 * A note off the taught line is SILENT in Watch and Learn (CLAUDE.md, the
 * anchoring rule) — it only ever fires in free play and review. Measured when
 * that rule was written: 10 of 64 hand-written notes were on a taught line.
 *
 * Finding out AFTER writing is the expensive order, because the fix is then a
 * rewrite. This prints the answer BEFORE, ply by ply, so a note can be written
 * onto a position the lesson actually walks. It never suggests moving the taught
 * line — spines are data-chosen and steering them by what we have prose for
 * would mean teaching what we can narrate instead of what the data says.
 *
 * Usage: node scripts/video-align/anchor-scout.mjs <videoId> [--all]
 */
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const [id, ...flags] = process.argv.slice(2);
if (!id) { console.error('usage: anchor-scout.mjs <videoId> [--all]'); process.exit(1); }

const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');
const taught = new Map();               // posKey -> opening name that walks it
const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
const walk = (pgn, label) => {
  const g = new Chess();
  for (const san of (pgn ?? '').split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
    try { if (!g.move(san)) break; } catch { break; }
    if (!taught.has(posKey(g.fen()))) taught.set(posKey(g.fen()), label);
  }
};
for (const r of rows) {
  walk(r?.pgn, r?.name ?? '?');
  for (const v of r?.variations ?? []) walk(v?.pgn, `${r?.name ?? '?'} — ${v?.name ?? '?'}`);
}

const path = existsSync(`data/video-pending/${id}.json`)
  ? `data/video-pending/${id}.json` : `data/video-tracks/${id}.json`;
const track = JSON.parse(readFileSync(path, 'utf8'));

// A RECORD'S `line` IS A DELTA, AND `ply` IS WHERE IT LANDS. Concatenating the
// deltas produces an illegal line the moment the lesson rewinds, because a
// rewind record carries an empty delta and a LOWER ply — the truncation is the
// whole content of that record. So the running line is cut back to
// `ply - delta.length` before the delta is appended, which reproduces both the
// forward moves and the take-backs.
let line = [];
const tOf = new Map();
const deepest = { line: [], t: 0 };
for (const m of track.moves) {
  line = line.slice(0, Math.max(0, m.ply - m.line.length)).concat(m.line);
  for (let i = 0; i < line.length; i += 1) if (!tOf.has(i + 1)) tOf.set(i + 1, m.t);
  if (line.length > deepest.line.length) { deepest.line = [...line]; deepest.t = m.t; }
}
const sans = deepest.line;

const g = new Chess();
console.log(`${id} — ${track.title ?? ''}`);
console.log(`deepest line ${sans.length} plies; ${track.moves[0].t}s -> ${track.moves[track.moves.length - 1].t}s\n`);
let onLine = 0;
sans.forEach((san, i) => {
  g.move(san);
  const hit = taught.get(posKey(g.fen()));
  if (hit) onLine += 1;
  if (!hit && !flags.includes('--all')) return;
  const num = `${Math.floor(i / 2) + 1}${i % 2 === 0 ? '.' : '...'}`;
  const t = tOf.get(i + 1);
  console.log(`  ${String(i + 1).padStart(2)} ${num.padEnd(6)} ${san.padEnd(7)} ${t != null ? `t=${String(t).padStart(6)}` : '        '}  ${hit ? `TAUGHT: ${hit}` : ''}`);
});
console.log(`\n${onLine}/${sans.length} plies sit on a taught line`);
