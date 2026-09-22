// homeOpeningService — the persisted + audited half of the home-opening computer.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord, buildUserProfile, resetFactoryCounter } from '../test/factories';
import { openingKeyFor } from './openingKey';
import type { GameRecord } from '../types';

const setActiveProfile = vi.fn();
vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: null, setActiveProfile }) },
}));
const audits: Array<{ kind: string; summary: string; details?: string }> = [];
vi.mock('./appAuditor', () => ({
  logAppAudit: async (e: { kind: string; summary: string; details?: string }) => { audits.push(e); },
}));

import { __resetHomeOpeningCacheForTests, clearHomeOpening, getHomeOpenings, setHomeOpening } from './homeOpeningService';

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const ELEPHANT = openingKeyFor('C40', 'Elephant Gambit');
const VIENNA = openingKeyFor('C25', 'Vienna Game');

function seed(key: ReturnType<typeof openingKeyFor>, colour: 'white' | 'black', n: number, tag: string): GameRecord[] {
  return Array.from({ length: n }, (_, i) => buildGameRecord({
    id: `${tag}-${i}`, openingId: key, result: colour === 'white' ? '1-0' : '0-1',
    white: colour === 'white' ? 'student' : 'opp', black: colour === 'black' ? 'student' : 'opp',
  }));
}

describe('homeOpeningService', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    audits.length = 0;
    setActiveProfile.mockReset();
    __resetHomeOpeningCacheForTests();
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', preferences: { ...buildUserProfile().preferences, chessComUsername: 'student' } }));
  });

  it('computes, persists and EMITS the pick per colour; a thin line loses; cold reads as null', async () => {
    await db.games.bulkPut([...seed(PIRC, 'black', 40, 'p'), ...seed(ELEPHANT, 'black', 3, 'e'), ...seed(VIENNA, 'white', 4, 'v')]);
    const home = await getHomeOpenings();
    expect(home.black?.family).toBe('Pirc Defense');
    expect(home.black?.source).toBe('computed');
    expect(home.white).toBeNull(); // 4 games as White: under the floor, not crowned
    const stored = (await db.profiles.get('main'))?.preferences.homeOpenings;
    expect(stored?.black?.family).toBe('Pirc Defense');
    const rows = audits.filter((a) => a.kind === 'home-opening-chosen');
    expect(rows).toHaveLength(1); // white's null-to-null is not a change
    const d = JSON.parse(rows[0].details ?? '{}') as { colour: string; chosen: { family: string } | null; candidates: Array<{ family: string; clearsFloor: boolean }>; floor: { minGames: number } };
    expect(d.colour).toBe('black');
    expect(d.chosen?.family).toBe('Pirc Defense');
    expect(d.candidates.find((c) => c.family === 'Elephant Gambit')?.clearsFloor).toBe(false);
    expect(d.floor.minGames).toBeGreaterThan(3);
  });

  it('a student choice sticks across a recompute; clearing hands it back to the computer', async () => {
    await db.games.bulkPut([...seed(PIRC, 'black', 40, 'p'), ...seed(ELEPHANT, 'black', 3, 'e')]);
    await getHomeOpenings();
    const chosen = await setHomeOpening('black', 'Elephant Gambit');
    expect(chosen?.source).toBe('student');
    // More Pirc games arrive — the computed pick would still be the Pirc, but
    // the student's choice is theirs.
    await db.games.bulkPut(seed(PIRC, 'black', 10, 'p2'));
    const after = await getHomeOpenings({ force: true });
    expect(after.black?.family).toBe('Elephant Gambit');
    expect(after.black?.source).toBe('student');
    const reset = await clearHomeOpening('black');
    expect(reset.black?.family).toBe('Pirc Defense');
    expect(reset.black?.source).toBe('computed');
  });

  it('setHomeOpening refuses a family the record does not contain', async () => {
    await db.games.bulkPut(seed(PIRC, 'black', 12, 'p'));
    expect(await setHomeOpening('black', 'Sicilian Defense')).toBeNull();
  });
});
