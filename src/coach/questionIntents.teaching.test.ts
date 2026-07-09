import { describe, it, expect } from 'vitest';
import { isTeachingMethodQuestion } from './questionIntents';

// F11: "how do you teach X" is a META question about the app's teaching method
// (routes to assembleTeachingAnswer). It must NOT collide with "teach me X",
// which is a request to START a lesson.

describe('isTeachingMethodQuestion', () => {
  it('matches teaching-method questions', () => {
    for (const q of [
      'how do you teach the Caro-Kann?',
      'how does the app teach openings?',
      'how do the lessons work?',
      'how is the Sicilian taught here?',
      "what's your teaching method?",
      'how do you cover the Najdorf?',
      'how does Learn work?',
    ]) {
      expect(isTeachingMethodQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match "teach me X" (a request to start a lesson)', () => {
    for (const q of [
      'teach me the Caro-Kann',
      'teach me a trap',
      'can you teach me the Sicilian?',
    ]) {
      expect(isTeachingMethodQuestion(q), q).toBe(false);
    }
  });

  it('does NOT match unrelated chat', () => {
    for (const q of ['hi', "what's the best move?", 'am I improving?']) {
      expect(isTeachingMethodQuestion(q), q).toBe(false);
    }
  });
});
