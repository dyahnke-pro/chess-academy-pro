/**
 * build-long-puzzles.mjs — pull the LONG-calculation CC0 puzzle pool.
 *
 * David 2026-10-01 ("users need access to long and very long puzzles" + the
 * deep-run mode, "how many moves deep can you accumulate"): the bundled
 * puzzles.json is thin exactly where deep-run needs depth — below 1600 there
 * are ~70 puzzles of 5+ solver moves. This streams the Lichess public puzzle
 * DB (database.lichess.org, CC0), keeps puzzles with ≥ 3 SOLVER moves, quotas
 * them per (rating band × depth) so every band has a ladder to climb, and
 * writes a lazy-fetched pool to public/data/long-puzzles.json (NOT bundled —
 * same pattern as master-puzzles.json).
 *
 * DEPTH IS COUNTED, never read off a theme: a Lichess `moves` string starts
 * with the opponent's setup move, so solver moves = floor(plies / 2). The
 * `long`/`veryLong` theme tags are Lichess's own label and disagree with the
 * count often enough that selection must never key on them.
 *
 * Every line is chess.js-replayed (G3): an illegal move drops the puzzle.
 *
 * Run: see the `--plain` note in main() (the dump is multi-frame).
 */
import { createZstdDecompress, constants as zc } from 'node:zlib';
import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Transform } from 'node:stream';
import { Chess } from 'chess.js';

const OUT = 'public/data/long-puzzles.json';
const zstd = () => createZstdDecompress({ params: { [zc.ZSTD_d_windowLogMax]: 31 } });

// See build-master-puzzles.mjs: Node's zstd rejects the leading skippable frame.
function stripSkippableFrames() {
  let buf = Buffer.alloc(0);
  let passthrough = false;
  return new Transform({
    transform(chunk, _enc, cb) {
      if (passthrough) { this.push(chunk); return cb(); }
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (buf.length < 8) return cb();
        const magic = buf.readUInt32LE(0);
        if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
          const total = 8 + buf.readUInt32LE(4);
          if (buf.length < total) return cb();
          buf = buf.subarray(total);
          continue;
        }
        passthrough = true;
        if (buf.length) this.push(buf);
        buf = Buffer.alloc(0);
        return cb();
      }
    },
  });
}

const MIN_RATING = 400;
const MAX_RATING = 2600;
const BAND = 200;
const MAX_RD = 110;
const MIN_PLAYS = 30;
/** Per (band, depth) quota. Depth 3 is where the bundled pool is already
 *  decent above 1200, so it gets the smallest share; the deep end is the
 *  point of the pool. 7+ shares one bucket. */
const QUOTA = { 3: 120, 4: 150, 5: 130, 6: 100, 7: 80 };
const depthBucket = (d) => (d >= 7 ? 7 : d);

const bundledIds = new Set(
  JSON.parse(readFileSync('src/data/puzzles.json', 'utf8')).map((p) => p.id),
);
const masterIds = new Set(
  JSON.parse(readFileSync('public/data/master-puzzles.json', 'utf8')).map((p) => p.id),
);

function replay(fen, uciMoves) {
  try {
    const c = new Chess(fen);
    let solverPiece = null;
    for (let i = 0; i < uciMoves.length; i++) {
      const u = uciMoves[i];
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) return null;
      if (i === 1) solverPiece = m.piece.toUpperCase();
    }
    return { solverPiece };
  } catch { return null; }
}

async function main() {
  const buckets = new Map();
  const key = (band, d) => `${band}:${d}`;
  const totalSlots = (((MAX_RATING - MIN_RATING) / BAND)) * Object.values(QUOTA).reduce((a, b) => a + b, 0);
  let filled = 0;
  let scanned = 0;
  let done = false;

  await new Promise((resolve, reject) => {
    // The dump is MULTI-frame with skippable frames between them, which Node's
    // zstd binding rejects mid-stream (it stopped at ~181k rows). `--plain`
    // reads an already-decompressed CSV, e.g. from python-zstandard:
    //   curl -sS URL | python3 scripts/zstd-cat.py | node scripts/build-long-puzzles.mjs --plain
    const input = process.argv.includes('--plain') ? process.stdin : process.stdin.pipe(stripSkippableFrames()).pipe(zstd());
    const rl = createInterface({ input, crlfDelay: Infinity });
    let header = true;
    rl.on('line', (line) => {
      if (done) return;
      if (header) { header = false; return; }
      scanned++;
      if (scanned % 500000 === 0) console.log(`[long] scanned ${scanned}, filled ${filled}/${totalSlots}`);
      const c = line.split(',');
      if (c.length < 8) return;
      const rating = Number(c[3]);
      if (!Number.isFinite(rating) || rating < MIN_RATING || rating >= MAX_RATING) return;
      const rd = Number(c[4]);
      const nbPlays = Number(c[6]);
      if (Number.isFinite(rd) && rd > MAX_RD) return;
      if (Number.isFinite(nbPlays) && nbPlays < MIN_PLAYS) return;
      if (bundledIds.has(c[0]) || masterIds.has(c[0])) return;
      const moves = c[2].trim().split(/\s+/);
      const depth = Math.floor(moves.length / 2);
      if (depth < 3) return;
      const band = Math.floor(rating / BAND) * BAND;
      const d = depthBucket(depth);
      const k = key(band, d);
      const list = buckets.get(k) ?? [];
      if (list.length >= QUOTA[d]) return;
      const rp = replay(c[1], moves);
      if (!rp || !rp.solverPiece) return;
      list.push({
        id: c[0],
        fen: c[1],
        moves: c[2],
        rating,
        themes: c[7] ? c[7].split(' ').filter(Boolean) : [],
        openingTags: c[9] ? c[9].split(' ').filter(Boolean).join(' ') || null : null,
        popularity: Number(c[5]) || 0,
        nbPlays: Number.isFinite(nbPlays) ? nbPlays : 0,
        movingPiece: rp.solverPiece,
      });
      buckets.set(k, list);
      filled++;
      if (filled >= totalSlots) { done = true; rl.close(); }
    });
    rl.on('close', () => resolve());
    rl.on('error', reject);
    process.stdin.on('error', (e) => { if (!done) reject(e); });
  });

  const all = [...buckets.values()].flat().sort((a, b) => a.rating - b.rating);
  mkdirSync('public/data', { recursive: true });
  writeFileSync(OUT, JSON.stringify(all));
  console.log(`[long] scanned ${scanned} rows; wrote ${all.length} puzzles → ${OUT}`);
  for (let b = MIN_RATING; b < MAX_RATING; b += BAND) {
    const row = Object.keys(QUOTA).map((d) => `${d}:${buckets.get(key(b, Number(d)))?.length ?? 0}`).join(' ');
    console.log(`[long]   ${b} ${row}`);
  }
}

main().catch((e) => { console.error('[long] FAILED:', e.message); process.exit(1); });
