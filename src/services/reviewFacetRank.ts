// reviewFacetRank — THE IMPORTANCE ORDER for the review's computed facts
// (David 2026-09-16: "The coach is supposed to rank order the narrations and
// that computer decides what is important or not, along with the algo we should
// have built today that tailors the narrations to the user and their
// weaknesses").
//
// `computeMoveFacets` emits ~30 tagged facts per ply in AUTHORING order — the
// order the code happens to push them — and nothing downstream reordered them.
// The hard caps that were removed on 2026-09-16 had been doing a crude version
// of this job: truncating the list was the only thing deciding what a student
// heard first. Take the caps away without an order and the beat becomes an
// unranked pile, which is why this lands with them.
//
// Two terms, the same two the unified-coach standard names:
//   IMPORTANCE — what this fact is worth on any board (the table below).
//   NEED       — what it is worth to THIS student, via their weakness spine.
// A fact's rank is the first plus the second. No ceiling is introduced here:
// ranking changes the ORDER, never the SET (CLAUDE.md G4.5).
import { matchClauseKind, boostFor, type WeaknessSignal } from './weaknessSignal';

/** Every tag `computeMoveFacets` (and the review's own passes) can emit. The
 *  Record below is exhaustive over this union, so a NEW tag fails to compile
 *  until someone decides what it is worth — the drift-proof shape, not a
 *  lookup with a silent default. */
export type FacetTag =
  | 'move' | 'quality' | 'principle' | 'eval' | 'delta' | 'does'
  | 'tactic' | 'threat' | 'loose' | 'count' | 'royal' | 'trapped'
  | 'sac' | 'sac-why' | 'forced' | 'king' | 'rook7' | 'passer'
  | 'badbishop' | 'worst' | 'minority' | 'complex' | 'structure'
  | 'verdict' | 'opening' | 'opp-dev' | 'opp-target' | 'endgame'
  | 'plan-now' | 'plan-opening' | 'plan-middlegame' | 'plan-line' | 'consequence';

/**
 * What a fact is worth on ANY board, highest first. The ordering principle,
 * top to bottom: what just happened and what it cost → what is FORCING right
 * now → the concrete tactical facts → the lasting positional facts → the
 * standing assessment → the plans that follow from it.
 *
 * A student who hears only the first sentence of a beat should hear the thing
 * that most changes what they do next.
 */
export const FACET_RANK: Record<FacetTag, number> = {
  // The move and its verdict — the student's own action, and what it cost.
  principle: 100, // the fundamental it crossed: the lesson, and it LEADS (2026-09-05)
  quality: 95,    // inaccuracy / mistake / blunder + the cost + the better move
  move: 90,       // the mechanics: what it captured, checked, promoted
  // Forcing and losing material beats every quiet consideration.
  forced: 88,
  threat: 85,
  tactic: 84,
  trapped: 80,
  loose: 78,
  count: 76,
  royal: 74,
  sac: 72,
  'sac-why': 71,
  king: 70,
  // What the move DID to the position, and the eval story behind it.
  does: 60,
  delta: 58,
  eval: 56,
  // Lasting positional facts — true past this ply.
  passer: 50,
  rook7: 48,
  structure: 46,
  badbishop: 44,
  complex: 42,
  minority: 40,
  worst: 38,
  // The standing read, then what to do about it.
  verdict: 30,
  opening: 28,
  'opp-target': 26,
  'opp-dev': 24,
  endgame: 22,
  'plan-now': 20,
  'plan-line': 18,
  'plan-middlegame': 16,
  'plan-opening': 14,
  consequence: 12,
};

const TAG_RE = /^\[([a-z0-9-]+)\]/;

/** The tag on a facet string, or null when it carries none. */
export function facetTag(facet: string): FacetTag | null {
  const m = TAG_RE.exec(facet.trim());
  const tag = m ? m[1] : null;
  return tag && tag in FACET_RANK ? (tag as FacetTag) : null;
}

/** A facet's importance, plus this student's need for it. An untagged facet
 *  (the causal-chain lead, which is composed prose) ranks at the top — it is
 *  the cross-move story and always leads when present. */
export function facetRank(facet: string, signals: readonly WeaknessSignal[] = []): number {
  const tag = facetTag(facet);
  if (tag === null) return 1000;
  const base = FACET_RANK[tag];
  // THE STUDENT TERM. `matchClauseKind` already maps a clause kind to the hole
  // it belongs to; the review facets simply never called it. A fact about a
  // weakness this student keeps falling into outranks an equal fact that is not
  // about them — bounded by `boostFor` (≤30) so it re-orders COMPARABLE facts
  // and never vaults a plan over a blunder.
  const hole = signals.length > 0 ? matchClauseKind(clauseKindForTag(tag), signals) : null;
  return base + (hole ? boostFor(hole) : 0);
}

/** Bridge a review facet tag to the ClauseKind vocabulary the weakness matcher
 *  speaks. Only the tags with an HONEST mapping return one — the rest fall to a
 *  kind `matchClauseKind` answers null for, which is the correct "no single
 *  hole owns this fact". */
function clauseKindForTag(tag: FacetTag): string {
  switch (tag) {
    case 'loose': case 'threat': case 'count': case 'royal': case 'trapped': return 'must-defend';
    case 'tactic': case 'sac': case 'sac-why': case 'forced': return 'latent-danger';
    case 'endgame': case 'passer': case 'consequence': return 'convert';
    case 'principle': case 'structure': case 'complex': case 'minority':
    case 'badbishop': case 'worst': case 'plan-middlegame': case 'plan-now': return 'structure-plan';
    default: return 'status';
  }
}

/** Order a ply's kept facets most-important-first. Stable within a rank, so the
 *  authoring order still breaks ties. Returns a NEW array; the set is
 *  unchanged — nothing is ever dropped here (G4.5). */
export function rankFacets(facets: readonly string[], signals: readonly WeaknessSignal[] = []): string[] {
  return facets
    .map((f, i) => ({ f, i, r: facetRank(f, signals) }))
    .sort((a, b) => (b.r - a.r) || (a.i - b.i))
    .map((x) => x.f);
}
