// A student who can actually play a game.
//
// The Learn audits drove the board from a fixed list of preferred moves, which
// runs out the moment the coach deviates — the 2026-08-09 run stopped at ply 8
// with "no preferred move is legal here", still in the opening. That is fine
// for probing an opening and useless for the question David actually asked:
// does the MIDDLEGAME teaching work — improving pieces, trading off the
// opponent's best piece. Those beats cannot fire in a game that never leaves
// book.
//
// So: a small deterministic player. Not strong, and it does not need to be —
// it needs to produce a real, legal, human-shaped game that develops, castles,
// takes what is free, avoids giving material away, and reaches a middlegame
// and an endgame. No engine binary is available in this container (checked),
// and shelling one out per ply would dominate the run time anyway.
import { Chess } from 'chess.js';

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);
const BROAD_CENTER = new Set(['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6', ...CENTER]);

/** Cheapest attacker of `square` for `side`, in pawns. Infinity if none. */
function cheapestAttacker(chess, square, side) {
  let best = Infinity;
  for (const m of chess.moves({ verbose: true })) {
    if (m.color !== side || m.to !== square) continue;
    best = Math.min(best, VALUE[m.piece] ?? 0);
  }
  return best;
}

/** Would `move` leave the piece it moves hanging to a cheaper attacker? */
function losesMaterial(fen, move) {
  const after = new Chess(fen);
  after.move(move.san);
  const them = move.color === 'w' ? 'b' : 'w';
  // `after` has THEM to move, so their attacks are the legal moves.
  let takenBy = Infinity;
  for (const m of after.moves({ verbose: true })) {
    if (m.to !== move.to || !m.captured) continue;
    takenBy = Math.min(takenBy, VALUE[m.piece] ?? 0);
  }
  if (takenBy === Infinity) return 0;
  // Recapture available? Then it is a trade, judged on the exchange.
  const afterTake = new Chess(after.fen());
  const take = afterTake.moves({ verbose: true }).find((m) => m.to === move.to && m.captured);
  if (take) {
    afterTake.move(take.san);
    const recapture = cheapestAttacker(afterTake, move.to, move.color);
    if (recapture !== Infinity) return Math.max(0, (VALUE[move.piece] ?? 0) - (VALUE[take.piece] ?? 0));
  }
  return VALUE[move.piece] ?? 0;
}

function score(fen, move, ply) {
  let s = 0;
  if (move.san.includes('#')) return 1000;
  if (move.captured) s += (VALUE[move.captured] ?? 0) * 10;
  if (move.san.includes('+')) s += 2;
  if (move.san.includes('O-O')) s += ply < 30 ? 8 : 2;
  if (move.promotion) s += 80;
  // Develop in the opening; stop shuffling minors afterwards.
  if (ply < 24 && (move.piece === 'n' || move.piece === 'b')) {
    const homeRank = move.color === 'w' ? '1' : '8';
    if (move.from[1] === homeRank) s += 5;
  }
  if (ply < 20 && move.piece === 'p' && CENTER.has(move.to)) s += 4;
  if (BROAD_CENTER.has(move.to)) s += 1;
  // Do not walk the king or the queen out early.
  if (ply < 24 && move.piece === 'k' && !move.san.includes('O-O')) s -= 8;
  if (ply < 16 && move.piece === 'q') s -= 4;
  s -= losesMaterial(fen, move) * 9;
  return s;
}

/**
 * The move this student plays from `fen`. Deterministic: ties break on SAN, so
 * a re-run of the audit plays the same game and a regression is comparable.
 */
export function pickStudentMove(fen, ply) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  let best = null;
  for (const m of moves) {
    const s = score(fen, m, ply);
    if (!best || s > best.s || (s === best.s && m.san < best.m.san)) best = { m, s };
  }
  return best?.m ?? null;
}
