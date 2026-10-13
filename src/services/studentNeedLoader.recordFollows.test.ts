import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { invalidateStudentNeedContext, loadStudentNeedBase } from './studentNeedLoader';

// chesscom-1040709576 (2026-10-13): the memo was keyed on the game COUNT, so a
// game finishing its analysis (count unchanged) left `gamesPlayed` stale for
// five minutes — the review read a record the student no longer had.
describe('the need memo follows the record, not the count', () => {
  beforeEach(async () => {
    invalidateStudentNeedContext();
    await db.delete();
    await db.open();
  });

  it('a game finishing analysis reaches the next read', async () => {
    const g = buildGameRecord({ white: 'alex', black: 'x', source: 'lichess', fullyAnalyzed: false });
    await db.games.put(g);
    const q = { rating: 1500, studentColor: 'white' as const, openingId: null, eco: null };
    const before = await loadStudentNeedBase(q);
    expect(before?.gamesPlayed).toBe(0);
    await db.games.update(g.id, { fullyAnalyzed: true });
    const after = await loadStudentNeedBase(q);
    expect(after?.gamesPlayed).toBe(1);
  });
});
