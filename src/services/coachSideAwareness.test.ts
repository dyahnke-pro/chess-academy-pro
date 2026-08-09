// The coach was teaching the other player.
//
// David played White against the coach's Sicilian Dragon (prod, build 63e82f3)
// and heard, among others:
//
//   "Trading those bishops is safe. White has too few pieces to attack the
//    king, and Black's pawns leave no weakness to exploit."
//   "Black can play Bd7. If White takes on d7, Black recaptures with the
//    knight, keeping the extra pawn and a big advantage."
//
// Both are sound teaching. Neither was for him. A corpus note carries NO side
// field — the schema is id/lineSan/opening/phase/explains/teaches/plans/
// concepts/sources — and nothing in selection had ever looked at side, so a
// note written from the perspective its opening is usually taught from went to
// whoever happened to be listening. The Sicilian is Black's defence, so a White
// student got Black's repertoire read to him as coaching.
//
// The same game had the mirror bug in the engine lane: the phase report said
// "The best move is Qb6" on a Black-to-move board, and the coach played Qb6
// twenty-one seconds later. He reported it as the hints being bad moves. They
// were good moves for the wrong player.
import { describe, it, expect } from 'vitest';
import { noteAdvisesSide, noteSuitsStudentSide } from './noteAnchorIntegrity';
import { assembleMoveEvalAnswer } from './groundedAnswer';

describe('which side a note is advising', () => {
  it('reads the advice, not the mention', () => {
    // A note may name either side freely while DESCRIBING a position. That is
    // commentary. What makes a note belong to a side is telling that side what
    // to do — filtering on mere mention would delete most of the corpus.
    expect(noteAdvisesSide({ explains: 'White has too few pieces to attack the king.' })).toBeNull();
    expect(noteAdvisesSide({ plans: 'Black should wait with a6.' })).toBe('black');
    expect(noteAdvisesSide({ plans: 'White must play d4 before Black consolidates.' })).toBe('white');
  });

  it('a note comparing both sides belongs to neither', () => {
    // Comparing plans IS teaching, whoever is listening.
    expect(noteAdvisesSide({
      plans: 'White should push d4; Black must meet it with ...e5.',
    })).toBe('both');
  });

  it("keeps advice for the student's side and drops the opponent's", () => {
    const blackAdvice = { plans: "Black should wait with a6, only infiltrating after White plays a4." };
    expect(noteSuitsStudentSide(blackAdvice, 'black')).toBe(true);
    expect(noteSuitsStudentSide(blackAdvice, 'white')).toBe(false);
  });

  it('keeps everything when the side is unknown', () => {
    // No side, nothing to violate — the other guards still apply.
    expect(noteSuitsStudentSide({ plans: 'Black should wait with a6.' }, null)).toBe(true);
  });

  it('keeps the 70% of the corpus that advises nobody', () => {
    const neutral = { explains: 'The rook belongs behind the passed pawn.' };
    expect(noteSuitsStudentSide(neutral, 'white')).toBe(true);
    expect(noteSuitsStudentSide(neutral, 'black')).toBe(true);
  });
});

describe('whose best move it is', () => {
  // The exact position from David's game when the phase report fired: Black to
  // move, David playing White.
  const BLACK_TO_MOVE = 'r2qk2r/p2ppp1p/b1p3p1/3nP3/Q7/5N2/PP3PPP/RNB1K2R b KQkq - 2 11';

  it('names the opponent when it is not the student to move', () => {
    const answer = assembleMoveEvalAnswer({
      fen: BLACK_TO_MOVE,
      bestMoveUci: 'd8b6',
      studentColor: 'white',
    });
    expect(answer?.facts).toContain('Their strongest reply is Qb6');
    expect(answer?.facts).not.toContain('The best move is Qb6');
  });

  it("calls it the best move when it IS the student's turn", () => {
    const answer = assembleMoveEvalAnswer({
      fen: BLACK_TO_MOVE,
      bestMoveUci: 'd8b6',
      studentColor: 'black',
    });
    expect(answer?.facts).toContain('The best move is Qb6');
  });

  it('keeps the old wording when no side was supplied', () => {
    // Chat asks ("what should I play here?") arrive on the student's own turn
    // and pass no colour; they must read exactly as before.
    const answer = assembleMoveEvalAnswer({ fen: BLACK_TO_MOVE, bestMoveUci: 'd8b6' });
    expect(answer?.facts).toContain('The best move is Qb6');
  });
});
