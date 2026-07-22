// The board-delta computer — no silent moves (David 2026-07-22: "the package
// must contain every relevant change that took place on the board"). Each
// class pinned on the canonical teaching example it exists for.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeBoardDelta } from './boardDelta';

describe('computeBoardDelta — every relevant change, computed', () => {
  it('UNCOVERS: 1.d4 opens the c1 bishop\'s diagonal', () => {
    const clauses = computeBoardDelta(new Chess().fen(), 'd4');
    expect(clauses.join(' | ')).toMatch(/bishop on c1's line just opened — it now reaches h6/);
  });

  it('BLOCKS: 2.Ne2 shuts in the f1 bishop', () => {
    const c = new Chess();
    c.move('e4'); c.move('e5');
    const clauses = computeBoardDelta(c.fen(), 'Ne2');
    expect(clauses.join(' | ')).toMatch(/shuts in the bishop on f1 — its line past e2 is closed/);
  });

  it('ABANDONS: the knight walks away from the pawn it guarded', () => {
    const clauses = computeBoardDelta('k7/8/8/8/P7/2N5/8/K7 w - - 0 1', 'Nd5');
    expect(clauses.join(' | ')).toMatch(/walks away from the pawn on a4/);
    expect(clauses.join(' | ')).toMatch(/standing invitation/);
  });

  it('WEAKENS: ...g6 gives up f6 and h6 for good in front of the castled king', () => {
    const clauses = computeBoardDelta('6k1/6pp/8/8/8/8/8/6K1 b - - 0 1', 'g6');
    expect(clauses.join(' | ')).toMatch(/gives up f6 and h6 for good/);
    expect(clauses.join(' | ')).toMatch(/pawns don't move back/);
  });

  it('RIGHTS: an early king move gives up castling for good', () => {
    const c = new Chess();
    c.move('e4'); c.move('e5');
    const clauses = computeBoardDelta(c.fen(), 'Ke2');
    expect(clauses.join(' | ')).toMatch(/gives up castling for good/);
  });

  it('RIGHTS: a rook lift gives up one side only', () => {
    const c = new Chess();
    c.move('h4'); c.move('e5'); c.move('Rh3');
    // White still has queenside rights — only short castling is gone.
    const after = new Chess(c.fen());
    void after;
    const b = new Chess();
    b.move('h4'); b.move('e5');
    const clauses = computeBoardDelta(b.fen(), 'Rh3');
    expect(clauses.join(' | ')).toMatch(/gives up castling short/);
  });

  it('stays quiet on a move that changes none of the tracked classes', () => {
    // 1.Nc3 from the start: no slider unblocked meaningfully (b1 vacated sits
    // on no slider's line), nothing abandoned, no pawn, rights intact.
    const clauses = computeBoardDelta(new Chess().fen(), 'Nc3');
    expect(clauses).toEqual([]);
  });
});
