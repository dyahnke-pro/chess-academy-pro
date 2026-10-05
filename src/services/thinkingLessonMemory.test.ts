import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getThinkingLessonMemory, rememberLessonBoard, resumeFor, saveLessonResume, seenFor } from './thinkingLessonMemory';
import { boardIdentity } from './thinkingPositions';

const F = '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1';

describe('thinkingLessonMemory', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('starts empty', async () => {
    expect(await getThinkingLessonMemory()).toEqual({ seen: {}, last: null, resume: null });
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
    expect(await getThinkingLessonMemory()).toEqual({ seen: {}, last: null, resume: null });
  });

  it('keeps where a stopped lesson was, for the same step only, and clears it when one finishes', async () => {
    await saveLessonResume({ step: 'am-i-safe', stages: ['show', 'guide', 'guide', 'solo'], cursor: 2 }, '2026-10-05T09:00:00Z');
    let mem = await getThinkingLessonMemory();
    expect(resumeFor(mem, 'am-i-safe')).toEqual({ step: 'am-i-safe', stages: ['show', 'guide', 'guide', 'solo'], cursor: 2, at: '2026-10-05T09:00:00Z' });
    expect(resumeFor(mem, 'their-targets')).toBeNull();
    await saveLessonResume(null, '2026-10-05T09:05:00Z');
    mem = await getThinkingLessonMemory();
    expect(resumeFor(mem, 'am-i-safe')).toBeNull();
  });

  it('back-to-back writes never overwrite each other', async () => {
    await Promise.all([
      rememberLessonBoard('am-i-safe', F, 't1'),
      saveLessonResume({ step: 'am-i-safe', stages: ['guide', 'solo'], cursor: 1 }, 't2'),
    ]);
    const mem = await getThinkingLessonMemory();
    expect(seenFor(mem, 'am-i-safe').size).toBe(1);
    expect(mem.resume?.cursor).toBe(1);
  });

  it('a resume past the end of its plan, or with an unknown stage, is ignored', async () => {
    await saveLessonResume({ step: 'am-i-safe', stages: ['solo'], cursor: 1 }, 't');
    expect(resumeFor(await getThinkingLessonMemory(), 'am-i-safe')).toBeNull();
    await db.meta.put({ key: 'thinking-lesson-memory.v1', value: JSON.stringify({ seen: {}, last: null, resume: { step: 'x', stages: ['nope'], cursor: 0 } }) });
    expect((await getThinkingLessonMemory()).resume).toBeNull();
  });
});
