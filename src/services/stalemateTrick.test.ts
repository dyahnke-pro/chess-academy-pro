import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { stalemateTrick, stalemateTrickLine } from './stalemateWatch';
import { readBoard } from './boardComputers';

// Danya's game vc-rgLTiUZAWQY-95 (voiced corpus), move 47: Black is far behind
// and plays …g3 — fxg3 leaves the king on c8 with no square.
const DANYA = '2k5/P7/1BP5/1K6/6p1/2P5/5P2/8 b - - 0 47';
// Lichess puzzle 0Og6f, move 52: Black promotes on d1; Rxd1 stalemates.
const PUZZLE = '7k/7B/6K1/8/8/8/3p4/5R2 b - - 1 52';

const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

describe('stalemateTrick — the side behind leaves a capture that stalemates it', () => {
  it('finds the bait on Danya\'s board', () => {
    const t = stalemateTrick(DANYA, 'g3');
    expect(t?.side).toBe('b');
    expect(t?.captures).toEqual(['fxg3']);
    expect(t?.squares).toEqual(['g3']);
  });
  it('finds the promoted queen as the bait on the puzzle board', () => {
    expect(stalemateTrick(PUZZLE, 'd1=Q')?.captures).toEqual(['Rxd1']);
  });
  it('says it from both seats, never naming a move in SAN', () => {
    const t = stalemateTrick(DANYA, 'g3');
    if (!t) throw new Error('no trick');
    const fen = after(DANYA, 'g3');
    expect(stalemateTrickLine(t, true, fen)).toBe('You are behind, but there is a trick: if they take the pawn on g3, it is stalemate. Your king would have no move and nothing else of yours could move, so the game is drawn.');
    expect(stalemateTrickLine(t, false, fen)).toBe('Careful — taking the pawn on g3 would be stalemate. Their king would have no move and nothing else of theirs could move, so a won game becomes a draw. Leave the bait alone.');
  });
  it('reaches the registry for both seats', () => {
    expect(readBoard('stalemateTrick', { fenBefore: DANYA, san: 'g3', student: 'b' })?.seat).toBe('student');
    expect(readBoard('stalemateTrick', { fenBefore: DANYA, san: 'g3', student: 'w' })?.seat).toBe('opponent');
  });
  it('is silent for the side ahead, and for a move that leaves no such capture', () => {
    // The same board with White to move: White is the side ahead.
    expect(stalemateTrick(DANYA.replace(' b - - 0 47', ' w - - 0 47'), 'Kc5')).toBeNull();
    // After …g3 it is White's move: the side ahead sets no trick.
    expect(stalemateTrick(after(DANYA, 'g3'), 'Kc4')).toBeNull();
    expect(stalemateTrick(new Chess().fen(), 'e4')).toBeNull();
  });
});
