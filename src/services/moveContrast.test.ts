// WO-LAYERS-01 step 6 — two good moves, one board-true difference.
import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import { contrastMoves, contrastClause } from './moveContrast';

const FEN = '6k1/5ppp/8/8/8/8/P4PPP/R4RK1 w - - 0 20';

describe('contrastMoves', () => {
  it('the f-rook, not the a-rook: the a1-rook stays home to guard a2', () => {
    const c = contrastMoves(FEN, 'Rad1', 'Rfd1');
    expect(c).toEqual({ keeps: 'Rfd1', drops: 'Rad1', piece: 'p', square: 'a2' });
    // The pawn is named by its file (`pieceRef`); a2 is lit, not read out.
    expect(contrastClause(c!, FEN, 'w', null)).toBe('The difference between Rfd1 and Rad1: Rfd1 keeps your a-pawn defended, and Rad1 leaves it with no guard');
    // Played, the move is "your move": the turn names it once.
    expect(contrastClause(c!, FEN, 'w', 'Rfd1')).toMatch(/^Your move keeps your a-pawn (defended, where Rad1 would have left it with no guard|guarded\. After Rad1 it would have had no guard)$/);
    expect(contrastClause(c!, FEN, 'w', 'Rad1')).toMatch(/^Your move leaves your a-pawn (with no guard, where Rfd1 would have kept it defended|unguarded\. After Rfd1 it would still have been defended)$/);
  });

  it('the order of the arguments does not change the answer', () => {
    expect(contrastMoves(FEN, 'Rfd1', 'Rad1')?.keeps).toBe('Rfd1');
  });

  it('no single difference → nothing to say', () => {
    expect(contrastMoves(FEN, 'h3', 'g3')).toBeNull();
  });
});

describe('contrastMoves — a loose piece nothing can reach is no difference (review walk 2026-10-01)', () => {
  it('h4 vs Qb3: the c1 bishop is unreachable, so nothing separates the moves', () => {
    const fen = (() => { const c = new Chess(); for (const m of 'e4 d5 exd5 Nf6 Bb5+ Bd7 Be2 Nxd5 d4 Nc6 c4 Nf6 d5 Ne5 Nf3 Ng6'.split(' ')) c.move(m); return c.fen(); })();
    expect(contrastMoves(fen, 'h4', 'Qb3')).toBeNull();
  });
});

describe('the contrast compares a piece that stands on both boards', () => {
  it('never says Rc7 keeps the rook defended that Rc7 moved away (Danya -Am8 29.Nxd7)', () => {
    const c = contrastMoves('2R2r2/p2nkp2/1p2pq2/3pNp1Q/1P1P4/P6P/5PP1/6K1 w - - 2 29', 'Nxd7', 'Rc7');
    expect(c?.square).not.toBe('c8');
  });
});

// learn-mistakes-only bug 3: "Your move keeps … defended" credits the move —
// the one praise rule; the "leaves it with no guard" side stays on any cost.
describe('the contrast read credits only a sound move', () => {
  it('keeps-direction: said at 0 cp, refused at 174 cp and unpriced; drops-direction said at 174 cp', async () => {
    const { readBoard } = await import('./boardComputers');
    const keeps = (costCp: number | null) => readBoard('contrast', { fenBefore: FEN, san: 'Rfd1', bestSan: 'Rad1', student: 'w', costCp, unpricedCredit: 'refused' });
    expect(keeps(0)?.text).toMatch(/^Your move keeps your a-pawn/);
    expect(keeps(174)).toBeNull();
    expect(keeps(null)).toBeNull();
    expect(readBoard('contrast', { fenBefore: FEN, san: 'Rfd1', bestSan: 'Rad1', student: 'w', costCp: null, unpricedCredit: 'taught-line' })?.text).toMatch(/^Your move keeps/);
    expect(readBoard('contrast', { fenBefore: FEN, san: 'Rad1', bestSan: 'Rfd1', student: 'w', costCp: 174, unpricedCredit: 'refused' })?.text).toMatch(/^Your move leaves your a-pawn/);
  }, 60000);
});
