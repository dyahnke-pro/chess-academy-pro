import { describe, expect, it } from 'vitest';
import { shareAdverb } from './shareWords';

describe('shareAdverb', () => {
  it('turns a share into a frequency word at fixed edges', () => {
    expect([90, 70, 69, 45, 44, 25, 24, 1].map(shareAdverb)).toEqual(['almost always', 'almost always', 'usually', 'usually', 'often', 'often', 'sometimes', 'sometimes']);
  });
});
