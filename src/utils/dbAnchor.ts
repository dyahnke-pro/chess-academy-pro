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
import mastersDb from '../../public/data/openings-masters-db.json';
import gothamAnchor from '../data/pro-game-anchors/gothamchess.json';
import naroditskyAnchor from '../data/pro-game-anchors/naroditsky.json';
import ericrosenAnchor from '../data/pro-game-anchors/ericrosen.json';

let prefixSet: Set<string> | null = null;

// ── Masters DB as a grounding source (David 2026-05-27) ─────────────────────
// "We teach how the masters play the line." A line is ALSO grounded when every
// ply of its opening spine is a move masters actually played from that exact
// position — read from openings-masters-db.json (FEN-keyed, first-4-fields).
// This sits alongside the lichess-subset prefix anchor: a beat is grounded if
// EITHER source backs it ≥ MIN_DB_ANCHOR_PLY, so existing lessons keep their
// lichess anchor while new masters-sourced lines (e.g. the Jobava …c5/…Bf5/…a6
// sidelines the lichess subset lacks) anchor on real master play instead.
type MastersPositions = Record<string, Array<{ san: string }>>;
const mastersPositions: MastersPositions =
  (mastersDb as { positions?: MastersPositions }).positions ?? {};

/** Position-FEN key the masters DB is keyed by: first 4 FEN fields. */
function positionKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ');
}

/** Longest run of opening plies (from move 1) where each move is one masters
 *  actually played from that exact position in openings-masters-db.json. */
export function longestMastersAnchorPly(sans: string[]): number {
  const c = new Chess();
  let count = 0;
  for (const san of sans) {
    const key = positionKey(c.fen());
    let mv;
    try { mv = c.move(san); } catch { break; }
    const moves = mastersPositions[key];
    if (moves && moves.some((m) => m.san === mv.san)) count += 1;
    else break;
  }
  return count;
}

// ── PRO'S OWN GAMES as the grounding source for HIS tab (David 2026-05-28) ──
// "Use his real games. That's the database." LOCKED RULE — the pro's
// harvested game dump (via scripts/build-pro-anchor-index.mjs) is the
// authoritative grounding source for any opening built around HIM. A line
// anchors when each ply's position was one he reached AND the move played
// was one he actually played in ≥2 of his games. Sits alongside lichess +
// masters as a third (and PRIMARY for pro openings) anchor source.
const PRO_ANCHORS: Record<string, Record<string, string[]>> = {
  gothamchess: (gothamAnchor as { positions: Record<string, string[]> }).positions,
  naroditsky: (naroditskyAnchor as { positions: Record<string, string[]> }).positions,
  ericrosen: (ericrosenAnchor as { positions: Record<string, string[]> }).positions,
};

/** Longest run of opening plies where each move is one the named pro
 *  actually played from that exact position in his harvested game dump. */
export function longestProGameAnchorPly(sans: string[], proId: string): number {
  const anchor = PRO_ANCHORS[proId];
  if (!anchor) return 0;
  const c = new Chess();
  let count = 0;
  for (const san of sans) {
    const key = positionKey(c.fen());
    let mv;
    try { mv = c.move(san); } catch { break; }
    const moves = anchor[key];
    if (moves && moves.includes(mv.san)) count += 1;
    else break;
  }
  return count;
}

/** Extract `proId` from a `pro-<proId>-<rest>` opening id, else null. */
export function proIdFromOpeningId(openingId: string): string | null {
  const m = openingId.match(/^pro-([a-z]+)-/);
  return m ? m[1] : null;
}

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
 *  grounded if SOME beat's spine is real theory ≥ the floor.
 *
 *  **Pro tab = what he plays AND what he teaches** (David 2026-05-28).
 *  When `proId` is passed, his game dump anchors his PLAY content; for
 *  TAUGHT content (his videos/studies cover lines he doesn't personally
 *  play often), the lichess + masters DB union provides the anchor that
 *  the line is real, recognised opening theory. All three sources count
 *  for pro openings; the narration text MUST tell the user which one
 *  (plays / teaches / both) the lesson is grounded in. */
export function maxAnchorPly(beatMoveLists: string[][], proId?: string): number {
  let max = 0;
  for (const moves of beatMoveLists) {
    let a = Math.max(longestAnchorPly(moves), longestMastersAnchorPly(moves));
    if (proId) a = Math.max(a, longestProGameAnchorPly(moves, proId));
    if (a > max) max = a;
  }
  return max;
}

/** The minimum DB anchor a real opening line must reach to count as
 *  grounded (not invented). Matches the ≥6-ply convention already used by
 *  `repertoire-orientation.test.ts`'s PGN_NOT_IN_DB rule. */
export const MIN_DB_ANCHOR_PLY = 6;
