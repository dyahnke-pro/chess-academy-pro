/**
 * WO-STANDARD-01 F2 — "Read this position" under DEGRADE=llm.
 *
 * The REAL `coachApi.voiceFacts` runs here (only the `openai` wire is faked,
 * and it 401s). Under G0 the model only PHRASES facts computed in code, so
 * with the provider dead the read must still be SPOKEN — in the raw computed
 * register. Before this inversion the surface asked a chat model to AUTHOR the
 * read: with the provider dead it produced "⚠️ Coach error…", which the hook
 * refused to speak, and the button was a dead control.
 *
 * Proof is OUTPUT: the real chokepoint received the computed bundle (fork
 * clause included), the provider failed, and the sentences spoken through
 * speakReadAloud are the computed phase line and the computed positional read.
 *
 * KNOWN, OUT OF BUCKET: the engine-line concept clause is phrased in the
 * post-move frame ("Knight on e5 forks…") and the voice package grades every
 * sentence against the CURRENT board, so that one computed sentence is refused
 * at packaging on this surface — before and after the inversion alike. The
 * fix belongs to the clause renderer / the package's frame, not here.
 *
 * NEGATIVE CONTROL: on the pre-inversion hook (getCoachChatResponse +
 * POSITION_NARRATION_ADDITION) `speakRecords` stays empty — the chat model's
 * "⚠️" error string is never spoken.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const speakRecords: string[] = [];
vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakReadAloud: vi.fn((text: string) => { speakRecords.push(text); return Promise.resolve(); }),
    stop: vi.fn(),
  },
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: async () => { throw Object.assign(new Error('401 degraded-audit'), { status: 401 }); },
      },
    };
  },
}));

// Keep the REAL implementation; only record what the chokepoint was handed.
const voiceFactsSpy = vi.fn();
vi.mock('../services/coachApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('../services/coachApi')>();
  return {
    ...real,
    voiceFacts: (...args: Parameters<typeof real.voiceFacts>) => {
      voiceFactsSpy(...args);
      return real.voiceFacts(...args);
    },
  };
});

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue(null),
    analyzeWithBudget: vi.fn()
      .mockResolvedValue({ bestMove: 'e2e4', evaluation: 0, isMate: false, mateIn: null, depth: 16, topLines: [], nodesPerSecond: 0 })
      .mockResolvedValueOnce({
        bestMove: 'd3e5', evaluation: 350, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 1,
        topLines: [{ rank: 1, evaluation: 350, moves: ['d3e5'], mate: null }],
      }),
    evalBoard: vi.fn().mockResolvedValue(null),
  },
  resolveWorkerUrl: vi.fn(() => ({ url: '', variant: 'single', reason: 'test', workerType: 'classic' })),
}));

import { usePositionNarration, __resetStockfishCacheForTests } from './usePositionNarration';

beforeEach(() => {
  speakRecords.length = 0;
  voiceFactsSpy.mockClear();
  __resetStockfishCacheForTests();
});

describe('read this position — the provider is dead', () => {
  it('the computed read reaches the real chokepoint and is spoken in the raw register', async () => {
    // White to move; Ne5+ forks Kd7 and Rc6 (the P4c fixture).
    const FORK_FEN = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 40';
    const { result } = renderHook(() => usePositionNarration({ fen: FORK_FEN, pgn: '', moveNumber: 40, playerColor: 'white', openingName: null, corpusNotes: true }));
    act(() => { void result.current.narrate(); });
    await waitFor(() => expect(speakRecords.length).toBeGreaterThan(0), { timeout: 15_000 });
    await waitFor(() => expect(result.current.isNarrating).toBe(false), { timeout: 15_000 });

    // The real voiceFacts was called ONCE with the computed bundle, fork
    // clause included, in the one seat the facts were computed in.
    expect(voiceFactsSpy).toHaveBeenCalledTimes(1);
    const [facts, opts] = voiceFactsSpy.mock.calls[0] as [string, { perspective?: { mode: string } }];
    expect(facts).toMatch(/a fork hits two targets at once/);
    expect(opts.perspective?.mode).toBe('student');

    // The provider 401'd; what was SPOKEN is the raw computed register.
    const spoken = speakRecords.join(' ');
    expect(spoken).toMatch(/This is the endgame now\./);
    // No queens: a king in the open is the ENDGAME's right square, not a
    // weakness — "files open toward your king" is the middlegame worry and
    // the positional read drops it without queens (hand walk 2340, moves 32-34).
    expect(spoken).not.toMatch(/open toward your king/);
    expect(spoken).not.toMatch(/⚠️/);
    expect(result.current.currentText).toMatch(/This is the endgame now\./);
  }, 30_000);
});
