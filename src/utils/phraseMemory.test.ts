import { describe, it, expect } from 'vitest';
import { newPhraseMemory, sayIdea } from './phraseMemory';

describe('sayIdea — full once, then rotated references', () => {
  it('teaches in full the first time, then rotates the short forms, deterministically', () => {
    const forms = ['full', 'a', 'b'];
    const m = newPhraseMemory();
    expect([1, 2, 3, 4, 5].map(() => sayIdea(m, 'k', forms))).toEqual(['full', 'a', 'b', 'a', 'b']);
    const again = newPhraseMemory();
    expect([1, 2, 3].map(() => sayIdea(again, 'k', forms))).toEqual(['full', 'a', 'b']);
  });
  it('keys are separate ideas; no memory means the full form', () => {
    const m = newPhraseMemory();
    sayIdea(m, 'x', ['x0', 'x1']);
    expect(sayIdea(m, 'y', ['y0', 'y1'])).toBe('y0');
    expect(sayIdea(null, 'x', ['x0', 'x1'])).toBe('x0');
  });
});
