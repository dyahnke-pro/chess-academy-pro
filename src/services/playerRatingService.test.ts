import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import {
  getPlayerRatingEstimate,
  getPlayerRating,
  DEFAULT_RATING,
} from './playerRatingService';

describe('playerRatingService', () => {
  beforeEach(async () => {
    await db.games.clear();
    useAppStore.setState({ activeProfile: null });
  });

  it('returns DEFAULT_RATING when no data exists', async () => {
    const estimate = await getPlayerRatingEstimate();
    expect(estimate.source).toBe('default');
    expect(estimate.rating).toBe(DEFAULT_RATING);
  });

  it('falls back to profile rating when no games exist', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({ currentRating: 1650 }),
    });
    const estimate = await getPlayerRatingEstimate();
    expect(estimate.source).toBe('profile');
    expect(estimate.rating).toBe(1650);
  });

  it('prefers imported games over profile rating', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({
        currentRating: 1200,
        preferences: { lichessUsername: 'testuser' },
      }),
    });
    await db.games.add(
      buildGameRecord({
        id: 'imp1',
        white: 'testuser',
        black: 'opponent',
        whiteElo: 1750,
        blackElo: 1700,
        source: 'lichess',
        date: '2024-03-01',
      }),
    );

    const estimate = await getPlayerRatingEstimate();
    expect(estimate.source).toBe('imported-games');
    expect(estimate.rating).toBe(1750);
  });

  it('takes the most recent imported game rating', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({
        preferences: { lichessUsername: 'testuser' },
      }),
    });
    await db.games.bulkAdd([
      buildGameRecord({
        id: 'old',
        white: 'testuser',
        whiteElo: 1400,
        source: 'lichess',
        date: '2024-01-01',
      }),
      buildGameRecord({
        id: 'new',
        white: 'testuser',
        whiteElo: 1600,
        source: 'lichess',
        date: '2024-06-01',
      }),
    ]);

    const estimate = await getPlayerRatingEstimate();
    expect(estimate.rating).toBe(1600);
  });

  it('uses the matching side when player name matches black', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({
        preferences: { chessComUsername: 'testuser' },
      }),
    });
    await db.games.add(
      buildGameRecord({
        id: 'g',
        white: 'opponent',
        black: 'testuser',
        whiteElo: 1900,
        blackElo: 1500,
        source: 'chesscom',
      }),
    );

    const estimate = await getPlayerRatingEstimate();
    expect(estimate.rating).toBe(1500);
  });

  it('uses coach games running ELO when ≥5 played and no imported games', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({
        name: 'Alex',
        currentRating: 1200,
      }),
    });

    // 5 coach games, all won by the player as white against engine at 1200.
    // K=32 should push rating up from 1200.
    const games = Array.from({ length: 5 }, (_, i) =>
      buildGameRecord({
        id: `coach-${i}`,
        white: 'Alex',
        black: 'Stockfish Bot',
        whiteElo: 1200,
        blackElo: 1200,
        result: '1-0',
        source: 'coach',
        date: `2024-02-0${i + 1}`,
      }),
    );
    await db.games.bulkAdd(games);

    const estimate = await getPlayerRatingEstimate();
    expect(estimate.source).toBe('coach-games');
    expect(estimate.rating).toBeGreaterThan(1200);
  });

  it('ignores coach games when <5 played and falls back to profile', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({ currentRating: 1500 }),
    });

    const games = Array.from({ length: 3 }, (_, i) =>
      buildGameRecord({
        id: `coach-${i}`,
        white: 'Test Player',
        black: 'Stockfish Bot',
        result: '1-0',
        source: 'coach',
      }),
    );
    await db.games.bulkAdd(games);

    const estimate = await getPlayerRatingEstimate();
    expect(estimate.source).toBe('profile');
    expect(estimate.rating).toBe(1500);
  });

  it('getPlayerRating returns the numeric rating only', async () => {
    useAppStore.setState({
      activeProfile: buildUserProfile({ currentRating: 1333 }),
    });
    const rating = await getPlayerRating();
    expect(rating).toBe(1333);
  });
});
