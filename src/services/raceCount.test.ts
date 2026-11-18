import { describe, it, expect } from 'vitest';
import { raceCountOn, raceCountLine, raceCountMade } from './raceCount';
import { readBoard } from './boardComputers';

// Danya, "Beginner Chess Strategy" (diagram 6, Black to move): "Black's king is
// too far away to stop White's advanced pawn" — and his own c3 pawn falls to
// the white king beside it.
const BEGINNER_6 = '8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2';

describe('raceCount — the rule of the square, counted', () => {
  it('his board: the d-pawn needs two moves, the h7 king needs four to reach d8', () => {
    const r = raceCountOn(BEGINNER_6);
    expect(r?.kind).toBe('runner');
    expect(r?.runners.w).toMatchObject({ square: 'd6', pushes: 2, kingMoves: 4, promo: 'd8' });
    expect(r?.runners.b).toBeUndefined(); // c3 is caught: the white king stands beside its road
    const line = raceCountLine(r!, 'b');
    expect(line).toMatch(/two moves/);
    expect(line).toMatch(/four moves/);
    expect(line).toMatch(/cannot catch/);
  });

  it('a king inside the square: no runner (negative control)', () => {
    expect(raceCountOn('8/8/3k4/8/P7/8/8/7K b - - 0 1')).toBeNull();
  });

  it('pieces on the board: no count', () => {
    expect(raceCountOn('8/5ppk/3P3p/8/8/2pK3P/5PP1/3r4 b - - 0 2')).toBeNull();
  });
});

describe('raceCount — two runners, played out', () => {
  it('the g-pawn queens first, with check', () => {
    const r = raceCountOn('7k/8/8/P7/8/8/6p1/K7 w - - 0 1');
    expect(r).toMatchObject({ kind: 'race', first: 'b', check: true });
    expect(r?.line).toEqual(['a6', 'g1=Q+']);
    expect(raceCountLine(r!, 'w')).toMatch(/They queen first, with check/);
    expect(raceCountLine(r!, 'b')).toMatch(/You queen first, with check/);
  });

  it('both queen, and the first queen skewers the second', () => {
    // g3 and c6 run, Black first: …g2 c7 …g1=Q c8=Q, and …Qc1+ wins the
    // queen on c8 along the c-file (Stockfish, depth 20: +33 for Black on this board).
    const r = raceCountOn('8/8/2P5/8/8/2K3p1/8/k7 b - - 0 1');
    expect(r).toMatchObject({ kind: 'race', first: 'b', winsQueen: { check: 'Qc1+', capture: 'Qxc8' } });
    expect(raceCountLine(r!, 'b')).toMatch(/your queen checks with Qc1\+ and takes theirs/);
    expect(raceCountLine(r!, 'w')).toMatch(/their queen checks with Qc1\+ and takes yours/);
  });

  it('the move that set the race, through the registry', () => {
    // Kxc3 would not change who runs; …Kg6 walks the king further from d8.
    const f = readBoard('raceCount', { fenBefore: '8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2', san: 'Kg6', student: 'b' });
    expect(f).toBeNull(); // the runner stood before the move too: nothing new
    const made = raceCountMade('8/4kppp/3P4/8/8/2pK3P/5PP1/8 b - - 0 2', 'Kd7');
    expect(made).toBeNull();
  });
});
