import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db/schema';
import type { PuzzleRecord, OpeningRecord, FlashcardRecord, SessionRecord, FlashcardType } from '../../types';

// fake-indexeddb is auto-loaded via vitest setup

beforeEach(async () => {
  await db.delete();
  await db.open();
});

// ---------------------------------------------------------------------------
// Helpers — generate realistic test data
// ---------------------------------------------------------------------------

const THEMES = ['fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate', 'sacrifice', 'deflection', 'mateIn1', 'mateIn2', 'endgame'];

function buildPuzzles(count: number): PuzzleRecord[] {
  const puzzles: PuzzleRecord[] = [];
  for (let i = 0; i < count; i++) {
    puzzles.push({
      id: `puzzle_${i}`,
      fen: `rnbqkbnr/pppppppp/8/8/${i % 8 + 1}P6/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1`,
      moves: 'e2e4 e7e5',
      rating: 800 + Math.floor(Math.random() * 1400),
      themes: [THEMES[i % THEMES.length], THEMES[(i + 3) % THEMES.length]],
      openingTags: i % 3 === 0 ? 'Italian Game' : null,
      popularity: 80 + (i % 20),
      nbPlays: 100 + i,
      srsInterval: 1,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      srsDueDate: new Date().toISOString().split('T')[0],
      srsLastReview: null,
      userRating: 1200 + (i % 400),
      attempts: 0,
      successes: 0,
    });
  }
  return puzzles;
}

function buildOpenings(count: number): OpeningRecord[] {
  const openings: OpeningRecord[] = [];
  for (let i = 0; i < count; i++) {
    openings.push({
      id: `opening_${i}`,
      eco: `${String.fromCharCode(65 + (i % 5))}${String(10 + i).padStart(2, '0')}`,
      name: `Test Opening ${i}`,
      pgn: 'e4 e5 Nf3 Nc6',
      uci: 'e2e4 e7e5 g1f3 b8c6',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      color: i % 2 === 0 ? 'white' : 'black',
      style: 'Tactical',
      isRepertoire: i < 40,
      overview: `Overview for opening ${i}`,
      keyIdeas: ['Idea 1', 'Idea 2'],
      traps: null,
      warnings: null,
      variations: null,
      trapLines: null,
      warningLines: null,
      drillAccuracy: 0,
      drillAttempts: 0,
      lastStudied: null,
      isFavorite: i < 5,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
    });
  }
  return openings;
}

function buildFlashcards(count: number): FlashcardRecord[] {
  const types: FlashcardType[] = ['best_move', 'name_opening', 'explain_idea'];
  const cards: FlashcardRecord[] = [];
  for (let i = 0; i < count; i++) {
    cards.push({
      id: `card_${i}`,
      openingId: `opening_${i % 40}`,
      type: types[i % types.length],
      questionFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      questionText: `What is the key idea after move ${i}?`,
      answerMove: i % 2 === 0 ? 'e7e5' : null,
      answerText: 'The key idea is to develop quickly.',
      srsInterval: 1,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      srsDueDate: new Date().toISOString().split('T')[0],
      srsLastReview: null,
    });
  }
  return cards;
}

function buildSessions(count: number): SessionRecord[] {
  const sessions: SessionRecord[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    sessions.push({
      id: `session_${i}`,
      profileId: 'main',
      date: date.toISOString().split('T')[0],
      durationMinutes: 15 + (i % 45),
      plan: { blocks: [], totalMinutes: 30 },
      completed: i % 2 === 0,
      puzzlesSolved: i % 10,
      puzzleAccuracy: 60 + (i % 40),
      xpEarned: 50 + (i % 200),
      coachSummary: null,
    });
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('IndexedDB Performance — Bulk Operations', () => {
  it('bulk inserts 1,000 puzzles within 2s', async () => {
    const puzzles = buildPuzzles(1000);

    const start = performance.now();
    await db.puzzles.bulkPut(puzzles);
    const elapsed = performance.now() - start;

    const count = await db.puzzles.count();
    expect(count).toBe(1000);
    expect(elapsed).toBeLessThan(2000);
  });

  it('bulk inserts 10,000 puzzles within 5s', async () => {
    const puzzles = buildPuzzles(10000);

    const start = performance.now();
    await db.puzzles.bulkPut(puzzles);
    const elapsed = performance.now() - start;

    const count = await db.puzzles.count();
    expect(count).toBe(10000);
    expect(elapsed).toBeLessThan(5000);
  });

  it('bulk inserts 200 openings within 500ms', async () => {
    const openings = buildOpenings(200);

    const start = performance.now();
    await db.openings.bulkPut(openings);
    const elapsed = performance.now() - start;

    const count = await db.openings.count();
    expect(count).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  it('bulk inserts 500 flashcards within 1s', async () => {
    const cards = buildFlashcards(500);

    const start = performance.now();
    await db.flashcards.bulkPut(cards);
    const elapsed = performance.now() - start;

    const count = await db.flashcards.count();
    expect(count).toBe(500);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('IndexedDB Performance — Indexed Queries', () => {
  beforeEach(async () => {
    await db.puzzles.bulkPut(buildPuzzles(5000));
    await db.openings.bulkPut(buildOpenings(200));
    await db.sessions.bulkPut(buildSessions(100));
  });

  it('queries puzzles by rating range (1000-1400) within 200ms', async () => {
    const start = performance.now();
    const results = await db.puzzles
      .where('rating')
      .between(1000, 1400)
      .toArray();
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.rating).toBeGreaterThanOrEqual(1000);
      expect(p.rating).toBeLessThanOrEqual(1400);
    }
    expect(elapsed).toBeLessThan(200);
  });

  it('queries puzzles by theme (multi-valued index) within 200ms', async () => {
    const start = performance.now();
    const results = await db.puzzles
      .where('themes')
      .equals('fork')
      .toArray();
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.themes).toContain('fork');
    }
    expect(elapsed).toBeLessThan(200);
  });

  it('queries puzzles by due date within 200ms', async () => {
    const today = new Date().toISOString().split('T')[0];

    const start = performance.now();
    const results = await db.puzzles
      .where('srsDueDate')
      .belowOrEqual(today)
      .toArray();
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });

  it('queries openings by ECO code within 200ms', async () => {
    const start = performance.now();
    const results = await db.openings
      .where('eco')
      .startsWith('C')
      .toArray();
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });

  it('queries sessions by date range within 100ms', async () => {
    const start = performance.now();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const results = await db.sessions
      .where('date')
      .aboveOrEqual(weekAgo.toISOString().split('T')[0])
      .toArray();
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });

  it('filters puzzles with compound criteria within 500ms', async () => {
    const today = new Date().toISOString().split('T')[0];

    const start = performance.now();
    const results = await db.puzzles
      .where('srsDueDate')
      .belowOrEqual(today)
      .filter((p) => p.rating >= 1000 && p.rating <= 1500)
      .limit(100)
      .toArray();
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(100);
    expect(elapsed).toBeLessThan(500);
  });
});

describe('IndexedDB Performance — Update Operations', () => {
  beforeEach(async () => {
    await db.puzzles.bulkPut(buildPuzzles(1000));
  });

  it('updates SRS fields on 50 records within 500ms', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `puzzle_${i * 20}`);
    const newDue = new Date();
    newDue.setDate(newDue.getDate() + 3);
    const dueStr = newDue.toISOString().split('T')[0];

    const start = performance.now();
    await db.transaction('rw', db.puzzles, async () => {
      for (const id of ids) {
        await db.puzzles.update(id, {
          srsInterval: 3,
          srsEaseFactor: 2.6,
          srsRepetitions: 1,
          srsDueDate: dueStr,
          srsLastReview: new Date().toISOString().split('T')[0],
        });
      }
    });
    const elapsed = performance.now() - start;

    // Verify updates applied
    const updated = await db.puzzles.get('puzzle_0');
    expect(updated?.srsInterval).toBe(3);
    expect(elapsed).toBeLessThan(500);
  });

  it('bulk deletes 500 records within 2s', async () => {
    const ids = Array.from({ length: 500 }, (_, i) => `puzzle_${i}`);

    const start = performance.now();
    await db.puzzles.bulkDelete(ids);
    const elapsed = performance.now() - start;

    const count = await db.puzzles.count();
    expect(count).toBe(500);
    expect(elapsed).toBeLessThan(2000);
  });
});
