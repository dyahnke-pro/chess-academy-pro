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

async function ask(q: string, over: Partial<ReturnType<typeof liveState>> = {}): Promise<string> {
  const ans = await coachService.ask(
    { surface: 'game-chat', ask: q, liveState: { ...liveState(), ...over } },
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

/**
 * ENGINE DOWN — the questions that never needed an engine must still be
 * answered. Every case above runs with a healthy engine (fen + engineBestMoveUci
 * + evalCp all present), which is why this whole class shipped uncovered.
 *
 * Reproduced 2026-09-02 from a report that an engine-crash run collapsed
 * EVERYTHING — including "whose turn is it?" — to the stock refusal. Two
 * independent single-points-of-failure on the FEN, each of which reproduces a
 * different half of the symptom on its own:
 *
 *   1. coachService's autoGrounding gate reads "is there a FEN, OR did one of
 *      these intents fire", and the four board-verdict intents were never in
 *      the list. No FEN → no grounding object at all → a free LLM turn on a
 *      chess question (G0 violation).
 *   2. computeLiveBoardVerdict opened with `if (!fen) return null`, so even with
 *      grounding engaged it declined, fell past the position default, and
 *      served the stock "I can't verify that precisely" — the reported symptom,
 *      verbatim.
 *
 * The side to move and the student's colour are carried on `liveState` and were
 * always available; the computed path simply never received them. A question
 * answerable without a board must not depend on one.
 */
describe('play surface: engine down / no board threaded', () => {
  it('"whose turn is it?" is answered with NO fen — not refused, not improvised', async () => {
    const r = await ask('whose turn is it?', { fen: undefined });
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/can.t verify/);
    expect(r).toMatch(/white to move|your turn/);
  });

  it('"what colour am I playing?" is answered with NO fen', async () => {
    const r = await ask('what color am I playing?', { fen: undefined });
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/can.t verify/);
    expect(r).toMatch(/playing white/);
  });

  it('board questions survive a DEAD engine when the fen is present', async () => {
    // The engine crash itself must not take down board-truth answers: these
    // read chess.js and the threaded side, never a search.
    const dead = { engineBestMoveUci: undefined, evalCp: undefined };
    expect(await ask('whose turn is it?', dead)).toMatch(/white to move|your turn/);
    expect(await ask('what color am I playing?', dead)).toMatch(/playing white/);
  });

  it('a board question that GENUINELY needs the board declines honestly, never improvises', async () => {
    // Mate/draw cannot be answered without a position. The contract is that the
    // coach says so through the computed lane — it must never hand the question
    // to the model to invent an answer for.
    const r = await ask('how many moves until mate?', { fen: undefined, engineBestMoveUci: undefined, evalCp: undefined });
    expect(r).not.toContain('llm_was_called');
  });
});
