// ANSWER THE QUESTION THAT WAS ASKED.
//
// David 2026-08-11: "the coach could not answer my questions when asked."
// PostHog, his own game session: he asked "Which pawn should I push?" and the
// coach replied "The best move is O-O. White is clearly better (about 1.4
// points)." Castling is not a pawn.
//
// The classifier was not wrong — "should i … push" IS a move question, and the
// engine's move IS the true answer to "what should I play". What was missing is
// that the best-move lane answers from the engine alone and never sees the
// words, so it could not know the student had narrowed to one piece. It
// answered confidently and did not answer.
import { describe, it, expect } from 'vitest';
import { restrictedPieceInAsk, isBestMoveQuestion } from './questionIntents';

describe('restrictedPieceInAsk', () => {
  it('reads the piece out of his exact question', () => {
    expect(restrictedPieceInAsk('Which pawn should I push?')).toBe('pawn');
  });

  it('still classifies that question as a move question — this narrows, it does not re-route', () => {
    expect(isBestMoveQuestion('Which pawn should I push?')).toBe(true);
  });

  it('reads the other pieces', () => {
    expect(restrictedPieceInAsk('which knight should I develop')).toBe('knight');
    expect(restrictedPieceInAsk('What rook goes to the open file?')).toBe('rook');
    expect(restrictedPieceInAsk('which bishop do I trade')).toBe('bishop');
  });

  it('tolerates words between the wh- and the piece', () => {
    expect(restrictedPieceInAsk('which of my pawns should I push')).toBe('pawn');
  });

  it('"which piece" is the GENERAL question, not a restriction', () => {
    // The best-move lane already answers this one correctly, so narrowing it
    // would add a caveat to a perfectly good answer.
    expect(restrictedPieceInAsk('which piece should I develop')).toBeNull();
  });

  it('is null on an unrestricted question', () => {
    expect(restrictedPieceInAsk('what is my plan?')).toBeNull();
    expect(restrictedPieceInAsk("what's the best move here?")).toBeNull();
    expect(restrictedPieceInAsk(undefined)).toBeNull();
  });
});
