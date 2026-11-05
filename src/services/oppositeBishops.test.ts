import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { oppositeBishops, oppositeBishopsOn } from './oppositeBishops';
import { classifyMatchup } from './endgameMatchup';
import { readBoard } from './boardComputers';
import { TEACHING_MOVES } from './teachingMoves';
import { FACT_GROUP } from './coachFact';

function after(sans: readonly string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

// His Ruy Lopez speedrun (NFUuaZsR2S8), 13.Bxf6: his dark bishop against
// their light one, queens and rooks on, their king still on e8.
const RUY = ['e4', 'e5', 'Bb5', 'Nc6', 'Nf3', 'a6', 'Ba4', 'Nge7', 'Nc3', 'g6', 'd4', 'exd4', 'Nd5', 'Bg7', 'Bg5', 'b5',
  'Nxd4', 'bxa4', 'Nxc6', 'dxc6', 'Bxe7', 'Qd7', 'Nf6+', 'Bxf6'];

describe('oppositeBishops — one bishop each, opposite colours, whatever else is on', () => {
  it('reads the shape with rooks and queens on, where the ending classifier sees none', () => {
    const fen = after([...RUY, 'Bxf6']);
    expect(oppositeBishopsOn(fen)).toMatchObject({ white: 'f6', black: 'c8', heavy: true, queens: true, rooks: true });
    // The ending classifier names opposite bishops only in a pure bishop ending.
    expect(classifyMatchup(fen).cls).not.toBe('opposite-bishops');
  });

  it('on the move that settles it: the attacker\'s game, and the bishop that already hits their king', () => {
    const r = oppositeBishops(after(RUY), 'Bxf6', 'w');
    expect(r?.text).toBe('Opposite-coloured bishops now, with queens and rooks on — a game for the attacker, not for grinding pawns: your bishop rules the dark squares around their king and theirs can never guard them, so attack there.');
    // Squares named like a human: none read out; the bishop and the squares
    // it hits beside their king are on the board.
    expect(r?.text).not.toMatch(/\b[a-h][1-8]\b/);
    expect(r?.seat).toBe('student');
    expect(r?.squares).toEqual(expect.arrayContaining(['f6', 'c8', 'd8', 'e7']));
    // From their seat: the bishop that hits your king's squares.
    const theirs = oppositeBishops(after(RUY), 'Bxf6', 'b');
    expect(theirs?.text).toMatch(/their bishop rules the dark squares around your king and yours can never guard them, so cover them with your other pieces/);
    expect(theirs?.seat).toBe('opponent');
  });

  it('is said once, where it settles — not while a bishop can still be taken, not after', () => {
    // 12…Bxf6 (their dark bishop takes the knight): White's bishop on e7 is
    // still hanging to their queen — an exchange in flight.
    const midExchange = ['e4', 'e5', 'Bb5', 'Nc6', 'Nf3', 'a6', 'Ba4', 'Nge7', 'Nc3', 'g6', 'd4', 'exd4', 'Nd5', 'Bg7', 'Bg5', 'b5',
      'Nxd4', 'bxa4', 'Nxc6', 'dxc6', 'Bxe7', 'Qd7', 'Nf6+'];
    expect(oppositeBishops(after(midExchange), 'Bxf6', 'w')).toBeNull();
    // Once settled, the next move says nothing more.
    expect(oppositeBishops(after([...RUY, 'Bxf6']), 'Qxd1+', 'w')).toBeNull();
  });

  it('when the heavy pieces come off: the drawish ending, sharing its claim with push-or-hold', () => {
    // Opposite bishops with their rook on: the bishop takes the rook.
    const withRook = '8/5pk1/6p1/8/2b5/4B1P1/3r1PK1/8 w - - 0 41';
    expect(oppositeBishopsOn(withRook)?.heavy).toBe(true);
    const r = oppositeBishops(withRook, 'Bxd2', 'w');
    expect(r?.text).toBe('Opposite-coloured bishops and pawns now: the most drawish ending there is — a pawn up is often not enough, because each bishop can block on squares the other can never touch.');
    expect(r?.claims).toEqual(expect.arrayContaining(['ending-opposite-bishops-up', 'ending-opposite-bishops-down']));
    // With knights still on, neither rule holds whole: nothing is said.
    expect(oppositeBishops('8/5pk1/n5p1/8/2b5/4B1P1/3r1PK1/8 w - - 0 41', 'Bxd2', 'w')).toBeNull();
  });

  it('reaches every surface through the one registry, as an assessment and a plan', () => {
    const f = readBoard('oppositeBishops', { fenBefore: after(RUY), san: 'Bxf6', student: 'w' });
    expect(f?.kind).toBe('opposite-bishops');
    expect(f?.namesStudentMove).toBe(false);
    expect(TEACHING_MOVES['opposite-bishops']).toEqual(expect.arrayContaining(['H-EVAL', 'S-PLAN']));
    expect(FACT_GROUP['opposite-bishops']).toBe('structure');
  });
});
