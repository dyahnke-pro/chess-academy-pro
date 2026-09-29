import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

// 🔒 A GAME IS REPLAYED ONCE, EVER (2026-09-29). Overview replayed every game
// with chess.js on every open — a minute of spinner per app launch on a phone
// with ~900 games. Each game's stats are now persisted on it and read back.
const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
function annotations(evalShift = 0): MoveAnnotation[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    return {
      moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
      evaluation: 20 + evalShift, bestMove: null, bestMoveEval: 20 + evalShift,
      classification: i === 4 ? 'great' : 'good', comment: null,
    };
  });
}

describe('per-game insight stats persist', () => {
  beforeEach(async () => {
    vi.resetModules();
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', name: 'hero', preferences: { chessComUsername: 'hero' } }));
    await db.games.put(buildGameRecord({
      id: 'g1', white: 'hero', black: 'foe', result: '1-0', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0',
      annotations: annotations(), fullyAnalyzed: true, analysisDepth: 16,
    }));
  });

  async function freshModules(): Promise<{ svc: typeof import('./gameInsightsService'); replay: ReturnType<typeof vi.fn> }> {
    vi.resetModules();
    const recon = await import('./gameReconstructionService');
    const replay = vi.spyOn(recon, 'reconstructMovesFromGame');
    const svc = await import('./gameInsightsService');
    return { svc, replay: replay as unknown as ReturnType<typeof vi.fn> };
  }

  it('stores stats on first open and reads them back after a restart with no replay', { timeout: 30000 }, async () => {
    const first = await freshModules();
    const ov1 = await first.svc.getOverviewInsights();
    expect(first.replay).toHaveBeenCalled();
    expect((await db.games.get('g1'))?.insightStats?.counts.great).toBe(1);

    const second = await freshModules();   // a new app launch: nothing in memory
    const ov2 = await second.svc.getOverviewInsights();
    const ta = await second.svc.getTacticInsights();
    expect(second.replay).not.toHaveBeenCalled();
    expect(ov2.classificationCounts).toEqual(ov1.classificationCounts);
    expect(ov2.avgAccuracy).toBe(ov1.avgAccuracy);
    expect(ta.bestSequences[0]?.san).toBe('Bb5');
  });

  it('a re-analysis (new annotations) recomputes instead of serving stale stats', { timeout: 30000 }, async () => {
    const first = await freshModules();
    await first.svc.getOverviewInsights();
    await db.games.update('g1', { annotations: annotations(90).map((a, i) => (i === 4 ? { ...a, classification: 'good' as const } : a)) });

    const second = await freshModules();
    const ov = await second.svc.getOverviewInsights();
    expect(second.replay).toHaveBeenCalled();
    expect(ov.classificationCounts.great).toBe(0);
  });
});
