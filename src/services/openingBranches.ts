// Where a game can go from here, and what each road is called.
//
// David 2026-08-09, describing what Learn with Coach has always been meant to
// be: "Pickers would be a good way to select. Like a build your own story book…
// Once the user is done exploring one branch, however far he wants to take it,
// he can hit the next picker and then walk the other paths."
//
// The branches have to come from the OPENING DATABASE, and it is worth being
// precise about why, because the obvious alternative was tried first and is
// wrong. Corpus notes cluster at a position and each names an opening, so three
// notes at one board look like three roads out of it. They are not: measured
// across the primary corpus, 683 of 1,356 position-anchored notes — 50.4% — are
// filed at a board their own named opening never reaches. At `e4 c5 c3 d5` the
// three co-located notes named the Stoltz Attack (which plays 3…Nf6, not d5),
// the Smith-Morra Declined (a different opening entirely), and the Alapin
// parent. Only one of the three was about that board, and the DB says the real
// continuation there is a single move.
//
// So: the DB knows the moves, the corpus knows the teaching, and asking either
// one the other's question is how the coach ends up confidently wrong (G3).
import openingsData from '../data/openings-lichess.json';

interface DbEntry { eco: string; name: string; pgn: string }

const DB = openingsData as unknown as DbEntry[];

export interface OpeningBranch {
  /** The move that commits the game to this branch. */
  san: string;
  /** What this road is called — the shallowest named line under it, which is
   *  the name a student would recognise ("Advance Variation" rather than
   *  "Advance Variation, Botvinnik-Carls, Modern Line"). */
  name: string;
  /** ECO of that shallowest line. */
  eco: string;
  /** How many named lines live down this road — a rough measure of how much
   *  theory the student is choosing to walk into. */
  lines: number;
  /** The deepest line under this branch, for a coach that wants to steer. */
  deepestPgn: string[];
}

/** Is `prefix` the opening moves of `line`? */
function extendsLine(line: readonly string[], prefix: readonly string[]): boolean {
  if (line.length <= prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) if (line[i] !== prefix[i]) return false;
  return true;
}

/**
 * The named roads out of this position, grouped by the move that takes them.
 *
 * Empty when the position is off the map or has only one continuation — a
 * "fork" with one road is not a choice, and offering it would be noise.
 */
export function branchesAt(historySans: readonly string[]): OpeningBranch[] {
  const byMove = new Map<string, DbEntry[]>();
  for (const entry of DB) {
    const moves = entry.pgn.split(/\s+/).filter(Boolean);
    if (!extendsLine(moves, historySans)) continue;
    const san = moves[historySans.length];
    const bucket = byMove.get(san);
    if (bucket) bucket.push(entry);
    else byMove.set(san, [entry]);
  }

  const branches: OpeningBranch[] = [];
  for (const [san, entries] of byMove) {
    const byDepth = [...entries].sort(
      (a, b) => a.pgn.split(/\s+/).length - b.pgn.split(/\s+/).length,
    );
    const shallowest = byDepth[0];
    const deepest = byDepth[byDepth.length - 1];
    branches.push({
      san,
      name: shallowest.name,
      eco: shallowest.eco,
      lines: entries.length,
      deepestPgn: deepest.pgn.split(/\s+/).filter(Boolean),
    });
  }
  // Most-theory first: the road with the most named lines under it is the one
  // a student is most likely to meet, and the one worth offering first.
  return branches.sort((a, b) => b.lines - a.lines || a.san.localeCompare(b.san));
}

/** A position is a FORK when more than one named road leaves it. */
export function isFork(historySans: readonly string[]): boolean {
  return branchesAt(historySans).length > 1;
}

/**
 * Does this opening's real line pass through this position?
 *
 * The anchor check the corpus never had. A note is filed at a board and names
 * an opening; if that opening's own line and the board disagree, the note is
 * describing a different game — which is how a Najdorf note reached a Dragon
 * and a Spanish note reached a Sicilian. Half the anchored corpus fails it.
 *
 * Agreement means one is a prefix of the other: the opening's line may stop
 * short of the board (a parent name) or run past it (a deeper line), but they
 * must not diverge.
 */
export function openingReachesPosition(
  openingName: string,
  historySans: readonly string[],
): boolean {
  const entry = DB.find((e) => e.name === openingName);
  if (!entry) return true; // unknown to the DB — nothing to contradict
  const line = entry.pgn.split(/\s+/).filter(Boolean);
  const shared = Math.min(line.length, historySans.length);
  for (let i = 0; i < shared; i += 1) if (line[i] !== historySans[i]) return false;
  return true;
}
