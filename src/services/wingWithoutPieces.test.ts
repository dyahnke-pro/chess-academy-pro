import { describe, expect, it } from 'vitest';
import { wingWithoutPieces } from './wingWithoutPieces';

const moverOf = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

// Danya, "Mysterious GM Moves" (mysterious-gm-moves#4): the a-pawn goes, "but to open the
// b-file White must bring a piece to the queenside — so the queen must leave h5".
const MYSTERIOUS = '5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/5RK1 w - - 0 26';
// 37.c5, which fixes Black's bishop in its prison — a clamp, not a lever (mastering-intuition-part-1#1).
const CLAMP = 'b2r2k1/p4pp1/2prp3/P5P1/2PP4/4RB2/5PK1/3R4 w - - 0 37';
// 19.b4 with the d1 rook and e2 queen able to follow, no lever against a pawn (the-knockout-blow#2).
const KNOCKOUT = '3rr3/pp1k2pp/2n1p3/3p1q2/8/1P3NP1/1PP1QPP1/3RR1K1 w - - 0 19';

describe('wingWithoutPieces', () => {
  it('names the queenside push made with every piece on the kingside', () => {
    const r = wingWithoutPieces(MYSTERIOUS, 'a5', moverOf(MYSTERIOUS));
    expect(r?.wing).toBe('queenside');
    expect(r?.officers.map((o) => o.square).sort()).toEqual(['f1', 'f2', 'g2', 'h5']);
    expect(r?.text).toContain('your queen on h5');
    expect(r?.text).toContain('all on the kingside');
  });
  it('stays silent on a clamping push that opens nothing', () => {
    expect(wingWithoutPieces(CLAMP, 'c5', moverOf(CLAMP))).toBeNull();
    expect(wingWithoutPieces(KNOCKOUT, 'b4', moverOf(KNOCKOUT))).toBeNull();
  });
  it('stays silent when a piece already stands on that wing, and on a piece move', () => {
    expect(wingWithoutPieces('5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/1R4K1 w - - 0 26', 'a5', moverOf('5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/1R4K1 w - - 0 26'))).toBeNull();
    expect(wingWithoutPieces(MYSTERIOUS, 'Qd1', moverOf(MYSTERIOUS))).toBeNull();
  });
  it('their lever with none of their pieces near it is the student\'s to use', () => {
    const r = wingWithoutPieces(MYSTERIOUS, 'a5', 'b');
    expect(r?.text).toMatch(/^Their a-pawn push/);
    expect(r?.text).toMatch(/is opened for you\.$/);
    expect(r?.text).not.toMatch(/\byour (queen|rook|bishop|knight)/);
  });
});
