/**
 * THE COACH SPEAKS THE STUDENT'S LANGUAGE ON THE LIVE BOARD, NOT ONLY IN CHAT
 * (David 2026-09-19: "Make sure the coach can speak all languages during
 * teaching lessons (live on the board)").
 *
 * Chat localises off the language it detects on the incoming ask. A LESSON does
 * not: it narrates computed English prose through `voiceService.speakInternal`,
 * which asks `spokenLanguageName()` what to speak in. So everything here is
 * about whether that ONE question has an answer by the time the board starts
 * talking — which is a different question from whether the ask was understood.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { routeChatIntent } from './coachSessionRouter';
import {
  spokenLanguageName,
  resetDetectedLanguage,
  detectStudentLanguage,
} from './spokenLanguage';
import { readFileSync } from 'node:fs';

vi.mock('./walkthroughResolver', () => ({ matchOpeningForSubject: vi.fn() }));
vi.mock('./middlegamePlanner', () => ({
  findPlanForOpening: vi.fn(() => null),
  findPlanBySubject: vi.fn(() => null),
}));
vi.mock('./gameContextService', () => ({ findLastMatchingGame: vi.fn(async () => null) }));
vi.mock('./openingService', () => ({ getWeakestOpenings: vi.fn(async () => []) }));
vi.mock('./coachApi', () => ({
  translateToEnglish: vi.fn(async () => 'teach me the Italian Game'),
}));

import { matchOpeningForSubject } from './walkthroughResolver';

/** "Teach me the Italian opening." */
const THAI_ASK = 'สอนฉันเปิดเกมอิตาลีให้หน่อย';

describe('the live lesson speaks the language the student asked in', () => {
  beforeEach(() => {
    resetDetectedLanguage();
    vi.mocked(matchOpeningForSubject).mockResolvedValue({
      opening: { id: 'italian-game', name: 'Italian Game' },
    } as never);
  });

  it('a lesson command that ROUTES still tells the voice what language to use', async () => {
    // 🔒 THE REGRESSION THIS EXISTS FOR, AND IT WAS CAUSED BY A FIX. Once the
    // Thai ask finally reached the walkthrough deterministically, it did so
    // without the brain ever seeing the turn — and the brain was the only
    // thing recording the student's language. Measured before the fix:
    // `expected null to be 'Thai'` on a turn that had routed perfectly.
    const routed = await routeChatIntent(THAI_ASK);
    expect(routed?.path).toContain('opening=');
    expect(spokenLanguageName()).toBe('Thai');
  });

  it('an English ask leaves the voice on English', async () => {
    await routeChatIntent('teach me the Italian Game');
    expect(spokenLanguageName()).toBeNull();
  });

  it('the observation survives the turn, because the lesson speaks AFTER it', async () => {
    // The narration that matters is spoken minutes later, ply by ply. A value
    // scoped to the turn would be gone by the first beat.
    await routeChatIntent(THAI_ASK);
    await routeChatIntent('e4');
    expect(spokenLanguageName()).toBe('Thai');
  });
});

describe('detectStudentLanguage — detecting and recording are one act', () => {
  beforeEach(() => resetDetectedLanguage());

  it('records a non-English observation as a side effect of detecting it', () => {
    expect(detectStudentLanguage('Δίδαξέ μου το ιταλικό άνοιγμα').code).toBe('el');
    expect(spokenLanguageName()).toBe('Greek');
  });

  it('never records English, so one English turn cannot mute the language', () => {
    detectStudentLanguage('สอนฉันเปิดเกมอิตาลีให้หน่อย');
    detectStudentLanguage('ok thanks');
    expect(spokenLanguageName()).toBe('Thai');
  });

  it('every site that asks the student-input question uses it', () => {
    // A convention rots; this blames by STATEMENT. These three files each ask
    // "what language did the student write in", and each one that answers with
    // the bare detector is a path that can understand a student and then talk
    // past them — which is exactly the bug above.
    const STUDENT_INPUT_SITES = [
      'src/services/coachSessionRouter.ts',
      'src/coach/coachService.ts',
      'src/services/coachSettingsAction.ts',
      // Learn does not go through the action router — it has its own intent
      // pipeline, and it asks this question at the top of every turn.
      'src/components/Coach/CoachTeachPage.tsx',
    ];
    for (const file of STUDENT_INPUT_SITES) {
      const bare = readFileSync(file, 'utf8')
        .split('\n')
        .filter((l) => /(?:^|[^a-zA-Z])detectLanguage\s*\(/.test(l) && !l.trim().startsWith('*') && !l.trim().startsWith('//'));
      expect(bare, `${file} must use detectStudentLanguage`).toEqual([]);
    }
  });
});

describe('the device locale is the cold-start prior', () => {
  const realNav = globalThis.navigator;
  afterEach(() => {
    resetDetectedLanguage();
    Object.defineProperty(globalThis, 'navigator', { value: realNav, configurable: true });
  });
  const setLocale = (...tags: string[]): void => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: tags[0], languages: tags },
      configurable: true,
    });
  };

  it('a student who never types still gets their own language', () => {
    // Tap an opening, tap Watch, play moves — nothing was ever typed, so there
    // is nothing to detect. English was a guess; the locale is a stated fact.
    resetDetectedLanguage();
    setLocale('th-TH', 'th');
    expect(spokenLanguageName()).toBe('Thai');
  });

  it('what they TYPED outranks the locale', () => {
    setLocale('th-TH');
    detectStudentLanguage('Δίδαξέ μου το ιταλικό άνοιγμα');
    expect(spokenLanguageName()).toBe('Greek');
  });

  it('an English or unknown locale stays English', () => {
    resetDetectedLanguage();
    setLocale('en-GB');
    expect(spokenLanguageName()).toBeNull();
    setLocale('xx-YY');
    expect(spokenLanguageName()).toBeNull();
  });
});
