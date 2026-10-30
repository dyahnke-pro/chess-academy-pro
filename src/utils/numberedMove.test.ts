import { describe, it, expect } from 'vitest';
import { numberedLine, numberedMove } from './numberedMove';

describe('numberedMove', () => {
  it('numbers a move the way a reader knows it', () => {
    expect(numberedMove(0, 'e4')).toBe('1.e4');
    expect(numberedMove(1, 'e5')).toBe('1…e5');
    expect(numberedMove(20, 'O-O')).toBe('11.O-O');
  });
});

describe('numberedLine', () => {
  it('numbers each White move, and the first move when it is Black\'s', () => {
    expect(numberedLine(20, ['O-O', 'Nbd7', 'Re1', 'O-O'])).toBe('11.O-O Nbd7 12.Re1 O-O');
    expect(numberedLine(21, ['Nbd7', 'Re1', 'O-O'])).toBe('11…Nbd7 12.Re1 O-O');
    expect(numberedLine(0, [])).toBe('');
  });
});
