// THE REPLIES CLUB PLAYERS MAKE THAT NO TAUGHT LINE COVERS, as lines the app
// can teach (WO-COURSE-01 D). The explorer walk (explorer-walk.mjs) measured
// them — each a board on a taught line and a move players rated 1000–2000 make
// there in ≥ 0.5% of their games with the opening, at some band. This turns
// each into a line: the reply, the student's answer and the continuation to
// the middlegame through THE ONE course walker (`walkToMiddlegame`: the
// masters' move from ≥ 8 games, the student's within 50cp of the engine, a
// known mistake punished, else the engine's best — every move from data, the
// engine only vetoes, G3), its last board graded by the engine.
//
// Two steps, both resumable:
//   node scripts/course-replies/build-club-replies.mjs --shard i/n [--minutes 18]
//     builds the lines not yet built, appending each to
//     $CLUB_CACHE_DIR/lines.shard-<i>.jsonl (default data/sources/club-replies/,
//     gitignored) as it finishes, and stops cleanly at the time budget — run it
//     again to go on. Progress prints every 10 lines.
//   node scripts/course-replies/build-club-replies.mjs --assemble
//     re-checks every walk reply against the CURRENT course (a reply the course
//     now teaches, or that transposes into a taught board, is dropped) and writes
//     public/data/club-replies/<openingId>.json + index.json (fetched when an
//     opening page opens — never at boot), deleting files for openings that no
//     longer have any (G8), and audit-reports/club-replies-build.json.
// Options: --walk <path> (default audit-reports/course-replies-count.json);
// EXPLORER_CACHE_DIR (the walk's explorer cache, read-only, for each band's
// share at the board; default data/sources/explorer-cache/).
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine, MATE } from './engine.mjs';
import { walkToMiddlegame, indexKnownMistakes } from './line-walk.mjs';
import { courseOpenings, taughtBoards } from './course-lines.mjs';
import { classifyReply, assembleOpening, studentCp, lineKey } from './club-replies-lib.mjs';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('../..', import.meta.url).pathname;
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const abs = (p) => (p.startsWith('/') ? p : root + p);
const J = (p) => JSON.parse(readFileSync(abs(p), 'utf8'));
const WALK = abs(arg('walk', 'audit-reports/course-replies-count.json'));
const CACHE_DIR = abs(process.env.CLUB_CACHE_DIR ?? 'data/sources/club-replies/').replace(/\/?$/, '/');
const EXPLORER_DIR = abs(process.env.EXPLORER_CACHE_DIR ?? 'data/sources/explorer-cache/').replace(/\/?$/, '/');
const OUT_DIR = root + 'public/data/club-replies/';
const FINAL_DEPTH = 14;
// A built line is kept only when it was built by THESE rules; a rule change
// bumps the revision and the shards rebuild every line.
const BUILD_REV = 2;

const walk = J(WALK);
const done = Object.entries(walk.openings ?? {}).filter(([, r]) => r.done);
const course = new Map(courseOpenings(root).map((o) => [o.id, o]));

/** The lines already shipped, by opening — the DURABLE cache. The line cache
 *  and the explorer cache are gitignored, so a checkout without them must
 *  still rebuild the same files: never a wipe because a cache is missing. */
function readShipped() {
  const out = new Map();
  if (!existsSync(OUT_DIR)) return out;
  for (const name of readdirSync(OUT_DIR)) {
    if (name === 'index.json' || !name.endsWith('.json')) continue;
    try {
      const f = JSON.parse(readFileSync(OUT_DIR + name, 'utf8'));
      if (f.rev === BUILD_REV) out.set(f.openingId, f);
    } catch { /* unreadable: rebuilt from the walk */ }
  }
  return out;
}

/** Every built line by key: the shipped ones, then the line cache over them. */
function readBuilt(shipped) {
  const built = new Map();
  for (const f of shipped.values()) {
    for (const r of f.replies) {
      built.set(lineKey(f.openingId, r.board, r.san), { cont: r.cont, endCp: r.endCp, stop: r.middlegame ? 'middlegame' : 'max-plies', share: r.share });
    }
  }
  if (!existsSync(CACHE_DIR)) return built;
  for (const f of readdirSync(CACHE_DIR).filter((n) => /^lines\.shard-\d+\.jsonl$/.test(n))) {
    for (const line of readFileSync(CACHE_DIR + f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (r.rev === BUILD_REV) built.set(r.key, { ...built.get(r.key), ...r });
      } catch { /* a half-written last line */ }
    }
  }
  return built;
}

if (process.argv.includes('--assemble')) {
  const shipped = readShipped();
  const built = readBuilt(shipped);
  const bands = [...new Set([
    ...done.flatMap(([, r]) => (r.replies ?? []).flatMap((x) => Object.keys(x.bandReach ?? {}))),
    ...[...shipped.values()].flatMap((f) => f.bands),
  ])].sort();
  const bandCaches = {};
  for (const b of bands) {
    const f = `${EXPLORER_DIR}amateur-${b.replace(',', '-')}.json`;
    bandCaches[b] = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const index = {};
  const report = { walk: WALK, builtAt: new Date().toISOString(), openingsWalked: done.length, totals: {}, openings: {} };
  // Every opening the walk covers, and every opening already shipped: one the
  // walk has not (yet) reached keeps its shipped lines, re-checked against the
  // current course — absent from this walk is not "no club replies".
  const walked = new Map(done);
  for (const id of new Set([...walked.keys(), ...shipped.keys()])) {
    const entry = walked.get(id) ?? {
      replies: shipped.get(id).replies.map((r) => ({ fen: `${r.board} 0 1`, san: r.san, games: r.games, nodeShare: r.pct, bandReach: r.reach })),
    };
    const o = course.get(id);
    if (!o) { report.openings[id] = { counts: { 'off-course': (entry.replies ?? []).length } }; continue; }
    const { file, counts } = assembleOpening(o, entry, taughtBoards(o.lines), built, bands, bandCaches);
    report.openings[id] = { counts, ...(walked.has(id) ? {} : { from: 'shipped' }) };
    for (const [k, n] of Object.entries(counts)) report.totals[k] = (report.totals[k] ?? 0) + n;
    if (file) {
      writeFileSync(`${OUT_DIR}${id}.json`, JSON.stringify({ ...file, rev: BUILD_REV }));
      index[id] = file.replies.length;
    }
  }
  // G8: an opening that no longer has a club reply loses its file.
  for (const name of readdirSync(OUT_DIR)) {
    if (name === 'index.json' || !name.endsWith('.json')) continue;
    if (!(name.slice(0, -5) in index)) rmSync(OUT_DIR + name);
  }
  // Sorted, so every checkout writes the same bytes from the same lines.
  const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(`${OUT_DIR}index.json`, JSON.stringify({ bands, openings: sorted }));
  mkdirSync(root + 'audit-reports', { recursive: true });
  writeFileSync(root + 'audit-reports/club-replies-build.json', JSON.stringify(report, null, 1));
  const shards = existsSync(CACHE_DIR) ? readdirSync(CACHE_DIR).filter((n) => n.endsWith('.jsonl')).length : 0;
  console.log(`[assemble] ${done.length} openings walked · ${Object.keys(index).length} with club replies · ${JSON.stringify(report.totals)} · ${built.size} built lines from ${shards} shard files`);
  process.exit(0);
}

// ------------------------------------------------------------------ a shard
const [I, N] = (arg('shard', '0/1')).split('/').map(Number);
const deadline = Date.now() + Number(arg('minutes', '18')) * 60_000;
const built = readBuilt(readShipped());
const todo = [];
for (const [id, entry] of done) {
  const o = course.get(id);
  if (!o) continue;
  const taught = taughtBoards(o.lines);
  for (const r of entry.replies ?? []) {
    const cls = classifyReply(taught, r);
    if (cls.status !== 'candidate') continue;
    const key = lineKey(id, cls.board, cls.san);
    if (!built.has(key)) todo.push({ o, key, path: cls.path, san: cls.san });
  }
}
const mine = todo.filter((_, k) => k % N === I);
console.log(`[club ${I}/${N}] ${done.length} openings walked · ${todo.length} lines to build · ${mine.length} in this shard · ${built.size} already built`);
if (mine.length === 0) process.exit(0);

const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
mkdirSync(CACHE_DIR, { recursive: true });
const outFile = `${CACHE_DIR}lines.shard-${I}.jsonl`;
const engine = new Engine();
const t0 = Date.now();
let n = 0;
for (const { o, key, path, san } of mine) {
  if (Date.now() > deadline) { console.log(`[club ${I}/${N}] time budget reached — ${n} built this run, ${mine.length - n} left: run again`); break; }
  const out = await walkToMiddlegame([...path, san], {
    studentColor: o.color, engine, masters, knownMistakes, openingId: o.id,
    // The course's own rule for a reply line (build-course-sublines.mjs): at
    // least two student moves past the reply, ending on the student's move.
    minLength: path.length + 5,
  });
  const c = new Chess();
  for (const m of out) c.move(m);
  let endCp = null;
  if (c.isCheckmate()) endCp = studentCp(-MATE, c.fen(), o.color);
  else if (c.isDraw() || c.isStalemate()) endCp = 0;
  else {
    const read = await engine.analyse(c.fen(), { depth: FINAL_DEPTH });
    endCp = read.score === null ? null : studentCp(read.score, c.fen(), o.color);
  }
  const cont = out.slice(path.length + 1);
  const lastByStudent = (out.length - 1) % 2 === (o.color === 'white' ? 0 : 1);
  const stop = reachesMiddlegame(out.join(' ')).pass && lastByStudent ? 'middlegame' : 'max-plies';
  appendFileSync(outFile, JSON.stringify({ rev: BUILD_REV, key, cont, endCp, stop }) + '\n');
  n++;
  if (n % 10 === 0) {
    const rate = (Date.now() - t0) / n / 1000;
    console.log(`[club ${I}/${N}] ${n}/${mine.length} · ${rate.toFixed(1)}s a line · ~${Math.round(((mine.length - n) * rate) / 60)}min left`);
  }
}
engine.quit();
console.log(`[club ${I}/${N}] done ${n} this run`);
