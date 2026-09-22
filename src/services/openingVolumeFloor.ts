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
 * A3 landed the same day: `homeOpeningRow` is the persisted home opening as a
 * ranked row, and the chat lanes read it FIRST, this ranking second.
 */

import { clearsHomeFloor } from './homeOpening';
import type { HomeOpeningChoiceRecord } from '../types';

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

// THE FLOOR IS `homeOpening.clearsHomeFloor` — one floor for the home pick and
// for every verdict (2026-09-22 reconciliation: this file and `homeOpening.ts`
// were written the same day with different arms; the AND floor won, see there).
export { HOME_OPENING_MIN_GAMES, HOME_OPENING_MIN_SHARE } from './homeOpening';

export function clearsVolumeFloor(games: number, colourGames: number): boolean {
  return clearsHomeFloor(games, colourGames);
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

/** THE HOME OPENING AS A RANKED ROW (A3 landed 2026-09-22). The persisted
 *  choice — the computer's volume pick or the student's own — read FIRST by the
 *  chat lanes; a caller hands in the profile's record so this file stays a
 *  leaf. Never `thin`: a computed pick cleared the floor and a student's pick
 *  is theirs. */
export function homeOpeningRow(colour: 'white' | 'black', choice: HomeOpeningChoiceRecord | null | undefined): RankedOpening | null {
  if (!choice) return null;
  const winRate = Math.round(choice.score * 100);
  return { name: choice.family, color: colour, games: choice.games, winRate, openingId: choice.key, thin: false, deficit: choice.games * (50 - winRate) };
}
