// Gap D1 — the pawn structure by name, with its plans, said when it forms.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { namedStructureFormed, namedStructureLine } from './namedStructure';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('namedStructureFormed', () => {
  it('3.e5 makes the French chain, said from Black\'s seat with both plans', () => {
    const s = namedStructureFormed(after(['e4', 'e6', 'd4', 'd5']), 'e5');
    expect(s?.name).toBe('french-chain');
    expect(namedStructureLine(s!, 'b')).toBe('That makes it the French pawn chain. Your plan is to hit the chain at its base with …c5, then at its head with …f6. Theirs is to use the space the chain gives on the kingside and attack there with f4 and f5');
  });
  it('the QGD exchange makes the Carlsbad structure', () => {
    expect(namedStructureFormed(after(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5']), 'exd5')?.name).toBe('carlsbad');
  });
  it('d5 against …e5 makes the King\'s Indian chain', () => {
    expect(namedStructureFormed(after(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5']), 'd5')?.name).toBe('kid-chain');
  });
  it('is said once, when the move creates it, never on a move after', () => {
    expect(namedStructureFormed(after(['e4', 'e6', 'd4', 'd5', 'e5']), 'c5')).toBeNull();
  });
  it('a structure that is not on the board is never named', () => {
    expect(namedStructureFormed(new Chess().fen(), 'e4')).toBeNull();
  });
});
