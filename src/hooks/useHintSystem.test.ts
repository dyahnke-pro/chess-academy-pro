/**
 * useHintSystem tests — WO-HINT-REDESIGN-01.
 *
 * Verifies the progressive hint pipeline:
 *   - Tier 1 prompt sent on first tap, no arrow rendered.
 *   - Tier 2 escalates the same FEN's record, still no arrow.
 *   - Tier 3 escalates and now an arrow appears.
 *   - Each tap appends a `coach-memory-hint-requested` audit and the
 *     unified memory store's `hintRequests` reflects the highest tier.
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

const llmCalls: { addition: string; userMessage: string }[] = [];
const llmResponses: string[] = [];
vi.mock('../services/coachApi', () => ({
  getCoachChatResponse: vi.fn(
    (
      messages: { role: 'user' | 'assistant'; content: string }[],
      addition: string,
    ) => {
      llmCalls.push({ addition, userMessage: messages[0]?.content ?? '' });
      const response = llmResponses.shift() ?? 'mock hint';
      return Promise.resolve(response);
    },
  ),
}));

import { useHintSystem } from './useHintSystem';
import {
  useCoachMemoryStore,
  __resetCoachMemoryStoreForTests,
} from '../stores/coachMemoryStore';
import { db } from '../db/schema';

beforeEach(async () => {
  speakRecords.length = 0;
  auditCalls.length = 0;
  llmCalls.length = 0;
  llmResponses.length = 0;
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
  it('sends HINT_TIER_1_ADDITION on first tap and renders no arrows', async () => {
    llmResponses.push('Your center is begging for reinforcement — find the piece that can defend it.');
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

    await waitFor(() => expect(llmCalls.length).toBe(1));
    expect(llmCalls[0].addition).toBe(HINT_TIER_1_ADDITION);
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    expect(result.current.hintState.arrows).toEqual([]);
    expect(result.current.hintState.ghostMove).toBeNull();
    // Spoken via Polly as the first sentence.
    expect(speakRecords.some((r) => r.method === 'speakForced')).toBe(true);
  });

  it('records the request to coach memory and emits the audit', async () => {
    llmResponses.push('Your center is collapsing.');
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
    expect(auditCalls.some((c) => c.kind === 'coach-memory-hint-requested')).toBe(true);
  });
});

describe('useHintSystem — Tier 2 escalation (the WHICH)', () => {
  it('uses HINT_TIER_2_ADDITION on second tap, still no arrow', async () => {
    llmResponses.push('Tier 1 prose.', 'Tier 2 prose.');
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
    expect(llmCalls[1].addition).toBe(HINT_TIER_2_ADDITION);
    expect(result.current.hintState.arrows).toEqual([]);
    // Memory store records the same FEN once with escalated tier.
    const records = useCoachMemoryStore.getState().hintRequests;
    expect(records).toHaveLength(1);
    expect(records[0].tierReached).toBe(2);
  });
});

describe('useHintSystem — Tier 3 (the FULL ANSWER)', () => {
  it('uses HINT_TIER_3_ADDITION on third tap and renders an arrow', async () => {
    llmResponses.push('Tier 1 prose.', 'Tier 2 prose.', 'Tier 3 prose.');
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

    expect(llmCalls[2].addition).toBe(HINT_TIER_3_ADDITION);
    expect(result.current.hintState.arrows).toHaveLength(1);
    expect(result.current.hintState.arrows[0].startSquare).toBe('g1');
    expect(result.current.hintState.arrows[0].endSquare).toBe('f3');
    const records = useCoachMemoryStore.getState().hintRequests;
    expect(records[0].tierReached).toBe(3);
  });

  it('does not escalate beyond Tier 3 on additional taps', async () => {
    llmResponses.push('a', 'b', 'c');
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
    expect(llmCalls.length).toBe(3);
  });
});

describe('useHintSystem — FEN-change finalization', () => {
  it('finalizes the pending hint record when the FEN changes', async () => {
    llmResponses.push('Tier 1 prose.');
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
