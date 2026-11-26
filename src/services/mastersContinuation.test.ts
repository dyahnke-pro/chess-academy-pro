import { afterEach, describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { __setContinuationsForTests, continuationMovesSync } from './mastersContinuation';
import { __setLocalDbForTests, mastersMovesSync } from './masterPlayLookup';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

afterEach(() => { __setContinuationsForTests(null); __setLocalDbForTests(null); });

describe('mastersContinuation — where the book ends, rated masters go on', () => {
  const deep = fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7']);
  it('the table is read by position, whatever the move order', () => {
    __setContinuationsForTests({ [key(deep)]: [{ san: 'Nbd2', games: 9, white: 4, draws: 4, black: 1 }] });
    expect(continuationMovesSync(deep)?.[0].san).toBe('Nbd2');
    expect(continuationMovesSync(new Chess().fen())).toBeNull();
  });
  it('the book is read first; the continuation answers only where the book is silent', () => {
    const start = new Chess().fen();
    __setLocalDbForTests({ positions: { [key(start)]: [{ san: 'e4', games: 1000 }] } } as never);
    __setContinuationsForTests({ [key(start)]: [{ san: 'd4', games: 9 }], [key(deep)]: [{ san: 'Nbd2', games: 9 }] });
    expect(mastersMovesSync(start)?.[0].san).toBe('e4');
    expect(mastersMovesSync(deep)?.[0].san).toBe('Nbd2');
  });
});
