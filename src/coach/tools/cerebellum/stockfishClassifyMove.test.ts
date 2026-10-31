import { describe, it, expect } from 'vitest';
import { classifyEvalSwing } from './stockfishClassifyMove';

describe('classifyEvalSwing', () => {
  it('returns "neutral" when either eval is missing', () => {
    expect(classifyEvalSwing(null, 10, 'w')).toBe('neutral');
    expect(classifyEvalSwing(10, null, 'w')).toBe('neutral');
  });

  it('classifies a big positive swing for White as excellent', () => {
    expect(classifyEvalSwing(0, 120, 'w')).toBe('excellent');
  });

  it('classifies a big negative swing for White as blunder', () => {
    expect(classifyEvalSwing(0, -400, 'w')).toBe('blunder');
  });

  it('inverts perspective for Black', () => {
    expect(classifyEvalSwing(0, 400, 'b')).toBe('blunder');
    expect(classifyEvalSwing(0, -400, 'b')).toBe('excellent');
  });

  it('uses "book" for tiny swings', () => {
    expect(classifyEvalSwing(10, 15, 'w')).toBe('book');
  });
});
