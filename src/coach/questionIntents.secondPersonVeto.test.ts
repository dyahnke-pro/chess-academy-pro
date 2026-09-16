/**
 * The second-person veto on the player-games lane must cut exactly one thing.
 *
 * "Why did YOU play that move?" mid-lesson is about the COACH's own move, and it
 * was misrouting to "which player do you mean?" — so a veto on `do/did you` was
 * added. But that detector's OWN vocabulary contains "do you have a game in this
 * opening?", an availability ask about the pro's corpus, and the veto swallowed
 * it. Both sides are pinned here so neither fix can undo the other.
 */
import { describe, it, expect } from 'vitest';
import { isPlayerGamesQuestion } from './questionIntents';

describe('player-games: the second-person veto', () => {
  it('still vetoes questions about a move the COACH played', () => {
    for (const ask of [
      'why did you play that move?',
      'why did you play that?',
      'what did you do there?',
      'why did I play that?',
      'what did I do wrong there?',
    ]) expect(isPlayerGamesQuestion(ask), ask).toBe(false);
  });

  it('does NOT veto an availability ask about the pro corpus', () => {
    for (const ask of [
      'do you have a game in this opening?',
      'do you have any games in this line?',
      'have you got a game with this?',
      'is there a game in this opening?',
    ]) expect(isPlayerGamesQuestion(ask), ask).toBe(true);
  });

  it('the ordinary player-games shapes are untouched', () => {
    for (const ask of [
      "how does he play this?",
      "show me his games",
      "how did he win with this?",
    ]) expect(isPlayerGamesQuestion(ask), ask).toBe(true);
  });
});
