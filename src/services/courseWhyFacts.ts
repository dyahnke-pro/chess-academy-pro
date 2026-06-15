import type { CourseSubline } from './openingCourse';

// Stage-1 of the why pipeline (David 2026-06-15): the engine/data COMPUTE the
// grounded why-facts; a human authors the narration FROM them later. v1 is the
// FREQUENCY fact (eval + concept layer to come). It also encodes the SELECTIVE
// rule — surface the %/count only when it adds value (a dominant try or a rare-
// but-real one), never on every move (robotic). A `text` of '' = say nothing.

export type FrequencyTier = 'dominant' | 'common' | 'minor' | 'rare';

export interface WhyFact {
  /** Voice-ready, grounded reason — or '' when the frequency isn't worth voicing
   *  (the selective rule). Never invented: derived from master-game counts. */
  text: string;
  /** Share of master games at this node (0..100). */
  pct: number;
  /** Master games behind it. */
  games: number;
  tier: FrequencyTier;
}

/** Classify a move's share of master play at its node. */
export function frequencyTier(pct: number): FrequencyTier {
  if (pct >= 50) return 'dominant';
  if (pct >= 20) return 'common';
  if (pct >= 8) return 'minor';
  return 'rare';
}

/** A few stems so a course doesn't repeat the same sentence (voice rule §9). */
const DOMINANT_STEMS = [
  'By far the most common try here',
  "What you'll face most of the time",
  'The main move at this point',
];
const RARE_STEMS = [
  'A rare sideline',
  "You won't see this often",
  'An offbeat try',
];

/**
 * The grounded frequency why-fact for a deviation. Only DOMINANT and RARE tiers
 * get spoken text — those add value (what you'll mostly face / a surprise to be
 * ready for). COMMON / MINOR return '' so the narration isn't robotic. `seed`
 * (e.g. the ply or an index) rotates the stem so repeats vary.
 */
export function frequencyWhyFact(pct: number, games: number, seed = 0): WhyFact {
  const tier = frequencyTier(pct);
  let text = '';
  if (tier === 'dominant') {
    text = `${DOMINANT_STEMS[seed % DOMINANT_STEMS.length]} — about ${pct}% of master games.`;
  } else if (tier === 'rare') {
    text = `${RARE_STEMS[seed % RARE_STEMS.length]} — only about ${pct}% — but worth knowing.`;
  }
  return { text, pct, games, tier };
}

/** Convenience: the why-fact for a course subline. */
export function sublineWhyFact(subline: CourseSubline, seed = 0): WhyFact {
  return frequencyWhyFact(subline.pct, subline.games, seed);
}
