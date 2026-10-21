import { describe, expect, it, vi, beforeEach } from 'vitest';

const speakComputed = vi.fn().mockResolvedValue(undefined);
vi.mock('./speakComputed', () => ({ speakComputed: (...a: unknown[]) => speakComputed(...a) }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

import { learnVoiceAllows, registerLearnVoiceOwner, speakLearn } from './learnVoice';
import type { VoiceOwner } from './learnTurnDoor';

// FAIL CLOSED (WO-LEARN-FOCUS-01): a line the coach volunteers during a live
// game is dropped while a mission or a focus owns it; what the user asked for,
// a lesson, and the owner's own lines always speak.

describe('the Learn voice door', () => {
  beforeEach(() => speakComputed.mockClear());

  it('open (the classic Learn with nothing owning it): every channel speaks', async () => {
    for (const channel of ['owner', 'asked', 'lesson', 'free-play'] as const) {
      await speakLearn('a line', { channel, forced: true, intent: 'learn' });
    }
    expect(speakComputed).toHaveBeenCalledTimes(4);
  });

  it.each(['mission', 'focus:loose-pieces'] as const)('%s owns the game: a free-play line is dropped, the rest speak', async (owner) => {
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
});
