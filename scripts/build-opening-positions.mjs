// Build public/data/opening-positions.json — every Lichess DB opening keyed by
// the POSITION it reaches (placement, side, castling, en passant), so the coach
// can name an opening reached by a different move order (the transposition
// reader). Derived data: re-run whenever src/data/openings-lichess.json changes;
// `openingPositions.test.ts` fails when the file is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
const out = {};
for (const e of db) {
  const c = new Chess();
  let ok = true;
  for (const san of e.pgn.split(/\s+/).filter(Boolean)) {
    try { c.move(san); } catch { ok = false; break; }
  }
  if (!ok) continue;
  const key = c.fen().split(' ').slice(0, 4).join(' ');
  const plies = c.history().length;
  // One name per position: the SHORTEST line that reaches it is the canonical
  // order; ties keep the more specific (longer) name.
  const prev = out[key];
  if (!prev || plies < prev[1] || (plies === prev[1] && e.name.length > prev[0].length)) out[key] = [e.name, plies];
}
writeFileSync('public/data/opening-positions.json', JSON.stringify(out));
console.log(`${Object.keys(out).length} positions`);
