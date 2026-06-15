import { Chess } from 'chess.js';
import {
  findOpeningByPgnPrefix,
  findSiblingExtensionBranches,
} from './openingDetectionService';
// @ts-expect-error — plain-JS shared metric, no type decls (run by node + vite).
// Single source of the "reaches the middlegame" rule; reused so the course
// trims sublines with the SAME definition the variationMiddlegameDepth gate uses.
import { reachesMiddlegame as reachesMiddlegameImpl } from '../data/variationMiddlegameDepth.shared.mjs';

/** Typed view of the untyped shared metric (keeps eslint's no-unsafe-call happy
 *  while still sourcing the rule from the single shared .mjs). */
const reachesMiddlegame = reachesMiddlegameImpl as (pgn: string) => {
  pass: boolean;
  plies: number;
  wCastle: boolean;
  bCastle: boolean;
  wDev: number;
  bDev: number;
};

// Subline derivation (2026-06-15). A VARIATION is a top-level named branch
// (e.g. the Caro-Kann "Advance"); a SUBLINE is a deeper branch inside it that
// answers an opponent deviation (e.g. within the Advance: 3...c5 vs 3...Bf5).
// Sublines are DB-derived, never invented (G3): we resolve the variation to its
// Lichess-DB canonical name, pull its sibling-extension branches, and trim each
// to the middlegame terminus per the locked subline-depth rule. This is the
// structural floor — the grounded "why" per move (computeWhyFacts) and the
// sound-vs-blunder classification layer on top.

export interface Subline {
  /** The opponent move that triggers this subline (the deviation), in SAN. */
  triggerMove: string;
  /** Short label for the subline (the DB sub-variation name). */
  name: string;
  /** Full canonical DB name (parent + sub-variation). */
  fullName: string;
  /** The subline's moves (SAN), from move 1 through the middlegame terminus:
   *  the variation's spine + the trigger move + continuation, trimmed. */
  moves: string[];
  /** Ply where the variation spine ends and this subline's own moves begin. */
  branchPly: number;
  /** Ply at which the line reaches the middlegame (the terminus we trim to). */
  terminusPly: number;
  /** Whether the trimmed line reaches a middlegame (false = thin DB tail). */
  reachesMiddlegame: boolean;
  /** Sibling-entry count under this branch — a popularity proxy for ordering. */
  count: number;
}

/** Normalize a PGN (which may carry move numbers like "1.e4 c6 2.d4") into a
 *  clean, legality-validated SAN array via chess.js. Returns [] on an
 *  unparseable line rather than throwing — the caller treats that as "no
 *  sublines" instead of crashing a render. */
export function pgnToSans(pgn: string): string[] {
  const stripped = pgn
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.(\.\.)?/, '')) // "1.e4" → "e4", "1...c5" → "c5"
    .filter((t) => t.length > 0 && !/^\d+\.?$/.test(t));
  const chess = new Chess();
  const sans: string[] = [];
  for (const t of stripped) {
    try {
      const r = chess.move(t);
      sans.push(r.san);
    } catch {
      return []; // illegal/unparseable — bail, no sublines
    }
  }
  return sans;
}

/** Earliest ply at which the line first reaches the middlegame, searching only
 *  at/after `minPly`. Returns the full length when it never does (a thin DB
 *  tail) so we still ship the whole grounded line rather than nothing. */
function middlegameTerminus(moves: string[], minPly: number): { ply: number; reached: boolean } {
  for (let k = Math.max(minPly, 1); k <= moves.length; k++) {
    if (reachesMiddlegame(moves.slice(0, k).join(' ')).pass) {
      return { ply: k, reached: true };
    }
  }
  return { ply: moves.length, reached: false };
}

/**
 * Derive the sublines of a variation from the Lichess DB. Resolves the
 * variation's PGN to its canonical DB name, pulls the sibling-extension
 * branches (the opponent's deviations), and trims each to the middlegame
 * terminus. Pure + synchronous; the grounded why-facts and trap classification
 * are computed separately.
 */
export function buildSublines(variation: { name: string; pgn: string }): Subline[] {
  const variationMoves = pgnToSans(variation.pgn);
  if (variationMoves.length === 0) return [];

  // Resolve to the DB canonical name so branch lookup works even when the app's
  // variation label differs from the DB's naming.
  const resolved = findOpeningByPgnPrefix(variationMoves);
  const canonicalName = resolved?.canonicalName ?? variation.name;
  const canonicalPgn = variationMoves.join(' ');

  const branches = findSiblingExtensionBranches(canonicalName, canonicalPgn);
  const branchPly = variationMoves.length;

  const sublines: Subline[] = [];
  for (const branch of branches) {
    const full = [...variationMoves, branch.san, ...branch.extensionMoves];
    // Validate the assembled line is legal end-to-end (the branch pieces come
    // from the DB, but defend against a bad join) and canonicalize SANs.
    const clean = pgnToSans(full.join(' '));
    if (clean.length === 0) continue;
    // Trim to the middlegame terminus — never shorter than the branch point + 1
    // (always include at least the trigger move).
    const { ply, reached } = middlegameTerminus(clean, branchPly + 1);
    sublines.push({
      triggerMove: branch.san,
      name: branch.label,
      fullName: branch.fullName,
      moves: clean.slice(0, ply),
      branchPly,
      terminusPly: ply,
      reachesMiddlegame: reached,
      count: branch.count,
    });
  }
  return sublines;
}

/** Convenience: build the sublines for every variation of an opening, keyed by
 *  variation index (parallel to `opening.variations`). */
export function buildSublinesForOpening(
  opening: { variations?: Array<{ name: string; pgn: string }> | null },
): Map<number, Subline[]> {
  const out = new Map<number, Subline[]>();
  const variations = opening.variations ?? [];
  variations.forEach((v, i) => {
    const subs = buildSublines(v);
    if (subs.length > 0) out.set(i, subs);
  });
  return out;
}
