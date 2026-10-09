import { describe, it, expect } from 'vitest';
import { isTypingTarget } from './isTypingTarget';

describe('isTypingTarget', () => {
  it('a text field is a typing target', () => {
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
  });
  it('the page is not', () => {
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });
});
