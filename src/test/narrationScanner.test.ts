import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { scanLine } from './narrationScanner';

// 1.e4 d5 2.exd5 — White's pawn took the d5 pawn.
const before = (() => { const c = new Chess(); c.move('e4'); c.move('d5'); return c.fen(); })();
const after = (() => { const c = new Chess(before); c.move('exd5'); return c.fen(); })();
const ctx = { game: 't', ply: 3, san: 'exd5', line: '' };

describe('narrationScanner — a capture clause names the piece that WAS there', () => {
  it('passes a true capture clause on the landing square', () => {
    expect(scanLine('It won the pawn on d5.', after, 'w', ctx, before)).toEqual([]);
  });
  it('still fails a capture clause that names the wrong piece', () => {
    const v = scanLine('It won the knight on d5.', after, 'w', ctx, before);
    expect(v.map((x) => x.rule)).toEqual(['phantom-piece']);
  });
  it('still judges a NON-capture claim about the landing square on the board after', () => {
    // After exd5 a WHITE pawn stands on d5, so "their pawn on d5" is a seat error.
    const v = scanLine('Their pawn on d5 is strong.', after, 'w', ctx, before);
    expect(v.map((x) => x.rule)).toEqual(['seat-error']);
  });
  it('without fenBefore it behaves exactly as before (judged on the board after)', () => {
    const v = scanLine('It won the knight on d5.', after, 'w', ctx);
    expect(v.map((x) => x.rule)).toEqual(['phantom-piece']);
  });
});

describe('narrationScanner — a future-tense plan is judged on the board after', () => {
  it('"win their pawn on d5" after exd5 is a claim about the board after the move', () => {
    // After 1.e4 d5 2.exd5 the d5 pawn is White's: for a BLACK student it is "their" pawn.
    const v = scanLine('The plan is to win their pawn on d5.', after, 'b', ctx, before);
    expect(v).toEqual([]);
  });
});
