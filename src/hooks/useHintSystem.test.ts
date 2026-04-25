/**
 * useHintSystem tests — WO-HINT-REDESIGN-01 + WO-BRAIN-05b.
 *
 * Verifies the progressive hint pipeline post-spine-migration:
 *   - Tier 1 ask carries HINT_TIER_1_ADDITION; no arrow rendered.
 *   - Tier 2 escalates the same FEN's record, still no arrow.
 *   - Tier 3 escalates and now an arrow appears.
 *   - Each tap dispatches `coachService.ask({ surface: 'hint', ... },
 *     { maxToolRoundTrips: 2 })` and the brain's `record_hint_request`
 *     tool call (mocked here as if the LLM emitted it) writes the tap
 *     to coach memory.
 *   - Resetting the hook between FENs finalizes the pending record.
 *   - Tier prompt strings still hold the discipline guarantees the
 *     WO requires (no piece names at Tier 1, no destination at Tier 2,
 *     concrete move + plan at Tier 3).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  HINT_TIER_1_ADDITION,
  HINT_TIER_2_ADDITION,
  HINT_TIER_3_ADDITION,
} from '../services/coachPrompts';

// ── Mocks ─────────────────────────────────────────────────────────────────

const speakRecords: { method: string; text: string }[] = [];
vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakForced: vi.fn((text: string) => {
      speakRecords.push({ method: 'speakForced', text });
      return Promise.resolve();
    }),
    speakQueuedForced: vi.fn((text: string) => {
      speakRecords.push({ method: 'speakQueuedForced', text });
      return Promise.resolve();
    }),
    stop: vi.fn(),
  },
}));

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'g1f3',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 10,
      topLines: [],
      nodesPerSecond: 0,
    }),
    stop: vi.fn(),
  },
}));

vi.mock('./stockfishFenCache', () => ({
  getCachedStockfish: vi.fn(() => undefined),
  setCachedStockfish: vi.fn(),
}));

const auditCalls: { kind: string; summary: string }[] = [];
vi.mock('../services/appAuditor', () => ({
  logAppAudit: vi.fn((entry: { kind: string; summary: string }) => {
    auditCalls.push({ kind: entry.kind, summary: entry.summary });
    return Promise.resolve();
  }),
}));

interface SpineCall {
  surface: string;
  ask: string;
  maxToolRoundTrips: number | undefined;
  fen: string | undefined;
}
const spineCalls: SpineCall[] = [];
const spineResponses: string[] = [];

// Mock the spine. The brain's job is to emit a `record_hint_request`
// tool call when the surface includes the canonical instruction in
// the ask body — we simulate that here so the memory store reflects
// production behavior. If the surface stops including the instruction
// (regression), the test will catch it because hintRequests stays
// empty.
vi.mock('../coach/coachService', async () => {
  const { useCoachMemoryStore } = await import('../stores/coachMemoryStore');
  return {
    coachService: {
      ask: vi.fn(
        async (
          input: { surface: string; ask: string; liveState?: { fen?: string } },
          options?: { maxToolRoundTrips?: number; onChunk?: (chunk: string) => void },
        ) => {
          spineCalls.push({
            surface: input.surface,
            ask: input.ask,
            maxToolRoundTrips: options?.maxToolRoundTrips,
            fen: input.liveState?.fen,
          });
          // Brain-emitted tool call simulator: parse the canonical
          // record_hint_request action embedded in the ask text and
          // dispatch it through the same store action the cerebrum
          // tool would use. Mirrors the production behavior the
          // identity prompt steers the brain into.
          const match = /\[\[ACTION:record_hint_request (\{.*?\})\]\]/.exec(input.ask);
          if (match) {
            try {
              const args = JSON.parse(match[1]) as {
                gameId: string;
                moveNumber: number;
                ply: number;
                fen: string;
                bestMoveUci: string;
                bestMoveSan: string;
                tier: 1 | 2 | 3;
              };
              useCoachMemoryStore.getState().recordHintRequest(args);
            } catch {
              /* malformed args — let the test fail on the assertion */
            }
          }
          const response = spineResponses.shift() ?? 'mock hint';
          // Stream the response chunk-by-chunk so the surface's TTS
          // sentence-buffer logic fires the same way it would in
          // production.
          options?.onChunk?.(response);
          return { text: response, toolCallIds: [], provider: 'deepseek' as const };
        },
      ),
    },
  };
});

import { useHintSystem } from './useHintSystem';
import {
  useCoachMemoryStore,
  __resetCoachMemoryStoreForTests,
} from '../stores/coachMemoryStore';
import { db } from '../db/schema';

beforeEach(async () => {
  speakRecords.length = 0;
  auditCalls.length = 0;
  spineCalls.length = 0;
  spineResponses.length = 0;
  __resetCoachMemoryStoreForTests();
  await db.meta.delete('coachMemory.v1');
});

afterEach(() => {
  vi.clearAllMocks();
});

// Starting position — white to move so the mocked best move (g1f3)
// is legal and Tier 3 can render the arrow.
const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('useHintSystem — Tier 1 (the WHY)', () => {
  it('sends HINT_TIER_1_ADDITION via coachService.ask on first tap and renders no arrows', async () => {
    spineResponses.push('Your center is begging for reinforcement — find the piece that can defend it.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        enabled: true,
        gameId: 'g-1',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => {
      result.current.requestHint();
    });

    await waitFor(() => expect(spineCalls.length).toBe(1));
    expect(spineCalls[0].surface).toBe('hint');
    expect(spineCalls[0].maxToolRoundTrips).toBe(2);
    expect(spineCalls[0].fen).toBe(FEN_AFTER_E4);
    expect(spineCalls[0].ask).toContain(HINT_TIER_1_ADDITION);
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    expect(result.current.hintState.arrows).toEqual([]);
    expect(result.current.hintState.ghostMove).toBeNull();
    // Sentence-streamed via Polly as the first sentence (chunk-driven).
    expect(speakRecords.some((r) => r.method === 'speakForced')).toBe(true);
  });

  it('records the request to coach memory via the brain-emitted tool call', async () => {
    spineResponses.push('Your center is collapsing.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        enabled: true,
        gameId: 'g-1',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => {
      result.current.requestHint();
    });

    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    const records = useCoachMemoryStore.getState().hintRequests;
    expect(records).toHaveLength(1);
    expect(records[0].tierReached).toBe(1);
    expect(records[0].fen).toBe(FEN_AFTER_E4);
    expect(records[0].userPlayedBestMove).toBeNull();
    // Surface fires the migration audit; store action fires the
    // memory-record audit.
    expect(auditCalls.some((c) => c.kind === 'coach-surface-migrated')).toBe(true);
    expect(auditCalls.some((c) => c.kind === 'coach-memory-hint-requested')).toBe(true);
  });
});

describe('useHintSystem — Tier 2 escalation (the WHICH)', () => {
  it('uses HINT_TIER_2_ADDITION on second tap, still no arrow', async () => {
    spineResponses.push('Tier 1 prose.', 'Tier 2 prose.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        enabled: true,
        gameId: 'g-1',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => {
      result.current.requestHint();
    });
    await waitFor(() => expect(result.current.hintState.level).toBe(1));

    act(() => {
      result.current.requestHint();
    });
    await waitFor(() => expect(result.current.hintState.level).toBe(2));
    expect(spineCalls[1].ask).toContain(HINT_TIER_2_ADDITION);
    expect(result.current.hintState.arrows).toEqual([]);
    // Memory store records the same FEN once with escalated tier
    // (the store ratchets monotonically on the same FEN).
    const records = useCoachMemoryStore.getState().hintRequests;
    expect(records).toHaveLength(1);
    expect(records[0].tierReached).toBe(2);
  });
});

describe('useHintSystem — Tier 3 (the FULL ANSWER)', () => {
  it('uses HINT_TIER_3_ADDITION on third tap and renders an arrow', async () => {
    spineResponses.push('Tier 1 prose.', 'Tier 2 prose.', 'Tier 3 prose.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        enabled: true,
        gameId: 'g-1',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(2));
    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(3));

    expect(spineCalls[2].ask).toContain(HINT_TIER_3_ADDITION);
    expect(result.current.hintState.arrows).toHaveLength(1);
    expect(result.current.hintState.arrows[0].startSquare).toBe('g1');
    expect(result.current.hintState.arrows[0].endSquare).toBe('f3');
    const records = useCoachMemoryStore.getState().hintRequests;
    expect(records[0].tierReached).toBe(3);
  });

  it('does not escalate beyond Tier 3 on additional taps', async () => {
    spineResponses.push('a', 'b', 'c');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        enabled: true,
        gameId: 'g-1',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(2));
    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(3));
    // Extra tap is a no-op.
    act(() => { result.current.requestHint(); });
    expect(result.current.hintState.level).toBe(3);
    expect(spineCalls.length).toBe(3);
  });
});

describe('useHintSystem — FEN-change finalization', () => {
  it('finalizes the pending hint record when the FEN changes', async () => {
    spineResponses.push('Tier 1 prose.');
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useHintSystem>[0]) => useHintSystem(props),
      {
        initialProps: {
          fen: FEN_AFTER_E4,
          playerColor: 'black' as const,
          enabled: true,
          gameId: 'g-1',
          moveNumber: 1,
          ply: 1,
        },
      },
    );

    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    expect(useCoachMemoryStore.getState().hintRequests[0].userPlayedBestMove).toBeNull();

    // Simulate the next move: parent rerenders with a new FEN.
    rerender({
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      playerColor: 'black',
      enabled: true,
      gameId: 'g-1',
      moveNumber: 1,
      ply: 1,
    });

    await waitFor(() => {
      const r = useCoachMemoryStore.getState().hintRequests[0];
      expect(r.userPlayedBestMove).toBe(false);
    });
    expect(auditCalls.some((c) => c.kind === 'coach-memory-hint-recorded')).toBe(true);
  });
});

describe('HINT prompt discipline (verbatim guarantees)', () => {
  it('Tier 1 forbids piece names and square coordinates', () => {
    expect(HINT_TIER_1_ADDITION).toMatch(/ABSOLUTELY FORBIDDEN at Tier 1/);
    expect(HINT_TIER_1_ADDITION).toMatch(/Piece names: knight, bishop, rook, queen, king, pawn/);
    expect(HINT_TIER_1_ADDITION).toMatch(/Square coordinates/);
    expect(HINT_TIER_1_ADDITION).toMatch(/Do NOT state the move/);
  });

  it('Tier 2 names the piece but forbids the destination square', () => {
    expect(HINT_TIER_2_ADDITION).toMatch(/Forbidden at Tier 2/);
    expect(HINT_TIER_2_ADDITION).toMatch(/destination square/);
    expect(HINT_TIER_2_ADDITION).toMatch(/disambiguate/);
  });

  it('Tier 3 asks for the move plus the plan it enables', () => {
    expect(HINT_TIER_3_ADDITION).toMatch(/2-3 sentences/);
    expect(HINT_TIER_3_ADDITION).toMatch(/move itself/);
    expect(HINT_TIER_3_ADDITION).toMatch(/plan it enables/);
  });
});
