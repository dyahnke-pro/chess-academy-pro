import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';
import { ratingTrendNote, untriedFeatureNudge, coldStartGuidance, coldStartApplies } from './classroomOpener';

// Integration: seed real games / feature stores into fake-indexeddb and verify
// the two computed opener signals. The student is "hero" (white in every seeded
// game, so whiteElo is their own rating).
describe('classroomOpener — computed opener signals (David 2026-09-13)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', name: 'hero', preferences: { chessComUsername: 'hero' } }));
  });

  const game = (id: string, date: string, elo: number, result: '1-0' | '0-1' | '1/2-1/2' = '0-1') =>
    buildGameRecord({ id, white: 'hero', black: 'foe', whiteElo: elo, blackElo: 1500, date, result, source: 'chesscom', isMasterGame: false });

  describe('ratingTrendNote', () => {
    it('names a DOWN trend with the real delta over recent rated games', async () => {
      // Newest first: 1400 (newest) … 1480 (oldest) → slipped 80 across 5 games.
      await db.games.bulkPut([
        game('g1', '2026-09-10', 1400), game('g2', '2026-09-08', 1420),
        game('g3', '2026-09-06', 1440), game('g4', '2026-09-04', 1460),
        game('g5', '2026-09-02', 1480),
      ]);
      const t = await ratingTrendNote();
      expect(t).not.toBeNull();
      expect(t!.direction).toBe('down');
      expect(t!.deltaPts).toBe(80);
      expect(t!.games).toBe(5);
      expect(t!.clause).toMatch(/slipped about 80 points/);
    });

    it('names an UP trend when the rating climbed', async () => {
      await db.games.bulkPut([
        game('g1', '2026-09-10', 1560), game('g2', '2026-09-08', 1540),
        game('g3', '2026-09-06', 1520), game('g4', '2026-09-04', 1510), game('g5', '2026-09-02', 1500),
      ]);
      const t = await ratingTrendNote();
      expect(t!.direction).toBe('up');
      expect(t!.deltaPts).toBe(60);
      expect(t!.clause).toMatch(/climbed about 60 points/);
    });

    it('returns null on a FLAT rating (no manufactured trend)', async () => {
      await db.games.bulkPut([
        game('g1', '2026-09-10', 1505), game('g2', '2026-09-08', 1495),
        game('g3', '2026-09-06', 1500), game('g4', '2026-09-04', 1490), game('g5', '2026-09-02', 1510),
      ]);
      expect(await ratingTrendNote()).toBeNull();
    });

    it('returns null with too few rated games to read honestly', async () => {
      await db.games.bulkPut([game('g1', '2026-09-10', 1400), game('g2', '2026-09-08', 1500)]);
      expect(await ratingTrendNote()).toBeNull();
    });
  });

  describe('untriedFeatureNudge', () => {
    it('nudges the feature that trains the weakness when it is untried', async () => {
      const n = await untriedFeatureNudge('tactics');
      expect(n).not.toBeNull();
      expect(n!.feature).toBe('tactics');
      expect(n!.chip).toMatch(/tactics/i);
    });

    it('falls through to the next untried surface when the relevant one is used', async () => {
      // Tactics used (a mistake puzzle exists) → the tactics-weakness nudge moves
      // to the next untried surface in the discovery order (review).
      await db.mistakePuzzles.put({ id: 'mp1', sourceGameId: 'g', classification: 'blunder', srsDueDate: 0, status: 'new', sourceMode: 'x' } as never);
      const n = await untriedFeatureNudge('tactics');
      expect(n!.feature).toBe('review');
    });

  });

  describe('coldStartGuidance', () => {
    it('prompts upload/review + teach/play when no games are uploaded', async () => {
      const c = await coldStartGuidance();
      expect(c).not.toBeNull();
      expect(c!.line).toMatch(/upload and review/i);
      expect(c!.line).toMatch(/teach or play/i);
      expect(c!.chips).toEqual(['Import my games', 'Teach me the Italian', 'Play the Caro-Kann']);
    });

    it('still prompts upload when the student has only played coach games (none uploaded)', async () => {
      await db.games.put(buildGameRecord({ id: 'cg', white: 'hero', black: 'AI Coach', source: 'coach', isMasterGame: false }));
      const c = await coldStartGuidance();
      expect(c).not.toBeNull(); // coach games are not "uploaded" games to review
    });

    it('returns null once a real game has been uploaded', async () => {
      await db.games.put(buildGameRecord({ id: 'imp', white: 'hero', black: 'foe', source: 'chesscom', isMasterGame: false }));
      expect(await coldStartGuidance()).toBeNull();
    });
  });

  describe('untriedFeatureNudge — all tried', () => {
    it('returns null when every surface has been tried', async () => {
      await db.mistakePuzzles.put({ id: 'mp1' } as never);                         // tactics
      await db.openings.put({ id: 'o1', isRepertoire: true } as never);            // openings
      await db.endgameProgress.put({ id: 'e1', lessonId: 'l', lastPlayedAt: 0 } as never); // endgame
      await db.games.bulkPut([
        buildGameRecord({ id: 'rev', white: 'hero', black: 'foe', isMasterGame: false, annotations: [{} as never], source: 'chesscom' }), // review
        buildGameRecord({ id: 'play', white: 'hero', black: 'AI Coach', isMasterGame: false, source: 'coach' }),                          // play
      ]);
      expect(await untriedFeatureNudge('tactics')).toBeNull();
    });
  });
});

describe('coldStartApplies — a game in progress is not a cold start (WO-STANDARD-01 D-11, 2026-09-22)', () => {
  it('a fresh, untouched board is a cold start', () => {
    expect(coldStartApplies({ historyLength: 0, userInteracted: false })).toBe(true);
  });
  it('one move on the board and the upload prompt is withheld (the prod tape: spoken after the FIRST move)', () => {
    expect(coldStartApplies({ historyLength: 1, userInteracted: false })).toBe(false);
  });
  it('NEGATIVE CONTROL: a student who has interacted is never cold-started, board or no board', () => {
    expect(coldStartApplies({ historyLength: 0, userInteracted: true })).toBe(false);
  });
});
