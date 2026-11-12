import { describe, it, expect } from 'vitest';
import { mistakeTurnLine, sameLossAsGrade } from './mistakeTurnLine';
import { Chess } from 'chess.js';
import { backwardLook } from './backwardLook';
import { learnFundamentalVerdict } from './learnFundamentalNarration';
import { studentMoveTeaching } from './learnBoardTeaching';
import { NO_SECOND_READ } from './inaccuracyCall';

// David's Smith-Morra replay (teach-mvfhdihq-7i8vk5), 8.Bxf7+ Kxf7: the turn's
// line as the page composed it, with the real producers' text.
const FUND = {
  diagnosis: 'That pawn was defended: your bishop takes on f7 and is taken on the spot — it cost you far more than a pawn.',
  howOnly: 'Next time: before taking a free pawn, ask why they let you.',
  square: 'f7',
  reply: null,
};
const EVIDENCE = 'Bxf7+ was a mistake. That took the pawn on f7, but the king on e8 takes back — you lose a bishop for a pawn.';
const BLUNDER_CHECK = 'Blunder check before you let go of a piece: run CCT for them.';

describe('the mistake turn says one loss and teaches one habit', () => {
  it('8.Bxf7+: the grade says the loss once, the fundamental keeps only its habit', () => {
    let asked = 0;
    const turn = mistakeTurnLine({
      fund: FUND, evidence: EVIDENCE, lostSquare: 'f7', gradeReply: null, bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null,
      slipQuestion: () => { asked += 1; return BLUNDER_CHECK; },
    });
    expect(turn.teachesMethod).toBe(true);
    expect(turn.body).toBe(EVIDENCE);
    expect(turn.habit).toBe(FUND.howOnly);
    expect(`${turn.body} ${turn.habit}`).not.toMatch(/far more than a pawn/);
    expect(turn.habit).not.toMatch(/Blunder check/);
    expect(asked).toBe(0); // never computed, so its say-once key is not spent
  });
  it('a fundamental about another square still speaks in full, and its habit replaces the blunder check', () => {
    const turn = mistakeTurnLine({
      fund: { ...FUND, square: 'd5' }, evidence: EVIDENCE, lostSquare: 'f7', gradeReply: null, bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body.startsWith(FUND.diagnosis)).toBe(true);
    expect(turn.habit).not.toMatch(/Blunder check/);
  });
  it('the habit closes the turn: what the move did, the loss, then the habit (David 2026-10-20)', () => {
    const turn = mistakeTurnLine({
      fund: { ...FUND, square: 'd5' }, evidence: EVIDENCE, lostSquare: 'f7', gradeReply: null, bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: 'They get the d5 square for good.', slipQuestion: () => BLUNDER_CHECK,
    });
    // The body is the diagnosis, the loss and what lasts; the habit is apart, said last.
    expect(turn.body).toBe(`${FUND.diagnosis} ${EVIDENCE} They get the d5 square for good.`);
    expect(turn.habit).toBe(FUND.howOnly);
  });
  it('with no habit taught this turn the blunder check is asked', () => {
    const turn = mistakeTurnLine({
      fund: { ...FUND, howOnly: '' }, evidence: EVIDENCE, lostSquare: 'f7', gradeReply: null, bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body).toBe(EVIDENCE);
    expect(turn.habit).toBe(BLUNDER_CHECK);
  });
  it('a plain mistake: the grade, its tail, then the question', () => {
    const turn = mistakeTurnLine({
      fund: null, evidence: EVIDENCE, lostSquare: 'f7', gradeReply: null, bookSaid: false,
      slipPrefix: () => '', plainTail: ' A pin is …', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body).toBe(`${EVIDENCE} A pin is …`);
    expect(turn.habit).toBe(BLUNDER_CHECK);
  });
  it('a turn with no habit and no question says so (the door may add one)', () => {
    expect(mistakeTurnLine({
      fund: null, evidence: EVIDENCE, lostSquare: null, gradeReply: null, bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => null,
    }).teachesMethod).toBe(false);
  });
  it('same loss = same square, for any fundamental', () => {
    expect(sameLossAsGrade({ square: 'f7' }, 'f7')).toBe(true);
    expect(sameLossAsGrade({ square: 'f7' }, null)).toBe(false);
    expect(sameLossAsGrade(null, 'f7')).toBe(false);
  });
});

// OS-11 item 6d, the live path on the g1 board (8.Bxf7+ Kxf7, real Stockfish
// lines at depth 18): the grade's read never reported the square it lost, so
// `sameLossAsGrade` was false and the loss was said twice; and the blunder-check
// lane taught a second habit beside the fundamental's HOW.
describe('8.Bxf7+ on the live producers: one loss, one habit', () => {
  const H = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 g6 O-O Bg7'.split(' ');
  const c = new Chess(); for (const m of H.slice(0, -1)) c.move(m);
  const priorFen = c.fen(); c.move('Bg7');
  const fenBefore = c.fen(); c.move('Bxf7+'); const fenAfter = c.fen();
  const best = 'e4e5 c6e5 f3e5 g7e5 f1e1 g8f6 c1h6 e5h2 g1f1 h2e5'.split(' ');
  const reply = 'e8f7 f3g5 f7f8 c3d5 g7f6 d1b3 f6g5 c1g5 h7h6 g5d2'.split(' ');
  const scores = { bestWhiteCp: -32, playedWhiteCp: -236 };
  it('the grade names the square it lost, so the fundamental keeps only its HOW', () => {
    const look = backwardLook({ secondReads: NO_SECOND_READ, fenBefore, fenAfter, playedSan: 'Bxf7+', priorMove: { fenBefore: priorFen, san: 'Bg7' }, bestSan: 'e5', bestPvUci: best, replyPvUci: reply, replySan: 'Kxf7', cpLoss: 204, scores, moverEvalAfterCp: -236, studentColor: 'white' });
    expect(look?.lostSquare).toBe('f7');
    const fund = learnFundamentalVerdict({ fenBefore, betterNamed: look?.namesBetter ?? null, namesBetterMove: false, replySan: 'Kxf7', historySans: [...H, 'Bxf7+'], playedSan: 'Bxf7+', bestSan: 'e5', studentColor: 'white', price: { costCp: 204, scores, settled: true }, bestPvUci: best, playedPvUci: reply }, new Set());
    expect(fund?.square).toBe('f7');
    const turn = mistakeTurnLine({ fund, evidence: look!.line, lostSquare: look!.lostSquare ?? null, gradeReply: null, bookSaid: false, slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK });
    expect(turn.body.startsWith(look!.line)).toBe(true);
    expect(turn.body).not.toContain(fund!.diagnosis.split(/(?<=[.!?])\s+/)[0]);
    expect(turn.teachesMethod).toBe(true);
  });
  it('the blunder-check lane is a method, so the door keeps one beside a taught HOW', () => {
    const hints = studentMoveTeaching({ linesAfter: [], namesStudentMoves: true, fenBefore, san: 'Bxf7+', reply: 'Kxf7', history: [...H, 'Bxf7+'], cpLoss: 204, cpAfter: -236, bothCp: true, bestSan: 'e5', bestLine: undefined, studentColor: 'white' } as never);
    const bc = hints.find((h) => h.lane === 'blunderCheck');
    expect(bc).toBeDefined();
    expect(bc!.claims?.some((c) => c.startsWith('method:'))).toBe(true);
  });
});

// David's Colle replay (2026-11-05), 20.Qxf4: one answer of theirs, said three
// ways — the fundamental ("That hands them a tempo: f6 comes with a threat on
// your bishop"), the grade ("it let them play …f6, which attacks the bishop on
// g5 — Bxf4 was the move") and the recapture line ("Better to take back with
// the bishop — Bxf4; Qxf4 would put the queen on f4, where …e5 hits it", a
// second reason for the same better move). Real Stockfish lines.
describe('20.Qxf4 on the live producers: one answer, one reason', () => {
  const SANS = 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 O-O Be7 Nbd2 a6 e4 O-O e5 Nd7 Re1 b5 Nf1 Re8 Ng3 Nf8 Nh5 cxd4 Ng5 Bxg5 Qg4 Nxe5 Qg3 Nfg6 Bxg5 Qb6 Bxg6 Nxg6 Nf4 Nxf4'.split(' ');
  const c = new Chess(); for (const m of SANS.slice(0, -1)) c.move(m);
  const priorFen = c.fen(); c.move('Nxf4');
  const fenBefore = c.fen(); c.move('Qxf4'); const fenAfter = c.fen();
  const best = 'g5f4 f7f6 c3d4 b6d4 a1c1 c8d7 f4h6 e8e7'.split(' ');
  const reply = 'f7f6 g5f6 g7f6 f4f6 a8a7 c3d4 e8f8 f6g5'.split(' ');
  const scores = { bestWhiteCp: -117, playedWhiteCp: -292 };
  const look = backwardLook({ secondReads: NO_SECOND_READ, fenBefore, fenAfter, playedSan: 'Qxf4', priorMove: { fenBefore: priorFen, san: 'Nxf4' }, bestSan: 'Bxf4', bestPvUci: best, replyPvUci: reply, replySan: 'f6', cpLoss: 175, scores, moverEvalAfterCp: -292, studentColor: 'white' });
  const fund = learnFundamentalVerdict({ fenBefore, betterNamed: look?.namesBetter ?? null, namesBetterMove: false, replySan: 'f6', historySans: [...SANS, 'Qxf4'], playedSan: 'Qxf4', bestSan: 'Bxf4', studentColor: 'white', price: { costCp: 175, scores, settled: true }, bestPvUci: best, playedPvUci: reply }, new Set());

  it('the fundamental and the grade name the same answer, so the grade says it once', () => {
    expect(look?.line).toMatch(/f6/);
    expect(fund?.reply?.uci).toBe('f7f6');
    const turn = mistakeTurnLine({
      fund, evidence: look!.line, lostSquare: look!.lostSquare ?? null,
      gradeReply: look!.punishLine?.uci[0] ? { fen: look!.punishLine.fen, uci: look!.punishLine.uci[0] } : null,
      bookSaid: false, slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body.startsWith(look!.line)).toBe(true);
    expect(turn.body).not.toContain(fund!.diagnosis.split(/(?<=[.!?])\s+/)[0]);
  });

  it('the recapture line does not give the better recapture a second reason', () => {
    const hints = studentMoveTeaching({ linesAfter: [], namesStudentMoves: true, fenBefore, san: 'Qxf4', reply: 'f6', history: [...SANS, 'Qxf4'], cpLoss: 175, cpAfter: -292, bothCp: true, bestSan: 'Bxf4', bestLine: undefined, studentColor: 'white' } as never);
    expect(hints.find((h) => h.lane === 'recapture')).toBeUndefined();
    expect(hints.map((h) => h.text).join(' ')).not.toMatch(/e5 hits it/);
  });
});

describe('the one answer reader (fundamentalReply + sameReplyAsGrade), every surface', () => {
  const SANS = 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 O-O Be7 Nbd2 a6 e4 O-O e5 Nd7 Re1 b5 Nf1 Re8 Ng3 Nf8 Nh5 cxd4 Ng5 Bxg5 Qg4 Nxe5 Qg3 Nfg6 Bxg5 Qb6 Bxg6 Nxg6 Nf4 Nxf4'.split(' ');
  const c = new Chess(); for (const m of SANS) c.move(m);
  const fenBefore = c.fen(); c.move('Qxf4'); const fenAfter = c.fen();
  it('…f6 named by the tempo verdict and played out by the grade is one answer', async () => {
    const { fundamentalReply, sameReplyAsGrade } = await import('./mistakeTurnLine');
    const fund = fundamentalReply(['f6'], fenBefore, 'Qxf4');
    expect(fund).toEqual({ fen: fenAfter, uci: 'f7f6' });
    expect(sameReplyAsGrade(fund, { fen: fenAfter, uci: 'f7f6' })).toBe(true);
    // A different answer, or the same move on another board, is not.
    expect(sameReplyAsGrade(fund, { fen: fenAfter, uci: 'e6e5' })).toBe(false);
    expect(sameReplyAsGrade(fund, { fen: fenBefore, uci: 'f7f6' })).toBe(false);
  });
  it('a move that is not theirs to play there names no answer', async () => {
    const { fundamentalReply } = await import('./mistakeTurnLine');
    expect(fundamentalReply(['Bxf4'], fenBefore, 'Qxf4')).toBeNull();
  });
});
