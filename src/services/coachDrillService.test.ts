import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pickCoachDrill } from './coachDrillService';

/** Every drill must be a legal, solvable position: the setup FEN parses,
 *  it's the student's move, and the FIRST solution move is legal from
 *  setupFen. This is the G0 guarantee — the drill is real, not invented. */
function assertPlayable(aid: string): void {
  const drill = pickCoachDrill(aid, { rating: 1400, seed: 7 });
  expect(drill, `no drill for ${aid}`).not.toBeNull();
  if (!drill) return;
  expect(drill.aid).toBe(aid);
  expect(drill.solutionSan.length).toBeGreaterThan(0);
  const chess = new Chess(drill.setupFen);
  const sideToMove = chess.turn() === 'w' ? 'white' : 'black';
  expect(drill.playerColor).toBe(sideToMove);
  // First solution move (the student's) must be legal from setupFen.
  expect(() => chess.move(drill.solutionSan[0])).not.toThrow();
  // The whole line replays cleanly from setupFen.
  const walk = new Chess(drill.setupFen);
  for (const san of drill.solutionSan) {
    expect(walk.move(san), `illegal ${san} in ${aid} line`).toBeTruthy();
  }
  expect(drill.prompt).toMatch(/to move/i);
}

describe('pickCoachDrill — every aid yields a real, playable drill', () => {
  for (const aid of ['calculation', 'mating-patterns', 'pawn-endings', 'rook-endings', 'endgame', 'puzzle']) {
    it(`${aid}`, () => assertPlayable(aid));
  }

  it('themed puzzle "puzzle:fork" is playable and labeled', () => {
    const drill = pickCoachDrill('puzzle:fork', { rating: 1400, seed: 3 });
    expect(drill).not.toBeNull();
    expect(drill!.label.toLowerCase()).toContain('fork');
    const chess = new Chess(drill!.setupFen);
    expect(() => chess.move(drill!.solutionSan[0])).not.toThrow();
  });

  it('unknown aid falls back to the generic tactics pool', () => {
    const drill = pickCoachDrill('totally-unknown-aid', { rating: 1400, seed: 1 });
    expect(drill).not.toBeNull();
  });

  it('is deterministic for a fixed seed + rating', () => {
    const a = pickCoachDrill('calculation', { rating: 1500, seed: 42 });
    const b = pickCoachDrill('calculation', { rating: 1500, seed: 42 });
    expect(a?.puzzleId).toBe(b?.puzzleId);
  });

  it('picks near the requested rating', () => {
    const easy = pickCoachDrill('puzzle', { rating: 800, seed: 5 });
    const hard = pickCoachDrill('puzzle', { rating: 2200, seed: 5 });
    expect(easy).not.toBeNull();
    expect(hard).not.toBeNull();
    // The hard pick should be rated at least as high as the easy pick.
    expect(hard!.rating).toBeGreaterThanOrEqual(easy!.rating);
  });
});
