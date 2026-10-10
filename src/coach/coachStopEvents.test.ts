import { describe, it, expect, vi } from 'vitest';
import { emitCoachStop, onCoachStop } from './coachStopEvents';
import { voiceService } from '../services/voiceService';

describe('coachStopEvents — "stop" reaches the voice', () => {
  it('the voice service stops when the student says stop', () => {
    const stop = vi.spyOn(voiceService, 'stop');
    emitCoachStop();
    expect(stop).toHaveBeenCalled();
    stop.mockRestore();
  });
  it('a listener that throws never breaks the turn', () => {
    const off = onCoachStop(() => { throw new Error('boom'); });
    expect(() => emitCoachStop()).not.toThrow();
    off();
  });
});
