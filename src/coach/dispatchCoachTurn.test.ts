import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the two halves the wrapper composes.
const routeChatIntent = vi.fn();
const ask = vi.fn();

vi.mock('../services/coachSessionRouter', () => ({
  routeChatIntent: (...args: unknown[]) => routeChatIntent(...args),
}));
vi.mock('./coachService', () => ({
  coachService: { ask: (...args: unknown[]) => ask(...args) },
}));
// The shadow read's default reader is the coachApi chokepoint; these tests
// inject their own (setChatTurnReaderForTests), so the real one never runs.
vi.mock('../services/coachApi', () => ({
  readChatTurnStructured: vi.fn(async () => null),
}));

import { dispatchCoachTurn, setChatTurnReaderForTests, setServeParsedRoute, resetConversations, conversationFor } from './dispatchCoachTurn';
import { onChatTurn, resetChatTurnListeners, type ChatTurnRow } from './chatTurnEvents';

const INPUT = { surface: 'standalone-chat' as const, ask: 'x', liveState: { surface: 'standalone-chat' as const, fen: 'startpos' } };

describe('dispatchCoachTurn', () => {
  beforeEach(() => {
    routeChatIntent.mockReset();
    ask.mockReset();
  });

  it('returns the router ack + navigates when the action router matches a NAV intent', async () => {
    routeChatIntent.mockResolvedValue({ ackMessage: 'Taking you to Tactics.', path: '/tactics', intent: { kind: 'qa', raw: 'x' } });
    const onNavigate = vi.fn();
    const ans = await dispatchCoachTurn(INPUT, { onNavigate });
    expect(ans.text).toBe('Taking you to Tactics.');
    expect(onNavigate).toHaveBeenCalledWith('/tactics');
    expect(ans.dispatchedToolNames).toContain('navigate_to_route');
    expect(ask).not.toHaveBeenCalled(); // no LLM call on a matched action
  });

  it('returns the ack with NO navigation for a reply-only action (settings)', async () => {
    routeChatIntent.mockResolvedValue({ ackMessage: 'Voice narration is on now.', intent: { kind: 'qa', raw: 'x' } });
    const onNavigate = vi.fn();
    const ans = await dispatchCoachTurn(INPUT, { onNavigate });
    expect(ans.text).toBe('Voice narration is on now.');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });

  it('falls through to coachService.ask when no action matches', async () => {
    routeChatIntent.mockResolvedValue(null);
    ask.mockResolvedValue({ text: 'brain answer', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek' });
    const ans = await dispatchCoachTurn(INPUT, {});
    expect(ans.text).toBe('brain answer');
    expect(ask).toHaveBeenCalledOnce();
  });

  it('skips the action router when skipActionRouter is set', async () => {
    ask.mockResolvedValue({ text: 'brain', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek' });
    await dispatchCoachTurn(INPUT, { skipActionRouter: true });
    expect(routeChatIntent).not.toHaveBeenCalled();
    expect(ask).toHaveBeenCalledOnce();
  });

  it('falls through to the brain if the router throws (never breaks a turn)', async () => {
    routeChatIntent.mockRejectedValue(new Error('boom'));
    ask.mockResolvedValue({ text: 'brain', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek' });
    const ans = await dispatchCoachTurn(INPUT, {});
    expect(ans.text).toBe('brain');
    expect(ask).toHaveBeenCalledOnce();
  });
});

// ─── THE ONE-CHAT READ, IN SHADOW (P0a 2026-10-04) ─────────────────────────

const BOARD_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
const TURN = (ask: string, extra: Partial<{ origin: 'typed' | 'spoken' | 'canned-best-move'; surface: 'game-chat' | 'hint' }> = {}) => ({
  surface: extra.surface ?? ('game-chat' as const),
  ask,
  ...(extra.origin ? { origin: extra.origin } : {}),
  liveState: { surface: extra.surface ?? ('game-chat' as const), fen: BOARD_FEN, studentColor: 'white' as const },
});
const rows: ChatTurnRow[] = [];
const waitForRow = async (n = 1): Promise<void> => {
  for (let i = 0; i < 50 && rows.length < n; i++) await new Promise((r) => setTimeout(r, 5));
};

describe('dispatchCoachTurn — the shadow read', () => {
  beforeEach(() => {
    routeChatIntent.mockReset();
    ask.mockReset();
    rows.length = 0;
    resetChatTurnListeners();
    onChatTurn((r) => rows.push(r));
    resetConversations();
    setServeParsedRoute(false);
    routeChatIntent.mockResolvedValue(null);
    ask.mockResolvedValue({ text: 'brain', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek', servedIntent: 'best-move' });
  });

  it('a typed question emits ONE chat-turn row comparing the reading with today\'s lane and the served intent', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'best-move', referents: [], seat: 'me', english: "what's my best move?" }));
    const ans = await dispatchCoachTurn(TURN("what's my best move?"), {});
    expect(ans.text).toBe('brain');
    await waitForRow();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      surface: 'game-chat', askSource: 'typed', fastPathLane: 'best-move', servedIntent: 'best-move',
      parsedKind: 'best-move', parseSource: 'llm', valid: true, agreed: true, answererLive: true, servedParsed: false,
    });
  });

  it('a mic transcript is read too, and tagged spoken', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'position-assessment', referents: [], seat: 'me', english: "who's winning?" }));
    await dispatchCoachTurn(TURN("who's winning", { origin: 'spoken' }), {});
    await waitForRow();
    expect(rows[0].askSource).toBe('spoken');
  });

  it('a disagreement is recorded as such (today\'s routing still answers)', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'compare-my-move', referents: [], seat: 'me', english: 'x' }));
    const ans = await dispatchCoachTurn(TURN("what's my best move?"), {});
    expect(ans.text).toBe('brain');
    await waitForRow();
    expect(rows[0].agreed).toBe(false);
  });

  it('NEVER waits on the read — a reader that hangs does not delay the answer', async () => {
    setChatTurnReaderForTests(() => new Promise(() => { /* never */ }));
    const started = Date.now();
    const ans = await dispatchCoachTurn(TURN('how should I continue here then'), {});
    expect(ans.text).toBe('brain');
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('a reader that throws is silent — the answer is served and no error escapes', async () => {
    setChatTurnReaderForTests(async () => { throw new Error('provider down'); });
    const ans = await dispatchCoachTurn(TURN('how should I continue here then'), {});
    expect(ans.text).toBe('brain');
    await waitForRow();
    expect(rows[0]).toMatchObject({ parsedKind: null, parseSource: 'llm-failed', valid: null });
  });

  it('internal asks (hint taps) and canned buttons are never read', async () => {
    const reader = vi.fn(async () => null);
    setChatTurnReaderForTests(reader);
    await dispatchCoachTurn(TURN('give me a hint', { surface: 'hint' }), {});
    await dispatchCoachTurn(TURN("what's best", { origin: 'canned-best-move' }), {});
    await new Promise((r) => setTimeout(r, 30));
    expect(reader).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it('a routed command is the fast-path lane "command"', async () => {
    routeChatIntent.mockResolvedValue({ ackMessage: 'Taking you to Tactics.', path: '/tactics', intent: { kind: 'qa', raw: 'x' } });
    setChatTurnReaderForTests(async () => ({ kind: 'command', referents: [], seat: 'none', english: 'take me to tactics' }));
    await dispatchCoachTurn(TURN('take me to tactics'), {});
    await waitForRow();
    expect(rows[0]).toMatchObject({ fastPathLane: 'command', parsedKind: 'command', agreed: true });
  });

  it('a validated reading is remembered for the surface (the conversation memory)', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'what-about-piece', referents: [{ type: 'piece', piece: 'knight', square: 'f3', seat: 'me' }], seat: 'me', english: 'what about my knight on f3?' }));
    await dispatchCoachTurn(TURN('what about my knight on f3?'), {});
    await waitForRow();
    expect(conversationFor('game-chat').lastPiece).toEqual({ piece: 'n', square: 'f3', seat: 'me' });
  });

  it('FLAG OFF by default: the student\'s own words reach the brain', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'best-move', referents: [], seat: 'me', english: 'x' }));
    await dispatchCoachTurn(TURN('qual é o melhor lance?'), {});
    expect(ask.mock.calls[0][0].ask).toBe('qual é o melhor lance?');
  });

  it('FLAG ON: a validated, live reading is SERVED as its canonical question', async () => {
    setServeParsedRoute(true);
    setChatTurnReaderForTests(async () => ({ kind: 'best-move', referents: [], seat: 'me', english: "what's my best move?" }));
    await dispatchCoachTurn(TURN('qual é o melhor lance?'), {});
    expect(ask.mock.calls[0][0].ask).toBe("what's my best move?");
    await waitForRow();
    expect(rows[0].servedParsed).toBe(true);
  });

  it('FLAG ON: a reading whose answerer is still pending is NOT served', async () => {
    setServeParsedRoute(true);
    // `answer` (a square answer outside a lesson) has no answerer yet.
    setChatTurnReaderForTests(async () => ({ kind: 'answer', referents: [{ type: 'square', square: 'e5' }], seat: 'none', english: 'e5' }));
    await dispatchCoachTurn(TURN('the pawn on e5 i think'), {});
    expect(ask.mock.calls[0][0].ask).toBe('the pawn on e5 i think');
  });
});

describe('dispatchCoachTurn — a direct kind is answered by its computed sentence', () => {
  beforeEach(() => {
    routeChatIntent.mockReset();
    ask.mockReset();
    rows.length = 0;
    resetChatTurnListeners();
    onChatTurn((r) => rows.push(r));
    resetConversations();
    routeChatIntent.mockResolvedValue(null);
    ask.mockResolvedValue({ text: 'brain', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek', servedIntent: 'tactics' });
    setChatTurnReaderForTests(async () => ({ kind: 'count-defenders', referents: [{ type: 'square', square: 'c6' }], seat: 'them', english: 'how many defend c6' }));
  });

  it('flag ON: the count comes from the board, the brain is never asked', async () => {
    setServeParsedRoute(true);
    const ans = await dispatchCoachTurn(TURN('how many defend c6'), {});
    setServeParsedRoute(false);
    expect(ans.text).toBe('Two defend their knight on c6: their pawn on b7 and pawn on d7.');
    expect(ask).not.toHaveBeenCalled();
    await waitForRow();
    expect(rows[0]).toMatchObject({ parsedKind: 'count-defenders', servedParsed: true, servedIntent: 'count-defenders', answererLive: true });
  });

  it('flag OFF: today\'s routing answers and the reading is only logged', async () => {
    setServeParsedRoute(false);
    const ans = await dispatchCoachTurn(TURN('how many defend c6'), {});
    expect(ans.text).toBe('brain');
    await waitForRow();
    expect(rows[0].servedParsed).toBe(false);
  });
});
