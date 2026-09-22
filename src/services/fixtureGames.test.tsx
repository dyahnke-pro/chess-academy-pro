// THE GATE FOR WO-STANDARD-01 D5 / C8 — fixture games never count as the
// student's games.
//
// Observed on prod 2026-09-22: a device that had never played a move read
// 1500 ELO (the London sample's whiteElo, taken as an imported rating) and
// three analysed games (the three amateur samples carry `fullyAnalyzed: true`).
// Reviewing the Vienna sample then wrote its slips into the weakness spine.
//
// NEGATIVE CONTROL, built in: the same three amateur records with the fixture
// marks stripped (no `fixture` flag, no `sample-` id) DO move the rating to
// 1500 and DO count as three games. So each "stays at default" assertion below
// is a measurement, not a vacuous zero — and deleting `isFixtureGame` from any
// reader fails that reader's row (verified by hand on 2026-09-22 by stubbing
// the predicate to `false`: rating 1500 / gamesPlayed 3 / profile non-empty).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test/utils';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildMistakePuzzle } from '../test/factories';
import { SAMPLE_GAMES, seedReviewSamplesIfNeeded } from './reviewSampleGames';
import { getPlayerRatingEstimate, DEFAULT_RATING } from './playerRatingService';
import { invalidateStudentNeedContext, loadStudentNeedContext } from './studentNeedLoader';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { getMisconceptionProfile, logMisconception } from './misconceptionService';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { isFixtureGame, isFixtureGameId, isFixtureDerived } from './fixtureGames';
import { ReviewGameCard } from '../components/Coach/ReviewGameCard';
import type { GameRecord } from '../types';

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { glowBrightness: 100 } }),
}));
vi.mock('./bookDeparturePrecompute', () => ({
  getCachedBookDepartureRows: () => Promise.resolve([]),
}));

const AMATEUR_IDS = ['sample-vienna-amateur-1', 'sample-italian-amateur-2', 'sample-london-amateur-3'];

/** The three amateur samples with every fixture mark removed — what the app
 *  would see if the seeder wrote them as the student's own games. */
async function seedUnmarkedTwins(): Promise<void> {
  const rows = (await db.games.bulkGet(AMATEUR_IDS)).filter((g): g is GameRecord => !!g);
  expect(rows).toHaveLength(3);
  await db.games.clear();
  await db.games.bulkPut(rows.map((g) => {
    const { fixture: _fixture, ...rest } = g;
    return { ...rest, id: g.id.replace(/^sample-/, 'real-') };
  }));
}

describe('fixtureGames — the predicate', () => {
  it('reads the typed flag OR the sample- id, and nothing else', () => {
    expect(isFixtureGame({ id: 'sample-x' })).toBe(true);
    expect(isFixtureGame({ id: 'abc', fixture: true })).toBe(true);
    expect(isFixtureGame({ id: 'abc' })).toBe(false);
    expect(isFixtureGameId(undefined)).toBe(false);
    expect(isFixtureGameId('')).toBe(false);
    expect(isFixtureDerived({ sourceGameId: 'sample-vienna-amateur-1' })).toBe(true);
    expect(isFixtureDerived({ sourceGameId: 'g1' })).toBe(false);
    expect(isFixtureDerived({})).toBe(false);
  });

  it('every seeded sample is a fixture by BOTH marks (a row seeded before the flag is still caught)', async () => {
    await db.games.clear();
    await db.meta.clear();
    await seedReviewSamplesIfNeeded();
    const rows = await db.games.toArray();
    expect(rows.length).toBe(SAMPLE_GAMES.length);
    for (const g of rows) {
      expect(g.fixture).toBe(true);
      expect(isFixtureGameId(g.id)).toBe(true);
    }
  });
});

describe('fixtureGames — the readers (D5)', () => {
  beforeEach(async () => {
    await Promise.all([db.games.clear(), db.meta.clear(), db.mistakePuzzles.clear(), db.misconceptionTags.clear(), db.classifiedTactics.clear()]);
    // No profile: the chain's only remaining rung is `default`, so any other
    // answer can only have come from a game row.
    useAppStore.setState({ activeProfile: null });
    invalidateStudentNeedContext();
    await seedReviewSamplesIfNeeded();
  });

  it('RATING: with only the samples present the chain answers default — and the unmarked twins answer 1500', async () => {
    const withFixtures = await getPlayerRatingEstimate();
    expect(withFixtures.source).toBe('default');
    expect(withFixtures.rating).toBe(DEFAULT_RATING);

    await seedUnmarkedTwins();
    const control = await getPlayerRatingEstimate();
    expect(control.source).toBe('imported-games');
    expect(control.rating).toBe(1500);
  });

  it('COLD START: gamesPlayed is 0 with only the samples — and 3 for the unmarked twins', async () => {
    const q = { rating: DEFAULT_RATING, sans: [], studentColor: 'white' as const };
    const ctx = await loadStudentNeedContext(q);
    expect(ctx.gamesPlayed).toBe(0);

    await seedUnmarkedTwins();
    invalidateStudentNeedContext();
    const control = await loadStudentNeedContext(q);
    expect(control.gamesPlayed).toBe(3);
  });

  it('SPINE: rows derived from a sample game never reach the weakness profile', async () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    await db.mistakePuzzles.add(buildMistakePuzzle({ id: 'mp-fixture', sourceGameId: 'sample-vienna-amateur-1', fen, playerMoveSan: 'Qh5', bestMoveSan: 'Nf3' }));
    await logMisconception({ tag: 'hung-material', source: 'review', fen, playedSan: 'Qh5', bestSan: 'Nf3', sourceGameId: 'sample-vienna-amateur-1' });
    expect(await getMisconceptionProfile()).toEqual([]);
    const profile = await getUnifiedWeaknessProfile();
    expect(profile.filter((w) => w.positions.some((p) => p.from.gameId?.startsWith('sample-')))).toEqual([]);
    expect(profile.find((w) => w.tag === 'hung-material')).toBeUndefined();

    // Control: the same two rows on a real game id DO reach it.
    await Promise.all([db.mistakePuzzles.clear(), db.misconceptionTags.clear()]);
    await db.mistakePuzzles.add(buildMistakePuzzle({ id: 'mp-real', sourceGameId: 'real-1', fen, playerMoveSan: 'Qh5', bestMoveSan: 'Nf3' }));
    await logMisconception({ tag: 'hung-material', source: 'review', fen, playedSan: 'Qh5', bestSan: 'Nf3', sourceGameId: 'real-1' });
    expect((await getMisconceptionProfile()).map((r) => r.tag)).toContain('hung-material');
    expect((await getUnifiedWeaknessProfile()).length).toBeGreaterThan(0);
  });

  it('WRITER: analysing a sample game writes nothing into the student\'s record — the unmarked twin DOES', async () => {
    // The Vienna sample carries two flagged WHITE moves (Qg4, Qxg7). Its seat
    // is declared here so the name heuristic ('You' vs 'Coach' resolves to no
    // seat, which would pass this row vacuously — verified) is not what stops
    // the write: the fixture guard is the ONLY thing between the call and a
    // puzzle row.
    await db.games.update('sample-vienna-amateur-1', { studentSide: 'white' });
    const vienna = await db.games.get('sample-vienna-amateur-1');
    expect(vienna?.annotations?.some((a) => a.color === 'white' && (a.classification === 'blunder' || a.classification === 'mistake'))).toBe(true);
    const r = await autoAnalyzeGameMisconceptions('sample-vienna-amateur-1');
    expect(r).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0 });
    expect(await db.mistakePuzzles.count()).toBe(0);
    expect(await db.misconceptionTags.count()).toBe(0);

    await seedUnmarkedTwins();
    await autoAnalyzeGameMisconceptions('real-vienna-amateur-1');
    expect(await db.mistakePuzzles.count()).toBeGreaterThan(0);
  }, 30_000); // the control half runs the real classifier over the twin's blunders — ~1s alone, more under a parallel file load

  it('LIST: a sample still renders in the review list, labelled Demo; a real game is not', () => {
    const sample = buildGameRecord({ id: 'sample-london-amateur-3', fixture: true, source: 'chesscom', white: 'You', black: 'chesscom_opp', result: '1-0' });
    const { unmount } = render(<ReviewGameCard game={sample} onClick={() => undefined} />);
    expect(screen.getByTestId('review-game-fixture-label')).toHaveTextContent('Demo');
    unmount();
    const real = buildGameRecord({ id: 'real-9', source: 'chesscom', white: 'You', black: 'chesscom_opp', result: '1-0' });
    render(<ReviewGameCard game={real} onClick={() => undefined} />);
    expect(screen.queryByTestId('review-game-fixture-label')).toBeNull();
  });
});
