import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getDueTodayTracks, getDueTodayTotal } from './dueToday';
import { getDueEndgameCount } from './endgameProgressService';
import { buildMistakePuzzle, buildSetupPuzzle } from '../test/factories';
import type { EndgameProgressRecord } from '../types';

const DAY = 24 * 60 * 60 * 1000;

async function clearAll(): Promise<void> {
  await Promise.all([
    db.puzzles.clear(),
    db.mistakePuzzles.clear(),
    db.srsOpeningCards.clear(),
    db.setupPuzzles.clear(),
    db.endgameProgress.clear(),
  ]);
}

function endgameRec(o: Partial<EndgameProgressRecord> & { id: string; lessonId: string }): EndgameProgressRecord {
  return {
    fen: 'rec', mastered: false, timesPlayed: 1, totalWrongAttempts: 0,
    lastPlayedAt: Date.now(), ...o,
  };
}

beforeEach(clearAll);

describe('getDueEndgameCount', () => {
  it('counts distinct lessons with a position past its review interval', async () => {
    await db.endgameProgress.bulkAdd([
      // played once 2 days ago → 1-day interval → DUE
      endgameRec({ id: 'l1::a', lessonId: 'lucena', timesPlayed: 1, lastPlayedAt: Date.now() - 2 * DAY }),
      // another due position in the SAME lesson → still one lesson
      endgameRec({ id: 'l1::b', lessonId: 'lucena', timesPlayed: 1, lastPlayedAt: Date.now() - 2 * DAY }),
      // played 5× 2 days ago → 35-day interval → NOT due
      endgameRec({ id: 'l2::a', lessonId: 'philidor', timesPlayed: 5, lastPlayedAt: Date.now() - 2 * DAY }),
    ]);
    expect(await getDueEndgameCount()).toBe(1);
  });

  it('is zero when nothing has been played', async () => {
    expect(await getDueEndgameCount()).toBe(0);
  });
});

describe('getDueTodayTracks', () => {
  it('aggregates due items across stores, drops empty tracks, sorts by count', async () => {
    const pastDate = new Date(Date.now() - 5 * DAY).toISOString().split('T')[0];
    // 2 game mistakes due
    await db.mistakePuzzles.bulkAdd([
      buildMistakePuzzle({ srsDueDate: pastDate, status: 'unsolved' }),
      buildMistakePuzzle({ srsDueDate: pastDate, status: 'unsolved' }),
    ]);
    // 1 setup puzzle due
    await db.setupPuzzles.add(buildSetupPuzzle({ srsDueDate: new Date(Date.now() - DAY).toISOString(), status: 'unsolved' }));
    // 1 endgame lesson due
    await db.endgameProgress.add(endgameRec({ id: 'e::a', lessonId: 'opposition', timesPlayed: 1, lastPlayedAt: Date.now() - 2 * DAY }));

    const tracks = await getDueTodayTracks();
    const byKey = Object.fromEntries(tracks.map((t) => [t.key, t.count]));
    expect(byKey.mistakes).toBe(2);
    expect(byKey.setup).toBe(1);
    expect(byKey.endgame).toBe(1);
    // empty tracks (tactical, openings) are dropped
    expect(byKey.tactical).toBeUndefined();
    expect(byKey.openings).toBeUndefined();
    // sorted most-due first
    expect(tracks[0].key).toBe('mistakes');
    // every track has a route
    expect(tracks.every((t) => t.route.startsWith('/'))).toBe(true);
    expect(await getDueTodayTotal()).toBe(4);
  });

  it('returns [] when nothing is due anywhere', async () => {
    expect(await getDueTodayTracks()).toEqual([]);
    expect(await getDueTodayTotal()).toBe(0);
  });
});
