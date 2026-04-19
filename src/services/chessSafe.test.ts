import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { safeChessFromFen, safeMoveSan, isPlausibleFen } from './chessSafe';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('safeChessFromFen', () => {
  it('returns a Chess instance for a valid FEN', () => {
    const chess = safeChessFromFen(START_FEN);
    expect(chess).not.toBeNull();
    expect(chess?.fen()).toBe(START_FEN);
  });

  it('returns null for a malformed FEN (too few parts)', () => {
    expect(safeChessFromFen('not a fen')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(safeChessFromFen('')).toBeNull();
  });

  it('returns null for a FEN with an invalid board row', () => {
    // 9 files instead of 8 — chess.js rejects this.
    expect(safeChessFromFen('rnbqkbnr/ppppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBeNull();
  });

  it('returns null for FEN with missing side-to-move', () => {
    expect(safeChessFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBeNull();
  });
});

describe('safeMoveSan', () => {
  it('plays a legal SAN and returns the move object', () => {
    const chess = new Chess(START_FEN);
    const m = safeMoveSan(chess, 'e4');
    expect(m).not.toBeNull();
    expect(m?.san).toBe('e4');
  });

  it('returns null for an illegal SAN', () => {
    const chess = new Chess(START_FEN);
    // Bishop can't move from starting position with no prior pawn move.
    expect(safeMoveSan(chess, 'Bc4')).toBeNull();
  });

  it('returns null for garbled SAN', () => {
    const chess = new Chess(START_FEN);
    expect(safeMoveSan(chess, 'xxxx')).toBeNull();
  });

  it('does not mutate the board when the move is illegal', () => {
    const chess = new Chess(START_FEN);
    safeMoveSan(chess, 'Bc4');
    expect(chess.fen()).toBe(START_FEN);
  });
});

describe('isPlausibleFen', () => {
  it('accepts the starting position', () => {
    expect(isPlausibleFen(START_FEN)).toBe(true);
  });

  it('rejects empty / non-string inputs', () => {
    expect(isPlausibleFen('')).toBe(false);
    expect(isPlausibleFen(undefined as unknown as string)).toBe(false);
  });

  it('rejects a FEN with wrong number of fields', () => {
    expect(isPlausibleFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe(false);
  });

  it('rejects a FEN with a row that doesn\u2019t sum to 8 files', () => {
    expect(isPlausibleFen('rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(false);
  });

  it('rejects a FEN with an invalid side-to-move', () => {
    expect(isPlausibleFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR X KQkq - 0 1')).toBe(false);
  });

  it('accepts a FEN with mid-game piece layout', () => {
    expect(isPlausibleFen('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4')).toBe(true);
  });
});
