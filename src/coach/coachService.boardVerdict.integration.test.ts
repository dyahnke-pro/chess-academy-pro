/**
 * coachService.boardVerdict.integration.test
 * -------------------------------------------
 * Reproduces the REAL play-surface path (GameChatPanel → dispatchCoachTurn →
 * coachService.ask → provider → getCoachChatResponse), NOT a direct
 * getCoachChatResponse call. This is the path a hand-driven KQ-vs-K prod audit
 * showed collapsing every board question to the same best-move readout. It
 * builds the envelope + grounding exactly as production does, so it catches a
 * bug in that composition (e.g. the ask reaching the detectors is not clean).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { coachService } from './coachService';

const KQVK_FEN = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';

function installMocks(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/lichess-tablebase')) {
      return new Response(JSON.stringify({ category: 'win', dtm: 15, dtz: 15, checkmate: false, stalemate: false, insufficient_material: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/llm/')) {
      const body = (() => { try { return typeof init?.body === 'string' ? init.body : ''; } catch { return ''; } })();
      return new Response(JSON.stringify({
        id: 'c', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: `LLM_WAS_CALLED::${body.slice(0, 30)}` }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
}

// Mirror GameChatPanel's liveState for a live coach/play game.
function liveState() {
  return {
    surface: 'game-chat' as const,
    fen: KQVK_FEN,
    whoseTurn: 'white' as const,
    studentColor: 'white' as const,
    moveHistory: [] as string[],
    currentRoute: '/coach/play',
    engineBestMoveUci: 'd2d6',
    evalCp: 1000,
  };
}

async function ask(q: string): Promise<string> {
  const ans = await coachService.ask(
    { surface: 'game-chat', ask: q, liveState: liveState() },
    { skipActionRouter: true, maxToolRoundTrips: 3 },
  );
  return ans.text.toLowerCase();
}

beforeEach(() => { installMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('play surface: board-verdict questions answered by the computer', () => {
  it('"is this a draw?" → draw verdict, not best move, not LLM', async () => {
    const r = await ask('is this a draw?');
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/draw|winning|win for you/);
  });
  it('"whose turn is it?" → side to move', async () => {
    const r = await ask('whose turn is it?');
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/white to move|your turn/);
  });
  it('"what colour am I playing?" → the colour', async () => {
    const r = await ask('what color am I playing?');
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/playing white/);
  });
  it('"how many moves until mate?" → mate distance', async () => {
    const r = await ask('how many moves until mate?');
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/mate in \d+|win for you/);
  });
});
