// The trade computers (S4, Danya's speedruns), each on a real board from his
// games, each with a near board where it must stay quiet.
import { describe, it, expect } from 'vitest';
import type { AnalysisLine } from '../types';
import { tradeOfferAt, tradeOfferLine } from './tradeOffer';
import { fileTradeAt, fileTradeLine } from './fileTrade';
import { pawnEndingTradeAt, pawnEndingTradeLine } from './pawnEndingTrade';
import { tradeKeptAt, tradeKeptLine } from './tradeKept';
import { readBoard } from './boardComputers';
import { questionThought } from './moveThoughtFacts';
import type { FactGroup } from './coachFact';

const lines = (rows: Array<[number, number | null, string[]]>): AnalysisLine[] =>
  rows.map(([evaluation, mate, moves], k) => ({ rank: k + 1, evaluation, mate, moves }));

describe('tradeOffer — an even trade offered while ahead', () => {
  // S-ZY 22.Qb5, two pawns up: "Qb5 retreats, offers the queen trade".
  const fen = 'r2r2k1/p1p2ppp/QnP1p3/2q1P3/8/2N1P2P/PP3PP1/R2R2K1 w - - 5 22';
  it('says the queen faces theirs and the lead it serves', () => {
    const o = tradeOfferAt(fen, 'Qb5', 10, 259, true);
    expect(o).toMatchObject({ piece: 'q', square: 'b5', facing: { piece: 'q', square: 'c5' }, up: 'two pawns' });
    expect(tradeOfferLine(o!, true, fen)).toMatch(/b5.*c5|c5.*b5/);
  });
  it('is quiet on a move that offers nothing, and on a costly one', () => {
    expect(tradeOfferAt(fen, 'a4', 10, 259, true)).toBeNull();
    expect(tradeOfferAt(fen, 'Qb5', 80, 259, true)).toBeNull();
  });
});

describe('fileTrade — rooks traded for an open file', () => {
  // S-ZY 24.Rd1: "forces the rook trade: if Black declines, White owns the d-file".
  const fen = '3r2k1/p1p1qppp/1nP1p3/1Q2P3/8/2N1P2P/PP3PP1/R5K1 w - - 0 24';
  it('the challenge: their only rook faced on the open file', () => {
    const t = fileTradeAt(fen, 'Rd1', 30, null, 'refused');
    expect(t).toMatchObject({ kind: 'challenge', file: 'd', rook: 'd1', facing: { square: 'd8' } });
    expect(fileTradeLine(t!, true, fen)).toMatch(/d-file/);
  });
  it('is quiet when they have a second rook to bring over', () => {
    expect(fileTradeAt('3r2kr/p1p1qpp1/1nP1p3/1Q2P3/8/2N1P2P/PP3PP1/R5K1 w - - 0 24', 'Rd1', 30, null, 'refused')).toBeNull();
  });
  // 4T9 19…Rxc1: "these trades hand you control of the open c-file".
  const fen2 = '2r2rk1/pp3pbp/3p2p1/4pb2/8/8/PP1KPPPP/2R2B1R b - - 2 19';
  it('the hand-off: after the king takes back, the other rook takes the file', () => {
    const t = fileTradeAt(fen2, 'Rxc1', 13, ['d2c1', 'f8c8'], 'refused');
    expect(t).toMatchObject({ kind: 'hand-off', file: 'c', on: 'c1', retaker: 'k', next: { from: 'f8', to: 'c8' } });
    expect(fileTradeLine(t!, true, fen2)).toMatch(/c-file/);
  });
  it('is quiet when the engine line goes elsewhere after the trade', () => {
    expect(fileTradeAt(fen2, 'Rxc1', 13, ['d2c1', 'e5e4'], 'refused')).toBeNull();
  });
  // learn-mistakes-only bug 3: the line credits the move, so an inaccuracy is
  // never "the file is yours" (g chesscom-1013773584 ply 59 Rf1 at 80 cp).
  it('is quiet on an inaccuracy or an unpriced move (the one praise rule)', () => {
    const rf1 = '2k5/1p1n4/8/p2p4/6RP/3B1rp1/PPP5/1K5R w - - 1 30';
    expect(fileTradeAt(rf1, 'Rf1', 30, null, 'refused')).toMatchObject({ kind: 'challenge', file: 'f' });
    expect(fileTradeAt(rf1, 'Rf1', 80, null, 'refused')).toBeNull();
    expect(fileTradeAt(rf1, 'Rf1', 50, null, 'refused')).toBeNull();
    expect(fileTradeAt(rf1, 'Rf1', null, null, 'refused')).toBeNull();
    // A lesson's taught line is credited unpriced.
    expect(fileTradeAt(rf1, 'Rf1', null, null, 'taught-line')).toMatchObject({ kind: 'challenge' });
    expect(fileTradeAt(rf1, 'Rf1', 80, null, 'taught-line')).toBeNull();
  });
});

describe('pawnEndingTrade — the last pieces off into a won pawn ending', () => {
  // S-ZY 36.Nxc7: "the pawn ending two pawns up wins straightforwardly".
  const fen = '2k5/p1n2p2/N1P1p1pp/4P3/4PP2/1P2K2P/P5P1/8 w - - 4 36';
  const after = lines([[393, null, ['c8c7', 'e3d3', 'c7b6', 'd3c4']]])[0];
  it('says the knights come off into a pawn ending the mover wins', () => {
    const t = pawnEndingTradeAt(fen, 'Nxc7', after, 78);
    expect(t).toMatchObject({ traded: ['knight', 'knight'], sans: ['Nxc7', 'Kxc7'] });
    expect(pawnEndingTradeLine(t!, true, fen)).toMatch(/pawn ending/);
  });
  it('is quiet when the engine does not have it winning', () => {
    expect(pawnEndingTradeAt(fen, 'Nxc7', { ...after, evaluation: 40 }, 78)).toBeNull();
  });
});

describe('tradeKept — the even trade not taken, and the board\'s reason', () => {
  // kYbh 21.Bf3, a pawn down: "retreats instead of trading bishops, keeping pieces on".
  const kYbh = '6k1/p1r2p1p/4p1p1/8/4B3/2r5/P1b2PPP/2R1R1K1 w - - 4 21';
  const kYbhLines = lines([[-216, null, ['e1e3']], [-225, null, ['h2h4']], [-235, null, ['g2g3']], [-238, null, ['e4f3']], [-260, null, ['h2h3']]]);
  it('behind: the bishop steps out of the trade on c2', () => {
    const k = tradeKeptAt({ fenBefore: kYbh, san: 'Bf3', before: kYbhLines, priorMove: { to: 'c7', captured: null }, theirLast: null });
    expect(k).toMatchObject({ trade: { from: 'e4', to: 'c2' }, reason: { kind: 'behind' }, steppedAway: true });
    expect(tradeKeptLine(k!, false, kYbh)).toMatch(/trade on c2/);
  });
  it('is quiet when the move played is not among the engine\'s lines', () => {
    expect(tradeKeptAt({ fenBefore: kYbh, san: 'Bf3', before: kYbhLines.filter((l) => l.moves[0] !== 'e4f3'), priorMove: { to: 'c7', captured: null }, theirLast: null })).toBeNull();
  });
  // QUk 8.Nc3: "Don't take on h6: … b2 would be left weak".
  const quk = 'r3kb1r/pp1b1ppp/1qn1p2n/2ppP3/3P4/3B1N2/PPP2PPP/RNBQR1K1 w kq - 8 8';
  const qukLines = lines([[46, null, ['c2c3']], [44, null, ['b1c3']], [43, null, ['h2h3']], [43, null, ['b2b3']], [33, null, ['c2c4']]]);
  it('guard: the c1 bishop holds b2 against their queen', () => {
    const k = tradeKeptAt({ fenBefore: quk, san: 'Nc3', before: qukLines, priorMove: null, theirLast: null });
    expect(k?.reason).toMatchObject({ kind: 'guard', guarded: { square: 'b2' }, by: { piece: 'q', square: 'b6' } });
    expect(tradeKeptLine(k!, true, quk)).toMatch(/b2/);
  });
  it('is quiet when their queen is not on b6 (no guard duty)', () => {
    const near = 'r3kb1r/pp1b1ppp/q1n1p2n/2ppP3/3P4/3B1N2/PPP2PPP/RNBQR1K1 w kq - 8 8';
    expect(tradeKeptAt({ fenBefore: near, san: 'Nc3', before: qukLines, priorMove: null, theirLast: null })?.reason.kind).not.toBe('guard');
  });
  // 4T9 8…d6: "Nd4 threatens nothing, so don't take".
  const t4 = 'r1bq1rk1/pp1pppbp/2n2np1/3p4/2PN4/4B3/PPQNPPPP/R3KB1R b KQ - 3 8';
  const t4Lines = lines([[-448, null, ['f6g4']], [-378, null, ['f8e8']], [-376, null, ['d5c4']], [-366, null, ['d7d6']], [-353, null, ['e7e5']]]);
  const theirLast = { fenBefore: 'r1bq1rk1/pp1pppbp/2n2np1/3p4/2P5/4BN2/PPQNPPPP/R3KB1R w KQ - 2 8', san: 'Nd4' };
  it('no threat: their knight came to d4 and threatens nothing', () => {
    const k = tradeKeptAt({ fenBefore: t4, san: 'd6', before: t4Lines, priorMove: { to: 'd4', captured: null }, theirLast });
    expect(k).toMatchObject({ trade: { from: 'c6', to: 'd4' }, reason: { kind: 'no-threat' } });
  });
  it('is quiet when their knight got there by taking', () => {
    const took = { fenBefore: 'r1bq1rk1/pp1pppbp/2n2np1/3p4/2Pp4/4BN2/PPQNPPPP/R3KB1R w KQ - 0 8', san: 'Nxd4' };
    expect(tradeKeptAt({ fenBefore: t4, san: 'd6', before: t4Lines, priorMove: { to: 'd4', captured: 'p' }, theirLast: took })).toBeNull();
  });
  it('reaches a surface through the registry, with its proof', () => {
    const f = readBoard('tradeKept', { fenBefore: quk, san: 'Nc3', before: qukLines, priorMove: null, theirLast: null, student: 'w' });
    expect(f?.seat).toBe('student');
    expect(f?.squares).toContain('b2');
  });
});

describe('chat answers with the trades (questionThought)', () => {
  const ask = (fenBefore: string, san: string, before: AnalysisLine[], after: AnalysisLine[], costCp: number, groups: FactGroup[], theirLast: { fenBefore: string; san: string } | null = null): ReturnType<typeof questionThought> =>
    questionThought({ namesPlayedMove: true, fenBefore, san, plainThreatsSeen: false, moverIsStudent: true, prev: { square: null, capturedValue: 0, net: 0 } as never, line: null,
      theirLast, story: false, history: [], reads: { before, passBefore: [], after, passAfter: [] }, costCp, theory: false }, new Set(groups), null, null);
  it('"why Qb5?" carries the queen-trade offer (S-ZY 22.Qb5)', () => {
    const fen = 'r2r2k1/p1p2ppp/QnP1p3/2q1P3/8/2N1P2P/PP3PP1/R2R2K1 w - - 5 22';
    const t = ask(fen, 'Qb5', lines([[283, null, ['d1d8']], [269, null, ['a2a4']], [259, null, ['a6b5']]]), lines([[259, null, ['c5c4']]]), 10, ['move']);
    expect(t.kept.some((f) => f.computer === 'tradeOfferAt')).toBe(true);
  });
  it('"why Nxc7?" carries the won pawn ending (S-ZY 36.Nxc7)', () => {
    const fen = '2k5/p1n2p2/N1P1p1pp/4P3/4PP2/1P2K2P/P5P1/8 w - - 4 36';
    const t = ask(fen, 'Nxc7', lines([[486, null, ['a6c5']], [444, null, ['a6b4']], [408, null, ['a6c7']]]), lines([[393, null, ['c8c7', 'e3d3']]]), 78, ['move']);
    expect(t.kept.some((f) => f.computer === 'pawnEndingTradeAt')).toBe(true);
  });
  it('"why Rd1?" carries the file challenge, and "why Nc3?" the trade kept (QUk 8.Nc3)', () => {
    const rd1 = ask('3r2k1/p1p1qppp/1nP1p3/1Q2P3/8/2N1P2P/PP3PP1/R5K1 w - - 0 24', 'Rd1', lines([[302, null, ['a2a4']], [283, null, ['b5a5']], [269, null, ['a1c1']]]), lines([[272, null, ['d8d1']]]), 30, ['move']);
    expect(rd1.kept.some((f) => f.computer === 'fileTradeAt')).toBe(true);
    const quk = 'r3kb1r/pp1b1ppp/1qn1p2n/2ppP3/3P4/3B1N2/PPP2PPP/RNBQR1K1 w kq - 8 8';
    const nc3 = ask(quk, 'Nc3', lines([[46, null, ['c2c3']], [44, null, ['b1c3']], [43, null, ['h2h3']], [43, null, ['b2b3']]]), lines([[38, null, ['c5d4']]]), 2, ['choices']);
    expect(nc3.kept.some((f) => f.computer === 'tradeKeptAt')).toBe(true);
    expect(nc3.spoken).toMatch(/b2/);
  });
});

describe('a move that piles on the trade square keeps no trade off', () => {
  it('colle800 15.Qg4: the queen joins the bishop on g5 — no "taking would trade bishops"', async () => {
    const { tradeKeptAt } = await import('./tradeKept');
    const fen = 'r1bqrnk1/5ppp/p1n1p3/1p1pP1bN/3p4/2PB4/PP3PPP/R1BQR1K1 w - - 0 15';
    const line = (m: string, cp: number) => ({ moves: [m], evaluation: cp, mate: null });
    expect(tradeKeptAt({ fenBefore: fen, san: 'Qg4', before: [line('d1g4', 300), line('c1g5', 0), line('h5g7', -100)], priorMove: null, theirLast: null } as never)).toBeNull();
  });
});

