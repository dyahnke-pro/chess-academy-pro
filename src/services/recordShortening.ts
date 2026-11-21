// THE ONE SHORTENER (David 2026-11-21: "Unify the shortener" — "All
// narrations on all platforms need to do this"). How much of a line THIS
// student hears, read off their record, the same on every surface: Learn's
// door, the shared decider (Review, the live composer), the board read
// (puzzles, chat reads) and the lesson composer.
//
// Before this, each door read the record its own way: Review by the fact's
// skill and then its teaching layer, Learn by skill or lane tag only (65 of 90
// lanes could never shorten), the board read and the composer not at all — so
// a 2000 player heard "every extra move with one piece is a move you get for
// free" in Learn exactly as a beginner did.
//
// THE RULE: the fact's own skill first (the heat map: amber → short, green →
// silent); else the teaching layer its KIND belongs to (`FACT_LAYER`, every
// kind has one), green → silent. Every fact has a kind, so every line can
// shorten. Red, grey and absent mean the whole lesson (absent ≠ mastered).
import { fadeLevelOf, fadeLevelsFrom, type FadeLevel, type FadeLevels } from './fadeText';
import { FACT_LAYER, FACT_PROOF, type FactKind } from './reviewFacetRank';
import type { HeatTile } from './heatMap';
import type { LayerStandings, TeachingLayer } from './teachingLayers';

/** The record's key for a teaching layer in the one levels map. */
export const layerKey = (layer: TeachingLayer): string => `layer:${layer}`;

/** The student's levels, skills AND layers, in the one map every door reads.
 *  A green layer reads silent; amber/red/grey layers add nothing. */
export function recordLevels(
  heat: ReadonlyMap<string, HeatTile> | null | undefined,
  layers: LayerStandings | null | undefined,
): Map<string, FadeLevel> {
  const out = fadeLevelsFrom(heat);
  if (layers) for (const [layer, standing] of Object.entries(layers) as Array<[TeachingLayer, string]>) {
    if (standing === 'green') out.set(layerKey(layer), 'silent');
  }
  return out;
}

/** A levels map with the layers added — for a door that holds the two apart
 *  (the shared decider's `fade` and `layers`). */
export function withLayers(levels: FadeLevels | null | undefined, layers: LayerStandings | null | undefined): FadeLevels | null {
  if (!layers || !Object.values(layers).includes('green')) return levels ?? null;
  const out = new Map<string, FadeLevel>();
  if (levels instanceof Map) for (const [k, v] of levels as ReadonlyMap<string, FadeLevel>) out.set(k, v);
  else if (levels) for (const k of levels as ReadonlySet<string>) out.set(k, 'silent');
  for (const [layer, standing] of Object.entries(layers) as Array<[TeachingLayer, string]>) if (standing === 'green') out.set(layerKey(layer), 'silent');
  return out;
}

const isFactKind = (k: string): k is FactKind => k in FACT_LAYER;

/** How short this fact is said to this student: its skill first, else its
 *  kind's layer. Null = the whole line. */
export function shortenLevel(
  levels: FadeLevels | null | undefined,
  skill: string | null | undefined,
  kind: string | null | undefined,
): FadeLevel | null {
  return fadeLevelOf(levels, skill)
    // A NAME is not a lesson (the opening's name, a fork in the road): no
    // layer of teaching the student holds makes it go quiet.
    ?? (kind && isFactKind(kind) && FACT_PROOF[kind] !== 'name' ? fadeLevelOf(levels, layerKey(FACT_LAYER[kind])) : null);
}
