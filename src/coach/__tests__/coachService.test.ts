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
import { _resetLichessCircuitBreaker } from '../../services/lichessExplorerService';
import type { Provider, ProviderResponse } from '../types';

beforeEach(() => {
  auditCalls.length = 0;
  __resetCoachMemoryStoreForTests();
});

function mockProvider(response: ProviderResponse): Provider {
  return {
    name: 'deepseek',
    call: vi.fn(() => Promise.resolve(response)),
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
    // Audit-driven (#20, #21): coach-brain-tool-called audit should
    // include a result preview so paste-back logs surface what the
    // tool actually did. set_intended_opening's preview is `<color>
    // <name>` on success.
    const setOpeningAudit = toolAudits.find((c) => c.summary.startsWith('set_intended_opening'));
    expect(setOpeningAudit?.summary).toContain('black Caro-Kann Defense');
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
        (c) => c.kind === 'coach-brain-tool-skipped' && /unknown/i.test(c.summary),
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

  // WO-COACH-GROUNDING (PR #338 part C): the spine default stays at 1 so
  // narrative-only callers (e.g. ping, short hint asks) keep their existing
  // single-trip behavior. Chat surfaces opt in to 3 explicitly via the
  // CoachServiceOptions.maxToolRoundTrips field.
  it('default round-trip budget is 1 — provider is called once when no tools fire', async () => {
    const call = vi.fn(() => Promise.resolve({ text: 'A.', toolCalls: [] }));
    const provider: Provider = { name: 'deepseek', call };
    await coachService.ask(
      { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
      { providerOverride: provider },
    );
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('default round-trip budget caps at 1 even when the first turn emits a tool call', async () => {
    // First (and only) turn emits a tool. With budget=1, the spine
    // dispatches the tool but does not loop back for a synthesis turn,
    // so the provider is only called once.
    const responses: ProviderResponse[] = [
      {
        text: 'looking up',
        toolCalls: [
          { id: 'tc-1', name: 'set_intended_opening', args: { name: 'Caro-Kann Defense', color: 'black' } },
        ],
      },
      // Sentinel — should never be reached at budget=1.
      { text: 'should not reach', toolCalls: [] },
    ];
    const call = vi.fn(() => Promise.resolve(responses.shift() ?? { text: '', toolCalls: [] }));
    const provider: Provider = { name: 'deepseek', call };
    await coachService.ask(
      { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
      { providerOverride: provider },
    );
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('honors maxToolRoundTrips=3 — loops back through the provider after tools resolve', async () => {
    const responses: ProviderResponse[] = [
      {
        text: 'turn 1: calling tool',
        toolCalls: [
          { id: 'tc-1', name: 'set_intended_opening', args: { name: 'Caro-Kann Defense', color: 'black' } },
        ],
      },
      {
        text: 'turn 2: calling another tool',
        toolCalls: [
          { id: 'tc-2', name: 'set_intended_opening', args: { name: 'Sicilian Defense', color: 'black' } },
        ],
      },
      // Final turn — no tools, just a narrative answer.
      { text: 'turn 3: final', toolCalls: [] },
    ];
    const call = vi.fn(() => Promise.resolve(responses.shift() ?? { text: '', toolCalls: [] }));
    const provider: Provider = { name: 'deepseek', call };
    const answer = await coachService.ask(
      { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
      { providerOverride: provider, maxToolRoundTrips: 3 },
    );
    expect(call).toHaveBeenCalledTimes(3);
    expect(answer.text).toContain('turn 3');
  });

  it('ON-THE-FLY ORCHESTRATION: dispatches lookup_player_opening_moves through the spine and loops the result back', async () => {
    _resetLichessCircuitBreaker();
    // Canned Lichess /player body (the streamed first line is a single JSON object).
    const playerBody = JSON.stringify({
      white: 60, draws: 8, black: 20,
      moves: [
        { uci: 'e2e4', san: 'e4', averageOpponentRating: 2950, white: 40, draws: 5, black: 12 },
        { uci: 'd2d4', san: 'd4', averageOpponentRating: 2900, white: 14, draws: 2, black: 5 },
      ],
      opening: { eco: 'B00', name: "King's Pawn Game" },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(playerBody, { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    // Turn 1: the brain calls the on-the-fly tool (player name "Carlsen").
    // Turn 2: after the tool result loops back, it finalizes.
    const responses: ProviderResponse[] = [
      {
        text: 'Let me pull how he plays this.',
        toolCalls: [
          {
            id: 'tc-pl',
            name: 'lookup_player_opening_moves',
            args: { player: 'Carlsen', color: 'white', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
          },
        ],
      },
      { text: 'He opens with e4 most often here.', toolCalls: [] },
    ];
    const call = vi.fn(() => Promise.resolve(responses.shift() ?? { text: '', toolCalls: [] }));
    const provider: Provider = { name: 'deepseek', call };

    const answer = await coachService.ask(
      { surface: 'teach', ask: 'teach me how Carlsen plays this position', liveState: { surface: 'teach' } },
      { providerOverride: provider, maxToolRoundTrips: 2 },
    );

    // The tool dispatched through the real spine.
    expect(answer.toolCallIds).toContain('tc-pl');
    // The round-trip loop fed the tool result back → provider called a second time → finalized.
    expect(call).toHaveBeenCalledTimes(2);
    expect(answer.text).toContain('e4');
    const toolAudit = auditCalls.find((c) => c.summary.includes('lookup_player_opening_moves'));
    expect(toolAudit).toBeTruthy();
    fetchSpy.mockRestore();
  });

  it('#4: folds player-game SANs into grounding.gameSans so the master-play validator accepts them', async () => {
    const call = vi.fn(() => Promise.resolve({ text: 'ok', toolCalls: [] }));
    await coachService.ask(
      {
        surface: 'teach',
        ask: 'teach me the Caro',
        liveState: {
          surface: 'teach',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          // A pre-loaded player-games block (the breadth layer).
          playerGames: {
            playerId: 'naroditsky', openingId: 'caro-kann', openingName: 'Caro-Kann Defense', totalAvailable: 1,
            games: [{ id: 'g1', player: 'Daniel Naroditsky', studentSide: 'black', opponent: 'X', opponentRating: 2700, result: '0-1', date: null, source: 'chess.com', variationLabel: 'Advance', plyCount: 6, pgnPrefix: 'e4 c6 d4 d5 e5 Bf5' }],
          } as never,
        },
      },
      { providerOverride: { name: 'deepseek', call }, maxToolRoundTrips: 1 },
    );
    const grounding = (call.mock.calls[0]?.[1] as { grounding?: { gameSans?: string[] } })?.grounding;
    expect(grounding?.gameSans).toBeTruthy();
    // The player's real-game moves are now grounded for the claim validator.
    expect(grounding!.gameSans).toEqual(expect.arrayContaining(['Bf5', 'e5', 'c6']));
  });

  it('G3 BACKSTOP: replaces a response that cites a player % when the player lookup returned no data', async () => {
    _resetLichessCircuitBreaker();
    // The player tool will FAIL (no data) — its execute returns ok:true with
    // empty moves + unavailable note (the tool-shape fix), so the spine sees
    // "attempted, no data grounded".
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Explorer API error: 502'));
    const responses: ProviderResponse[] = [
      {
        text: 'pulling his games',
        toolCalls: [
          { id: 'tc-pl', name: 'lookup_player_opening_moves', args: { player: 'Carlsen', color: 'white', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' } },
        ],
      },
      // The brain fabricates anyway (the ~20% case the prompt can't stop):
      { text: '[VOICE: Carlsen plays e4 about 55% of his games, d4 around 30%.] He is mainly a 1.e4 player.', toolCalls: [] },
    ];
    const call = vi.fn(() => Promise.resolve(responses.shift() ?? { text: '', toolCalls: [] }));
    const answer = await coachService.ask(
      { surface: 'teach', ask: "Carlsen's first-move stats from his real games?", liveState: { surface: 'teach' } },
      { providerOverride: { name: 'deepseek', call }, maxToolRoundTrips: 2 },
    );
    // The fabricated "55%" / "30%" must NOT ship — replaced by the refusal.
    expect(answer.text).not.toMatch(/\d+\s*%/);
    expect(answer.text.toLowerCase()).toMatch(/can'?t pull|not going to guess|unavailable/);
    const trip = auditCalls.find((c) => c.summary.includes('ungrounded player-stat') || c.summary.includes('replaced ungrounded'));
    expect(trip).toBeTruthy();
    vi.restoreAllMocks();
  });

  it('does NOT replace a player % when the lookup DID return data (grounded)', async () => {
    _resetLichessCircuitBreaker();
    const body = JSON.stringify({ white: 60, draws: 8, black: 20, moves: [{ uci: 'e2e4', san: 'e4', averageOpponentRating: 2950, white: 40, draws: 5, black: 12 }], opening: { eco: 'B00', name: "King's Pawn" } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const responses: ProviderResponse[] = [
      { text: 'pulling', toolCalls: [{ id: 'tc-pl', name: 'lookup_player_opening_moves', args: { player: 'Carlsen', color: 'white', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' } }] },
      { text: 'He plays e4 in 72% of these games.', toolCalls: [] },
    ];
    const call = vi.fn(() => Promise.resolve(responses.shift() ?? { text: '', toolCalls: [] }));
    const answer = await coachService.ask(
      { surface: 'teach', ask: 'his e4 rate?', liveState: { surface: 'teach' } },
      { providerOverride: { name: 'deepseek', call }, maxToolRoundTrips: 2 },
    );
    // Grounded → the percentage is allowed through.
    expect(answer.text).toMatch(/72\s*%/);
    vi.restoreAllMocks();
  });
});
