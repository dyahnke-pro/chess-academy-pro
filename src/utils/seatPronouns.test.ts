import { describe, it, expect } from 'vitest';
import { toOtherSeat } from './seatPronouns';

describe('toOtherSeat — the one pronoun flip', () => {
  it('says the mover\'s clause to the other side', () => {
    expect(toOtherSeat('It let them play …exf6, winning your bishop on f6.')).toBe('It let you play …exf6, winning their bishop on f6.');
    expect(toOtherSeat('That left your knight on d4 hanging — their bishop on g7 just takes it.')).toBe('That left their knight on d4 hanging — your bishop on g7 just takes it.');
  });
  it('an object "you" becomes "them", a subject "you" becomes "they"', () => {
    expect(toOtherSeat('it lets you take their rook')).toBe('it lets them take your rook');
    expect(toOtherSeat('you come out a piece up, and they missed it')).toBe('they come out a piece up, and you missed it');
    expect(toOtherSeat('this is bad for you')).toBe('this is bad for them');
  });
  it('keeps capitals and contractions, and swaps both ways losslessly', () => {
    expect(toOtherSeat("They're a pawn up. Yours is gone.")).toBe("You're a pawn up. Theirs is gone.");
    const s = 'it wins your queen and leaves their king bare';
    expect(toOtherSeat(toOtherSeat(s))).toBe(s);
  });
  it('touches no other word', () => {
    expect(toOtherSeat('the youth theory of the bishop')).toBe('the youth theory of the bishop');
  });
});
