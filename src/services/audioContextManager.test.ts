import { describe, it, expect, vi, beforeEach } from 'vitest';

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

    it('does not attach unlock listeners when context starts running', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      getSharedAudioContext();

      const captureCalls = addSpy.mock.calls.filter(
        ([, , opts]) => typeof opts === 'object' && (opts as Record<string, unknown>)['capture'] === true,
      );
      expect(captureCalls).toHaveLength(0);

      addSpy.mockRestore();
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
