import { describe, it, expect } from 'vitest';
import { classifyMistake, type MistakeCauseReads } from './mistakeCause';
import { errorWhy } from './inaccuracyCall';

const none: MistakeCauseReads = {
  allowedMate: false, missedMate: false, failedKind: null, playedCaptures: false,
  allowedWins: false, allowedMotif: null, allowedThreat: false, kingHunt: false,
  missedMotif: null, missedWins: false, tag: null, causedByMove: true,
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
