// Universal G3 DB-anchoring helper.
//
// Gate G3 (CLAUDE.md): "If a line isn't in the DB, it doesn't exist for
// us." `openings-lichess.json` (3,641 ECO entries) is the canonical move
// database. A line is GROUNDED when its opening spine matches a real DB
// entry's move prefix; anything past that anchor is middlegame
// continuation (legal play beyond book), which is fine — the danger this
// catches is an INVENTED opening line that never enters real theory at all.
//
// `repertoire-orientation.test.ts` already anchors trap/warning PGN
// *strings* this way (the ≥6-ply `PGN_NOT_IN_DB` rule). This helper
// generalises the same logic to SAN *arrays* — the shape lesson beats
// (`beat.moves`) and plan lines (`playableLine.moves`) use — so the
// anchoring contract reaches the files where the masterclass content
// actually lives.

import { Chess } from 'chess.js';
import openingsDb from '../data/openings-lichess.json';

let prefixSet: Set<string> | null = null;

/** Lazily build the set of every move-prefix present in the canonical DB. */
export function dbPrefixSet(): Set<string> {
  if (prefixSet) return prefixSet;
  const set = new Set<string>();
  for (const e of openingsDb as Array<{ pgn?: string }>) {
    if (!e?.pgn) continue;
    const moves = e.pgn.split(' ');
    for (let k = 1; k <= moves.length; k++) {
      set.add(moves.slice(0, k).join(' '));
    }
  }
  prefixSet = set;
  return set;
}

/** Normalise a SAN list to the canonical SAN the DB stores (via chess.js),
 *  stopping at the first illegal move (legality is a separate gate's job). */
function canonicalSans(sans: string[]): string[] {
  const c = new Chess();
  const out: string[] = [];
  for (const m of sans) {
    try {
      const mv = c.move(m);
      out.push(mv.san);
    } catch {
      break;
    }
  }
  return out;
}

/** Longest k such that the first k canonical SANs form a DB move-prefix.
 *  Returns 0 when the line never enters canonical territory at all. */
export function longestAnchorPly(sans: string[]): number {
  const set = dbPrefixSet();
  const clean = canonicalSans(sans);
  for (let k = clean.length; k >= 1; k--) {
    if (set.has(clean.slice(0, k).join(' '))) return k;
  }
  return 0;
}

/** The deepest DB anchor any single beat of a lesson reaches. A lesson is
 *  grounded if SOME beat's spine is real theory ≥ the floor — trap-branch
 *  beats that show a "what if they blunder" tail don't drag the score
 *  down, because a sibling beat carries the real line. */
export function maxAnchorPly(beatMoveLists: string[][]): number {
  let max = 0;
  for (const moves of beatMoveLists) {
    const a = longestAnchorPly(moves);
    if (a > max) max = a;
  }
  return max;
}

/** The minimum DB anchor a real opening line must reach to count as
 *  grounded (not invented). Matches the ≥6-ply convention already used by
 *  `repertoire-orientation.test.ts`'s PGN_NOT_IN_DB rule. */
export const MIN_DB_ANCHOR_PLY = 6;
