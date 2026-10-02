// "Is it a sound sacrifice to promote on d1 with check?" — the Blumenfeld's
// finish (question walk 2026-09-27). The answer used to be "d1=Q+ is the best
// move here. It gives check." about a queen given up to force mate.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assembleCandidateMoveAnswer } from './groundedAnswer';

const GAME = 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3 Qg6 Be5 Rfd8 a5 Bd6 Bxd6 Rxd6 a6 Ba8 Nh5 Nxh5 Bxh5 Qg5 Qg4 Qxg4 Bxg4 Rc7 Rc2 d4 Rec1 d3 Rxc5 Rxc5 Rxc5 g6 Rc8+ Kg7 Rxa8 d2 Rc8'.split(' ');

describe('a sacrifice that is the best move gets the soundness verdict and the line', () => {
  const c = new Chess(); for (const s of GAME) c.move(s);
  const fen = c.fen();
  const base = { fen, candidateSan: 'd1=Q+', bestMoveUci: 'd2d1q', bestEvalCp: null, candidateEvalCp: null, candidateMateIn: 2, candidateSettled: null };

  it('says sound, says mate, plays the line out', () => {
    const a = assembleCandidateMoveAnswer({ studentColor: null, ...base, candidateLineUci: ['g4d1', 'd6d1'] });
    expect(a?.facts).toMatch(/sound sacrifice — it forces mate in 2/);
    expect(a?.facts).toMatch(/The line: d1=Q\+ Bxd1 Rxd1#/);
    expect(a?.facts).not.toMatch(/is the best move here/);
  });

  it('no engine line → the verdict still stands, no invented line', () => {
    const a = assembleCandidateMoveAnswer({ studentColor: null, ...base, candidateLineUci: [] });
    expect(a?.facts).toMatch(/sound sacrifice/);
    expect(a?.facts).not.toMatch(/The line:/);
  });
});

describe('a finished game is assessed as its result', async () => {
  const { assemblePositionAssessment } = await import('./groundedAnswer');
  it('after …Rxd1# the student (Black) hears they won, nothing else', () => {
    const c = new Chess(); for (const s of [...GAME, 'd1=Q+', 'Bxd1', 'Rxd1#']) c.move(s);
    const a = assemblePositionAssessment({ evalCp: 0, mateIn: null, studentColor: 'black', fen: c.fen() });
    expect(a?.facts).toBe('Checkmate — you won.');
  });
  it('a live board is still assessed (negative control)', () => {
    const c = new Chess(); for (const s of GAME) c.move(s);
    const a = assemblePositionAssessment({ evalCp: 0, mateIn: null, studentColor: 'black', fen: c.fen() });
    expect(a?.facts).not.toMatch(/Checkmate/);
  });
});
