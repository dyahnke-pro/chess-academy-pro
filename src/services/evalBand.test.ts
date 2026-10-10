import { describe, it, expect } from 'vitest';
import { evalBand, evalBandWords } from './evalBand';

describe('evalBand — the approved ladder', () => {
  it('0.5 / 1.5 / 3.0', () => {
    expect(evalBand(40)).toBe('level');
    expect(evalBand(-49)).toBe('level');
    expect(evalBand(50)).toBe('slightly');
    expect(evalBand(120)).toBe('slightly');
    expect(evalBand(-150)).toBe('clearly');
    expect(evalBand(299)).toBe('clearly');
    expect(evalBand(300)).toBe('decisive');
  });
  it('words', () => {
    expect(evalBandWords('slightly', 'better')).toBe('slightly better');
    expect(evalBandWords('clearly', 'worse')).toBe('clearly worse');
    expect(evalBandWords('decisive', 'worse')).toBe('losing');
  });
});
