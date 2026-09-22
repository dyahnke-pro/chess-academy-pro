/**
 * openingVolumeFloor — the VOLUME FLOOR every "which opening" verdict must clear
 * (PLAN §A3 / §E2–E3, 2026-09-22). A pure leaf: no db, no store, no engine.
 *
 * WHY. With David's 932 games imported, "what is my weakest opening?" and
 * "what should I learn next?" both named the Elephant Gambit — 0% over THREE
 * games — an opening he will never play, while his Pirc sat at 49% over 63.
 * A win rate over three games is noise; ranking by it is how a coach recommends
 * the wrong thing with total confidence.
 *
 * THE RULE (David: "it should take what I play the most and improve the
 * weaknesses within that"): candidates come only from what the student
 * actually PLAYS — a line leads only when it clears the floor: at least
 * HOME_OPENING_MIN_GAMES games OR HOME_OPENING_MIN_SHARE of that colour's
 * games. Inside that set the verdict ranks by VOLUME × SCORE DEFICIT, so a
 * 63-game 49% line outranks a 12-game 40% one — the coach improves the
 * weakness inside what you play most, not the thinnest sample on file.
 *
 * When NOTHING clears the floor the verdict is still computed (never silent,
 * never invented): the best-supported line is returned with `thin: true` and
 * every consumer MUST say the sample size ("only 3 games") — a 3-game 0% is
 * never called "worst" without that clause.
 *
 * TODO(A3 — WO-HOME-OPENING-01 item 3): `homeOpening(colour)` is the persisted,
 * student-confirmed HOME opening per colour at variation/departure granularity.
 * It does not exist yet; `rankOpeningsByVolume` is the floor + ranking half A3
 * will build on. When A3 lands, `homeOpening` replaces the `null` below and the
 * chat lanes read it first, this ranking second.
 */

export interface OpeningVolumeRow {
  name: string;
  color: 'white' | 'black';
  games: number;
  /** 0–100 win rate over `games`. */
  winRate: number;
  openingId?: string | null;
}

export interface RankedOpening extends OpeningVolumeRow {
  /** TRUE when the row did NOT clear the floor — every consumer must say the
   *  sample size when it speaks a thin row. */
  thin: boolean;
  /** games × (50 − winRate): how much this line costs, weighted by how often
   *  the student is in it. Positive = below par. */
  deficit: number;
}

/** The floor: a line needs this many games OR this share of the colour's games.
 *  The share arm carries its own absolute minimum — on a 14-game account
 *  3 games is 21% and still three games. A share alone would let ONE game
 *  clear on a 20-game account, which is the Elephant Gambit in a smaller
 *  costume. */
export const HOME_OPENING_MIN_GAMES = 10;
export const HOME_OPENING_MIN_SHARE = 0.05;
export const HOME_OPENING_MIN_GAMES_BY_SHARE = 5;

export function clearsVolumeFloor(games: number, colourGames: number): boolean {
  if (games <= 0) return false;
  if (games >= HOME_OPENING_MIN_GAMES) return true;
  return games >= HOME_OPENING_MIN_GAMES_BY_SHARE && colourGames > 0 && games / colourGames >= HOME_OPENING_MIN_SHARE;
}

/**
 * Rank ONE colour's openings for a verdict.
 *   kind 'weakest'   → highest deficit first (most games × lowest score)
 *   kind 'strongest' → most negative deficit first (most games × highest score)
 *   kind 'favorite'  → most games first
 * Rows that clear the floor come first, ranked; when none clears it, the
 * best-supported rows are returned flagged `thin`, ranked the same way.
 * Returns [] only when there are no rows at all.
 */
export function rankOpeningsByVolume(
  rows: ReadonlyArray<OpeningVolumeRow>,
  kind: 'weakest' | 'strongest' | 'favorite',
  colourGames: number,
): RankedOpening[] {
  const scored: RankedOpening[] = rows
    .filter((r) => r.name && r.games > 0)
    .map((r) => ({ ...r, thin: !clearsVolumeFloor(r.games, colourGames), deficit: r.games * (50 - r.winRate) }));
  const order = (a: RankedOpening, b: RankedOpening): number => {
    if (kind === 'favorite') return b.games - a.games || b.winRate - a.winRate;
    if (kind === 'weakest') return b.deficit - a.deficit || b.games - a.games;
    return a.deficit - b.deficit || b.games - a.games;
  };
  const cleared = scored.filter((r) => !r.thin).sort(order);
  if (cleared.length > 0) return cleared;
  // Nothing clears the floor: the thin rows, most-supported first so the
  // caller's "only N games" clause names the best-supported reading.
  return scored.sort((a, b) => b.games - a.games || order(a, b));
}

/** The A3 seam. Null until WO-HOME-OPENING-01 item 3 persists a home opening. */
export function homeOpening(_colour: 'white' | 'black'): RankedOpening | null {
  // TODO(A3): read the persisted, student-confirmed home opening for this colour.
  return null;
}
