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

// The read is ENGINE-BACKED (477061d, "one decider for Read this position"):
// with no line from the engine the board read says nothing, and the old phase
// sentence that used to fill it is gone by design. So the mocked engine
// answers with a real line — the first legal move on the board it is asked
// about — and every test reads a real, computed read.
const firstLine = async (fen: string) => {
  const { Chess } = await import('chess.js');
  const m = new Chess(fen).moves({ verbose: true })[0];
  return {
    bestMove: m ? `${m.from}${m.to}` : '', evaluation: 20, isMate: false, mateIn: null, depth: 16,
    topLines: m ? [{ rank: 1, evaluation: 20, mate: null, moves: [`${m.from}${m.to}`] }] : [],
    nodesPerSecond: 0,
  };
};
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn((fen: string) => firstLine(fen)),
    analyzeWithBudget: vi.fn((fen: string) => firstLine(fen)),
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

/** The hook's OWN engine reads of `fen` — the read's tempting moves are read
 *  on the boards after them (`boardReadFacts`), which are other FENs. */
const callsOn = (fen: string): number => vi.mocked(stockfishEngine.analyzeWithBudget).mock.calls.filter((c) => c[0] === fen).length;
/** A full read is ~19 engine-backed reads and the read's data loaded on first
 *  use (~5 s cold under vitest, ~1.7 s warm): the waits allow for it. */
const READ_WAIT = { timeout: 20_000 };
vi.setConfig({ testTimeout: 30_000 });

function defaultArgs(): Parameters<typeof usePositionNarration>[0] {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    pgn: '1. e4',
    moveNumber: 1,
    playerColor: 'white',
    openingName: null,
    corpusNotes: true,
    withhold: null,
    surface: 'learn' as const,
    story: null,
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

  it('hands COMPUTED facts to voiceFacts in the seat they were computed in (G0, walk 6 P1)', async () => {
    // A quiet Italian at move 7, White developed: a board where the read has
    // something true to say. (After 1.e4 alone it rightly says only the phase —
    // no lever talk with the minors at home, hand walk 2026-09-27.)
    const ITALIAN = 'r1bq1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 7';
    // The engine's line here: h3 first (a2-a3, the first legal move, says
    // nothing a read would speak of).
    vi.mocked(stockfishEngine.analyzeWithBudget).mockResolvedValueOnce({
      bestMove: 'h2h3', evaluation: 20, isMate: false, mateIn: null, depth: 16, nodesPerSecond: 1,
      topLines: [{ rank: 1, evaluation: 20, moves: ['h2h3'], mate: null }],
    } as unknown as Awaited<ReturnType<typeof stockfishEngine.analyzeWithBudget>>);
    const { result } = renderHook(() => usePositionNarration({ ...defaultArgs(), fen: ITALIAN }));

    act(() => {
      void result.current.narrate();
    });

    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);
    const call = voiceCalls[0];
    // The read is computed on the board (the read decider's facts, Danya's
    // order) before the phraser sees a word.
    expect(call.facts.trim().length).toBeGreaterThan(0);
    // ONE seat end to end: the phraser is never asked to turn "they" into
    // "I" (on prod it turned it into "you" — a whose-piece inversion).
    expect(call.opts.perspective).toEqual({ mode: 'student', studentSide: 'white' });
    expect(call.facts).not.toMatch(/\bI('m|'ve| have| am)\b|\bmy\b/);
    expect(call.opts.intent).toBe('position-read');
    // COMPUTED PROSE SPEAKS (2026-10-01): the warm pass invented a conclusion
    // on a mate-in-two, and `warm` overrides `preferRaw`, so it is off.
    expect(call.opts.warm).toBeUndefined();
    expect(call.opts.preferRaw).toBe(true);
    expect(result.current.isNarrating).toBe(true);
  });

  it('speaks the phrased read sentence by sentence via speakReadAloud, and reports the whole text', async () => {
    const reports: string[] = [];
    const { result } = renderHook(() => usePositionNarration({ ...defaultArgs(), onReport: (t) => reports.push(t) }));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

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
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

    // voiceFacts itself serves the raw facts on a provider failure; the hook
    // must ALSO survive the promise rejecting outright (a thrown error above
    // the chokepoint) without going silent.
    act(() => {
      voiceRejecter?.(new Error('provider exploded'));
    });

    await waitFor(() => expect(speakRecords.length).toBe(1));
    // The computed read, in the raw register (`speakableFacts`).
    const raw = voiceCalls[0].facts.replace(/\s{2,}/g, ' ').trim();
    expect(raw.length).toBeGreaterThan(0);
    expect(result.current.currentText).toBe(raw);
    expect(raw.startsWith(speakRecords[0].text.trim())).toBe(true);
    expect(result.current.error).toContain('provider exploded');
  });

  it('calling narrate() again mid-flight stops prior speech and starts a fresh turn', async () => {
    const { result } = renderHook(() => usePositionNarration(defaultArgs()));

    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

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
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

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
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

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
      expect(result.current.currentText).toBe(voiceCalls[0].facts.replace(/\s{2,}/g, ' ').trim());
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
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);
    voiceResolver?.('Opening look.');
    await waitFor(() => expect(speakRecords.length).toBe(1));
    const firstCallCount = callsOn(defaultArgs().fen);
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
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

    // Stockfish NOT called again — cache hit.
    expect(callsOn(defaultArgs().fen)).toBe(firstCallCount);
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
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);
    voiceResolver?.('one.');
    await waitFor(() => expect(speakRecords.length).toBe(1));
    speakRecords[0].resolve();
    await waitFor(() => expect(result.current.isNarrating).toBe(false));

    const SICILIAN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
    const firstCallCount = callsOn(SICILIAN);
    voiceResolver = null;
    voiceCalls.length = 0;

    rerender({ ...firstArgs, fen: SICILIAN });
    act(() => {
      void result.current.narrate();
    });
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);

    // New FEN → engine runs again, no cache-hit audit for THIS call.
    expect(callsOn(SICILIAN)).toBe(firstCallCount + 1);
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
    // The read comes in two parts (the opening, then the deep part): what the
    // best move lands is the deep part's, phrased once the opening is.
    await waitFor(() => expect(voiceCalls.length).toBe(1), READ_WAIT);
    await act(async () => { voiceResolver?.(null); await Promise.resolve(); });
    await waitFor(() => expect(voiceCalls.length).toBe(2), READ_WAIT);
    expect(voiceCalls.map((c) => c.facts).join(' '), 'the concept clause never reached the phraser').toMatch(/a fork hits two targets at once/);
  });
});

describe('dropInventedQuestions — walk 6 P2', () => {
  it('drops a question the facts never asked, keeps the facts', async () => {
    const { dropInventedQuestions } = await import('./usePositionNarration');
    const facts = "They're threatening to win the bishop on c4 — that has to be met first.";
    expect(dropInventedQuestions(`First thing: they're threatening your bishop on c4. So what matters beyond that?`, facts))
      .toBe("First thing: they're threatening your bishop on c4.");
    // All question → nothing kept; the caller then speaks the facts raw.
    expect(dropInventedQuestions('What now?', facts)).toBe('');
    // A question the facts DO ask survives.
    expect(dropInventedQuestions('Can you find it?', 'Can you find it?')).toBe('Can you find it?');
  });
});
