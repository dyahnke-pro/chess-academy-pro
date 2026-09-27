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


describe('Q6 — every plan is its own sentence', () => {
  it('two plans never run together without a full stop', async () => {
    const { assembleBoardPlanAnswer } = await import('../services/groundedAnswer');
    const f = assembleBoardPlanAnswer('r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13', 'white', 'me')?.facts ?? '';
    expect(f).toMatch(/The plan from here/);
    // A lower-case word followed by a capitalised "The plan" = a missing stop.
    expect(f).not.toMatch(/[a-z] The plan from here/);
  });
});

describe('Q5 — "is my d4 pawn weak?" reads its health, not whether it runs', () => {
  it('names the structure and the live count of attackers and defenders', async () => {
    const { assemblePawnStrengthAnswer } = await import('../services/groundedAnswer');
    const f = assemblePawnStrengthAnswer({ fen: 'r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13', file: 'd', studentColor: 'white' })?.facts ?? '';
    expect(f).not.toMatch(/isn't passed/);
    expect(f).toMatch(/Not structurally — your pawn on d4 isn't isolated, doubled or backward/);
    expect(f).toMatch(/attacked once \(knight on c6\) and defended 3 times/);
  });
  it('NEGATIVE CONTROL: a real isolani is called isolated', async () => {
    const { assemblePawnStrengthAnswer } = await import('../services/groundedAnswer');
    const f = assemblePawnStrengthAnswer({ fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 10', file: 'd', studentColor: 'white' })?.facts ?? '';
    expect(f).toMatch(/Yes — your pawn on d4 is isolated — no pawn on the c-file or e-file can ever defend it/);
  });
  it('a Sicilian d6 behind e5 with d5 covered is backward', async () => {
    const { assemblePawnStrengthAnswer } = await import('../services/groundedAnswer');
    const f = assemblePawnStrengthAnswer({ fen: '4k3/8/3p4/4p3/2P1P3/8/8/4K3 b - - 0 1', file: 'd', studentColor: 'black' })?.facts ?? '';
    expect(f).toMatch(/your pawn on d6 is backward — no pawn can come up to support it, and their pawn controls d5/);
  });
});

describe('Q10 — "is my bishop on e3 good or bad?" answers about the bishop', () => {
  it('reads that bishop, never a survey of every piece', async () => {
    const { assemblePositionalAnswer } = await import('../services/groundedAnswer');
    const f = assemblePositionalAnswer('r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13', 'white', 'piece-quality' as never, 'Is my bishop on e3 good or bad?')?.facts ?? '';
    expect(f).not.toMatch(/None of your pieces stand out/);
    expect(f).toMatch(/your bishop on e3/);
  });
});

describe('Q1 — the best move is said with a reason', () => {
  it('a quiet best move with no tactical point still says why it is best', async () => {
    const { assembleMoveEvalAnswer } = await import('../services/groundedAnswer');
    const f = assembleMoveEvalAnswer({ fen: 'r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13', bestMoveUci: 'g2g3', evalCp: 100, mateIn: null, studentColor: 'white' })?.facts ?? '';
    expect(f).toMatch(/^The best move is g3\. \S/);
    expect(f).not.toMatch(/^The best move is g3\. You're/);
  });
});

describe('Q7 — no capital after the colon', () => {
  it('"The engine preferred d5: it opens up the center"', async () => {
    const { assembleRetrospectiveAnswer } = await import('../services/groundedAnswer');
    // Position before 12…Qc8 in the 1200 Sicilian; the engine preferred …d5.
    const { Chess } = await import('chess.js');
    const c = new Chess();
    for (const m of 'e4 c5 Nf3 d6 c3 Nc6 d4 cxd4 cxd4 Bg4 Be2 Nf6 Nc3 Bxf3 Bxf3 e6 Qa4 Qd7 Be3 Be7 O-O O-O Rad1'.split(' ')) c.move(m);
    const a = assembleRetrospectiveAnswer({
      playedSan: 'Qc8', fenBefore: c.fen(), moveNumber: 12, moverColor: 'black', mover: 'coach',
      bestMoveUci: 'd6d5', cpLoss: 60, quality: 'inaccuracy', missedMate: null, allowedMate: null,
    });
    expect(a.facts).toMatch(/The engine preferred d5/);
    expect(a.facts).toMatch(/preferred d5: [a-z]/);
  });
});

describe('Colle run — the plan puts the hanging queen first', () => {
  const COLLE = 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16';
  it('a loose queen leads the plan answer', async () => {
    const { assembleBoardPlanAnswer } = await import('../services/groundedAnswer');
    const f = assembleBoardPlanAnswer(COLLE, 'white', 'me')?.facts ?? '';
    expect(f).toMatch(/^First, your queen on g4 can be taken — that comes before any plan\./);
  });
  it('NEGATIVE CONTROL: with nothing loose, no "First," line', async () => {
    const { assembleBoardPlanAnswer } = await import('../services/groundedAnswer');
    const f = assembleBoardPlanAnswer('r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13', 'white', 'me')?.facts ?? '';
    expect(f).not.toMatch(/^First,/);
  });
});
