import { describe, it, expect } from 'vitest';
import { sayMoveNoun } from './spokenMove';

describe('a pawn capture names its file (walk 2026-09-27: fxg3 vs hxg3)', () => {
  it('fxg3 and hxg3 read differently', () => {
    expect(sayMoveNoun('fxg3', null)).toBe('the f-pawn taking on g3');
    expect(sayMoveNoun('hxg3', null)).toBe('the h-pawn taking on g3');
  });
  it('NEGATIVE CONTROL: a pawn push and a piece capture are unchanged', () => {
    expect(sayMoveNoun('e4', null)).toBe('the pawn to e4');
    expect(sayMoveNoun('Nxg5', null)).toMatch(/knight taking on g5/);
  });
});
