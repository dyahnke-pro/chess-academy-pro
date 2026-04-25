/**
 * Envelope assembly + formatter tests (WO-BRAIN-01).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import {
  assembleEnvelope,
  formatEnvelopeAsSystemPrompt,
  formatEnvelopeAsUserMessage,
} from '../envelope';
import { __resetCoachMemoryStoreForTests, useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { getToolDefinitions } from '../tools/registry';

beforeEach(() => {
  __resetCoachMemoryStoreForTests();
});

describe('assembleEnvelope', () => {
  it('produces all six parts with non-empty values', () => {
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: {
        surface: 'ping',
        ask: 'hello',
        liveState: { surface: 'ping' },
      },
    });
    expect(env.identity).toBeTruthy();
    expect(env.memory).toBeTruthy();
    expect(env.appMap.length).toBeGreaterThan(5);
    expect(env.liveState.surface).toBe('ping');
    expect(env.toolbelt.length).toBe(14);
    expect(env.ask).toBe('hello');
  });

  it('throws when ask is empty', () => {
    expect(() =>
      assembleEnvelope({
        toolbelt: getToolDefinitions(),
        input: { surface: 'ping', ask: '   ', liveState: { surface: 'ping' } },
      }),
    ).toThrow(/ask missing/);
  });

  it('throws when toolbelt is empty', () => {
    expect(() =>
      assembleEnvelope({
        toolbelt: [],
        input: { surface: 'ping', ask: 'hello', liveState: { surface: 'ping' } },
      }),
    ).toThrow(/toolbelt missing/);
  });

  it('reads intendedOpening from the live store', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
    });
    expect(env.memory.intendedOpening?.name).toBe('Caro-Kann Defense');
  });
});

describe('formatEnvelopeAsSystemPrompt', () => {
  it('includes identity, app map, and toolbelt sections', () => {
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: { surface: 'ping', ask: 'q', liveState: { surface: 'ping' } },
    });
    const prompt = formatEnvelopeAsSystemPrompt(env);
    expect(prompt).toMatch(/Danya/);
    expect(prompt).toMatch(/\[App map\]/);
    expect(prompt).toMatch(/\[Toolbelt\]/);
    expect(prompt).toMatch(/stockfish_eval/);
    expect(prompt).toMatch(/set_intended_opening/);
  });
});

describe('formatEnvelopeAsUserMessage', () => {
  it('includes memory, live state, and ask sections', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Sicilian Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: {
        surface: 'ping',
        ask: 'What opening do I have set?',
        liveState: { surface: 'ping', currentRoute: '/coach/play' },
      },
    });
    const msg = formatEnvelopeAsUserMessage(env);
    expect(msg).toMatch(/\[Coach memory\]/);
    expect(msg).toMatch(/Sicilian Defense/);
    expect(msg).toMatch(/\[Live state\]/);
    expect(msg).toMatch(/Surface: ping/);
    expect(msg).toMatch(/Current route: \/coach\/play/);
    expect(msg).toMatch(/\[Ask\]/);
    expect(msg).toMatch(/What opening do I have set\?/);
  });

  it('includes recent conversation history when present (BRAIN-04 punt #3)', () => {
    // Append a back-and-forth from a chat surface — both user and
    // coach roles should land in the envelope's memory block.
    const store = useCoachMemoryStore.getState();
    store.appendConversationMessage({
      surface: 'chat-in-game',
      role: 'user',
      text: "Why did you play Bxh6?",
      trigger: null,
    });
    store.appendConversationMessage({
      surface: 'chat-in-game',
      role: 'coach',
      text: "It opens the king position and trades a bishop for the defender.",
      trigger: null,
    });
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: {
        surface: 'game-chat',
        ask: 'What was the followup plan?',
        liveState: { surface: 'game-chat' },
      },
    });
    const msg = formatEnvelopeAsUserMessage(env);
    expect(msg).toMatch(/Recent conversation/);
    expect(msg).toMatch(/chat-in-game\/user/);
    expect(msg).toMatch(/Why did you play Bxh6\?/);
    expect(msg).toMatch(/chat-in-game\/coach/);
    expect(msg).toMatch(/opens the king position/);
  });
});
