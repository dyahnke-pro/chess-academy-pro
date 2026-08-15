// Occupancy grids -> real games, with the RULES as error-correction.
//
// The OCR never says WHICH piece is on a square, only that one is there and
// what colour. That is enough: chess.js knows the ~30 legal moves from any
// position and each produces a distinct occupancy pattern, so the move that
// explains the new grid IS the move played. A grid matching no legal line is
// discarded, never guessed at — the failure mode is silence, not invention (G3).
//
// ── THREE THINGS THE FIRST CUT GOT WRONG ────────────────────────────────────
//
// SETTLED FRAMES ONLY. 472 of 811 frames "changed", and requiring every one to
// match a legal move yielded 7 moves from a 27-minute video. Most of those
// changes are not moves: a piece is mid-animation, the mouse is over a square,
// the last-move highlight is repainting. A frame is only believable once the
// SAME grid has been seen twice running, which is what a settled position looks
// like. That turns a noisy stream into a short list of real positions.
//
// SEARCH DEPTH. Between two settled frames the speaker may have played several
// plies — commentary runs long, the sampler runs at 0.5fps. Searching one and
// two plies stalls the moment a third slips past, and once stalled the tracker
// stays stalled for the rest of the video. Iterative deepening to MAX_PLY
// recovers those without inventing anything, because every ply on the path is
// still a legal move and the destination must match the board exactly.
//
// MANY GAMES PER VIDEO. A speedrun or an opening-buster plays game after game.
// When a settled grid IS the start position, that is a new game, not an
// impossible move — reset and keep going rather than trying to explain it.
//
// AND THE ONE THAT MATTERS MOST: TEACHING VIDEOS REWIND. The tracker stalled at
// ply 9 of the pilot not because the OCR failed but because the board went
// BACKWARDS — at t=134s the d7 pawn is home again and the e4 pawn is back, a
// position from four plies earlier. He had taken the moves back to show a
// different continuation, which is what a lesson does constantly. A
// forward-only tracker treats that as an impossible jump and never recovers.
// So every position reached is remembered, and a grid matching one of them is
// a REWIND: drop back to that ply and carry on from there.
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';

/** How many plies may pass between two settled frames. Beyond ~6 the search
 *  space stops being worth the time and a gap that long usually means the
 *  camera left the board entirely. */
const MAX_PLY = 4;
/** A diff wider than this is a scene change, a new game, or a bad read — not a
 *  sequence of moves, since 4 plies can only touch ~10 squares. Bailing here is
 *  what stops one bad frame costing the whole video. */
const MAX_DIFF = 10;
/** Ceiling on the work a single frame may cost. */
const NODE_BUDGET = 60_000;

/**
 * OCCUPANCY, not colour — which is what this file's own header says it reads,
 * and what it did NOT do until 2026-08-15.
 *
 * The design argument is in the README: we are not reading a position cold, we
 * are tracking from the start where chess.js already knows the legal moves, and
 * each of those produces a distinct occupancy pattern. Colour is not needed to
 * tell them apart — and it is the channel that breaks first. On the second
 * pilot video the reader got the occupancy of a mid-game board EXACTLY right
 * and the colours wrong across the bottom three ranks, because that part of the
 * frame is dimmer and white pieces there missed a global brightness threshold.
 * Comparing colour turned a perfect occupancy read into 0 plies from 9,547
 * frames.
 *
 * So squares compare as occupied-or-not. Colour is still READ (the grids carry
 * w/b) and is used only to break ties between candidate lines that reach the
 * same occupancy.
 */
const OCC = (ch) => (ch === '.' ? '.' : 'x');
const occupancyOf = (rows) => rows.map((r) => r.split('').map(OCC).join(''));
const colourOf = (c) => c.board().map((r) => r.map((x) => (x ? x.color : '.')).join(''));
const gridOf = (c) => occupancyOf(colourOf(c));
const START = gridOf(new Chess());

function diff(a, b) {
  let d = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (a[r][c] !== b[r][c]) d++;
  return d;
}

/**
 * Measure the OCR's fixed bias against the known starting layout.
 *
 * Board themes, piece sets and the frame crop bias particular squares — in the
 * pilot a1 and d1 read black in EVERY frame, including the 29 showing the
 * untouched start position. That is an offset, not noise, so it is subtracted
 * rather than absorbed by loosening the match threshold, which would admit real
 * misreads everywhere else.
 */
function calibrate(grids) {
  const counts = new Map();
  for (const { grid } of grids) {
    const k = grid.join('/');
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const [k] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    const g = k.split('/');
    if (diff(g, START) <= 6) {
      const fix = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (g[r][c] !== START[r][c]) fix.push([r, c, g[r][c], START[r][c]]);
      }
      return fix;
    }
  }
  return [];
}

const applyFix = (grid, fix) => {
  const g = grid.map((r) => r.split(''));
  // Only correct a square still showing the biased value — a square that
  // changed has a piece on it and must be believed.
  for (const [r, c, saw, real] of fix) if (g[r][c] === saw) g[r][c] = real;
  return g.map((r) => r.join(''));
};

/** Squares where two grids disagree, as algebraic names. */
function diffSquares(a, b) {
  const out = new Set();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (a[r][c] !== b[r][c]) out.add(`${'abcdefgh'[c]}${8 - r}`);
    }
  }
  return out;
}

/** Occupancy grid straight off a live Chess instance, no FEN round-trip. */
function liveGrid(c) {
  return gridOf(c);
}

/**
 * Legal line of up to MAX_PLY landing exactly on `target`, or null.
 *
 * Two things make this tractable, and the first version had neither:
 *
 * PRUNED BY THE DIFF. A move can only help if it TOUCHES a square the two
 * grids disagree about — any other move leaves a square wrong that nothing
 * later fixes. Unguided, six plies is ~30^6 nodes and the search never
 * returned; guided, branching drops to a handful.
 *
 * MOVE/UNDO ON ONE INSTANCE. The rewrite that actually mattered: constructing
 * `new Chess(fen)` per node re-parses a FEN every time, which dominated
 * everything else and left the 455-position video still running after ten
 * minutes. One instance, mutated and rewound, is the same search without that
 * cost.
 *
 * Iterative deepening so the SHORTEST explanation wins — a longer line can
 * reach the same occupancy by coincidence, and the shorter one is what happened.
 */
function explain(chess, target) {
  const need = diffSquares(liveGrid(chess), target);
  // A ply moves 2 squares (4 castling), so a diff far wider than the budget is
  // not a move sequence at all — a cut to another board, a new game, or a bad
  // read. Bail BEFORE searching; these are the cases that ran for hours.
  if (need.size === 0 || need.size > MAX_DIFF) return null;

  let budget = NODE_BUDGET;

  const walk = (depth, line) => {
    if (line.length === depth) {
      return diff(liveGrid(chess), target) === 0 ? [...line] : null;
    }
    const remaining = diffSquares(liveGrid(chess), target);
    // Each remaining ply can fix at most ~4 squares; if the gap is wider than
    // that, this branch cannot reach the target however it continues.
    if (remaining.size === 0 || remaining.size > (depth - line.length) * 4) return null;
    for (const m of chess.moves({ verbose: true })) {
      if (--budget < 0) return null;
      if (!remaining.has(m.from) && !remaining.has(m.to)) continue;
      chess.move(m.san);
      line.push(m.san);
      const got = walk(depth, line);
      line.pop();
      chess.undo();
      if (got) return got;
    }
    return null;
  };

  for (let depth = 1; depth <= MAX_PLY; depth++) {
    const got = walk(depth, []);
    if (got) return got;
  }
  return null;
}

// Normalise to OCCUPANCY the moment the grids are read, so calibration, the
// settle pass and the search all speak one alphabet. The colour the reader
// produced is deliberately dropped here rather than threaded through: it was
// never load-bearing, and keeping two representations alive is how one of them
// ends up compared against the other.
const grids = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  .map((row) => ({ ...row, grid: occupancyOf(row.grid) }));
const fix = calibrate(grids);
if (fix.length) {
  console.log(`calibrated: ${fix.length} biased square(s) — `
    + fix.map(([r, c, saw, real]) => `${'abcdefgh'[c]}${8 - r}(${saw}->${real})`).join(' '));
}

// SETTLE: keep a grid only once it has repeated, then collapse runs. What
// survives is the sequence of positions that were actually on screen.
const settled = [];
for (let i = 1; i < grids.length; i++) {
  const g = applyFix(grids[i].grid, fix);
  if (diff(g, applyFix(grids[i - 1].grid, fix)) !== 0) continue;
  if (settled.length && diff(g, settled[settled.length - 1].grid) === 0) continue;
  settled.push({ t: grids[i].t, grid: g });
}
console.log(`${grids.length} frames -> ${settled.length} settled positions`);

const games = [];
let chess = new Chess();
let game = { start: settled[0]?.t ?? 0, moves: [] };
let lost = 0;
/** Every occupancy grid this game has been in -> the ply it was at. A lesson
 *  rewinds to show alternatives, and the way back is to recognise where it
 *  landed rather than to search for moves that cannot exist. */
let seenPositions = new Map([[gridOf(chess).join('/'), 0]]);

for (const { t, grid } of settled) {
  if (diff(grid, gridOf(chess)) === 0) continue;

  // A settled board back at the starting layout is the NEXT GAME, not a move.
  if (diff(grid, START) === 0) {
    if (game.moves.length) games.push(game);
    chess = new Chess();
    game = { start: t, moves: [] };
    seenPositions = new Map([[gridOf(chess).join('/'), 0]]);
    lost = 0;
    continue;
  }

  const line = explain(chess, grid);
  if (line) {
    for (const san of line) chess.move(san);
    seenPositions.set(gridOf(chess).join('/'), chess.history().length);
    game.moves.push({ t, line, ply: chess.history().length, fen: chess.fen() });
    lost = 0;
    continue;
  }

  // REWIND: the board is at a position this game already visited, so moves
  // were taken back to show something else. Step back to that ply instead of
  // hunting for a forward line that does not exist.
  const back = seenPositions.get(grid.join('/'));
  if (back !== undefined && back < chess.history().length) {
    while (chess.history().length > back) chess.undo();
    game.moves.push({ t, line: [], rewindTo: back, ply: back, fen: chess.fen() });
    lost = 0;
    continue;
  }
  lost++;
}
if (game.moves.length) games.push(game);

const total = games.reduce((n, g) => n + g.moves.reduce((m, x) => m + x.line.length, 0), 0);
writeFileSync(process.argv[3] ?? '/tmp/vidtest/track.json', JSON.stringify(games, null, 1));
console.log(`\n${games.length} game(s), ${total} plies tracked`);
// Print the STEPS, never a flattened move list. After a rewind the following
// moves continue from the earlier position, so concatenating everything into
// one line reads as nonsense ("Bxf2+ Bxf2+") and looks like a tracking bug when
// the data is right. Each step carries its own FEN; that is the real output.
for (const [i, g] of games.entries()) {
  const rewinds = g.moves.filter((m) => m.rewindTo !== undefined).length;
  console.log(`  game ${i + 1} @${g.start}s — ${g.moves.length} steps, ${rewinds} rewind(s)`);
  for (const m of g.moves.slice(0, 24)) {
    const what = m.rewindTo !== undefined ? `<< rewind to ply ${m.rewindTo}` : m.line.join(' ');
    console.log(`      t=${String(m.t).padStart(7)}  ply ${String(m.ply).padStart(2)}  ${what}`);
  }
  if (g.moves.length > 24) console.log(`      … ${g.moves.length - 24} more`);
}
