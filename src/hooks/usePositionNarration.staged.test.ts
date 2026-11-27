import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// "Read this position": the first word does not wait for the deep read (Coach
// Build Board — it was 13 s). The opening is spoken while the deep part is
// still being read, and the deep part follows on the same speech chain.

const spoken: string[] = [];
vi.mock('../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../test/mocks/voice-service');
  return {
    voiceService: buildVoiceServiceMock({
      speakReadAloud: vi.fn((text: string) => { spoken.push(text); return Promise.resolve(); }),
    }),
  };
});
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzeWithBudget: vi.fn(() => Promise.resolve({ bestMove: 'e2e4', evaluation: 20, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 0, topLines: [{ rank: 1, evaluation: 20, mate: null, moves: ['e2e4'] }] })),
    evalBoard: vi.fn().mockResolvedValue(null),
  },
  resolveWorkerUrl: vi.fn(() => ({ url: '', variant: 'single', reason: 'test', workerType: 'classic' })),
}));
vi.mock('../db/schema', () => ({ db: { profiles: { get: vi.fn().mockResolvedValue({ currentRating: 1500 }) } } }));
vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));
vi.mock('../services/coachApi', () => ({
  voiceFacts: vi.fn((facts: string) => Promise.resolve(facts)),
  speakableFacts: (facts: string) => facts,
}));

const deep = vi.hoisted(() => ({ resolve: null as ((t: string) => void) | null }));
vi.mock('../services/positionReadComposer', () => ({
  READ_SEAT: 'student',
  composePositionReadStaged: () => ({
    first: Promise.resolve("You're clearly better — you're up a pawn. Their plan: push the pawn to b4."),
    deep: new Promise<string>((r) => { deep.resolve = r; }),
    kinds: Promise.resolve({ first: ['standing'], deep: ['their-refuted'] }),
  }),
}));

const { usePositionNarration } = await import('./usePositionNarration');

describe('Read this position speaks its opening before the deep read is in', () => {
  it('the opening is spoken while the deep part is still being read; the deep part follows, said once', async () => {
    const { result } = renderHook(() => usePositionNarration({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', pgn: '', moveNumber: 1, playerColor: 'white',
      openingName: null, corpusNotes: false, withhold: null, surface: 'play', story: null,
    }));
    act(() => { void result.current.narrate(); });
    await waitFor(() => expect(spoken.length).toBe(2));
    expect(spoken[0]).toMatch(/^You're clearly better/);
    expect(result.current.isNarrating).toBe(true);
    await act(async () => { deep.resolve?.("Their plan: push the pawn to b4. Watch for their knight jump to d4."); await Promise.resolve(); });
    await waitFor(() => expect(result.current.isNarrating).toBe(false));
    // The deep part's repeat of the opening's sentence is not said again.
    expect(spoken).toEqual([
      "You're clearly better — you're up a pawn.",
      'Their plan: push the pawn to b4.',
      'Watch for their knight jump to d4.',
    ]);
  });
});
