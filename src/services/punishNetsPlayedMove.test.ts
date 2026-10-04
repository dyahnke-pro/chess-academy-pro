import { describe, it, expect } from 'vitest';
import { punishmentOf } from './inaccuracyCall';

// Clean-pass review walk 2026-10-04, G1 41.Qxe5+: "it let them win a piece for
// a pawn" — Qxe5+ took their QUEEN; Kxd7 only takes a rook back (and walks
// into Qbc7#). What a move "let them" win is netted over the WHOLE exchange,
// the played move's own capture included.
describe('a cost clause counts what the played move took', () => {
  const FEN = '1Q1nk2r/3R2pp/8/3Bq3/8/P6P/5PP1/6K1 w - - 0 41';
  it('taking the queen and losing a rook is no loss', () => {
    for (const line of [['e8d7', 'b8c7'], ['e8d7', 'd5f7', 'g7g6', 'f7g6']]) {
      const p = punishmentOf(FEN, 'Qxe5+', line, 'white');
      expect(p?.why ?? '').not.toMatch(/^win|take your/);
    }
  });
});
