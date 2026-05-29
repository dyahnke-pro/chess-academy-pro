#!/usr/bin/env node
// Extract GothamChess's best REAL WINS per Caro variation for model games
// (G9.1: 3-5 per variation, student-side WINS only, vs strongest opponents).
// Emits candidates to /tmp so I can hand-author overviews per game. PGN is
// stripped to bare moves; every game chess.js-validated.
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/gothamchess-chesscom';
const ME = 'gothamchess';

// variation label → identifying SAN prefix (Black). Matches the tabs.
// `excludeAt`: a SAN at a given ply index that DISQUALIFIES the game — the
// Exchange prefix (exd5/cxd5) is a subset of Panov's (exd5/cxd5/c4), so a
// Panov game would wrongly match Exchange; exclude White's c4 at ply 6.
const VARIATIONS = [
  { key: 'exchange', prefix: ['e4','c6','d4','d5','exd5','cxd5'], excludeAt: { idx: 6, san: 'c4' } },
  { key: 'classical', prefix: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4'] },
  { key: 'advance-bf5', prefix: ['e4','c6','d4','d5','e5','Bf5'] },
  { key: 'advance-c5', prefix: ['e4','c6','d4','d5','e5','c5'] },
  { key: 'two-knights', prefix: ['e4','c6','Nc3','d5'] },
  { key: 'panov', prefix: ['e4','c6','d4','d5','exd5','cxd5','c4'] },
  { key: 'fantasy', prefix: ['e4','c6','d4','d5','f3'] },
];

function stripPgn(pgn) {
  const i = pgn.search(/\n\n/);
  let b = i >= 0 ? pgn.slice(i) : pgn;
  b = b.replace(/\{[^}]*\}/g, '');
  let p; do { p = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== p);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b.split(/\s+/).filter(Boolean);
}
function matches(m, p) { if (m.length < p.length) return false; for (let i=0;i<p.length;i++) if (m[i]!==p[i]) return false; return true; }

// pre-load games where Gotham is Black and WON
const blackWins = [];
for (const f of fs.readdirSync(SRC_DIR).filter((x) => x.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n')) {
    if (!line) continue;
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (!g.pgn || g.rules !== 'chess') continue;
    if ((g.black?.username || '').toLowerCase() !== ME) continue;
    if ((g.pgn.match(/\[Result "([^"]+)"\]/) || [])[1] !== '0-1') continue;
    const m = stripPgn(g.pgn);
    if (m.length < 24) continue; // real game, not a miniature flag
    blackWins.push({ m, url: g.url, opp: g.white?.username, oppR: g.white?.rating, myR: g.black?.rating, date: (g.end_time ? new Date(g.end_time*1000).getFullYear() : null), tc: g.time_class });
  }
}

const out = {};
for (const v of VARIATIONS) {
  const pool = blackWins.filter((g) =>
    matches(g.m, v.prefix) && !(v.excludeAt && g.m[v.excludeAt.idx] === v.excludeAt.san));
  // validate legality + dedupe by opponent, prefer highest-rated distinct opps
  const seen = new Set();
  const valid = [];
  pool.sort((a, b) => (b.oppR || 0) - (a.oppR || 0));
  for (const g of pool) {
    if (seen.has((g.opp || '').toLowerCase())) continue;
    const c = new Chess(); let ok = true;
    for (const san of g.m) { try { c.move(san); } catch { ok = false; break; } }
    if (!ok) continue;
    seen.add((g.opp || '').toLowerCase());
    valid.push({ url: g.url, opp: g.opp, oppR: g.oppR, myR: g.myR, date: g.date, tc: g.tc, plies: g.m.length, pgn: g.m.join(' ') });
    if (valid.length >= 4) break;
  }
  out[v.key] = { count: pool.length, top: valid };
  console.log(`${v.key}: ${pool.length} black wins; top opps: ${valid.map((x) => `${x.opp}(${x.oppR})`).join(', ')}`);
}
fs.writeFileSync('/tmp/gotham-caro-model-games.json', JSON.stringify(out, null, 2));
console.log('\nwritten /tmp/gotham-caro-model-games.json');
