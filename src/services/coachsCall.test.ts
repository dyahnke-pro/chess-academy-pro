import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { computeCoachsCall, computeHomeOpening } from './coachsCall';
import { recordTeachingVisit } from './teachingLedger';
import { buildGameRecord } from '../test/factories';

async function seedGames(results: Array<'win' | 'loss'>): Promise<void> {
  // Student plays White vs the AI — result maps directly.
  let day = 10;
  for (const r of results) {
    await db.games.put(buildGameRecord({
      white: 'You',
      black: 'AI Coach',
      result: r === 'win' ? '1-0' : '0-1',
      date: `2026-07-${day} 12:00`,
      isMasterGame: false,
      source: 'coach',
    }));
    day += 1;
  }
}

beforeEach(async () => {
  await db.games.clear();
  await db.meta.delete('teachingLedger');
});

describe("the coach's call", () => {
  it('rough patch + a home opening → prescribe the STRENGTH', async () => {
    await seedGames(['win', 'loss', 'loss', 'loss', 'loss']);
    await recordTeachingVisit('Caro-Kann Defense', 'main', 'the solid c6 wall');
    const call = await computeCoachsCall('Hanging pieces in the middlegame');
    expect(call?.temperature).toBe('rough');
    expect(call?.prescription).toBe('strength');
    expect(call?.line).toContain('Caro-Kann');
    expect(call?.chip).toContain('Continue the');
  });

  it('running hot + a weakness → prescribe the WEAKNESS', async () => {
    await seedGames(['loss', 'win', 'win', 'win', 'win']);
    await recordTeachingVisit('Caro-Kann Defense', 'main', 'the solid c6 wall');
    const call = await computeCoachsCall('Hanging pieces in the middlegame');
    expect(call?.temperature).toBe('hot');
    expect(call?.prescription).toBe('weakness');
    expect(call?.line).toContain('Hanging pieces in the middlegame');
  });

  it('steady → keep building the home opening', async () => {
    await seedGames(['win', 'loss', 'win', 'loss']);
    await recordTeachingVisit('Caro-Kann Defense', 'main', 'the solid c6 wall');
    await recordTeachingVisit('Caro-Kann Defense', 'branch:Advance', 'the advance');
    const call = await computeCoachsCall(null);
    expect(call?.prescription).toBe('strength');
    expect(call?.line).toContain('home opening');
    expect(call?.line).toContain('2 sessions deep');
  });

  it('no signals at all → null (generic greeting stands)', async () => {
    expect(await computeCoachsCall(null)).toBeNull();
  });

  it('home opening weighs ledger visits over one-off games', async () => {
    await recordTeachingVisit('Grand Prix Attack', 'main', 'the f7 storm');
    await recordTeachingVisit('Grand Prix Attack', 'continuation', 'the play-out');
    expect(await computeHomeOpening()).toMatch(/grand prix attack/i);
  });
});

// David 2026-07-31: "my queen pawn being my main opening statement has got to
// be false." It was. "Queen's Pawn Game" is the ECO entry for the bare move
// `d4` (A40/D00), so every 1.d4 game that doesn't classify deeper lands there.
// The bucket aggregated unrelated games and beat his real repertoire, and the
// coach reported it as his home opening — a claim about HIS data that wasn't
// true.
describe('home opening ignores ECO family roots', () => {
  it('never crowns the bucket that means "a d-pawn moved"', async () => {
    const { db } = await import('../db/schema');
    await db.delete();
    await db.open();
    // Ten games classified into the catch-all, three into a real line.
    await db.openings.bulkPut([
      { id: 'qpg', name: "Queen's Pawn Game", eco: 'D00', pgn: 'd4', uci: '', fen: '', color: 'white', style: '', isRepertoire: false, overview: null, keyIdeas: null, traps: null, warnings: null, variations: null, drillAccuracy: 0, drillAttempts: 0, lastStudied: null, woodpeckerReps: 0 },
      { id: 'vienna', name: 'Vienna Game', eco: 'C25', pgn: 'e4 e5 Nc3', uci: '', fen: '', color: 'white', style: '', isRepertoire: false, overview: null, keyIdeas: null, traps: null, warnings: null, variations: null, drillAccuracy: 0, drillAttempts: 0, lastStudied: null, woodpeckerReps: 0 },
    ] as never);
    await db.games.bulkPut([
      ...Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, openingId: 'qpg', pgn: 'd4', result: '1-0' })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `v${i}`, openingId: 'vienna', pgn: 'e4 e5 Nc3', result: '1-0' })),
    ] as never);

    const { computeCoachsCall } = await import('./coachsCall');
    const call = await computeCoachsCall(null);
    expect(call?.line ?? '').not.toMatch(/Queen's Pawn Game/i);
    // The real line he actually played is the honest answer.
    if (call?.prescription === 'strength') expect(call.line).toMatch(/Vienna/i);
  });

  it('still crowns a short-PGN opening that IS a real system', async () => {
    const { db } = await import('../db/schema');
    await db.delete();
    await db.open();
    // Bird's is `f4` — one ply, same shape as the catch-all, but a genuine
    // choice. Ply count is the wrong test; only bare descriptors are excluded.
    await db.openings.bulkPut([
      { id: 'bird', name: 'Bird Opening', eco: 'A02', pgn: 'f4', uci: '', fen: '', color: 'white', style: '', isRepertoire: false, overview: null, keyIdeas: null, traps: null, warnings: null, variations: null, drillAccuracy: 0, drillAttempts: 0, lastStudied: null, woodpeckerReps: 0 },
    ] as never);
    await db.games.bulkPut(
      Array.from({ length: 8 }, (_, i) => ({ id: `b${i}`, openingId: 'bird', pgn: 'f4', result: '1-0' })) as never,
    );
    const { computeCoachsCall } = await import('./coachsCall');
    const call = await computeCoachsCall(null);
    expect(call?.line ?? '').toMatch(/Bird Opening/i);
  });
});
