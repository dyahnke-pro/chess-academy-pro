import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getThinkingLessonMemory, rememberLessonBoard, seenFor } from './thinkingLessonMemory';
import { boardIdentity } from './thinkingPositions';

const F = '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1';

describe('thinkingLessonMemory', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('starts empty', async () => {
    expect(await getThinkingLessonMemory()).toEqual({ seen: {}, last: null });
  });

  it('remembers boards per step, once each, and where the lesson stopped', async () => {
    await rememberLessonBoard('their-targets', F, '2026-10-04T10:00:00Z');
    await rememberLessonBoard('their-targets', F.replace(' 0 1', ' 3 7'), '2026-10-04T10:01:00Z');
    const mem = await getThinkingLessonMemory();
    expect(seenFor(mem, 'their-targets')).toEqual(new Set([boardIdentity(F)]));
    expect(seenFor(mem, 'am-i-safe').size).toBe(0);
    expect(mem.last).toEqual({ step: 'their-targets', at: '2026-10-04T10:01:00Z' });
  });

  it('survives a corrupt record', async () => {
    await db.meta.put({ key: 'thinking-lesson-memory.v1', value: '{nope' });
    expect(await getThinkingLessonMemory()).toEqual({ seen: {}, last: null });
  });
});
