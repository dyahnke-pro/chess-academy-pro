import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Stub Web Speech API
beforeAll(() => {
  const mockSpeechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
  };

  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
  });

  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: vi.fn().mockImplementation(() => ({
      text: '',
      rate: 1,
      pitch: 1,
      volume: 1,
      voice: null,
    })),
    writable: true,
  });

  // Stub Web Crypto (needed for cryptoService)
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        importKey: vi.fn(),
        deriveKey: vi.fn(),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
      },
    },
    writable: true,
  });
});
