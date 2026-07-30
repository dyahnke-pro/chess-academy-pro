// Shared "does this variation walk into the middlegame?" metric.
// Used by the gate test (variationMiddlegameDepth.test.ts) and the
// baseline generator (scripts/pro-repertoire/gen-mg-depth-baseline.mjs)
// so the rule is defined in exactly one place.
//
// David 2026-05-29: every pro-rep opening AND every variation must reach
// the middlegame — the spine can't stop at the moment of divergence. A
// line "reaches the middlegame" if ANY of:
//   (1) >= 14 plies (both sides to ~move 7), OR
//   (2) at least one side has castled, OR
//   (3) both sides have developed >= 2 minor pieces.
// This trips only lines that are short AND uncastled AND under-developed
// — the genuinely-shallow class (e.g. a 6-ply "…c5" stub), never a
// legitimately sharp-but-developed line.
import { Chess } from 'chess.js';

const HOME = {
  w: { b: ['c1', 'f1'], n: ['b1', 'g1'] },
  b: { b: ['c8', 'f8'], n: ['b8', 'g8'] },
};

export function reachesMiddlegame(pgn) {
  const chess = new Chess();
  const moves = pgn.trim().split(/\s+/).filter(Boolean);
  let wCastle = false;
  let bCastle = false;
  for (const m of moves) {
    // FAIL CLOSED on an illegal move. This used to throw, and the throw escaped
    // through openingDetectionService.mainLineReaches into opening RESOLUTION —
    // so a single bad move in one entry's line crashed "teach me <that opening>"
    // outright rather than the line simply not qualifying as a middlegame.
    let r = null;
    try { r = chess.move(m); } catch { r = null; }
    if (!r) return { pass: false, plies: moves.length, wCastle, bCastle, wDev: 0, bDev: 0, illegalAt: m };
    if (r.san === 'O-O' || r.san === 'O-O-O') {
      if (r.color === 'w') wCastle = true;
      else bCastle = true;
    }
  }
  let wDev = 0;
  let bDev = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || (sq.type !== 'b' && sq.type !== 'n')) continue;
      if (!HOME[sq.color][sq.type].includes(sq.square)) {
        if (sq.color === 'w') wDev++;
        else bDev++;
      }
    }
  }
  const plies = moves.length;
  const pass = plies >= 14 || wCastle || bCastle || (wDev >= 2 && bDev >= 2);
  return { pass, plies, wCastle, bCastle, wDev, bDev };
}
