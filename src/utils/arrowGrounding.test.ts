import { describe, it, expect } from 'vitest';
import { groundArrows } from './arrowGrounding';
import type { BoardArrow } from '../types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const a = (startSquare: string, endSquare: string): BoardArrow => ({ startSquare, endSquare, color: 'green' });

describe('groundArrows', () => {
  it('keeps a knight arrow that matches the L-move geometry', () => {
    const r = groundArrows([a('b1', 'c3')], START);
    expect(r).toHaveLength(1);
  });

  it('drops a knight arrow with non-knight geometry (straight)', () => {
    expect(groundArrows([a('b1', 'b3')], START)).toHaveLength(0);
  });

  it('drops an arrow that starts on an empty square', () => {
    expect(groundArrows([a('e4', 'e5')], START)).toHaveLength(0);
  });

  it('drops a slider arrow blocked by an own pawn (no clear sight-line)', () => {
    // Bishop c1 toward h6 is blocked by the d2 pawn in the start position.
    expect(groundArrows([a('c1', 'h6')], START)).toHaveLength(0);
  });

  it('keeps a slider arrow with a clear path', () => {
    // After 1.e4 the f1-bishop sees c4 (e2/d3 empty).
    expect(groundArrows([a('f1', 'c4')], AFTER_E4)).toHaveLength(1);
  });

  it('keeps an opponent-piece arrow (side-agnostic — coach shows threats)', () => {
    // White to move, but a black knight arrow (b8->c6) must still ground.
    const r = groundArrows([a('b8', 'c6')], START);
    expect(r).toHaveLength(1);
  });

  it('de-duplicates identical arrows', () => {
    expect(groundArrows([a('b1', 'c3'), a('b1', 'c3')], START)).toHaveLength(1);
  });

  it('caps the count', () => {
    const many = [a('b1', 'c3'), a('b1', 'a3'), a('g1', 'f3'), a('g1', 'h3'), a('b8', 'c6'), a('b8', 'a6'), a('g8', 'f6')];
    expect(groundArrows(many, START, 5)).toHaveLength(5);
  });

  it('returns capped input (never blanks) on an unparseable FEN', () => {
    const r = groundArrows([a('b1', 'c3'), a('e4', 'e5')], 'not-a-fen', 5);
    expect(r).toHaveLength(2);
  });
});
