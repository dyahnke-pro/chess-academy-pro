import { describe, it, expect } from 'vitest';
import { slipAnswerText } from './playCommentary';
import { studentAnswer } from './reviewFullData';

// A real won game (174098928806), after the opponent's 31…Rd6: White to move,
// the engine's answer is c5, kicking the rook.
const AFTER_RD6 = '2r3k1/7p/p2r2p1/3P1p2/NpPR4/1P5P/P5P1/6K1 w - - 1 31';
// After 28…Qd4+: the answer Qxd4 is a queen trade, which has no point to state.
const AFTER_QD4 = '2r2rk1/7p/p5p1/2pP1p2/NpPq1Q2/1P5P/P5P1/4R1K1 w - - 5 28';

describe('slipAnswerText — their slip is your chance, one wording (David 2026-10-02)', () => {
  it('found: affirms with the point', () => {
    expect(slipAnswerText(AFTER_RD6, 'Rd6', 'c5', 'found')).toBe('You found it: c5 kicks their rook off d6, gaining time.');
  });
  it('missed: names the answer with its point', () => {
    expect(slipAnswerText(AFTER_RD6, 'Rd6', 'c5', 'missed')).toBe('c5 was the answer to their slip, which kicks their rook off d6, gaining time.');
  });
  it('review: retrospective, and Review speaks the same computer', () => {
    expect(studentAnswer(AFTER_RD6, 'Rd6', 'c5')).toBe('your answer was c5, which kicks their rook off d6, gaining time');
    expect(studentAnswer(AFTER_RD6, 'Rd6', 'c5')).toBe(slipAnswerText(AFTER_RD6, 'Rd6', 'c5', 'review'));
  });
  it('no point: nothing — a missed answer is not named bare, a found one is not praised bare (Voice Rule 5)', () => {
    expect(slipAnswerText(AFTER_QD4, 'Qd4+', 'Qxd4', 'missed')).toBeNull();
    expect(slipAnswerText(AFTER_QD4, 'Qd4+', 'Qxd4', 'found')).toBeNull();
    expect(slipAnswerText(AFTER_RD6, 'Rd6', null, 'found')).toBeNull();
  });
});
