/**
 * QUESTION WALK FENCE — 1200 Sicilian (lichess 1ZmVtbO3), student White, after
 * 12…Qc8 (2026-09-27). Each misroute replayed on the real position.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tapeMoveRef } from './coachService';
import { pawnStrengthAsk } from './questionIntents';

const GAME = 'e4 c5 Nf3 d6 c3 Nc6 d4 cxd4 cxd4 Bg4 Be2 Nf6 Nc3 Bxf3 Bxf3 e6 Qa4 Qd7 Be3 Be7 O-O O-O Rad1 Qc8 Qc2 a6 e5 dxe5 Be4 Nxe4 Nxe4 exd4 Bxd4 e5 Bc5 Bxc5 Nxc5 Rd8 Rfe1 g6 h3 b6 Ne4 Rxd1 Rxd1 Nd4 Nf6+ Kg7 Nh5+ gxh5 Qe4 f6 f4 Qf5 Qxa8 Ne2+ Kf1 Ng3+ Kg1 Ne2+'.trim().split(' ').slice(0, 24);
const fen = (() => { const c = new Chess(); for (const m of GAME) c.move(m); return c.fen(); })();

describe('a question about a piece that still stands there is not about the move that put it there', () => {
  it('"Is my d4 pawn weak?" is not graded as 4.d4', () => {
    expect(tapeMoveRef('Is my d4 pawn weak?', fen, GAME)).toBeNull();
  });
  it('"Is my bishop on e3 good or bad?" is not graded as 10.Be3', () => {
    expect(tapeMoveRef('Is my bishop on e3 good or bad?', fen, GAME)).toBeNull();
  });
  it('NEGATIVE CONTROL: "Why Be3?" is still about the move played', () => {
    expect(tapeMoveRef('Why Be3?', fen, GAME)).toEqual({ kind: 'san', san: 'Be3' });
  });
});

describe('the square form reaches the pawn lane', () => {
  it('"Is my d4 pawn weak?" names the d-file pawn', () => {
    expect(pawnStrengthAsk('Is my d4 pawn weak?')).toEqual({ file: 'd' });
    expect(pawnStrengthAsk('how strong is my d4-pawn')).toEqual({ file: 'd' });
  });
  it('NEGATIVE CONTROL: a move question is not a pawn question', () => {
    expect(pawnStrengthAsk('should I play d4?')).toBeNull();
  });
});
