import { describe, it, expect, vi, beforeEach } from 'vitest';
import { voiceInputService } from './voiceInputService';

describe('voiceInputService', () => {
  beforeEach(() => {
    voiceInputService.stopListening();
  });

  describe('isSupported', () => {
    it('reports supported when SpeechRecognition is available', () => {
      expect(voiceInputService.isSupported()).toBe(true);
    });

    it('returns a boolean value', () => {
      const result = voiceInputService.isSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('startListening', () => {
    it('starts listening successfully', () => {
      const result = voiceInputService.startListening();
      expect(result).toBe(true);
      expect(voiceInputService.isListening()).toBe(true);
    });

    it('returns true if already listening', () => {
      voiceInputService.startListening();
      const result = voiceInputService.startListening();
      expect(result).toBe(true);
    });

    it('returns true on third consecutive call without stop', () => {
      voiceInputService.startListening();
      voiceInputService.startListening();
      const result = voiceInputService.startListening();
      expect(result).toBe(true);
      expect(voiceInputService.isListening()).toBe(true);
    });
  });

  describe('stopListening', () => {
    it('stops when currently listening', () => {
      voiceInputService.startListening();
      voiceInputService.stopListening();
      expect(voiceInputService.isListening()).toBe(false);
    });

    it('is safe to call when not listening', () => {
      // Should not throw
      expect(() => voiceInputService.stopListening()).not.toThrow();
      expect(voiceInputService.isListening()).toBe(false);
    });

    it('allows starting again after stopping', () => {
      voiceInputService.startListening();
      voiceInputService.stopListening();
      const result = voiceInputService.startListening();
      expect(result).toBe(true);
      expect(voiceInputService.isListening()).toBe(true);
    });

    it('can be called multiple times safely', () => {
      voiceInputService.startListening();
      voiceInputService.stopListening();
      voiceInputService.stopListening();
      voiceInputService.stopListening();
      expect(voiceInputService.isListening()).toBe(false);
    });
  });

  describe('onResult handler', () => {
    it('registers result handler without calling it', () => {
      const handler = vi.fn();
      voiceInputService.onResult(handler);
      // Handler is registered but not called yet
      expect(handler).not.toHaveBeenCalled();
    });

    it('replaces previous handler when called again', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      voiceInputService.onResult(handler1);
      voiceInputService.onResult(handler2);

      // The service should have handler2 as the active handler now
      // We verify by checking no handlers were called (registration does not invoke them)
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('can register handler before starting to listen', () => {
      const handler = vi.fn();
      voiceInputService.onResult(handler);
      const started = voiceInputService.startListening();
      expect(started).toBe(true);
      // Handler should still not have been called yet (no speech events)
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('interim results', () => {
    it('enables interimResults on the underlying recognition instance', () => {
      voiceInputService.stopListening();
      voiceInputService.startListening();
      // Poke the private recognition through the service — if interim
      // results are disabled, the UX regresses to the old "silent until
      // final" behavior. Guard against that.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test, intentional
      const privateRec = (voiceInputService as any).recognition as { interimResults: boolean };
      expect(privateRec.interimResults).toBe(true);
    });

    it('fires the interim handler for non-final partial results', () => {
      voiceInputService.stopListening();
      const onInterim = vi.fn();
      const onFinal = vi.fn();
      voiceInputService.onResult(onFinal);
      voiceInputService.startListening({ onInterim });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test
      const rec = (voiceInputService as any).recognition as {
        onresult: ((event: unknown) => void) | null;
      };
      // Simulate a partial result: "how do I" (not final yet)
      rec.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            length: 1,
            item: () => ({ transcript: 'how do I', confidence: 0.8 }),
            0: { transcript: 'how do I', confidence: 0.8 },
          },
        ],
      });

      expect(onInterim).toHaveBeenCalledWith('how do I');
      expect(onFinal).not.toHaveBeenCalled();
    });

    it('fires the final handler once isFinal lands', () => {
      voiceInputService.stopListening();
      const onInterim = vi.fn();
      const onFinal = vi.fn();
      voiceInputService.onResult(onFinal);
      voiceInputService.startListening({ onInterim });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test
      const rec = (voiceInputService as any).recognition as {
        onresult: ((event: unknown) => void) | null;
      };
      rec.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            item: () => ({ transcript: 'how do I castle', confidence: 0.95 }),
            0: { transcript: 'how do I castle', confidence: 0.95 },
          },
        ],
      });

      expect(onFinal).toHaveBeenCalledWith('how do I castle');
    });
  });

  describe('auto-finalize on silence and onend', () => {
    it('dispatches the latest interim as final when onend fires without a final result', () => {
      voiceInputService.stopListening();
      const onFinal = vi.fn();
      voiceInputService.onResult(onFinal);
      voiceInputService.startListening({ onInterim: () => {} });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test
      const rec = (voiceInputService as any).recognition as {
        onresult: ((event: unknown) => void) | null;
        onend: (() => void) | null;
      };

      // Partial only — no final result.
      rec.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            length: 1,
            item: () => ({ transcript: 'why is knight c5 best', confidence: 0.7 }),
            0: { transcript: 'why is knight c5 best', confidence: 0.7 },
          },
        ],
      });

      // Browser ends recognition without firing a final (iOS Safari quirk).
      rec.onend?.();

      expect(onFinal).toHaveBeenCalledWith('why is knight c5 best');
    });

    it('does not double-fire when a real final arrives and then onend runs', () => {
      voiceInputService.stopListening();
      const onFinal = vi.fn();
      voiceInputService.onResult(onFinal);
      voiceInputService.startListening();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test
      const rec = (voiceInputService as any).recognition as {
        onresult: ((event: unknown) => void) | null;
        onend: (() => void) | null;
      };

      rec.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            item: () => ({ transcript: 'castle kingside', confidence: 0.9 }),
            0: { transcript: 'castle kingside', confidence: 0.9 },
          },
        ],
      });
      rec.onend?.();

      expect(onFinal).toHaveBeenCalledTimes(1);
      expect(onFinal).toHaveBeenCalledWith('castle kingside');
    });

    it('dispatches multiple finals in one session (continuous listening)', () => {
      voiceInputService.stopListening();
      const onFinal = vi.fn();
      voiceInputService.onResult(onFinal);
      voiceInputService.startListening();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test
      const rec = (voiceInputService as any).recognition as {
        onresult: ((event: unknown) => void) | null;
      };
      // First utterance.
      rec.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            item: () => ({ transcript: 'hello coach', confidence: 0.9 }),
            0: { transcript: 'hello coach', confidence: 0.9 },
          },
        ],
      });
      // Second utterance in the same listening session.
      rec.onresult?.({
        resultIndex: 1,
        results: [
          { isFinal: false, length: 1, 0: { transcript: '', confidence: 0 } },
          {
            isFinal: true,
            length: 1,
            item: () => ({ transcript: 'what is a pin', confidence: 0.9 }),
            0: { transcript: 'what is a pin', confidence: 0.9 },
          },
        ],
      });

      expect(onFinal).toHaveBeenCalledTimes(2);
      expect(onFinal).toHaveBeenNthCalledWith(1, 'hello coach');
      expect(onFinal).toHaveBeenNthCalledWith(2, 'what is a pin');
    });

    it('fires the onEnd callback only after the user explicitly stops', () => {
      voiceInputService.stopListening();
      const onEnd = vi.fn();
      voiceInputService.startListening({ onEnd });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box test
      const rec = (voiceInputService as any).recognition as {
        onend: (() => void) | null;
      };
      // Browser's end-of-utterance — caller did NOT stop yet. Should
      // transparently restart (onEnd stays silent).
      rec.onend?.();
      expect(onEnd).not.toHaveBeenCalled();

      // Now the user taps off. onEnd fires on the next browser onend.
      voiceInputService.stopListening();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box
      const rec2 = (voiceInputService as any).recognition as {
        onend: (() => void) | null;
      };
      rec2.onend?.();
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });
});
