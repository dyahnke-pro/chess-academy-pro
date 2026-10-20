import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildOpeningPlayGame, saveOpeningPlayGame } from './openingPlayRecord';

const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'];
const base = { id: 'opening-play:1', openingName: 'Ruy Lopez', eco: 'C60', sans: SANS, studentSide: 'white' as const, studentName: 'P', studentRating: 1400 };

beforeEach(async () => { await db.games.clear(); });

describe('the Openings Play rung game reaches the record (persistent memory)', () => {
  it('a finished Play-rung game is saved as a game with its opening key', async () => {
    expect(await saveOpeningPlayGame({ ...base, outcome: 'win' })).toBe(true);
    db.close(); await db.open();
    const g = await db.games.get('opening-play:1');
    expect(g).toMatchObject({ pgn: SANS.join(' '), result: '1-0', studentSide: 'white', source: 'coach' });
    expect(g?.openingId).toBeTruthy();
  });

  it('a game left mid-way is saved unfinished; a black loss scores 1-0', () => {
    expect(buildOpeningPlayGame({ ...base, outcome: 'ongoing' })?.result).toBe('*');
    expect(buildOpeningPlayGame({ ...base, studentSide: 'black', outcome: 'loss' })?.result).toBe('1-0');
  });

  it('a misclick game below the floor is not saved', async () => {
    expect(await saveOpeningPlayGame({ ...base, sans: ['e4', 'e5'], outcome: 'loss' })).toBe(false);
  });
});
