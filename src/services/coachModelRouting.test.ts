import { describe, it, expect } from 'vitest';
import { getModel, toolCapableModel } from './coachApi';

/**
 * Guards that keep INTERACTIVE / TOOL-DISPATCHING coach calls off the
 * reasoning models. Prod regression 2026-06-02: a user with Settings →
 * Provider analysis = `deepseek-reasoner` made the interactive teach
 * brain (chat_response) go out on reasoner → 30s timeout
 * ("coach-brain-deepseek-timeout"), 5-15s board-reset lag, AND the
 * structured walkthrough/label calls 400'd on tool_choice → templated
 * narration.
 */
const reasonerPick = { commentary: 'deepseek-reasoner', analysis: 'deepseek-reasoner', reports: 'deepseek-reasoner' };

describe('getModel latency guard', () => {
  it('ignores a reasoner analysis pick for the interactive chat brain → fast default', () => {
    expect(getModel('chat_response', 'deepseek', reasonerPick)).toBe('deepseek-chat');
  });

  it('ignores a reasoner commentary pick for per-move interactive_review → fast default', () => {
    expect(getModel('interactive_review', 'deepseek', reasonerPick)).toBe('deepseek-chat');
  });

  it('still honors a reasoner pick for a genuinely deep, single-shot analysis task', () => {
    // position_analysis_chat is non-interactive deep analysis — CoT is wanted.
    expect(getModel('position_analysis_chat', 'deepseek', reasonerPick)).toBe('deepseek-reasoner');
  });

  it('honors a compatible non-reasoning pick on the interactive brain', () => {
    const chatPick = { commentary: 'deepseek-chat', analysis: 'deepseek-chat', reports: 'deepseek-chat' };
    expect(getModel('chat_response', 'deepseek', chatPick)).toBe('deepseek-chat');
  });

  it('falls back to the per-task default when the pick is for the other provider', () => {
    // Anthropic pick while running on DeepSeek → use DeepSeek default.
    const anthropicPick = { commentary: 'claude-haiku-4-5-20251001', analysis: 'claude-opus-4-6', reports: 'claude-opus-4-6' };
    expect(getModel('chat_response', 'deepseek', anthropicPick)).toBe('deepseek-chat');
  });
});

describe('toolCapableModel', () => {
  it('downgrades deepseek-reasoner → deepseek-chat for a forced tool_choice call', () => {
    expect(toolCapableModel('opening_overview', 'deepseek', 'deepseek-reasoner')).toBe('deepseek-chat');
  });

  it('leaves a tool-capable model untouched', () => {
    expect(toolCapableModel('opening_overview', 'deepseek', 'deepseek-chat')).toBe('deepseek-chat');
  });
});
