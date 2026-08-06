import { describe, it, expect } from 'vitest';
import { CONTINUE_GAME_RE } from './CoachTeachPage';

// This regex classifies whether a typed message means "resume the walkthrough
// into the middlegame/endgame" (David 2026-07-26 gambit-switch bug fix). It
// has needed two real-world-phrasing patches since:
//   1. 2026-07-26 — bare "middlegame"/"endgame" as one word only.
//   2. 2026-08-06 — a real user typed "Keep playing the line out" (the -ing
//      form), which fell through to the LLM chat path and got the generic
//      ungrounded refusal instead of resuming the walkthrough (PostHog).
describe('CONTINUE_GAME_RE', () => {
  it('matches the -ing verb forms (the 2026-08-06 real-user miss)', () => {
    for (const text of [
      'Keep playing the line out',
      'keep playing the line out',
      'watching the middlegame',
      'seeing the endgame',
      'showing the whole game',
      'continuing the entire game',
      'finishing the rest of the game',
    ]) {
      expect(CONTINUE_GAME_RE.test(text), text).toBe(true);
    }
  });

  it('still matches the bare-verb forms (the 2026-07-26 fix)', () => {
    for (const text of [
      'play the line out',
      'watch it play out',
      'see the middle game',
      'keep going with the middlegame',
      'carry on to the endgame',
      'show me the middlegame',
    ]) {
      expect(CONTINUE_GAME_RE.test(text), text).toBe(true);
    }
  });

  it('does not fire on unrelated asks', () => {
    for (const text of [
      'what should I play against the Pirc',
      'what is the best move',
      'why is Qe3 best',
      'teach me the Caro-Kann',
    ]) {
      expect(CONTINUE_GAME_RE.test(text), text).toBe(false);
    }
  });
});
