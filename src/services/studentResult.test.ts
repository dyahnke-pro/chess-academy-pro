import { describe, it, expect } from 'vitest';
import { relativeResult, RESULT_LABEL } from './studentResult';

describe("relativeResult — the student's outcome from either score form (D-13)", () => {
  it("reads a raw PGN score from the student's seat", () => {
    expect(relativeResult('1-0', 'white')).toBe('win');
    expect(relativeResult('1-0', 'black')).toBe('loss');
    expect(relativeResult('0-1', 'black')).toBe('win');
    expect(relativeResult('0-1', 'white')).toBe('loss');
    expect(relativeResult('1/2-1/2', 'white')).toBe('draw');
    expect(relativeResult('½-½', 'black')).toBe('draw');
  });
  it('passes a student-relative result through regardless of seat', () => {
    expect(relativeResult('win', 'black')).toBe('win');
    expect(relativeResult('loss', 'white')).toBe('loss');
  });
  it('never claims a win for an unrecognised score', () => {
    expect(relativeResult('*', 'white')).toBe('draw');
    expect(RESULT_LABEL[relativeResult('', 'black')]).toBe('Draw');
  });
});
