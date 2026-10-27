// The opponent's replies at a student's rating that no taught line covers —
// MEASURED from the Lichess explorer (WO-COURSE-01 D). Every taught line of an
// opening (main, variations, sublines) is walked from the position where the
// opening starts; at each opponent-to-move board the explorer says what
// players at a rating band play there. A reply is kept when a student playing
// this opening meets it in at least REACH_CUT of their games (games through
// that reply ÷ games at the opening's start) and no taught line plays it.
// The walk only goes deeper while the board itself clears the cut, so a deep
// board almost nobody reaches costs no lookup.
//
// Usage:
//   LICHESS_TOKEN_FILE=<file> node scripts/course-replies/explorer-walk.mjs [--ids a,b] [--bands 1000,1200|1400,1600]
// The walk itself reads ALL amateur ratings at once (one lookup per board);
// the per-band share is read only at the boards where a reply was found.
// Lichess allows ~25 lookups a minute. Lookups are cached in
// data/sources/explorer-cache/ (gitignored) and saved as they arrive, so a
// killed run resumes where it stopped. Progress prints every 25 lookups.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};

export const REACH_CUT = Number(process.env.REACH_CUT ?? 0.005);
// The combined (all-ratings) pass dilutes a reply that is common at ONE level
// only — a beginners' blunder is rare at 2000 — so it keeps looser candidates
// and descends deeper, and each candidate is then read at every band; a reply
// stays when ANY band meets REACH_CUT. Measured on the Italian: the strict
// combined cut found 17 of the 25 replies the per-band walk found.
const CANDIDATE_CUT = REACH_CUT * 0.3;
const DESCENT_CUT = REACH_CUT * 0.5;
const BANDS = arg('bands', '1000,1200|1400,1600|1800,2000').split('|');
const DISCOVERY = '1000,1200,1400,1600,1800,2000';
const ONLY = arg('ids', null)?.split(',');
const TOKEN = readFileSync(process.env.LICHESS_TOKEN_FILE, 'utf8').trim();
const CACHE_DIR = root + 'data/sources/explorer-cache/';
mkdirSync(CACHE_DIR, { recursive: true });

const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');
const tokens = (pgn) =>
  (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

// ---------------------------------------------------------------- the course
function courseOpenings() {
  const rep = J('src/data/repertoire.json');
  const proRaw = J('src/data/pro-repertoires.json');
  const pro = Array.isArray(proRaw) ? proRaw : proRaw.openings;
  const g = J('src/data/gambits.json');
  const gam = Array.isArray(g) ? g : g.openings ?? g.gambits ?? [];
  let anti = [];
  try { const a = J('src/data/anti-openings.json'); anti = Array.isArray(a) ? a : a.openings ?? Object.values(a); } catch { /* none */ }
  const subs = J('src/data/course-sublines.json');
  const out = [];
  for (const o of [...rep, ...gam, ...anti, ...pro]) {
    if (!o?.id || !o.pgn || (ONLY && !ONLY.includes(o.id))) continue;
    const spine = [tokens(o.pgn), ...(o.variations ?? []).map((v) => tokens(v.pgn)).filter((t) => t.length)];
    const lines = [...spine];
    for (const list of Object.values(subs[o.id] ?? {})) for (const s of list) lines.push(s.moves);
    out.push({ id: o.id, name: o.name, color: o.color, spine, lines });
  }
  return out;
}

/** The moves every main line / variation shares — where the opening starts. */
function commonPrefix(seqs) {
  const out = [];
  for (let i = 0; ; i++) {
    const m = seqs[0]?.[i];
    if (!m || seqs.some((s) => s[i] !== m)) return out;
    out.push(m);
  }
}

// ---------------------------------------------------------------- explorer
const caches = new Map();
function cacheFor(band) {
  if (!caches.has(band)) {
    const f = `${CACHE_DIR}amateur-${band.replace(',', '-')}.json`;
    caches.set(band, { f, data: existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}, dirty: 0 });
  }
  return caches.get(band);
}
let lookups = 0;
let fetched = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function explore(band, fen) {
  const c = cacheFor(band);
  const key = pos(fen);
  if (c.data[key]) return c.data[key];
  const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid,classical&ratings=${band}&moves=30&topGames=0&recentGames=0&fen=${encodeURIComponent(fen)}`;
  // A 429 is Lichess asking us to slow down, never a reason to stop: back off
  // longer each time (1, 2, 4 … up to 15 minutes) for as long as 2 hours. The
  // run that gave up after six one-minute waits lost an afternoon's progress.
  let rateWaits = 0;
  let rateWaited = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } }).catch(() => null);
    if (res?.status === 429) {
      const wait = Math.min(60_000 * 2 ** rateWaits, 15 * 60_000);
      if (rateWaited + wait > 2 * 60 * 60_000) break;
      rateWaits++;
      rateWaited += wait;
      console.log(`[429] waiting ${Math.round(wait / 60_000)}min (${fetched} fetched)`);
      flush();
      await sleep(wait);
      attempt--;
      continue;
    }
    if (!res?.ok) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await res.json();
    const total = j.white + j.draws + j.black;
    const moves = j.moves.map((m) => ({ san: m.san, games: m.white + m.draws + m.black }));
    c.data[key] = { total, moves };
    fetched++;
    if (++c.dirty >= 25) { writeFileSync(c.f, JSON.stringify(c.data)); c.dirty = 0; }
    await sleep(2400);
    return c.data[key];
  }
  throw new Error(`explorer failed for ${fen}`);
}
function flush() { for (const c of caches.values()) writeFileSync(c.f, JSON.stringify(c.data)); }

// ---------------------------------------------------------------- the walk
/** New replies for one opening, walked at all amateur ratings; each reply then
 *  carries its reach at every band in BANDS. */
export async function walkOpening(o) {
  const band = DISCOVERY;
  const start = commonPrefix(o.spine);
  const studentTurn = o.color === 'white' ? 'w' : 'b';
  // The union tree of every taught line, by board.
  const taught = new Map(); // pos -> { fen, next: Set<san>, children: Map<san, fenAfter> }
  for (const line of o.lines) {
    const c = new Chess();
    for (const san of line) {
      const fen = c.fen();
      let m;
      try { m = c.move(san); } catch { break; }
      if (!m) break;
      const k = pos(fen);
      const node = taught.get(k) ?? { fen, children: new Map() };
      node.children.set(m.san, c.fen());
      taught.set(k, node);
    }
  }
  const c0 = new Chess();
  for (const san of start) c0.move(san);
  const rootFen = c0.fen();
  const rootData = await explore(band, rootFen);
  const rootGames = rootData.total;
  if (!rootGames) return { rootGames: 0, replies: [] };

  const replies = [];
  const seen = new Set();
  const queue = [rootFen];
  while (queue.length) {
    const fen = queue.shift();
    const k = pos(fen);
    if (seen.has(k)) continue;
    seen.add(k);
    const node = taught.get(k);
    const opponentToMove = fen.split(' ')[1] !== studentTurn;
    if (opponentToMove) {
      const data = k === pos(rootFen) ? rootData : await explore(band, fen);
      lookups++;
      if (lookups % 25 === 0) console.log(`[walk] ${o.id} ${band}: ${lookups} lookups, ${fetched} fetched, ${replies.length} new so far`);
      if (data.total / rootGames < DESCENT_CUT) continue;
      for (const mv of data.moves) {
        const reach = mv.games / rootGames;
        if (reach < CANDIDATE_CUT) continue;
        if (node?.children.has(mv.san)) continue;
        replies.push({ fen, san: mv.san, reach: Math.round(reach * 10000) / 100, games: mv.games, nodeShare: Math.round((mv.games / data.total) * 1000) / 10 });
      }
    }
    if (node) for (const next of node.children.values()) queue.push(next);
  }
  for (const b of BANDS) {
    const bandRoot = (await explore(b, rootFen)).total;
    for (const r of replies) {
      const at = await explore(b, r.fen);
      const g = at.moves.find((m) => m.san === r.san)?.games ?? 0;
      (r.bandReach ??= {})[b] = bandRoot ? Math.round((g / bandRoot) * 10000) / 100 : 0;
    }
  }
  const kept = replies.filter((r) => Object.values(r.bandReach ?? {}).some((pct) => pct >= REACH_CUT * 100));
  return { rootGames, start: start.join(' '), candidates: replies.length, replies: kept };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const openings = courseOpenings();
  console.log(`[walk] ${openings.length} openings, cut ${REACH_CUT * 100}% of the opening's games, per-band reach for ${BANDS.join(' / ')}`);
  const out = root + 'audit-reports/course-replies-count.json';
  const report = existsSync(out) && process.env.FRESH !== '1' ? JSON.parse(readFileSync(out, 'utf8')) : { cut: REACH_CUT, openings: {} };
  report.cut = REACH_CUT;
  const t0 = Date.now();
  try {
    for (const o of openings) {
      if (report.openings[o.id]?.done) continue;
      const r = await walkOpening(o);
      report.openings[o.id] = { ...r, done: true };
      console.log(`[done] ${o.id}: ${r.replies.length} new replies · ${Math.round((Date.now() - t0) / 60000)}min, ${fetched} fetched`);
      writeFileSync(out, JSON.stringify(report, null, 1));
    }
  } finally {
    flush(); // a crash keeps every lookup already paid for
  }
  const unique = new Set();
  let total = 0;
  for (const r of Object.values(report.openings)) for (const x of r.replies ?? []) { total++; unique.add(`${pos(x.fen)}|${x.san}`); }
  console.log(`[total] ${total} new reply lines over ${Object.keys(report.openings).length} openings · ${unique.size} distinct boards+replies · ${fetched} lookups this run`);
}
