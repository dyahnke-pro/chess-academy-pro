// WO-LAYERS-01 step 7 — when, not just what.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readTiming, timingClause } from './moveTiming';

const fen = (moves: string[]): string => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };

describe('readTiming', () => {
  it('Nd5 after …e5 is right; a move earlier …exd5 won the knight', () => {
    const t = readTiming(fen(['e4', 'e6', 'Nc3', 'a6']), fen(['e4', 'e6', 'Nc3', 'a6', 'Nf3', 'e5']), 'Nd5');
    expect(t).toEqual({ san: 'Nd5', reply: 'exd5', piece: 'n', square: 'd5' });
    expect(timingClause(t!)).toBe('Nd5 now, not a move earlier — then exd5 would have won your knight on d5');
  });

  it('negative control: a move that was safe a turn earlier too has no timing point', () => {
    expect(readTiming(fen(['e4', 'e5']), fen(['e4', 'e5', 'Nf3', 'Nc6']), 'Bc4')).toBeNull();
  });

  it('a move that was not legal a turn earlier has nothing to compare', () => {
    expect(readTiming(fen(['e4', 'e5']), fen(['e4', 'e5', 'Nf3', 'Nc6']), 'Ng5')).toBeNull();
  });
});
