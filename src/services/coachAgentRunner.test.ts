import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectNarrationToggle,
  applyNarrationToggle,
} from './coachAgentRunner';
import {
  useCoachSessionStore,
  __resetCoachSessionStoreForTests,
} from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';

vi.mock('./voiceService', () => ({
  voiceService: {
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  },
}));

describe('detectNarrationToggle', () => {
  it('matches common enable phrasings', () => {
    const cases = [
      'narrate my game',
      'narrate while we play',
      "can you narrate as we play",
      'commentate on each move',
      'commentate during the game',
      'speak during the game',
      'announce each move',
      'talk through the game',
      'turn on the voice',
    ];
    for (const s of cases) {
      expect(detectNarrationToggle(s)).toEqual({ enable: true });
    }
  });

  it('matches disable phrasings', () => {
    const cases = [
      'stop narrating',
      'stop commentary',
      'turn off narration',
      'mute the voice',
      'silence the commentary',
      'shut up please',
      'no more narration',
    ];
    for (const s of cases) {
      expect(detectNarrationToggle(s)).toEqual({ enable: false });
    }
  });

  it('ignores unrelated chat', () => {
    const cases = [
      'what is the best move?',
      'play the KIA against me',
      'review my last game',
      'can you explain this position',
    ];
    for (const s of cases) {
      expect(detectNarrationToggle(s)).toBeNull();
    }
  });
});

describe('applyNarrationToggle', () => {
  beforeEach(() => {
    __resetCoachSessionStoreForTests();
    if (useAppStore.getState().coachVoiceOn) {
      useAppStore.getState().toggleCoachVoice();
    }
  });

  it('enabling flips both narrationMode and coachVoiceOn', () => {
    applyNarrationToggle(true);
    expect(useCoachSessionStore.getState().narrationMode).toBe(true);
    expect(useAppStore.getState().coachVoiceOn).toBe(true);
  });

  it('disabling flips both off', () => {
    applyNarrationToggle(true);
    applyNarrationToggle(false);
    expect(useCoachSessionStore.getState().narrationMode).toBe(false);
    expect(useAppStore.getState().coachVoiceOn).toBe(false);
  });

  it('returns a user-facing ack string', () => {
    const on = applyNarrationToggle(true);
    expect(on).toMatch(/narrate/i);
    const off = applyNarrationToggle(false);
    expect(off).toMatch(/off|quiet/i);
  });
});
