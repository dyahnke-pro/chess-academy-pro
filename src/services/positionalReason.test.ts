// The positional reason (WO-DECIDER-02): the reading the record files a slip
// under, said by the error computer when a costly move wins nothing either way.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { positionalReason, boardReason } from './positionalReason';
import { errorWhy, errorGradeSentence, NO_SECOND_READ } from './inaccuracyCall';
import { slipCause } from './slipCause';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const uciOf = (fen: string, sans: string[]): string[] => { const c = new Chess(fen); return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; }); };

describe('positionalReason — what the move gave up on the board', () => {
  const fen = fenAfter(['e4', 'e5']);
  it('a pawn move that leaves a minor at home, against a developing move', () => {
    expect(boardReason(fen, 'a3', 'Nf3', 'opening', (fen).split(' ')[1] as 'w' | 'b')?.tag).toBe('neglected-development');
    expect(positionalReason({ fen, playedSan: 'a3', bestSan: 'Nf3', namesBetterMove: false, student: 'w' })?.note)
      .toBe('A minor piece is still at home that the better move would have brought out.');
  });
  it('nothing to compare without a better move', () => {
    expect(positionalReason({ fen, playedSan: 'a3', bestSan: null, namesBetterMove: true, student: 'w' })).toBeNull();
  });
  it('the record files the same reading the voice says (one computer)', () => {
    const filed = slipCause({ fen, playedSan: 'a3', bestSan: 'Nf3', phase: 'opening' });
    const said = positionalReason({ fen, playedSan: 'a3', bestSan: 'Nf3', namesBetterMove: true, student: 'w' });
    expect(filed?.coachNote).toBe(said?.note);
  });
});

describe('the error computer says the positional reason, never the cost alone', () => {
  const fen = fenAfter(['e4', 'e5']);
  const base = {
    secondReads: NO_SECOND_READ, costCp: 120, fenBefore: fen, playedSan: 'a3', moverColor: 'white' as const,
    bestSan: 'Nf3', bestLineUci: uciOf(fen, ['Nf3', 'Nc6']), replyLineUci: uciOf(fenAfter(['e4', 'e5', 'a3']), ['h6', 'Nc3']),
    missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake' as const, priorMove: null,
  };
  it('a mistake that wins nothing either way is told by the board it gave up', () => {
    const ew = errorWhy({ ...base, namesBetterMove: false });
    expect(ew.consequence).toBeNull();
    expect(ew.positional).toBe('A minor piece is still at home that the better move would have brought out.');
    expect(errorGradeSentence(ew, 'mistake', 120)).toContain('A minor piece is still at home');
  });
  it('an inaccuracy is not given one', () => {
    expect(errorWhy({ ...base, quality: 'inaccuracy', costCp: 60, namesBetterMove: false }).positional).toBeNull();
  });
});

// Danya have-check 2026-11-19: "your pieces reach fewer squares after this",
// "the better move puts a rook on an open file" — which piece, which file.
describe('boardReason names its piece', () => {
  const fen = '6k1/p4pp1/2p5/1pp1P3/3q1PPp/P3NQ1P/b1P1K3/8 b - - 0 30';
  it('the piece that loses squares', () => {
    expect(boardReason(fen, 'c4', 'g6', 'endgame', (fen).split(' ')[1] as 'w' | 'b')?.note ?? boardReason(fen, 'c4', 'g6', 'middlegame', (fen).split(' ')[1] as 'w' | 'b')?.note)
      .toBe('Your bishop on a2 reaches 3 fewer squares after …c4 than after the better move.');
  });
  it('their piece it frees', () => {
    expect(boardReason(fen, 'c4', 'Qe5', 'middlegame', (fen).split(' ')[1] as 'w' | 'b')?.note).toBe('…c4 frees their knight on e3: it reaches 6 more squares than after the better move.');
  });
  it('the rook and its file', () => {
    expect(boardReason('r2r2k1/qp3ppp/1np1p1b1/p7/P2P2N1/2P5/1P1QBPPP/R4RK1 w - - 0 22', 'd5', 'Rfe1', 'middlegame', ('r2r2k1/qp3ppp/1np1p1b1/p7/P2P2N1/2P5/1P1QBPPP/R4RK1 w - - 0 22').split(' ')[1] as 'w' | 'b')?.note)
      .toBe('The better move puts your rook on the half-open e-file.');
  });
});

describe('boardReason never reads a check as a freed piece', () => {
  it('the tactical detector #0: the better move checks — no "frees their queen"', () => {
    const n = boardReason('3Q1bk1/pp5p/r3b1p1/8/4Nq2/5P2/PP6/K2RR3 w - - 0 30', 'Nd6', 'Qxf8+', 'middlegame', ('3Q1bk1/pp5p/r3b1p1/8/4Nq2/5P2/PP6/K2RR3 w - - 0 30').split(' ')[1] as 'w' | 'b')?.note ?? '';
    expect(n).not.toMatch(/frees their queen/);
  });
});

describe('a positional reason names pieces from the student\'s seat (Danya have-check: "…Nb8 … Your knight on b8" for their knight)', () => {
  it('their move reads "Their knight"; the same move as the student\'s reads "Your knight"', () => {
    const b = new Chess('r2q1rk1/pb3p1p/1pnppp2/2p5/2PPP3/BPNQ4/P5PP/R4RK1 w - - 0 15'); b.move('d5');
    expect(boardReason(b.fen(), 'Nb8', 'Qe8', 'middlegame', 'w')?.note).toBe('Their knight on b8 reaches 4 fewer squares after …Nb8 than after the better move.');
    expect(boardReason(b.fen(), 'Nb8', 'Qe8', 'middlegame', 'b')?.note).toBe('Your knight on b8 reaches 4 fewer squares after …Nb8 than after the better move.');
  });
});

// learn-mistakes-only bug 11: a king move is filed `passive-king-endgame`
// only in the endgame.
describe('bestJobReason — the king move and its phase', () => {
  it('a middlegame king step files no endgame skill; an endgame king move does', async () => {
    const { bestJobReason } = await import('./positionalReason');
    const middle = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 9';
    expect(bestJobReason(middle, 'Kh1')?.tag).not.toBe('passive-king-endgame');
    const ending = '8/5k2/8/3p4/3P4/8/5K2/8 w - - 0 50';
    expect(bestJobReason(ending, 'Ke3')?.tag).toBe('passive-king-endgame');
  });
});
