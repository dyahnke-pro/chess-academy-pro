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
    expect(boardReason(fen, 'a3', 'Nf3', 'opening')?.tag).toBe('neglected-development');
    expect(positionalReason({ fen, playedSan: 'a3', bestSan: 'Nf3', namesBetterMove: false })?.note)
      .toBe('A minor piece is still at home that the better move would have brought out.');
  });
  it('nothing to compare without a better move', () => {
    expect(positionalReason({ fen, playedSan: 'a3', bestSan: null, namesBetterMove: true })).toBeNull();
  });
  it('the record files the same reading the voice says (one computer)', () => {
    const filed = slipCause({ fen, playedSan: 'a3', bestSan: 'Nf3', phase: 'opening' });
    const said = positionalReason({ fen, playedSan: 'a3', bestSan: 'Nf3', namesBetterMove: true });
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
