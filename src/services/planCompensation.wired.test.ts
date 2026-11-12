// The two new computers answer through the ONE registry (a wire that does not
// fire is not a wire, G8.5): a real fact comes out for a real board.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { readBoardAll } from './boardComputers';

const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('planSteps + compensation through the registry', () => {
  it('your plan after e3 in the QGD: named, proved by its line, held as your move', () => {
    const fenAfter = after('d4', 'Nf6', 'c4', 'e6', 'Nc3', 'd5', 'Nf3', 'Be7', 'e3');
    const [f] = readBoardAll('planSteps', { fenAfter, line: ['e8g8', 'f1d3', 'b7b6', 'd1c2', 'c8b7', 'e1g1'], student: 'w', played: null });
    expect(f?.text).toContain('Your plan from here: Bd3, Qc2 and then castling');
    expect(f?.namesStudentMove).toBe(true);
    expect(f?.seat).toBe('student');
  });

  it('their plan from the Black seat is theirs and names none of your moves', () => {
    const fenAfter = after('d4', 'Nf6', 'c4', 'e6', 'Nc3', 'd5', 'Nf3', 'Be7', 'e3');
    const [f] = readBoardAll('planSteps', { fenAfter, line: ['e8g8', 'f1d3', 'b7b6', 'd1c2', 'c8b7', 'e1g1'], student: 'b', played: null });
    expect(f?.text).toContain('Their plan from here');
    expect(f?.namesStudentMove).toBe(false);
  });

  it('the Danish compensation, from either seat', () => {
    const fenAfter = after('e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2');
    expect(readBoardAll('compensation', { fenAfter, student: 'w', studentCp: 0, line: ['g8f6'] })[0]?.text).toMatch(/^You're two pawns down/);
    expect(readBoardAll('compensation', { fenAfter, student: 'b', studentCp: 0, line: ['g8f6'] })[0]?.seat).toBe('opponent');
  });
});
