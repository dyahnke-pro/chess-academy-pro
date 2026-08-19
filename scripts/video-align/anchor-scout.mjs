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

// PRINT THE RECORDED POSITIONS, NOT A RECONSTRUCTED DEEPEST LINE.
//
// A record's `line` is a DELTA and `ply` is where it lands, so the running line
// is cut back to `ply - delta.length` before the delta is appended — that
// reproduces both the forward moves and the rewinds. But walking that to its
// deepest point and printing it ply by ply invents anchors: a lesson that jumps
// several moves at once never SETTLED on the positions in between, and
// `attach-notes` resolves a note by exact recorded key, so a note written on one
// of those intermediate plies is refused after the prose is already written.
// Three were, which is what this now prevents. Every line printed below is a key
// `attach-notes` will find.
let line = [];
const keys = [];
const seen = new Set();
for (const m of track.moves) {
  if (!m.line.length) continue;
  line = line.slice(0, Math.max(0, m.ply - m.line.length)).concat(m.line);
  const key = line.join(' ');
  if (seen.has(key)) continue;
  seen.add(key);
  keys.push({ key, sans: [...line], t: m.t });
}
const deepest = keys.reduce((a, b) => (b.sans.length > a.sans.length ? b : a), keys[0]);
const sans = deepest.sans;
const tOf = new Map();
for (const k of keys) if (!tOf.has(k.sans.length)) tOf.set(k.sans.length, k.t);
const anchorable = new Set(keys.map((k) => k.sans.length === 0 ? '' : k.key));

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
  // A ply the lesson passed through inside a multi-move jump cannot carry a
  // note: there is no recorded position to anchor it to.
  const anchor = anchorable.has(sans.slice(0, i + 1).join(' ')) ? '' : '  [no anchor]';
  console.log(`  ${String(i + 1).padStart(2)} ${num.padEnd(6)} ${san.padEnd(7)} ${t != null ? `t=${String(t).padStart(6)}` : '        '}  ${hit ? `TAUGHT: ${hit}` : ''}${anchor}`);
});
console.log(`\n${onLine}/${sans.length} plies sit on a taught line`);
