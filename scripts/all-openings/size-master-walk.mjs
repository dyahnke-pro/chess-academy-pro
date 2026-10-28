// THE DRY RUN for WO-ALL-OPENINGS-01 phase 1 — how big a depth-first walk of
// the masters' explorer would be, read off the masters file we already ship
// (`public/data/openings-masters-db.json`), with no lookup. For every named
// line in the opening database: walk every reply masters played in MIN_GAMES+
// games, depth-first, until STOP_PLY. A board the file holds costs nothing; a
// board it lacks is a FRONTIER board the walk would have to ask Lichess for.
// Below the frontier the count is projected from the file's own complete
// region: how many MIN_GAMES+ boards a board with G games has under it.
//
//   node scripts/all-openings/size-master-walk.mjs [--min 10] [--stop 30] [--untaught]
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('min', 10));
const STOP = Number(arg('stop', 30));
const UNTAUGHT = process.argv.includes('--untaught');

const db = J('public/data/openings-masters-db.json');
const P = db.positions ?? Object.fromEntries(Object.entries(db).filter(([k]) => k.includes('/')));
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const sans = (pgn) => (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

// The taught lines, so --untaught can leave out every named line on one.
const taught = [];
for (const o of J('src/data/repertoire.json')) { taught.push(sans(o.pgn)); for (const v of o.variations ?? []) taught.push(sans(v.pgn)); }
for (const o of J('src/data/pro-repertoires.json').openings ?? J('src/data/pro-repertoires.json')) { taught.push(sans(o.pgn)); for (const v of o.variations ?? []) taught.push(sans(v.pgn)); }
const onTaught = (line) => taught.some((t) => line.length <= t.length && line.every((m, i) => m === t[i]));

// Projection from the complete region: where the file holds a board's whole
// subtree R plies deep, a board with G games shows how many MIN+ boards hang
// under it per game per ply.
const R = 4;
function subtree(fen, left, seen) {
  if (left <= 0) return 0;
  const moves = P[key(fen)];
  if (!moves) return null; // left the file
  let n = 0;
  for (const m of moves) {
    if (m.games < MIN) continue;
    const c = new Chess(fen);
    try { c.move(m.san); } catch { continue; }
    const k = key(c.fen());
    if (seen.has(k)) continue;
    seen.add(k);
    const s = subtree(c.fen(), left - 1, seen);
    if (s === null) return null;
    n += 1 + s;
  }
  return n;
}

const visited = new Set();
const frontier = new Map(); // key → { games reaching it, ply }
let inFile = 0;
let lines = 0;
function walk(fen, ply, gamesHere) {
  const k = key(fen);
  if (visited.has(k)) return;
  visited.add(k);
  if (ply >= STOP) return;
  const moves = P[k];
  if (!moves) { frontier.set(k, { games: gamesHere, ply }); return; }
  inFile += 1;
  for (const m of moves) {
    if (m.games < MIN) continue;
    const c = new Chess(fen);
    try { c.move(m.san); } catch { continue; }
    walk(c.fen(), ply + 1, m.games);
  }
}

for (const o of J('src/data/openings-lichess.json')) {
  const line = sans(o.pgn);
  if (UNTAUGHT && onTaught(line)) continue;
  const c = new Chess();
  let ok = true;
  let games = Infinity;
  for (const s of line) {
    const here = P[key(c.fen())];
    const hit = here?.find((m) => m.san === s);
    games = Math.min(games, hit?.games ?? 0);
    try { c.move(s); } catch { ok = false; break; }
  }
  if (!ok) continue;
  lines += 1;
  walk(c.fen(), line.length, games === Infinity ? 0 : games);
}

// Under the frontier: boards per game, from boards the file holds in full.
const samples = [];
for (const [k, moves] of Object.entries(P)) {
  const total = moves.reduce((a, m) => a + m.games, 0);
  if (total < 100 || samples.length >= 2000) continue;
  const sub = subtree(`${k} 0 1`, R, new Set());
  if (sub !== null) samples.push({ total, sub });
}
const perGame = samples.length ? samples.reduce((a, s) => a + s.sub / s.total, 0) / samples.length / R : 0;
let projected = 0;
for (const f of frontier.values()) projected += 1 + f.games * perGame * Math.max(0, STOP - f.ply);

const out = {
  min: MIN, stop: STOP, untaught: UNTAUGHT, namedLines: lines,
  boardsInFile: inFile, frontierBoards: frontier.size,
  frontierGames: { '10-49': 0, '50-199': 0, '200+': 0 },
  boardsPerGamePerPly: +perGame.toFixed(4), samples: samples.length,
  projectedLookups: Math.round(projected),
  hoursAt25PerMinute: +(projected / 25 / 60).toFixed(1),
};
for (const { games: g } of frontier.values()) out.frontierGames[g >= 200 ? '200+' : g >= 50 ? '50-199' : '10-49'] += 1;
writeFileSync(root + `audit-reports/all-openings-walk-size-${MIN}-${STOP}${UNTAUGHT ? '-untaught' : ''}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
