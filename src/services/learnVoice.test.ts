import { describe, expect, it, vi, beforeEach } from 'vitest';

const speakComputed = vi.fn().mockResolvedValue(undefined);
vi.mock('./speakComputed', () => ({ speakComputed: (...a: unknown[]) => speakComputed(...a) }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

import { learnVoiceAllows, registerLearnVoiceOwner, speakLearn } from './learnVoice';
import type { VoiceOwner } from './learnTurnDoor';

// FAIL CLOSED (WO-LEARN-FOCUS-01): a line the coach volunteers OUTSIDE the
// turn door is dropped while a mission or a focus owns the game; what the user
// asked for, a lesson, and the owner's own lines always speak; the door's own
// decision speaks unless a mission owns the game (David 2026-10-30).

describe('the Learn voice door', () => {
  beforeEach(() => speakComputed.mockClear());

  it('open (the classic Learn with nothing owning it): every channel speaks', async () => {
    for (const channel of ['owner', 'asked', 'lesson', 'door', 'free-play'] as const) {
      await speakLearn('a line', { channel, forced: true, intent: 'learn' });
    }
    expect(speakComputed).toHaveBeenCalledTimes(5);
  });

  it.each(['mission', 'focus:tactics'] as const)('%s owns the game: a free-play line is dropped, the rest speak', async (owner) => {
    const off = registerLearnVoiceOwner((): VoiceOwner => owner);
    expect(learnVoiceAllows('free-play')).toBe(false);
    await speakLearn('volunteered', { channel: 'free-play', forced: true, intent: 'learn' });
    expect(speakComputed).not.toHaveBeenCalled();
    await speakLearn('the focus line', { channel: 'owner', forced: true, intent: 'learn' });
    await speakLearn('the answer', { channel: 'asked', forced: true, intent: 'learn' });
    expect(speakComputed.mock.calls.map((c) => c[0])).toEqual(['the focus line', 'the answer']);
    off();
    expect(learnVoiceAllows('free-play')).toBe(true);
  });

  // ONE VOICE (David 2026-10-30): the Learn turn door's own decision speaks in
  // a focus game; only a mission silences it.
  it('the door speaks in a focus game, never under a mission', async () => {
    const offFocus = registerLearnVoiceOwner((): VoiceOwner => 'focus:tactics');
    expect(learnVoiceAllows('door')).toBe(true);
    await speakLearn('the turn', { channel: 'door', forced: true, intent: 'learn-live' });
    expect(speakComputed.mock.calls.map((c) => c[0])).toEqual(['the turn']);
    offFocus();
    speakComputed.mockClear();
    const offMission = registerLearnVoiceOwner((): VoiceOwner => 'mission');
    expect(learnVoiceAllows('door')).toBe(false);
    await speakLearn('the turn', { channel: 'door', forced: true, intent: 'learn-live' });
    expect(speakComputed).not.toHaveBeenCalled();
    offMission();
  });
});
