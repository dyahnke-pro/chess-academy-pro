import { describe, it, expect } from 'vitest';
import { findRewindTarget, HOLDABLE_CP, REWIND_MIN_PLY_GAP, type RewindSegmentLike } from './blunderRewind';
import { buildHoldChallenge } from './guidedFindTheMove';

// "Return to the last moment you had a choice" — the rewind ply is computed
// from the eval trace, never picked by the model (G0).

function seg(o: Partial<RewindSegmentLike> & { ply: number }): RewindSegmentLike {
  return {
    playerColor: o.ply % 2 === 1 ? 'white' : 'black',
    fenBefore: `fen-${o.ply}`,
    evalBefore: 0,
    bestMoveUci: 'e2e4',
    ...o,
  };
}

describe('findRewindTarget', () => {
  it('finds the LAST holdable student-to-move ply before the slide', () => {
    // White student. Holdable at plies 5 and 7; sliding by 9; blunder at 13.
    const segments = [
      seg({ ply: 5, evalBefore: 20 }),
      seg({ ply: 7, evalBefore: -30 }),           // still ≥ HOLDABLE (-50)
      seg({ ply: 9, evalBefore: -120 }),           // gone
      seg({ ply: 11, evalBefore: -180 }),
      seg({ ply: 13, evalBefore: -200 }),
    ];
    const t = findRewindTarget(segments, 13, 'white');
    expect(t).toEqual({ ply: 7, fenBefore: 'fen-7', bestUci: 'e2e4' });
  });

  it('respects the mover-POV sign for a Black student', () => {
    // Black student: white-POV +40 means Black is -40 → still holdable;
    // white-POV +200 means Black is -200 → gone.
    const segments = [
      seg({ ply: 6, evalBefore: 40 }),
      seg({ ply: 8, evalBefore: 200 }),
      seg({ ply: 10, evalBefore: 260 }),
    ];
    const t = findRewindTarget(segments, 10, 'black');
    expect(t?.ply).toBe(6);
  });

  it('returns null when the holdable moment is too close to the blunder', () => {
    const segments = [seg({ ply: 11, evalBefore: 0 }), seg({ ply: 13, evalBefore: -300 })];
    expect(13 - 11).toBeLessThan(REWIND_MIN_PLY_GAP);
    expect(findRewindTarget(segments, 13, 'white')).toBeNull();
  });

  it('returns null when the game was never holdable, evals missing, or no best move', () => {
    expect(findRewindTarget([seg({ ply: 5, evalBefore: HOLDABLE_CP - 60 })], 13, 'white')).toBeNull();
    expect(findRewindTarget([seg({ ply: 5, evalBefore: null })], 13, 'white')).toBeNull();
    expect(findRewindTarget([seg({ ply: 5, bestMoveUci: null })], 13, 'white')).toBeNull();
    expect(findRewindTarget([], 13, 'white')).toBeNull();
  });
});

describe('buildHoldChallenge — the rewind question', () => {
  it('asks with the piece + goal and withholds the square, even on a QUIET holding move', () => {
    // Quiet Nf3 from the start position — the notability-gated builder would
    // refuse this; the hold variant is exactly for quiet defensive moves.
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const ch = buildHoldChallenge(start, 'g1f3');
    expect(ch).not.toBeNull();
    expect(ch!.question).toContain('knight');
    expect(ch!.question).not.toContain('f3');
    expect(ch!.answerSan).toBe('Nf3');
    expect(ch!.hint).toContain('Nf3');
  });

  it('returns null on an unplayable move', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(buildHoldChallenge(start, 'a1a8')).toBeNull();
  });
});
