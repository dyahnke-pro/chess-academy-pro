import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';
import { recordVsOpening, recordVsOpponent } from './analyticsService';
import { getOpeningNameByEco } from './openingDetectionService';

// Integration: seed real games into fake-indexeddb and verify the two
// record-vs aggregations. The player is "hero"; opponents + ECOs vary.
describe('recordVsOpening / recordVsOpponent (David 2026-07-04 coverage gap)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({
      id: 'main',
      name: 'hero',
      preferences: { chessComUsername: 'hero' },
    }));
  });

  it('aggregates W/D/L vs a named opening family', async () => {
    // Confirm the ECO maps to a Sicilian-family name (guards the matcher).
    const sicName = getOpeningNameByEco('B20');
    expect(sicName?.toLowerCase()).toContain('sicilian');

    // hero is Black in these Sicilians (defense = Black): 2 wins, 1 draw, 1 loss.
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', white: 'foe', black: 'hero', eco: 'B20', result: '0-1' }), // win (Black)
      buildGameRecord({ id: 'g2', white: 'foe', black: 'hero', eco: 'B90', result: '0-1' }), // win (Najdorf, still Sicilian)
      buildGameRecord({ id: 'g3', white: 'foe', black: 'hero', eco: 'B20', result: '1/2-1/2' }), // draw
      buildGameRecord({ id: 'g4', white: 'foe', black: 'hero', eco: 'B20', result: '1-0' }), // loss (White won)
      // A non-Sicilian game that must NOT be counted.
      buildGameRecord({ id: 'g5', white: 'hero', black: 'foe', eco: 'C65', result: '1-0' }),
    ]);

    const rec = await recordVsOpening('Sicilian');
    expect(rec).not.toBeNull();
    expect(rec!.games).toBe(4);
    expect(rec!.wins).toBe(2);
    expect(rec!.draws).toBe(1);
    expect(rec!.losses).toBe(1);
    expect(rec!.asBlack).toBe(4);
    expect(rec!.winRatePct).toBe(50);
  });

  it('returns null for an opening the player never reached', async () => {
    await db.games.put(buildGameRecord({ id: 'g1', white: 'hero', black: 'foe', eco: 'C65', result: '1-0' }));
    expect(await recordVsOpening('Sicilian')).toBeNull();
  });

  it('returns null for an unresolvable opening query', async () => {
    await db.games.put(buildGameRecord({ id: 'g1', white: 'hero', black: 'foe', eco: 'C65', result: '1-0' }));
    expect(await recordVsOpening('zzzznotanopening')).toBeNull();
  });

  it('aggregates head-to-head vs a named opponent (substring match, both sides)', async () => {
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', white: 'hero', black: 'DrNykterstein', eco: 'C65', result: '1-0', whiteElo: 1500, blackElo: 2850 }), // win
      buildGameRecord({ id: 'g2', white: 'DrNykterstein', black: 'hero', eco: 'B20', result: '1-0', whiteElo: 2860, blackElo: 1500 }), // loss
      buildGameRecord({ id: 'g3', white: 'hero', black: 'DrNykterstein', eco: 'C50', result: '1/2-1/2', whiteElo: 1500, blackElo: 2840 }), // draw
      // Different opponent — must not be counted.
      buildGameRecord({ id: 'g4', white: 'hero', black: 'someone_else', eco: 'C65', result: '1-0' }),
    ]);

    const rec = await recordVsOpponent('nykterstein');
    expect(rec).not.toBeNull();
    expect(rec!.opponentName).toBe('DrNykterstein');
    expect(rec!.games).toBe(3);
    expect(rec!.wins).toBe(1);
    expect(rec!.draws).toBe(1);
    expect(rec!.losses).toBe(1);
    expect(rec!.avgOpponentElo).toBe(2850); // (2850+2860+2840)/3
  });

  it('returns null when no opponent matches', async () => {
    await db.games.put(buildGameRecord({ id: 'g1', white: 'hero', black: 'foe', eco: 'C65', result: '1-0' }));
    expect(await recordVsOpponent('magnus')).toBeNull();
  });
});
