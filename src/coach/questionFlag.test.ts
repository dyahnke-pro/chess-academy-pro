import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ name: string; props: Record<string, unknown> }> = [];
vi.mock('../services/analytics', () => ({ captureEvent: (name: string, props: Record<string, unknown>) => captured.push({ name, props }) }));
const { noteTurnOutcome, resetQuestionFlags, FLAG_LINE } = await import('./questionFlag');

describe('a question still not understood after "say it another way" is flagged (David 2026-10-18)', () => {
  beforeEach(() => { resetQuestionFlags(); captured.length = 0; });
  it('the first miss asks again; the second is flagged and recorded with both tries', () => {
    expect(noteTurnOutcome('coach-teach', 'wat is the zorbl move', true)).toBeNull();
    expect(noteTurnOutcome('coach-teach', 'the zorbl one', true)).toBe(FLAG_LINE);
    expect(captured).toEqual([{ name: 'coach_question_flagged', props: { surface: 'coach-teach', question: 'the zorbl one', first_try: 'wat is the zorbl move' } }]);
  });
  it('NEGATIVE CONTROL: an answered turn between two misses resets it', () => {
    noteTurnOutcome('coach-teach', 'a', true);
    noteTurnOutcome('coach-teach', 'what is the best move', false);
    expect(noteTurnOutcome('coach-teach', 'b', true)).toBeNull();
    expect(captured).toEqual([]);
  });
  it('the line never says "I"', () => {
    expect(FLAG_LINE).not.toMatch(/\bI\b/);
  });
});

describe('only a "did not understand" counts as a miss', () => {
  it('the catch-all line and the stock fallback are misses; a clarification is not', async () => {
    const { isNotUnderstood } = await import('./questionFlag');
    expect(isNotUnderstood('Not sure what you mean — could you say it another way?', false)).toBe(true);
    expect(isNotUnderstood('anything', true)).toBe(true);
    expect(isNotUnderstood('There is no board on this screen. Open a game and ask again.', false)).toBe(false);
  });
});
