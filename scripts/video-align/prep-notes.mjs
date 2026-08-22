#!/usr/bin/env node
/**
 * prep-notes — everything a hand-writer needs to rewrite a lesson LINE-FOR-LINE.
 *
 * `note-anchors` prints the anchorable positions, their video-order `line`, the
 * taught-line label and the captions — but not the FEN, and the FEN is what you
 * check every board claim against before writing a word (CLAUDE.md: verify with
 * chess.js FIRST). This prints, per settled + un-noted + teaching position: the
 * exact video-order line to put in `line`, whether it sits ON a taught
 * repertoire line (Watch/Learn value) or off it (free-play/review), the FEN, and
 * the paired caption (reference only — the shipped prose is original).
 *
 * It is a READING aid, not a writer: it generates no prose and makes no claims.
 * The notes are still hand-written per David's standard ("you do this, not the
 * LLM").
 *
 * Skips: positions already carrying a note ([HAS NOTE] by FEN), banter/empty
 * captions (<12 words), and tracker-lost overflow windows (>280 words).
 *
 * Usage: node scripts/video-align/prep-notes.mjs <videoId>
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const posKey = (f) => f.split(' ').slice(0, 2).join(' ');

const noted = new Set();
for (const f of readdirSync('data/video-notes').filter((x) => x.endsWith('.json'))) {
  for (const n of JSON.parse(readFileSync('data/video-notes/' + f, 'utf8'))) {
    const g = new Chess();
    let ok = true;
    for (const s of n.line.split(' ')) { try { if (!g.move(s)) { ok = false; break; } } catch { ok = false; break; } }
    if (ok) noted.add(posKey(g.fen()));
  }
}

const taught = new Set();
{
  const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
  const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
  const walk = (pgn) => {
    const g = new Chess();
    for (const s of (pgn ?? '').split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
      try { if (!g.move(s)) break; } catch { break; }
      taught.add(posKey(g.fen()));
    }
  };
  for (const r of rows) { walk(r?.pgn); for (const v of r?.variations ?? []) walk(v?.pgn); }
}

const id = process.argv[2];
if (!id) { console.error('usage: prep-notes <videoId>'); process.exit(2); }
const p = ['data/video-tracks', 'data/video-pending'].map((d) => `${d}/${id}.json`).find(existsSync);
if (!p) { console.error(`no track for ${id}`); process.exit(2); }
const track = JSON.parse(readFileSync(p, 'utf8'));
const said = new Map();
const pp = `data/video-narration/${id}.json`;
if (existsSync(pp)) for (const m of JSON.parse(readFileSync(pp, 'utf8')).moves ?? []) if (m.said?.trim() && m.fen) said.set(posKey(m.fen), m.said.trim());

console.log(`TITLE: ${track.title}\ntitleCheck: ${JSON.stringify(track.titleCheck)}\n`);
let line = [];
const seen = new Set();
let count = 0;
for (const m of track.moves ?? []) {
  if (!m.line?.length) continue;
  line = line.slice(0, m.ply - m.line.length);
  line.push(...m.line);
  const key = line.join(' ');
  if (seen.has(key)) continue;
  seen.add(key);
  if (!m.fen) continue;
  const k = posKey(m.fen);
  const w = said.get(k);
  if (!w) continue;
  const n = w.split(/\s+/).filter(Boolean).length;
  if (n < 12 || n > 280) continue;
  if (noted.has(k)) continue;
  count += 1;
  console.log(`${taught.has(k) ? 'ON ' : 'off'} | ${key}`);
  console.log(`   FEN ${m.fen}`);
  console.log(`   SAY ${w.replace(/\s+/g, ' ').slice(0, 320)}`);
}
console.log(`\n${count} writable position(s)`);
