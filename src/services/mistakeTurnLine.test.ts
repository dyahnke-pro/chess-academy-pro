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
};
const EVIDENCE = 'Bxf7+ was a mistake. That took the pawn on f7, but the king on e8 takes back — you lose a bishop for a pawn.';
const BLUNDER_CHECK = 'Blunder check before you let go of a piece: run CCT for them.';

describe('the mistake turn says one loss and teaches one habit', () => {
  it('8.Bxf7+: the grade says the loss once, the fundamental keeps only its habit', () => {
    let asked = 0;
    const turn = mistakeTurnLine({
      fund: FUND, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
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
      fund: { ...FUND, square: 'd5' }, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body.startsWith(FUND.diagnosis)).toBe(true);
    expect(turn.habit).not.toMatch(/Blunder check/);
  });
  it('the habit closes the turn: what the move did, the loss, then the habit (David 2026-10-20)', () => {
    const turn = mistakeTurnLine({
      fund: { ...FUND, square: 'd5' }, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: 'They get the d5 square for good.', slipQuestion: () => BLUNDER_CHECK,
    });
    // The body is the diagnosis, the loss and what lasts; the habit is apart, said last.
    expect(turn.body).toBe(`${FUND.diagnosis} ${EVIDENCE} They get the d5 square for good.`);
    expect(turn.habit).toBe(FUND.howOnly);
  });
  it('with no habit taught this turn the blunder check is asked', () => {
    const turn = mistakeTurnLine({
      fund: { ...FUND, howOnly: '' }, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body).toBe(EVIDENCE);
    expect(turn.habit).toBe(BLUNDER_CHECK);
  });
  it('a plain mistake: the grade, its tail, then the question', () => {
    const turn = mistakeTurnLine({
      fund: null, evidence: EVIDENCE, lostSquare: 'f7', bookSaid: false,
      slipPrefix: () => '', plainTail: ' A pin is …', concession: null, slipQuestion: () => BLUNDER_CHECK,
    });
    expect(turn.body).toBe(`${EVIDENCE} A pin is …`);
    expect(turn.habit).toBe(BLUNDER_CHECK);
  });
  it('a turn with no habit and no question says so (the door may add one)', () => {
    expect(mistakeTurnLine({
      fund: null, evidence: EVIDENCE, lostSquare: null, bookSaid: false,
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
    const turn = mistakeTurnLine({ fund, evidence: look!.line, lostSquare: look!.lostSquare ?? null, bookSaid: false, slipPrefix: () => '', plainTail: '', concession: null, slipQuestion: () => BLUNDER_CHECK });
    expect(turn.body.startsWith(look!.line)).toBe(true);
    expect(turn.body).not.toContain(fund!.diagnosis.split(/(?<=[.!?])\s+/)[0]);
    expect(turn.teachesMethod).toBe(true);
  });
  it('the blunder-check lane is a method, so the door keeps one beside a taught HOW', () => {
    const hints = studentMoveTeaching({ fenBefore, san: 'Bxf7+', reply: 'Kxf7', history: [...H, 'Bxf7+'], cpLoss: 204, cpAfter: -236, bothCp: true, bestSan: 'e5', bestLine: undefined, studentColor: 'white' } as never);
    const bc = hints.find((h) => h.lane === 'blunderCheck');
    expect(bc).toBeDefined();
    expect(bc!.claims?.some((c) => c.startsWith('method:'))).toBe(true);
  });
});
