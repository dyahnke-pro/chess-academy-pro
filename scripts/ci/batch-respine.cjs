#!/usr/bin/env node
/*
 * batch-respine — Phase-1 driver (David 2026-06-29). Reads the stage-2 report
 * (spine-continuation-report.json), and for every flagged NON-GAMBIT line whose
 * first sub-optimal move concedes >= MUST_FIX, regenerates a sound skeleton:
 * keep the moves before the concession, then DB-most-played / Stockfish-best to
 * a middlegame terminus. Writes PROPOSALS (grounding-respine-proposals.json) for
 * review — does NOT edit content. Gambit/sacrifice showcases are listed for
 * MANUAL review, never auto-rewritten (the approved carve-out).
 *
 *   node scripts/ci/batch-respine.cjs [--must-fix 100] [--depth 16]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { makeEngine } = require('./grounding-engine.cjs');
const DATA = path.resolve(__dirname, '..', '..', 'src', 'data');
const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MUST_FIX = Number(argv('--must-fix', 100)); // concede >= 1.0 = re-spine
const DEPTH = Number(argv('--depth', 16));
const FLOOR = 30;
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const CCH = path.join(DATA, 'main-line-cache.json');
const cache = fs.existsSync(CCH) ? JSON.parse(fs.readFileSync(CCH, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function topMasterMove(uci) {
  const k = uci.join(',');
  if (k in cache && cache[k]) return cache[k].total >= FLOOR ? cache[k].moves[0].san : null;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${PROXY}?source=masters&play=${k}`);
      if (r.status === 429) { await sleep(1500 * (a + 1)); continue; }
      if (!r.ok) { cache[k] = null; return null; }
      const j = await r.json();
      const moves = (j.moves || []).map((m) => ({ san: m.san, games: m.white + m.draws + m.black }));
      const total = moves.reduce((s, m) => s + m.games, 0);
      cache[k] = { total, moves }; await sleep(120);
      return total >= FLOOR ? moves[0].san : null;
    } catch { await sleep(800); }
  }
  return null;
}
async function respineFrom(c, target, eng) {
  const tail = [];
  while (c.history().length < target && !c.isGameOver()) {
    const uci = c.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
    const san = await topMasterMove(uci);
    if (san) { let mv; try { mv = c.move(san); } catch { mv = null; } if (mv) { tail.push({ san: mv.san, src: 'db' }); continue; } }
    const ev = await eng.evalFen(c.fen(), DEPTH);
    if (!ev.best || ev.best === '(none)') break;
    const mv = c.move({ from: ev.best.slice(0, 2), to: ev.best.slice(2, 4), promotion: ev.best.slice(4) || undefined });
    if (!mv) break;
    tail.push({ san: mv.san, src: 'engine' });
  }
  return tail;
}

(async () => {
  const reportPath = path.join(DATA, 'spine-continuation-report.json');
  if (!fs.existsSync(reportPath)) { console.error('no spine-continuation-report.json — run the sweep first'); process.exit(1); }
  const { report } = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  // the report doesn't carry pgn; grounding-items.json does, under the same name.
  const items = JSON.parse(fs.readFileSync(path.join(DATA, 'grounding-items.json'), 'utf8')).items;
  const pgnByName = {}; for (const it of items) if (it.name && it.pgn) pgnByName[it.name] = it.pgn;
  // pick flagged lines: first SUBOPTIMAL flag conceding >= MUST_FIX
  const targets = [], gambitSkips = [];
  for (const r of report) {
    const sub = (r.flags || []).filter((f) => f.kind === 'SUBOPTIMAL' && f.loss >= MUST_FIX).sort((a, b) => a.ply - b.ply)[0];
    const ill = (r.flags || []).find((f) => f.kind === 'ILLEGAL');
    if (!sub && !ill) continue;
    if (r.isGambit) { gambitSkips.push({ id: r.id, name: r.name, reason: 'gambit', flag: sub || ill }); continue; }
    // TRAP-lesson files deliberately show a victim's blunder then the punish —
    // the flagged move is usually the INTENDED blunder, so re-spining would
    // delete the trap. Hand-triage these, never auto-rewrite.
    if (/trap/i.test(r.name || '')) { gambitSkips.push({ id: r.id, name: r.name, reason: 'trap-lesson', flag: sub || ill }); continue; }
    targets.push({ ...r, fix: sub || ill });
  }
  console.log(`Flagged to re-spine: ${targets.length} non-gambit | gambit (manual): ${gambitSkips.length}\n`);
  const eng = makeEngine();
  const proposals = [];
  let n = 0;
  for (const t of targets) {
    n++;
    const pgn = pgnByName[t.name];
    if (!pgn) { proposals.push({ id: t.id, name: t.name, error: 'pgn not found in grounding-items' }); continue; }
    const arr = pgn.split(/\s+/);
    const keep = Math.max(0, t.fix.ply - 1);
    const c = new Chess();
    let ok = true; for (let i = 0; i < keep; i++) { try { if (!c.move(arr[i])) { ok = false; break; } } catch { ok = false; break; } }
    if (!ok) { proposals.push({ id: t.id, name: t.name, error: `keep replay failed @${keep}` }); continue; }
    const target = Math.max(arr.length, keep + 12, 24);
    const tail = await respineFrom(c, target, eng);
    const ev = await eng.evalFen(c.fen(), DEPTH);
    const newPgn = [...c.history()].join(' ');
    proposals.push({
      id: t.id, name: t.name, keep,
      oldPgn: pgn, newPgn,
      oldTail: arr.slice(keep).join(' '),
      newTail: tail.map((x) => `${x.san}${x.src === 'engine' ? '*' : ''}`).join(' '),
      terminalWhiteCp: ev.mate != null ? (ev.mate > 0 ? 100000 : -100000) : ev.cp,
      firstBadMove: t.fix.move, firstBadPly: t.fix.ply, conceded: t.fix.loss,
    });
    console.log(`  ${t.id.padEnd(20)} keep ${keep} | bad ${t.fix.move}@${t.fix.ply} (-${(t.fix.loss / 100).toFixed(2)}) -> new tail ${tail.slice(0, 6).map((x) => x.san).join(' ')}… term ${((ev.cp || 0) / 100).toFixed(2)}`);
    fs.writeFileSync(CCH, JSON.stringify(cache));
  }
  eng.quit();
  fs.writeFileSync(path.join(DATA, 'grounding-respine-proposals.json'), JSON.stringify({ mustFix: MUST_FIX, depth: DEPTH, proposals, gambitSkips }, null, 2));
  console.log(`\nWrote grounding-respine-proposals.json: ${proposals.length} proposals, ${gambitSkips.length} gambit lines flagged for manual review.`);
})().catch((e) => { console.error(e); process.exit(1); });
