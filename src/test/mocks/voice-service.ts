/**
 * THE COMPLETE voiceService MOCK — one shape, every method.
 *
 * 64 test files hand-rolled their own `vi.mock('.../voiceService')`, each
 * listing whatever methods the code happened to call on the day it was
 * written. That is a drift factory, and it cost a real red: when the tier-3
 * hint moved off the LLM onto the computed path (G0 inversion, 2026-09-06) it
 * started calling `speakForced`, which `TacticSetupBoard.test.tsx`'s mock did
 * not define. The call threw, took the hint text with it, and the row sat red
 * on `main` reading as a product failure. It was a missing mock method.
 *
 * Use this instead of listing methods by hand:
 *
 *   vi.mock('../../services/voiceService', async () => {
 *     const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
 *     return { voiceService: buildVoiceServiceMock() };
 *   });
 *
 * Reach in for a spy with `mock.speakForced` — every entry is a `vi.fn()`.
 * Override any one of them by passing it in `overrides`.
 */
import { vi } from 'vitest';

/** Every method the real `voiceService` exposes. A method ADDED there and not
 *  here is caught by `voiceServiceMock.test.ts`, which diffs the two. */
const VOID_METHODS = [
  'stop', 'clearCache', 'setSpeed', 'lockKidVoice', 'unlockKidVoice',
  'resetSpokenMemory', 'installStreamingAudioUnlock',
] as const;

const ASYNC_METHODS = [
  'speak', 'speakForced', 'speakIfFree', 'speakLecture', 'speakReadAloud',
  'speakGrounded', 'speakPackage', 'warmup', 'prefetchAudio',
] as const;

const VALUE_METHODS = {
  isPlaying: false,
  isPollyLive: false,
  isTypeSupported: true,
  getSpeed: 1,
  getCurrentTier: 'cloud',
  getLastSpeakDiagnostic: null,
} as const;

export type VoiceServiceMock = Record<string, ReturnType<typeof vi.fn>>;

export function buildVoiceServiceMock(overrides: Partial<VoiceServiceMock> = {}): VoiceServiceMock {
  const mock: VoiceServiceMock = {};
  for (const m of VOID_METHODS) mock[m] = vi.fn();
  for (const m of ASYNC_METHODS) mock[m] = vi.fn().mockResolvedValue(undefined);
  for (const [m, v] of Object.entries(VALUE_METHODS)) mock[m] = vi.fn().mockReturnValue(v);
  return Object.assign(mock, overrides);
}

/** The method names this mock covers — the gate reads this. */
export const MOCKED_VOICE_METHODS: readonly string[] = [
  ...VOID_METHODS, ...ASYNC_METHODS, ...Object.keys(VALUE_METHODS),
];
