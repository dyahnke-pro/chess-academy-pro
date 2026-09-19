/**
 * THE BUCKET-D GATE: a student who does not write English must still be able to
 * GET WHAT THEY ASKED FOR.
 *
 * A real App Store user asked for a lesson seven times in Thai and never got
 * one. Nothing in the hand-off was broken — `routeChatIntent` has translated a
 * non-English command since 2026-07-10, and `/coach/teach?opening=` has
 * auto-kicked the walkthrough the whole time. The translate branch simply never
 * ran, because it asks `detectLanguage` first and `detectLanguage` had no Thai
 * range, so their ask was classified ENGLISH and matched no English pattern.
 *
 * So this file deliberately runs the REAL `detectLanguage` (mocking it would
 * test nothing — it is the thing that was wrong) and mocks only the twoboundaries
 * it must not reach: the translation LLM and the Dexie opening lookup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeChatIntent } from './coachSessionRouter';

vi.mock('./walkthroughResolver', () => ({ matchOpeningForSubject: vi.fn() }));
vi.mock('./middlegamePlanner', () => ({
  findPlanForOpening: vi.fn(() => null),
  findPlanBySubject: vi.fn(() => null),
}));
vi.mock('./gameContextService', () => ({ findLastMatchingGame: vi.fn(async () => null) }));
vi.mock('./openingService', () => ({ getWeakestOpenings: vi.fn(async () => []) }));
vi.mock('./coachApi', () => ({ translateToEnglish: vi.fn() }));

import { matchOpeningForSubject } from './walkthroughResolver';
import { translateToEnglish } from './coachApi';

/** "Teach me the Italian opening." */
const THAI_ASK = 'สอนฉันเปิดเกมอิตาลีให้หน่อย';
/** "Teach me the Italian opening." */
const GREEK_ASK = 'Δίδαξέ μου το ιταλικό άνοιγμα';
/** "Teach me the Italian opening." */
const VIET_ASK = 'Dạy tôi khai cuộc Ý';

describe('routeChatIntent — the student does not write English', () => {
  beforeEach(() => {
    vi.mocked(matchOpeningForSubject).mockReset();
    vi.mocked(translateToEnglish).mockReset();
    vi.mocked(translateToEnglish).mockResolvedValue('teach me the Italian Game');
    vi.mocked(matchOpeningForSubject).mockResolvedValue({
      opening: { id: 'italian-game', name: 'Italian Game' },
    } as never);
  });

  for (const [language, ask] of [
    ['Thai', THAI_ASK],
    ['Greek', GREEK_ASK],
    ['Vietnamese', VIET_ASK],
  ] as const) {
    it(`a ${language} lesson request reaches the walkthrough route`, async () => {
      const routed = await routeChatIntent(ask);

      // 1. it was recognised as non-English at all — the step that was missing.
      expect(translateToEnglish).toHaveBeenCalledWith(ask);
      // 2. and the student ends up where they asked to be.
      expect(routed).not.toBeNull();
      expect(routed!.path).toContain('/coach/teach');
      expect(routed!.path).toContain('opening=');
    });
  }

  it('an English ask still costs no translation call', async () => {
    const routed = await routeChatIntent('teach me the Italian Game');
    expect(translateToEnglish).not.toHaveBeenCalled();
    expect(routed!.path).toContain('/coach/teach');
  });

  it('a chess question in Thai is still a question, not a route', async () => {
    // The translation is honest about what was asked; a non-command must still
    // fall through to the brain rather than being forced into a route.
    vi.mocked(translateToEnglish).mockResolvedValue('why is the f7 square weak?');
    expect(await routeChatIntent('ทำไมช่อง f7 ถึงอ่อนแอ')).toBeNull();
  });
});
