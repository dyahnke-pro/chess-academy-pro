import { describe, it, expect } from 'vitest';
import { transferClause, transferMotifOf, recordMotif, withTransfer, type MotifLedger } from './motifLedger';

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

describe('only a tactic motif transfers (review walks 2026-09-27)', () => {
  it('a principle identity is not a motif', () => {
    expect(transferMotifOf('rule-stem:12:development')).toBeNull();
    expect(transferMotifOf('rule:development')).toBeNull();
    expect(transferMotifOf('refuted:Nxe4')).toBeNull();
  });
  it('NEGATIVE CONTROL: a tactic identity is', () => {
    expect(transferMotifOf('motif:pin@w:g5f6d8')).toEqual({ motif: 'pin@w', instance: 'g5f6d8' });
  });
});

// Clean-pass walk 2026-10-04, G1 (SI5q0VJz): the pin of 20.Qa4 was filed as move
// 21 (the board after 20…f6 reads "21"), so 21.exf6+ said "you saw this idea on
// move 21" about itself.
describe('the student move number after the reply', () => {
  it('is the move the student just played, both seats', async () => {
    const { studentMoveAfterReply } = await import('./motifLedger');
    // after 20.Bg5+ f6 — White's move 20
    expect(studentMoveAfterReply('r6r/1n2k1pp/4pp2/n2p1bB1/Q7/P4N2/Bq3PPP/R4RK1 w - - 0 21')).toBe(20);
    // after 20…Ke7 21.Bg5+ — Black's move 20
    expect(studentMoveAfterReply('r6r/4k1pp/4pn2/n2p1bB1/Q7/P4N2/Bq3PPP/R4RK1 b - - 1 21')).toBe(20);
  });
  it('Learn files the motif under it', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).toMatch(/const moveNo = studentMoveAfterReply\(args\.fenAfterReply\);/);
  });
});
