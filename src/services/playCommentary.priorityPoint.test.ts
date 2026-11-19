import { describe, expect, it } from 'vitest';
import { buildPriorityFirst } from './playCommentary';

// "AIM AT IT" ONLY WHEN THE WEAK PAWN IS THE MOVE'S POINT (Danya narration
// test 2026-11-19). Real boards, the engine's best move.
describe('buildPriorityFirst — the pawn is the point', () => {
  it('how to play a brilliancy #3: Re4!! offered to two captures is not aimed at d4', () => {
    expect(buildPriorityFirst({ fen: '4r1k1/1p4p1/pPp2r1p/P1Pp1p2/3P1Pn1/2NR1P2/3Q2Bq/R4K2 b - - 0 31', studentColor: 'black', bestUci: 'e8e4' })).toBeNull();
  });
  it('never resign prematurely #1: the Qe3 desperado is not aimed at c3', () => {
    expect(buildPriorityFirst({ fen: '1r6/5kp1/RqQb1p1p/1p1PpP2/1Pp1B3/2P4P/6P1/5K2 b - - 0 45', studentColor: 'black', bestUci: 'b6e3' })).toBeNull();
  });
  it('tales from a grandmaster #1: b1=Q is a promotion, not an aim at h7', () => {
    expect(buildPriorityFirst({ fen: '3r3k/1q4bP/p3Q3/4B3/5N1R/4K3/1p6/8 b - - 0 37', studentColor: 'black', bestUci: 'b2b1q' })).toBeNull();
  });
  it('negative control: mysterious GM moves #3, Bf3 aims at the backward d5 pawn', () => {
    expect(buildPriorityFirst({ fen: '5rk1/pp2qrpp/4b3/3pPp1Q/2pP3P/P1P3P1/1P3RB1/5RK1 w - - 0 25', studentColor: 'white', bestUci: 'g2f3' })?.targetSquare).toBe('d5');
  });
});
