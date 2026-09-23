import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────

// Controllable speak promise so we can assert cancellation during playback.
type SpeakRecord = { text: string; resolve: () => void };
const speakRecords: SpeakRecord[] = [];
let stopCount = 0;

vi.mock('../services/voiceService', () => ({
  voiceService: {
    // "Read this position" is an explicit read-aloud tap → speakReadAloud
    // (bypasses the verbosity gate) rather than speakForced.
    speakReadAloud: vi.fn((text: string) => {
      return new Promise<void>((resolve) => {
        speakRecords.push({ text, resolve });
      });
    }),
    stop: vi.fn(() => {
      stopCount++;
    }),
  },
}));

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 0,
      isMate: false,
      mateIn: null,
      depth: 16,
      topLines: [],
      nodesPerSecond: 0,
    }),
    analyzeWithBudget: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 0,
      isMate: false,
      mateIn: null,
      depth: 16,
      topLines: [],
      nodesPerSecond: 0,
    }),
    evalBoard: vi.fn().mockResolvedValue(null),
  },
  // The hook reads the active engine variant to size the Stockfish budget
  // (iOS asm.js needs a bigger budget than desktop WASM). Default to the fast
  // non-asm path in tests.
  resolveWorkerUrl: vi.fn(() => ({ url: '', variant: 'single', reason: 'test', workerType: 'classic' })),
}));

vi.mock('../db/schema', () => ({
  db: {
    profiles: {
      get: vi.fn().mockResolvedValue({ currentRating: 1200 }),
    },
  },
}));

const auditCalls: { kind: string; summary: string }[] = [];
vi.mock('../services/appAuditor', () => ({
  logAppAudit: vi.fn((entry: { kind: string; summary: string }) => {
    auditCalls.push({ kind: entry.kind, summary: entry.summary });
    return Promise.resolve();
  }),
}));

// THE ONE CHOKEPOINT. G0 (WO-STANDARD-01 F2): the hook no longer asks a chat
// model to AUTHOR the read; it computes the facts and hands them to voiceFacts
// to PHRASE. The mock records what was handed over and lets each test decide
// what comes back — the real voiceFacts is proven separately.
type VoiceCall = { facts: string; opts: Record<string, unknown> };
const voiceCalls: VoiceCall[] = [];
let voiceResolver: ((text: string | null) => void) | null = null;
let voiceRejecter: ((err: Error) => void) | null = null;

vi.mock('../services/coachApi', () => ({
  voiceFacts: vi.fn((facts: string, opts: Record<string, unknown>) => {
    voiceCalls.push({ facts, opts });
    return new Promise<string | null>((resolve, reject) => {
      voiceResolver = resolve;
      voiceRejecter = reject;
    });
  }),
  // The raw register: what a dead phraser falls back to. Mirrors the real
  // helper's contract closely enough for the hook (strip labels, collapse
  // whitespace).
  speakableFacts: (facts: string) => facts.replace(/\s{2,}/g, ' ').trim(),
}));

import { usePositionNarration, __resetStockfishCacheForTests } from './usePositionNarration';
import { stockfishEngine } from '../services/stockfishEngine';

// ── Helpers ───────────────────────────────────────────────────────────────

function defaultArgs(): Parameters<typeof usePositionNarration>[0] {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    pgn: '1. e4',
    moveNumber: 1,
    playerColor: 'white',
    openingName: null,
    corpusNotes: true,
  };
}

beforeEach(() => {
  speakRecords.length = 0;
  stopCount = 0;
  voiceCalls.length = 0;
  voiceResolver = null;
  voiceRejecter = null;
  auditCalls.length = 0;
  __resetStockfishCacheForTests();
  vi.mocked(stockfishEngine.analyzePosition).mockClear();
  vi.mocked(stockfishEngine.analyzeWithBudget).mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('usePositionNarration', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));
    expect(result.current.isNarrating).toBe(false);
    expect(result.current.currentText).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('hands COMPUTED facts to voiceFacts from the coach-is-opponent seat (G0)', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });

    await waitFor(() => expect(voiceCalls.length).toBe(1));
    const call = voiceCalls[0];
    // The phase is a computed sentence, present on every read.
    expect(call.facts).toMatch(/Still in the opening\./);
    // The positional read (readPosition) is computed on the board, both sides.
    expect(call.facts.length).toBeGreaterThan('Still in the opening.'.length);
    expect(call.opts.perspective).toEqual({ mode: 'coach-is-opponent' });
    expect(call.opts.intent).toBe('position-read');
    expect(call.opts.warm).toBe(true);
    expect(result.current.isNarrating).toBe(true);
  });

  it('speaks the phrased read sentence by sentence via speakReadAloud, and reports the whole text', async () => {
    const reports: string[] = [];
    const { result } = renderHook(() => usePositionNarration({ ...defaultArgs(), onReport: (t) => reports.push(t) }));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    const phrased = 'Okay, still in the opening. Your bishop pair is your asset.';
    act(() => {
      voiceResolver?.(phrased);
    });

    await waitFor(() => expect(result.current.currentText).toBe(phrased));
    // Two sentences → two utterances, chained (the second waits on the first).
    await waitFor(() => expect(speakRecords.length).toBe(1));
    expect(speakRecords[0].text).toBe('Okay, still in the opening.');
    expect(reports).toEqual([phrased]);
    // Still narrating until speech resolves
    expect(result.current.isNarrating).toBe(true);

    act(() => { speakRecords[0].resolve(); });
    await waitFor(() => expect(speakRecords.length).toBe(2));
    expect(speakRecords[1].text).toBe('Your bishop pair is your asset.');
    act(() => { speakRecords[1].resolve(); });
    await waitFor(() => expect(result.current.isNarrating).toBe(false));
  });

  it('a dead phraser still reads the position — the COMPUTED facts are spoken raw', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    // voiceFacts itself serves the raw facts on a provider failure; the hook
    // must ALSO survive the promise rejecting outright (a thrown error above
    // the chokepoint) without going silent.
    act(() => {
      voiceRejecter?.(new Error('provider exploded'));
    });

    await waitFor(() => expect(speakRecords.length).toBe(1));
    expect(speakRecords[0].text).toMatch(/Still in the opening\./);
    expect(result.current.currentText).toMatch(/Still in the opening\./);
    expect(result.current.error).toContain('provider exploded');
  });

  it('calling narrate() again mid-flight stops prior speech and starts a fresh turn', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    act(() => {
      voiceResolver?.('First narration text.');
    });
    await waitFor(() => expect(speakRecords.length).toBe(1));

    // Re-tap mid-speech — should stop audio and start over.
    act(() => {
      void result.current.narrate();
    });

    expect(stopCount).toBeGreaterThanOrEqual(2); // once at start, once on restart
    await waitFor(() => expect(voiceCalls.length).toBe(2));
    // Stale text cleared by the restart.
    expect(result.current.currentText).toBe('');
  });

  it('cancel() stops speech and clears state', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    act(() => {
      result.current.cancel();
    });

    expect(stopCount).toBeGreaterThanOrEqual(1);
    expect(result.current.isNarrating).toBe(false);
    expect(result.current.currentText).toBe('');
  });

  it('does not speak when the user cancels before the phrasing lands', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    act(() => {
      result.current.cancel();
    });

    // Now resolve the (cancelled) phrasing — speak must NOT fire.
    await act(async () => {
      voiceResolver?.('Late phrasing.');
      await Promise.resolve();
    });
    expect(speakRecords.length).toBe(0);
  });

  it('recovers from a hung phrasing call — speaks the computed facts raw after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => usePositionNarration(defaultArgs()));

      act(() => {
        void result.current.narrate();
      });
      // The hook awaits stockfish first — drain that microtask.
      await vi.advanceTimersByTimeAsync(0);
      await vi.waitFor(() => expect(voiceCalls.length).toBe(1));
      expect(result.current.isNarrating).toBe(true);

      // Do NOT resolve the phrasing promise. Advance past the 120s ceiling and
      // drain microtasks so the timeout rejection, the catch and the raw
      // fallback all run.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(121_000);
      });

      // Board-unfreeze invariant is unchanged — but the button is NOT dead: the
      // computed read is spoken in the raw register instead of "timed out".
      expect(result.current.currentText).toMatch(/Still in the opening\./);
      expect(speakRecords.length).toBe(1);
      expect(auditCalls.some((c) => c.kind === 'llm-error' && /timed out/i.test(c.summary))).toBe(true);
      // The raw read is several sentences; each utterance waits on the last.
      // Drain the chain one resolve at a time until the hook goes idle.
      for (let i = 0; i < 20 && result.current.isNarrating; i += 1) {
        const pending = speakRecords[speakRecords.length - 1];
        act(() => { pending.resolve(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      }
      expect(result.current.isNarrating).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // WO-PHASE-PROSE-01: per-FEN Stockfish cache. Repeat taps on the
  // same position should skip the engine cycle entirely.
  it('second narration on the same FEN skips Stockfish and logs cache-hit audit', async () => {
    const args = defaultArgs();
    const { result } = renderHook(() => usePositionNarration(args));

    // First tap: engine runs.
    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));
    voiceResolver?.('Opening look.');
    await waitFor(() => expect(speakRecords.length).toBe(1));
    const firstCallCount = vi.mocked(stockfishEngine.analyzeWithBudget).mock.calls.length;
    expect(firstCallCount).toBe(1);

    // Finish first speak so the hook is idle again.
    speakRecords[0].resolve();
    await waitFor(() => expect(result.current.isNarrating).toBe(false));

    voiceResolver = null;
    voiceCalls.length = 0;

    // Second tap on the same FEN.
    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    // Stockfish NOT called again — cache hit.
    expect(vi.mocked(stockfishEngine.analyzeWithBudget).mock.calls.length).toBe(firstCallCount);
    expect(auditCalls.some((c) => c.kind === 'narration-stockfish-cache-hit')).toBe(true);
  });

  it('narration on a different FEN re-runs Stockfish (cache miss)', async () => {
    const firstArgs = defaultArgs();
    const { result, rerender } = renderHook(
      (args: Parameters<typeof usePositionNarration>[0]) => usePositionNarration(args),
      { initialProps: firstArgs },
    );

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));
    voiceResolver?.('one.');
    await waitFor(() => expect(speakRecords.length).toBe(1));
    speakRecords[0].resolve();
    await waitFor(() => expect(result.current.isNarrating).toBe(false));

    const firstCallCount = vi.mocked(stockfishEngine.analyzeWithBudget).mock.calls.length;
    voiceResolver = null;
    voiceCalls.length = 0;

    rerender({ ...firstArgs, fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2' });
    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1));

    // New FEN → engine runs again, no cache-hit audit for THIS call.
    expect(vi.mocked(stockfishEngine.analyzeWithBudget).mock.calls.length).toBe(firstCallCount + 1);
  });
});

describe('the COMPUTED CONCEPT reaches "Read this position" (P4c — a wire that fires)', () => {
  it('hands the fork the engine line lands to the phraser as a computed board fact', async () => {
    // White to move, student white; the engine's line is Ne5+ — a royal fork
    // on Kd7 and the winnable Rc6. Probed through conceptForBoard with this
    // exact analysis before it was pinned. The read is the model's phrasing of
    // the computed facts (G0), so the proof is that the concept clause is IN
    // the facts handed over — not that a mocked brain echoed it.
    const FORK_FEN = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 40';
    vi.mocked(stockfishEngine.analyzeWithBudget).mockResolvedValueOnce({
      bestMove: 'd3e5', evaluation: 350, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 1,
      topLines: [{ rank: 1, evaluation: 350, moves: ['d3e5'], mate: null }],
    } as unknown as Awaited<ReturnType<typeof stockfishEngine.analyzeWithBudget>>);
    const { result } = renderHook(() => usePositionNarration({ ...defaultArgs(), fen: FORK_FEN, pgn: '', moveNumber: 40, playerColor: 'white' }));
    act(() => { void result.current.narrate(); });
    await waitFor(() => expect(voiceCalls.length).toBe(1), { timeout: 4000 });
    expect(voiceCalls[0].facts, 'the concept clause never reached the phraser').toMatch(/a fork hits two targets at once/);
  });
});
