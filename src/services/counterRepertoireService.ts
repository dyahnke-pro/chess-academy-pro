/**
 * counterRepertoireService — resolves "what should I play against X?" to the
 * app's curated counter-repertoire recommendations (David 2026-07-15).
 *
 * The map lives in `src/data/counter-repertoire.json`: opponent-opening
 * families → 1-2 REAL app openings (Naroditsky pro-rep + anti-openings), each
 * tagged with styleTags (gameStyleClassifier vocabulary) and, where the real
 * game corpus supports it, an honest anonymous stat ({games, scorePct}).
 *
 * G0: this module only LOOKS UP curated data — no chess content is decided at
 * runtime, and the recommendation phrasing (assembleCounterRepertoireAnswer)
 * never names a pro.
 */
import counterRepertoireData from '../data/counter-repertoire.json';

export interface CounterRecommendation {
  openingId: string;
  name: string;
  styleTags: ReadonlyArray<string>;
  stat?: { games: number; scorePct: number } | null;
}

export interface CounterFamily {
  key: string;
  displayName: string;
  studentSide: 'white' | 'black';
  aliases: ReadonlyArray<string>;
  recommendations: ReadonlyArray<CounterRecommendation>;
}

interface CounterRepertoireFile {
  families: CounterFamily[];
}

const FAMILIES: ReadonlyArray<CounterFamily> =
  (counterRepertoireData as unknown as CounterRepertoireFile).families;

export function getCounterFamilies(): ReadonlyArray<CounterFamily> {
  return FAMILIES;
}

/** Alias → family, longest-alias-first so a specific ask ("against the
 *  alapin") beats a broader family whose alias is a substring. Matching is
 *  case-insensitive substring over the (already de-filled) question text. */
const ALIAS_INDEX: ReadonlyArray<{ alias: string; family: CounterFamily }> = FAMILIES
  .flatMap((family) => family.aliases.map((alias) => ({ alias: alias.toLowerCase(), family })))
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * matchOpponentOpening — find the counter-repertoire family the question names.
 * Returns null when no family matches (the caller answers honestly that no
 * prepared recommendation exists — never invents one).
 */
export function matchOpponentOpening(text: string | undefined | null): CounterFamily | null {
  if (!text) return null;
  const t = ` ${text.toLowerCase()} `;
  for (const { alias, family } of ALIAS_INDEX) {
    if (t.includes(alias)) return family;
  }
  return null;
}
