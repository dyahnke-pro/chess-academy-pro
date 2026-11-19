// wonEnding — why a proven pawn-ending win is won. Each shape on a real board
// the solver proves won, the seat words checked, and negative controls: a
// proven draw, a board with pieces, and a won board with no named shape say
// nothing.
import { describe, expect, it } from 'vitest';
import { wonEnding, kingInSquare, pushesToQueen } from './wonEnding';
import { kpVerdict } from './kpSolver';
import { readBoardAll } from './boardComputers';
import { kpResultChange } from './futures';

const B = 400;

describe('the square of the pawn (counting)', () => {
  it('the double step from the start rank counts', () => {
    expect(pushesToQueen('a2', 'w')).toBe(5);
    expect(pushesToQueen('a5', 'w')).toBe(3);
    expect(pushesToQueen('h7', 'b')).toBe(5);
  });
  it('whose move it is moves the square by one', () => {
    // a5 against Ke8: in the square with Black to move, outside with White to move.
    expect(kingInSquare('e8', 'a5', 'w', false)).toBe(true);
    expect(kingInSquare('e8', 'a5', 'w', true)).toBe(false);
  });
});

describe('wonEnding: the shape that wins', () => {
  it('the pawn runs: their king outside its square', () => {
    const fen = '7k/8/8/P7/8/8/8/7K w - - 0 1';
    expect(kpVerdict(fen, B)?.value).toBe('white');
    const r = wonEnding(fen, 'w', B);
    expect(r?.reason).toBe('outsideSquare');
    expect(r?.text).toContain('a-pawn');
    expect(r?.squares).toEqual(['a5', 'a8', 'h8']);
    // From the other seat the words turn round.
    expect(wonEnding(fen, 'b', B)?.text).toMatch(/your king|Your king/);
  });

  it('two connected passers the king cannot take', () => {
    // f5 guards g6; taking f5 leaves the king outside g6's square.
    const r = wonEnding('8/4k3/6P1/5P2/8/8/8/K7 b - - 0 1', 'w', B);
    expect(r?.reason).toBe('connected');
    expect(r?.text).toContain('f5 and g6');
  });

  it('the king on a key square', () => {
    const r = wonEnding('4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', 'w', B);
    expect(r?.reason).toBe('keySquare');
    expect(r?.text).toContain('e6');
  });

  it('an extra pawn with the opposition', () => {
    const r = wonEnding('8/4k3/8/4K3/4P3/8/8/8 b - - 0 1', 'w', B);
    expect(r?.reason).toBe('opposition');
    expect(r?.text).toContain('d6, e6 or f6, each a key square');
  });

  it('the outside passed pawn drags the king away', () => {
    const fen = '8/8/4k3/7p/P6P/4K3/8/8 w - - 0 1';
    expect(kpVerdict(fen, B)?.value).toBe('white');
    const r = wonEnding(fen, 'w', B);
    expect(r?.reason).toBe('outsidePasser');
    expect(r?.text).toContain('on the kingside');
    // The loser's seat: theirs is the outside passer.
    expect(wonEnding(fen, 'b', B)?.text).toMatch(/^Their a-pawn/);
  });

  it('a protected passer ties their king down', () => {
    // d5 guarded by c4, against their b-pawn (c4 is not passed: no connected pair).
    const fen = '8/8/1p6/3P1k2/2P5/8/8/4K3 w - - 0 1';
    expect(kpVerdict(fen, B)?.value).toBe('white');
    const r = wonEnding(fen, 'w', B);
    expect(r?.reason).toBe('protectedPasser');
    expect(r?.text).toContain('d5 is protected by the pawn on c4');
  });
});

describe('wonEnding: says nothing without a proven win and a shape', () => {
  it('a proven draw', () => {
    expect(kpVerdict('3k4/8/8/P7/8/8/8/7K b - - 0 1', B)?.value).toBe('draw');
    expect(wonEnding('3k4/8/8/P7/8/8/8/7K b - - 0 1', 'w', B)).toBeNull();
    expect(wonEnding('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', 'w', B)).toBeNull();
  });
  it('a board with a piece on it', () => {
    expect(wonEnding('7k/8/8/P7/8/8/8/R6K w - - 0 1', 'w', B)).toBeNull();
  });
  it('a won board with no named shape: the king two squares from a lone pawn on its start rank', () => {
    // K+P v K won (the king reaches a key square first) but nothing of the
    // shapes stands on the board yet.
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    expect(kpVerdict(fen, B)?.value).toBe('white');
    expect(wonEnding(fen, 'w', B)).toBeNull();
  });
});

describe('wired', () => {
  it('the board computer reads it, the record filed for the student to move', () => {
    const facts = readBoardAll('wonEndingRead', { fen: '7k/8/8/P7/8/8/8/7K w - - 0 1', student: 'w' });
    expect(facts[0]?.computer).toBe('wonEnding');
    expect(facts[0]?.skill).toBe('botched-conversion');
    // Their win, my move: no question posed to me.
    expect(readBoardAll('wonEndingRead', { fen: '7k/8/8/P7/8/8/8/7K w - - 0 1', student: 'b' })[0]?.skill).toBeUndefined();
  });
  it('a pawn ending lost by force says why the other side wins', () => {
    // Black to move: …Kg7 heads for the pawn; …Kh7?? lets the a-pawn run.
    const fen = '8/5k2/8/8/P7/8/8/7K b - - 0 1';
    const r = kpResultChange({ fen, student: 'b', other: 'your',
      tryLine: { moves: ['f7g8', 'a4a5'], cp: null, mate: null },
      bestLine: { moves: ['f7e7', 'a4a5'], cp: null, mate: null } });
    // f7→g8 leaves the square of the a-pawn; e7 stays in it.
    expect(r?.kind).toBe('lost');
    expect(r?.text).toBe('That loses the pawn ending by force. Their a-pawn simply runs: your king stands outside its square and never reaches a8 in time. …Ke7 would have held the draw.');
  });
});
