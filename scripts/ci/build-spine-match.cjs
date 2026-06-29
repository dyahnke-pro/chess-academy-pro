#!/usr/bin/env node
/*
 * build-spine-match — formation-matched sweep for MASTERCLASS theory lines,
 * against the LIVE Lichess explorer (full depth), NOT the shallow local masters
 * DB snapshot (which only covers opening depth and produced massive false
 * positives — the Italian main line has 1800+ master games at ply 16 yet is
 * absent from the local DB). For every line it asks the live explorer whether
 * masters (or strong 2000-2500 players, the build-opening-spine fallback)
 * actually reached the TERMINAL position via that exact path. If not, it walks
 * back to find where the line LEFT real play — the invented/over-extended tail
 * (the Vienna class). Cached so re-runs are fast.  (David 2026-06-29.)
 *
 * Emits src/data/grounding-spine.json. Pro-rep lines EXCLUDED (provenance, not
 * master theory). Run: node scripts/ci/build-spine-match.cjs [--floor 5]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'src', 'data');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const args = process.argv.slice(2);
const FLOOR = Number((args[args.indexOf('--floor') + 1]) || 5);
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const CACHE_PATH = path.join(DATA, 'grounding-spine-cache.json');
const cache = fs.existsSync(CACHE_PATH) ? readJson(CACHE_PATH) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function uci(sans) { const c = new Chess(); return sans.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion || ''); }); }
function legalPrefixLen(sans) { const c = new Chess(); let i = 0; for (; i < sans.length; i++) { try { if (!c.move(sans[i])) break; } catch { break; } } return i; }

// total games at a position (path = uci move list) for a source, cached + retried
async function totalGames(uciPath, source) {
  const ckey = `${source}|${uciPath.join(',')}`;
  if (ckey in cache) return cache[ckey];
  const extra = source === 'lichess' ? '&ratings=2000,2200,2500&speeds=blitz,rapid,classical' : '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(`${PROXY}?source=${source}&play=${uciPath.join(',')}${extra}`);
      if (r.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!r.ok) { cache[ckey] = -1; return -1; }
      const j = await r.json();
      const tot = (j.moves || []).reduce((s, m) => s + m.white + m.draws + m.black, 0)
        + ((j.white || 0) + (j.draws || 0) + (j.black || 0) - 0); // node's own count if present
      cache[ckey] = tot; return tot;
    } catch { await sleep(800); }
  }
  cache[ckey] = -1; return -1;
}
// "in real play" at this ply prefix = masters OR strong-lichess has ≥FLOOR games
async function inPlay(sans, ply) {
  const u = uci(sans.slice(0, ply));
  let m = await totalGames(u, 'masters'); await sleep(120);
  if (m >= FLOOR) return { ok: true, src: 'masters', games: m };
  let l = await totalGames(u, 'lichess'); await sleep(120);
  return { ok: l >= FLOOR, src: l >= FLOOR ? 'lichess' : 'none', games: Math.max(m, l) };
}

function masterLines() {
  const out = [];
  const add = (id, name, pgn) => { if (pgn && pgn.trim() && !String(id).startsWith('pro-')) out.push({ id, name, pgn: pgn.trim() }); };
  for (const f of ['repertoire.json', 'gambits.json']) {
    const d = readJson(path.join(DATA, f)); const arr = Array.isArray(d) ? d : (d.openings || []);
    for (const o of arr) { add(o.id, `${o.name} — main`, o.pgn); for (const v of o.variations || []) add(o.id, `${o.name} :: ${v.name}`, v.pgn || v.moves); }
  }
  const ldir = path.join(DATA, 'lessons');
  for (const f of fs.readdirSync(ldir).filter((x) => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
    const txt = fs.readFileSync(path.join(ldir, f), 'utf8');
    const idm = txt.match(/openingId:\s*'([^']+)'/); const id = idm ? idm[1] : f.replace(/\.ts$/, '');
    if (String(id).startsWith('pro-') || /pro[A-Z]/.test(f)) continue;
    const seen = new Set();
    for (const m of txt.matchAll(/moves:\s*'([^']+)'/g)) { const pgn = m[1].trim(); if (pgn.split(/\s+/).length < 6 || seen.has(pgn)) continue; seen.add(pgn); add(id, `${id} :: ${f}`, pgn); }
  }
  // dedupe identical pgns
  const byPgn = new Map(); for (const l of out) if (!byPgn.has(l.pgn)) byPgn.set(l.pgn, l);
  return [...byPgn.values()];
}

(async () => {
  const lines = masterLines();
  console.log(`Spine-match (LIVE explorer, floor ${FLOOR}): ${lines.length} master lines…\n`);
  const results = [];
  let n = 0;
  for (const l of lines) {
    n++;
    const sans = l.pgn.split(/\s+/);
    const plies = legalPrefixLen(sans);
    if (plies < sans.length) { results.push({ ...l, plies, illegalAt: sans[plies], lastTheoryPly: null, pastTail: null }); continue; }
    // terminal first
    const term = await inPlay(sans, plies);
    if (term.ok) { results.push({ ...l, plies, lastTheoryPly: plies, pastTail: 0, termGames: term.games }); }
    else {
      // walk back to the deepest ply still in real play
      let last = 0;
      for (let p = plies - 1; p >= 2; p--) { const r = await inPlay(sans, p); if (r.ok) { last = p; break; } }
      results.push({ ...l, plies, lastTheoryPly: last, pastTail: plies - last, termGames: term.games });
    }
    if (n % 25 === 0) { process.stdout.write(`  ${n}/${lines.length}\n`); fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  fs.writeFileSync(path.join(DATA, 'grounding-spine.json'), JSON.stringify({ floor: FLOOR, total: results.length, lines: results }, null, 2));
  const TAIL = 4;
  const flagged = results.filter((r) => r.illegalAt || (r.pastTail != null && r.pastTail > TAIL));
  flagged.sort((a, b) => (b.pastTail || 0) - (a.pastTail || 0));
  console.log(`\nFlagged ${flagged.length}/${results.length} (invented/over-extended tail > ${TAIL} plies past real play):\n`);
  for (const r of flagged.slice(0, 50)) console.log(`  ${r.illegalAt ? `ILLEGAL@${r.illegalAt}` : `tail ${r.pastTail} (left play at ply ${r.lastTheoryPly}/${r.plies})`}  —  ${r.name}`);
  console.log(`\nWrote grounding-spine.json (${flagged.length} flagged).`);
})().catch((e) => { console.error(e); process.exit(1); });
