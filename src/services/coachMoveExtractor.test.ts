import { describe, it, expect } from 'vitest';
import { extractMoveArrows } from './coachMoveExtractor';

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// After 1.e4 — white's turn 2, so white moves again in this FEN.
const AFTER_E4_FEN =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

// Arrow-door colour for the student's own move (2026-09-29).
const GREEN = '#22c55e';

describe('extractMoveArrows', () => {
  it('draws an arrow for a single legal move mentioned in prose', () => {
    const arrows = extractMoveArrows(
      'Consider Nf3 — it develops the knight and controls e5.',
      { fen: START_FEN },
    );
    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({
      startSquare: 'g1',
      endSquare: 'f3',
      color: GREEN,
    });
  });

  it('draws multiple arrows for multiple legal moves, capped at maxArrows', () => {
    const arrows = extractMoveArrows(
      'You could try Nf3, Nc3, or e4 to open things up.',
      { fen: START_FEN, maxArrows: 3 },
    );
    expect(arrows).toHaveLength(3);
    const keys = arrows.map((a) => `${a.startSquare}${a.endSquare}`);
    expect(keys).toContain('g1f3');
    expect(keys).toContain('b1c3');
    expect(keys).toContain('e2e4');
  });

  it('dedupes repeated move references', () => {
    const arrows = extractMoveArrows(
      'Nf3 is good. Nf3 develops. Did I mention Nf3?',
      { fen: START_FEN },
    );
    expect(arrows).toHaveLength(1);
  });

  it('skips moves that are not legal from the current position', () => {
    // Bc4 is NOT legal at move 1 (blocked by pawn on e2).
    const arrows = extractMoveArrows(
      'Later you might develop Bc4, but first play e4.',
      { fen: START_FEN },
    );
    // Only e4 should survive validation.
    expect(arrows).toHaveLength(1);
    expect(arrows[0].endSquare).toBe('e4');
  });

  it('never arrows a move the text rules out (a bad move is never arrowed — 2026-09-29)', () => {
    const arrows = extractMoveArrows(
      "Don't play Nf3 here — it blocks the f-pawn.",
      { fen: START_FEN },
    );
    expect(arrows).toEqual([]);
  });

  it('arrows the recommended move and drops the ruled-out one in the same reply', () => {
    const arrows = extractMoveArrows(
      'Play Nf3 to develop. Avoid Nc3 in this line — it blocks c2.',
      { fen: START_FEN },
    );
    expect(arrows.find((a) => a.startSquare === 'g1')?.color).toBe(GREEN);
    expect(arrows.find((a) => a.startSquare === 'b1')).toBeUndefined();
  });

  it('refuses a named move that hangs the piece (the prose chose it, not the engine)', () => {
    // After 1.e4 d5, "Qg4" puts the queen where the bishop on c8 takes it.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    expect(extractMoveArrows('Try Qg4 here.', { fen })).toEqual([]);
  });

  it('returns empty array when no SAN moves appear', () => {
    const arrows = extractMoveArrows(
      'This is a rich position with pressure on both flanks.',
      { fen: START_FEN },
    );
    expect(arrows).toEqual([]);
  });

  it('handles castling notation', () => {
    // Position where white can castle kingside.
    const castleFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const arrows = extractMoveArrows('You should castle with O-O now.', { fen: castleFen });
    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({ startSquare: 'e1', endSquare: 'g1' });
  });

  it('skips reply targeting a position different from the current fen', () => {
    // Current position has already played e4; 'e4' reference is no
    // longer a legal first move for black (who is to move), so it
    // should NOT produce an arrow starting from e2.
    const arrows = extractMoveArrows('White already played e4.', { fen: AFTER_E4_FEN });
    expect(arrows).toEqual([]);
  });
});
