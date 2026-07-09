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

import { dispatchCoachTurn } from './dispatchCoachTurn';

const INPUT = { surface: 'standalone-chat' as const, ask: 'x', liveState: { fen: 'startpos' } };

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
