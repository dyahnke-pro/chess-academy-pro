// "Should I recapture with the pawn or the queen?" after 13.Nxe5 in the
// Blumenfeld (question walk 2026-09-27). The worse move must come WITH its
// refutation, not only a number.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assembleCompareMovesAnswer } from './groundedAnswer';

const FEN = (() => {
  const c = new Chess();
  for (const s of 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5'.split(' ')) c.move(s);
  return c.fen();
})();

describe('two moves compared', () => {
  it('names the better one and shows the worse one refuted', () => {
    const a = assembleCompareMovesAnswer({
      fen: FEN,
      a: { san: 'dxe5', evalCp: -50, mateIn: null, lineUci: ['b2e5'] },
      b: { san: 'Qb6', evalCp: -400, mateIn: null, lineUci: ['e5f7'] },
    });
    expect(a?.facts).toMatch(/^dxe5 is better\./);
    expect(a?.facts).toMatch(/Qb6\? Then Nxf7 — it takes your pawn on f7/);
  });
  it('near-equal moves are said to be equal (no invented winner)', () => {
    const a = assembleCompareMovesAnswer({
      fen: FEN,
      a: { san: 'dxe5', evalCp: -50, mateIn: null, lineUci: [] },
      b: { san: 'Qb6', evalCp: -60, mateIn: null, lineUci: [] },
    });
    expect(a?.facts).toMatch(/about the same/);
  });
  it('no eval → no answer rather than a guess', () => {
    expect(assembleCompareMovesAnswer({
      fen: FEN,
      a: { san: 'dxe5', evalCp: null, mateIn: null, lineUci: [] },
      b: { san: 'Qb6', evalCp: -60, mateIn: null, lineUci: [] },
    })).toBeNull();
  });
});

describe('can they take on a square', async () => {
  const { assembleCaptureOnAnswer } = await import('./groundedAnswer');
  const { captureOnAsk } = await import('../coach/questionIntents');
  const g = new Chess();
  for (const s of 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3 Qg6 Be5 Rfd8 a5 Bd6 Bxd6 Rxd6 a6 Ba8 Nh5 Nxh5 Bxh5 Qg5 Qg4 Qxg4 Bxg4 Rc7 Rc2 d4 Rec1 d3'.split(' ')) g.move(s);
  it('the doubled rooks win the c5 pawn', () => {
    expect(captureOnAsk('Can they take on c5?')).toEqual({ capturer: 'opponent', square: 'c5' });
    const a = assembleCaptureOnAnswer({ fen: g.fen(), square: 'c5', capturer: 'opponent', studentColor: 'black' });
    expect(a?.facts).toMatch(/^Yes — Rxc5 wins your pawn on c5, about 1 point/);
  });
  it('a square nothing reaches is a plain no (negative control)', () => {
    const a = assembleCaptureOnAnswer({ fen: g.fen(), square: 'h7', capturer: 'opponent', studentColor: 'black' });
    expect(a?.facts).toMatch(/^No — nothing of theirs can take on h7/);
  });
});

describe('is my d-pawn strong', async () => {
  const { assemblePawnStrengthAnswer } = await import('./groundedAnswer');
  const { pawnStrengthAsk } = await import('../coach/questionIntents');
  const g = new Chess();
  for (const s of 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3 Qg6 Be5 Rfd8 a5 Bd6 Bxd6 Rxd6 a6 Ba8 Nh5 Nxh5 Bxh5 Qg5 Qg4 Qxg4 Bxg4 Rc7 Rc2 d4 Rec1 d3'.split(' ')) g.move(s);
  it('the protected passer on d3', () => {
    expect(pawnStrengthAsk('Is my d-pawn strong?')).toEqual({ file: 'd' });
    const a = assemblePawnStrengthAnswer({ fen: g.fen(), file: 'd', studentColor: 'black' });
    expect(a?.facts).toMatch(/^Yes — your pawn on d3 is a passed pawn, 2 squares from queening, and nothing stands in front of it\. It's protected by your pawn on e4\./);
  });
  it('no pawn on the file is said plainly (negative control)', () => {
    const a = assemblePawnStrengthAnswer({ fen: g.fen(), file: 'b', studentColor: 'black' });
    expect(a?.facts).toBe("You don't have a pawn on the b-file.");
  });
});
