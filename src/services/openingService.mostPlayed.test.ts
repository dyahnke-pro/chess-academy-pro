import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getMostPlayedOpenings } from './openingService';
import { buildOpeningRecord, buildGameRecord } from '../test/factories';

// David 2026-09-08 account audit: 930 real chess.com games imported (eco set,
// openingId null) but "what is my most played opening?" said "you haven't played
// enough openings yet" — getMostPlayedOpenings counted by openingId only and
// skipped every imported game. It must resolve games to openings by ECO too.
describe('getMostPlayedOpenings — imported games count via ECO', () => {
  beforeEach(async () => {
    await db.openings.clear();
    await db.games.clear();
  });

  it('counts imported games (openingId null, eco set) by ECO', async () => {
    await db.openings.bulkPut([
      buildOpeningRecord({ id: 'sicilian', name: 'Sicilian Defense', eco: 'B40', color: 'black', isRepertoire: true }),
      buildOpeningRecord({ id: 'queens-pawn', name: "Queen's Pawn", eco: 'D02', color: 'white', isRepertoire: true }),
    ]);
    // 3 Sicilians + 1 Queen's Pawn, all imported (no openingId, eco only).
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', openingId: null, eco: 'B40', source: 'chesscom' }),
      buildGameRecord({ id: 'g2', openingId: null, eco: 'B40', source: 'chesscom' }),
      buildGameRecord({ id: 'g3', openingId: null, eco: 'B40', source: 'chesscom' }),
      buildGameRecord({ id: 'g4', openingId: null, eco: 'D02', source: 'chesscom' }),
    ]);
    const top = await getMostPlayedOpenings(3);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].opening.id).toBe('sicilian');
    expect(top[0].games).toBe(3);
  });

  it('respects a color filter using the resolved record', async () => {
    await db.openings.bulkPut([
      buildOpeningRecord({ id: 'sicilian', eco: 'B40', color: 'black', isRepertoire: true }),
      buildOpeningRecord({ id: 'queens-pawn', eco: 'D02', color: 'white', isRepertoire: true }),
    ]);
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', openingId: null, eco: 'B40', source: 'chesscom' }),
      buildGameRecord({ id: 'g4', openingId: null, eco: 'D02', source: 'chesscom' }),
    ]);
    const white = await getMostPlayedOpenings(3, 'white');
    expect(white.map((x) => x.opening.id)).toContain('queens-pawn');
    expect(white.map((x) => x.opening.id)).not.toContain('sicilian');
  });

  it('still prefers openingId when present', async () => {
    await db.openings.bulkPut([
      buildOpeningRecord({ id: 'vienna', eco: 'C25', color: 'white', isRepertoire: true }),
    ]);
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', openingId: 'vienna', eco: 'C25', source: 'coach' }),
    ]);
    const top = await getMostPlayedOpenings(3);
    expect(top[0].opening.id).toBe('vienna');
    expect(top[0].games).toBe(1);
  });
});
