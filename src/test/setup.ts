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

  class MockSpeechSynthesisUtterance {
    text = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text?: string) {
      if (text) this.text = text;
    }
  }

  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: MockSpeechSynthesisUtterance,
    writable: true,
  });

  // Stub Web Speech Recognition API
  class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = 'en-US';
    onresult: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
  }

  Object.defineProperty(window, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
  });

  Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
  });

  // Stub Web Crypto (needed for cryptoService) — full encrypt/decrypt round-trip
  const cryptoKeyStore = new Map<string, CryptoKey>();

  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        importKey: vi.fn().mockImplementation(
          () => {
            const key = { type: 'secret', algorithm: { name: 'PBKDF2' } } as CryptoKey;
            return Promise.resolve(key);
          },
        ),
        deriveKey: vi.fn().mockImplementation(
          () => {
            const key = { type: 'secret', algorithm: { name: 'AES-GCM', length: 256 } } as unknown as CryptoKey;
            const id = `key_${cryptoKeyStore.size}`;
            cryptoKeyStore.set(id, key);
            return Promise.resolve(key);
          },
        ),
        encrypt: vi.fn().mockImplementation(
          (_algo: unknown, _key: CryptoKey, data: ArrayBuffer) => {
            // Simple "encryption": XOR with 0x42 to make it reversible
            const input = new Uint8Array(data);
            const output = new Uint8Array(input.length);
            for (let i = 0; i < input.length; i++) {
              output[i] = input[i] ^ 0x42;
            }
            return Promise.resolve(output.buffer);
          },
        ),
        decrypt: vi.fn().mockImplementation(
          (_algo: unknown, _key: CryptoKey, data: ArrayBuffer) => {
            // Reverse: XOR with 0x42 again
            const input = new Uint8Array(data);
            const output = new Uint8Array(input.length);
            for (let i = 0; i < input.length; i++) {
              output[i] = input[i] ^ 0x42;
            }
            return Promise.resolve(output.buffer);
          },
        ),
      },
    },
    writable: true,
  });

  // Stub AudioContext (needed for voiceService / soundService)
  const mockAudioBuffer = {
    duration: 1.0,
    length: 44100,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: vi.fn(() => new Float32Array(44100)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  };

  const mockBufferSource = {
    buffer: null as unknown,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onended: null as (() => void) | null,
    loop: false,
    playbackRate: { value: 1 },
  };

  class MockAudioContext {
    state: AudioContextState = 'running';
    sampleRate = 44100;
    destination = {} as AudioDestinationNode;
    currentTime = 0;

    decodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
    createBufferSource = vi.fn(() => ({ ...mockBufferSource }));
    createOscillator = vi.fn(() => ({
      type: '' as OscillatorType,
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }));
    createGain = vi.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    createBuffer = vi.fn((_channels: number, length: number, rate: number) => ({
      getChannelData: vi.fn(() => new Float32Array(Math.floor(rate * length))),
    }));
    close = vi.fn().mockResolvedValue(undefined);
    resume = vi.fn().mockResolvedValue(undefined);
    suspend = vi.fn().mockResolvedValue(undefined);
  }

  // Only set AudioContext if not already defined (allows tests to override with vi.stubGlobal)
  if (typeof globalThis.AudioContext === 'undefined') {
    (globalThis as Record<string, unknown>).AudioContext = MockAudioContext;
  }
  if (typeof (window as unknown as Record<string, unknown>).webkitAudioContext === 'undefined') {
    Object.defineProperty(window, 'webkitAudioContext', {
      value: MockAudioContext,
      writable: true,
      configurable: true,
    });
  }

  // Stub window.matchMedia (needed for useIsMobile and responsive hooks)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Stub URL.createObjectURL / revokeObjectURL
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();

  // Make navigator.onLine mockable
  let _onLine = true;
  Object.defineProperty(navigator, 'onLine', {
    get: () => _onLine,
    configurable: true,
  });
  // Expose setter for tests via global
  (globalThis as Record<string, unknown>).__setNavigatorOnLine = (value: boolean) => {
    _onLine = value;
  };
});
