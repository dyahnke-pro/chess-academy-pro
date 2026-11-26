import { describe, it, expect } from 'vitest';
import { classifyMistake, type MistakeCauseReads } from './mistakeCause';
import { errorWhy } from './inaccuracyCall';

const none: MistakeCauseReads = {
  allowedMate: false, missedMate: false, failedKind: null, playedCaptures: false,
  allowedWins: false, allowedMotif: null, allowedThreat: false, kingHunt: false, ignoredThreat: false,
  missedMotif: null, missedWins: false, tag: null, causedByMove: true, structural: null,
};

describe('classifyMistake', () => {
  it('nothing read is unexplained, never guessed', () => {
    expect(classifyMistake(none).kind).toBe('unexplained');
  });
  it('held-by-defender splits on a capture', () => {
    expect(classifyMistake({ ...none, failedKind: 'held-by-defender', playedCaptures: true }).kind).toBe('took-guarded');
    expect(classifyMistake({ ...none, failedKind: 'held-by-defender' }).kind).toBe('eyed-guarded');
  });
  it('mate outranks the mechanism', () => {
    expect(classifyMistake({ ...none, allowedMate: true, failedKind: 'lost-the-piece' }).kind).toBe('allowed-mate');
  });
  it('a won line with a motif is a tactic, without one a capture', () => {
    expect(classifyMistake({ ...none, allowedWins: true, allowedMotif: 'fork' }).kind).toBe('allowed-tactic');
    expect(classifyMistake({ ...none, allowedWins: true }).kind).toBe('allowed-capture');
  });
  it('a threat already on the board that lands is ignored, not caused', () => {
    expect(classifyMistake({ ...none, causedByMove: false, ignoredThreat: true }).kind).toBe('ignored-threat');
  });
  it('the tag survives on every kind', () => {
    expect(classifyMistake({ ...none, missedWins: true, tag: 'misplaced-piece' }).tag).toBe('misplaced-piece');
    expect(classifyMistake({ ...none, tag: 'misplaced-piece' }).kind).toBe('positional');
  });
});

// David's Smith-Morra 8.Bxf7+ (bxf7LostSquare.test.ts): the king takes back.
describe('errorWhy hands over its cause', () => {
  it('Bxf7+ Kxf7 is a guarded piece taken', () => {
    const ew = errorWhy({
      fenBefore: 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8', playedSan: 'Bxf7+', moverColor: 'white', bestSan: 'Ng5',
      bestLineUci: ['f3g5', 'c6e5', 'd1b3', 'e5c4', 'b3c4'],
      replyLineUci: ['e8f7', 'c1d2', 'f7e8', 'd1b3', 'g8f6'],
      missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false,
    } as never);
    expect(ew.cause.kind).toBe('took-guarded');
    expect(ew.cause.causedByMove).toBe(true);
  });
});

// David's game chesscom-1015773958, ply 25 (theirs, 181 cp): 13.Nxf3 lets
// …Nxf3+ fork the king on e1 and the queen on d2 (saved engine read).
describe('walks into a fork', () => {
  it('Nxf3 lets the knight fork king and queen', () => {
    const ew = errorWhy({
      fenBefore: 'r3k2r/pp3pbp/1q1p1np1/2p1p3/3nPP2/2PP1bP1/PP1Q3P/R1B1KBNR w KQkq - 1 13', playedSan: 'Nxf3', moverColor: 'white', bestSan: 'Bg2',
      bestLineUci: ['f1g2', 'f3g2', 'd2g2', 'd4e6', 'f4f5', 'g6f5'],
      replyLineUci: ['d4f3', 'e1e2', 'f3d2', 'e2d2', 'c5c4', 'd2e1'], replySan: 'Nxf3+',
      missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false,
    } as never);
    expect(ew.cause.kind).toBe('walks-into-fork');
    expect(ew.failedSquares).toEqual(expect.arrayContaining(['f3', 'e1', 'd2']));
  });
});

// David's game chesscom-1005776142, ply 88: the pawn on d2 was already
// attacked; …Ke7 leaves it, and Rxd2 takes it.
describe('ignored a threat already on the board', () => {
  it('…Ke7 leaves the d2 pawn to the rook', () => {
    const ew = errorWhy({
      fenBefore: '5k2/5p1p/1r6/1P6/2P1P3/4K3/3p4/3R4 b - - 0 44', playedSan: 'Ke7', moverColor: 'black', bestSan: 'h5',
      bestLineUci: ['h7h5', 'd1d2', 'h5h4', 'e3f4'],
      replyLineUci: ['d1d2', 'h7h5', 'd2d5', 'b6h6', 'c4c5'], replySan: 'Rxd2',
      missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false,
    } as never);
    expect(ew.cause.kind).toBe('ignored-threat');
  });
});
