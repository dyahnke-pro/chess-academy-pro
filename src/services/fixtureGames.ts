// fixtureGames — ONE predicate for "this game is a demo fixture, not the
// student's" (WO-STANDARD-01 D5, 2026-09-22: "Fixture games (`sample-*`)
// NEVER count as the student's games: not in the cold-start count, not in the
// rating, not in the weakness spine").
//
// WHY A LEAF. The review page seeds five sample games so a fresh install has
// something to click into. Three of them are AMATEUR games written as if the
// student played them (`white: 'You'`, source 'coach' / 'lichess' / 'chesscom',
// Elo 1450–1500). Every reader of `db.games` that models the student took them
// at face value: the rating chain read the London sample's 1500 as an imported
// rating (1200 → 1500 on a device that had never played a move), the cold-start
// count read `fullyAnalyzed: true` as three analysed games, and a review of the
// Vienna sample wrote slips into the weakness spine under the student's name.
//
// Two ways to say "fixture", both honoured, because both exist on live devices:
//  - the `fixture: true` field the seeder now writes (the typed answer);
//  - the `sample-` id prefix, which every fixture has carried since the seeder
//    was written, so a row seeded BEFORE the field existed is still caught.
// Zero imports so any reader — a leaf fact-computer, a Dexie service, a
// component — can ask without dragging in the db.

export const FIXTURE_GAME_ID_PREFIX = 'sample-';

/** True when the id names a seeded fixture game (or a row derived from one —
 *  a mistake puzzle, a misconception tag, a classified tactic — carries the
 *  same id in `sourceGameId`). Null/undefined/'' is not a fixture. */
export function isFixtureGameId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(FIXTURE_GAME_ID_PREFIX);
}

/** True when the game record is a seeded fixture — by its typed flag or by its
 *  id. A record with neither is the student's. */
export function isFixtureGame(game: { id: string; fixture?: boolean }): boolean {
  return game.fixture === true || isFixtureGameId(game.id);
}

/** True when a derived row (`sourceGameId`) belongs to a fixture game. */
export function isFixtureDerived(row: { sourceGameId?: string | null }): boolean {
  return isFixtureGameId(row.sourceGameId);
}
