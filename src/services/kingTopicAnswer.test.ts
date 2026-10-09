import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assemblePositionalAnswer } from './groundedAnswer';

const fenAfter = (line: string): string => { const c = new Chess(); for (const m of line.split(' ')) c.move(m); return c.fen(); };

describe('"is my king safe?" says only what is true (walk 5)', () => {
  it('a king in the centre behind its pawns is not "compromised"', () => {
    const a = assemblePositionalAnswer(fenAfter('e4 e5 Nf3 Nc6'), 'white', 'king', 'is my king safe?')!.facts;
    expect(a).not.toMatch(/compromised|exposed/);
    expect(a).toMatch(/still in the centre — castling soon tucks it away\.$/);
  });
  it('names a file beside the king with none of its pawns', () => {
    const a = assemblePositionalAnswer(fenAfter('e4 d5 exd5 Qxd5'), 'white', 'king', 'is my king safe?')!.facts;
    expect(a).toMatch(/e-file/);
  });
  it('a castled king behind its pawns adds no castling advice', () => {
    const a = assemblePositionalAnswer(fenAfter('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6'), 'white', 'king', 'is my king safe?')!.facts;
    expect(a).not.toMatch(/castling soon/);
  });
});
