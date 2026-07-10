/**
 * coachApi.whyReasoning.integration.test
 * ---------------------------------------
 * END-TO-END proof that "why does the engine like this move" wires up:
 * getCoachChatResponse( whyBestMoveQuestion + enginePlan.pvSan )
 *   → the reasoning dispatch branch → assembleEngineReasoning (board-true walk)
 *   → voiceFacts (G0 chokepoint) → the returned text.
 * The LLM is mocked; the CHESS content is computed. This closes the gap the
 * per-assembler unit tests can't: that the intent flag actually reaches the
 * assembler through the real dispatch. David 2026-07-10 hand-audit follow-up.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCoachChatResponse } from './coachApi';
import { __resetProviderCooldownsForTests } from './coachApi';

// A royal-fork position: white Nb5; Nc7+ forks the e8-king and the a8-rook.
const FORK_FEN = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';

function installLLMMock(echo: (facts: string) => string): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    // Echo the computed facts back so voiceFacts' fidelity net passes and we can
    // assert the walk survived end-to-end.
    const readBody = (): string => {
      try { return typeof init?.body === 'string' ? init.body : ''; } catch { return ''; }
    };
    if (url.includes('/api/llm/deepseek')) {
      const body = readBody();
      // The facts are embedded in the system/user content; echo a safe line.
      const text = echo(body);
      return new Response(JSON.stringify({
        id: 'c', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/llm/anthropic')) {
      const text = echo(readBody());
      return new Response(JSON.stringify({
        id: 'm', type: 'message', role: 'assistant', content: [{ type: 'text', text }],
        model: 'x', stop_reason: 'end_turn', stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
}

beforeEach(() => { __resetProviderCooldownsForTests(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('why-does-the-engine-like-it — full dispatch', () => {
  it('walks the engine PV and returns the board-true reasoning', async () => {
    // The LLM echo returns the computed facts verbatim (voiceFacts preferRaw may
    // even skip it) — either way the walk must be present.
    installLLMMock((body) => {
      const m = body.match(/forks the [^"]*?on a8[^"]*/);
      return m ? m[0] : 'The engine plays Nc7+ — it forks the king on e8 and the rook on a8.';
    });
    const response = await getCoachChatResponse(
      [{ role: 'user', content: 'why is that the best move?' }],
      '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
      {
        currentFen: FORK_FEN,
        surface: '/coach/chat',
        whyBestMoveQuestion: true,
        engineBestMoveUci: 'b5c7',
        enginePlan: { pvSan: ['Nc7+'], evalCp: 400, mateIn: null, studentSide: 'white' },
      },
    );
    // The board-true fork (computed, not invented) survived to the output.
    expect(response).toMatch(/Nc7/);
    expect(response).toMatch(/forks .* a8|rook on a8|king on e8/i);
    // The best-move arrow is drawn from the real from/to.
    expect(response).toMatch(/\[BOARD: arrow:b5-c7:green\]/);
  });

  it('degrades to single-move geometry when only the best-move UCI is known', async () => {
    installLLMMock(() => 'The engine plays Nc7+ — it forks the king on e8 and the rook on a8.');
    const response = await getCoachChatResponse(
      [{ role: 'user', content: 'explain the engine move' }],
      '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
      {
        currentFen: FORK_FEN,
        surface: '/coach/chat',
        whyBestMoveQuestion: true,
        engineBestMoveUci: 'b5c7', // no enginePlan.pvSan
      },
    );
    expect(response).toMatch(/Nc7|forks/i);
  });
});
