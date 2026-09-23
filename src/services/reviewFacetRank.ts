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
import type { ClauseKind } from './positionFacts';
import { stakeValue, STAKED_FLOOR, type FactStakes } from './factStakes';
import type { TeachingLayer } from './teachingLayers';

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
  | 'plan-now' | 'plan-race' | 'plan-opening' | 'plan-middlegame' | 'plan-line' | 'consequence'
  | 'note' | 'method' | 'refuted' | 'bluff' | 'technique' | 'contrast' | 'timing';

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
  // "Not X, because Y" — the move most players at this level reach for, and
  // the punishment. Below a live threat (that is the board), above the rest.
  refuted: 82,
  // "It looks aggressive but wins nothing" — the phantom threat, named so the
  // student stops paying tempo for it.
  bluff: 81,
  loose: 78,
  count: 76,
  royal: 74,
  sac: 72,
  'sac-why': 71,
  king: 70,
  // THE AUTHORED TEACHING about this exact position (the farmed/voiced corpus
  // — 90% of what the coach has to say, per the corpus doctrine). Ranked ABOVE
  // the board description and BELOW everything forcing: it explains the idea,
  // which matters after the student knows what is hanging and what it cost.
  note: 64,
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
  // The conversion step the board is on — the method, not the task.
  technique: 34,
  // Two good moves, one difference — the plan layer's fine choice.
  contrast: 32,
  // WHEN, not just what — the move a turn early would have lost.
  timing: 31,
  // THE RACE OUTRANKS THE PLAN IT CORRECTS. `plan-now` says "push your passer";
  // `plan-race` says whether that plan arrives in time. Hearing the instruction
  // first and the disqualification second is backwards — the student has already
  // committed to the idea by then.
  'plan-race': 21,
  'plan-now': 20,
  'plan-line': 18,
  'plan-middlegame': 16,
  'plan-opening': 14,
  consequence: 12,
  // THE METHOD CLOSES THE BEAT (2026-09-16). Ranked last on purpose: the board
  // fact comes first, the principle it broke next, and the habit that finds it
  // next time is the takeaway. Leading with the habit preaches before the
  // student has seen the evidence. It only ever fires on moments whose floor is
  // 0 (critical / blunder / must-defend), so a low rank never silences it.
  method: 8,
};

/**
 * TEACHING POINTS FIRST (David 2026-09-23: "board descriptions like 'fights
 * for d5' only speak when they support the teaching point. AGREED! Teaching
 * points first!!").
 *
 * A fact either TEACHES — says what the student should take away: the
 * principle crossed, the cost and the better move, what is forced, the threat,
 * the tactic, the plan, the habit — or DESCRIBES the board around it: defender
 * counts, the eval, what changed, the structure. A description earns its voice
 * only by pointing at the same squares as a teaching point on the same ply
 * (`supportedFacts` in factSelector). On a ply with no teaching point, the
 * move's own reason (`does`) is the one line that speaks.
 *
 * Exhaustive over `FacetTag`: a new tag fails to compile until someone decides
 * which kind of fact it is.
 */
export type FacetRole = 'teach' | 'describe';
export const FACET_ROLE: Record<FacetTag, FacetRole> = {
  principle: 'teach',
  quality: 'teach',
  forced: 'teach',
  threat: 'teach',
  tactic: 'teach',
  trapped: 'teach',
  refuted: 'teach',
  bluff: 'teach',
  loose: 'teach',          // a piece you can lose — actionable, not scenery
  sac: 'teach',
  'sac-why': 'teach',
  method: 'teach',
  opening: 'teach',        // naming the opening is the first move of the arc
  endgame: 'teach',        // the ending's technique, said once
  technique: 'teach',
  contrast: 'teach',
  timing: 'teach',
  'plan-race': 'teach',
  'plan-now': 'teach',
  'plan-opening': 'teach',
  'plan-middlegame': 'teach',
  // What the move itself did — the ONE describe line a quiet ply may keep.
  does: 'describe',
  move: 'describe',
  count: 'describe',
  royal: 'describe',
  king: 'describe',
  note: 'describe',
  delta: 'describe',
  eval: 'describe',
  passer: 'describe',
  rook7: 'describe',
  structure: 'describe',
  badbishop: 'describe',
  complex: 'describe',
  minority: 'describe',
  worst: 'describe',
  verdict: 'describe',
  'opp-target': 'describe',
  'opp-dev': 'describe',
  'plan-line': 'describe', // the long engine line — speaks only when it proves a point
  consequence: 'describe',
};

/**
 * THE SAME RULE FOR THE LIVE SURFACES (David 2026-09-23: "Review should rank
 * the same way as learn! And play! Unified coach!").
 *
 * Learn, phase transitions and "read this position" hand the door clauses from
 * `positionFacts`, not review's `[tag]` facets — so until this table existed,
 * teaching-points-first ran on review alone and the other surfaces spoke every
 * description they computed. Two vocabularies, one rule: exhaustive over
 * `ClauseKind`, so a new clause kind fails to compile until someone decides.
 *
 * `status` TEACHES on purpose: it fires only on a band CHANGE and carries the
 * instruction ("technique from here", "make it as hard as you can"). The two
 * `leans` kinds are the live board's "fights for d5": which piece is doing the
 * work. They speak when a teaching point on the ply names the same squares.
 */
export const CLAUSE_ROLE: Record<ClauseKind, FacetRole> = {
  status: 'teach',
  deliberation: 'teach',
  'latent-danger': 'teach',
  'latent-chance': 'teach',
  'must-defend': 'teach',
  'key-moment': 'teach',
  'opponent-intent': 'teach',
  fundamental: 'teach',
  'structure-plan': 'teach',
  convert: 'teach',
  concept: 'teach',
  method: 'teach',
  bluff: 'teach',
  'student-leans': 'describe',
  'opponent-leans': 'describe',
};

/**
 * ONE VOCABULARY (David 2026-09-23: "Unified coach!"). Review's facts carry a
 * `[tag]`; the live composer's carry a clause kind. The two name sets do not
 * overlap except `method`, so their union IS the one vocabulary — every table
 * below is exhaustive over it, so a new kind on either side fails to compile
 * until someone decides its role and its place in the tie order.
 */
export type FactKind = FacetTag | ClauseKind;

export const FACT_ROLE: Record<FactKind, FacetRole> = { ...FACET_ROLE, ...CLAUSE_ROLE };

/**
 * THE TEACHING LAYER OF EVERY FACT KIND (WO-LAYERS-01, David 2026-09-23) — see
 * `teachingLayers.ts`. SAFETY is what can be lost or won right now; PRINCIPLE
 * the rules every game rests on; PLAN the structure and the judgement. The
 * door orders by the student's standing in each layer and quiets a layer they
 * have PROVEN. Exhaustive over `FactKind`, so a new kind fails to compile
 * until someone decides which layer it teaches.
 */
export const FACT_LAYER: Record<FactKind, TeachingLayer> = {
  // SAFETY — the verdict on the move and what is forcing on the board.
  quality: 'safety', move: 'safety', forced: 'safety', threat: 'safety',
  tactic: 'safety', trapped: 'safety', refuted: 'safety', bluff: 'safety', loose: 'safety', count: 'safety',
  royal: 'safety', sac: 'safety', 'sac-why': 'safety', method: 'safety',
  'must-defend': 'safety', 'latent-danger': 'safety', 'latent-chance': 'safety',
  'key-moment': 'safety', deliberation: 'safety', concept: 'safety',
  // PRINCIPLE — development, the king, the opening, converting.
  principle: 'principle', technique: 'principle', king: 'principle', opening: 'principle', endgame: 'principle',
  does: 'principle', 'opp-dev': 'principle', fundamental: 'principle', convert: 'principle',
  status: 'principle',
  // PLAN — structure, targets, the plan and the long read.
  'plan-now': 'plan', contrast: 'plan', timing: 'plan', 'plan-race': 'plan', 'plan-opening': 'plan', 'plan-middlegame': 'plan',
  'plan-line': 'plan', consequence: 'plan', structure: 'plan', passer: 'plan', rook7: 'plan',
  badbishop: 'plan', complex: 'plan', minority: 'plan', worst: 'plan', 'opp-target': 'plan',
  verdict: 'plan', eval: 'plan', delta: 'plan', note: 'plan',
  'structure-plan': 'plan', 'opponent-intent': 'plan', 'student-leans': 'plan', 'opponent-leans': 'plan',
};

/**
 * THE TIE ORDER — used ONLY where no stakes decide: between facts that carry
 * none (a plan, the structure, the opening's name, the habit), and to break an
 * exact tie. Every fact with real stakes outranks every fact in this table
 * (`STAKED_FLOOR`). Review's scale is kept as is; the live kinds sit where
 * their review siblings sit, so a live and a review fact of the same meaning
 * tie the same way.
 */
const CLAUSE_TIE: Record<ClauseKind, number> = {
  'must-defend': FACET_RANK.threat,
  'latent-danger': FACET_RANK.tactic,
  'latent-chance': FACET_RANK.tactic,
  'key-moment': FACET_RANK.forced,
  deliberation: FACET_RANK.quality,
  status: FACET_RANK.verdict,
  concept: FACET_RANK.tactic,
  'opponent-intent': FACET_RANK['opp-target'],
  fundamental: FACET_RANK.principle,
  'structure-plan': FACET_RANK['plan-now'],
  convert: FACET_RANK.endgame,
  'student-leans': FACET_RANK.worst,
  'opponent-leans': FACET_RANK.worst,
  method: FACET_RANK.method,
  bluff: FACET_RANK.bluff,
};
export const TIE_ORDER: Record<FactKind, number> = { ...FACET_RANK, ...CLAUSE_TIE };

/** The kind of a fact: the surface's declared family first (the live clause
 *  kind), else the `[tag]` prefix. Null for untagged prose (the causal lead). */
export function factKind(text: string, family?: ReadonlyMap<string, string>): FactKind | null {
  const declared = family?.get(text);
  if (declared !== undefined && declared in TIE_ORDER) return declared as FactKind;
  return facetTag(text);
}

/**
 * THE VALUE OF ONE FACT — the whole ordering decision, in one place.
 *   staked:   STAKED_FLOOR + centipawns × 0.8^plies (factStakes.ts)
 *   unstaked: the tie order (0–100)
 *   + the student's own hole on it (raise-only, ≤30) — relevance to THIS student
 * Untagged prose (the causal-chain lead) is the cross-move story and leads.
 */
export function factValue(
  kind: FactKind | null,
  stakes: FactStakes | null | undefined,
  signals: readonly WeaknessSignal[] = [],
  matched?: WeaknessSignal | null,
): number {
  if (kind === null) return STAKED_FLOOR * 10;
  const base = stakeValue(stakes) ?? TIE_ORDER[kind];
  const hole = matched !== undefined
    ? matched
    : (signals.length > 0 ? matchClauseKind(kind in CLAUSE_TIE ? kind : clauseKindForTag(kind as FacetTag), signals) : null);
  return base + (hole ? boostFor(hole) : 0);
}

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
export function facetRank(
  facet: string,
  signals: readonly WeaknessSignal[] = [],
  /** THE HOLE THE SURFACE ALREADY MATCHED for this exact fact, when it has one.
   *
   *  It arrives PRE-MATCHED for the same reason `coachDecider.StudentContext.
   *  momentBoost` does: by the time a fact reaches the ranker it is PROSE, and
   *  joining prose to a weakness would mean scraping a concept back out of a
   *  sentence. The surface still holds the structured source, so the match
   *  belongs there and only its RESULT travels.
   *
   *  This is what lets the `[principle]` facet rank on the EXACT fundamental
   *  the attributor proved (`matchFundamental`) rather than on the coarse
   *  bucket `clauseKindForTag` falls back to. Without it, review could speak
   *  "you left a piece loose again" — a sentence joined exactly — and order it
   *  by whatever unrelated positional hole happened to lead the bucket.
   *
   *  `undefined` = the surface has nothing to say and the tag join decides.
   *  `null` = the surface looked and found NO hole, which is a real answer and
   *  must not fall back to the coarse guess. */
  matched?: WeaknessSignal | null,
): number {
  const tag = facetTag(facet);
  if (tag === null) return 1000;
  const base = FACET_RANK[tag];
  // THE STUDENT TERM. `matchClauseKind` already maps a clause kind to the hole
  // it belongs to; the review facets simply never called it. A fact about a
  // weakness this student keeps falling into outranks an equal fact that is not
  // about them — bounded by `boostFor` (≤30) so it re-orders COMPARABLE facts
  // and never vaults a plan over a blunder.
  const hole = matched !== undefined
    ? matched
    : (signals.length > 0 ? matchClauseKind(clauseKindForTag(tag), signals) : null);
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
    case 'endgame': case 'passer': case 'consequence': case 'plan-race': return 'convert';
    case 'principle': case 'structure': case 'complex': case 'minority':
    case 'badbishop': case 'worst': case 'plan-middlegame': case 'plan-now': return 'structure-plan';
    default: return 'status';
  }
}

/** Order a ply's kept facets most-important-first. Stable within a rank, so the
 *  authoring order still breaks ties. Returns a NEW array; the set is
 *  unchanged — nothing is ever dropped here (G4.5). */
export function rankFacets(
  facets: readonly string[],
  signals: readonly WeaknessSignal[] = [],
  /** Per-fact holes the surface already matched — see `facetRank`'s `matched`.
   *  A fact absent from the map falls through to the tag join, so a surface
   *  that can only pre-match SOME of its facts is not forced to pre-match all. */
  matched?: ReadonlyMap<string, WeaknessSignal | null>,
): string[] {
  return facets
    .map((f, i) => ({ f, i, r: facetRank(f, signals, matched?.has(f) ? matched.get(f) : undefined) }))
    .sort((a, b) => (b.r - a.r) || (a.i - b.i))
    .map((x) => x.f);
}
