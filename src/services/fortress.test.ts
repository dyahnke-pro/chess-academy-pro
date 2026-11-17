import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { fortress, fortressLine, fortressSquares } from './fortress';
import { readBoard } from './boardComputers';

const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

// Every board below is a real position from a Lichess puzzle's line
// (`src/data/puzzles.json`); the move is either the puzzle's own or a legal
// alternative on that board. The engine lines are Stockfish 16, depth 20,
// from the board after the move, White-POV.

// Puzzle 05jP1 (master, endgame), after …g6: the solution hxg6 wins (+35);
// Bxg6 instead leaves the light bishop and the h-pawn against a pawn on h6,
// and the engine reads a draw.
const B_05JP1 = '7k/8/3K2pp/7P/4B3/8/8/8 w - - 0 71';
const BXG6_REPLIES = [
  { cp: 6, mate: null, moves: ['h8g8', 'd6e6', 'g8g7', 'g6b1', 'g7g8', 'e6f6'] },
  { cp: 6, mate: null, moves: ['h8g7', 'd6e7', 'g7h8', 'e7f6', 'h8g8', 'g6b1'] },
];
const HXG6_REPLIES = [{ cp: 3507, mate: null, moves: ['h6h5', 'd6e6', 'h8g7', 'e6f5', 'g7f8', 'f5f6'] }];

// Puzzle 0E3g5 (master, bishop ending), after …f4: the solution g4 wins
// (+6); Bxd5 leaves both their pawns on dark squares, a draw.
const B_0E3G5 = '8/5B2/5p2/3pk3/5p1P/6P1/3K4/8 w - - 0 61';

// Puzzle 01oWi (bishop ending), the board before the solution b6: c6 instead
// leaves White's pawns on light squares against the dark bishop — a draw for
// the side a piece down.
const B_01OWI = '8/p7/8/1PP1p3/4K3/2b3k1/8/8 w - - 0 49';

// Puzzle 02Qrx (the game's g8=Q walked into …Rh4#): g8=N+ instead leaves rook
// and knight against rook, no pawns — a draw.
const B_02QRX = '8/2R3P1/5k1K/8/1r6/8/8/8 w - - 0 55';

describe('fortress: a piece down, and a draw the board explains', () => {
  it('Bxg6 (05jP1): their pawn on h6 stands where the light bishop never reaches', () => {
    const f = fortress(B_05JP1, 'Bxg6', BXG6_REPLIES);
    expect(f).toMatchObject({ defender: 'b', reason: { kind: 'bishop-colour', shade: 'dark', pawns: ['h6'] } });
    const fa = after(B_05JP1, 'Bxg6');
    expect(fortressLine(f!, false, fa)).toMatch(/^(They are a piece down and have built a fortress|A piece down, they hold, because this is a fortress): their pawn on h6 stands on a dark square, where your light-squared bishop can never attack it\.$/);
    expect(fortressSquares(f!)).toEqual(['h6']);
  });

  it('the same board, the solution hxg6: the engine reads a win, nothing said', () => {
    expect(fortress(B_05JP1, 'hxg6', HXG6_REPLIES)).toBeNull();
  });

  it('Bxd5 (0E3g5) holds, g4 wins', () => {
    const f = fortress(B_0E3G5, 'Bxd5', [{ cp: 0, mate: null, moves: ['f4g3', 'd2e3', 'e5d5', 'e3f3', 'd5e6', 'f3g3'] }]);
    expect(f).toMatchObject({ defender: 'b', reason: { kind: 'bishop-colour', pawns: ['f6', 'f4'] } });
    expect(fortressLine(f!, true, after(B_0E3G5, 'Bxd5'))).toMatch(/your pawns on f6 and f4 stand on dark squares, where their light-squared bishop can never attack them\.$/);
    expect(fortress(B_0E3G5, 'g4', [{ cp: 602, mate: null, moves: ['d5d4', 'h4h5', 'f4f3', 'h5h6', 'e5f4', 'f7e6'] }])).toBeNull();
  });

  it('c6 (01oWi): the student a piece down holds, both seats', () => {
    const f = fortress(B_01OWI, 'c6', [{ cp: 0, mate: null, moves: ['c3a5', 'e4e5', 'g3f3', 'e5d6', 'f3e3', 'd6d7'] }]);
    expect(f).toMatchObject({ defender: 'w', reason: { kind: 'bishop-colour', shade: 'light', pawns: ['c6', 'b5'] } });
    const fa = after(B_01OWI, 'c6');
    expect(fortressLine(f!, true, fa)).toMatch(/^(You are a piece down, but this is a fortress|A piece down, you hold, because this is a fortress): your pawns on c6 and b5 stand on light squares, where their dark-squared bishop can never attack them\.$/);
    // The solution b6 puts a pawn on a dark square: no fortress, and the engine says it wins.
    expect(fortress(B_01OWI, 'b6', [{ cp: 3486, mate: null, moves: ['a7b6', 'c5c6', 'g3f2', 'c6c7', 'f2e2', 'c7c8q'] }])).toBeNull();
  });

  it('g8=N+ (02Qrx): rook and knight against rook, no pawns — and g8=Q walks into mate', () => {
    const f = fortress(B_02QRX, 'g8=N+', [{ cp: -1, mate: null, moves: ['f6e5', 'c7c8', 'e5d6', 'g8f6', 'b4b6', 'h6h5'] }]);
    expect(f).toMatchObject({ defender: 'b', reason: { kind: 'no-pawns', extra: 'n' } });
    expect(fortressLine(f!, true, after(B_02QRX, 'g8=N+'))).toMatch(/they have no pawns left to make a queen, and one extra knight is not enough to force mate\.$/);
    expect(fortress(B_02QRX, 'g8=Q', [{ cp: null, mate: -1, moves: ['b4h4'] }])).toBeNull();
  });

  it('no read, no claim', () => {
    expect(fortress(B_05JP1, 'Bxg6', [])).toBeNull();
  });

  it('comes out of the one registry', () => {
    const f = readBoard('fortress', { fenBefore: B_01OWI, san: 'c6', student: 'w', replies: [{ cp: 0, mate: null, moves: ['c3a5'] }] });
    expect(f?.computer).toBe('fortress');
    expect(f?.seat).toBe('student');
    const theirs = readBoard('fortress', { fenBefore: B_05JP1, san: 'Bxg6', student: 'w', replies: BXG6_REPLIES });
    expect(theirs?.seat).toBe('opponent');
  });
});
