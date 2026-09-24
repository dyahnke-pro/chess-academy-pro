import { describe, it, expect } from 'vitest';
import { transferClause, recordMotif } from './motifLedger';

describe('motifLedger — same idea as move N', () => {
  it('refers back to the first move the motif was taught', () => {
    const l = new Map<string, number>();
    recordMotif('fork', 12, l);
    recordMotif('fork', 20, l);
    expect(transferClause('fork', 20, l)).toBe(' Same idea as move 12.');
  });
  it('NEGATIVE CONTROL: a new motif, or the same move, refers to nothing', () => {
    const l = new Map<string, number>([['fork', 12]]);
    expect(transferClause('pin', 20, l)).toBe('');
    expect(transferClause('fork', 12, l)).toBe('');
  });
});
