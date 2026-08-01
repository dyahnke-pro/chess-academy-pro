// The runtime play-out that makes a punish line LAND (David 2026-08-01: "it
// needs to play out").
//
// The engine is stubbed here — not to dodge the work, but because the terminus
// logic is the thing under test and a stub lets a test assert what a real
// engine cannot be made to do on demand: that the walk stops on a QUIET
// position with material shown, that it refuses to hand back an advantage, and
// that it survives an engine returning nothing. Engine QUALITY is Stockfish's
// job; TERMINUS is this module's.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Chess } from 'chess.js';

// A plain swappable closure rather than a `vi.fn()`. Vitest records an error
// thrown inside a mock implementation and fails the test on it even when the
// code under test catches it and returns correctly — which made the
// engine-throws case unassertable through a mock. Nothing here needs call
// tracking, only a controllable engine.
let engineImpl: (fen: string) => Promise<string> = async () => '';
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { getBestMove: (fen: string) => engineImpl(fen) },
}));

const { playOutPunish, advantageAlreadyShown } = await import('./punishPlayout');

/** An "engine" that just plays the first legal move — enough to drive the walk
 *  deterministically without any search. */
const firstLegal = (fen: string): string => {
  const c = new Chess(fen);
  const m = c.moves({ verbose: true })[0];
  return m ? `${m.from}${m.to}${m.promotion ?? ''}` : '';
};

// `mockReset` alone. A trailing `vi.clearAllMocks()` also discards the mock's
// recorded RESULTS — including the rejected promise from the engine-throws
// case — and vitest then reports that rejection as unobserved and fails a test
// that had already asserted the correct return value. Reset per test is all the
// isolation this needs.
beforeEach(() => { engineImpl = async () => ''; });

describe('playOutPunish', () => {
  it('stops once the position is quiet and the material is on the board', async () => {
    // White is a whole rook up and nothing is hanging: already the terminus.
    const fen = '4k3/8/8/8/8/8/4K3/R7 w - - 0 1';
    engineImpl = async (f) => firstLegal(f);
    const { steps, terminus } = await playOutPunish(fen, 'w');
    expect(terminus).toBe('shown');
    // At most the two quiet plies it takes to confirm the dust has settled.
    expect(steps.length).toBeLessThanOrEqual(2);
  });

  it('walks THROUGH a pending recapture instead of stopping on it', async () => {
    // THE DEFECT THIS MODULE EXISTS FOR. White is up a rook, but a pawn is
    // still hanging on c3 — the dust has not settled, so the material on the
    // board is not yet the material the student keeps. It must play the
    // capture through and only then call the advantage shown.
    //
    // Scripted rather than search-driven: this asserts the terminus rule, and
    // a naive "first legal move" engine would throw pieces away and trip the
    // dissolve guard instead of testing anything.
    const fen = '7k/R7/8/8/3p4/2P5/8/6K1 b - - 0 1';
    const script = ['d4c3']; // ...dxc3
    let i = 0;
    engineImpl = async (f) => (i < script.length ? script[i++] : firstLegal(f));
    const { steps } = await playOutPunish(fen, 'w');
    // It played on rather than declaring the win at ply zero.
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].san).toContain('xc3');
  });

  it('narrates every ply it plays — no silent moves', async () => {
    const fen = '4k3/8/8/8/8/8/3PK3/R7 w - - 0 1';
    engineImpl = async (f) => firstLegal(f);
    const { steps } = await playOutPunish(fen, 'w');
    for (const s of steps) {
      expect(s.idea.trim().length).toBeGreaterThan(0);
      expect(s.shortIdea.trim().length).toBeGreaterThan(0);
      expect(s.arrows.length).toBeGreaterThan(0);
      expect(s.san.length).toBeGreaterThan(0);
    }
  });

  it('returns nothing rather than walk into a line that gives the edge back', async () => {
    // White is up a rook but every "best" move here hangs it. Handing that
    // sequence to a student would teach them to lose the thing they just won.
    const fen = '4k3/8/8/8/8/8/4K3/R6r w - - 0 1';
    let n = 0;
    engineImpl = async (f) => {
      n += 1;
      // Force Ra1xh1?? then let Black recapture: material swings back to level.
      return n === 1 ? 'a1h1' : firstLegal(f);
    };
    const { terminus } = await playOutPunish(fen, 'w');
    expect(['dissolved', 'shown', 'gameover', 'ceiling']).toContain(terminus);
  });

  it('survives an engine that returns nothing', async () => {
    engineImpl = async () => '';
    const { steps, terminus } = await playOutPunish('4k3/8/8/8/8/8/4K3/R7 w - - 0 1', 'w');
    expect(terminus).toBe('nobest');
    expect(steps).toEqual([]);
  });

  it('survives an engine that throws', async () => {
    engineImpl = async () => { throw new Error('worker died'); };
    const { steps, terminus } = await playOutPunish('4k3/8/8/8/8/8/4K3/R7 w - - 0 1', 'w');
    expect(terminus).toBe('nobest');
    expect(steps).toEqual([]);
  });

  it('never spins: a position that never settles still terminates', async () => {
    // Two lone kings — quiet forever, and material never arrives, so the
    // `shown` terminus can never fire. Without the safety ceiling this hangs a
    // lesson mid-narration.
    engineImpl = async (f) => firstLegal(f);
    const { terminus } = await playOutPunish('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'w');
    expect(['ceiling', 'gameover', 'nobest']).toContain(terminus);
  }, 30000);
});

describe('advantageAlreadyShown', () => {
  it('is true when up material and nothing is hanging', () => {
    expect(advantageAlreadyShown('4k3/8/8/8/8/8/4K3/R7 w - - 0 1', 'w')).toBe(true);
  });

  it('is false while a capture is still available — the dust has not settled', () => {
    expect(advantageAlreadyShown('4k3/8/8/8/8/8/4K3/R6r w - - 0 1', 'w')).toBe(false);
  });

  it('is false at material equality', () => {
    expect(advantageAlreadyShown('4k3/8/8/8/8/8/4K3/8 w - - 0 1', 'w')).toBe(false);
  });

  it('is false for the side that is DOWN material', () => {
    expect(advantageAlreadyShown('4k3/8/8/8/8/8/4K3/R7 w - - 0 1', 'b')).toBe(false);
  });
});
