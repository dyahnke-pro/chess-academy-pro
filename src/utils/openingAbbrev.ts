/** Common opening-name abbreviations, expanded so the fuzzy search can
 *  resolve casual input ("Scandi panov" → "scandinavian panov"). The matchers
 *  score on whole tokens, so a shorthand like "scandi" scores nothing against
 *  "Scandinavian Defense". Whole-word only, case-insensitive. Extend as testers
 *  surface more shorthand. (David 2026-07-16.) */
export const OPENING_ABBREV: Record<string, string> = {
  scandi: 'scandinavian',
  najdorff: 'najdorf',
  kid: "king's indian",
  qgd: "queen's gambit declined",
  qga: "queen's gambit accepted",
  caro: 'caro-kann',
  nimzo: 'nimzo-indian',
};

/** Replace whole-word abbreviations in a query with their canonical form. */
export function expandOpeningAbbrev(query: string): string {
  return query.replace(/[a-z']+/gi, (w) => OPENING_ABBREV[w.toLowerCase()] ?? w);
}
