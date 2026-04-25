/**
 * Coach Brain spine — streaming round-trip (WO-BRAIN-02). Verifies
 * `coachService.ask` routes to the provider's `callStreaming` method
 * when an `onChunk` callback is supplied, and that chunks arrive
 * before the final answer resolves.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { coachService } from '../coachService';
import {
  __resetCoachMemoryStoreForTests,
  useCoachMemoryStore,
} from '../../stores/coachMemoryStore';
import type { Provider, ProviderResponse } from '../types';

beforeEach(() => {
  __resetCoachMemoryStoreForTests();
});

describe('coachService.ask — streaming', () => {
  it('routes through provider.callStreaming when onChunk is provided', async () => {
    const callSpy = vi.fn();
    const callStreamingSpy = vi.fn(
      async (_envelope, onChunk: (chunk: string) => void): Promise<ProviderResponse> => {
        // Simulate token-by-token streaming.
        onChunk('Hey ');
        onChunk('Dave ');
        onChunk('— ready to play.');
        return { text: 'Hey Dave — ready to play.', toolCalls: [], raw: {} };
      },
    );
    const mockProvider: Provider = {
      name: 'deepseek',
      call: callSpy,
      callStreaming: callStreamingSpy,
    };
    const chunks: string[] = [];
    const answer = await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'Say hello.',
        liveState: { surface: 'game-chat', currentRoute: '/coach/play' },
      },
      {
        providerOverride: mockProvider,
        onChunk: (c) => chunks.push(c),
      },
    );
    expect(callStreamingSpy).toHaveBeenCalledTimes(1);
    expect(callSpy).not.toHaveBeenCalled();
    expect(chunks).toEqual(['Hey ', 'Dave ', '— ready to play.']);
    expect(answer.text).toBe('Hey Dave — ready to play.');
  });

  it('falls back to provider.call when onChunk is not provided', async () => {
    const callSpy = vi.fn(
      async (): Promise<ProviderResponse> => ({
        text: 'non-streaming answer',
        toolCalls: [],
        raw: {},
      }),
    );
    const callStreamingSpy = vi.fn();
    const mockProvider: Provider = {
      name: 'deepseek',
      call: callSpy,
      callStreaming: callStreamingSpy,
    };
    const answer = await coachService.ask(
      {
        surface: 'ping',
        ask: 'Hello.',
        liveState: { surface: 'ping' },
      },
      { providerOverride: mockProvider },
    );
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(callStreamingSpy).not.toHaveBeenCalled();
    expect(answer.text).toBe('non-streaming answer');
  });

  it('falls back to provider.call when provider does NOT implement callStreaming', async () => {
    const callSpy = vi.fn(
      async (): Promise<ProviderResponse> => ({
        text: 'no streaming support',
        toolCalls: [],
        raw: {},
      }),
    );
    const mockProvider: Provider = {
      name: 'anthropic',
      call: callSpy,
      // callStreaming intentionally omitted.
    };
    const chunks: string[] = [];
    const answer = await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'hi',
        liveState: { surface: 'game-chat' },
      },
      {
        providerOverride: mockProvider,
        onChunk: (c) => chunks.push(c),
      },
    );
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual([]);
    expect(answer.text).toBe('no streaming support');
  });

  it('forwards memory snapshot into the streaming provider envelope', async () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'streaming-test',
    });
    let capturedEnvelope: { memory?: { intendedOpening?: { name: string } | null } } | null = null;
    const mockProvider: Provider = {
      name: 'deepseek',
      async call(env) {
        capturedEnvelope = env as unknown as typeof capturedEnvelope;
        return { text: '', toolCalls: [], raw: {} };
      },
      async callStreaming(env, onChunk) {
        capturedEnvelope = env as unknown as typeof capturedEnvelope;
        onChunk('streaming-with-memory');
        return {
          text: 'streaming-with-memory',
          toolCalls: [],
          raw: {},
        };
      },
    };
    await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'What opening am I committed to?',
        liveState: { surface: 'game-chat' },
      },
      {
        providerOverride: mockProvider,
        onChunk: () => undefined,
      },
    );
    expect(capturedEnvelope?.memory?.intendedOpening?.name).toBe('Caro-Kann Defense');
  });
});
