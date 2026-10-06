import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildMistakePuzzle, buildPuzzleRecord, resetFactoryCounter } from '../test/factories';
import { Chess } from 'chess.js';
import { loadLessonCandidates, puzzleStartFen } from './thinkingLessonSource';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('thinkingLessonSource', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('sets a puzzle up at the student\'s move', () => {
    expect(puzzleStartFen(START, 'e2e4 e7e5')).toBe(AFTER_E4);
    expect(puzzleStartFen(START, '')).toBeNull();
    expect(puzzleStartFen(START, 'e2e5')).toBeNull();
  });

  it('serves the student\'s own mistakes first, newest first, then puzzles near their rating', async () => {
    await db.mistakePuzzles.bulkPut([
      buildMistakePuzzle({ id: 'old', fen: START, sourceGameId: 'g-old', createdAt: '2026-01-01T00:00:00Z' }),
      buildMistakePuzzle({ id: 'new', fen: '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1', sourceGameId: 'g-new', createdAt: '2026-09-01T00:00:00Z' }),
    ]);
    await db.puzzles.bulkPut([
      buildPuzzleRecord({ id: 'far', fen: START, moves: 'g1f3 g8f6', rating: 1390 }),
      buildPuzzleRecord({ id: 'near', fen: START, moves: 'd2d4 d7d5', rating: 1210 }),
      buildPuzzleRecord({ id: 'out', fen: START, moves: 'c2c4 c7c5', rating: 2400 }),
    ]);
    const got = await loadLessonCandidates({ usernames: {}, rating: 1200 });
    expect(got.map((c) => c.gameId ?? c.puzzleId)).toEqual(['g-new', 'g-old', 'near', 'far']);
    expect(got[0].origin).toBe('game');
    expect(got[2].origin).toBe('puzzle');
  });

  it('never serves the same board twice', async () => {
    await db.mistakePuzzles.bulkPut([
      buildMistakePuzzle({ id: 'a', fen: START, sourceGameId: 'g1' }),
      buildMistakePuzzle({ id: 'b', fen: START.replace(' 0 1', ' 4 9'), sourceGameId: 'g2' }),
    ]);
    const got = await loadLessonCandidates({ usernames: {}, rating: 1200 });
    expect(got).toHaveLength(1);
  });

  it('an empty device yields nothing rather than throwing', async () => {
    expect(await loadLessonCandidates({ usernames: {}, rating: 1200 })).toEqual([]);
  });

  it('takes the puzzles NEAREST the rating, never the bottom of the band (audit 2026-10-06)', async () => {
    // 320 distinct boards far below the student, five at their rating.
    const c = new Chess();
    const pairs: string[] = [];
    for (const w of c.moves({ verbose: true })) {
      const after = new Chess(); after.move(w.san);
      for (const b of after.moves({ verbose: true })) pairs.push(`${w.from}${w.to} ${b.from}${b.to}`);
    }
    const low = pairs.slice(0, 320).map((m, i) => buildPuzzleRecord({ id: `low${i}`, fen: START, moves: m, rating: 120 }));
    // Distinct boards: each near puzzle starts after 1.e4 with its own reply.
    const near = ['e7e5 g1f3', 'c7c5 g1f3', 'e7e6 d2d4', 'c7c6 d2d4', 'd7d5 e4d5'].map((m, i) => buildPuzzleRecord({ id: `near${i}`, fen: AFTER_E4, moves: m, rating: 400 }));
    await db.puzzles.bulkPut([...low, ...near]);
    const got = await loadLessonCandidates({ usernames: {}, rating: 400 });
    const ids = got.map((x) => x.puzzleId);
    for (let i = 0; i < 5; i++) expect(ids).toContain(`near${i}`);
    expect(ids.slice(0, 5)).toEqual(['near0', 'near1', 'near2', 'near3', 'near4']);
  });
});
