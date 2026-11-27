import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { lookBackPlay, studentMovesAtView } from './lookBackMove';

// 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 — a real Ruy Lopez.
const HISTORY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
const fenAfter = (i: number): string => {
  const c = new Chess();
  for (const s of HISTORY.slice(0, i + 1)) c.move(s);
  return c.fen();
};

describe('back only looks; a different move there is the takeback', () => {
  it('White looking at the board after 2…Nc6 plays Bc4 instead of Bb5: two plies come back', () => {
    expect(lookBackPlay(3, HISTORY, fenAfter(3), 'white', 'Bc4')).toEqual({ kind: 'replace', plies: 2 });
  });
  it('the game\'s own move there is Forward, nothing taken back', () => {
    expect(lookBackPlay(3, HISTORY, fenAfter(3), 'white', 'Bb5')).toEqual({ kind: 'same', nextIndex: 4 });
    // The last board before live: Forward returns to the live game.
    expect(lookBackPlay(4, HISTORY, fenAfter(4), 'black', 'a6')).toEqual({ kind: 'same', nextIndex: null });
  });
  it('the starting board: White replays move one', () => {
    expect(lookBackPlay(-1, HISTORY, new Chess().fen(), 'white', 'd4')).toEqual({ kind: 'replace', plies: 6 });
  });
  it('twins: live, the opponent\'s turn, and no board are not the student\'s to move', () => {
    expect(studentMovesAtView(null, HISTORY.length, fenAfter(5), 'white')).toBe(false);
    expect(studentMovesAtView(2, HISTORY.length, fenAfter(2), 'white')).toBe(false);
    expect(studentMovesAtView(3, HISTORY.length, null, 'white')).toBe(false);
    expect(lookBackPlay(2, HISTORY, fenAfter(2), 'white', 'Nc6')).toEqual({ kind: 'none' });
    expect(studentMovesAtView(3, HISTORY.length, fenAfter(3), 'white')).toBe(true);
  });
});
