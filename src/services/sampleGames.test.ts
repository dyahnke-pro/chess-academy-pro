// D5 / B7(a) (PLAN WO-STANDARD-01, 2026-09-22): the review fixtures are NEVER
// the student's games — not in the cold-start count, not in the rating, not in
// the weakness spine. Each reader is proven by OUTPUT (a count, a source),
// never by the import existing.
//
// Negative control: drop the `isSampleGame` filter in `studentNeedLoader` →
// the cold-start test reads 6 games; drop it in `playerRatingService` → the
// rating test reports 'coach-games'.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { isSampleGame, SAMPLE_GAME_ID_PREFIX } from './sampleGames';
import { SAMPLE_GAMES } from './reviewSampleGames';
import { loadStudentNeedContext, invalidateStudentNeedContext } from './studentNeedLoader';
import { getPlayerRatingEstimate } from './playerRatingService';

const sample = (i: number, over: Parameters<typeof buildGameRecord>[0] = {}) => buildGameRecord({
  id: `${SAMPLE_GAME_ID_PREFIX}fixture-${i}`,
  white: 'Alex', black: 'Stockfish Bot', whiteElo: 1200, blackElo: 1200, result: '1-0',
  source: 'coach', fullyAnalyzed: true, date: `2024-02-0${i + 1}`, ...over,
});

beforeEach(async () => {
  await db.games.clear();
  invalidateStudentNeedContext();
  useAppStore.setState({ activeProfile: buildUserProfile({ name: 'Alex', currentRating: 1200, ratingBaseline: 1200 }) });
});

describe('isSampleGame — one spelling for the fixture test', () => {
  it('every review fixture id satisfies it (the prefix is the contract)', () => {
    expect(SAMPLE_GAMES.length).toBeGreaterThan(0);
    for (const g of SAMPLE_GAMES) expect(isSampleGame(g), g.id).toBe(true);
    expect(isSampleGame({ id: 'coach-1' })).toBe(false);
  });

  it('BLAMES BY STATEMENT: no reader hand-rolls the prefix any more', () => {
    for (const f of [
      'src/services/studentNeedLoader.ts', 'src/services/playerRatingService.ts', 'src/services/weaknessSpine.ts',
      'src/services/weaknessAnalyzer.ts', 'src/components/Dashboard/ReviewLastGameCard.tsx',
      'src/components/Coach/CoachReviewSessionPage.tsx', 'src/services/coachDrillService.ts',
    ]) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} must read the one helper`).toMatch(/isSampleGame\(/);
      expect(src, `${f} hand-rolls the prefix`).not.toMatch(/startsWith\('sample-'\)/);
    }
  });
});

describe('the cold-start count never includes a fixture', () => {
  it('six analysed fixtures and one real game read as ONE game', async () => {
    await db.games.bulkAdd([...Array.from({ length: 6 }, (_, i) => sample(i)), buildGameRecord({ id: 'real-1', source: 'coach', fullyAnalyzed: true })]);
    const ctx = await loadStudentNeedContext({ rating: 1200, sans: ['e4', 'e5'], studentColor: 'white' });
    expect(ctx.gamesPlayed).toBe(1);
  });
});

describe('the rating never moves on a fixture', () => {
  it('five fixtures with source coach do not become the coach-games rung', async () => {
    await db.games.bulkAdd(Array.from({ length: 5 }, (_, i) => sample(i)));
    const estimate = await getPlayerRatingEstimate();
    expect(estimate.source).not.toBe('coach-games');
  });
});
