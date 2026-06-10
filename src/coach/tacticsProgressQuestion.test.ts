import { describe, it, expect } from 'vitest';
import { isTacticsQuestion, isProgressQuestion } from './coachService';

// Grounding inversion STEP B (2026-06-10). These detectors route a chat turn to
// a CODE fact-computer (assembleTacticsAnswer / assembleProgressAnswer) so the
// LLM only voices the result — it decides nothing. The regexes must FIRE on the
// real phrasings but NOT on ordinary chat (a false positive sends a turn down
// the grounded path unnecessarily; a false negative leaves it in the LLM swamp).
describe('isTacticsQuestion', () => {
  it('matches tactics / danger phrasings', () => {
    for (const q of [
      'is anything hanging?',
      "what's the threat here?",
      'any threats?',
      'is there a fork?',
      'am I in danger?',
      'is my queen safe?',
      'is the knight hanging?',
      'can I be punished for this?',
      'is there a mate here?',
      'are there any tactics?',
      'is my rook under attack?',
    ]) {
      expect(isTacticsQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match ordinary chat / non-tactics questions', () => {
    for (const q of [
      'what opening is this?',
      'tell me about the Caro-Kann',
      'what should I name my repertoire?',
      'how many games have I played?',
      undefined,
      '',
    ]) {
      expect(isTacticsQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isProgressQuestion', () => {
  it('matches student-progress phrasings', () => {
    for (const q of [
      'am I improving?',
      'am I getting better?',
      'how am I doing?',
      'what should I work on?',
      'what do I need to improve?',
      'what are my weaknesses?',
      'what are my weak spots?',
      'what are my bad habits?',
      'how is my progress?',
      "what's holding me back?",
      'what is my biggest weakness?',
    ]) {
      expect(isProgressQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match ordinary chat / position questions', () => {
    for (const q of [
      "what's the best move?",
      'is anything hanging?',
      'tell me about the Italian Game',
      'who is the best player ever?',
      undefined,
      '',
    ]) {
      expect(isProgressQuestion(q), String(q)).toBe(false);
    }
  });
});
