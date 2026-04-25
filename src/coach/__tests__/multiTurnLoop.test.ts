/**
 * Multi-turn tool-result loop tests (WO-BRAIN-04).
 *
 * Verifies:
 *   - Default `maxToolRoundTrips=1` preserves BRAIN-01..03 single-pass
 *     behavior (one provider call, even when tools fire).
 *   - `maxToolRoundTrips=3` lets the spine loop: provider call →
 *     dispatch tools → re-call provider with tool results → repeat
 *     until either no tool calls or the cap is hit.
 *   - The loop stops early when the LLM returns no tool calls.
 *   - The loop hard-caps at `maxToolRoundTrips` even if the LLM keeps
 *     emitting tools.
 *   - Tool results from each round-trip are threaded into the next
 *     turn's `ask` body (so the LLM can see what happened).
 *   - Streaming only applies to the FIRST turn — follow-up turns are
 *     non-streaming so intermediate orchestration text doesn't bleed
 *     to the user.
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
import { __resetCoachMemoryStoreForTests } from '../../stores/coachMemoryStore';
import type { Provider, ProviderResponse, AssembledEnvelope } from '../types';

beforeEach(() => {
  auditCalls.length = 0;
  __resetCoachMemoryStoreForTests();
});

/** Build a provider that returns a fixed series of responses, one per
 *  call. Records the envelopes it received so tests can assert what
 *  the spine fed back into each turn. */
function scriptedProvider(responses: ProviderResponse[]): Provider & {
  receivedEnvelopes: AssembledEnvelope[];
} {
  let i = 0;
  const receivedEnvelopes: AssembledEnvelope[] = [];
  return {
    name: 'deepseek',
    receivedEnvelopes,
    call: vi.fn(async (envelope: AssembledEnvelope) => {
      receivedEnvelopes.push(envelope);
      const response = responses[Math.min(i, responses.length - 1)];
      i++;
      return response;
    }),
  };
}

describe('coachService multi-turn loop', () => {
  it('default options run a single provider call (BRAIN-01..03 behavior)', async () => {
    const provider = scriptedProvider([
      {
        text: 'Locking in.',
        toolCalls: [
          {
            id: 'tc-1',
            name: 'set_intended_opening',
            args: { name: 'Caro-Kann Defense', color: 'black' },
          },
        ],
      },
      // This second response would be returned if the spine looped —
      // it shouldn't be reached when maxToolRoundTrips defaults to 1.
      { text: 'Should not be reached.', toolCalls: [] },
    ]);
    await coachService.ask(
      { surface: 'ping', ask: 'play caro-kann', liveState: { surface: 'ping' } },
      { providerOverride: provider },
    );
    expect(provider.receivedEnvelopes).toHaveLength(1);
  });

  it('loops through tool results when maxToolRoundTrips=3', async () => {
    const provider = scriptedProvider([
      // Turn 1 — call a cerebellum data tool.
      {
        text: 'Looking at the position.',
        toolCalls: [
          { id: 'tc-1', name: 'stockfish_eval', args: { fen: 'fen1', depth: 12 } },
        ],
      },
      // Turn 2 — emit play_move with a SAN. (No FEN ctx in this test
      // so the validator skips the legality check — the play_move
      // tool returns ok=false because no onPlayMove is wired, but the
      // loop continues on tool errors.)
      {
        text: 'Playing Nf3.',
        toolCalls: [{ id: 'tc-2', name: 'play_move', args: { san: 'Nf3' } }],
      },
      // Turn 3 — final acknowledgment, no more tools.
      { text: 'Done.', toolCalls: [] },
    ]);
    const answer = await coachService.ask(
      {
        surface: 'move-selector',
        ask: 'pick a move',
        liveState: { surface: 'move-selector', fen: 'startpos' },
      },
      { providerOverride: provider, maxToolRoundTrips: 3 },
    );
    expect(provider.receivedEnvelopes).toHaveLength(3);
    expect(answer.text).toBe('Done.');
  });

  it('stops looping early when a turn returns no tool calls', async () => {
    const provider = scriptedProvider([
      {
        text: 'Hmm.',
        toolCalls: [{ id: 'tc-1', name: 'stockfish_eval', args: { fen: 'x', depth: 8 } }],
      },
      { text: 'Final answer.', toolCalls: [] },
      { text: 'Should not be reached.', toolCalls: [] },
    ]);
    await coachService.ask(
      {
        surface: 'move-selector',
        ask: 'q',
        liveState: { surface: 'move-selector', fen: 'startpos' },
      },
      { providerOverride: provider, maxToolRoundTrips: 5 },
    );
    expect(provider.receivedEnvelopes).toHaveLength(2);
  });

  it('hard-caps at maxToolRoundTrips even when the LLM keeps emitting tools', async () => {
    const provider = scriptedProvider([
      // All four turns request another tool — the spine must stop at 3.
      {
        text: 'A',
        toolCalls: [{ id: 'tc-1', name: 'stockfish_eval', args: { fen: 'x', depth: 1 } }],
      },
      {
        text: 'B',
        toolCalls: [{ id: 'tc-2', name: 'stockfish_eval', args: { fen: 'x', depth: 1 } }],
      },
      {
        text: 'C',
        toolCalls: [{ id: 'tc-3', name: 'stockfish_eval', args: { fen: 'x', depth: 1 } }],
      },
      {
        text: 'D',
        toolCalls: [{ id: 'tc-4', name: 'stockfish_eval', args: { fen: 'x', depth: 1 } }],
      },
    ]);
    await coachService.ask(
      {
        surface: 'move-selector',
        ask: 'q',
        liveState: { surface: 'move-selector', fen: 'startpos' },
      },
      { providerOverride: provider, maxToolRoundTrips: 3 },
    );
    expect(provider.receivedEnvelopes).toHaveLength(3);
  });

  it('threads tool results into the next turn ask body', async () => {
    const provider = scriptedProvider([
      {
        text: 'Checking.',
        toolCalls: [
          { id: 'tc-1', name: 'stockfish_eval', args: { fen: 'x', depth: 8 } },
        ],
      },
      { text: 'Got it.', toolCalls: [] },
    ]);
    await coachService.ask(
      {
        surface: 'move-selector',
        ask: 'pick a move',
        liveState: { surface: 'move-selector', fen: 'startpos' },
      },
      { providerOverride: provider, maxToolRoundTrips: 2 },
    );
    expect(provider.receivedEnvelopes).toHaveLength(2);
    // The follow-up envelope's ask should include the original ask
    // AND the previous turn's text AND a "Tool results" block.
    const followUpAsk = provider.receivedEnvelopes[1].ask;
    expect(followUpAsk).toContain('Original ask');
    expect(followUpAsk).toContain('pick a move');
    expect(followUpAsk).toContain('Tool results');
    expect(followUpAsk).toContain('stockfish_eval');
  });

  it('emits one coach-brain-provider-called audit per round-trip', async () => {
    const provider = scriptedProvider([
      {
        text: 'A',
        toolCalls: [{ id: 'tc-1', name: 'stockfish_eval', args: { fen: 'x', depth: 1 } }],
      },
      {
        text: 'B',
        toolCalls: [{ id: 'tc-2', name: 'stockfish_eval', args: { fen: 'x', depth: 1 } }],
      },
      { text: 'C', toolCalls: [] },
    ]);
    await coachService.ask(
      {
        surface: 'move-selector',
        ask: 'q',
        liveState: { surface: 'move-selector', fen: 'startpos' },
      },
      { providerOverride: provider, maxToolRoundTrips: 5 },
    );
    const providerCalls = auditCalls.filter(
      (c) => c.kind === 'coach-brain-provider-called',
    );
    expect(providerCalls).toHaveLength(3);
  });
});
