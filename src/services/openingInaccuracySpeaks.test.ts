// OPENING THEORY INACCURACIES ARE SAID (David 2026-11-18: "I want learn to
// call out opening theory inaccuracies and explaining why a move was
// inaccurate"). Below 2000 an inaccuracy is said only when the record asks for
// it, and on a record where the opening's inaccuracies rarely cost (David's)
// the move that left the book at 0.6 of a pawn passed in silence.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';

// The record says: opening inaccuracies stay quiet.
vi.mock('./inaccuracyVoice', () => ({ inaccuracySpeaks: () => false }));

const { saidSlipCp } = await import('./backwardLook');

const line = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };

describe('the move that leaves the book at a cost is said at every rating', () => {
  const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 Na3'.split(' ');
  const opening = { studentColor: 'white' as const, fenBefore: line(ITALIAN.slice(0, -1)), playedSan: 'Na3', bestSan: 'c3', historySans: ITALIAN, rating: 1200 };
  it('4.Na3, off the book and 0.65 worse: the slip is said at 1200, whatever the record', () => {
    expect(saidSlipCp({ costCp: 65, scores: { bestWhiteCp: 30, playedWhiteCp: -35 }, settled: true }, opening)).toBe(65);
  });
  it('the same cost on a move still in the book is the record\'s call (quiet here)', () => {
    const BOOK = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3'.split(' ');
    const inBook = { ...opening, fenBefore: line(BOOK.slice(0, -1)), playedSan: 'c3', historySans: BOOK };
    expect(saidSlipCp({ costCp: 65, scores: { bestWhiteCp: 30, playedWhiteCp: -35 }, settled: true }, inBook)).toBeNull();
  });
  it('a departure that costs nothing is no slip', () => {
    expect(saidSlipCp({ costCp: 0, scores: { bestWhiteCp: 30, playedWhiteCp: 30 }, settled: true }, opening)).toBeNull();
  });
});
