// proOpeningForks — aggregate a pro's MULTIPLE real games in one opening into a
// spine + fork-in-the-road tree, at RUNTIME from the pro-game-reference corpus
// (David 2026-09-10: "if they have multiple games with the same opening we use
// the fork-in-the-road sequencing for teaching how they play x opening").
//
// Unified-coach fit: this is a Layer-1 CANDIDATE source (board-proven, G0/G3 —
// every move comes from the pro's real chess.js-validated pgn, every count is
// computed, nothing invented). The spine + forks are delivered by the existing
// walkthrough HANDS (branchExplorer.Fork / the fork-tile UI) — no bespoke
// walkthrough. The offline pro-rep build (extract-opening-tree.mjs) does the
// same thing for hand-built masterclasses; this brings it to ANY pro+opening
// with ≥2 games on disk.
//
// Pure + dependency-light (chess.js only) so the trie logic is unit-testable
// without the browser or Dexie.
import { Chess } from 'chess.js';

/** The minimal shape the fork aggregator reads from each of a pro's games.
 *  `ProGameReference` satisfies it structurally, but so does a lighter mapping
 *  from the on-disk `lookup_player_games` result — the caller doesn't have to
 *  fabricate a full reference just to aggregate. */
export interface ProForkGameInput {
  /** Clean space-separated SAN, chess.js-validated. */
  pgn: string;
  /** The side the pro played in this game. */
  studentSide: 'white' | 'black';
  /** Half-move count (deepest game wins the representative pick). */
  plyCount: number;
  /** Opponent rating (tie-breaks the representative pick). */
  opponentRating: number | null;
  /** App player id (e.g. "naroditsky"). */
  playerId: string;
  /** Base opening id (e.g. "caro-kann"). */
  openingId: string;
  /** Human variation label (e.g. "Classical (4…Bf5)"). */
  variationLabel: string;
}

/** One choice the pro made at a fork: the move + how many of his games took it
 *  + a representative game (deepest, then highest-rated opponent) that did. */
export interface ProForkBranch {
  san: string;
  count: number;
  /** Representative game continuing down this branch (for a model-game walk). */
  sample: ProForkGameInput;
}

/** A point on the spine where the PRO's own games diverge — his real choices. */
export interface ProFork {
  /** Half-move index (0-based) at which the fork occurs. */
  ply: number;
  /** The spine SANs to replay to reach this fork (shared history). */
  historySans: string[];
  /** Branches sorted by count desc; ≥2 entries, each with real support. */
  branches: ProForkBranch[];
}

export interface ProOpeningForkTree {
  playerId: string;
  openingId: string;
  /** Human variation label from the games (e.g. "Classical (4…Bf5)"). */
  openingLabel: string;
  /** The side the pro plays in this opening. */
  studentSide: 'white' | 'black';
  /** How many of the pro's games fed the tree. */
  gameCount: number;
  /** The most-played line, move by move, with the count still on the path. */
  spine: Array<{ san: string; count: number }>;
  /** Divergence points on the PRO's moves, deepest-supported first in play order. */
  forks: ProFork[];
}

interface TrieNode {
  count: number;
  /** Games that pass through this node (for representative-game picking). */
  games: ProForkGameInput[];
  children: Map<string, TrieNode>;
}

function sansOf(pgn: string): string[] {
  // pgn is clean space-separated SAN (per ProGameReference contract), but be
  // defensive: strip move numbers / results if any slipped in.
  return pgn
    .replace(/\b\d+\.(\.\.)?/g, ' ')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Deepest game wins; tie broken by higher opponent rating. */
function betterSample(a: ProForkGameInput, b: ProForkGameInput): ProForkGameInput {
  if (b.plyCount !== a.plyCount) return b.plyCount > a.plyCount ? b : a;
  return (b.opponentRating ?? 0) > (a.opponentRating ?? 0) ? b : a;
}

/**
 * Build the fork tree from a pro's games that are ALREADY scoped to one opening
 * (caller filters by playerId + openingId, as loadPlayerGamesForLive does).
 * Returns null when there aren't enough games to aggregate (< 2) or no legal
 * moves parse — the caller then falls back to the single representative-game walk.
 */
export function buildProOpeningForkTree(
  games: readonly ProForkGameInput[],
  opts: { minForkGames?: number; maxPlies?: number } = {},
): ProOpeningForkTree | null {
  const minForkGames = opts.minForkGames ?? 2;
  const maxPlies = opts.maxPlies ?? 24;
  if (games.length < 2) return null;

  // One opening = one pro side. If the corpus is mixed (shouldn't happen per
  // build), take the majority side so parity is consistent.
  const whiteN = games.filter((g) => g.studentSide === 'white').length;
  const studentSide: 'white' | 'black' = whiteN >= games.length - whiteN ? 'white' : 'black';
  const scoped = games.filter((g) => g.studentSide === studentSide);
  if (scoped.length < 2) return null;

  // Build the move trie, validating every game's line with chess.js (G3).
  const root: TrieNode = { count: 0, games: [], children: new Map() };
  for (const g of scoped) {
    const sans = sansOf(g.pgn);
    if (sans.length === 0) continue;
    const chess = new Chess();
    let node = root;
    node.count += 1;
    node.games.push(g);
    for (let i = 0; i < Math.min(sans.length, maxPlies); i += 1) {
      let mv;
      try { mv = chess.move(sans[i]); } catch { break; }
      if (!mv) break;
      const key = mv.san;
      let child = node.children.get(key);
      if (!child) { child = { count: 0, games: [], children: new Map() }; node.children.set(key, child); }
      child.count += 1;
      child.games.push(g);
      node = child;
    }
  }
  if (root.count < 2) return null;

  // The pro moves on even plies when White (0,2,…), odd when Black.
  const proMovesAtPly = (ply: number): boolean => (studentSide === 'white' ? ply % 2 === 0 : ply % 2 === 1);

  // Walk the majority line; record a fork wherever the PRO chose among ≥2
  // real alternatives (each ≥ minForkGames). Stop when the path thins to 1 game.
  const spine: Array<{ san: string; count: number }> = [];
  const forks: ProFork[] = [];
  const history: string[] = [];
  let node = root;
  for (let ply = 0; ply < maxPlies; ply += 1) {
    const children = [...node.children.entries()].sort((a, b) => b[1].count - a[1].count);
    if (children.length === 0) break;
    const [topSan, topChild] = children[0];
    if (topChild.count < 2) break; // path has thinned to a single game — stop the spine

    if (proMovesAtPly(ply)) {
      const realAlts = children.filter(([, c]) => c.count >= minForkGames);
      if (realAlts.length >= 2) {
        forks.push({
          ply,
          historySans: [...history],
          branches: realAlts.map(([san, c]) => ({
            san,
            count: c.count,
            sample: c.games.reduce(betterSample),
          })),
        });
      }
    }
    spine.push({ san: topSan, count: topChild.count });
    history.push(topSan);
    node = topChild;
  }

  if (spine.length === 0) return null;

  return {
    playerId: scoped[0].playerId,
    openingId: scoped[0].openingId,
    openingLabel: scoped[0].variationLabel || scoped[0].openingId,
    studentSide,
    gameCount: scoped.length,
    spine,
    forks,
  };
}
