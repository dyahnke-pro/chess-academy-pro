/**
 * THE GATE THAT MAKES THE DRIFT UNREOPENABLE.
 *
 * The defect (measured on prod, 2026-09-19): the running K=32 ELO over the
 * student's coach games was anchored at `profile.currentRating`, and
 * `calibrateStrength` then wrote its answer back into that same field. Every
 * boot therefore re-scored the SAME games from the number the previous boot
 * had written:
 *
 *     new player, 4W/1D/1L   800 -> 848 -> 884 -> ... -> 990
 *     losing player         1200 -> 1129 -> 1075 -> ... -> 888
 *
 * ...on zero new games. That number sets the teach bar, the tactic-scan depth,
 * the explorer band, the hint tier and the alert multiplier, so a student
 * crossed real behaviour boundaries by opening the app.
 *
 * `docs/plans/2026-09-17-computer-unification.md` §4 diagnosed this and
 * REVERTED the code — and it came back anyway on 2026-09-18 through a change
 * that widened the accepted SOURCE without touching the ANCHOR. A prose
 * warning in a plan doc did not hold. This test is the version that does:
 * it replays one fixed game set through consecutive refreshes and fails if the
 * rating moves at all.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { getPlayerRatingEstimate, DEFAULT_RATING } from './playerRatingService';
import { calibrateStrength } from './strengthCalibrationService';
import type { GameRecord, UserProfile } from '../types';

const PLAYER = 'Player';

/** A fixed set of finished coach games — the student's whole record. Nothing
 *  is added between boots, so every honest estimate must return one number. */
function coachGames(results: Array<GameRecord['result']>, opponentElo = 900): GameRecord[] {
  return results.map((result, i) =>
    buildGameRecord({
      id: `coach-${i}`,
      source: 'coach',
      white: PLAYER,
      black: 'Stockfish Bot',
      whiteElo: 800,
      blackElo: opponentElo,
      result,
      date: `2026-09-0${i + 1}`,
    }),
  );
}

async function seed(games: GameRecord[], profile: UserProfile): Promise<void> {
  await db.games.clear();
  await db.profiles.clear();
  await db.games.bulkAdd(games);
  await db.profiles.add(profile);
  useAppStore.setState({ activeProfile: profile });
}

/** One app boot: re-estimate, persist, rehydrate the store exactly as
 *  `App.tsx` does. Returns the rating the student is now being taught at. */
async function boot(profile: UserProfile): Promise<UserProfile> {
  const { profile: updated } = await calibrateStrength(profile);
  useAppStore.setState({ activeProfile: updated });
  return updated;
}

describe('the adaptive rating is idempotent over a fixed game record', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.setState({ activeProfile: null });
  });

  it('does not move across ten boots when no new game is played (winning player)', async () => {
    const games = coachGames(['1-0', '1-0', '1-0', '1/2-1/2', '0-1', '1-0']);
    let profile = buildUserProfile({ id: 'main', name: PLAYER, currentRating: 800, strengthCalibrated: false });
    await seed(games, profile);

    profile = await boot(profile);
    const afterFirstBoot = profile.currentRating;

    for (let i = 0; i < 9; i += 1) {
      profile = await boot(profile);
      // The whole defect in one assertion: same games, same answer, every time.
      expect(profile.currentRating).toBe(afterFirstBoot);
    }
  });

  it('does not move across ten boots for a LOSING player either', async () => {
    // The drift ran downhill too — the old code pushed a losing student 1200
    // -> 888 by re-counting the same six losses ten times.
    const games = coachGames(['0-1', '0-1', '0-1', '1/2-1/2', '0-1', '0-1'], 1200);
    let profile = buildUserProfile({ id: 'main', name: PLAYER, currentRating: 1200, strengthCalibrated: false });
    await seed(games, profile);

    profile = await boot(profile);
    const afterFirstBoot = profile.currentRating;

    for (let i = 0; i < 9; i += 1) {
      profile = await boot(profile);
      expect(profile.currentRating).toBe(afterFirstBoot);
    }
  });

  it('anchors at the write-once baseline, not at the field it writes', async () => {
    const games = coachGames(['1-0', '1-0', '1-0', '1-0', '1-0', '1-0']);
    let profile = buildUserProfile({ id: 'main', name: PLAYER, currentRating: 800, strengthCalibrated: false });
    await seed(games, profile);

    profile = await boot(profile);
    expect(profile.ratingBaseline).toBe(DEFAULT_RATING);

    // The estimate is a pure function of the baseline + their games, so it is
    // unchanged by whatever `currentRating` happens to hold.
    const before = (await getPlayerRatingEstimate()).rating;
    useAppStore.setState({ activeProfile: { ...profile, currentRating: 2400 } });
    expect((await getPlayerRatingEstimate()).rating).toBe(before);
  });

  it('never rewrites the baseline once it is set', async () => {
    const games = coachGames(['1-0', '1-0', '1-0', '1-0', '1-0', '1-0']);
    let profile = buildUserProfile({
      id: 'main', name: PLAYER, currentRating: 800,
      ratingBaseline: 1000, strengthCalibrated: true,
    });
    await seed(games, profile);

    for (let i = 0; i < 3; i += 1) profile = await boot(profile);
    expect(profile.ratingBaseline).toBe(1000);
  });

  it('a refresh leaves puzzleRating alone — the puzzle SRS owns it', async () => {
    const games = coachGames(['1-0', '1-0', '1-0', '1-0', '1-0', '1-0']);
    let profile = buildUserProfile({
      id: 'main', name: PLAYER, currentRating: 1000, puzzleRating: 1650,
      ratingBaseline: 1200, strengthCalibrated: true,
    });
    await seed(games, profile);

    profile = await boot(profile);
    expect(profile.currentRating).not.toBe(1000);   // play rating did move
    expect(profile.puzzleRating).toBe(1650);        // solving progress did not
  });
});
