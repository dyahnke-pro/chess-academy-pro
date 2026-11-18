import { describe, it, expect } from 'vitest';
import { theoreticalEndingOn, theoreticalEndingLine, theoreticalEndingMade, theoreticalEndingMadeLine } from './theoreticalEnding';
import { readBoard } from './boardComputers';
import { assemblePositionAssessment } from './groundedAnswer';

// Danya, "The Two Rook Endings You Must Know". Board 0 (move 60, Black to
// move): White's king sits in front of the f-pawn and the rook on c3 holds the
// third rank — "Black will never be able to escape the checks". Stockfish
// reads it level (-1). Board 2 (move 71): the g-pawn on the second rank, the
// black king on g1 in front of it, the white king cut off on e1 — he builds
// the bridge with ...Re7+ and ...Re5.
const PHILIDOR_60 = '8/8/8/8/5pk1/2R5/r7/5K2 b - - 0 60';
const LUCENA_71 = '7R/8/8/8/8/8/r5p1/4K1k1 b - - 0 71';

describe('theoreticalEnding — his two rook endings', () => {
  it('the Philidor: the rook already on the third rank, and the square it checks from once the pawn steps up', () => {
    const e = theoreticalEndingOn(PHILIDOR_60, -1);
    expect(e).toMatchObject({ name: 'philidor', defender: 'w', thirdRank: 'c3', behind: 'c8', inPlace: true, outcome: 'draw' });
    const w = theoreticalEndingLine(e!, 'w', true);
    expect(w).toMatch(/Philidor/);
    expect(w).toMatch(/f3/);
    expect(w).toMatch(/c8/);
    // From the attacker's seat it is their known draw.
    expect(theoreticalEndingLine(e!, 'b', true)).toMatch(/known draw/);
  });

  it('the Lucena: the bridge on the rook\'s own file, the fourth rank from Black\'s side', () => {
    const e = theoreticalEndingOn(LUCENA_71, -900);
    expect(e).toMatchObject({ name: 'lucena', attacker: 'b', bridge: 'a5', outcome: 'win' });
    expect(theoreticalEndingLine(e!, 'b', true)).toMatch(/build a bridge/);
    expect(theoreticalEndingLine(e!, 'b', true)).toMatch(/a5/);
    // A live board names no square.
    expect(theoreticalEndingLine(e!, 'b', false)).not.toMatch(/a5/);
    expect(theoreticalEndingLine(e!, 'w', true)).toMatch(/known win for them/);
  });

  it('the engine must agree (negative controls)', () => {
    expect(theoreticalEndingOn(LUCENA_71, 0)).toBeNull();       // a Lucena the engine calls level is not named
    expect(theoreticalEndingOn(PHILIDOR_60, -900)).toBeNull();  // nor a Philidor it calls lost
  });

  it('a Philidor too late: the attacking king already on the sixth — not named', () => {
    // The lesson corpus's setup board: White's king on e6 with the pawn on e5.
    expect(theoreticalEndingOn('5k2/8/4K3/4P3/8/8/r7/4R3 w - - 0 1', null)).toBeNull();
  });

  it('the rook-pawn corner, from both seats', () => {
    const e = theoreticalEndingOn('7k/8/7K/7P/8/8/8/8 w - - 0 1', 0);
    expect(e?.name).toBe('rook-pawn');
    expect(theoreticalEndingLine(e!, 'w', true)).toMatch(/draw/);
  });
});

describe('theoreticalEnding — the move that made it', () => {
  it('Rc4 in the textbook Lucena builds the bridge', () => {
    const fen = '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1';
    const m = theoreticalEndingMade(fen, 'Rc4', null);
    expect(m?.step).toBe('bridge');
    expect(theoreticalEndingMadeLine(m!, 'w')).toMatch(/builds the bridge/);
    const f = readBoard('theoreticalEnding', { fenBefore: fen, san: 'Rc4', student: 'w', afterCp: 1500 });
    expect(f?.seat).toBe('student');
    expect(f?.kind).toBe('technique');
  });

  it('Ra6 takes the third rank: the Philidor set', () => {
    const fen = '4k3/8/8/r3P3/4K3/8/8/4R3 b - - 0 1';
    const m = theoreticalEndingMade(fen, 'Ra6', null);
    expect(m?.step).toBe('third-rank');
    expect(theoreticalEndingMadeLine(m!, 'b')).toMatch(/Philidor/);
  });

  it('the position read names the ending and its squares', () => {
    const a = assemblePositionAssessment({ tempting: null, evalCp: -1, mateIn: null, tactics: null, studentColor: 'white', fen: PHILIDOR_60, bestUci: null });
    expect(a?.facts).toMatch(/Philidor/);
    expect(a?.keySquares).toEqual(expect.arrayContaining(['f4', 'c3']));
  });
});
