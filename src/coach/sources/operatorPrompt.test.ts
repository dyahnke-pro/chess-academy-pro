/**
 * Regression tests for the OPERATOR_BASE_BODY tool-call protocol.
 *
 * History: I previously added a "HARD RULE: use STRUCTURED tool_calls
 * only — NEVER emit `[[ACTION:...]]` markup" instruction. Both the
 * DeepSeek and Anthropic providers in this codebase parse tool calls
 * from `[[ACTION:name {args}]]` markers in the response text (see
 * `src/services/coachActionDispatcher.ts` and the providers in
 * `src/coach/providers/`). Telling the LLM never to emit those
 * markers cut off the only tool-call channel — every response came
 * back with `tools=0`, the coach narrated intent ("let me set up the
 * position") but never actually called set_board_position, and the
 * board never changed.
 *
 * These tests lock the prompt's tool-call instructions so the rule
 * can't get re-broken silently.
 */
import { describe, it, expect } from 'vitest';
import { composeIdentityPrompt, DEFAULT_PERSONALITY_SETTINGS } from './identity';
import { parseActions } from '../../services/coachActionDispatcher';

describe('OPERATOR prompt — tool-call protocol', () => {
  const prompt = composeIdentityPrompt(DEFAULT_PERSONALITY_SETTINGS);

  it('instructs the LLM to emit [[ACTION:name {args}]] markers', () => {
    expect(prompt).toMatch(/\[\[ACTION:tool_name/);
    expect(prompt).toMatch(/\[\[ACTION:set_board_position/);
    expect(prompt).toMatch(/\[\[ACTION:stockfish_eval/);
    expect(prompt).toMatch(/\[\[ACTION:play_move/);
  });

  it('does NOT tell the LLM to use "STRUCTURED tool_calls only" (the bug we hit)', () => {
    // The phrase "STRUCTURED tool_calls only" was the exact wording
    // that bricked tool calling in the providers. If anyone re-adds
    // it, this test fires before the production audit shows tools=0.
    expect(prompt).not.toMatch(/STRUCTURED tool_calls only/i);
    expect(prompt).not.toMatch(/Never .* \[\[ACTION/i);
  });

  it('explicitly tells the LLM that words without a tool call do not change anything', () => {
    expect(prompt).toMatch(/Words without a tool call don't change anything/);
  });

  it('shows a concrete wrong/right example', () => {
    expect(prompt).toMatch(/Wrong:/);
    expect(prompt).toMatch(/Right:/);
  });

  it('round-trips a marker through parseActions to a usable tool call', () => {
    // The end-to-end check: emit a marker exactly like the prompt
    // tells the LLM to, run it through the same parser the providers
    // use, and verify a usable action falls out the other side.
    const llmResponse = `Let me set up the Vienna position. [[ACTION:set_board_position {"fen":"r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2N5/PPPP1PPP/R1BQK1NR w KQkq - 4 4"}]] Here we go — Bc4 lines up on f7.`;
    const { cleanText, actions } = parseActions(llmResponse);
    expect(actions).toHaveLength(1);
    expect(actions[0].name).toBe('set_board_position');
    expect(actions[0].args).toEqual({
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2N5/PPPP1PPP/R1BQK1NR w KQkq - 4 4',
    });
    // Marker is stripped from the user-facing text.
    expect(cleanText).not.toMatch(/\[\[ACTION/);
    expect(cleanText).toMatch(/Let me set up the Vienna position/);
    expect(cleanText).toMatch(/Bc4 lines up on f7/);
  });

  it('round-trips a play_move marker', () => {
    const llmResponse = `I'll play Nf3. [[ACTION:play_move {"san":"Nf3"}]] Done.`;
    const { actions } = parseActions(llmResponse);
    expect(actions).toHaveLength(1);
    expect(actions[0].name).toBe('play_move');
    expect(actions[0].args).toEqual({ san: 'Nf3' });
  });

  it('round-trips a stockfish_eval marker', () => {
    const llmResponse = `Let me check the engine. [[ACTION:stockfish_eval {"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"}]]`;
    const { actions } = parseActions(llmResponse);
    expect(actions).toHaveLength(1);
    expect(actions[0].name).toBe('stockfish_eval');
    expect(actions[0].args).toMatchObject({
      fen: expect.stringContaining('rnbqkbnr/pppppppp'),
    });
  });
});
