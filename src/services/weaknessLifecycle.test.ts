import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/schema';
import { getWeaknessLifecycle } from './weaknessLifecycle';
import type { MistakePuzzle } from '../types';

function mp(over: Partial<MistakePuzzle>): MistakePuzzle {
  return {
    id: Math.random().toString(36).slice(2),
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    playerMove: 'g1f3', playerMoveSan: 'Nf3', bestMove: 'f1c4', bestMoveSan: 'Bc4',
    moves: '', cpLoss: 250, classification: 'blunder', gamePhase: 'middlegame',
    moveNumber: 12, sourceGameId: 'g1', sourceMode: 'analysis', playerColor: 'white',
    promptText: '', narration: { intro: '', explanation: '', encouragement: '' } as never,
    createdAt: '2026-01-01T00:00:00.000Z', opponentName: 'x', gameDate: '2026-01-01',
    openingName: null, evalBefore: 0, srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0,
    srsDueDate: '2026-01-01', srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0,
    tacticType: 'fork',
    ...over,
  } as MistakePuzzle;
}

describe('getWeaknessLifecycle (Part III)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('reports sampleFloorMet false with too few games', async () => {
    await db.mistakePuzzles.bulkAdd([mp({ sourceGameId: 'g1', gameDate: '2026-01-01' })]);
    const lc = await getWeaknessLifecycle();
    expect(lc.sampleFloorMet).toBe(false);
  });

  it('classifies a FIXED motif (older-only) and a PERSISTENT motif (both halves)', async () => {
    const rows: MistakePuzzle[] = [];
    // FORK: appears only in OLD games (fixed).
    for (let i = 0; i < 3; i++) rows.push(mp({ sourceGameId: `old${i}`, gameDate: '2026-01-01', tacticType: 'fork' }));
    // PIN: appears in old AND new games (persistent).
    rows.push(mp({ sourceGameId: 'oldpin', gameDate: '2026-01-05', tacticType: 'pin' }));
    rows.push(mp({ sourceGameId: 'newpin1', gameDate: '2026-06-01', tacticType: 'pin' }));
    rows.push(mp({ sourceGameId: 'newpin2', gameDate: '2026-06-10', tacticType: 'pin' }));
    await db.mistakePuzzles.bulkAdd(rows);

    const lc = await getWeaknessLifecycle();
    expect(lc.sampleFloorMet).toBe(true);
    const fixedLabels = lc.fixed.map((e) => e.label);
    const persistentLabels = lc.persistent.map((e) => e.label);
    expect(fixedLabels.some((l) => /fork/i.test(l))).toBe(true);
    expect(persistentLabels.some((l) => /pin/i.test(l))).toBe(true);
    // Fork is fixed → never the most-pressing.
    expect(lc.mostPressing?.label ?? '').not.toMatch(/fork/i);
  });

  it('ignores inaccuracies (noise) in the lifecycle read', async () => {
    const rows: MistakePuzzle[] = [];
    for (let i = 0; i < 6; i++) rows.push(mp({ sourceGameId: `g${i}`, classification: 'inaccuracy', tacticType: 'skewer' }));
    await db.mistakePuzzles.bulkAdd(rows);
    const lc = await getWeaknessLifecycle();
    // All inaccuracies → no real clusters.
    expect(lc.persistent.length + lc.fixed.length + lc.emerging.length).toBe(0);
  });
});
