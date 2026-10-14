// A CARRY-OVER QUESTION NEVER HOLDS THE BOARD (David 2026-10-14). In Learn free
// play the question waits beside the game: answering opens the tap board, and
// a move closes it unanswered with no evidence written either way.
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const record = vi.fn();
vi.mock('../services/thinkingLessonStart', () => {
  const IDLE = { active: false, step: null, stage: null, fen: null, found: [], wrong: [], shown: [], focus: [], asking: false, prompt: null, index: 0, total: 0, choices: [], choosing: false };
  class ThinkingLessonSession {
    private done: (() => void) | null = null;
    wasStopped = false;
    constructor(_k: unknown, _c: unknown, _s: unknown, private deps: { onView: (v: unknown) => void; record: (a: unknown) => void }) {}
    run(): Promise<void> {
      this.deps.onView({ ...IDLE, active: true, asking: true, step: 'targets', prompt: 'Find their targets — tap each one.' });
      return new Promise((r) => { this.done = r; });
    }
    stop(): void { this.wasStopped = true; this.done?.(); }
    tap(): void {}
    dontKnow(): void { this.deps.record({ unknown: true }); this.done?.(); }
    choose(): void {}
    hold(): void {}
  }
  return {
    ThinkingLessonSession, IDLE_LESSON_VIEW: IDLE,
    loadCarryOverSteps: async () => ['targets'],
    carryOverKitFor: () => ({ step: 'targets', keyFor: () => ({ key: ['a1'] }) }),
    recordLessonAnswer: (a: unknown) => record(a),
    finishThinkingLesson: vi.fn(), kitForStep: vi.fn(), lessonInputs: vi.fn(), refillLessonCandidates: vi.fn(), planThinkingLesson: vi.fn(),
    recordLessonChoice: vi.fn(), rememberLessonBoardNow: vi.fn(), saveLessonProgress: vi.fn(), slipStepsForGame: vi.fn(), firstFairKit: vi.fn(), motifKit: vi.fn(), noLessonLine: vi.fn(),
  };
});

const { useThinkingLesson } = await import('./useThinkingLesson');
const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('the carry-over question waits beside the game', () => {
  it('a move closes it unanswered: no evidence, the board is the game again', async () => {
    record.mockClear();
    const { result } = renderHook(() => useThinkingLesson({ say: async () => {} }));
    let asked!: Promise<boolean>;
    act(() => { asked = result.current.carryOver(FEN); });
    await waitFor(() => expect(result.current.carry).toBe('asking'));
    expect(result.current.view.asking).toBe(true);
    act(() => { expect(result.current.skipCarry()).toBe(true); });
    await act(async () => { await asked; });
    expect(result.current.carry).toBe('none');
    expect(result.current.view.active).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });
  it('answering opens the tap board; a move then does not skip it', async () => {
    const { result } = renderHook(() => useThinkingLesson({ say: async () => {} }));
    act(() => { void result.current.carryOver(FEN); });
    await waitFor(() => expect(result.current.carry).toBe('asking'));
    act(() => { result.current.answerCarry(); });
    expect(result.current.carry).toBe('answering');
    act(() => { expect(result.current.skipCarry()).toBe(false); });
  });
});
