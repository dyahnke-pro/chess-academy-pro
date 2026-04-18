/**
 * openingAliases
 * --------------
 * Short chess-opening abbreviations the student types (or says) that
 * need expanding to a canonical name before anything downstream can
 * resolve them against the openings trie / Lichess explorer / etc.
 *
 * Single source of truth — previously lived only in
 * inGameChatIntent.ts, but parseCoachIntent needs the same expansion
 * for "play the kid against me" to route into the King's Indian
 * Defense instead of an empty `subject=kid` lookup.
 */

export const OPENING_ALIASES: Record<string, string> = {
  kid: "King's Indian Defense",
  kia: "King's Indian Attack",
  qgd: "Queen's Gambit Declined",
  qga: "Queen's Gambit Accepted",
  qg: "Queen's Gambit",
  qid: "Queen's Indian Defense",
  'ruy lopez': 'Ruy Lopez',
  najdorf: 'Sicilian Defense: Najdorf Variation',
  dragon: 'Sicilian Defense: Dragon Variation',
  scheveningen: 'Sicilian Defense: Scheveningen Variation',
  sveshnikov: 'Sicilian Defense: Sveshnikov Variation',
  taimanov: 'Sicilian Defense: Taimanov Variation',
  grunfeld: 'Gr\u00fcnfeld Defense',
  'gr\u00fcnfeld': 'Gr\u00fcnfeld Defense',
  benoni: 'Benoni Defense',
  nimzo: 'Nimzo-Indian Defense',
  caro: 'Caro-Kann Defense',
  'caro-kann': 'Caro-Kann Defense',
  french: 'French Defense',
  sicilian: 'Sicilian Defense',
  italian: 'Italian Game',
  london: 'London System',
  scandi: 'Scandinavian Defense',
  scandinavian: 'Scandinavian Defense',
  pirc: 'Pirc Defense',
  alekhine: 'Alekhine Defense',
  "king's indian": "King's Indian Defense",
  "kings indian": "King's Indian Defense",
  "queen's indian": "Queen's Indian Defense",
  "queens indian": "Queen's Indian Defense",
};

/**
 * Expand an opening-name alias ("kid" → "King's Indian Defense"). If
 * no alias matches, return the input unchanged so downstream fuzzy
 * matching can still try — we'd rather over-preserve a phrase than
 * drop it.
 */
export function expandOpeningAlias(subject: string): string {
  const key = subject
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z'\u00fc\u00e4\u00f6\s-]/g, '')
    .replace(/\s+/g, ' ');
  return OPENING_ALIASES[key] ?? subject;
}
