// Deterministic hanging-piece sweep for course sublines (David 2026-07-07:
// "noticed a hanging queen in a subline — sweep those for accuracy").
// No engine needed: replay each subline with chess.js and, after every
// half-move, run a 1-ply static-exchange check for the side to move. If the
// side to move can win >= a minor piece by a simple capture, the PRIOR move
// left material hanging → the authored line is unsound (a side ignoring a
// free piece). Flags the biggest hang per line. Catches the Frankenstein
// "queen sits on h5 while both sides push pawns" fabrication.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const data = JSON.parse(readFileSync(ROOT + 'src/data/course-sublines.json', 'utf8'));
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const THRESHOLD = Number(process.env.THRESH || 3); // win >= a minor = a real hang

/** Best net material the side-to-move can win via a single capture (SEE-1:
 *  capture value, minus the capturer if the target is recaptured). */
// Best material the side-to-move can win, NET of the exchange the prior move
// (`mDest` = its destination square, `mGain` = value it just captured)
// initiated. A recapture ON `mDest` is part of that exchange, so we subtract
// the mover's own gain — a fair trade (Bxc6 bxc6) nets 0 and is NOT a hang.
// A capture on any OTHER square, or with no prior capture, is an independent
// hang and counts in full (the Frankenstein queen: a3 then …gxh5 on h5).
function bestHang(chess, mDest, mGain) {
  let best = null;
  for (const m of chess.moves({ verbose: true })) {
    if (!m.captured) continue;
    const gained = VAL[m.captured] ?? 0;
    if (gained < THRESHOLD) continue; // net <= gained, can't reach the bar
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const recap = chess.moves({ verbose: true }).some((r) => r.to === m.to && r.captured);
    chess.undo();
    let net = recap ? gained - (VAL[m.piece] ?? 0) : gained;
    if (m.to === mDest) net -= mGain; // recapture of the exchange just initiated
    if (net >= THRESHOLD && (!best || net > best.net)) {
      best = { net, san: m.san, captured: m.captured, square: m.to };
    }
  }
  return best;
}

const only = process.env.OPENING ? new Set(process.env.OPENING.split(',')) : null;
const flags = [];
for (const [opening, group] of Object.entries(data)) {
  if (only && !only.has(opening)) continue;
  process.stderr.write(`  sweeping ${opening}...\n`);
  for (const [key, list] of Object.entries(group)) {
    const arr = Array.isArray(list) ? list : [list];
    for (const sl of arr) {
      if (!sl || !Array.isArray(sl.moves)) continue;
      const chess = new Chess();
      let bad = false;
      for (let i = 0; i < sl.moves.length; i++) {
        const san = sl.moves[i];
        let mv;
        try { mv = chess.move(san); } catch { mv = null; }
        if (!mv) { flags.push({ opening, key, name: sl.name, ply: i + 1, issue: `ILLEGAL move "${san}"` }); bad = true; break; }
        // After this move it's the opponent's turn — did `mv`'s side hang material?
        const hang = bestHang(chess, mv.to, VAL[mv.captured] ?? 0);
        if (hang) {
          const moverJustHung = NAME[hang.captured];
          flags.push({
            opening, key, name: sl.name, ply: i + 1,
            issue: `after ${san}, ${chess.turn() === 'w' ? 'White' : 'Black'} plays ${hang.san} winning the ${moverJustHung} on ${hang.square} (net +${hang.net})`,
          });
          bad = true;
          break; // one flag per line is enough to condemn it
        }
      }
    }
  }
}

console.log(`\nSwept ${Object.keys(data).length} openings.`);
console.log(`FLAGGED ${flags.length} unsound subline(s) (side ignores a free piece >= ${THRESHOLD}):\n`);
for (const f of flags) {
  console.log(`  [${f.opening} :: ${f.key}] ${f.name ?? ''}`);
  console.log(`     ply ${f.ply}: ${f.issue}`);
}
if (flags.length === 0) console.log('  none — all sublines are materially sound.');
