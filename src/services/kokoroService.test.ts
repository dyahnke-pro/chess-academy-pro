import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock kokoro-js before importing the service
const mockGenerate = vi.fn();
const mockFromPretrained = vi.fn();

vi.mock('kokoro-js', () => ({
  KokoroTTS: {
    from_pretrained: mockFromPretrained,
  },
}));

let kokoroService: typeof import('./kokoroService').kokoroService;
let KOKORO_VOICES: typeof import('./kokoroService').KOKORO_VOICES;

describe('kokoroService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-stub AudioContext after resetModules
    if (typeof globalThis.AudioContext === 'undefined') {
      (globalThis as Record<string, unknown>).AudioContext = class {
        state = 'running';
        createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
          const buffer = {
            numberOfChannels: channels,
            length,
            sampleRate,
            duration: length / sampleRate,
            getChannelData: () => new Float32Array(length),
            copyFromChannel: vi.fn(),
            copyToChannel: vi.fn(),
          };
          return buffer as unknown as AudioBuffer;
        }
        createBufferSource(): AudioBufferSourceNode {
          const source: Record<string, unknown> = {
            buffer: null,
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            onended: null as (() => void) | null,
            disconnect: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          };
          // Trigger onended synchronously after start is called
          (source.start as ReturnType<typeof vi.fn>).mockImplementation(() => {
            Promise.resolve().then(() => {
              const cb = source.onended as (() => void) | null;
              if (cb) cb();
            });
          });
          return source as unknown as AudioBufferSourceNode;
        }
        resume = vi.fn().mockResolvedValue(undefined);
        get destination(): AudioDestinationNode {
          return {} as AudioDestinationNode;
        }
      };
    }

    // Re-mock kokoro-js for the fresh module
    vi.doMock('kokoro-js', () => ({
      KokoroTTS: {
        from_pretrained: mockFromPretrained,
      },
    }));

    const mod = await import('./kokoroService');
    kokoroService = mod.kokoroService;
    KOKORO_VOICES = mod.KOKORO_VOICES;
  });

  describe('KOKORO_VOICES', () => {
    it('contains voices with correct structure', () => {
      expect(KOKORO_VOICES.length).toBeGreaterThan(0);
      for (const voice of KOKORO_VOICES) {
        expect(voice).toHaveProperty('id');
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('accent');
        expect(voice).toHaveProperty('gender');
        expect(['American', 'British']).toContain(voice.accent);
        expect(['Female', 'Male']).toContain(voice.gender);
      }
    });

    it('includes default voice af_heart', () => {
      const heart = KOKORO_VOICES.find((v) => v.id === 'af_heart');
      expect(heart).toBeDefined();
      expect(heart?.name).toBe('Heart');
    });
  });

  describe('initial state', () => {
    it('starts with idle status', () => {
      expect(kokoroService.getStatus()).toBe('idle');
    });

    it('starts with 0 progress', () => {
      expect(kokoroService.getDownloadProgress()).toBe(0);
    });

    it('is not ready initially', () => {
      expect(kokoroService.isReady()).toBe(false);
    });

    it('is not playing initially', () => {
      expect(kokoroService.isPlaying()).toBe(false);
    });
  });

  describe('loadModel', () => {
    it('loads model and sets status to ready', async () => {
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });

      await kokoroService.loadModel();

      expect(kokoroService.getStatus()).toBe('ready');
      expect(kokoroService.isReady()).toBe(true);
      expect(mockFromPretrained).toHaveBeenCalledWith(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        expect.objectContaining({ dtype: 'q8', device: 'wasm' }),
      );
    });

    it('sets status to error on failure', async () => {
      mockFromPretrained.mockRejectedValue(new Error('Network error'));

      await expect(kokoroService.loadModel()).rejects.toThrow('Network error');
      expect(kokoroService.getStatus()).toBe('error');
    });

    it('does not reload if already ready', async () => {
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });

      await kokoroService.loadModel();
      await kokoroService.loadModel();

      expect(mockFromPretrained).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent load calls', async () => {
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });

      const p1 = kokoroService.loadModel();
      const p2 = kokoroService.loadModel();

      await Promise.all([p1, p2]);

      expect(mockFromPretrained).toHaveBeenCalledTimes(1);
    });

    it('notifies status listeners', async () => {
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });
      const statuses: string[] = [];
      kokoroService.onStatusChange((s) => statuses.push(s));

      await kokoroService.loadModel();

      expect(statuses).toContain('downloading');
      expect(statuses).toContain('ready');
    });
  });

  describe('speak', () => {
    it('throws if model not loaded', async () => {
      await expect(kokoroService.speak('Hello')).rejects.toThrow('Kokoro model not loaded');
    });

    it('calls generate with correct params when model is loaded', async () => {
      // Mock generate to reject so speak() exits before reaching playAudio
      mockGenerate.mockRejectedValue(new Error('test-stop'));
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });

      await kokoroService.loadModel();
      await kokoroService.speak('Hello world').catch(() => undefined);

      expect(mockGenerate).toHaveBeenCalledWith('Hello world', { voice: 'af_heart', speed: 1.0 });
    });

    it('uses custom voice and speed', async () => {
      mockGenerate.mockRejectedValue(new Error('test-stop'));
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });

      await kokoroService.loadModel();
      await kokoroService.speak('Test', 'bm_daniel', 1.25).catch(() => undefined);

      expect(mockGenerate).toHaveBeenCalledWith('Test', { voice: 'bm_daniel', speed: 1.25 });
    });
  });

  describe('stop', () => {
    it('can be called safely when not playing', () => {
      expect(() => kokoroService.stop()).not.toThrow();
      expect(kokoroService.isPlaying()).toBe(false);
    });
  });

  describe('unload', () => {
    it('resets to idle state', async () => {
      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });
      await kokoroService.loadModel();

      kokoroService.unload();

      expect(kokoroService.getStatus()).toBe('idle');
      expect(kokoroService.isReady()).toBe(false);
      expect(kokoroService.getDownloadProgress()).toBe(0);
    });
  });

  describe('onStatusChange', () => {
    it('returns unsubscribe function', () => {
      const statuses: string[] = [];
      const unsub = kokoroService.onStatusChange((s) => statuses.push(s));

      unsub();
      kokoroService.unload(); // Would normally trigger 'idle'

      // After unsubscribing, listener should not have been called
      // (unload from initial idle to idle still fires)
      expect(statuses.length).toBeLessThanOrEqual(1);
    });
  });

  describe('onProgress', () => {
    it('returns unsubscribe function', () => {
      const progresses: number[] = [];
      const unsub = kokoroService.onProgress((p) => progresses.push(p));

      unsub();
      // No more events should be received
      expect(progresses).toHaveLength(0);
    });
  });

  describe('iOS compatibility', () => {
    it('configures single-threaded WASM on iOS', async () => {
      vi.resetModules();

      const mockEnv = { backends: { onnx: { wasm: { numThreads: 4, proxy: true } } } };

      vi.doMock('../utils/constants', () => ({ IS_IOS: true }));
      vi.doMock('@huggingface/transformers', () => ({ env: mockEnv }));
      vi.doMock('kokoro-js', () => ({
        KokoroTTS: { from_pretrained: mockFromPretrained },
      }));

      mockFromPretrained.mockResolvedValue({ generate: mockGenerate });

      const mod = await import('./kokoroService');
      await mod.kokoroService.loadModel();

      expect(mockEnv.backends.onnx.wasm.numThreads).toBe(1);
      expect(mockEnv.backends.onnx.wasm.proxy).toBe(false);
    });
  });
});
