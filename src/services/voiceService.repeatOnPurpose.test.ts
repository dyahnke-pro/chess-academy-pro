// A LINE THAT REPEATS BY DESIGN (WO-MISSIONS-01). The voice's say-once guard
// drops a sentence it spoke moments ago — right for narration, wrong for a
// Learn mission's miss phrase, which is the same words every miss on purpose.
// The missions audit caught it: the second "One move per piece…" was dropped
// as "already said this line 5s ago". `repeatOnPurpose` skips that one guard.
import { describe, it, expect, vi } from 'vitest';

const { speakForced } = vi.hoisted(() => ({ speakForced: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./voiceService', async (orig) => ({ ...(await orig<typeof import('./voiceService')>()), voiceService: { speakForced, speak: vi.fn() } }));
vi.mock('./coachApi', () => ({ voiceFacts: (t: string) => Promise.resolve(t) }));

import { sayOnceBlocks } from './voiceService';
import { speakComputed } from './speakComputed';

describe('the say-once guard', () => {
  it('drops a line spoken inside the window, and keeps one spoken outside it', () => {
    expect(sayOnceBlocks(1_000, 6_000, 90_000, false)).toBe(true);
    expect(sayOnceBlocks(1_000, 100_000, 90_000, false)).toBe(false);
    expect(sayOnceBlocks(undefined, 6_000, 90_000, false)).toBe(false);
  });
  it('never drops a line that repeats on purpose', () => {
    expect(sayOnceBlocks(1_000, 6_000, 90_000, true)).toBe(false);
  });
});

describe('speakComputed hands the flag to the voice', () => {
  it('a mission line reaches speakForced with repeatOnPurpose; an ordinary one without it', async () => {
    await speakComputed('One move per piece — bring out a new one.', { forced: true, intent: 'learn', repeatOnPurpose: true });
    expect(speakForced).toHaveBeenLastCalledWith('One move per piece — bring out a new one.', { repeatOnPurpose: true });
    await speakComputed('Their knight eyes d4.', { forced: true, intent: 'learn' });
    expect(speakForced).toHaveBeenLastCalledWith('Their knight eyes d4.', undefined);
  });
});
