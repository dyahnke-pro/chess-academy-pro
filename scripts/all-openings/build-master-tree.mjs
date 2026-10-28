// THE DEEP MASTER TREE (WO-ALL-OPENINGS-01 P1), built offline from The Week in
// Chess (data/sources/twic/, `fetch-twic.mjs`) — no explorer lookup, no token,
// no rate limit. Every game with BOTH players rated 2200+, standard start, not
// blitz/bullet/armageddon, is played to STOP plies; every board reached in
// MIN+ of those games keeps every move played from it, with its result split
// and the movers' rating.
//
// Two passes, because the boards reached once (most of them) do not fit in
// memory: pass 1 counts every board into a count-min sketch (a fixed 256 MB,
// never undercounts); pass 2 keeps exact counts only for boards the sketch
// says reached MIN+ games. Each pass shards the issues over processes; each
// shard saves its result as it finishes, so a killed run loses one shard.
//
//   node scripts/all-openings/build-master-tree.mjs --pass 1 --shard 0/3
//   node scripts/all-openings/build-master-tree.mjs --merge-sketch --shards 3
//   node scripts/all-openings/build-master-tree.mjs --pass 2 --shard 0/3
//   node scripts/all-openings/build-master-tree.mjs --merge --shards 3
//   [--limit N]  only the first N issues (a speed test)
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const MIN = Number(arg('min', 10));
const STOP = Number(arg('stop', 40));
const MIN_ELO = 2200;
// Each board remembers the opening paths (the game's first PRE plies, or all of
// them on a shallower board) that reached it, so the tree can be split into
// files the phone fetches by the path it walked.
const PRE = 6;
const SRC = root + 'data/sources/twic/';
const OUT = root + 'data/sources/twic-tree/';
mkdirSync(OUT, { recursive: true });

// The sketch: 4 rows of 2^25 saturating 16-bit counters.
const ROWS = 4;
const W = 1 << 25;
const MASK = W - 1;
const idx = (hash, i) => {
  const h1 = parseInt(hash.slice(0, 8), 16);
  const h2 = parseInt(hash.slice(8, 16), 16) | 1;
  return i * W + (((h1 + Math.imul(i, h2)) >>> 0) & MASK);
};

function issues() {
  const all = readdirSync(SRC).filter((f) => /^twic\d+g\.zip$/.test(f)).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));
  const limit = Number(arg('limit', 0));
  return limit ? all.slice(0, limit) : all;
}

const header = (h, tag) => h.match(new RegExp(`\\[${tag} "([^"]*)"\\]`))?.[1] ?? '';
const BAD_EVENT = /blitz|bullet|armageddon|blindfold|chess960|fischer random|960/i;

/** Every master game in one issue: { sans (≤ STOP), result, wElo, bElo, key }. */
function* gamesOf(zip) {
  let text;
  try { text = execFileSync('unzip', ['-p', SRC + zip], { maxBuffer: 512 * 1024 * 1024 }).toString('latin1'); } catch { return; }
  for (const block of text.split(/\r?\n(?=\[Event )/)) {
    const split = block.search(/\r?\n\r?\n/);
    if (split < 0) continue;
    const h = block.slice(0, split);
    const w = Number(header(h, 'WhiteElo')); const b = Number(header(h, 'BlackElo'));
    if (!(w >= MIN_ELO && b >= MIN_ELO)) continue;
    if (header(h, 'FEN') || header(h, 'SetUp') === '1') continue;
    const variant = header(h, 'Variant');
    if (variant && !/standard/i.test(variant)) continue;
    if (BAD_EVENT.test(header(h, 'Event'))) continue;
    const result = header(h, 'Result');
    if (!['1-0', '0-1', '1/2-1/2'].includes(result)) continue;
    let mt = block.slice(split).replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    for (let k = 0; k < 6 && mt.includes('('); k += 1) mt = mt.replace(/\([^()]*\)/g, ' ');
    const sans = mt.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/)
      .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)).slice(0, STOP);
    if (sans.length < 2) continue;
    const key = `${header(h, 'White')}|${header(h, 'Black')}|${header(h, 'Date')}|${header(h, 'Round')}|${sans.slice(0, 24).join(' ')}`;
    yield { sans, result, wElo: w, bElo: b, key };
  }
}

function shardOf() {
  const [i, n] = (arg('shard', '0/1')).split('/').map(Number);
  return { i, n, mine: issues().filter((_, k) => k % n === i) };
}

if (arg('pass') === '1') {
  const { i, n, mine } = shardOf();
  const sketch = new Uint16Array(ROWS * W);
  const seen = new Set();
  let games = 0; let dupes = 0; let bad = 0;
  const t0 = Date.now();
  for (const [k, zip] of mine.entries()) {
    for (const g of gamesOf(zip)) {
      if (seen.has(g.key)) { dupes += 1; continue; }
      seen.add(g.key);
      const c = new Chess();
      // The start board too: pass 2 keeps a board's moves only when the
      // sketch counted the board itself.
      const h0 = c.hash();
      for (let r = 0; r < ROWS; r += 1) { const x = idx(h0, r); if (sketch[x] < 65535) sketch[x] += 1; }
      for (const s of g.sans) {
        try { c.move(s); } catch { bad += 1; break; }
        const h = c.hash();
        for (let r = 0; r < ROWS; r += 1) { const x = idx(h, r); if (sketch[x] < 65535) sketch[x] += 1; }
      }
      games += 1;
    }
    if ((k + 1) % 10 === 0 || k === mine.length - 1) console.log(`[tree p1 ${i}/${n}] ${k + 1}/${mine.length} issues, ${games} games, ${dupes} dupes, ${bad} broken, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  writeFileSync(`${OUT}sketch-${i}.tmp`, Buffer.from(sketch.buffer));
  renameSync(`${OUT}sketch-${i}.tmp`, `${OUT}sketch-${i}.bin`);
  writeFileSync(`${OUT}keys-${i}.json`, JSON.stringify([...seen]));
  console.log(`[tree p1 ${i}/${n}] done: ${games} games`);
} else if (has('merge-sketch')) {
  const n = Number(arg('shards', 3));
  const sum = new Uint16Array(ROWS * W);
  for (let i = 0; i < n; i += 1) {
    const s = new Uint16Array(readFileSync(`${OUT}sketch-${i}.bin`).buffer.slice(0));
    for (let x = 0; x < sum.length; x += 1) { const v = sum[x] + s[x]; sum[x] = v > 65535 ? 65535 : v; }
  }
  writeFileSync(`${OUT}sketch.bin`, Buffer.from(sum.buffer));
  console.log('[tree] sketch merged');
} else if (arg('pass') === '2') {
  const { i, n, mine } = shardOf();
  const sketch = new Uint16Array(readFileSync(`${OUT}sketch.bin`).buffer.slice(0));
  const est = (h) => { let m = 65535; for (let r = 0; r < ROWS; r += 1) m = Math.min(m, sketch[idx(h, r)]); return m; };
  // A game the earlier shards already counted (the same game in two issues) is
  // counted once: shard i skips keys shards 0..i-1 kept in pass 1.
  const earlier = new Set();
  for (let j = 0; j < i; j += 1) for (const k of JSON.parse(readFileSync(`${OUT}keys-${j}.json`, 'utf8'))) earlier.add(k);
  const boards = new Map(); // hash → { fen, n, moves: Map<san, [n, w, d, b, eloSum]>, pre: Map<path, n> }
  const seen = new Set();
  let games = 0;
  const t0 = Date.now();
  for (const [k, zip] of mine.entries()) {
    for (const g of gamesOf(zip)) {
      if (seen.has(g.key) || earlier.has(g.key)) continue;
      seen.add(g.key);
      const r = g.result === '1-0' ? 1 : g.result === '0-1' ? 3 : 2;
      const c = new Chess();
      let h = c.hash();
      let ply = 0;
      // The path in chess.js's own SAN, the spelling the phone walks with.
      const canon = [];
      for (const s of g.sans) {
        const keep = est(h) >= MIN;
        const white = c.turn() === 'w';
        let mv;
        try { mv = c.move(s); } catch { break; }
        if (keep) {
          let bd = boards.get(h);
          if (!bd) { bd = { fen: '', n: 0, moves: new Map(), pre: new Map() }; boards.set(h, bd); }
          const path = canon.slice(0, Math.min(ply, PRE)).join(' ');
          bd.pre.set(path, (bd.pre.get(path) ?? 0) + 1);
          bd.n += 1;
          let m = bd.moves.get(mv.san);
          if (!m) { m = [0, 0, 0, 0, 0]; bd.moves.set(mv.san, m); }
          m[0] += 1; m[r] += 1; m[4] += white ? g.wElo : g.bElo;
          if (!bd.fen) bd.fen = mv.before.split(' ').slice(0, 4).join(' ');
        }
        h = c.hash();
        canon.push(mv.san);
        ply += 1;
      }
      games += 1;
    }
    if ((k + 1) % 10 === 0 || k === mine.length - 1) console.log(`[tree p2 ${i}/${n}] ${k + 1}/${mine.length} issues, ${games} games, ${boards.size} boards, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  const out = {};
  for (const [h, bd] of boards) out[h] = { fen: bd.fen, n: bd.n, moves: Object.fromEntries(bd.moves), pre: Object.fromEntries(bd.pre) };
  writeFileSync(`${OUT}part-${i}.tmp`, JSON.stringify(out));
  renameSync(`${OUT}part-${i}.tmp`, `${OUT}part-${i}.json`);
  console.log(`[tree p2 ${i}/${n}] done: ${games} games, ${boards.size} boards`);
} else if (has('merge')) {
  const n = Number(arg('shards', 3));
  const all = new Map();
  for (let i = 0; i < n; i += 1) {
    const part = JSON.parse(readFileSync(`${OUT}part-${i}.json`, 'utf8'));
    for (const [h, bd] of Object.entries(part)) {
      const cur = all.get(h);
      if (!cur) { all.set(h, bd); continue; }
      cur.n += bd.n;
      for (const [path, k] of Object.entries(bd.pre)) cur.pre[path] = (cur.pre[path] ?? 0) + k;
      for (const [san, m] of Object.entries(bd.moves)) {
        const c = cur.moves[san];
        if (!c) cur.moves[san] = m; else for (let x = 0; x < 5; x += 1) c[x] += m[x];
      }
    }
  }
  // Exact counts now: a board the sketch let through but MIN+ games never
  // reached is dropped. Moves as [san, games, white, draws, black, avgElo],
  // most played first.
  const positions = {};
  const paths = {};
  let kept = 0;
  for (const bd of all.values()) {
    if (bd.n < MIN) continue;
    positions[bd.fen] = Object.entries(bd.moves)
      .map(([san, m]) => [san, m[0], m[1], m[2], m[3], Math.round(m[4] / m[0])])
      .sort((a, b) => b[1] - a[1]);
    paths[bd.fen] = bd.pre;
    kept += 1;
  }
  writeFileSync(`${OUT}master-tree.json`, JSON.stringify({ source: 'The Week in Chess, both players 2200+, no blitz', min: MIN, stop: STOP, boards: kept, positions }));
  writeFileSync(`${OUT}master-paths.json`, JSON.stringify(paths));
  console.log(`[tree] merged: ${kept} boards with ${MIN}+ games`);
}
