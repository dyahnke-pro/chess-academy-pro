// THE CLUB TREE (WO-ALL-OPENINGS-01, gems + club tries; David 2026-10-28:
// "the sexy, juicy traps that attract beginners"). Built offline from a
// Lichess monthly game file (CC0, database.lichess.org) — no explorer lookup,
// no token, no rate limit. Streamed and decompressed on the fly (curl | zstd);
// nothing but the tree is written to disk.
//
// Keyed by the MOVE ORDER (the first DEPTH plies, SAN — 18, to move 9), not the board: a trap
// is a line, and string keys need no move generator, so a month parses in
// minutes. Each position keeps every move played from it with its count and
// result split in three rating bands (by the two players' average):
//   b0 < 1200 · b1 1200–1599 · b2 1600–1999 (2000+ games are skipped: masters
//   and strong online play are other trees).
// Positions reached in fewer than MIN games are dropped at the end; a position
// seen once is pruned every PRUNE games so the map fits in memory (a node can
// lose at most a few counts — far under the gem bar's 1% and 20 games). The
// prune floor rises with the games read so memory stays flat.
//
//   node scripts/all-openings/build-club-tree.mjs --month 2016-01 [--depth 20] [--min 20]   (needs curl + zstd)
// Out: data/sources/club-tree/<month>.json  { meta, nodes: { "e4 e5 Bc4": { n, m: { san: [b0n,b0w,b0d, b1n,b1w,b1d, b2n,b2w,b2d] } } } }
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const MONTH = arg('month', '2016-01');
const DEPTH = Number(arg('depth', 18));
const MIN = Number(arg('min', 20));
const PRUNE = 300_000;
const OUT = `${root}data/sources/club-tree/`;
mkdirSync(OUT, { recursive: true });
const URL_ = `https://database.lichess.org/standard/lichess_db_standard_rated_${MONTH}.pgn.zst`;

/** prefix → { n, m: Map<san, Int32Array(9)> } */
const nodes = new Map();
let games = 0; let kept = 0; let lastLog = Date.now();
const log = (s) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

function band(w, b) {
  const avg = (w + b) / 2;
  if (!(w > 0 && b > 0) || avg >= 2000) return -1;
  return avg < 1200 ? 0 : avg < 1600 ? 1 : 2;
}

function addGame(sans, bnd, result) {
  const res = result === '1-0' ? 0 : result === '1/2-1/2' ? 1 : 2; // white win / draw / black win
  let prefix = '';
  for (let i = 0; i < sans.length && i < DEPTH; i += 1) {
    let node = nodes.get(prefix);
    if (!node) { node = { n: 0, m: new Map() }; nodes.set(prefix, node); }
    node.n += 1;
    let mv = node.m.get(sans[i]);
    if (!mv) { mv = new Int32Array(9); node.m.set(sans[i], mv); }
    mv[bnd * 3] += 1;
    if (res === 0) mv[bnd * 3 + 1] += 1; else if (res === 1) mv[bnd * 3 + 2] += 1;
    prefix = prefix ? `${prefix} ${sans[i]}` : sans[i];
  }
}

/** The floor rises with the games read (1 per 1.5M), so the rare positions
 *  kept between prunes cannot grow with the month — a position must still
 *  reach MIN games at the end, so dropping one at a few counts is safe. */
function prune() {
  const floor = 1 + Math.floor(games / 1_500_000);
  let dropped = 0;
  for (const [k, v] of nodes) if (v.n <= floor) { nodes.delete(k); dropped += 1; }
  return dropped;
}

// The files are pzstd (skippable frames between blocks), which Node's own
// zstd decoder rejects — the zstd CLI reads them (`apt-get install zstd`).
const pipe = spawn('bash', ['-c', `curl -sfL '${URL_}' | zstd -dc`], { stdio: ['ignore', 'pipe', 'inherit'] });
const rl = createInterface({ input: pipe.stdout, crlfDelay: Infinity });

let wElo = 0; let bElo = 0; let result = ''; let variantOk = true; let fen = false;
for await (const line of rl) {
  if (line.startsWith('[')) {
    if (line.startsWith('[WhiteElo ')) wElo = Number(line.slice(11, -2));
    else if (line.startsWith('[BlackElo ')) bElo = Number(line.slice(11, -2));
    else if (line.startsWith('[Result ')) result = line.slice(9, -2);
    else if (line.startsWith('[FEN ')) fen = true;
    else if (line.startsWith('[Variant ')) variantOk = /Standard/i.test(line);
    continue;
  }
  if (!line.startsWith('1.')) continue;
  games += 1;
  const bnd = band(wElo, bElo);
  if (bnd >= 0 && variantOk && !fen && (result === '1-0' || result === '0-1' || result === '1/2-1/2')) {
    const sans = line.replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/[?!]+/g, '')
      .split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
    if (sans.length >= 4) { addGame(sans, bnd, result); kept += 1; }
  }
  wElo = 0; bElo = 0; result = ''; variantOk = true; fen = false;
  if (games % PRUNE === 0) {
    const d = prune();
    log(`games=${games} kept=${kept} nodes=${nodes.size} pruned=${d} rss=${Math.round(process.memoryUsage().rss / 1e6)}MB`);
  } else if (Date.now() - lastLog > 60_000) {
    log(`games=${games} kept=${kept} nodes=${nodes.size}`); lastLog = Date.now();
  }
}

const out = {};
let n = 0;
for (const [k, v] of nodes) {
  if (v.n < MIN) continue;
  const m = {};
  for (const [san, arr] of v.m) if (arr[0] + arr[3] + arr[6] >= 3) m[san] = Array.from(arr);
  out[k] = { n: v.n, m }; n += 1;
}
const file = `${OUT}${MONTH}.json`;
writeFileSync(file, JSON.stringify({ meta: { month: MONTH, depth: DEPTH, min: MIN, games, kept, bands: ['<1200', '1200-1599', '1600-1999'] }, nodes: out }));
log(`DONE games=${games} kept=${kept} positions=${n} → ${file}`);
