import { describe, it, expect, vi } from 'vitest';
import { enrichForLesson } from './thinkingLessonStart';
import { boardIdentity, type LessonPositionCandidate } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';

const A = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
const B = '4k3/8/8/8/8/8/8/1R2K3 w - - 0 1';
const C = '4k3/8/8/8/8/8/8/2R1K3 w - - 0 1';

const kit = (fair: (c: LessonPositionCandidate) => boolean): StepKit => ({
  step: 'candidates',
  keyFor: (_fen, c) => (c && fair(c) ? { key: ['a1'], nearMiss: [] } : null),
  enrich: vi.fn(async (c: LessonPositionCandidate) => ({ ...c, topMoves: [{ san: 'Ra2', cpLoss: 0 }] })),
  showLine: () => '', prompt: () => '', wrongTapLine: () => '', reasonFor: () => null, intro: '',
});

describe('enrichForLesson — an engine-keyed step', () => {
  it('keeps only boards whose enriched key is fair, and skips boards already used', async () => {
    const k = kit((c) => c.fen !== B);
    const out = await enrichForLesson(k, [
      { fen: A, origin: 'puzzle' }, { fen: B, origin: 'puzzle' }, { fen: C, origin: 'puzzle' },
    ], new Set([boardIdentity(C)]));
    expect(out.map((c) => c.fen)).toEqual([A]);
    expect(out[0].topMoves).toBeDefined();
    expect(k.enrich).toHaveBeenCalledTimes(2);   // C was never sent to the engine
  });

  it('a step without enrich passes its boards through untouched', async () => {
    const k = { ...kit(() => true), enrich: undefined };
    const boards = [{ fen: A, origin: 'puzzle' as const }];
    expect(await enrichForLesson(k, boards, new Set())).toEqual(boards);
  });
});
