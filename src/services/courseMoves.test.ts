import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { judgeReviewAnswer, taughtMovesByPosition } from './courseMoves';
import { positionOf } from '../utils/samePosition';
import repertoire from '../data/repertoire.json';
import type { OpeningRecord } from '../types';

const ITALIAN = (repertoire as unknown as OpeningRecord[]).find((o) => o.id === 'italian-game')!;

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('taughtMovesByPosition', () => {
  it('holds every move the course teaches at a board, not only the first line\'s', () => {
    const taught = taughtMovesByPosition(ITALIAN);
    // After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 the main line plays d3; the
    // course's Giuoco Piano lines play d4 (measured 2026-10-27).
    const here = taught.get(positionOf(fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'])));
    expect(here).toBeDefined();
    expect(here!.has('d3')).toBe(true);
    expect(here!.has('d4')).toBe(true);
  });

  it('records only the student\'s moves', () => {
    const taught = taughtMovesByPosition(ITALIAN);
    expect(taught.get(positionOf(fenAfter(['e4'])))).toBeUndefined();
  });
});

describe('judgeReviewAnswer', () => {
  const here = new Set(['d3', 'd4']);
  it('the line\'s own move is correct', () => expect(judgeReviewAnswer('d3', 'd3', here)).toBe('correct'));
  it('another line\'s taught move is never a miss', () => expect(judgeReviewAnswer('d4', 'd3', here)).toBe('other-line'));
  it('a move the course never teaches here is wrong', () => expect(judgeReviewAnswer('h3', 'd3', here)).toBe('wrong'));
  it('check marks do not matter', () => expect(judgeReviewAnswer('d4+', 'd4', undefined)).toBe('correct'));
});
