// Extend every course subline PAST the opponent's deviation into a master-game-
// grounded middlegame, so the Watch lesson keeps teaching the RESPONSE + plan
// instead of dead-ending at the deviation (David 2026-06-18). Keys are stable:
// triggerMove + atPly are untouched; only `moves` grows. Grounding = the masters
// explorer's most-played continuation each ply (G3 — never invented), walked
// until a middlegame is reached, then a couple more plies for a teachable plan.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const PATH = ROOT + 'src/data/course-sublines.json';
const data = JSON.parse(readFileSync(PATH, 'utf8'));
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer?source=masters&play=';
const MIN_GAMES = 8, MAX_EXTRA = 16, MIN_EXTRA = 8;
const cache = new Map();

async function topMove(uciCsv) {
  if (cache.has(uciCsv)) return cache.get(uciCsv);
  let out = null;
  for (let attempt = 0; attempt < 3 && !out; attempt++) {
    try {
      const r = await fetch(PROXY + uciCsv);
      const j = await r.json();
      if (j && Array.isArray(j.moves) && j.moves.length) {
        const t = j.moves[0];
        const games = (t.white || 0) + (t.draws || 0) + (t.black || 0);
        out = games >= MIN_GAMES ? { san: t.san, games } : null;
      } else out = null;
    } catch { await new Promise((r) => setTimeout(r, 400)); }
  }
  cache.set(uciCsv, out);
  await new Promise((r) => setTimeout(r, 120));
  return out;
}

function uciOf(moves) {
  const c = new Chess(); const u = [];
  for (const m of moves) { const mv = c.move(m); u.push(mv.from + mv.to + (mv.promotion || '')); }
  return { chess: c, uci: u };
}

let scanned = 0, extended = 0, skipped = 0;
for (const openingId of Object.keys(data)) {
  if (only && !only.has(openingId)) continue;
  for (const vi of Object.keys(data[openingId])) {
    for (const s of data[openingId][vi]) {
      scanned++;
      // already deep past the deviation into a middlegame? skip (idempotent)
      const pastDeviation = s.moves.length - 1 - s.atPly;
      if (pastDeviation >= MIN_EXTRA && reachesMiddlegame(s.moves.join(' '))) { skipped++; continue; }
      // rebuild up to + including the deviation, then walk master continuation
      const base = s.moves.slice(0, s.atPly + 1);
      let { chess, uci } = uciOf(base);
      let added = 0;
      while (added < MAX_EXTRA) {
        const t = await topMove(uci.join(','));
        if (!t) break;
        let mv; try { mv = chess.move(t.san); } catch { break; }
        if (!mv) break;
        uci.push(mv.from + mv.to + (mv.promotion || ''));
        added++;
        if (added >= MIN_EXTRA && reachesMiddlegame(chess.history().join(' '))) break;
        if (added >= MAX_EXTRA) break;
      }
      if (added > 0) { s.moves = chess.history(); extended++; }
    }
  }
}
writeFileSync(PATH, JSON.stringify(data));
console.error(`scanned ${scanned}, extended ${extended}, already-deep ${skipped}`);
