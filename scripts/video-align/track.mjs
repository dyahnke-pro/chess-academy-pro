// Occupancy grids -> a real game, with the RULES as error-correction.
//
// The OCR never says WHICH piece is on a square, only that one is there and
// what colour. That is enough: chess.js knows the ~30 legal moves from any
// position and each produces a distinct occupancy pattern, so the move that
// explains the new grid IS the move played. A grid matching no legal move is
// discarded, never guessed at — the failure mode is silence, not invention.
//
// CALIBRATION. Board themes, piece sets and the frame crop all bias particular
// squares: in this video a1 and d1 read black in EVERY frame, including the 29
// frames showing the untouched start position. That is a fixed offset, not
// noise, so it is measured once against the known starting layout and
// subtracted thereafter — rather than loosening the match threshold, which
// would let real misreads through everywhere else.
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';

const grids = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const gridOf = (c) => c.board().map((r) => r.map((x) => (x ? x.color : '.')).join(''));
const START = gridOf(new Chess());

const raw = (a, b) => {
  let d = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (a[r][c] !== b[r][c]) d++;
  return d;
};

// The most-repeated grid in the video is the board sitting at the start
// position between games; its disagreement with START is the bias map.
const counts = new Map();
for (const { grid } of grids) {
  const k = grid.join('/');
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
let bias = null;
for (const [k, n] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  const g = k.split('/');
  if (raw(g, START) <= 6) { bias = { g, n }; break; }
}
const fix = [];
if (bias) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (bias.g[r][c] !== START[r][c]) fix.push([r, c, bias.g[r][c], START[r][c]]);
  }
  console.log(`calibrated on ${bias.n} start-position frames; ${fix.length} biased square(s): ` +
    fix.map(([r, c, saw, real]) => `${'abcdefgh'[c]}${8 - r}(${saw}->${real})`).join(' '));
}
/** Undo the measured bias, but only where the OCR still reports the same wrong
 *  value — a square that changed has a piece on it and must be believed. */
function correct(grid) {
  const g = grid.map((r) => r.split(''));
  for (const [r, c, saw, real] of fix) if (g[r][c] === saw) g[r][c] = real;
  return g.map((r) => r.join(''));
}

const chess = new Chess();
const moves = [];
let last = START;

for (const { t, grid } of grids) {
  const obs = correct(grid);
  if (raw(obs, last) === 0) continue;

  let best = null;
  for (const m1 of chess.moves()) {
    const c1 = new Chess(chess.fen());
    c1.move(m1);
    const d1 = raw(obs, gridOf(c1));
    if (best === null || d1 < best.d) best = { d: d1, line: [m1] };
    if (d1 === 0) break;
    for (const m2 of c1.moves()) {
      const c2 = new Chess(c1.fen());
      c2.move(m2);
      const d2 = raw(obs, gridOf(c2));
      if (d2 < best.d) best = { d: d2, line: [m1, m2] };
    }
  }

  if (best && best.d === 0) {
    for (const san of best.line) chess.move(san);
    last = gridOf(chess);
    moves.push({ t, line: best.line, fen: chess.fen(), ply: chess.history().length });
  }
}

writeFileSync('/tmp/vidtest/track.json', JSON.stringify(moves, null, 1));
console.log(`\ntracked ${moves.length} moves`);
console.log(`line: ${chess.history().join(' ')}`);
