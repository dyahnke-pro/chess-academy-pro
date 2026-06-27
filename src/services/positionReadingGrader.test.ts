import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReadingQuestion } from './positionReadingService';

const getCoachChatResponse = vi.fn();
vi.mock('./coachApi', () => ({
  getCoachChatResponse: (...args: unknown[]) => getCoachChatResponse(...args),
}));

import { gradeReadingAnswer } from './positionReadingGrader';

const Q: ReadingQuestion = {
  id: 'hanging', type: 'hanging',
  prompt: 'Is anything hanging?',
  answer: 'Yes — the queen on d5 is hanging.',
  acceptTokens: ['d5', 'queen', 'hanging', 'yes'],
  negative: false,
};

beforeEach(() => { getCoachChatResponse.mockReset(); });

describe('gradeReadingAnswer (LLM layer)', () => {
  it('uses the model verdict when it returns clean JSON, but keeps the COMPUTED answer key', async () => {
    getCoachChatResponse.mockResolvedValue('{"verdict":"correct","feedback":"You saw the loose queen."}');
    const g = await gradeReadingAnswer(Q, 'the lady on d5 is loose');
    expect(g.verdict).toBe('correct');
    expect(g.note).toBe('You saw the loose queen.');
    expect(g.correctAnswer).toBe(Q.answer); // never the model's words
  });

  it('extracts the JSON from a chatty reply', async () => {
    getCoachChatResponse.mockResolvedValue('Sure! Here is my grade:\n{"verdict":"partial","feedback":"Close — name the square."} hope that helps');
    const g = await gradeReadingAnswer(Q, 'something is loose');
    expect(g.verdict).toBe('partial');
  });

  it('falls back to the deterministic grader on an unparseable reply', async () => {
    getCoachChatResponse.mockResolvedValue('I think the queen on d5 hangs, yeah');
    const g = await gradeReadingAnswer(Q, 'the queen on d5 hangs');
    // deterministic fallback finds the d5/queen token → correct
    expect(g.verdict).toBe('correct');
    expect(g.correctAnswer).toBe(Q.answer);
  });

  it('falls back to the deterministic grader when the model throws', async () => {
    getCoachChatResponse.mockRejectedValue(new Error('provider down'));
    const g = await gradeReadingAnswer(Q, 'nothing, looks safe');
    expect(g.verdict).toBe('wrong'); // deterministic: said nothing on a live position
    expect(g.correctAnswer).toContain('d5');
  });

  it('rejects an invalid verdict value and falls back', async () => {
    getCoachChatResponse.mockResolvedValue('{"verdict":"brilliant","feedback":"nice"}');
    const g = await gradeReadingAnswer(Q, 'the d5 queen');
    expect(['correct', 'partial', 'wrong']).toContain(g.verdict);
    expect(g.verdict).toBe('correct'); // deterministic finds d5
  });
});
