// Batch D (David 2026-09-01): the universal signal-extractor + candidate map.
// Pure, deterministic — these tests pin the signals and the top candidate lane
// per phrasing (the thing the observe-log records at a deflection).
import { describe, it, expect } from 'vitest';
import { extractQuerySignals, topCandidateLane } from './querySignals';

describe('extractQuerySignals', () => {
  it('detects a SAN move and a comparison', () => {
    const s = extractQuerySignals('is Nf3 better than Bc4 here?');
    expect(s.hasSan).toBe(true);
    expect(s.comparison).toBe(true);
    expect(s.whWord).toBe(false);
    expect(s.chessless).toBe(false);
  });

  it('detects castling and promotion as SAN', () => {
    expect(extractQuerySignals('should I play O-O?').hasSan).toBe(true);
    expect(extractQuerySignals('is e8=Q winning').hasSan).toBe(true);
    expect(extractQuerySignals('what about exd5').hasSan).toBe(true);
  });

  it('a bare square is not double-counted as a SAN', () => {
    const s = extractQuerySignals('what is on d5');
    expect(s.hasSan).toBe(false);
    expect(s.hasSquare).toBe(true);
  });

  it('detects self-reference, time-reference, wh-word', () => {
    const s = extractQuerySignals('how has my play improved over time?');
    expect(s.selfRef).toBe(true);
    expect(s.timeRef).toBe(true);
    expect(s.whWord).toBe(true);
    expect(s.question).toBe(true);
  });

  it('flags a pure greeting as chessless', () => {
    expect(extractQuerySignals('thanks so much coach').chessless).toBe(true);
    expect(extractQuerySignals('hey there').chessless).toBe(true);
  });

  it('a board present alone is not chessless', () => {
    expect(extractQuerySignals('hmm', { boardPresent: true }).chessless).toBe(false);
  });

  it('does not trip SAN on ordinary words', () => {
    expect(extractQuerySignals('a good plan for the middlegame').hasSan).toBe(false);
    expect(extractQuerySignals('back rank ideas').hasSan).toBe(false);
  });
});

describe('rankCandidateLanes → top candidate', () => {
  const top = (text: string, boardPresent = false) => topCandidateLane(text, { boardPresent })?.lane ?? null;

  it('a named move → move-eval', () => {
    expect(top('is Bxf7 sound?')).toBe('move-eval');
  });

  it('board + "what should I play" → best-move', () => {
    expect(top('what should I do here?', true)).toBe('best-move');
  });

  it('board + "who is better" → position-assessment', () => {
    expect(top('who is better in this position?', true)).toBe('position-assessment');
  });

  it('self + weakness → weakness', () => {
    expect(top('what am I weakest at?')).toBe('weakness');
  });

  it('self + time → history', () => {
    expect(top('how did my last game go?')).toBe('history');
  });

  it('"how do I play against an isolated pawn" (no self) → theory', () => {
    expect(top('how do I play against an isolated queen pawn?')).toBe('theory');
  });

  it('endgame vocabulary → endgame', () => {
    expect(top('how do I win a rook ending?')).toBe('endgame');
  });

  it('teach an opening → opening', () => {
    expect(top('teach me the Caro-Kann')).toBe('opening');
  });

  it('pure banter → banter', () => {
    expect(top('thanks so much coach')).toBe('banter');
  });

  it('a chess question with no self/time/board scores nothing but banter is not forced', () => {
    // No board, no chess vocab, no self/time → reads as non-chess → banter lane
    // (routes to the conversational/deflect handler, which is the honest call).
    expect(top('asdf qwer')).toBe('banter');
  });
});
