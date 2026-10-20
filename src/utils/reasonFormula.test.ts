import { describe, it, expect } from 'vitest';
import { reasonFormula } from './reasonFormula';

describe('reasonFormula', () => {
  it('one reason on two boards is one formula', () => {
    expect(reasonFormula('Their bishop on c1 is tied down now: you hit the pawn on b2 once and it is guarded once — the bishop is the guard that holds it.'))
      .toBe(reasonFormula('Their pawn on d3 is tied down now: you hit the pawn on c4 once and it is guarded once — the pawn is the guard that holds it.'));
  });
  it('a count said as a word is a count ("once and … once" vs "twice and … twice")', () => {
    expect(reasonFormula('Their pawn on d6 is tied down now: you hit the pawn on c5 once and it is guarded once.'))
      .toBe(reasonFormula('Their rook on a8 is tied down now: you hit the pawn on a6 twice and it is guarded twice.'));
  });
  it('different reasons stay different', () => {
    expect(reasonFormula('Their bishop on c1 is tied down now: you hit the pawn on b2 once and it is guarded once.'))
      .not.toBe(reasonFormula('Their bishop reaches c5 because your b-pawn hasn\'t moved: on b4 it would cover that square.'));
  });
  it('a short sentence has no formula', () => {
    expect(reasonFormula('Check.')).toBeNull();
  });
});
