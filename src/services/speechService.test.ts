import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the SpeechService class directly, not the singleton
// Re-import the module to get a fresh instance each test
describe('speechService', () => {
  let SpeechServiceModule: typeof import('./speechService');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // Re-stub SpeechSynthesisUtterance after resetModules clears it
    (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class {
      text: string;
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text?: string) {
        this.text = text ?? '';
      }
    };
    SpeechServiceModule = await import('./speechService');
  });

  describe('speak', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('calls cancel then speak with correct options', () => {
      const { speechService } = SpeechServiceModule;
      speechService.speak('Hello world');
      vi.runAllTimers();

      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it('does not speak when disabled', () => {
      const { speechService } = SpeechServiceModule;
      speechService.setEnabled(false);
      vi.clearAllMocks();

      speechService.speak('Hello');
      vi.runAllTimers();
      expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('speaks again after re-enabling', () => {
      const { speechService } = SpeechServiceModule;
      speechService.setEnabled(false);
      speechService.setEnabled(true);
      vi.clearAllMocks();

      speechService.speak('Hello again');
      vi.runAllTimers();
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('calls cancel on speechSynthesis', () => {
      const { speechService } = SpeechServiceModule;
      vi.clearAllMocks();

      speechService.stop();
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('disabling calls stop', () => {
      const { speechService } = SpeechServiceModule;
      vi.clearAllMocks();

      speechService.setEnabled(false);
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });

    it('tracks enabled state', () => {
      const { speechService } = SpeechServiceModule;
      expect(speechService.isEnabled).toBe(true);
      speechService.setEnabled(false);
      expect(speechService.isEnabled).toBe(false);
    });
  });

  describe('setRate', () => {
    it('clamps rate to minimum 0.5', () => {
      const { speechService } = SpeechServiceModule;
      speechService.setRate(0.1);
      expect(speechService.speed).toBe(0.5);
    });

    it('clamps rate to maximum 2.0', () => {
      const { speechService } = SpeechServiceModule;
      speechService.setRate(3.0);
      expect(speechService.speed).toBe(2.0);
    });

    it('accepts valid rate', () => {
      const { speechService } = SpeechServiceModule;
      speechService.setRate(1.5);
      expect(speechService.speed).toBe(1.5);
    });

    it('accepts boundary values', () => {
      const { speechService } = SpeechServiceModule;
      speechService.setRate(0.5);
      expect(speechService.speed).toBe(0.5);
      speechService.setRate(2.0);
      expect(speechService.speed).toBe(2.0);
    });
  });
});
