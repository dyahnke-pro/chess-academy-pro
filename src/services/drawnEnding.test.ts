import { describe, expect, it } from 'vitest';
import { drawnEnding } from './drawnEnding';
import { endgameVerdict } from './endgameVerdict';

const level = (moves: string[]) => [{ moves, cp: 0, mate: null }];

// Boards from his refuted tries (the board the try's line reaches), each with
// the engine's own level line on it.
describe('drawnEnding', () => {
  // the-importance-of-solving-studies#0, Kf1 (Danya: "is obviously a draw"):
  // White two pawns up, the bishops on opposite colours.
  it('opposite-coloured bishops two pawns up hold', () => {
    const r = drawnEnding('8/1B6/1k6/2b5/8/6PP/8/5K2 w - - 1 9', [{ moves: ['f1g2', 'b6c7'], cp: 6, mate: null }], 'w');
    expect(r?.reason).toBe('oppositeBishops');
    expect(r?.side).toBe('b');
    expect(r?.text).toBe('The bishops are of opposite colours, so your two extra pawns are not enough: their bishop and king hold the dark squares in front of them, and your bishop can never touch those.');
  });

  // modern-chess-technique#2, Ng7 (Danya: "is a draw!"): once the f-pawn goes
  // White is left with a lone knight.
  it('a lone knight cannot mate', () => {
    const r = drawnEnding('8/8/8/5k2/K7/8/8/6N1 w - - 0 80', level(['a4b5', 'f5g4']), 'w');
    expect(r?.reason).toBe('cannotMate');
    expect(r?.text).toBe('Your last pawn is gone, and a lone knight cannot force mate: you cannot win this.');
  });

  // the-importance-of-solving-studies#0 (Danya: "a corner pawn of the right
  // colour" is the win; the wrong one is the draw).
  it('the wrong bishop for the rook pawn, their king in the corner', () => {
    const r = drawnEnding('7k/8/7P/8/8/3B4/8/6K1 w - - 0 1', level(['g1g2', 'h8g8']), 'w');
    expect(r?.reason).toBe('wrongBishop');
    expect(r?.text).toContain('it can never cover h8');
    // The right bishop is no draw.
    expect(drawnEnding('7k/8/7P/8/8/4B3/8/6K1 w - - 0 1', level(['g1g2', 'h8g8']), 'w')).toBeNull();
  });

  it('a rook pawn and the king in front', () => {
    expect(drawnEnding('k7/8/K7/P7/8/8/8/8 b - - 0 1', level(['a8b8', 'a6b6']), 'b')?.reason).toBe('rookPawn');
  });

  it('one pawn, their king in front of it', () => {
    const r = drawnEnding('4k3/8/8/4P3/4K3/8/8/8 b - - 0 1', level(['e8e7', 'e4f5']), 'w');
    expect(r?.reason).toBe('kingInFront');
    expect(r?.text).toBe('Their king stands in front of the e-pawn: with the king blocking it, one pawn is not enough to win.');
  });

  it('a rook each, one pawn up, every pawn on one wing', () => {
    expect(drawnEnding('6k1/5pp1/7p/8/8/6PP/5PK1/r6R w - - 0 1', level(['h1h2', 'a1a2']), 'w')).toBeNull(); // level material
    const r = drawnEnding('6k1/5p2/6p1/8/8/6PP/5PK1/r6R w - - 0 1', level(['h1h2', 'a1a2']), 'b');
    expect(r?.reason).toBe('oneWing');
    expect(r?.side).toBe('b');
  });

  it('says nothing when the engine line is not level', () => {
    expect(drawnEnding('8/1B6/1k6/2b5/8/6PP/8/5K2 w - - 1 9', [{ moves: ['f1g2'], cp: 250, mate: null }], 'w')).toBeNull();
  });

  it('endgameVerdict carries the draw, held by the side behind', () => {
    const v = endgameVerdict('8/1B6/1k6/2b5/8/6PP/8/5K2 w - - 1 9', [{ moves: ['f1g2', 'b6c7'], cp: 6, mate: null }], 'w');
    expect(v?.kind).toBe('drawn');
    expect(v?.draw).toBe('oppositeBishops');
    expect(v?.side).toBe('b');
  });

  // a-guide-to-underpromotion#0, Kc5: the rook checks a king away from a pawn
  // on c7. That is no "maneuvering on a dead board".
  it('no "nothing can be forced" over checks and a pawn on the seventh', () => {
    const L = [{ moves: ['c5c6', 'd2c2', 'c6b7', 'a1b1', 'b7b8', 'c2c3', 'c7c8q', 'c3c8'], cp: 0, mate: null }];
    expect(endgameVerdict('8/2P5/8/2K5/8/8/3r4/k7 w - - 3 3', L, 'w')).toBeNull();
  });
});
