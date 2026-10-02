import { describe, it, expect } from 'vitest';
import { explainNotationSymbol } from './groundedAnswer';

describe('explainNotationSymbol — one symbol, not a move (real users 2026-10)', () => {
  it.each([
    ['What does G mean?', /g-file/],
    ['what does N stand for', /knight/],
    ['what does the x mean', /capture/],
    ['What does + mean?', /check/],
    ['what is G', /g-file/],
    ['what does O-O mean', /castling kingside/],
  ])('%s', (q, re) => expect(explainNotationSymbol(q)).toMatch(re));
  it.each(['what is a fork', 'what does e4 mean', 'what is the best move', 'what is a'])('%s → not a symbol ask', (q) => {
    expect(explainNotationSymbol(q)).toBeNull();
  });
});
