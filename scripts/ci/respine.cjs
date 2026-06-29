#!/usr/bin/env node
/*
 * respine — Phase-1 SKELETON tool (David 2026-06-29). Given a line and the ply
 * to keep through, regenerate the rest of the spine the way the build was always
 * meant to: DB-MOST-PLAYED while the position is still in the masters book, then
 * STOCKFISH-BEST once out of book, extended until a middlegame terminus. The
 * result is sound by construction (every move is DB-canonical or engine-best).
 * It emits the proposed corrected line + per-move source — it does NOT auto-edit
 * content (apply after review; narration is re-authored separately in Phase 2).
 *
 *   node scripts/ci/respine.cjs --pgn "e4 e5 ..." --keep 14 [--target 26] [--depth 16]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { makeEngine } = require('./grounding-engine.cjs');
const DATA = path.resolve(__dirname, '..', '..', 'src', 'data');
const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FLOOR = Number(argv('--floor', 30));
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const CACHE = path.join(DATA, 'main-line-cache.json');
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function topMasterMove(uciPath) {
  const key = uciPath.join(',');
  if (key in cache && cache[key]) { const c = cache[key]; return c.total >= FLOOR ? c.moves[0].san : null; }
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${PROXY}?source=masters&play=${key}`);
      if (r.status === 429) { await sleep(1500 * (a + 1)); continue; }
      if (!r.ok) { cache[key] = null; return null; }
      const j = await r.json();
      const moves = (j.moves || []).map((m) => ({ san: m.san, games: m.white + m.draws + m.black }));
      const total = moves.reduce((s, m) => s + m.games, 0);
      cache[key] = { total, moves }; await sleep(120);
      return total >= FLOOR ? moves[0].san : null;
    } catch { await sleep(800); }
  }
  return null;
}

// extend a Chess position with DB-most-played (in book) then engine-best, to
// targetPly. Returns the appended tail [{san, source, cp}]. cp is white-POV.
async function respineFrom(c, targetPly, eng, depth) {
  const tail = [];
  while (c.history().length < targetPly) {
    if (c.isGameOver()) break;
    const uci = c.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
    let san = await topMasterMove(uci);
    let source = 'db';
    if (!san) {
      const ev = await eng.evalFen(c.fen(), depth);
      if (!ev.best || ev.best === '(none)') break;
      const from = ev.best.slice(0, 2), to = ev.best.slice(2, 4), promo = ev.best.slice(4) || undefined;
      const mv = c.move({ from, to, promotion: promo });
      tail.push({ san: mv.san, source: 'engine', cp: ev.mate != null ? (ev.mate > 0 ? 100000 : -100000) : ev.cp });
      continue;
    }
    let mv; try { mv = c.move(san); } catch { mv = null; }
    if (!mv) { // DB move somehow illegal in our line — fall back to engine
      const ev = await eng.evalFen(c.fen(), depth);
      const mvb = c.move({ from: ev.best.slice(0, 2), to: ev.best.slice(2, 4), promotion: ev.best.slice(4) || undefined });
      tail.push({ san: mvb.san, source: 'engine', cp: ev.cp });
      continue;
    }
    tail.push({ san: mv.san, source, cp: null });
  }
  return tail;
}

(async () => {
  const pgn = argv('--pgn', '').trim();
  const keep = Number(argv('--keep', 0));
  const depth = Number(argv('--depth', 16));
  if (!pgn || !keep) { console.error('need --pgn and --keep'); process.exit(1); }
  const sans = pgn.split(/\s+/);
  const target = Number(argv('--target', Math.max(sans.length, 24)));
  const c = new Chess();
  for (let i = 0; i < keep; i++) c.move(sans[i]);
  const kept = c.history();
  const eng = makeEngine();
  const tail = await respineFrom(c, target, eng, depth);
  // final soundness from the keeper side's POV is just the white-POV eval at end
  const ev = await eng.evalFen(c.fen(), depth);
  eng.quit();
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  console.log('KEPT  (ply 1-' + keep + '):', kept.join(' '));
  console.log('OLD   tail        :', sans.slice(keep).join(' '));
  console.log('NEW   tail        :', tail.map((t) => `${t.san}${t.source === 'engine' ? '*' : ''}`).join(' '), '   (* = engine-best, rest DB-most-played)');
  console.log('NEW   full line   :', [...kept, ...tail.map((t) => t.san)].join(' '));
  console.log('terminal white-POV:', ev.mate != null ? `mate ${ev.mate}` : (ev.cp / 100).toFixed(2));
})().catch((e) => { console.error(e); process.exit(1); });
