import { describe, it, expect } from 'vitest';
import { isWhyBestMoveQuestion, isBestMoveQuestion, buildQuestionGrounding } from './questionIntents';

/**
 * isWhyBestMoveQuestion — "why does the engine like this move / walk me through
 * Stockfish's line" routes to the engine-reasoning walk (David 2026-07-10). It
 * must fire on reasoning asks, NOT swallow "what's the best move" (that's the
 * thin best-move intent) and NOT fire on "why did I lose" (a self-review ask).
 */
const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';

describe('isWhyBestMoveQuestion — decipher the engine', () => {
  const fires = [
    'why is that the best move',
    'why does the engine like Nf5',
    'why not just take back',
    'explain the best move',
    'walk me through the engine line',
    "what's the idea behind the engine's move",
    'how does the engine see this',
    'break down the best move',
    'why is it best',
    'talk me through the reasoning',
  ];
  for (const q of fires) {
    it(`fires on "${q}"`, () => {
      expect(isWhyBestMoveQuestion(q)).toBe(true);
      // And the shared grounding builder surfaces the flag for the dispatch.
      expect(buildQuestionGrounding(q, { fen: FEN }).whyBestMoveQuestion).toBe(true);
    });
  }

  const doesNotFire = [
    'why did I lose',
    'why am I worse here',
    'why did I blunder that',
  ];
  for (const q of doesNotFire) {
    it(`does NOT fire on "${q}"`, () => {
      expect(isWhyBestMoveQuestion(q)).toBe(false);
    });
  }

  it('is distinct from the thin best-move intent', () => {
    // "what's the best move" NAMES the move (best-move); "why is it best" walks
    // the reasoning (why-best-move). Both are legitimately routable, but the WHY
    // form must set the reasoning flag so the dispatch picks the richer walk.
    expect(isBestMoveQuestion("what's the best move")).toBe(true);
    expect(isWhyBestMoveQuestion("what's the best move")).toBe(false);
    expect(isWhyBestMoveQuestion('why is it the best move')).toBe(true);
  });
});
