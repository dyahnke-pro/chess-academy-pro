import { describe, it, expect } from 'vitest';
import { transferClause, recordMotif, withTransfer, type MotifLedger } from './motifLedger';

describe('motifLedger — same idea as move N', () => {
  it('refers back to the first move the motif was taught, for a NEW instance', () => {
    const l: MotifLedger = new Map();
    recordMotif('fork', 'c7a8e8', 12, l);
    recordMotif('fork', 'd6b7f7', 20, l);
    expect(transferClause('fork', 'd6b7f7', 20, l)).toMatch(/move 12\b/);
    expect(transferClause('fork', 'd6b7f7', 20, l)).toBe(transferClause('fork', 'd6b7f7', 20, l));
    expect(new Set([13, 14, 15, 16].map((n) => transferClause('fork', 'x', n, l))).size).toBeGreaterThan(1);
  });
  it('NEGATIVE CONTROL: a new motif, the same move, or the SAME standing instance refers to nothing', () => {
    const l: MotifLedger = new Map([['fork', { move: 12, instance: 'c7a8e8' }]]);
    expect(transferClause('pin', 'x', 20, l)).toBe('');
    expect(transferClause('fork', 'd6b7f7', 12, l)).toBe('');
    // THE TAPE: the pin from move 3 still standing on move 4 is not a transfer.
    expect(transferClause('fork', 'c7a8e8', 13, l)).toBe('');
  });
  it('the reference lives INSIDE its sentence, so it can never be orphaned', () => {
    expect(withTransfer("There's a pin here for you. Remember — a pin freezes.", ' — the same idea as move 3'))
      .toBe("There's a pin here for you — the same idea as move 3. Remember — a pin freezes.");
    expect(withTransfer('No phrase.', '')).toBe('No phrase.');
    expect(withTransfer('No terminal', ' — x')).toBe('No terminal — x.');
  });
});
