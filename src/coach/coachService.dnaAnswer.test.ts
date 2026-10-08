import { describe, expect, it } from 'vitest';
import { dnaOnAnswer } from './coachService';

const ans = (text: string, servedIntent?: string) => ({ text, toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek' as const, ...(servedIntent ? { servedIntent } : {}) });

describe('the DNA on the written answer (2026-10-08)', () => {
  it('a move number is rephrased away and praise is cut, the teaching kept', () => {
    const a = dnaOnAnswer(ans('Great move! After 12.Nf3 the knight eyes e5.'), 'game-chat');
    expect(a.text).toBe('After Nf3 the knight eyes e5.');
  });
  it('an answer about the app keeps its interface words', () => {
    const a = dnaOnAnswer(ans('Tap the Resume button to continue.', 'app-help'), 'teach');
    expect(a.text).toBe('Tap the Resume button to continue.');
  });
  it('never blanks an answer', () => {
    const a = dnaOnAnswer(ans('Great move!'), 'teach');
    expect(a.text).toBe('Great move!');
  });
});
