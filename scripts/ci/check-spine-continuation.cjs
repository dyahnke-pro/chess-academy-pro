#!/usr/bin/env node
/*
 * check-spine-continuation — the MISSING stage-2 sweep (David 2026-06-29). The
 * other checks do stage-1 only: DB-most-played WHILE in book (check-main-lines)
 * + a terminal-only soundness eval (grounding gates). Neither verifies the moves
 * we play AFTER leaving the opening database. Per the build-opening-spine
 * doctrine, once a line leaves book the correct move is STOCKFISH'S BEST. This
 * walks each masterclass line, finds where it leaves the masters DB (last ply
 * with >= FLOOR master games, reusing the main-line explorer cache), then from
 * there compares OUR move to the engine's best at each ply — flagging any move
 * that concedes >= MARGIN vs best. That catches the quiet sub-optimal tail move
 * (the original Vienna-class bug) a terminal "is it losing" check sails past.
 *
 * Run: node scripts/ci/check-spine-continuation.cjs [--depth 16] [--margin 80]
 *      [--only vienna-game,ruy-lopez]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { makeEngine } = require('./grounding-engine.cjs');
const DATA = path.resolve(__dirname, '..', '..', 'src', 'data');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DEPTH = Number(argv('--depth', 14));
const MARGIN = Number(argv('--margin', 80));   // concede >= 0.8 vs best = flagged sub-optimal move
const FLOOR = Number(argv('--floor', 30));     // position is "in book" while it has >= this many master games
const SOURCE = argv('--source', 'repertoire'); // repertoire | lessons
const ONLY = (argv('--only', '') || '').split(',').filter(Boolean);
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const CACHE = path.join(DATA, 'main-line-cache.json');
const cache = fs.existsSync(CACHE) ? readJson(CACHE) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// persistent fen@depth -> eval cache so the big lesson-subline run dedupes the
// many shared tail positions (and survives restarts).
const EVAL_CACHE = path.join(DATA, 'spine-eval-cache.json');
const evalCache = fs.existsSync(EVAL_CACHE) ? readJson(EVAL_CACHE) : {};
let evalCacheDirty = 0;
async function cachedEval(eng, fen, depth) {
  const k = `${fen}@${depth}`;
  if (evalCache[k]) return evalCache[k];
  const r = await eng.evalFen(fen, depth);
  evalCache[k] = r;
  if (++evalCacheDirty % 100 === 0) fs.writeFileSync(EVAL_CACHE, JSON.stringify(evalCache));
  return r;
}

async function explorerTotal(uciPath) {
  const key = uciPath.join(',');
  if (key in cache) { const c = cache[key]; return c ? c.total : -1; }
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${PROXY}?source=masters&play=${key}`);
      if (r.status === 429) { await sleep(1500 * (a + 1)); continue; }
      if (!r.ok) { cache[key] = null; return -1; }
      const j = await r.json();
      const moves = (j.moves || []).map((m) => ({ san: m.san, games: m.white + m.draws + m.black }));
      const total = moves.reduce((s, m) => s + m.games, 0);
      cache[key] = { total, moves }; await sleep(120); return total;
    } catch { await sleep(800); }
  }
  cache[key] = null; return -1;
}

const GAMBIT_RE = /gambit|muzio|allgaier|max.?lange|counter.?gambit|sacrifice|king'?s.?gambit|evans|smith.?mor|danish|halloween|fishing.?pole|fried.?liver|stafford/i;
const BLACK_RE = /caro|sicilian|najdorf|dragon|french|pirc|scandinav|alekhine|king'?s?.?indian|kingsindian|grunfeld|gruenfeld|benoni|dutch|nimzo|slav|qgd|semi.?slav|petrov|philidor|budapest/i;

function repertoireLines() {
  const out = [];
  for (const f of ['repertoire.json', 'gambits.json']) {
    const d = readJson(path.join(DATA, f)); const a = Array.isArray(d) ? d : (d.openings || []);
    for (const o of a) {
      const isGambit = f === 'gambits.json';
      if (o.pgn && o.pgn.trim()) out.push({ id: o.id, name: `${o.name} — main`, pgn: o.pgn.trim(), color: o.color || 'white', isGambit });
      for (const v of o.variations || []) { const p = (v.pgn || v.moves || '').trim(); if (p) out.push({ id: o.id, name: `${o.name} :: ${v.name}`, pgn: p, color: o.color || 'white', isGambit }); }
    }
  }
  return out;
}

// lesson sublines — the deep Watch/Learn tails (where the Vienna-class bug
// lives). Color resolved from repertoire/gambits/pro color map, falling back to
// the OID const + a name regex (same robust resolver as build-grounding).
function lessonLines() {
  const COLOR = {};
  for (const f of ['repertoire.json', 'gambits.json', 'pro-repertoires.json']) {
    if (!fs.existsSync(path.join(DATA, f))) continue;
    const d = readJson(path.join(DATA, f)); const a = Array.isArray(d) ? d : (d.openings || []);
    for (const o of a) if (o && o.id) COLOR[o.id] = o.color || 'white';
  }
  const dir = path.join(DATA, 'lessons');
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    let id;
    const q = txt.match(/openingId:\s*'([^']+)'/);
    if (q) id = q[1]; else { const ref = txt.match(/openingId:\s*([A-Za-z_$][\w$]*)/); if (ref) { const cm = txt.match(new RegExp(`const\\s+${ref[1]}\\s*=\\s*'([^']+)'`)); if (cm) id = cm[1]; } }
    if (!id) id = f.replace(/\.ts$/, '');
    const color = COLOR[id] || (BLACK_RE.test(id) || BLACK_RE.test(f) ? 'black' : 'white');
    const isGambit = GAMBIT_RE.test(id) || GAMBIT_RE.test(f);
    const seen = new Set();
    for (const m of txt.matchAll(/moves:\s*'([^']+)'/g)) {
      const pgn = m[1].trim();
      if (pgn.split(/\s+/).length < 2 || seen.has(pgn)) continue; seen.add(pgn);
      out.push({ id, name: `${id} :: ${f} :: ${pgn.split(/\s+/).length}-ply`, pgn, color, isGambit });
    }
  }
  return out;
}

function lines() {
  const out = SOURCE === 'lessons' ? lessonLines() : repertoireLines();
  return ONLY.length ? out.filter((l) => ONLY.includes(l.id)) : out;
}

// student-POV cp from a white-POV eval
const studCp = (e, color) => { const w = e.mate != null ? (e.mate > 0 ? 100000 : -100000) : e.cp; return color === 'black' ? -w : w; };

(async () => {
  const all = lines();
  console.log(`Stage-2 out-of-book best-move check: ${all.length} masterclass lines (depth ${DEPTH}, margin ${(MARGIN / 100).toFixed(2)})\n`);
  const eng = makeEngine();
  const report = [];
  let n = 0;
  for (const l of lines2(all)) {
    n++;
    const sans = l.pgn.split(/\s+/);
    // find last in-book ply (deepest position with >= FLOOR master games)
    const c0 = new Chess(); const uci = []; let lastBook = 0;
    for (let i = 0; i < sans.length; i++) {
      const t = await explorerTotal(uci);
      if (t >= FLOOR) lastBook = i; else break;
      let mv; try { mv = c0.move(sans[i]); } catch { mv = null; } // chess.js THROWS on illegal
      if (!mv) break; uci.push(mv.from + mv.to + (mv.promotion || ''));
    }
    // from lastBook onward, compare each OUR move to the engine best
    const c = new Chess();
    try { for (let i = 0; i < lastBook; i++) c.move(sans[i]); } catch { /* illegal prefix — flags below catch it */ }
    const flags = [];
    const studentChar = l.color === 'black' ? 'b' : 'w';
    for (let i = lastBook; i < sans.length; i++) {
      const before = c.fen();
      const turn = before.split(' ')[1];
      const evBefore = await cachedEval(eng, before, DEPTH);
      let mv; try { mv = c.move(sans[i]); } catch { mv = null; }
      if (!mv) { flags.push({ ply: i + 1, kind: 'ILLEGAL', move: sans[i] }); break; }
      const evAfter = await cachedEval(eng, c.fen(), DEPTH);
      // only grade OUR (student's) moves
      if (turn === studentChar) {
        const cpBefore = studCp(evBefore, l.color);   // best-play eval for us at this position
        const cpAfter = studCp(evAfter, l.color);      // eval after we committed our move
        const loss = cpBefore - cpAfter;
        // Only a REAL "teaching a bad move": concedes >= MARGIN AND lands the
        // student actually worse than equal. Filters the artifacts that flooded
        // the first pass — forcing-sequence recaptures (the line ends level) and
        // "declined a faster win" (still winning after the move). The Vienna
        // dawdle still trips it (Bd2 lands −0.76); Petrov Bxb2 (ends level) and
        // Nc7 (Black still winning) no longer do.
        if (loss >= MARGIN && cpAfter < 0) flags.push({ ply: i + 1, kind: 'SUBOPTIMAL', move: sans[i], best: evBefore.best, loss, cpBefore, cpAfter });
      }
    }
    const worst = flags.filter((f) => f.kind === 'SUBOPTIMAL').sort((a, b) => b.loss - a.loss)[0];
    const il = flags.find((f) => f.kind === 'ILLEGAL');
    report.push({ id: l.id, name: l.name, isGambit: l.isGambit, pgn: l.pgn, lastBook, plies: sans.length, flags });
    const tag = il ? 'ILLEGAL ' : worst ? (l.isGambit ? 'GAMBIT? ' : 'SUBOPT  ') : 'CLEAN   ';
    const msg = il ? `illegal ${il.move}@${il.ply}` : worst ? `ply ${worst.ply} our ${worst.move} loses ${(worst.loss / 100).toFixed(2)} vs best ${worst.best} (${(worst.cpBefore / 100).toFixed(2)}→${(worst.cpAfter / 100).toFixed(2)})` : `book→${lastBook}, tail clean`;
    console.log(`  ${tag} ${l.id.padEnd(22)} ${msg}`);
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    if (n % 10 === 0) fs.writeFileSync(path.join(DATA, 'spine-continuation-report.json'), JSON.stringify({ depth: DEPTH, margin: MARGIN, report }, null, 2));
  }
  eng.quit();
  fs.writeFileSync(EVAL_CACHE, JSON.stringify(evalCache));
  fs.writeFileSync(path.join(DATA, 'spine-continuation-report.json'), JSON.stringify({ depth: DEPTH, margin: MARGIN, source: SOURCE, report }, null, 2));
  const subopt = report.filter((r) => r.flags.some((f) => f.kind === 'SUBOPTIMAL' && !r.isGambit)).length;
  const illegal = report.filter((r) => r.flags.some((f) => f.kind === 'ILLEGAL')).length;
  console.log(`\nSummary: ${report.length} lines | SUBOPTIMAL ${subopt} | ILLEGAL ${illegal} | clean ${report.length - subopt - illegal}`);
})().catch((e) => { console.error(e); process.exit(1); });

// stable order, ONLY filter already applied in lines()
function lines2(arr) { return arr; }
