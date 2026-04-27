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
    // 17 base tools + 2 added by WO-COACH-ARROWS (draw_arrows,
    // clear_arrows). Bump if a future WO adds more.
    expect(env.toolbelt.length).toBe(19);
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
    // WO-COACH-OPERATOR-FOUNDATION-01: identity rewritten to
    // operator-mode body; no longer "Danya"-prefixed.
    expect(prompt).toMatch(/OPERATOR MODE/);
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

  it('renders recent hint requests as a compact summary (BRAIN-05b)', () => {
    // Three hint events at plies 12, 14, 16 with tiers 1 / 2 / 3.
    // Envelope should render: "Recent hint requests: 3 in the last
    // 10 plies (T1, T1→T2, T1→T2→T3)" — the per-record verbose
    // format from BRAIN-01..04 is replaced by this single summary
    // line so the envelope stays compact even when the user taps a
    // lot of hints.
    const store = useCoachMemoryStore.getState();
    store.recordHintRequest({
      gameId: 'g1', moveNumber: 6, ply: 12,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      bestMoveUci: 'e2e4', bestMoveSan: 'e4', tier: 1,
    });
    store.recordHintRequest({
      gameId: 'g1', moveNumber: 7, ply: 14,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      bestMoveUci: 'e7e5', bestMoveSan: 'e5', tier: 2,
    });
    store.recordHintRequest({
      gameId: 'g1', moveNumber: 8, ply: 16,
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      bestMoveUci: 'g1f3', bestMoveSan: 'Nf3', tier: 3,
    });
    const env = assembleEnvelope({
      toolbelt: getToolDefinitions(),
      input: { surface: 'hint', ask: 'tier 1 hint please', liveState: { surface: 'hint' } },
    });
    const msg = formatEnvelopeAsUserMessage(env);
    expect(msg).toMatch(
      /Recent hint requests: 3 in the last 10 plies \(T1, T1→T2, T1→T2→T3\)/,
    );
    // Per-record verbose format from BRAIN-01..04 is gone — should
    // not see "ply 12 tier=1" anywhere in the envelope.
    expect(msg).not.toMatch(/ply 12 tier=/);
  });
});
