// Gap B1 — move order read off the board.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { orderByThreat } from './orderByThreat';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('orderByThreat', () => {
  it('the Najdorf: …a6 before …e5, because …e5 at once allows Bg5 pinning the knight to the queen', () => {
    const p = orderByThreat(after(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3']), 'a6', ['Be3', 'e5'], true);
    expect(p).toEqual({ follow: '…e5', answer: 'Bg5', would: 'would pin your knight on f6 against your queen on d8', squares: ['e5', 'g5', 'f6', 'd8'] });
  });
  it('says nothing when the follow-up allows nothing new', () => {
    expect(orderByThreat(after(['e4', 'e5']), 'Nf3', ['Nc6', 'Bc4'], true)).toBeNull();
  });
  it('says nothing at the end of a line', () => {
    expect(orderByThreat(new Chess().fen(), 'e4', [], true)).toBeNull();
  });
});
