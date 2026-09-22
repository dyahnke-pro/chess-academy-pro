// sampleGames — the ONE test for "is this one of the review fixtures".
//
// The five fixture games (`reviewSampleGames.ts`) are seeded into `db.games`
// with `source: 'coach'` and `fullyAnalyzed: true` so a fresh install has
// something to click into. That makes them indistinguishable from the
// student's own games to every reader that filters on those fields — and
// three readers were counting them (D5, PLAN WO-STANDARD-01, 2026-09-22): the
// cold-start count in `studentNeedLoader` (a fresh install read as 5 analysed
// games and lost its prior), the running ELO in `playerRatingService` (Morphy's
// opera game moved the student's rating), and the weakness spine (a fixture's
// conversion failures filed as the student's).
//
// Three call sites had already hand-rolled `id.startsWith('sample-')`. A
// convention that has to be remembered at every new reader is the rot the
// duplicated-constant rule bans, so this leaf (zero imports) is the only
// spelling; `reviewSampleGames.test.ts` proves every fixture id satisfies it.

export const SAMPLE_GAME_ID_PREFIX = 'sample-';

/** A review fixture — NEVER the student's game. Not in the cold-start count,
 *  not in the rating, not in the weakness spine (D5). */
export function isSampleGame(g: { id: string }): boolean {
  return g.id.startsWith(SAMPLE_GAME_ID_PREFIX);
}
