import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// audioContextManager holds module-level state, so reset modules between tests.
let getSharedAudioContext: typeof import('./audioContextManager').getSharedAudioContext;
let unlockAudioContext: typeof import('./audioContextManager').unlockAudioContext;

function makeAudioContextClass(initialState: AudioContextState = 'running'): new () => AudioContext {
  return class {
    state: AudioContextState = initialState;
    resume = vi.fn().mockResolvedValue(undefined);
    destination = {} as AudioDestinationNode;
  } as unknown as new () => AudioContext;
}

describe('audioContextManager', () => {
  beforeEach(async () => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).AudioContext = makeAudioContextClass('running');

    const mod = await import('./audioContextManager');
    getSharedAudioContext = mod.getSharedAudioContext;
    unlockAudioContext = mod.unlockAudioContext;
  });

  describe('getSharedAudioContext', () => {
    it('creates an AudioContext on first call', () => {
      const ctx = getSharedAudioContext();
      expect(ctx).toBeDefined();
      expect(ctx.state).toBe('running');
    });

    it('returns the same instance on subsequent calls', () => {
      const ctx1 = getSharedAudioContext();
      const ctx2 = getSharedAudioContext();
      expect(ctx1).toBe(ctx2);
    });

    it('creates a new context if the previous one is closed', () => {
      const ctx1 = getSharedAudioContext();
      Object.defineProperty(ctx1, 'state', { value: 'closed', writable: true, configurable: true });
      const ctx2 = getSharedAudioContext();
      expect(ctx2).not.toBe(ctx1);
    });

    it('attaches unlock listeners when context starts suspended', async () => {
      vi.resetModules();
      (globalThis as Record<string, unknown>).AudioContext = makeAudioContextClass('suspended');
      const addSpy = vi.spyOn(document, 'addEventListener');

      const mod = await import('./audioContextManager');
      mod.getSharedAudioContext();

      const captureCalls = addSpy.mock.calls.filter(
        ([, , opts]) => typeof opts === 'object' && (opts as Record<string, unknown>)['capture'] === true,
      );
      expect(captureCalls.map(([event]) => event)).toContain('touchstart');
      expect(captureCalls.map(([event]) => event)).toContain('mousedown');

      addSpy.mockRestore();
    });

    it('attaches unlock listeners even when the context starts running — it is suspended or interrupted later just the same', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      getSharedAudioContext();

      const captureCalls = addSpy.mock.calls.filter(
        ([, , opts]) => typeof opts === 'object' && (opts as Record<string, unknown>)['capture'] === true,
      );
      expect(captureCalls.map(([event]) => event)).toContain('touchstart');

      addSpy.mockRestore();
    });

    it('an INTERRUPTED context (iOS, after a call or another app) is resumed on the next tap', async () => {
      vi.resetModules();
      (globalThis as Record<string, unknown>).AudioContext = makeAudioContextClass('running');
      const mod = await import('./audioContextManager');
      const ctx = mod.getSharedAudioContext() as unknown as { state: string; resume: ReturnType<typeof vi.fn> };
      ctx.state = 'interrupted';
      document.dispatchEvent(new Event('touchstart'));
      expect(ctx.resume).toHaveBeenCalledTimes(1);
    });
  });

  describe('playWhenRunning', () => {
    it('plays at once on a running context', async () => {
      const mod = await import('./audioContextManager');
      const play = vi.fn();
      mod.playWhenRunning(play);
      expect(play).toHaveBeenCalledTimes(1);
    });

    it('an interrupted context is resumed first, and the sound plays once it runs', async () => {
      vi.resetModules();
      (globalThis as Record<string, unknown>).AudioContext = makeAudioContextClass('running');
      const mod = await import('./audioContextManager');
      const ctx = mod.getSharedAudioContext() as unknown as { state: string; resume: Mock<() => Promise<void>> };
      ctx.state = 'interrupted';
      ctx.resume.mockImplementation(() => { ctx.state = 'running'; return Promise.resolve(); });
      const play = vi.fn();
      mod.playWhenRunning(play);
      expect(play).not.toHaveBeenCalled();
      await Promise.resolve(); await Promise.resolve();
      expect(ctx.resume).toHaveBeenCalledTimes(1);
      expect(play).toHaveBeenCalledTimes(1);
    });

    it('a resume that never runs plays nothing (the next tap wakes it)', async () => {
      vi.resetModules();
      (globalThis as Record<string, unknown>).AudioContext = makeAudioContextClass('suspended');
      const mod = await import('./audioContextManager');
      const play = vi.fn();
      mod.playWhenRunning(play);
      await Promise.resolve(); await Promise.resolve();
      expect(play).not.toHaveBeenCalled();
    });
  });

  describe('unlockAudioContext', () => {
    it('calls resume on a suspended context', async () => {
      vi.resetModules();
      const mockResume = vi.fn().mockResolvedValue(undefined);
      const SuspendedCtx = class {
        state: AudioContextState = 'suspended';
        resume = mockResume;
        destination = {} as AudioDestinationNode;
      } as unknown as new () => AudioContext;
      (globalThis as Record<string, unknown>).AudioContext = SuspendedCtx;

      const mod = await import('./audioContextManager');
      mod.unlockAudioContext();

      expect(mockResume).toHaveBeenCalledTimes(1);
    });

    it('does not call resume on a running context', () => {
      const ctx = getSharedAudioContext() as unknown as { resume: ReturnType<typeof vi.fn> };
      unlockAudioContext();
      expect(ctx.resume).not.toHaveBeenCalled();
    });

    it('is safe to call multiple times', () => {
      expect(() => {
        unlockAudioContext();
        unlockAudioContext();
        unlockAudioContext();
      }).not.toThrow();
    });
  });
});
