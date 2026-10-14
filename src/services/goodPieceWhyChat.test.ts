// A good piece answered in chat carries the same why Learn speaks (2026-10-14).
import { describe, it, expect } from 'vitest';
import { assemblePositionalAnswer } from './groundedAnswer';

describe('"is my rook good?" says why it matters', () => {
  it('a rook on the open d-file: the verdict and the reason', () => {
    const a = assemblePositionalAnswer('3k4/ppp2ppp/8/8/8/8/PPP2PPP/3RK3 w - - 0 1', 'white', 'piece', 'is my rook on d1 good?');
    expect(a?.facts).toMatch(/^Good — your rook on d1: .*, and that matters because a rook needs an open file to reach their camp\.$/);
  });
});
