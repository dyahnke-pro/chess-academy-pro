#!/usr/bin/env node
/*
 * build-spine-match — formation-matched sweep for MASTERCLASS theory lines.
 * Master lines were formed by walking the most-played masters move per ply
 * (build-opening-spine.mjs). This verifies the SHIPPED line still traces real
 * master games: for every ply it looks the position up in the offline masters
 * DB (public/data/openings-masters-db.json, 131,895 positions) and flags where
 * the line LEAVES master territory or plays a move no master chose. The engine
 * soundness floor can't see this — the Vienna line evals +0.7 yet runs 11 plies
 * past where any master game ever reached. (David 2026-06-29.)
 *
 * Emits src/data/grounding-spine.json (per master line: pastTheoryTail +
 * off-book plies). Pro-rep lines are EXCLUDED — they're the pro's own games,
 * verified by provenance, not master theory.
 *
 * Run: node scripts/ci/build-spine-match.cjs
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'src', 'data');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const MDB = readJson(path.join(ROOT, 'public/data/openings-masters-db.json')).positions;

const FLOOR = 5;          // a position "in theory" = reached by ≥5 master games
const key = (fen) => fen.split(' ').slice(0, 4).join(' '); // placement turn castling ep

function lookup(fen) {
  const e = MDB[key(fen)];
  if (!e) return null;
  const total = e.reduce((s, x) => s + x.games, 0);
  return { moves: e, total };
}

// Walk one line; return its spine-match metrics.
function analyze(pgn) {
  const c = new Chess();
  const sans = pgn.trim().split(/\s+/);
  let lastTheoryPly = 0;           // last ply whose BEFORE-position was in theory
  const offBook = [];              // {ply, san}: position in DB (≥FLOOR) but move 0 games
  let illegalAt = null;
  for (let i = 0; i < sans.length; i++) {
    const before = c.fen();
    const look = lookup(before);
    if (look && look.total >= FLOOR) {
      lastTheoryPly = i;           // before-position is real theory
      const me = look.moves.find((m) => m.san === sans[i]);
      if (!me || me.games === 0) offBook.push({ ply: i + 1, san: sans[i], top: look.moves[0].san, topGames: look.moves[0].games });
    }
    try { if (!c.move(sans[i])) { illegalAt = sans[i]; break; } }
    catch { illegalAt = sans[i]; break; }
  }
  const plies = illegalAt ? sans.indexOf(illegalAt) : sans.length;
  return { plies, lastTheoryPly, pastTheoryTail: plies - lastTheoryPly, offBook, illegalAt };
}

// ── master lines (NOT pro-rep) ───────────────────────────────────────────────
function masterLines() {
  const out = [];
  const add = (id, name, pgn, src) => { if (pgn && pgn.trim() && !String(id).startsWith('pro-')) out.push({ id, name, pgn: pgn.trim(), src }); };
  for (const f of ['repertoire.json', 'gambits.json']) {
    const d = readJson(path.join(DATA, f)); const arr = Array.isArray(d) ? d : (d.openings || []);
    for (const o of arr) { add(o.id, `${o.name} — main`, o.pgn, f); for (const v of o.variations || []) add(o.id, `${o.name} :: ${v.name}`, v.pgn || v.moves, f); }
  }
  // lesson beat lines for non-pro openings
  const ldir = path.join(DATA, 'lessons');
  for (const f of fs.readdirSync(ldir).filter((x) => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
    const txt = fs.readFileSync(path.join(ldir, f), 'utf8');
    const idm = txt.match(/openingId:\s*'([^']+)'/); const id = idm ? idm[1] : f.replace(/\.ts$/, '');
    if (String(id).startsWith('pro-') || /pro[A-Z]/.test(f)) continue;
    const seen = new Set();
    for (const m of txt.matchAll(/moves:\s*'([^']+)'/g)) {
      const pgn = m[1].trim();
      if (pgn.split(/\s+/).length < 6 || seen.has(pgn)) continue; // only the deeper lesson lines
      seen.add(pgn); add(id, `${id} :: ${f} (${pgn.split(/\s+/).length}-ply)`, pgn, `lesson:${f}`);
    }
  }
  return out;
}

const lines = masterLines();
const results = lines.map((l) => ({ ...l, ...analyze(l.pgn) }));
fs.writeFileSync(path.join(DATA, 'grounding-spine.json'), JSON.stringify({ floor: FLOOR, total: results.length, lines: results }, null, 2));

// Console summary, worst first
const TAIL = 4;
const flagged = results.filter((r) => r.illegalAt || r.pastTheoryTail > TAIL || r.offBook.length);
flagged.sort((a, b) => (b.pastTheoryTail + b.offBook.length * 3) - (a.pastTheoryTail + a.offBook.length * 3));
console.log(`Master lines: ${results.length} | flagged: ${flagged.length} (pastTheoryTail>${TAIL} or off-book or illegal)\n`);
for (const r of flagged.slice(0, 40)) {
  const bits = [];
  if (r.illegalAt) bits.push(`ILLEGAL@${r.illegalAt}`);
  if (r.pastTheoryTail > TAIL) bits.push(`past-theory tail ${r.pastTheoryTail} (left masters at ply ${r.lastTheoryPly}/${r.plies})`);
  if (r.offBook.length) bits.push(`off-book: ${r.offBook.map((o) => `${o.san}@${o.ply}(top ${o.top}:${o.topGames})`).join(', ')}`);
  console.log(`  ${r.name}\n      ${bits.join(' | ')}`);
}
console.log(`\nWrote ${path.join(DATA, 'grounding-spine.json')}`);
