/**
 * Ping integration test (WO-BRAIN-01).
 *
 * Drives the spine end-to-end against a mocked provider so the real
 * DeepSeek key isn't needed in CI. Manual smoke test against the live
 * provider is documented in the PR description for Dave to run after
 * deploy:
 *
 *   await coachService.ask({
 *     surface: 'ping',
 *     ask: 'Say hello and tell me what opening I have set as intended.',
 *     liveState: { surface: 'ping' },
 *   })
 *
 * In CI we verify the assembled envelope, the lifecycle audits, and
 * that the answer reaches the caller without throwing.
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
import {
  formatEnvelopeAsSystemPrompt,
  formatEnvelopeAsUserMessage,
  assembleEnvelope,
} from '../envelope';
import { getToolDefinitions } from '../tools/registry';
import type { AssembledEnvelope, Provider } from '../types';

beforeEach(() => {
  auditCalls.length = 0;
  __resetCoachMemoryStoreForTests();
});

describe('ping: spine assembles envelope, calls provider, returns answer', () => {
  it('assembles a complete envelope, dispatches the call, returns the text', async () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'integration-test',
    });

    const seenSystemPrompt: string[] = [];
    const seenUserMessage: string[] = [];

    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async (envelope: AssembledEnvelope) => {
        seenSystemPrompt.push(formatEnvelopeAsSystemPrompt(envelope));
        seenUserMessage.push(formatEnvelopeAsUserMessage(envelope));
        return {
          text: "Hello — your intended opening is the Caro-Kann Defense, playing as Black.",
          toolCalls: [],
        };
      }),
    };

    const answer = await coachService.ask(
      {
        surface: 'ping',
        ask: 'Say hello and tell me what opening I have set as intended.',
        liveState: { surface: 'ping' },
      },
      { providerOverride: provider },
    );

    expect(answer.text).toMatch(/Caro-Kann/);
    expect(answer.provider).toBe('deepseek');

    // The four lifecycle entries fired (tool-called only fires when a
    // tool actually runs; this scenario is a tool-free response).
    const brainKinds = auditCalls.map((c) => c.kind).filter((k) => k.startsWith('coach-brain-'));
    expect(brainKinds).toEqual([
      'coach-brain-ask-received',
      'coach-brain-envelope-assembled',
      'coach-brain-provider-called',
      'coach-brain-answer-returned',
    ]);

    // The system prompt the provider saw includes identity + app map + toolbelt.
    expect(seenSystemPrompt[0]).toMatch(/Danya/);
    expect(seenSystemPrompt[0]).toMatch(/\[App map\]/);
    expect(seenSystemPrompt[0]).toMatch(/\[Toolbelt\]/);

    // The user message the provider saw includes memory + live state + ask.
    expect(seenUserMessage[0]).toMatch(/\[Coach memory\]/);
    expect(seenUserMessage[0]).toMatch(/Caro-Kann Defense/);
    expect(seenUserMessage[0]).toMatch(/Surface: ping/);
    expect(seenUserMessage[0]).toMatch(/\[Ask\]/);
  });

  it('reports null intended opening cleanly when none is set', async () => {
    const provider: Provider = {
      name: 'deepseek',
      call: vi.fn(async () => ({
        text: 'No opening set.',
        toolCalls: [],
      })),
    };
    const answer = await coachService.ask(
      { surface: 'ping', ask: 'Anything set?', liveState: { surface: 'ping' } },
      { providerOverride: provider },
    );
    expect(answer.text).toBe('No opening set.');
    // Verify the envelope memory section reflects the null state.
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
    });
    const userMsg = formatEnvelopeAsUserMessage(env);
    expect(userMsg).toMatch(/Intended opening: \(none set\)/);
  });
});
