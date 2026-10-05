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

describe('boards come from the student\'s own failures at the step', () => {
  // Minimal spine rows: only the fields the ordering reads.
  const hole = (tag: string | null, fens: string[]) =>
    ({ capabilityTag: tag, positions: fens.map((fen) => ({ fen, from: {} })) }) as unknown as import('./weaknessSpine').UnifiedWeakness;

  it('puts the boards of a weakness filed under the step\'s tags first — a reorder, never a filter', async () => {
    const { boardsForStep } = await import('./thinkingLessonStart');
    const pool: LessonPositionCandidate[] = [{ fen: A, origin: 'puzzle' }, { fen: B, origin: 'puzzle' }, { fen: C, origin: 'game' }];
    const out = boardsForStep(pool, [hole('missed-tactic', [A]), hole('hung-material', [C, B])], ['hung-material']);
    expect(out.map((c) => c.fen)).toEqual([C, B, A]);
    expect(boardsForStep(pool, [], ['hung-material'])).toEqual(pool);
  });

  it('adds a weakness board the pool lacks, as a game board with the move they played', async () => {
    const { withWeaknessBoards } = await import('./thinkingLessonStart');
    const w = { capabilityTag: 'hung-material', positions: [{ fen: B, playedSan: 'Rb2', from: {} }, { fen: A, from: {} }] } as unknown as import('./weaknessSpine').UnifiedWeakness;
    const out = withWeaknessBoards([{ fen: A, origin: 'puzzle' }], [w]);
    expect(out).toEqual([{ fen: A, origin: 'puzzle' }, { fen: B, origin: 'game', playedSan: 'Rb2' }]);
  });
});

describe('slipStepsForBoards — the review asks the step its slip was filed under', () => {
  // White's knight on c6 is attacked by the b7-pawn and defended by nothing.
  const HUNG = '4k3/1p6/2N5/8/8/8/8/4K3 w - - 0 1';
  const OTHER = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';

  it('a hung-material slip asks "am I safe?" on that board', async () => {
    const { slipStepsForBoards, kitForStep } = await import('./thinkingLessonStart');
    expect(kitForStep('am-i-safe')?.keyFor(HUNG)).not.toBeNull();
    const out = slipStepsForBoards([{ tag: 'hung-material', fen: HUNG }], [{ ply: 7, fen: HUNG }]);
    expect(out.get(7)).toBe('am-i-safe');
  });

  it('matches by board identity, not by the move counters in the FEN', async () => {
    const { slipStepsForBoards } = await import('./thinkingLessonStart');
    const later = HUNG.replace(/0 1$/, '3 19');
    expect(slipStepsForBoards([{ tag: 'hung-material', fen: later }], [{ ply: 7, fen: HUNG }]).get(7)).toBe('am-i-safe');
  });

  it('stays silent with no tag at the board, a tag on another board, or an engine-keyed step', async () => {
    const { slipStepsForBoards } = await import('./thinkingLessonStart');
    expect(slipStepsForBoards([], [{ ply: 7, fen: HUNG }]).size).toBe(0);
    expect(slipStepsForBoards([{ tag: 'hung-material', fen: OTHER }], [{ ply: 7, fen: HUNG }]).size).toBe(0);
    expect(slipStepsForBoards([{ tag: 'not-a-tag', fen: HUNG }], [{ ply: 7, fen: HUNG }]).size).toBe(0);
  });

  it('an engine-keyed step never stops the walk', async () => {
    const { slipStepsForBoards } = await import('./thinkingLessonStart');
    // 'bad-trade' is trained only by candidates (engine-keyed) → silent.
    expect(slipStepsForBoards([{ tag: 'bad-trade', fen: HUNG }], [{ ply: 7, fen: HUNG }]).size).toBe(0);
  });

  it('stays silent when no step that trains the tag poses a fair question', async () => {
    const { slipStepsForBoards } = await import('./thinkingLessonStart');
    expect(slipStepsForBoards([{ tag: 'hung-material', fen: OTHER }], [{ ply: 3, fen: OTHER }]).size).toBe(0);
  });
});
