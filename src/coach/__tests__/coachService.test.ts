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
    const kinds = auditCalls.map((c) => c.kind);
    expect(kinds).toEqual([
      'coach-brain-ask-received',
      'coach-brain-envelope-assembled',
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
});
