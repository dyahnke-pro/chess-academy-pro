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

/**
 * TEACH-BOTH grounded caption for a PRO-REP subline (David 2026-07-02). Built
 * ONLY from computed facts — the pro's real record, the engine eval, and (when
 * the practical line is dubious) the engine's best fix — never invented, never
 * naming the player (pro-rep is depersonalized). Returns '' for unremarkable
 * sound lines (selective rule §9). `fix` carries the engine-best SAN when the
 * caption teaches the objective correction alongside the practical line.
 */
export function proSublineFact(s: CourseSubline): { text: string; fix?: string } {
  if (!s.record) return { text: '' }; // not a pro subline
  const games = Math.max(1, s.games);
  const score = Math.round(((s.record.wins + s.record.draws / 2) / games) * 100);
  const tier = frequencyTier(s.pct);
  const faced =
    tier === 'dominant' ? "The move you'll face most here"
      : tier === 'rare' ? 'A rare try here, but one to know'
        : 'A move you can meet here';
  if (s.dubious && s.engineBest) {
    // Practical line the pro rode + the honest engine caveat + the sound fix.
    return {
      text: `${faced}. This practical line scored ${score}% in real games — dangerous at human speed — but the engine prefers ${s.engineBest} as the objectively soundest reply.`,
      fix: s.engineBest,
    };
  }
  // Sound line: speak only when notable (a move you'll mostly face, or a strong
  // practical result), else stay silent so the caption isn't robotic.
  if (tier === 'dominant' || score >= 60) {
    return { text: `${faced}. ${score}% in practice across ${games} game${games === 1 ? '' : 's'}.` };
  }
  return { text: '' };
}
