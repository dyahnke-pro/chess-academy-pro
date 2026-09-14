import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pickCoachDrill, pickMasterDrill, isDrillableAid, mistakePuzzleToDrill } from './coachDrillService';
import { buildMistakePuzzle } from '../test/factories';
import { db } from '../db/schema';
import type { PuzzleRecord } from '../types';

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

describe('mistakePuzzleToDrill — names the move the student actually played', () => {
  it('surfaces "last time you played <playerMoveSan>" in the prompt (David 2026-09-08)', () => {
    const drill = mistakePuzzleToDrill(buildMistakePuzzle({ playerMoveSan: 'Ng5', playerColor: 'white' }));
    expect(drill).not.toBeNull();
    expect(drill!.prompt).toContain('Ng5');
    expect(drill!.prompt.toLowerCase()).toContain('last time you played');
    expect(drill!.prompt).toMatch(/to move/i);
  });

  it('falls back to the generic prompt when the played move is unknown', () => {
    const drill = mistakePuzzleToDrill(buildMistakePuzzle({ playerMoveSan: '' }));
    expect(drill).not.toBeNull();
    expect(drill!.prompt.toLowerCase()).toContain('you missed the best move');
  });
});

describe('pickCoachDrill — every aid yields a real, playable drill', () => {
  for (const aid of ['calculation', 'mating-patterns', 'pawn-endings', 'rook-endings', 'endgame', 'puzzle']) {
    it(aid, () => assertPlayable(aid));
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

  it('isDrillableAid gates board drills correctly', () => {
    for (const aid of ['calculation', 'mating-patterns', 'pawn-endings', 'rook-endings', 'endgame', 'puzzle', 'mistakes', 'puzzle:fork']) {
      expect(isDrillableAid(aid)).toBe(true);
    }
    for (const aid of ['eval-lab', 'drawing-patterns', 'endgame-principles', 'weaknesses']) {
      expect(isDrillableAid(aid)).toBe(false);
    }
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

describe('pickMasterDrill — Dexie-backed elite classroom quiz (David 2026-09-14)', () => {
  function masterPuzzle(over: Partial<PuzzleRecord> = {}): PuzzleRecord {
    return {
      id: `m-${Math.random().toString(36).slice(2)}`,
      fen: 'r3k3/1p6/4N3/8/8/8/8/4K3 b - - 0 1',
      moves: 'b7b5 e6c7',
      rating: 2500,
      themes: ['fork', 'long'],
      openingTags: null,
      popularity: 90,
      nbPlays: 500,
      source: 'master',
      srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0,
      srsDueDate: '2026-01-01', srsLastReview: null,
      userRating: 1200, attempts: 0, successes: 0,
      ...over,
    };
  }

  it("'master' is a drillable aid", () => {
    expect(isDrillableAid('master')).toBe(true);
  });

  it('returns null when the master pool is not seeded', async () => {
    await db.delete(); await db.open();
    expect(await pickMasterDrill({ rating: 2600 })).toBeNull();
  });

  it('picks a legal drill from the master pool only (not the bundled pool)', async () => {
    await db.delete(); await db.open();
    await db.puzzles.bulkPut([
      masterPuzzle({ id: 'master-a', rating: 2450 }),
      masterPuzzle({ id: 'master-b', rating: 2700 }),
      // a non-master puzzle must be ignored by pickMasterDrill
      masterPuzzle({ id: 'lichess-x', rating: 1200, source: 'lichess' }),
    ]);
    const drill = await pickMasterDrill({ rating: 2450, seed: 3 });
    expect(drill).not.toBeNull();
    expect(drill!.aid).toBe('master');
    expect(['master-a', 'master-b']).toContain(drill!.puzzleId);
    // Legal + student-to-move + carries themes for concept teaching.
    const c = new Chess(drill!.setupFen);
    expect(() => c.move(drill!.solutionSan[0])).not.toThrow();
    expect(drill!.themes).toContain('fork');
  });
})
