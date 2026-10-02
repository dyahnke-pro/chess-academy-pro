// The hard questions from the pass-3 walk (2026-10-01) — each one reached the
// wrong lane. Pinned here to the detector that should claim it.
import { describe, it, expect } from 'vitest';
import {
  isWhyBestMoveQuestion, isAlternativesQuestion, isOpponentHypotheticalQuestion,
  isCandidateMoveQuestion, isFundamentalLessonQuestion, isTacticsQuestion, positionalTopic,
} from './questionIntents';
import { notationQuestionSan } from '../services/groundedAnswer';
import { extractQuestionFocus } from '../services/boardQuestionRouter';

describe('pass-3 hard questions reach their lanes', () => {
  it('"walk me through the best line" is the engine-line walk', () => {
    expect(isWhyBestMoveQuestion('Walk me through the best line here — what happens after it, move by move?')).toBe(true);
  });
  it('"my three best candidate moves" is the alternatives comparison', () => {
    expect(isAlternativesQuestion('What are my three best candidate moves, and how do they compare?')).toBe(true);
  });
  it('"if they play Re3" is their hypothetical, not notation', () => {
    const q = 'If they play Re3, what is my best reply and why?';
    expect(notationQuestionSan(q)).toBeNull();
    expect(isOpponentHypotheticalQuestion(q)).toBe(true);
    expect(isOpponentHypotheticalQuestion('If they play Nde4, what is my best reply and why?')).toBe(true);
  });
  it('"if I play Nxe5" is the student\'s candidate', () => {
    const q = 'If I play Nxe5, what do they answer and who comes out ahead?';
    expect(notationQuestionSan(q)).toBeNull();
    expect(isCandidateMoveQuestion(q)).toBe(true);
  });
  it('"if I do nothing, what do they do to me" is the threat question', () => {
    expect(extractQuestionFocus('If I do nothing, what do they do to me?')?.aspects).toContain('opponent-threats');
  });
  it('"the most forcing move here" is a board tactics question, not the lesson', () => {
    const q = 'What is the most forcing move here, and does it work?';
    expect(isFundamentalLessonQuestion(q)).toBe(false);
    expect(isTacticsQuestion(q)).toBe(true);
  });
  it('"which pawn break" is the structure read, not a pawn\'s itinerary', () => {
    const q = 'Which pawn break should I aim for, and when is the right moment?';
    expect(extractQuestionFocus(q)?.aspects ?? []).toEqual([]);
    expect(positionalTopic(q)).toBe('pawn-breaks');
  });
  it('the real notation question still answers', () => {
    expect(notationQuestionSan('What does Bxe7 mean?')).toBe('Bxe7');
  });
});

describe('splitMultiAsk — one message, several asks, each to its own lane', async () => {
  const { splitMultiAsk } = await import('./questionIntents');
  it('the pass-3 three-in-one splits into line walk, their plan and tactics', () => {
    expect(splitMultiAsk('What should I play here, what is their best plan, and is there a tactic for either side? Show me the lines.'))
      .toEqual(['Walk me through the best line here?', 'what is their best plan?', 'is there a tactic for either side?']);
  });
  it('a single ask is left alone', () => {
    expect(splitMultiAsk('What is their best plan here, and how do I stop it?')).toBeNull();
    expect(splitMultiAsk('Teach me the Najdorf')).toBeNull();
    expect(splitMultiAsk('Which pawn break should I aim for, and when is the right moment?')).toBeNull();
  });
});
