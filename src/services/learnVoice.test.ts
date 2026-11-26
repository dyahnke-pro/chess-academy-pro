import { describe, expect, it, vi, beforeEach } from 'vitest';

const speakComputed = vi.fn().mockResolvedValue(undefined);
vi.mock('./speakComputed', () => ({ speakComputed: (...a: unknown[]) => speakComputed(...a) }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

import { learnVoiceAllows, registerLearnVoiceOwner, speakLearn } from './learnVoice';
import type { VoiceOwner } from './learnTurnDoor';

// LEARN SPEAKS ONLY AFTER A MISTAKE (WO-LEARN-MISTAKES-ONLY, David
// 2026-11-23): the mistake lesson is Learn's one volunteered voice. The old
// turn door's waves and every other volunteered line are held on every game;
// what the user asked for, a lesson, and the owner's own lines always speak.
// Only a mission silences the mistake lesson.

describe('the Learn voice door', () => {
  beforeEach(() => speakComputed.mockClear());

  it('open (nothing owning the game): the door and free-play lines are held, the rest speak', async () => {
    for (const channel of ['owner', 'asked', 'lesson', 'mistake', 'door', 'free-play'] as const) {
      await speakLearn(channel, { channel, forced: true, intent: 'learn' });
    }
    expect(speakComputed.mock.calls.map((c) => c[0])).toEqual(['owner', 'asked', 'lesson', 'mistake']);
  });

  it.each(['open', 'focus:tactics'] as const)('%s: the mistake lesson speaks, the door never does', (owner) => {
    const off = registerLearnVoiceOwner((): VoiceOwner => owner);
    expect(learnVoiceAllows('mistake')).toBe(true);
    expect(learnVoiceAllows('door')).toBe(false);
    expect(learnVoiceAllows('free-play')).toBe(false);
    off();
  });

  it('a mission owns the game: the mistake lesson is held, its own lines speak', async () => {
    const off = registerLearnVoiceOwner((): VoiceOwner => 'mission');
    await speakLearn('the lesson', { channel: 'mistake', forced: true, intent: 'learn-live' });
    expect(speakComputed).not.toHaveBeenCalled();
    await speakLearn('the mission line', { channel: 'owner', forced: true, intent: 'learn' });
    expect(speakComputed.mock.calls.map((c) => c[0])).toEqual(['the mission line']);
    off();
  });
});
