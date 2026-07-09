import { describe, it, expect } from 'vitest';
import { groundedMoveFeedback } from './coachApi';

// Root-cause move feedback (David 2026-07-09: "no bandaids"): the feedback is
// COMPUTED (eval + best move + a computed pedagogical moment) and voiced — the
// LLM decides no chess content. With no provider key in the test env, voiceFacts
// returns the computed facts verbatim, so these assert the GROUNDED content
// (incl. the warmth cue) deterministically, no LLM.

const START_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('groundedMoveFeedback', () => {
  it('voices the engine best move + eval, grounded', async () => {
    const out = await groundedMoveFeedback({
      fen: START_FEN,
      bestMoveUci: 'e7e5',
      evalCp: 20,
      studentColor: 'black',
    });
    expect(out).toBeTruthy();
    // best-move arrow marker is appended when a from/to is available
    expect(out).toMatch(/e7-e5|e5/);
  });

  it('acknowledges a COMPUTED recovery moment truthfully (eval swung up)', async () => {
    const out = await groundedMoveFeedback({
      fen: START_FEN,
      bestMoveUci: 'e7e5',
      evalCp: 40,
      studentColor: 'black',
      moment: {
        kind: 'recovery',
        studentWorstPawns: -2.1,
        studentEvalAfterPawns: 0.4,
      },
    });
    expect(out).toBeTruthy();
    // The recovery is a fact derived from the eval numbers, not an LLM guess.
    expect(out!.toLowerCase()).toContain('recovery');
    expect(out).toMatch(/-2\.1/);
    expect(out).toMatch(/\+0\.4/);
  });

  it('returns null when there is nothing to ground on', async () => {
    const out = await groundedMoveFeedback({ fen: START_FEN, studentColor: 'black' });
    expect(out).toBeNull();
  });
});
