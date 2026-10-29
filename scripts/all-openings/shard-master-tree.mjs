// Split the merged master tree (data/sources/twic-tree/master-tree.json +
// master-paths.json, `build-master-tree.mjs --merge`) into the files the phone
// fetches by the board it walked to (WO-ALL-OPENINGS-01 P1: "sharded by
// opening, fetched on open and kept"). A board in the first PRE plies lives in
// the root file; a deeper board lives in the file of the board six moves in on
// the way masters most often reached it, and of any other six-move board that
// carried at least SHARE of that and MIN_PATH games — so a common transposition
// finds it too. Boards are packed into files of about TARGET bytes;
// index.json maps each six-move board to its file.
//
//   node scripts/all-openings/shard-master-tree.mjs [--target 400000]
//   → public/data/master-tree/{index.json, root.json, s<N>.json}
//   node scripts/all-openings/shard-master-tree.mjs --tree online
//   → public/data/online-tree/… from data/sources/elite-tree/ (O9)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const TARGET = Number(arg('target', 400000));
const PRE = 6;
/** Another path files the board too when it carries this many games… */
const MIN_PATH = Number(arg('min-path', 10));
/** …and at least this share of the most-played path's. */
const SHARE = Number(arg('share', 0.25));
/** The two trees: the same split, each from its own build into its own folder. */
const TREES = {
  master: { src: 'data/sources/twic-tree/', out: 'public/data/master-tree/' },
  online: { src: 'data/sources/elite-tree/', out: 'public/data/online-tree/' },
};
const TREE = arg('tree', 'master');
if (!TREES[TREE]) throw new Error(`--tree must be one of ${Object.keys(TREES).join(', ')}`);
const SRC = root + TREES[TREE].src;
const OUT = root + TREES[TREE].out;

const tree = JSON.parse(readFileSync(`${SRC}${TREE}-tree.json`, 'utf8'));
const paths = JSON.parse(readFileSync(`${SRC}${TREE}-paths.json`, 'utf8'));

// A file is picked by the BOARD six moves in, not the moves that reached it:
// two move orders into the same six-move board share a file (the Anglo-Indian
// by c4 Nf6 Nc3 e6 d4 and by d4 Nf6 c4 e6 Nc3 is one family, not two).
// THE FALLBACK FOR A LATE TRANSPOSITION: every deep board's file, found by a
// hash of the board (FNV-1a, 32 bits) in one of 256 small bucket files. The
// phone reads it only when the six-move board's file does not hold the board
// (a walk that joins the King's Indian at move 7 by the English order). The
// SAME function runs in `src/services/masterTree.ts`; the vector below pins it.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
if (fnv1a('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -') !== '44941583') throw new Error(`fnv1a drifted: ${fnv1a('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -')}`);

const boardKey = new Map();
function keyOf(path) {
  let k = boardKey.get(path);
  if (k === undefined) {
    const c = new Chess();
    try { for (const san of path.split(' ')) c.move(san); k = c.fen().split(' ').slice(0, 4).join(' '); } catch { k = null; }
    boardKey.set(path, k);
  }
  return k;
}

const rootFile = {};
const byPath = new Map(); // six-move board → { fen: moves }
for (const [fen, moves] of Object.entries(tree.positions)) {
  const pre = paths[fen] ?? {};
  const counts = new Map();
  for (const [p, n] of Object.entries(pre)) {
    if (p.split(' ').length !== PRE) continue;
    const k = keyOf(p);
    if (k) counts.set(k, (counts.get(k) ?? 0) + n);
  }
  const all = [...counts.entries()];
  if (all.length === 0) { rootFile[fen] = moves; continue; }
  // A board is filed under the six-move paths masters really take to it: its
  // most-played one always, and any other at least SHARE of that and MIN_PATH
  // games — so a common transposition finds it too. Filing it under every path
  // (one game each) multiplied the files sevenfold (279 MB) for move orders a
  // walk down the most-played moves never takes.
  const top = Math.max(...all.map(([, n]) => n));
  const deep = all.filter(([, n]) => n === top || (n >= MIN_PATH && n >= top * SHARE)).map(([p]) => p);
  for (const p of deep) {
    let m = byPath.get(p);
    if (!m) { m = {}; byPath.set(p, m); }
    m[fen] = moves;
  }
}

// Pack paths into files, biggest first so one huge path gets its own file.
const sized = [...byPath.entries()].map(([p, m]) => ({ p, m, bytes: JSON.stringify(m).length }))
  .sort((a, b) => b.bytes - a.bytes);
const files = [];
for (const s of sized) {
  const f = files.find((x) => x.bytes + s.bytes <= TARGET);
  if (f) { f.paths.push(s.p); Object.assign(f.boards, s.m); f.bytes += s.bytes; }
  else files.push({ paths: [s.p], boards: { ...s.m }, bytes: s.bytes });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const index = { source: tree.source, min: tree.min, stop: tree.stop, pre: PRE, boards: {} };
writeFileSync(OUT + 'root.json', JSON.stringify(rootFile));
const buckets = new Map(); // two hex → { hash: file }
files.forEach((f, i) => {
  writeFileSync(`${OUT}s${i}.json`, JSON.stringify(f.boards));
  for (const p of f.paths) index.boards[p] = i;
  for (const fen of Object.keys(f.boards)) {
    const h = fnv1a(fen);
    let b = buckets.get(h.slice(0, 2));
    if (!b) { b = {}; buckets.set(h.slice(0, 2), b); }
    if (b[h.slice(2)] === undefined) b[h.slice(2)] = i;
  }
});
mkdirSync(OUT + 'h', { recursive: true });
let bucketBytes = 0;
for (const [k, b] of buckets) { const t = JSON.stringify(b); bucketBytes += t.length; writeFileSync(`${OUT}h/${k}.json`, t); }
writeFileSync(OUT + 'index.json', JSON.stringify(index));
const total = files.reduce((a, f) => a + f.bytes, 0) + JSON.stringify(rootFile).length;
console.log(JSON.stringify({
  boards: tree.boards, rootBoards: Object.keys(rootFile).length, sixMoveBoards: byPath.size, files: files.length,
  totalMB: +(total / 1e6).toFixed(1), indexKB: +(JSON.stringify(index).length / 1e3).toFixed(0),
  biggestKB: +(Math.max(...files.map((f) => f.bytes)) / 1e3).toFixed(0),
  hashBucketsKB: +(bucketBytes / 1e3).toFixed(0),
}, null, 2));
