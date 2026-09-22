/**
 * playerRatingService
 * -------------------
 * Computes the player's effective ELO so difficulty-picking surfaces
 * (coach play sessions, adaptive Stockfish strength, middlegame plans)
 * match real playing strength rather than a hand-set preset.
 *
 * Confidence order (highest first):
 *   1. Imported games (Lichess / Chess.com) — most recent rating on the
 *      side matching the stored username.
 *   2. Coach games — if ≥5 have been played, a running K=32 ELO derived
 *      from results against each game's stored opponent rating, anchored at
 *      the profile's WRITE-ONCE `ratingBaseline` so re-running it converges
 *      rather than drifting (see the anchor note at the call site).
 *   3. `activeProfile.currentRating` from the Zustand store.
 *   4. Hard default of 1200 (club-beginner baseline).
 *
 * The returned rating is intentionally a point estimate — downstream
 * callers (e.g. `coachPlaySession.resolveConfig`) apply their own
 * easy/medium/hard offsets.
 */
import { db } from '../db/schema';
import { isSampleGame } from './sampleGames';
import { useAppStore } from '../stores/appStore';
import type { GameRecord } from '../types';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { logAppAudit } from './appAuditor';

/** Re-exported so there is ONE literal in the app — see `DEFAULT_STUDENT_RATING`. */
export const DEFAULT_RATING = DEFAULT_STUDENT_RATING;
const COACH_GAMES_MIN_SAMPLE = 5;
const K_FACTOR = 32;

export type RatingSource =
  | 'imported-games'
  | 'coach-games'
  | 'profile'
  | 'default';

export interface RatingEstimate {
  rating: number;
  source: RatingSource;
  /** Number of games the estimate was derived from (0 for profile/default). */
  sampleSize: number;
}

/** Parse the game date; falls back to epoch for invalid strings. */
function parseDate(date: string): number {
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Pick the player's ELO for a single imported game by matching username
 * against the white/black player. Returns null when the username doesn't
 * match either side (likely a PGN import with no username hint).
 */
function ratingFromImportedGame(
  game: GameRecord,
  username: string | undefined,
): number | null {
  if (!username) {
    // No username hint — fall back to whichever side has a rating.
    return game.whiteElo ?? game.blackElo ?? null;
  }
  const lower = username.toLowerCase();
  if (game.white.toLowerCase() === lower) return game.whiteElo;
  if (game.black.toLowerCase() === lower) return game.blackElo;
  return null;
}

/**
 * Running ELO from coach games using the same K=32 system as the
 * puzzle rating engine. Coach game records (see CoachGamePage) store
 * the player's name on one side and "Stockfish Bot" on the other,
 * with each side's ELO written to white/blackElo. We use the player
 * name to identify sides.
 */
function runningEloFromCoachGames(
  games: GameRecord[],
  startingRating: number,
  playerName: string | undefined,
): number {
  let rating = startingRating;
  const lowerName = playerName?.toLowerCase();
  const sorted = games
    .slice()
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  for (const g of sorted) {
    // Identify which side was the player. Fall back to 'white' if we
    // can't match by name (matches CoachGamePage's default orientation).
    let playerSide: 'white' | 'black' = 'white';
    if (lowerName && g.black.toLowerCase() === lowerName) {
      playerSide = 'black';
    } else if (lowerName && g.white.toLowerCase() === lowerName) {
      playerSide = 'white';
    } else {
      // No name match — skip this game rather than guess wrong.
      continue;
    }

    const opponentElo = playerSide === 'white' ? g.blackElo : g.whiteElo;
    if (opponentElo === null) continue;

    const score = scoreFromResult(g.result, playerSide);
    if (score === null) continue;

    const expected = 1 / (1 + Math.pow(10, (opponentElo - rating) / 400));
    rating = rating + K_FACTOR * (score - expected);
  }

  return Math.round(rating);
}

function scoreFromResult(
  result: GameRecord['result'],
  playerSide: 'white' | 'black',
): number | null {
  if (result === '1/2-1/2') return 0.5;
  if (result === '1-0') return playerSide === 'white' ? 1 : 0;
  if (result === '0-1') return playerSide === 'black' ? 1 : 0;
  return null;
}

/**
 * Compute the player's effective ELO with source metadata. Async because
 * it reads from Dexie. Safe to call on session start — result is a point
 * estimate, not cached, but each call is a single indexed query.
 */
/** Emit WHICH RUNG OF THE CONFIDENCE CHAIN answered, and with what.
 *
 *  This is the algo-audit rule applied to the strength estimator: the rating
 *  is a chain of four sources and only its OUTPUT was ever visible, so a chain
 *  that silently always lands on `default` — the exact failure CLAUDE.md
 *  records as still open, `getPlayerRating` having zero production callers —
 *  looks identical to one that works. Once per boot (`calibrateStrength`), so
 *  the volume is a row per session, not per ply. */
function reportEstimate(e: RatingEstimate): RatingEstimate {
  void logAppAudit({
    kind: 'player-rating-estimated',
    category: 'subsystem',
    source: 'playerRatingService.getPlayerRatingEstimate',
    summary: `${e.rating} from ${e.source} (n=${e.sampleSize})`,
    details: JSON.stringify(e),
  });
  return e;
}

export async function getPlayerRatingEstimate(): Promise<RatingEstimate> {
  const profile = useAppStore.getState().activeProfile;
  const profileRating = profile?.currentRating;
  const username =
    profile?.preferences.chessComUsername ??
    profile?.preferences.lichessUsername;

  // 1. Imported games — highest confidence. Take most recent game where
  //    we can identify the player's side.
  const importedGames = await db.games
    .where('source')
    .anyOf('lichess', 'chesscom')
    .toArray();

  if (importedGames.length > 0) {
    const sorted = importedGames
      .slice()
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
    for (const game of sorted) {
      const rating = ratingFromImportedGame(game, username);
      if (rating !== null && rating > 0) {
        return reportEstimate({
          rating,
          source: 'imported-games',
          sampleSize: importedGames.length,
        });
      }
    }
  }

  // 2. Coach games — running K=32 ELO once we have enough data.
  //
  // 🔒 THE ANCHOR IS `ratingBaseline`, NEVER `currentRating`. It used to start
  // from `currentRating` — the field `calibrateStrength` then OVERWRITES with
  // this function's own answer — so the estimate was its own input and the same
  // games moved the number on every boot (800 -> 990 over ten opens; a losing
  // player 1200 -> 888). Anchored at a baseline written once, this is a pure
  // function of THEIR games: same games in, same rating out, forever.
  // D5 (B7a): the review fixtures are seeded with `source: 'coach'` — Morphy's
  // opera game must not move the student's rating.
  const coachGames = (await db.games.where('source').equals('coach').toArray()).filter((g) => !isSampleGame(g));
  if (coachGames.length >= COACH_GAMES_MIN_SAMPLE) {
    const starting = profile?.ratingBaseline ?? DEFAULT_RATING;
    const rating = runningEloFromCoachGames(coachGames, starting, profile?.name);
    return reportEstimate({
      rating,
      source: 'coach-games',
      sampleSize: coachGames.length,
    });
  }

  // 3. Profile.
  if (typeof profileRating === 'number' && profileRating > 0) {
    return reportEstimate({ rating: profileRating, source: 'profile', sampleSize: 0 });
  }

  // 4. Default.
  return reportEstimate({ rating: DEFAULT_RATING, source: 'default', sampleSize: 0 });
}

/** Convenience wrapper returning only the numeric rating. */
export async function getPlayerRating(): Promise<number> {
  const estimate = await getPlayerRatingEstimate();
  return estimate.rating;
}
