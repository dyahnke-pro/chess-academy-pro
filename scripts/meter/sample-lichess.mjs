// THE POPULATION SAMPLE for the skill-difficulty table (skill-difficulty.json,
// WO-MOTIFS-01 M7). Streams the head of one Lichess open-database month (CC0)
// and keeps rated blitz / rapid / classical games that carry [%eval], spread
// evenly over 600–2600 by the players' mean rating (25-point buckets), so the
// fit sees every level equally. Committed (2026-10-22) because the first
// sample lived in /tmp and died with its container.
//
//   node scripts/meter/sample-lichess.mjs <outDir> [maxGames=4000] [megabytes=600]
//
// Writes <outDir>/games.jsonl: { id, w, b, sans } per game.
import { Decompress } from 'fzstd';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const URL = 'https://database.lichess.org/standard/lichess_db_standard_rated_2024-06.pgn.zst';
const OUT = process.argv[2] ?? '/tmp/claude-0/meter';
const MAX = Number(process.argv[3] ?? 4000);
const BYTES = Number(process.argv[4] ?? 600) * 1024 * 1024;
const LO = 600;
const HI = 2600;
const BUCKET = 25;
const PER_BUCKET = Math.ceil(MAX / ((HI - LO) / BUCKET));

mkdirSync(OUT, { recursive: true });
const filled = new Map();
const kept = [];
let seen = 0;

function sansOf(movetext) {
  const clean = movetext.replace(/\{[^}]*\}/g, ' ').replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ');
  const tokens = clean.split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  const c = new Chess();
  const sans = [];
  for (const t of tokens) {
    try { sans.push(c.move(t).san); } catch { return null; }
  }
  return sans;
}

function consider(h, movetext) {
  seen += 1;
  if (!/^Rated (Blitz|Rapid|Classical) game/.test(h.Event ?? '')) return;
  if (!movetext.includes('[%eval')) return;
  const w = Number(h.WhiteElo);
  const b = Number(h.BlackElo);
  if (!(w >= LO && w < HI && b >= LO && b < HI)) return;
  const key = Math.floor((w + b) / 2 / BUCKET);
  if ((filled.get(key) ?? 0) >= PER_BUCKET) return;
  const sans = sansOf(movetext);
  if (!sans || sans.length < 10) return;
  filled.set(key, (filled.get(key) ?? 0) + 1);
  kept.push({ id: (h.Site ?? '').split('/').pop(), w, b, sans });
}

const res = await fetch(URL, { headers: { Range: `bytes=0-${BYTES - 1}` } });
if (!res.ok && res.status !== 206) throw new Error(`fetch ${res.status}`);
let buf = '';
let header = {};
let done = false;
const finish = () => {
  if (done) return;
  done = true;
  writeFileSync(`${OUT}/games.jsonl`, kept.map((g) => JSON.stringify(g)).join('\n') + '\n');
  console.log(`kept ${kept.length} of ${seen} games read; ${[...filled.values()].filter((n) => n >= PER_BUCKET).length}/${(HI - LO) / BUCKET} buckets full`);
  process.exit(0);
};
const utf8 = new TextDecoder();
// fzstd, not node's zstd stream: the file opens with a skippable frame and is
// many frames long, and node's stream ended after the first (0 games read).
const dec = new Decompress((chunk) => {
  buf += utf8.decode(chunk, { stream: true });
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line.startsWith('[')) {
      const m = /^\[(\w+) "(.*)"\]$/.exec(line);
      if (m) header[m[1]] = m[2];
    } else if (line.length > 0) {
      consider(header, line);
      header = {};
      if (kept.length >= MAX) finish();
      if (seen % 50000 === 0) console.log(`read ${seen}, kept ${kept.length}`);
    }
  }
});
try {
  for await (const part of res.body) dec.push(part);
} catch (e) {
  // The range cuts the last frame short: what was read before it stands.
  if (kept.length === 0) console.error(`stream error before any game: ${e.message}`);
}
finish();
