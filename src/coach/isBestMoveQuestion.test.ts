import { describe, it, expect } from 'vitest';
import { isBestMoveQuestion } from './coachService';

// WO: coach-engine-grounding (David 2026-06-09 "No bueno"). Detects best-move
// / soundness questions so the grounding pipeline exempts JUST the bare-SAN
// gate for the turn (the coach can name the engine's best move + the short
// proving line). Fabrication guards stay in force — see claimValidator.test.
describe('isBestMoveQuestion', () => {
  it("matches David's exact phrasing", () => {
    expect(isBestMoveQuestion('White only has one good move here?')).toBe(true);
  });

  it('matches the common best-move / soundness phrasings', () => {
    for (const q of [
      "what's the best move here?",
      'Is this the best move?',
      'what should I play here',
      'what should white play',
      'is Nf3 sound?',
      'the strongest move?',
      "what's white's best?",
      'only good move?',
      'one good move here',
      'best continuation?',
      'is that the right move',
    ]) {
      expect(isBestMoveQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match ordinary chat / non-move questions', () => {
    for (const q of [
      'what opening is this?',
      'tell me about the Caro-Kann',
      'why did I lose that endgame?',
      'who is Magnus Carlsen?',
      'how many games have I played?',
      undefined,
      '',
    ]) {
      expect(isBestMoveQuestion(q), String(q)).toBe(false);
    }
  });
});
