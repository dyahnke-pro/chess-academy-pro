/**
 * build-master-puzzles.mjs — pull the Master Level CC0 puzzle pool.
 *
 * David 2026-09-14 ("add a puzzle section called master level, and actually
 * pull master level puzzles from a database"): stream the Lichess public puzzle
 * DB (database.lichess.org, CC0), filter to the elite band (rating ≥ 2400),
 * FAVOR multi-move sequences (his favorite + most instructive), and write a
 * bounded, lazy-fetched pool to public/data/master-puzzles.json (NOT bundled —
 * keeps the JS bundle lean, same pattern as the farmed corpora).
 *
 * Node 22 decompresses .zst natively (zlib.createZstdDecompress), so no external
 * zstd binary is needed and we never store the ~300MB dump — we stream, filter
 * on the fly, and abort once the buckets are full.
 *
 * Columns: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
 *
 * Run: node scripts/build-master-puzzles.mjs
 */
import { createZstdDecompress, constants as zc } from 'node:zlib';
import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Transform } from 'node:stream';

// Lichess compresses with long-distance matching (a large window), so the
// decompressor must raise its window-log ceiling or it rejects the frame with
// ZSTD_error_prefix_unknown.
const zstd = () => createZstdDecompress({ params: { [zc.ZSTD_d_windowLogMax]: 31 } });

// The Lichess dump PREFIXES the real zstd frame with a "skippable frame"
// (magic 0x184D2A50–5F + 4-byte LE size + payload) carrying the content size.
// Node's zstd binding rejects that leading frame (ZSTD_error_prefix_unknown)
// instead of skipping it per spec, so strip any leading skippable frames here
// before the decompressor sees the real frame (magic 0x28B52FFD).
function stripSkippableFrames() {
  let buf = Buffer.alloc(0);
  let passthrough = false;
  return new Transform({
    transform(chunk, _enc, cb) {
      if (passthrough) { this.push(chunk); return cb(); }
      buf = Buffer.concat([buf, chunk]);
      // Consume as many leading skippable frames as are fully buffered.
      for (;;) {
        if (buf.length < 8) return cb(); // need magic + size
        const magic = buf.readUInt32LE(0);
        if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
          const size = buf.readUInt32LE(4);
          const total = 8 + size;
          if (buf.length < total) return cb(); // wait for the rest of the frame
          buf = buf.subarray(total);
          continue;
        }
        // Real zstd frame reached — flush the remainder and pass through.
        passthrough = true;
        if (buf.length) this.push(buf);
        buf = Buffer.alloc(0);
        return cb();
      }
    },
  });
}

// Read the .zst dump from STDIN (pipe curl in — curl honors HTTPS_PROXY, which
// Node's https.get does NOT: a direct get() returns the proxy CONNECT preamble
// as the body, which isn't valid zstd). Run:
//   curl -sS "$DUMP_URL" | node scripts/build-master-puzzles.mjs
const DUMP_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const OUT = 'public/data/master-puzzles.json';

const MIN_RATING = 2400;
const MAX_RATING = 3200;
const MAX_RD = 100;        // established rating only
const MIN_PLAYS = 40;      // reliable
const MULTI_MOVE = new Set(['long', 'veryLong', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5']);

// Targets — favor multi-move (~70%). A small high-band quota guarantees the top
// of the elite range is represented, not just a wall of 2400s.
const MULTI_TARGET = 2800;
const SINGLE_TARGET = 1200;
const HIGH_BAND_MIN = 2700;
const HIGH_BAND_TARGET = 700;

const isMulti = (themes) => themes.some((t) => MULTI_MOVE.has(t));

async function main() {
  console.log(`[master] reading ${DUMP_URL} from stdin (pipe curl in)`);

  const multi = [];
  const single = [];
  let highBand = 0;
  let scanned = 0;
  let done = false;

  await new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin.pipe(stripSkippableFrames()).pipe(zstd()), crlfDelay: Infinity });
    let header = true;
    rl.on('line', (line) => {
      if (done) return;
      if (header) { header = false; return; } // skip the CSV header
      scanned++;
      const c = line.split(',');
      if (c.length < 8) return;
      const rating = Number(c[3]);
      const rd = Number(c[4]);
      const nbPlays = Number(c[6]);
      if (!Number.isFinite(rating) || rating < MIN_RATING || rating > MAX_RATING) return;
      if (Number.isFinite(rd) && rd > MAX_RD) return;
      if (Number.isFinite(nbPlays) && nbPlays < MIN_PLAYS) return;

      const themes = c[7] ? c[7].split(' ').filter(Boolean) : [];
      const rec = {
        id: c[0],
        fen: c[1],
        moves: c[2],
        rating,
        themes,
        openingTags: c[9] ? c[9].split(' ').filter(Boolean).join(' ') || null : null,
        popularity: Number(c[5]) || 0,
        nbPlays: Number.isFinite(nbPlays) ? nbPlays : 0,
      };

      const m = isMulti(themes);
      const wantHigh = rating >= HIGH_BAND_MIN && highBand < HIGH_BAND_TARGET;
      if (m && (multi.length < MULTI_TARGET || wantHigh)) {
        multi.push(rec);
        if (rating >= HIGH_BAND_MIN) highBand++;
      } else if (!m && single.length < SINGLE_TARGET) {
        single.push(rec);
        if (rating >= HIGH_BAND_MIN) highBand++;
      }

      if (multi.length >= MULTI_TARGET && single.length >= SINGLE_TARGET && highBand >= HIGH_BAND_TARGET) {
        done = true;
        rl.close();
      }
    });
    rl.on('close', () => resolve());
    rl.on('error', reject);
    process.stdin.on('error', (e) => { if (!done) reject(e); });
  });

  const all = [...multi, ...single].sort((a, b) => a.rating - b.rating);
  mkdirSync('public/data', { recursive: true });
  writeFileSync(OUT, JSON.stringify(all));
  const mm = all.filter((p) => isMulti(p.themes)).length;
  console.log(`[master] scanned ${scanned} rows`);
  console.log(`[master] wrote ${all.length} puzzles → ${OUT}`);
  console.log(`[master]   multi-move ${mm} (${Math.round((mm / all.length) * 100)}%), ≥${HIGH_BAND_MIN}: ${all.filter((p) => p.rating >= HIGH_BAND_MIN).length}`);
  console.log(`[master]   rating range ${all[0]?.rating}–${all[all.length - 1]?.rating}`);
}

main().catch((e) => { console.error('[master] FAILED:', e.message); process.exit(1); });
