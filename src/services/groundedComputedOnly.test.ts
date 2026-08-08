// Phase narration no longer pays a phrasing call.
//
// Everything it speaks is computed: the transition label, the engine read, the
// board-verified tactics, and the corpus note — which is baked, so it arrives
// in final spoken form. The model was rewording text the speakable-facts law
// already requires be speakable, at a measured 3,648ms to first dispatch, after
// which the line was dropped as overlapping anyway.
//
// THE PROOF is that it still produces prose with NO provider reachable. If the
// model were still in the path, this would return null.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// No key, no network — any surviving model call fails outright.
vi.mock('./coachApi', async (orig) => await orig<typeof import('./coachApi')>());

describe('groundedMoveFeedback computedOnly', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('speaks the computed read with no provider available', async () => {
    // A fetch that rejects stands in for "the model is unreachable". Anything
    // that still needs it cannot answer; the computed path is unaffected.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network'))));
    const { groundedMoveFeedback } = await import('./coachApi');

    const out = await groundedMoveFeedback({
      // A real middlegame position with a clear engine read.
      fen: 'r1bq1rk1/pp1nppbp/2pp1np1/8/3PP3/2NB1N1P/PPP2PP1/R1BQ1RK1 w - - 2 8',
      bestMoveUci: 'd1d2',
      evalCp: 40,
      studentColor: 'white',
      surface: 'phase-narration',
      extraFacts: "You're into the middlegame now.",
      warm: true,
      computedOnly: true,
    });

    expect(out).toBeTruthy();
    // NOT a tautology: with the model in the path this call awaits a failing
    // provider. What proves the flag is that the content is here AND the call
    // returned without one.
    // It must carry the transition label it was handed…
    expect(out).toContain('middlegame');
    // …and be real prose, not a fact-bundle stub.
    expect((out ?? '').length).toBeGreaterThan(40);
  }, 30_000);

});
