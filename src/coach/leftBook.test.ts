import { describe, it, expect } from 'vitest';
import { readTurnInCode } from './chatTurnCodeReader';
import { answerLeftBook } from './chatTurnAnswers';

// David's Learn chat 2026-10-18: "How did I leave the book moves?" got "Not
// sure what you mean"; "What was the love the kept me on book?" got the threat.
const BOARD = { fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', history: ['e4', 'c6', 'd4', 'd5'], studentColor: 'white' as const };

describe("this game's book departure is a question chat answers", () => {
  it('the code reader reads his exact words as left-book', () => {
    for (const q of ['How did I leave the book moves?', 'What was the love the kept me on book?', 'which move kept me in theory?', 'where did I go out of book this game?']) {
      expect(readTurnInCode(q, BOARD as never)?.kind, q).toBe('left-book');
    }
  });
  it('NEGATIVE CONTROL: the repertoire question is not this game', () => {
    expect(readTurnInCode('where do I usually leave theory?', BOARD as never)?.kind).not.toBe('left-book');
  });
  it('a game still in book says so, never a guess', () => {
    expect(answerLeftBook(['e4', 'c6', 'd4', 'd5'], 'w')).toMatch(/has not left theory yet/);
    expect(answerLeftBook([], 'w')).toMatch(/still at the start/);
  });
});
