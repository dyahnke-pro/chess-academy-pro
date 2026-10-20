import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { recordWeakSpot, markWeakSpotDrilled, getWeakSpotsForOpening, weakSpotId } from './weakSpotService';

const MAIN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const TRAP = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2';

beforeEach(async () => { await db.openingWeakSpots.clear(); });

describe('weak spots carry their line (one id = opening + position + move)', () => {
  it('the same move index on two lines is two weak spots, not one', async () => {
    await recordWeakSpot('vienna', 'Vienna', MAIN, 2, 'Nc6');
    await recordWeakSpot('vienna', 'Vienna', TRAP, 2, 'Nf6');
    const spots = await getWeakSpotsForOpening('vienna');
    expect(spots.map((s) => s.fen).sort()).toEqual([MAIN, TRAP].sort());
    expect(spots.every((s) => s.failCount === 1)).toBe(true);
  });

  it('drilling marks the spot of THAT position only', async () => {
    await recordWeakSpot('vienna', 'Vienna', MAIN, 2, 'Nc6');
    await recordWeakSpot('vienna', 'Vienna', TRAP, 2, 'Nf6');
    await markWeakSpotDrilled('vienna', TRAP, 'Nf6');
    expect((await db.openingWeakSpots.get(weakSpotId('vienna', TRAP, 'Nf6')))?.lastDrilledAt).toBeTruthy();
    expect((await db.openingWeakSpots.get(weakSpotId('vienna', MAIN, 'Nc6')))?.lastDrilledAt).toBeNull();
  });

  it('an old move-index row of the same position is carried over, not duplicated', async () => {
    await db.openingWeakSpots.put({ id: 'vienna-2', openingId: 'vienna', openingName: 'Vienna', fen: MAIN, moveIndex: 2, correctMoveSan: 'Nc6', failCount: 3, lastFailedAt: '2026-01-01', lastDrilledAt: null });
    await recordWeakSpot('vienna', 'Vienna', MAIN, 2, 'Nc6');
    const spots = await getWeakSpotsForOpening('vienna');
    expect(spots).toHaveLength(1);
    expect(spots[0].failCount).toBe(4);
  });
});
