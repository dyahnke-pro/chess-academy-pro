#!/usr/bin/env node
/*
 * build-grounding — enumerate every gateable chess artifact across all content
 * types, compute the positions each gate needs, engine-eval them (cached), and
 * emit:
 *   src/data/grounding-evals.json  — { fen: {cp,mate,depth} } white-POV cache
 *   src/data/grounding-items.json  — the enumerated items + their fen refs +
 *                                    per-type rule inputs (what the gates read)
 *
 * The gates (vitest, in ship-check) read these two committed files and assert —
 * NO engine at test time, so ship-check stays fast. Re-run this when content
 * changes; it only evals FENs not already cached at the target depth.
 *
 * Run: node scripts/ci/build-grounding.cjs [--depth 14] [--only lines|mistakes|traps|gems]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { makeEngine } = require('./grounding-engine.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'src', 'data');
const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DEPTH = Number(argv('--depth', 14));
const ONLY = argv('--only', '');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const evalsPath = path.join(DATA, 'grounding-evals.json');
const itemsPath = path.join(DATA, 'grounding-items.json');
const cache = fs.existsSync(evalsPath) ? JSON.parse(fs.readFileSync(evalsPath, 'utf8')) : {};

// ── helpers ─────────────────────────────────────────────────────────────────
// chess.js 1.4 THROWS on an illegal move (it doesn't return null). An illegal
// move in a stored line is itself a finding — return null so the position is
// uneval'd and its gate flags it ILLEGAL, never crashing the build.
function terminalFen(pgn) {
  const c = new Chess();
  for (const san of pgn.trim().split(/\s+/)) {
    try { if (!c.move(san)) return null; } catch { return null; }
  }
  return c.fen();
}
function fenAfter(fen, san) {
  try { const c = new Chess(fen); return c.move(san) ? c.fen() : null; } catch { return null; }
}
function fenAfterMoves(fen, moves) {
  try { const c = new Chess(fen); for (const m of moves) { if (!c.move(m)) return null; } return c.fen(); } catch { return null; }
}
const BLACK_RE = /caro|sicilian|najdorf|dragon|french|pirc|scandinav|alekhine|king'?s?.?indian|kingsindian|grunfeld|gruenfeld|benoni|dutch|nimzo|slav|qgd|semi.?slav|petrov|philidor|budapest/i;
function inferColor(id, name) { return COLOR[id] || (BLACK_RE.test(id || '') || BLACK_RE.test(name || '') ? 'black' : 'white'); }
const GAMBIT_RE = /gambit|muzio|allgaier|max.?lange|counter.?gambit|sacrifice|king'?s.?gambit|evans|smith.?mor|danish|halloween|fishing.?pole|fried.?liver|stafford/i;

// ── enumerate items ─────────────────────────────────────────────────────────
function colorMap() {
  const m = {};
  for (const f of ['repertoire.json', 'gambits.json', 'pro-repertoires.json']) {
    if (!fs.existsSync(path.join(DATA, f))) continue;
    const d = readJson(f); const arr = Array.isArray(d) ? d : (d.openings || []);
    for (const o of arr) if (o && o.id) m[o.id] = o.color || 'white';
  }
  return m;
}
const COLOR = colorMap();

function enumLines() {
  const out = [];
  for (const f of ['repertoire.json', 'gambits.json', 'pro-repertoires.json']) {
    if (!fs.existsSync(path.join(DATA, f))) continue;
    const d = readJson(f); const arr = Array.isArray(d) ? d : (d.openings || []);
    for (const o of arr) {
      if (!o || typeof o !== 'object') continue;
      const isPro = f === 'pro-repertoires.json';
      const push = (name, pgn) => { if (pgn && pgn.trim()) out.push({ cat: 'line', src: f, isPro, id: o.id, color: o.color || 'white', name, pgn: pgn.trim(), isGambit: GAMBIT_RE.test(name) || GAMBIT_RE.test(o.id || '') }); };
      push(`${o.name} — main`, o.pgn);
      for (const v of o.variations || []) push(`${o.name} :: ${v.name}`, v.pgn || v.moves);
    }
  }
  return out;
}
function enumMistakes() {
  const out = [];
  const d = readJson('common-mistakes.json');
  for (const [openingId, list] of Object.entries(d)) {
    if (!Array.isArray(list)) continue;
    for (const e of list) {
      if (!e || !e.fen || !e.wrongMove || !e.correctMove) continue;
      out.push({ cat: 'mistake', openingId, fen: e.fen, wrongMove: e.wrongMove, correctMove: e.correctMove });
    }
  }
  return out;
}
function enumTraps() {
  const out = [];
  for (const f of ['repertoire.json', 'pro-repertoires.json']) {
    if (!fs.existsSync(path.join(DATA, f))) continue;
    const d = readJson(f); const arr = Array.isArray(d) ? d : (d.openings || []);
    for (const o of arr) {
      for (const kind of ['trapLines', 'warningLines']) {
        for (const t of o[kind] || []) {
          const pgn = t.pgn || t.moves;
          if (pgn && pgn.trim()) out.push({ cat: kind === 'trapLines' ? 'trap' : 'warning', openingId: o.id, color: o.color || 'white', name: `${o.id} :: ${t.name}`, pgn: pgn.trim() });
        }
      }
    }
  }
  return out;
}
function enumGems() {
  const out = [];
  if (!fs.existsSync(path.join(DATA, 'punish-gems.json'))) return out;
  const d = readJson('punish-gems.json'); const arr = Array.isArray(d) ? d : (d.gems || []);
  for (const g of arr) {
    // playLine is a space-separated SAN string; fall back to assembling parts.
    let pgn = typeof g.playLine === 'string' ? g.playLine.trim() : null;
    if (!pgn && g.lineMoves && g.inaccuracy && Array.isArray(g.punishSeq)) {
      const lm = typeof g.lineMoves === 'string' ? g.lineMoves : (g.lineMoves || []).join(' ');
      pgn = `${lm} ${g.inaccuracy} ${g.punishSeq.join(' ')}`.trim();
    }
    if (!pgn) continue;
    out.push({ cat: 'gem', openingId: g.openingId, color: COLOR[g.openingId] || 'white', name: `${g.openingId} :: ${g.inaccuracy || ''}→${(g.punishSeq || [])[0] || ''}`, pgn, storedCp: g.engineCp ?? null, tier: g.tier ?? null });
  }
  return out;
}

// Lesson beat lines — the actual Watch/Learn/Practice content students see.
// EVERY `moves:` literal in every lessons/*.ts is enumerated (each beat is a
// checkpoint position the student reaches), so a deep lesson tail (the Vienna
// class) is covered, not just the short JSON variation pgn.
function enumLessons() {
  const dir = path.join(ROOT, 'src/data/lessons');
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const idm = txt.match(/openingId:\s*'([^']+)'/);
    const id = idm ? idm[1] : f.replace(/\.ts$/, '');
    const seen = new Set();
    for (const m of txt.matchAll(/moves:\s*'([^']+)'/g)) {
      const pgn = m[1].trim();
      if (pgn.split(/\s+/).length < 2 || seen.has(pgn)) continue;
      seen.add(pgn);
      out.push({ cat: 'lesson', src: f, id, color: inferColor(id, f), name: `${id} :: ${f} :: ${pgn.split(/\s+/).length}-ply`, pgn, isGambit: GAMBIT_RE.test(id) || GAMBIT_RE.test(f) });
    }
  }
  return out;
}
// Middlegame-plan playable lines (FEN-anchored: start FEN + SAN moves).
function enumPlans() {
  const out = [];
  if (!fs.existsSync(path.join(DATA, 'middlegame-plans.json'))) return out;
  const d = readJson('middlegame-plans.json'); const arr = Array.isArray(d) ? d : (d.plans || []);
  for (const p of arr) {
    for (const pl of p.playableLines || []) {
      if (!pl.fen || !Array.isArray(pl.moves) || !pl.moves.length) continue;
      out.push({ cat: 'plan', id: p.openingId, color: inferColor(p.openingId, p.title || ''), name: `${p.openingId} :: ${p.title || p.id}`, startFen: pl.fen, moves: pl.moves });
    }
  }
  return out;
}

// ── build ───────────────────────────────────────────────────────────────────
(async () => {
  let items = [];
  const want = (c) => !ONLY || ONLY === c || (ONLY === 'traps' && (c === 'trap' || c === 'warning'));
  const lines = enumLines(), mistakes = enumMistakes(), traps = enumTraps(), gems = enumGems();
  if (want('lines')) for (const l of lines) items.push({ ...l, terminalFen: terminalFen(l.pgn) });
  if (want('mistakes')) for (const m of mistakes) items.push({ ...m, fenWrong: fenAfter(m.fen, m.wrongMove), fenCorrect: fenAfter(m.fen, m.correctMove) });
  if (want('traps')) for (const t of [...traps]) items.push({ ...t, terminalFen: terminalFen(t.pgn) });
  if (want('gems')) for (const g of gems) items.push({ ...g, terminalFen: terminalFen(g.pgn) });

  // unique FENs needing eval
  const fenSet = new Set();
  for (const it of items) {
    for (const k of ['terminalFen', 'fenWrong', 'fenCorrect']) if (it[k]) fenSet.add(it[k]);
  }
  const allFens = [...fenSet];
  const todo = allFens.filter((f) => !(cache[f] && cache[f].depth >= DEPTH));
  console.log(`Items: ${items.length} (lines ${lines.length}, mistakes ${mistakes.length}, traps ${traps.length}, gems ${gems.length})`);
  console.log(`Unique FENs: ${allFens.length} | already cached@${DEPTH}: ${allFens.length - todo.length} | to eval: ${todo.length}`);

  if (todo.length) {
    const eng = makeEngine();
    let n = 0;
    for (const fen of todo) {
      const r = await eng.evalFen(fen, DEPTH);
      cache[fen] = { cp: r.cp, mate: r.mate, depth: DEPTH };
      if (++n % 50 === 0) { process.stdout.write(`  evaled ${n}/${todo.length}\n`); fs.writeFileSync(evalsPath, JSON.stringify(cache)); }
    }
    eng.quit();
    fs.writeFileSync(evalsPath, JSON.stringify(cache));
  }
  // attach evals to items + write items file (sorted for stable diffs)
  const attach = (f) => (f && cache[f]) ? cache[f] : null;
  for (const it of items) {
    if (it.terminalFen) it.eval = attach(it.terminalFen);
    if (it.fenWrong) it.evalWrong = attach(it.fenWrong);
    if (it.fenCorrect) it.evalCorrect = attach(it.fenCorrect);
  }
  fs.writeFileSync(itemsPath, JSON.stringify({ depth: DEPTH, builtFens: allFens.length, items }, null, 2));
  console.log(`\nWrote ${evalsPath} (${Object.keys(cache).length} evals) + ${itemsPath} (${items.length} items).`);
})().catch((e) => { console.error(e); process.exit(1); });
