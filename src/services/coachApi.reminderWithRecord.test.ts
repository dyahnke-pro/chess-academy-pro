// "What mistake do I keep making?" with no analyzed imports but a live record
// (Learn walk 2026-10-01): the coach answered "I can't read the mistakes you
// make" in the same game that later cited the student's repeated slip.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { reminderWithRecord } from './coachApi';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const NONE = { totalGames: 1, analyzedGameCount: 0 };

describe('the live record answers before the upload reminder', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('names the recurring slip the coach recorded', async () => {
    for (const id of ['a', 'b']) {
      await db.misconceptionTags.add({ id, tag: 'hung-material', source: 'auto-analysis', createdAt: Date.now(), fen: FEN, status: 'open', masteryHits: 0, dueAt: Date.now(), counted: true });
    }
    const text = await reminderWithRecord('the mistakes you make', NONE);
    expect(text).toMatch(/keeps coming back/);
    expect(text).toMatch(/2 times/);
    expect(text).not.toMatch(/can't read/);
  });

  it('with no recurring slip it is the plain reminder', async () => {
    const text = await reminderWithRecord('the mistakes you make', NONE);
    expect(text).toMatch(/none are analyzed yet/);
  });

  it('other topics are untouched', async () => {
    for (const id of ['a', 'b']) {
      await db.misconceptionTags.add({ id, tag: 'hung-material', source: 'auto-analysis', createdAt: Date.now(), fen: FEN, status: 'open', masteryHits: 0, dueAt: Date.now(), counted: true });
    }
    expect(await reminderWithRecord('your accuracy', NONE)).toMatch(/none are analyzed yet/);
  });
});
