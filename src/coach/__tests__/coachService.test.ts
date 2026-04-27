/**
 * coachService tests (WO-BRAIN-01).
 *
 * The provider is mocked; these tests verify:
 *   - the spine assembles a six-part envelope
 *   - it dispatches tool calls the provider returned
 *   - it audit-logs the lifecycle (5 expected entries)
 *   - it short-circuits unknown tool names cleanly
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auditCalls: { kind: string; summary: string }[] = [];
vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn((entry: { kind: string; summary: string }) => {
    auditCalls.push({ kind: entry.kind, summary: entry.summary });
    return Promise.resolve();
  }),
}));

import { coachService } from '../coachService';
import {
  __resetCoachMemoryStoreForTests,
  useCoachMemoryStore,
} from '../../stores/coachMemoryStore';
import type { Provider, ProviderResponse } from '../types';

beforeEach(() => {
  auditCalls.length = 0;
  __resetCoachMemoryStoreForTests();
});

function mockProvider(response: ProviderResponse): Provider {
  return {
    name: 'deepseek',
    call: vi.fn(async () => response),
  };
}

describe('coachService.ask', () => {
  it('returns text + provider when no tool calls fired', async () => {
    const answer = await coachService.ask(
      { surface: 'ping', ask: 'say hello', liveState: { surface: 'ping' } },
      {
        providerOverride: mockProvider({
          text: 'Hello.',
          toolCalls: [],
        }),
      },
    );
    expect(answer.text).toBe('Hello.');
    expect(answer.provider).toBe('deepseek');
    expect(answer.toolCallIds).toHaveLength(0);
  });

  it('emits the five-stage audit lifecycle', async () => {
    await coachService.ask(
      { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
      { providerOverride: mockProvider({ text: 'A.', toolCalls: [] }) },
    );
    // WO-FOUNDATION-02 trace harness mixes trace-* audits between the
    // five lifecycle stages. Filter to coach-brain-* only so the
    // lifecycle assertion stays focused on canonical pipeline stages.
    const kinds = auditCalls
      .map((c) => c.kind)
      .filter((k) => k.startsWith('coach-brain-'));
    expect(kinds).toEqual([
      'coach-brain-ask-received',
      'coach-brain-envelope-assembled',
      'coach-brain-tool-parse-result',
      'coach-brain-provider-called',
      'coach-brain-answer-returned',
    ]);
  });

  it('dispatches set_intended_opening when the provider returns the tool call', async () => {
    const provider = mockProvider({
      text: 'Sure, locking in the Caro-Kann.',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'set_intended_opening',
          args: { name: 'Caro-Kann Defense', color: 'black' },
        },
      ],
    });
    const answer = await coachService.ask(
      { surface: 'ping', ask: 'play caro-kann', liveState: { surface: 'ping' } },
      { providerOverride: provider },
    );
    expect(answer.toolCallIds).toContain('tc-1');
    const stored = useCoachMemoryStore.getState().intendedOpening;
    expect(stored?.name).toBe('Caro-Kann Defense');
    expect(stored?.color).toBe('black');
    const toolAudits = auditCalls.filter((c) => c.kind === 'coach-brain-tool-called');
    expect(toolAudits.length).toBeGreaterThan(0);
  });

  it('logs but does not throw on unknown tool names', async () => {
    const provider = mockProvider({
      text: 'mystery',
      toolCalls: [{ id: 'tc-1', name: 'not_a_real_tool', args: {} }],
    });
    const answer = await coachService.ask(
      { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
      { providerOverride: provider },
    );
    expect(answer.toolCallIds).toHaveLength(0);
    expect(
      auditCalls.some(
        (c) => c.kind === 'coach-brain-tool-called' && /unknown/i.test(c.summary),
      ),
    ).toBe(true);
  });

  it('throws if surface is missing on liveState (envelope guard)', async () => {
    const provider = mockProvider({ text: 'x', toolCalls: [] });
    await expect(
      coachService.ask(
        { surface: 'ping', ask: 'q', liveState: { surface: '' as unknown as 'ping' } },
        { providerOverride: provider },
      ),
    ).rejects.toThrow(/surface is required/);
  });

  // WO-MANDATORY-GROUNDING — the question classifier flags tactical /
  // opening questions and the spine pre-fetches grounding data so the
  // LLM physically receives engine + opening output alongside the
  // question. These tests verify the classifier + fetcher integration
  // attaches `envelope.groundingContext` before the provider sees the
  // envelope.

  const STARTING_FEN =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('forces stockfish_eval grounding when ask=is Qxg5 good? and FEN is provided', async () => {
    let receivedEnvelope:
      | { groundingContext?: string }
      | undefined;
    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async (env: { groundingContext?: string }) => {
        receivedEnvelope = env;
        return { text: 'looking', toolCalls: [] };
      }),
    };
    const stockfishStub = vi.fn(async () =>
      JSON.stringify({ bestMove: 'h7h5', evaluation: -240, depth: 12 }),
    );
    const lichessStub = vi.fn(async () => null);
    await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'is Qxg5 good?',
        liveState: { surface: 'game-chat', fen: STARTING_FEN },
      },
      {
        providerOverride: provider,
        groundingFetcher: {
          stockfishEval: stockfishStub,
          lichessOpeningLookup: lichessStub,
        },
      },
    );
    expect(stockfishStub).toHaveBeenCalledWith(STARTING_FEN);
    expect(receivedEnvelope?.groundingContext).toBeDefined();
    expect(receivedEnvelope?.groundingContext).toContain('Engine analysis:');
    expect(receivedEnvelope?.groundingContext).toContain('h7h5');
    // Lichess wasn't requested — formatter still emits the line but
    // marks it unavailable (since the classifier didn't trigger it,
    // we passed null through).
    expect(receivedEnvelope?.groundingContext).toContain('Opening database:');
    // grounding-forced audit fired
    expect(
      auditCalls.some((c) => c.kind === 'grounding-forced'),
    ).toBe(true);
  });

  it('forces lichess grounding when ask=what opening is this? and FEN is provided', async () => {
    let receivedEnvelope:
      | { groundingContext?: string }
      | undefined;
    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async (env: { groundingContext?: string }) => {
        receivedEnvelope = env;
        return { text: 'looking', toolCalls: [] };
      }),
    };
    const stockfishStub = vi.fn(async () => null);
    const lichessStub = vi.fn(async () =>
      JSON.stringify({ opening: { eco: 'C25', name: 'Vienna Game' }, moves: [] }),
    );
    await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'what opening is this?',
        liveState: { surface: 'game-chat', fen: STARTING_FEN },
      },
      {
        providerOverride: provider,
        groundingFetcher: {
          stockfishEval: stockfishStub,
          lichessOpeningLookup: lichessStub,
        },
      },
    );
    expect(lichessStub).toHaveBeenCalledWith(STARTING_FEN);
    expect(receivedEnvelope?.groundingContext).toBeDefined();
    expect(receivedEnvelope?.groundingContext).toContain('Vienna Game');
  });

  it('skips grounding when classifier matches but FEN is absent', async () => {
    let receivedEnvelope:
      | { groundingContext?: string }
      | undefined;
    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async (env: { groundingContext?: string }) => {
        receivedEnvelope = env;
        return { text: 'no fen', toolCalls: [] };
      }),
    };
    const stockfishStub = vi.fn(async () => 'should-not-be-called');
    const lichessStub = vi.fn(async () => 'should-not-be-called');
    await coachService.ask(
      {
        surface: 'ping',
        ask: 'is this winning?',
        liveState: { surface: 'ping' }, // no FEN
      },
      {
        providerOverride: provider,
        groundingFetcher: {
          stockfishEval: stockfishStub,
          lichessOpeningLookup: lichessStub,
        },
      },
    );
    expect(stockfishStub).not.toHaveBeenCalled();
    expect(lichessStub).not.toHaveBeenCalled();
    expect(receivedEnvelope?.groundingContext).toBeUndefined();
    // Audit still fires with skipped=no-fen so we can track misses.
    expect(
      auditCalls.some(
        (c) => c.kind === 'grounding-forced' && /fen=none/.test(c.summary),
      ),
    ).toBe(true);
  });

  it('skips grounding when the classifier finds nothing tactical or opening-related', async () => {
    let receivedEnvelope:
      | { groundingContext?: string }
      | undefined;
    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async (env: { groundingContext?: string }) => {
        receivedEnvelope = env;
        return { text: 'hi', toolCalls: [] };
      }),
    };
    const stockfishStub = vi.fn(async () => 'should-not-be-called');
    const lichessStub = vi.fn(async () => 'should-not-be-called');
    await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'hello, how are you?',
        liveState: { surface: 'game-chat', fen: STARTING_FEN },
      },
      {
        providerOverride: provider,
        groundingFetcher: {
          stockfishEval: stockfishStub,
          lichessOpeningLookup: lichessStub,
        },
      },
    );
    expect(stockfishStub).not.toHaveBeenCalled();
    expect(lichessStub).not.toHaveBeenCalled();
    expect(receivedEnvelope?.groundingContext).toBeUndefined();
    // No grounding-forced audit at all when nothing matched.
    expect(
      auditCalls.some((c) => c.kind === 'grounding-forced'),
    ).toBe(false);
  });

  it('emits "unavailable" markers when the fetcher returns null (Stockfish crash, Lichess 401)', async () => {
    let receivedEnvelope:
      | { groundingContext?: string }
      | undefined;
    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async (env: { groundingContext?: string }) => {
        receivedEnvelope = env;
        return { text: 'partial', toolCalls: [] };
      }),
    };
    const stockfishStub = vi.fn(async () => null);
    const lichessStub = vi.fn(async () =>
      JSON.stringify({ opening: { eco: 'C25', name: 'Vienna Game' }, moves: [] }),
    );
    await coachService.ask(
      {
        surface: 'game-chat',
        ask: "what's the best move in the Vienna?",
        liveState: { surface: 'game-chat', fen: STARTING_FEN },
      },
      {
        providerOverride: provider,
        groundingFetcher: {
          stockfishEval: stockfishStub,
          lichessOpeningLookup: lichessStub,
        },
      },
    );
    expect(receivedEnvelope?.groundingContext).toContain('Engine analysis: unavailable');
    expect(receivedEnvelope?.groundingContext).toContain('Vienna Game');
  });
});
