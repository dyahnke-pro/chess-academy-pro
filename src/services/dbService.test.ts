import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getOrCreateMainProfile,
  updateProfile,
  getDuePuzzles,
  getDueFlashcards,
  getRecentSessions,
  exportUserData,
  getRepertoireOpenings,
  getOpeningById,
  updateOpeningProgress,
  generateFlashcardsForOpening,
  recordPuzzleAttempt,
  updatePuzzleSrs,
  updateFlashcardSrs,
  createSession,
  updateSession,
} from './dbService';
import { buildPuzzleRecord, buildFlashcardRecord, buildSessionRecord, buildOpeningRecord } from '../test/factories';

describe('dbService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('getOrCreateMainProfile', () => {
    it('creates a default profile on first call', async () => {
      const profile = await getOrCreateMainProfile();
      expect(profile.id).toBe('main');
      expect(profile.name).toBe('Player');
      expect(profile.currentRating).toBe(1420);
      expect(profile.puzzleRating).toBe(1400);
      expect(profile.level).toBe(1);
      expect(profile.xp).toBe(0);
    });

    it('returns existing profile on second call', async () => {
      const first = await getOrCreateMainProfile();
      await updateProfile('main', { name: 'Updated Name' });
      const second = await getOrCreateMainProfile();
      expect(second.name).toBe('Updated Name');
      expect(second.id).toBe(first.id);
    });

    it('sets default preferences', async () => {
      const profile = await getOrCreateMainProfile();
      expect(profile.preferences.dailySessionMinutes).toBe(45);
      expect(profile.preferences.soundEnabled).toBe(true);
      expect(profile.preferences.apiKeyEncrypted).toBeNull();
    });

    it('sets default skill radar to 50 for all skills', async () => {
      const profile = await getOrCreateMainProfile();
      expect(profile.skillRadar.opening).toBe(50);
      expect(profile.skillRadar.tactics).toBe(50);
      expect(profile.skillRadar.endgame).toBe(50);
      expect(profile.skillRadar.memory).toBe(50);
      expect(profile.skillRadar.calculation).toBe(50);
    });
  });

  describe('updateProfile', () => {
    it('updates partial fields', async () => {
      await getOrCreateMainProfile();
      await updateProfile('main', { name: 'New Name', currentRating: 1600 });

      const updated = await db.profiles.get('main');
      expect(updated?.name).toBe('New Name');
      expect(updated?.currentRating).toBe(1600);
      // Other fields unchanged
      expect(updated?.puzzleRating).toBe(1400);
    });
  });

  describe('getDuePuzzles', () => {
    it('returns puzzles due today or earlier', async () => {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + 5);

      await db.puzzles.bulkPut([
        buildPuzzleRecord({ id: 'due1', srsDueDate: today }),
        buildPuzzleRecord({ id: 'due2', srsDueDate: '2020-01-01' }),
        buildPuzzleRecord({ id: 'notdue', srsDueDate: future.toISOString().split('T')[0] }),
      ]);

      const due = await getDuePuzzles();
      expect(due.length).toBe(2);
    });

    it('respects limit parameter', async () => {
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < 5; i++) {
        await db.puzzles.put(buildPuzzleRecord({ id: `due-${i}`, srsDueDate: today }));
      }

      const due = await getDuePuzzles(3);
      expect(due.length).toBe(3);
    });
  });

  describe('getDueFlashcards', () => {
    it('returns flashcards due today or earlier', async () => {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + 5);

      await db.flashcards.bulkPut([
        buildFlashcardRecord({ id: 'fc1', srsDueDate: today }),
        buildFlashcardRecord({ id: 'fc2', srsDueDate: '2020-01-01' }),
        buildFlashcardRecord({ id: 'fc3', srsDueDate: future.toISOString().split('T')[0] }),
      ]);

      const due = await getDueFlashcards();
      expect(due.length).toBe(2);
    });
  });

  describe('getRecentSessions', () => {
    it('returns sessions sorted by date descending', async () => {
      await db.sessions.bulkPut([
        buildSessionRecord({ id: 's1', date: '2024-01-01' }),
        buildSessionRecord({ id: 's3', date: '2024-01-03' }),
        buildSessionRecord({ id: 's2', date: '2024-01-02' }),
      ]);

      const sessions = await getRecentSessions();
      expect(sessions[0].date).toBe('2024-01-03');
      expect(sessions[1].date).toBe('2024-01-02');
      expect(sessions[2].date).toBe('2024-01-01');
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await db.sessions.put(buildSessionRecord({ id: `s-${i}`, date: `2024-01-${String(i + 1).padStart(2, '0')}` }));
      }

      const sessions = await getRecentSessions(5);
      expect(sessions.length).toBe(5);
    });
  });

  describe('getRepertoireOpenings', () => {
    it('returns only repertoire openings', async () => {
      await db.openings.bulkPut([
        buildOpeningRecord({ id: 'r1', isRepertoire: true }),
        buildOpeningRecord({ id: 'r2', isRepertoire: false }),
        buildOpeningRecord({ id: 'r3', isRepertoire: true }),
      ]);

      const repertoire = await getRepertoireOpenings();
      expect(repertoire.length).toBe(2);
      expect(repertoire.every((o) => o.isRepertoire)).toBe(true);
    });
  });

  describe('getOpeningById', () => {
    it('returns opening by ID', async () => {
      const opening = buildOpeningRecord({ id: 'test-open' });
      await db.openings.put(opening);

      const result = await getOpeningById('test-open');
      expect(result?.id).toBe('test-open');
    });

    it('returns undefined for non-existent ID', async () => {
      const result = await getOpeningById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateOpeningProgress', () => {
    it('increments drill attempts and updates accuracy', async () => {
      const opening = buildOpeningRecord({ id: 'drill-test', drillAttempts: 2, drillAccuracy: 0.8 });
      await db.openings.put(opening);

      await updateOpeningProgress('drill-test', 1.0);
      const updated = await db.openings.get('drill-test');
      expect(updated?.drillAttempts).toBe(3);
      // Weighted average: (0.8*2 + 1.0) / 3 ≈ 0.867
      expect(updated?.drillAccuracy).toBeCloseTo(0.867, 2);
      expect(updated?.lastStudied).toBeTruthy();
    });
  });

  describe('generateFlashcardsForOpening', () => {
    it('generates flashcards from variations', async () => {
      const opening = buildOpeningRecord({
        id: 'gen-test',
        variations: [
          { name: 'Main Line', pgn: '1.e4 c5', explanation: 'The main line' },
          { name: 'Alt Line', pgn: '1.e4 c5 2.Nf3', explanation: 'Alternative' },
        ],
      });
      await db.openings.put(opening);

      await generateFlashcardsForOpening('gen-test');
      const cards = await db.flashcards.where('openingId').equals('gen-test').toArray();
      expect(cards.length).toBe(2);
    });

    it('is idempotent — second call does not duplicate', async () => {
      const opening = buildOpeningRecord({
        id: 'idem-test',
        variations: [{ name: 'Main', pgn: '1.e4', explanation: 'Main' }],
      });
      await db.openings.put(opening);

      await generateFlashcardsForOpening('idem-test');
      await generateFlashcardsForOpening('idem-test');
      const cards = await db.flashcards.where('openingId').equals('idem-test').toArray();
      expect(cards.length).toBe(1);
    });

    it('does nothing for opening without variations', async () => {
      const opening = buildOpeningRecord({ id: 'no-var', variations: null });
      await db.openings.put(opening);

      await generateFlashcardsForOpening('no-var');
      const cards = await db.flashcards.where('openingId').equals('no-var').toArray();
      expect(cards.length).toBe(0);
    });
  });

  describe('recordPuzzleAttempt', () => {
    it('increments attempts on correct solve', async () => {
      await db.puzzles.put(buildPuzzleRecord({ id: 'att-test', attempts: 5, successes: 3 }));
      await recordPuzzleAttempt('att-test', true);

      const updated = await db.puzzles.get('att-test');
      expect(updated?.attempts).toBe(6);
      expect(updated?.successes).toBe(4);
    });

    it('increments attempts but not successes on incorrect solve', async () => {
      await db.puzzles.put(buildPuzzleRecord({ id: 'att-fail', attempts: 5, successes: 3 }));
      await recordPuzzleAttempt('att-fail', false);

      const updated = await db.puzzles.get('att-fail');
      expect(updated?.attempts).toBe(6);
      expect(updated?.successes).toBe(3);
    });

    it('does nothing for non-existent puzzle', async () => {
      // Should not throw
      await recordPuzzleAttempt('nonexistent', true);
    });
  });

  describe('exportUserData', () => {
    it('returns JSON with all tables', async () => {
      await getOrCreateMainProfile();
      await db.sessions.put(buildSessionRecord({ id: 'exp-s1' }));
      await db.openings.put(buildOpeningRecord({ id: 'exp-o1', isRepertoire: true }));
      await db.flashcards.put(buildFlashcardRecord({ id: 'exp-f1' }));

      const json = await exportUserData();
      const data = JSON.parse(json) as { profiles: unknown[]; sessions: unknown[]; openings: unknown[]; flashcards: unknown[] };
      expect(data.profiles).toBeDefined();
      expect(data.sessions).toBeDefined();
      expect(data.openings).toBeDefined();
      expect(data.flashcards).toBeDefined();
      expect(data.profiles.length).toBeGreaterThan(0);
    });

    it('only exports repertoire openings', async () => {
      await db.openings.bulkPut([
        buildOpeningRecord({ id: 'rep', isRepertoire: true }),
        buildOpeningRecord({ id: 'non-rep', isRepertoire: false }),
      ]);

      const json = await exportUserData();
      const data = JSON.parse(json) as { openings: Array<{ id: string }> };
      expect(data.openings.length).toBe(1);
      expect(data.openings[0].id).toBe('rep');
    });
  });

  describe('updatePuzzleSrs', () => {
    it('updates SRS fields on a puzzle', async () => {
      await db.puzzles.put(buildPuzzleRecord({ id: 'srs-p1' }));

      await updatePuzzleSrs('srs-p1', {
        srsInterval: 5,
        srsEaseFactor: 2.6,
        srsRepetitions: 2,
        srsDueDate: '2026-03-10',
        srsLastReview: '2026-03-05',
      });

      const updated = await db.puzzles.get('srs-p1');
      expect(updated?.srsInterval).toBe(5);
      expect(updated?.srsEaseFactor).toBe(2.6);
      expect(updated?.srsRepetitions).toBe(2);
      expect(updated?.srsDueDate).toBe('2026-03-10');
      expect(updated?.srsLastReview).toBe('2026-03-05');
    });

    it('preserves non-SRS fields', async () => {
      await db.puzzles.put(buildPuzzleRecord({ id: 'srs-p2', rating: 1800, attempts: 10 }));

      await updatePuzzleSrs('srs-p2', {
        srsInterval: 3,
        srsEaseFactor: 2.3,
        srsRepetitions: 1,
        srsDueDate: '2026-03-08',
        srsLastReview: '2026-03-05',
      });

      const updated = await db.puzzles.get('srs-p2');
      expect(updated?.rating).toBe(1800);
      expect(updated?.attempts).toBe(10);
    });
  });

  describe('updateFlashcardSrs', () => {
    it('updates SRS fields on a flashcard', async () => {
      await db.flashcards.put(buildFlashcardRecord({ id: 'srs-f1' }));

      await updateFlashcardSrs('srs-f1', {
        srsInterval: 7,
        srsEaseFactor: 2.8,
        srsRepetitions: 3,
        srsDueDate: '2026-03-12',
        srsLastReview: '2026-03-05',
      });

      const updated = await db.flashcards.get('srs-f1');
      expect(updated?.srsInterval).toBe(7);
      expect(updated?.srsEaseFactor).toBe(2.8);
      expect(updated?.srsRepetitions).toBe(3);
    });
  });

  describe('createSession', () => {
    it('creates a new session', async () => {
      const session = buildSessionRecord({ id: 'new-sess', date: '2026-03-05' });
      await createSession(session);

      const result = await db.sessions.get('new-sess');
      expect(result).toBeDefined();
      expect(result?.date).toBe('2026-03-05');
    });

    it('stores session plan blocks', async () => {
      const session = buildSessionRecord({
        id: 'plan-sess',
        plan: {
          blocks: [
            { type: 'puzzle_drill', targetMinutes: 20, completed: false },
            { type: 'opening_review', targetMinutes: 15, completed: true },
          ],
          totalMinutes: 35,
        },
      });
      await createSession(session);

      const result = await db.sessions.get('plan-sess');
      expect(result?.plan.blocks).toHaveLength(2);
      expect(result?.plan.totalMinutes).toBe(35);
    });
  });

  describe('updateSession', () => {
    it('updates partial session fields', async () => {
      await db.sessions.put(buildSessionRecord({ id: 'upd-sess', completed: false, puzzlesSolved: 0 }));

      await updateSession('upd-sess', { completed: true, puzzlesSolved: 12, xpEarned: 250 });

      const updated = await db.sessions.get('upd-sess');
      expect(updated?.completed).toBe(true);
      expect(updated?.puzzlesSolved).toBe(12);
      expect(updated?.xpEarned).toBe(250);
    });
  });

  describe('updateOpeningProgress — edge cases', () => {
    it('does nothing for non-existent opening', async () => {
      // Should not throw
      await updateOpeningProgress('nonexistent', 0.9);
    });

    it('handles first drill attempt (0 previous)', async () => {
      await db.openings.put(buildOpeningRecord({ id: 'first-drill', drillAttempts: 0, drillAccuracy: 0 }));

      await updateOpeningProgress('first-drill', 0.75);
      const updated = await db.openings.get('first-drill');
      expect(updated?.drillAttempts).toBe(1);
      // (0*0 + 0.75) / 1 = 0.75
      expect(updated?.drillAccuracy).toBeCloseTo(0.75, 2);
    });
  });

  describe('getDueFlashcards — extended', () => {
    it('respects limit parameter', async () => {
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < 25; i++) {
        await db.flashcards.put(buildFlashcardRecord({ id: `fc-lim-${i}`, srsDueDate: today }));
      }

      const due = await getDueFlashcards(10);
      expect(due.length).toBe(10);
    });
  });

  describe('generateFlashcardsForOpening — card content', () => {
    it('generates cards with correct question text from variations', async () => {
      const opening = buildOpeningRecord({
        id: 'content-test',
        fen: 'start-fen',
        variations: [
          { name: 'Dragon', pgn: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6', explanation: 'Fianchetto approach' },
        ],
      });
      await db.openings.put(opening);
      await generateFlashcardsForOpening('content-test');

      const cards = await db.flashcards.where('openingId').equals('content-test').toArray();
      expect(cards[0].questionText).toContain('Dragon');
      expect(cards[0].answerText).toBe('Fianchetto approach');
      expect(cards[0].questionFen).toBe('start-fen');
      expect(cards[0].type).toBe('best_move');
    });

    it('generates cards with default SRS fields', async () => {
      const opening = buildOpeningRecord({
        id: 'srs-default',
        variations: [{ name: 'Main', pgn: '1.e4', explanation: 'Standard' }],
      });
      await db.openings.put(opening);
      await generateFlashcardsForOpening('srs-default');

      const cards = await db.flashcards.where('openingId').equals('srs-default').toArray();
      expect(cards[0].srsInterval).toBe(0);
      expect(cards[0].srsRepetitions).toBe(0);
      expect(cards[0].srsEaseFactor).toBe(2.5);
      expect(cards[0].srsLastReview).toBeNull();
    });
  });

  describe('cross-table integration', () => {
    it('full workflow: profile → session → puzzles → export', async () => {
      // Create profile
      const profile = await getOrCreateMainProfile();
      expect(profile.id).toBe('main');

      // Create session
      const session = buildSessionRecord({ id: 'workflow-sess', profileId: 'main' });
      await createSession(session);

      // Add puzzles and record attempts
      await db.puzzles.put(buildPuzzleRecord({ id: 'wf-p1', attempts: 0, successes: 0 }));
      await recordPuzzleAttempt('wf-p1', true);
      await recordPuzzleAttempt('wf-p1', false);
      await recordPuzzleAttempt('wf-p1', true);

      const puzzle = await db.puzzles.get('wf-p1');
      expect(puzzle?.attempts).toBe(3);
      expect(puzzle?.successes).toBe(2);

      // Update session
      await updateSession('workflow-sess', { completed: true, puzzlesSolved: 3, puzzleAccuracy: 67 });

      // Export includes everything
      const json = await exportUserData();
      const data = JSON.parse(json) as { profiles: unknown[]; sessions: Array<{ completed: boolean }> };
      expect(data.profiles).toHaveLength(1);
      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].completed).toBe(true);
    });

    it('opening → flashcards → SRS update workflow', async () => {
      // Create opening with variations
      const opening = buildOpeningRecord({
        id: 'wf-opening',
        variations: [
          { name: 'Main Line', pgn: '1.e4 c5', explanation: 'Main line explanation' },
          { name: 'Variation', pgn: '1.e4 c5 2.Nf3', explanation: 'Variation explanation' },
        ],
      });
      await db.openings.put(opening);

      // Generate flashcards
      await generateFlashcardsForOpening('wf-opening');
      const cards = await db.flashcards.where('openingId').equals('wf-opening').toArray();
      expect(cards).toHaveLength(2);

      // SRS review a flashcard
      await updateFlashcardSrs(cards[0].id, {
        srsInterval: 3,
        srsEaseFactor: 2.6,
        srsRepetitions: 1,
        srsDueDate: '2026-03-08',
        srsLastReview: '2026-03-05',
      });

      const reviewed = await db.flashcards.get(cards[0].id);
      expect(reviewed?.srsRepetitions).toBe(1);
      expect(reviewed?.srsDueDate).toBe('2026-03-08');

      // Second card still has defaults
      const unreviewed = await db.flashcards.get(cards[1].id);
      expect(unreviewed?.srsRepetitions).toBe(0);
    });
  });
});
