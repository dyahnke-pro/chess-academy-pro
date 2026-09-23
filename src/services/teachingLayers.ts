// teachingLayers — WHICH LAYER OF CHESS THIS STUDENT NEEDS TAUGHT FIRST
// (David 2026-09-23: "take those two different teaching styles and algo them
// in … based off of what the user needs").
//
// Read 424 narrated moves of Naroditsky, then 8 low-Elo against 7 high-Elo
// speedruns. The LENGTH does not change with the audience (median ~25–30 words
// a move at both ends). The LAYER does:
//   • SAFETY    — count attackers and defenders, the loose piece, the threat,
//                 the phantom threat, the tactic and its test. What a 700 hears.
//   • PRINCIPLE — develop, castle, trade when ahead, convert, the opening's name.
//   • PLAN      — one goal for the game, targets, prophylaxis, the choice
//                 between two good moves. What a 2200 hears; for them the first
//                 two layers go without saying.
//
// He picks the layer by the audience's rating. We do NOT (the locked grey rule:
// a rating is not evidence of what someone knows, and a new player's rating is
// a guess). We pick it by the STUDENT'S OWN RECORD, the same two halves the heat
// map already keeps:
//   RED   — an open hole in the layer (the weakness spine).
//   GREEN — proven held there (`capabilityProven`), with nothing red.
//   GREY  — no evidence either way. Grey TEACHES; it is ordered bottom-up,
//           because a plan is useless to someone who drops pieces.
//
// Pure: no reads of its own. The surfaces already hold both inputs.
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { WeaknessSignal } from './weaknessSignal';
import { capabilityProven, type CapabilityProfile } from './capabilityEvidence';

export type TeachingLayer = 'safety' | 'principle' | 'plan';
export type LayerStanding = 'red' | 'grey' | 'green';
export type LayerStandings = Record<TeachingLayer, LayerStanding>;

/** Bottom-up: the order a GREY student is taught in. */
export const LAYER_ORDER: readonly TeachingLayer[] = ['safety', 'principle', 'plan'];

/** EVERY coach-side hole has a layer — exhaustive over the closed set, so a new
 *  tag fails to compile until someone decides where it belongs. */
export const TAG_LAYER: Record<MisconceptionTagId, TeachingLayer> = {
  // — the piece you can lose, the move you did not look at —
  'missed-opponents-threat': 'safety',
  'hung-material': 'safety',
  'greedy-pawn-grab': 'safety',
  'poisoned-pawn': 'safety',
  'missed-tactic': 'safety',
  'calculation-depth': 'safety',
  'bad-trade-material': 'safety',
  // — the rules every game rests on —
  'neglected-development': 'principle',
  'king-stuck-center': 'principle',
  'tempo-handed': 'principle',
  'weakened-king-safety': 'principle',
  'capture-toward-centre': 'principle',
  'left-book-early': 'principle',
  'botched-conversion': 'principle',
  'passive-king-endgame': 'principle',
  'passive-rook': 'principle',
  'passed-pawn-neglected': 'principle',
  'misplaced-piece': 'principle',
  // — the plan, the structure, the judgement —
  'no-plan': 'plan',
  'space-conceded': 'plan',
  'created-pawn-weakness': 'plan',
  'overextended-pawn': 'plan',
  'mistimed-pawn-break': 'plan',
  'bad-trade': 'plan',
  'overvalued-attack': 'plan',
  other: 'principle',
};

/** The generated `analysis:*` family is open, so it matches by the prefixes
 *  `weaknessSpine` actually emits. */
const ANALYSIS_LAYER: ReadonlyArray<readonly [RegExp, TeachingLayer]> = [
  [/^analysis:(missed-threat|boardvision|tactic)/, 'safety'],
  [/^analysis:(conversion|endgame-type|book-departure|phase|timetrouble|vs-stronger)/, 'principle'],
  [/^analysis:(structure|transform|weakspot)/, 'plan'],
];

export function layerOfCluster(clusterId: string): TeachingLayer | null {
  if (clusterId in TAG_LAYER) return TAG_LAYER[clusterId as MisconceptionTagId];
  for (const [re, layer] of ANALYSIS_LAYER) if (re.test(clusterId)) return layer;
  return null;
}

/** A hole still open and not marked fixed by its own lifecycle. */
function holeIsOpen(w: WeaknessSignal): boolean {
  return w.openCount > 0 && w.lifecycleStatus !== 'fixed';
}

/** How many proven tags make a layer GREEN. One proof is one skill in the
 *  layer, not the layer; two independent ones is the smallest honest claim
 *  that the student has the layer rather than one habit inside it. */
export const PROVEN_TAGS_FOR_GREEN = 2;

export const ALL_GREY: LayerStandings = { safety: 'grey', principle: 'grey', plan: 'grey' };

/**
 * Where the student stands in each layer, from their own record. Red wins
 * over green: a proof in one skill never hides an open hole beside it.
 */
export function layerStandings(
  weaknesses: readonly WeaknessSignal[],
  capabilities: CapabilityProfile | null | undefined,
): LayerStandings {
  const out: LayerStandings = { ...ALL_GREY };
  const proven: Record<TeachingLayer, number> = { safety: 0, principle: 0, plan: 0 };
  if (capabilities) {
    for (const [tag, e] of capabilities) if (capabilityProven(e)) proven[TAG_LAYER[tag]] += 1;
  }
  for (const layer of LAYER_ORDER) if (proven[layer] >= PROVEN_TAGS_FOR_GREEN) out[layer] = 'green';
  for (const w of weaknesses) {
    const layer = layerOfCluster(w.clusterId);
    if (layer && holeIsOpen(w)) out[layer] = 'red';
  }
  return out;
}

/** The layer this student is taught FIRST: the lowest one not yet green. */
export function leadLayer(s: LayerStandings): TeachingLayer | null {
  for (const layer of LAYER_ORDER) if (s[layer] !== 'green') return layer;
  return null;
}

/** HOW MUCH A FACT'S LAYER RAISES IT, on the same scale as the tie order
 *  (0–100). Every non-green layer keeps the bottom-up order (safety before
 *  principle before plan — a plan is useless to someone who drops pieces), and
 *  a RED layer is raised on top of that. Most real students have an open hole
 *  in every layer, so red must not flatten the order it sits on. Green adds
 *  nothing: it goes quiet instead (`GREEN_QUIET_BELOW` in the door). Bounded
 *  under the stakes floor, so it re-orders comparable facts and never lifts a
 *  plan over a live tactic. */
export function layerBonus(layer: TeachingLayer, s: LayerStandings): number {
  const standing = s[layer];
  if (standing === 'green') return 0;
  const bottomUp = { safety: 20, principle: 10, plan: 0 }[layer];
  return bottomUp + (standing === 'red' ? 40 : 0);
}
