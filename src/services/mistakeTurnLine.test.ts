import { describe, it, expect } from 'vitest';
import { mistakeTurnLine, sameLossAsGrade } from './mistakeTurnLine';

// David's Smith-Morra replay (teach-mvfhdihq-7i8vk5), 8.Bxf7+ Kxf7: the turn's
// line as the page composed it, with the real producers' text.
const FUND = {
  verdict: 'That pawn was defended: your bishop takes on f7 and is taken on the spot — it cost you far more than a pawn. Here\'s how: before taking a free pawn, ask why they let you.',
  howOnly: 'Here\'s how: before taking a free pawn, ask why they let you.',
  recurrence: 'You\'ve walked into this before — taking a poisoned pawn, the third game now.',
  square: 'f7',
};
const EVIDENCE = 'Bxf7+ was a mistake. That took the pawn on f7, but the king on e8 takes back — you lose a bishop for a pawn.';
const BLUNDER_CHECK = 'Blunder check before you let go of a piece: run CCT for them.';

describe('the mistake turn says one loss and teaches one habit', () => {
  it('8.Bxf7+: the grade says the loss once, the fundamental keeps only its habit', () => {
    let asked = 0;
    const turn = mistakeTurnLine({
      fund: FUND, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null,
      slipQuestion: () => { asked += 1; return BLUNDER_CHECK; },
    });
    const line = turn.text;
    expect(turn.teachesMethod).toBe(true);
    expect(line).toBe(`${EVIDENCE} ${FUND.howOnly} ${FUND.recurrence}`);
    expect(line).not.toMatch(/far more than a pawn/);
    expect(line).not.toMatch(/Blunder check/);
    expect(asked).toBe(0); // never computed, so its say-once key is not spent
  });
  it('a fundamental about another square still speaks in full, and its habit replaces the blunder check', () => {
    const line = mistakeTurnLine({
      fund: { ...FUND, square: 'd5' }, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    }).text;
    expect(line.startsWith(FUND.verdict)).toBe(true);
    expect(line).not.toMatch(/Blunder check/);
  });
  it('with no habit taught this turn the blunder check is asked', () => {
    const line = mistakeTurnLine({
      fund: { ...FUND, howOnly: '' }, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    }).text;
    expect(line).toBe(`${EVIDENCE} ${FUND.recurrence} ${BLUNDER_CHECK}`);
  });
  it('a plain mistake: the grade, its tail, then the question', () => {
    expect(mistakeTurnLine({
      fund: null, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: ' A pin is …', concession: null, slipQuestion: () => BLUNDER_CHECK,
    }).text).toBe(`${EVIDENCE} A pin is … ${BLUNDER_CHECK}`);
  });
  it('a turn with no habit and no question says so (the door may add one)', () => {
    expect(mistakeTurnLine({
      fund: null, evidence: EVIDENCE, lostSquare: null, bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => null,
    }).teachesMethod).toBe(false);
  });
  it('same loss = same square, for any fundamental', () => {
    expect(sameLossAsGrade({ square: 'f7' }, 'f7')).toBe(true);
    expect(sameLossAsGrade({ square: 'f7' }, null)).toBe(false);
    expect(sameLossAsGrade(null, 'f7')).toBe(false);
  });
});
