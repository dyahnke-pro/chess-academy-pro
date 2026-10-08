import { describe, expect, it } from 'vitest';
import { fastPathLane } from './chatTurn';

// Answers swarm P1 (2026-10-07): precedence comes from the WORDS. A question
// that points at the board on screen is answered from the board; the same
// topic asked about the student's record stays a record question.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('board questions are answered from the board', () => {
  it.each([
    ['how good is my position', 'position-assessment'],
    ['where do I stand', 'position-assessment'],
    ['is the position even?', 'position-assessment'],
    ['how does white continue', 'plan'],
    ['what is their threat', 'tactics'],
    ['what are they threatening', 'tactics'],
    ['what do they do now', 'tactics'],
    ['what should I watch out for?', 'tactics'],
  ])('"%s" → %s', (q, lane) => {
    expect(fastPathLane(q, { fen: FEN })).toBe(lane);
  });
});

describe('record and opening questions keep their lanes', () => {
  it.each([
    ['what should I watch out for in the Caro-Kann?', 'opening-traps'],
    ['which colour do I do better with', 'color'],
    ['do I miss forks?', 'tactics-profile'],
  ])('"%s" → %s', (q, lane) => {
    expect(fastPathLane(q, { fen: FEN })).toBe(lane);
  });
  it('without a board, "where do I stand" is the record', () => {
    expect(fastPathLane('where do I stand')).toBe('progress');
  });
  it('without a board, "what is their threat" is not invented', () => {
    expect(fastPathLane('what is their threat')).not.toBe('tactics');
  });
});
