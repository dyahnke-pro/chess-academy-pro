#!/usr/bin/env node
/*
 * check-main-lines — does each MASTERCLASS main line MATCH established main-line
 * opening theory? For every masterclass main pgn (repertoire.json + gambits.json)
 * we walk the LIVE Lichess masters explorer ply-by-ply and, at each position,
 * compare OUR move to the masters' most-played move. We grade the first place we
 * leave the main line:
 *   MATCH       our move == the most-played master move (the main line)
 *   MAJOR-ALT   our move is a recognised alternative (>= ALT_SHARE of games)
 *   RARE        a much-more-popular move existed; ours is a thin sideline
 *   OFF-BOOK    our move isn't in the masters DB at this (still-popular) position
 * We stop a line once the position thins below FLOOR games (past that, "the main
 * line" isn't defined — that's deep theory, not a divergence). Pro-rep is OUT of
 * scope (graded against the pro's games, not theory). Cached.
 *
 * Run: node scripts/ci/check-main-lines.cjs [--only italian-game,ruy-lopez] [--floor 30]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const DATA = path.resolve(__dirname, '..', '..', 'src', 'data');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FLOOR = Number(argv('--floor', 30));      // position must have >= this many master games to define a "main line"
const ALT_SHARE = 0.15;                          // our move is a recognised alternative if it has >= 15% of games
const ONLY = (argv('--only', '') || '').split(',').filter(Boolean);
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const CACHE = path.join(DATA, 'main-line-cache.json');
const cache = fs.existsSync(CACHE) ? readJson(CACHE) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function explorer(uciPath) {
  const key = uciPath.join(',');
  if (key in cache) return cache[key];
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${PROXY}?source=masters&play=${key}`);
      if (r.status === 429) { await sleep(1500 * (a + 1)); continue; }
      if (!r.ok) { cache[key] = null; return null; }
      const j = await r.json();
      const moves = (j.moves || []).map((m) => ({ san: m.san, games: m.white + m.draws + m.black }));
      const total = moves.reduce((s, m) => s + m.games, 0);
      const out = { total, moves };
      cache[key] = out; return out;
    } catch { await sleep(800); }
  }
  cache[key] = null; return null;
}

// The opening's NAME-defining moves are a given (David chose to teach the
// Vienna; 2.Nc3 isn't a "divergence from 2.Nf3"). So we exempt every ply that is
// still inside KNOWN BOOK — the longest openings-lichess.json (ECO canon) line
// that prefixes ours. Theory-adherence is only checked on the continuation
// BEYOND book, which is exactly where invention/over-extension happens.
const ECO = readJson(path.join(DATA, 'openings-lichess.json'));
const ECO_PREFIXES = ECO.map((e) => (e.pgn || '').trim().split(/\s+/)).filter((a) => a.length);
function bookPrefixLen(sans) {
  let best = 0;
  for (const p of ECO_PREFIXES) {
    if (p.length <= best || p.length > sans.length) continue;
    let ok = true;
    for (let i = 0; i < p.length; i++) if (p[i] !== sans[i]) { ok = false; break; }
    if (ok) best = p.length;
  }
  return best;
}

function mainLines() {
  const out = [];
  for (const f of ['repertoire.json', 'gambits.json']) {
    const d = readJson(path.join(DATA, f)); const a = Array.isArray(d) ? d : (d.openings || []);
    for (const o of a) if (o.pgn && o.pgn.trim()) out.push({ id: o.id, name: o.name, pgn: o.pgn.trim(), isGambit: f === 'gambits.json' });
  }
  return ONLY.length ? out.filter((l) => ONLY.includes(l.id)) : out;
}

(async () => {
  const lines = mainLines();
  console.log(`Checking ${lines.length} masterclass main lines vs masters theory (floor ${FLOOR})\n`);
  const report = [];
  for (const l of lines) {
    const sans = l.pgn.split(/\s+/);
    const book = bookPrefixLen(sans);
    const c = new Chess();
    const uciPath = [];
    let verdict = { id: l.id, name: l.name, isGambit: l.isGambit, book, status: 'MATCH', divergePly: null, detail: null, walkedTo: 0 };
    for (let i = 0; i < sans.length; i++) {
      const ours = sans[i];
      // inside known ECO book — the opening's identity, exempt. Still advance the
      // board/uci path so the post-book explorer queries are correctly anchored.
      if (i < book) { const mv = c.move(ours); uciPath.push(mv.from + mv.to + (mv.promotion || '')); verdict.walkedTo = i + 1; continue; }
      const pos = await explorer(uciPath); await sleep(140);
      if (!pos || pos.total < FLOOR) { verdict.walkedTo = i; break; } // line went past defined theory — fine
      const top = pos.moves[0];
      const mine = pos.moves.find((m) => m.san === ours);
      if (!mine) {
        verdict = { ...verdict, status: 'OFF-BOOK', divergePly: i + 1, walkedTo: i,
          detail: `ply ${i + 1}: our ${ours} NOT in masters (${pos.total} games here); theory plays ${top.san} (${top.games})` };
        break;
      }
      if (mine.san !== top.san) {
        const share = mine.games / pos.total;
        if (share < ALT_SHARE && top.games >= 2 * mine.games) {
          verdict = { ...verdict, status: 'RARE', divergePly: i + 1, walkedTo: i,
            detail: `ply ${i + 1}: our ${ours} ${(share * 100).toFixed(1)}% (${mine.games}); theory main ${top.san} ${(top.games / pos.total * 100).toFixed(1)}% (${top.games})` };
          break;
        }
        // recognised major alternative — note the first one but keep walking
        if (verdict.status === 'MATCH') verdict = { ...verdict, status: 'MAJOR-ALT', divergePly: i + 1,
          detail: `ply ${i + 1}: our ${ours} ${(share * 100).toFixed(1)}% is a real alt vs ${top.san} ${(top.games / pos.total * 100).toFixed(1)}%` };
      }
      // advance
      const mv = c.move(ours); uciPath.push(mv.from + mv.to + (mv.promotion || ''));
      verdict.walkedTo = i + 1;
    }
    report.push(verdict);
    const tag = verdict.status;
    console.log(`  ${tag.padEnd(9)} ${l.id}${verdict.detail ? `  — ${verdict.detail}` : ` (matched main line through ply ${verdict.walkedTo})`}`);
    fs.writeFileSync(CACHE, JSON.stringify(cache));
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  fs.writeFileSync(path.join(DATA, 'main-line-report.json'), JSON.stringify({ floor: FLOOR, altShare: ALT_SHARE, report }, null, 2));
  const by = (s) => report.filter((r) => r.status === s).length;
  console.log(`\nSummary: MATCH ${by('MATCH')} | MAJOR-ALT ${by('MAJOR-ALT')} | RARE ${by('RARE')} | OFF-BOOK ${by('OFF-BOOK')}`);
})().catch((e) => { console.error(e); process.exit(1); });
