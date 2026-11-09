// Four Knights amateur walk (2026-09-27): "Nf6 unpins your pawn on f7" — the
// f7 pawn sat in front of a DEFENDED knight on g8; that is no pin.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { quietMovePoint } from './reviewMoveTeaching';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };

describe('an unpin frees a pin that cost something', () => {
  it('Nf6 does not "unpin" f7 from a defended knight', () => {
    const point = quietMovePoint(fenAfter('e4 e5 Nf3 Nc6 Bc4'), 'Nf6') ?? '';
    expect(point).not.toMatch(/unpins/i);
  });
  it('NEGATIVE CONTROL: a knight pinned to the queen by Bg5 is freed by Be7', () => {
    const point = quietMovePoint(fenAfter('d4 d5 c4 e6 Nc3 Nf6 Bg5'), 'Be7') ?? '';
    expect(point).toMatch(/unpins/i);
  });
});

describe('the piece the unpin frees is the one that matters', () => {
  // Learn prod audit 2026-11-09, the Scandinavian: 10.Bd2 frees the knight on
  // c3 from the queen's pin to the king, and (by guarding a1) the pawn on a3
  // from its pin to the rook. The line named the pawn.
  const before = fenAfter('e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bg4 h3 Nc6 a3 O-O-O d5 e6 hxg4 exd5');
  it('Bd2 unpins the knight on c3, never "the pawn on a3"', () => {
    const point = quietMovePoint(before, 'Bd2') ?? '';
    expect(point).toMatch(/[Uu]npins your knight on c3/);
    expect(point).not.toMatch(/pawn on a3/);
  });
});
