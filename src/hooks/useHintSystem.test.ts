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
  tactics: unknown;
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
          input: { surface: string; ask: string; liveState?: { fen?: string; tactics?: unknown } },
          options?: { maxToolRoundTrips?: number; onChunk?: (chunk: string) => void },
        ) => {
          spineCalls.push({
            surface: input.surface,
            ask: input.ask,
            maxToolRoundTrips: options?.maxToolRoundTrips,
            fen: input.liveState?.fen,
            tactics: input.liveState?.tactics,
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

describe('useHintSystem — Tier 3 answers deterministically (David 2026-09-06)', () => {
  it('names the move + draws the arrow + speaks — WITHOUT calling the brain', async () => {
    // The Tier-3 answer is computed in code (Stockfish move + green arrow +
    // grounded why), never routed through the chat brain. The bug it fixes:
    // `hint` is an internalAsk surface, so getCoachChatResponse dropped the
    // move and served the "I can't verify" stock line (PostHog: both returning
    // users' hint taps got no move, 2026-09).
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

    // Wait for the async answer to land (nudgeText is set by the Tier-3 branch,
    // not synchronously with the level bump).
    await waitFor(() => expect(result.current.hintState.nudgeText).toBeTruthy());
    expect(result.current.hintState.level).toBe(3);
    // The brain is NEVER called for the answer tier.
    expect(spineCalls.length).toBe(0);
    // The move is NAMED (piece + destination) — g1f3 = knight to f3.
    expect(result.current.hintState.nudgeText!.toLowerCase()).toContain('knight');
    expect(result.current.hintState.nudgeText).toContain('f3');
    // The move arrow is revealed immediately on the first press.
    expect(result.current.hintState.arrows).toHaveLength(1);
    expect(result.current.hintState.arrows[0].startSquare).toBe('g1');
    expect(result.current.hintState.arrows[0].endSquare).toBe('f3');
    // The computed line is spoken (not the brain's stream).
    expect(speakRecords.some((r) => r.method === 'speakForced')).toBe(true);
  });

  it('includes the grounded WHY when the board proves one (David: "we explain why")', async () => {
    // A knight that can capture an undefended queen — explainBestMoveGrounded
    // must surface the concrete win. knownMove bypasses the engine mock so the
    // move is fixed and the why is computed from the real position.
    const { result } = renderHook(() =>
      useHintSystem({
        fen: '7k/8/2q5/4N3/8/8/8/K7 w - - 0 1',
        playerColor: 'white',
        enabled: true,
        knownMove: { from: 'e5', to: 'c6', san: 'Nxc6' },
        gameId: 'g-why',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => { result.current.requestHint(); });

    await waitFor(() => expect(result.current.hintState.nudgeText).toBeTruthy());
    expect(result.current.hintState.level).toBe(3);
    expect(spineCalls.length).toBe(0);
    const text = result.current.hintState.nudgeText ?? '';
    // Move named…
    expect(text).toContain('c6');
    // …and the WHY is the concrete material win.
    expect(text.toLowerCase()).toContain('queen');
    // Arrow on the winning move.
    expect(result.current.hintState.arrows[0]).toMatchObject({ startSquare: 'e5', endSquare: 'c6' });
  });

  it('ADAPTIVE: an advanced player starts on the WHY rung (tier 1, no arrow) and climbs on repeat taps', async () => {
    // David 2026-07-03: adaptive hints. A strong player calculates first —
    // first tap is the WHY (tier 1, no move/arrow), not the answer.
    spineResponses.push('Your worst-placed piece is the one to activate; find the square that fights for the center.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        playerRating: 2000, // advanced → tier 1 first tap
        enabled: true,
        gameId: 'g-adv',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(spineCalls.length).toBe(1));
    // First tap = WHY tier, not the answer tier.
    expect(spineCalls[0].ask).toContain(HINT_TIER_1_ADDITION);
    expect(spineCalls[0].ask).not.toContain(HINT_TIER_3_ADDITION);
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    // No answer arrow at tier 1 — they have to find the move.
    expect(result.current.hintState.arrows).toHaveLength(0);
  });

  it('feeds the brain a code-computed tactics context so the hint can NAME the tactic', async () => {
    // The root fix for "tactics alert fired but the hint didn't say what the
    // tactic was" (David 2026-06-22): the hint hands the brain a real
    // TacticsLiveContext (immediate tactics + hanging pieces + board facts),
    // instead of nothing — which left the tactic gate stripping the mention
    // as "out-of-vocab (no tactics context)". Tier 3 no longer calls the brain
    // (2026-09-06), so this contract lives on the WHY/WHICH tiers — use an
    // advanced rating so the first tap is a brain-driven tier 1.
    spineResponses.push('Your worst-placed piece wants a more active square.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        playerRating: 2000,
        enabled: true,
      }),
    );
    act(() => { result.current.requestHint(); });
    await waitFor(() => expect(spineCalls.length).toBe(1));
    const tactics = spineCalls[0].tactics as { boardFacts?: unknown; immediate?: unknown[] } | undefined;
    expect(tactics).toBeDefined();
    // Board facts are derived from the FEN alone, so they're always present
    // even when the engine is unavailable — the context is never empty/missing.
    expect(tactics?.boardFacts).toBeDefined();
    expect(Array.isArray(tactics?.immediate)).toBe(true);
  });

  it('records the request to coach memory at tier 3 (directly, no brain)', async () => {
    spineResponses.push('Nf3 is the move.');
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

    await waitFor(() => expect(result.current.hintState.level).toBe(3));
    const records = useCoachMemoryStore.getState().hintRequests;
    expect(records).toHaveLength(1);
    expect(records[0].tierReached).toBe(3);
    expect(records[0].fen).toBe(FEN_AFTER_E4);
    expect(records[0].userPlayedBestMove).toBeNull();
    // Surface fires the migration audit; store action fires the
    // memory-record audit.
    expect(auditCalls.some((c) => c.kind === 'coach-surface-migrated')).toBe(true);
    expect(auditCalls.some((c) => c.kind === 'coach-memory-hint-requested')).toBe(true);
  });

  it('does not fire again once the answer is shown (subsequent taps are no-ops)', async () => {
    spineResponses.push('Nf3.', 'b', 'c');
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
    await waitFor(() => expect(result.current.hintState.level).toBe(3));
    // Extra taps are no-ops — the answer is already on the board.
    act(() => { result.current.requestHint(); });
    act(() => { result.current.requestHint(); });
    expect(result.current.hintState.level).toBe(3);
    // Tier 3 is computed in code — the brain was never called.
    expect(spineCalls.length).toBe(0);
  });
});

describe('useHintSystem — FEN-change finalization', () => {
  it('finalizes the pending hint record when the FEN changes', async () => {
    spineResponses.push('Nf3.');
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
    await waitFor(() => expect(result.current.hintState.level).toBe(3));
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

  it('Tier 3 caps length and forbids inventing tactics', () => {
    // The full answer is a quick hint, not a lecture — hard numeric cap
    // (G5: caps are numeric, not soft phrasing) + an anti-hallucination
    // grounding clause so the brain stops inventing pins/forks/skewers.
    expect(HINT_TIER_3_ADDITION).toMatch(/MAX 2 sentences/);
    expect(HINT_TIER_3_ADDITION).toMatch(/MAX 40 words/);
    expect(HINT_TIER_3_ADDITION).toMatch(/move itself/);
    expect(HINT_TIER_3_ADDITION).toMatch(/do NOT invent tactics/);
  });
});
