import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  remember, recall, recallData, recallKind, forget,
  recallSetting, rememberSetting, rememberBest, rememberTrendPoint, MEMORY_KINDS,
} from './studentMemory';

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('studentMemory', () => {
  it('survives close-and-reopen', async () => {
    await remember('watch-beat', 'italian', { beatIndex: 12, beatCount: 20 }, 1000);
    db.close();
    await db.open();
    const row = await recall('watch-beat', 'italian');
    expect(row?.data).toEqual({ beatIndex: 12, beatCount: 20 });
    expect(row?.surface).toBe(MEMORY_KINDS['watch-beat'].surface);
  });

  it('counts, keeps firstAt, moves lastAt', async () => {
    await remember('variation-tab', 'ruy', { tabIndex: 1 }, 100);
    const row = await remember('variation-tab', 'ruy', { tabIndex: 3 }, 200);
    expect(row).toMatchObject({ count: 2, firstAt: 100, lastAt: 200, data: { tabIndex: 3 } });
  });

  it('builds from the previous value', async () => {
    await remember('learn-forks', 'sicilian', { walked: ['a'], chosen: {} });
    await remember('learn-forks', 'sicilian', (p) => ({ walked: [...(p?.walked ?? []), 'b'], chosen: { f1: 'b' } }));
    expect(await recallData('learn-forks', 'sicilian')).toEqual({ walked: ['a', 'b'], chosen: { f1: 'b' } });
  });

  it('recallKind returns one kind, newest first; forget clears', async () => {
    await remember('book-page', 'a', { activeIdx: 0, page: 1 }, 1);
    await remember('book-page', 'b', { activeIdx: 2, page: 0 }, 2);
    await remember('setting', 'x', { value: true }, 3);
    expect((await recallKind('book-page')).map((r) => r.key)).toEqual(['b', 'a']);
    await forget('book-page', 'a');
    expect(await recall('book-page', 'a')).toBeNull();
    await forget('book-page');
    expect(await recallKind('book-page')).toEqual([]);
    expect(await recall('setting', 'x')).not.toBeNull();
  });

  it('settings fall back on a missing or mistyped value', async () => {
    expect(await recallSetting('play-difficulty', 'medium')).toBe('medium');
    await rememberSetting('play-difficulty', 'hard');
    expect(await recallSetting('play-difficulty', 'medium')).toBe('hard');
    expect(await recallSetting('play-difficulty', 3)).toBe(3);
  });

  it('a best only rises', async () => {
    expect(await rememberBest('puzzle-streak', 5)).toBe(5);
    expect(await rememberBest('puzzle-streak', 3)).toBe(5);
    expect(await rememberBest('puzzle-streak', 8)).toBe(8);
  });

  it('a trend keeps one point per day', async () => {
    const d1 = Date.UTC(2026, 9, 1, 10);
    await rememberTrendPoint('puzzle-rating', 1200, d1);
    await rememberTrendPoint('puzzle-rating', 1230, d1 + 3600_000);
    await rememberTrendPoint('puzzle-rating', 1250, d1 + 86_400_000);
    expect((await recallData('trend', 'puzzle-rating'))?.points).toEqual([
      { day: '2026-10-01', value: 1230 }, { day: '2026-10-02', value: 1250 },
    ]);
  });
});

describe('served puzzles', () => {
  it('a surface remembers what it served, newest kept', async () => {
    const { rememberServed, recallServed } = await import('./studentMemory');
    await rememberServed('setup', 'a');
    await rememberServed('setup', 'b');
    await rememberServed('setup', 'a');
    db.close(); await db.open();
    expect([...(await recallServed('setup'))]).toEqual(['b', 'a']);
    expect((await recallServed('endgame')).size).toBe(0);
  });
});
