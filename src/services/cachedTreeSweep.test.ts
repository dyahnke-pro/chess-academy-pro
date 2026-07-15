import { describe, it, expect } from 'vitest';
import { sanitizeTreeStages } from './openingGenerator';
import { getCriticalMomentForMove } from '../components/Openings/ModelGameViewer';
import type { WalkthroughTree } from '../types/walkthroughTree';

/**
 * Regression guards for the "sweep for similar failures" pass (David
 * 2026-07-15). Same class as the trap-picker crash: data from a cache /
 * content JSON that skipped its repair, consumed with unguarded field
 * access.
 */

describe('sanitizeTreeStages — cache-read boundary repair', () => {
  function baseTree(): WalkthroughTree {
    return {
      openingName: 'Test',
      eco: 'C00',
      studentSide: 'white',
      intro: 'i',
      outro: 'o',
      root: { san: null, movedBy: null, idea: '', children: [] },
    };
  }

  it('drops a malformed punish lesson (missing distractors) from a cached tree', () => {
    const tree = baseTree();
    // A legacy-cached punish lesson missing `distractors` — would crash
    // the picker's buildPunishWalkthroughTree without this repair.
    tree.punish = [
      { name: 'bad', setupMoves: ['e4', 'e5', 'Nf3'], inaccuracy: 'f6', whyBad: 'x', punishment: 'Nxe5', whyPunish: 'y' } as never,
    ];
    sanitizeTreeStages(tree);
    // repairPunishStage drops it (0 valid distractors) → no crashing entry survives.
    expect(tree.punish.length).toBe(0);
  });

  it('is a no-op-safe on absent stage arrays', () => {
    const tree = baseTree();
    expect(() => sanitizeTreeStages(tree)).not.toThrow();
    expect(tree.punish).toBeUndefined();
  });
});

describe('ModelGameViewer.getCriticalMomentForMove — undefined tolerance', () => {
  it('returns null (no throw) when criticalMoments is undefined', () => {
    // 373/646 model-games.json entries ship without criticalMoments — a
    // raw Dexie ModelGame lands it undefined, and the viewer used to
    // white-screen on the first Next click.
    expect(getCriticalMomentForMove(undefined, 5, true)).toBeNull();
  });

  it('finds a matching moment when present', () => {
    const moments = [
      { moveNumber: 5, color: 'white' as const, title: 't', explanation: 'e' },
    ] as never;
    expect(getCriticalMomentForMove(moments, 5, true)).not.toBeNull();
    expect(getCriticalMomentForMove(moments, 5, false)).toBeNull();
  });
});
