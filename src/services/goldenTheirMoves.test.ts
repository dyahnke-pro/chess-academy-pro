/**
 * THEIR MOVE'S BOARD JOB, on Naroditsky's Three Knights speedrun (golden list
 * 2026-10-20: from move 8 on the app stopped teaching their plan). Each reply
 * is read on its own board by the one board teacher, from their seat.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { theirBoardPoint } from './learnBoardTeaching';

const SANS = 'e4 e5 Nf3 Nf6 Nc3 Bc5 Bc4 d6 O-O Bg4 d3 Nc6 Be3 Bb6 h3 Bh5 Kh2 O-O Qd2 Bxf3 gxf3 Nh5 Rg1 Qf6 Rg4 Qxf3 Rag1'.split(' ');
/** Their reply at index `i` of the game, read on its board. */
const read = (i: number): string | null => {
  const c = new Chess();
  for (const s of SANS.slice(0, i)) c.move(s);
  const before = c.fen();
  c.move(SANS[i]);
  return theirBoardPoint(before, SANS[i], c.fen())?.text ?? null;
};

describe('their replies, by their board job', () => {
  it('3.Nc3 guards e4, which your knight attacks', () => {
    expect(read(4)).toBe('Their Nc3 guards the pawn on e4, which your knight attacks.');
  });
  it('9.Kh2 steps off g1 so the rook can come to g1', () => {
    expect(read(16)).toMatch(/g1.*rook|rook.*g1/);
  });
  it('10.Qd2 stops guarding f3: the g-pawn takes back and opens the g-file', () => {
    expect(read(18)).toBe('Their Qd2 stops guarding the knight on f3: after a trade there, they take back with the g-pawn and open the g-file toward your king.');
  });
  it('11.gxf3 opens the g-file toward your king', () => {
    expect(read(20)).toMatch(/opens the g-file for the rooks, toward your king/i);
  });
  it('12.Rg1 and 13.Rg4 press down the g-file at your pawn on g7', () => {
    expect(read(22)).toBe('Their rook presses down the half-open g-file at your pawn on g7.');
    expect(read(24)).toBe('Their rook presses down the half-open g-file at your pawn on g7.');
  });
  it('NEGATIVE CONTROL: a move with no board job says nothing (6.d3)', () => {
    expect(read(10)).toBeNull();
  });
});
