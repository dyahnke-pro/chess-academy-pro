import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestGameReview } from './gameReviewService';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';

vi.mock('./coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('Great game! You played well in the opening.'),
}));

describe('requestGameReview', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('throws when game not found', async () => {
    await expect(requestGameReview('nonexistent')).rejects.toThrow('not found');
  });

  it('calls getCoachCommentary with game_post_review task', async () => {
    const { getCoachCommentary } = await import('./coachApi');
    const game = buildGameRecord({ id: 'g1', pgn: '1. e4 e5 2. Nf3 Nc6' });
    await db.games.put(game);

    await requestGameReview('g1');

    expect(getCoachCommentary).toHaveBeenCalledWith(
      'game_post_review',
      expect.objectContaining({ pgn: game.pgn }),
      undefined,
    );
  });

  it('stores coach analysis back to the game record', async () => {
    const game = buildGameRecord({ id: 'g2', pgn: '1. d4 d5' });
    await db.games.put(game);

    await requestGameReview('g2');

    const updated = await db.games.get('g2');
    expect(updated?.coachAnalysis).toBe('Great game! You played well in the opening.');
  });

  it('returns the analysis text', async () => {
    const game = buildGameRecord({ id: 'g3', pgn: '1. e4 c5' });
    await db.games.put(game);

    const result = await requestGameReview('g3');
    expect(result).toBe('Great game! You played well in the opening.');
  });

  it('passes onStream callback to getCoachCommentary', async () => {
    const { getCoachCommentary } = await import('./coachApi');
    const game = buildGameRecord({ id: 'g4' });
    await db.games.put(game);

    const onStream = vi.fn();
    await requestGameReview('g4', onStream);

    expect(getCoachCommentary).toHaveBeenCalledWith(
      'game_post_review',
      expect.anything(),
      onStream,
    );
  });
});
