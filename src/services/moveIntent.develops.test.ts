import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { phraseIntentForTest as phrase, whatItDoes } from './moveIntent';

// Prod walk 2026-10-18 (Learn, Scandinavian): "They play d4 first, so that
// bishop to d2 can bring the bishop into the game" — the bishop named twice,
// and the square it leaves never said. A development step is said as what the
// pawn move FREED.
describe('a pawn move that frees a minor piece', () => {
  // 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qa5 4.d4 — d4 opens c1 for Bd2.
  const c = new Chess();
  for (const m of ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4']) c.move(m);
  const fenAfter = c.fen();

  it('whatItDoes names the piece and the square it leaves', () => {
    expect(whatItDoes(fenAfter, 'c1d2', 'w')?.develops).toEqual({ piece: 'bishop', from: 'c1' });
  });

  it('their move: frees the bishop on c1, never "bring the bishop" after naming it', () => {
    const does = whatItDoes(fenAfter, 'c1d2', 'w');
    const said = phrase('d4', null, { san: 'Bd2', uci: 'c1d2' } as never, 'opponent', 'w', fenAfter, does);
    expect(said).toMatch(/free their bishop on c1 for Bd2|frees their bishop on c1 to come out with Bd2/);
    expect(said).not.toMatch(/bring the bishop/);
  });

  it('your move: the same, in your seat', () => {
    const does = whatItDoes(fenAfter, 'c1d2', 'w');
    const said = phrase('d4', null, { san: 'Bd2', uci: 'c1d2' } as never, 'student', 'w', fenAfter, does);
    expect(said).toMatch(/your bishop on c1/);
    expect(said).not.toMatch(/bring the bishop/);
  });
});
