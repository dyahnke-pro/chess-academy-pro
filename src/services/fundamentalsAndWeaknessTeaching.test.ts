import { describe, it, expect } from 'vitest';
import { isFundamentalsQuestion, fundamentalsTopicFromText } from '../coach/questionIntents';
import { assembleFundamentalsAnswer } from './groundedAnswer';
import { matchTrainingAidRoute } from './trainingAidRouter';

// David 2026-08-26: "it couldnt teach me basic fundamentals … it just routed me
// to the tactics page. all of this needs to be taught while in the coach tab."
// These two features must be TAUGHT in-chat, not routed away — so the tests
// prove a real answer comes OUT (a wire that does not fire is not a wire).

describe('fundamentals teaching handler', () => {
  it('recognizes fundamentals asks that had no handler before', () => {
    for (const ask of [
      'teach me basic concepts',
      'teach me the fundamentals',
      'teach me the basics',
      'what are the pieces worth',
      'how much is a knight worth',
      'opening principles',
      'basic chess strategy',
    ]) {
      expect(isFundamentalsQuestion(ask), ask).toBe(true);
    }
  });

  it('does NOT hijack opening names or single-concept lookups', () => {
    expect(isFundamentalsQuestion('teach me the Najdorf')).toBe(false);
    expect(isFundamentalsQuestion('what is a fork')).toBe(false);
    expect(isFundamentalsQuestion('teach me the Caro-Kann')).toBe(false);
    // App-surface asks stay app-help.
    expect(isFundamentalsQuestion('what does the basics tab do')).toBe(false);
  });

  it('scopes to the right sub-topic', () => {
    expect(fundamentalsTopicFromText('what are the pieces worth')).toBe('piece-values');
    expect(fundamentalsTopicFromText('teach me king safety')).toBe('king-safety');
    expect(fundamentalsTopicFromText('explain controlling the center')).toBe('center');
    expect(fundamentalsTopicFromText('teach me development')).toBe('development');
    expect(fundamentalsTopicFromText('teach me the fundamentals')).toBe('general');
  });

  it('assembles a grounded, sourced answer for every topic (never empty)', () => {
    for (const topic of ['general', 'piece-values', 'development', 'center', 'king-safety'] as const) {
      const ans = assembleFundamentalsAnswer(topic);
      expect(ans, topic).not.toBeNull();
      expect(ans!.facts.length).toBeGreaterThan(40);
      expect(ans!.sources.length).toBeGreaterThan(0);
      expect(ans!.sources.every((s) => s.startsWith('concept:'))).toBe(true);
    }
    // Piece values must state the canonical numbers (the load-bearing fact).
    expect(assembleFundamentalsAnswer('piece-values')!.facts).toMatch(/rook.*5|5.*rook/i);
  });
});

describe('weakness ask is TAUGHT in-chat, not drilled away', () => {
  it('a teach/tell/show framing of weaknesses bypasses the drill router → brain', () => {
    // null = fall through to the grounded brain (isProgressQuestion →
    // assembleWeaknessRecommendation → voiceFacts), i.e. taught in-chat.
    expect(matchTrainingAidRoute('teach me my weaknesses')).toBeNull();
    expect(matchTrainingAidRoute('tell me my weaknesses')).toBeNull();
    expect(matchTrainingAidRoute('show me my weak spots')).toBeNull();
    expect(matchTrainingAidRoute('go over my weaknesses')).toBeNull();
  });

  it('a genuine drill/practice imperative still routes to the drill', () => {
    expect(matchTrainingAidRoute('drill my weaknesses')?.aid).toBe('mistakes');
    expect(matchTrainingAidRoute('practice my weaknesses')?.aid).toBe('mistakes');
  });
});
