import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';

const prebuilt: string[] = [];
vi.mock('./reviewNarrationBuild', () => ({
  prebuildReviewNarration: async (id: string, reason: string) => { prebuilt.push(`${id}:${reason}`); return true; },
}));

import { prepareReview } from './gameAnalysisService';

describe('prepareReview — a game is review-ready before it is opened (review-load trace 2026-10-02)', () => {
  beforeEach(async () => { prebuilt.length = 0; await db.delete(); await db.open(); });

  it('a fully analysed game goes straight to the narration build, with no re-analysis', async () => {
    await db.games.put(buildGameRecord({ id: 'deep', fullyAnalyzed: true, analysisDepth: 16 } as never));
    await prepareReview('deep', 'play-end');
    expect(prebuilt).toEqual(['deep:play-end']);
  });

  it('a finished Play game asks for it, through the one misconception writer', () => {
    const page = readFileSync('src/components/Coach/CoachGamePage.tsx', 'utf8');
    expect(page).toMatch(/autoAnalyzeGameMisconceptions\(gameRecord\.id, undefined, \{[^}]*prepareReview: true[^}]*\}\)/);
    const writer = readFileSync('src/services/autoAnalyzeGame.ts', 'utf8');
    expect(writer).toMatch(/m\.prepareReview\(gameId, 'play-end'\)/);
  });

  it('the import batch uses the same door', () => {
    const svc = readFileSync('src/services/gameAnalysisService.ts', 'utf8');
    expect(svc).toMatch(/await prepareReview\(newest\.id, 'import-batch'\)/);
  });
});
