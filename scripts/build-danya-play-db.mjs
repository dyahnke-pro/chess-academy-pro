#!/usr/bin/env node
/**
 * BUILD THE "HIS PLAY DB" — the review coach's PRIMARY plan-grounding source
 * (David 2026-07-23: "use his games as the primary source, then when he
 * doesn't have any games we use the master DB").
 *
 * Parallel to public/data/openings-masters-db.json, but sourced from HIS OWN
 * games (frankfurtairport + danielnaroditsky chess.com corpora). For every
 * opening-phase position he reached (either side — he plays AND defends), we
 * record the moves HE played there with frequency + result split. The review's
 * opening-plan beat looks up the position: his top continuation (the move HE
 * makes here) IS his plan, grounded in real games (G3 — never invented).
 *
 * Captures him as DEFENDER too (David 2026-07-23: "he might not have played one
 * but his opponents played Grand Prix against him") — the FEN key includes
 * side-to-move, so "when it's his turn in this position, he plays X" holds
 * whether he chose the opening or is facing it.
 *
 * Emits src/data/danya-play-db.json: { [fen]: { total, moves: [{san,games,w,d,l}] } }
 * keyed by the position BEFORE his move (FEN with move-counters stripped so
 * transpositions merge). Opening phase only (<= MAX_PLY). Positions with fewer
 * than MIN_GAMES of his games are dropped (not enough signal to call it "his
 * plan"). Top TOP_MOVES continuations per position.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const ACCOUNTS = ['frankfurtairport', 'danielnaroditsky'];
const MAX_PLY = 24;        // opening phase (moves 1-12)
const MIN_GAMES = 8;       // a position needs >= this many of his games to count
const TOP_MOVES = 4;       // keep his top-N continuations per position
const OUT = 'src/data/danya-play-db.json';

/** FEN with the move-number + halfmove-clock fields stripped so transpositions
 *  into the same position merge (piece placement + side + castling + ep). */
function fenKey(fen) {
  const p = fen.split(' ');
  return p.slice(0, 4).join(' ');
}

function bareMoves(pgn) {
  const mt = (pgn.match(/\n\n([\s\S]*)$/) || ['', ''])[1];
  return mt
    .replace(/\{[^}]*\}/g, '')
    .replace(/\d+\.(\.\.)?/g, '')
    .replace(/\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// position key -> { total, moves: Map<san, {games,w,d,l}> }
const db = new Map();
let scanned = 0, used = 0;

for (const acct of ACCOUNTS) {
  const dir = `data/sources/${acct}-chesscom`;
  if (!fs.existsSync(dir)) { console.warn(`[skip] ${dir} not on disk`); continue; }
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.jsonl')) continue;
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      let g; try { g = JSON.parse(line); } catch { continue; }
      const pgn = g.pgn || '';
      const white = (pgn.match(/\[White "([^"]+)"/) || [])[1] || '';
      const result = (pgn.match(/\[Result "([^"]+)"/) || [])[1] || '*';
      const hisColor = white.toLowerCase() === acct.toLowerCase() ? 'w' : 'b';
      // his result: w/d/l from HIS perspective
      const hisRes = result === '1/2-1/2' ? 'd'
        : (result === '1-0' && hisColor === 'w') || (result === '0-1' && hisColor === 'b') ? 'w'
        : (result === '1-0' || result === '0-1') ? 'l' : null;
      if (!hisRes) continue; // skip aborted/unknown
      const sans = bareMoves(pgn);
      if (sans.length < 6) continue;
      scanned++;
      const c = new Chess();
      let ok = true;
      for (let i = 0; i < Math.min(sans.length, MAX_PLY); i++) {
        const sideToMove = c.turn(); // whose move BEFORE sans[i]
        if (sideToMove === hisColor) {
          // record HIS move at this position
          const key = fenKey(c.fen());
          let entry = db.get(key);
          if (!entry) { entry = { total: 0, moves: new Map() }; db.set(key, entry); }
          entry.total += 1;
          let mv = entry.moves.get(sans[i]);
          if (!mv) { mv = { games: 0, w: 0, d: 0, l: 0 }; entry.moves.set(sans[i], mv); }
          mv.games += 1; mv[hisRes] += 1;
        }
        try { c.move(sans[i]); } catch { ok = false; break; }
      }
      if (ok) used++;
    }
  }
  console.log(`[${acct}] scanned so far: ${scanned} games`);
}

// Filter + shape output
const out = {};
let kept = 0;
for (const [key, entry] of db) {
  if (entry.total < MIN_GAMES) continue;
  const moves = [...entry.moves.entries()]
    .map(([san, m]) => ({ san, games: m.games, w: m.w, d: m.d, l: m.l }))
    .sort((a, b) => b.games - a.games)
    .slice(0, TOP_MOVES);
  out[key] = { total: entry.total, moves };
  kept += 1;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const bytes = fs.statSync(OUT).size;
console.log(`\nDONE. scanned ${scanned} games (${used} fully replayed).`);
console.log(`positions kept (>= ${MIN_GAMES} his games, <= ${MAX_PLY} plies): ${kept}`);
console.log(`wrote ${OUT} (${(bytes / 1e6).toFixed(2)} MB)`);
