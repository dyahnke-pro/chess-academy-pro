// The ONE model-game variation classifier: which tab of its opening a model
// game shows under (`ModelGame.variation`; absent = the main line). The tagging
// script (scripts/classify-model-game-variations.mjs) and the gate test
// (modelGameVariation.test.ts) both import this file, so the rule that wrote a
// tag and the rule that checks it cannot drift.
//
// THE RULE — by POSITION as well as by move order (2026-11-11). A game reached
// by a different move order visits the same positions once it converges, so a
// transposition counts. The old classifier matched the move-order prefix first:
// the GothamChess Vienna game vs Kovalev (2…Nc6 / 3…Nf6) shares the "Quiet vs
// …Na5" tab's first six moves and was filed there, though it plays the "Vienna
// Quiet (Bc4 + d3)" line by position for 13 plies, plan and all.
//
//   depth   — the deepest ply of a line whose position the game reaches (at any
//             ply of the game): how far it follows that line by position.
//   reached — the game got to where the variation is itself: it played the
//             variation's identifying moves in order (the old PERFECT rule), or
//             it reached a position past the last point the variation's line
//             coincides with the main line or a sibling.
//
// 1. The variation the game follows DEEPEST by position wins; ties go to the
//    reached one, then the most specific (latest identity), then the one it
//    follows longest by move order, then the order the tabs are listed.
// 2. It is filed there when it is reached, or when it is followed deeper than
//    the main line, or when it is the only variation followed that deep and at
//    least TRANSPOSE_FLOOR plies (deep enough to be that line, not a shared
//    early tabiya).
// 3. Otherwise the main line is the deepest line the game follows, and a
//    variation still counts when the game played its identifying moves in
//    order, or reached the end of a variation whose every position is on the
//    main line (a prefix variation, by any move order). A game that passed
//    through a tab's own positions and came back to the shared trunk is not
//    filed there. Else untagged = main line.
import { Chess } from 'chess.js';

/** A position followed this deep is specific to its line (rule 2). */
export const TRANSPOSE_FLOOR = 8;

function toMoves(pgnOrMoves) {
  if (Array.isArray(pgnOrMoves)) return pgnOrMoves;
  return String(pgnOrMoves || '').trim().split(/\s+/).filter(Boolean);
}

/** Play a move list from the start: the UCI of each move and the position after
 *  it (board, side to move, castling, en passant — no move counters). Stops at
 *  the first illegal move. */
export function playLine(pgnOrMoves) {
  const c = new Chess();
  const uci = [];
  const positions = [];
  for (const m of toMoves(pgnOrMoves)) {
    let mv = null;
    try { mv = c.move(m); } catch { mv = null; }
    if (!mv) break;
    uci.push(mv.from + mv.to + (mv.promotion || ''));
    positions.push(c.fen().split(' ').slice(0, 4).join(' '));
  }
  return { uci, positions };
}

function commonLen(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** The deepest ply (1-based) of `line` whose position is in `seen`; 0 if none. */
function deepestReached(seen, line) {
  let best = 0;
  for (let j = 0; j < line.length; j++) if (seen.has(line[j])) best = j + 1;
  return best;
}

/** An opening's lines, read once: the main line, and each variation with the
 *  depth where it becomes itself by move order and by position. */
export function analyzeOpening(opening) {
  const main = playLine(opening.pgn);
  const onMain = new Set(main.positions);
  const lines = (opening.variations || [])
    .map((v) => ({ name: v.name, ...playLine(v.pgn) }))
    .filter((v) => v.uci.length > 0);
  const variations = lines.map((v, i) => {
    const others = [main, ...lines.filter((_, j) => j !== i)];
    let sharedMoves = 0;
    for (const o of others) sharedMoves = Math.max(sharedMoves, commonLen(v.uci, o.uci));
    const elsewhere = new Set(others.flatMap((o) => o.positions));
    let lastShared = 0;
    for (let j = 0; j < v.positions.length; j++) if (elsewhere.has(v.positions[j])) lastShared = j + 1;
    return {
      name: v.name,
      uci: v.uci,
      positions: v.positions,
      moveId: Math.min(sharedMoves + 1, v.uci.length),
      positionId: Math.min(lastShared + 1, v.positions.length),
      onMainLine: v.positions.every((p) => onMain.has(p)),
    };
  });
  return { main, variations };
}

/** The variation a game played, or null for the main line. `tier` says which
 *  rule filed it. */
export function classifyGame(pgnOrMoves, analysis) {
  const { main, variations } = analysis;
  const game = playLine(pgnOrMoves);
  const seen = new Set(game.positions);
  const mainDepth = deepestReached(seen, main.positions);
  const scored = variations.map((v, index) => {
    const depth = deepestReached(seen, v.positions);
    const moveDepth = commonLen(game.uci, v.uci);
    const byMoves = moveDepth >= v.moveId;
    const byPosition = depth > 0 && depth >= v.positionId;
    const specificity = Math.max(byMoves ? v.moveId : 0, byPosition ? v.positionId : 0);
    return { v, index, depth, moveDepth, byMoves, byPosition, reached: byMoves || byPosition, specificity };
  });
  const ranked = [...scored].sort((a, b) =>
    (b.depth - a.depth)
    || (Number(b.reached) - Number(a.reached))
    || (b.specificity - a.specificity)
    || (b.moveDepth - a.moveDepth)
    || (a.index - b.index));
  const best = ranked[0];
  if (!best || best.depth === 0) return null;
  const filed = (s, tier) => ({ name: s.v.name, tier });
  if (best.reached) return filed(best, 'reached');
  if (best.depth > mainDepth) return filed(best, 'past-main');
  const second = ranked[1];
  if (best.depth >= TRANSPOSE_FLOOR && (!second || second.depth < best.depth)) return filed(best, 'only-deep');
  const fallback = ranked.find((s) => s.byMoves || (s.v.onMainLine && s.depth === s.v.positions.length));
  return fallback ? filed(fallback, 'under-main') : null;
}

/** A classifier over a set of openings, each opening read once. */
export function createVariationClassifier(openings) {
  const byId = new Map(openings.map((o) => [o.id, o]));
  const cache = new Map();
  return (game) => {
    const opening = byId.get(game.openingId);
    if (!opening) return null;
    let analysis = cache.get(opening.id);
    if (!analysis) {
      analysis = analyzeOpening(opening);
      cache.set(opening.id, analysis);
    }
    return classifyGame(game.pgn, analysis);
  };
}
