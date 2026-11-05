// A piece frozen in front of a mate, read on Naroditsky's Scotch Gambit game
// after 14.Bb2 ("a permanent strain that doesn't let your knight move").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findFrozenPieces, frozenPieceWords } from './frozenPiece';
import { assessPositionalEdge } from './reviewPositionalAssessment';

const GAME = 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 dxc3 Bxf7+ Kxf7 Qd5+ Kf8 Qxc5+ d6 Qxc3 Nf6 Nbd2 h6 O-O Kf7 b3 Re8 Re1 Kg8 Bb2'.split(' ');

function board(plies: number): Chess {
  const c = new Chess();
  for (const s of GAME.slice(0, plies)) c.move(s);
  return c;
}

describe('the knight on f6 held in place by the battery', () => {
  it('after 14.Bb2: queen and bishop on the long diagonal, Qxg7 mate behind, e5 the push', () => {
    const c = board(27);
    const [fp] = findFrozenPieces(c.fen(), 'w');
    expect(fp).toMatchObject({ line: 'c3', battery: 'b2', frozen: 'f6', behind: 'g7', mateSan: 'Qxg7#', escapes: ['h5'], lever: 'e5', lineName: 'the long diagonal' });
    expect(frozenPieceWords(fp, c, 'theirs')).toBe('their queen and bishop on the long diagonal hold your knight on f6 in place: if it moves anywhere but h5, Qxg7 is mate — and e5 would hit it');
  });
  it('before the bishop came to b2 there is no mate behind the knight', () => {
    expect(findFrozenPieces(board(26).fen(), 'w')).toEqual([]);
  });
  it('"you\'re still worse — why" now names it', () => {
    const a = assessPositionalEdge(board(27).fen(), 'b', -70);
    expect(a.verdict).toMatch(/worse/);
    expect(a.reasons.join(' | ')).toContain('hold your knight on f6 in place: if it moves anywhere but h5, Qxg7 is mate — and e5 would hit it');
  });
});

describe('a piece they can simply take is holding nothing', () => {
  it('3...g6 against Qh5: the pawn takes the queen, so it is not "held in place"', () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'g6']) c.move(s);
    expect(findFrozenPieces(c.fen(), 'w')).toEqual([]);
  });
});
