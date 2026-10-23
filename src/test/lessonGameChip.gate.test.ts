/**
 * THE LESSON GAME CHIP IS READ BEFORE THE CHAT READER (prod audit L10,
 * 2026-10-23). "Play a game on this" is the page's own offer at the end of a
 * thinking lesson. The chat reader also hears "play a game" — and when it was
 * read first, it seated the student in a plain free game and the lesson's
 * game (the steered moments for the step just taught) never started.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the lesson-game chip', () => {
  it('is matched in handleSubmit before the chat reader\'s request steps', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const submit = src.indexOf('const handleSubmit = useCallback(');
    const chip = src.indexOf('matchLessonGameRequest(text)', submit);
    const reader = src.indexOf('runLearnSteps(asked, text)', submit);
    expect(submit).toBeGreaterThan(0);
    expect(chip).toBeGreaterThan(submit);
    expect(reader).toBeGreaterThan(submit);
    expect(chip).toBeLessThan(reader);
  });
});
