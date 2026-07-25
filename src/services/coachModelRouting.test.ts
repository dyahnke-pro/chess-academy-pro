import { describe, it, expect } from 'vitest';
import { getModel, toolCapableModel } from './coachApi';

/**
 * Guards that keep INTERACTIVE / TOOL-DISPATCHING coach calls off the
 * reasoning models AND off the deprecated DeepSeek model names. Two prod
 * regressions this file locks:
 *  - 2026-06-02: a user with Settings → Provider analysis = `deepseek-reasoner`
 *    made the interactive teach brain (chat_response) go out on reasoner → 30s
 *    timeout, board-reset lag, and the structured walkthrough/label calls 400'd
 *    on tool_choice → templated narration.
 *  - 2026-07-24: DeepSeek deprecated `deepseek-chat` / `deepseek-reasoner`; the
 *    API now 400s them ("supported names are deepseek-v4-pro or deepseek-v4-flash").
 *    normalizeDeepSeekModel collapses any legacy/stored name to a current one so
 *    both the task map AND a user's stored preferredModel send a valid string.
 */
const reasonerPick = { commentary: 'deepseek-reasoner', analysis: 'deepseek-reasoner', reports: 'deepseek-reasoner' };

describe('getModel latency guard', () => {
  it('ignores a reasoner analysis pick for the interactive chat brain → fast default', () => {
    expect(getModel('chat_response', 'deepseek', reasonerPick)).toBe('deepseek-v4-flash');
  });

  it('ignores a reasoner commentary pick for per-move interactive_review → fast default', () => {
    expect(getModel('interactive_review', 'deepseek', reasonerPick)).toBe('deepseek-v4-flash');
  });

  it('honors a deep pick for a genuinely deep, single-shot analysis task (mapped to v4-pro)', () => {
    // position_analysis_chat is non-interactive deep analysis — the deprecated
    // reasoner pick normalizes to the deep v4-pro tier, not the fast flash.
    expect(getModel('position_analysis_chat', 'deepseek', reasonerPick)).toBe('deepseek-v4-pro');
  });

  it('normalizes a compatible legacy non-reasoning pick on the interactive brain', () => {
    const chatPick = { commentary: 'deepseek-chat', analysis: 'deepseek-chat', reports: 'deepseek-chat' };
    expect(getModel('chat_response', 'deepseek', chatPick)).toBe('deepseek-v4-flash');
  });

  it('passes a current v4 pick through untouched', () => {
    const v4Pick = { commentary: 'deepseek-v4-flash', analysis: 'deepseek-v4-pro', reports: 'deepseek-v4-pro' };
    expect(getModel('position_analysis_chat', 'deepseek', v4Pick)).toBe('deepseek-v4-pro');
  });

  it('falls back to the per-task default when the pick is for the other provider', () => {
    // Anthropic pick while running on DeepSeek → use DeepSeek default.
    const anthropicPick = { commentary: 'claude-haiku-4-5-20251001', analysis: 'claude-opus-4-6', reports: 'claude-opus-4-6' };
    expect(getModel('chat_response', 'deepseek', anthropicPick)).toBe('deepseek-v4-flash');
  });
});

describe('toolCapableModel', () => {
  it('pins a reasoner → the tool-capable v4-flash for a forced tool_choice call', () => {
    expect(toolCapableModel('opening_overview', 'deepseek', 'deepseek-reasoner')).toBe('deepseek-v4-flash');
  });

  it('pins any DeepSeek structured call to the tool-capable v4-flash', () => {
    expect(toolCapableModel('opening_overview', 'deepseek', 'deepseek-v4-pro')).toBe('deepseek-v4-flash');
    expect(toolCapableModel('opening_overview', 'deepseek', 'deepseek-chat')).toBe('deepseek-v4-flash');
  });
});
