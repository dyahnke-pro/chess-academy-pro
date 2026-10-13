import { describe, expect, it } from 'vitest';
import { praiseWhy, seatMoveSubject, verdictSentence } from './reviewFullData';
import { MATE_EVAL_VALUE } from './engineConstants';

// chesscom-1040709576 (2026-10-13): "You: that was a mistake" / "Your
// opponent: that was a mistake" read as speaker labels, and "You: that was a
// great move." praised with no reason.
describe('the verdict is a sentence that owns its move', () => {
  it('names the move with its owner, in you / their', () => {
    expect(verdictSentence('mistake', true, 'd6')).toBe('Your d6 was a mistake');
    expect(verdictSentence('inaccuracy', false, 'c3')).toBe('Their c3 was an inaccuracy');
    expect(verdictSentence('mistake', true, 'd6')).not.toMatch(/^You:|Your opponent:/);
  });
  it('the mechanics line is owned too', () => {
    expect(seatMoveSubject('The move axb5 captures the pawn', false)).toBe('Their axb5 captures the pawn');
  });
});

describe('praise carries its computed why', () => {
  it('Great from a mate found where there was none names the mate', () => {
    expect(praiseWhy('great', -300, -(MATE_EVAL_VALUE - 4), 'black')).toBe(' — it finds a forced mate in 4');
  });
  it('Great from the only-move rule says so', () => {
    expect(praiseWhy('great', 20, 30, 'white')).toMatch(/the only move here/);
  });
  it('Brilliant is the sacrifice that holds', () => {
    expect(praiseWhy('brilliant', 20, 30, 'white')).toMatch(/sacrifice/);
  });
  it('NEGATIVE CONTROL: a fault carries no praise', () => {
    expect(praiseWhy('mistake', 20, -150, 'white')).toBe('');
  });
});
