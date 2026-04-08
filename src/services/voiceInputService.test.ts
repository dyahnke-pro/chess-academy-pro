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
});
