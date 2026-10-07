import { describe, expect, it } from 'vitest';
import { shareAdverb, topMoveShare } from './shareWords';

describe('shareAdverb', () => {
  it('turns a share into a frequency word at fixed edges', () => {
    expect([90, 70, 69, 45, 44, 25, 24, 1].map(shareAdverb)).toEqual(['almost always', 'almost always', 'usually', 'usually', 'often', 'often', 'sometimes', 'sometimes']);
  });
});

describe('topMoveShare', () => {
  it('says how firmly masters back the top move, and calls a split field split', () => {
    expect(topMoveShare(80)).toBe('masters almost always play it');
    expect(topMoveShare(50)).toBe('masters usually play it');
    expect(topMoveShare(30)).toBe('the most common choice, though masters are split here');
    for (const p of [80, 50, 30, 5]) expect(topMoveShare(p)).not.toMatch(/\d/);
  });
});
