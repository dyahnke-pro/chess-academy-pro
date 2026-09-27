/**
 * coachApi.boardVerdict.integration.test
 * ---------------------------------------
 * SCOPE (corrected 2026-09-02): this is a LAYER test of `getCoachChatResponse`,
 * NOT end-to-end. It hands in a hand-built grounding object and so bypasses
 * `coachService.ask` — the real translation layer that decides whether grounding
 * is even built and what lands in it. It can therefore pass while the surface
 * fails, which is exactly how the whose-turn collapse shipped: the bug lived in
 * the autoGrounding gate, upstream of everything asserted here.
 *
 * Keep it — isolating this layer is genuinely useful — but the REAL-PATH
 * coverage lives in `src/coach/coachService.boardVerdict.integration.test.ts`,
 * which drives `coachService.ask` and covers the engine-down cases. Any new
 * board-verdict contract goes THERE first; this file is the narrower companion.
 *
 * Proves that the deterministic board-verdict questions —
 * "is this a draw?", "whose turn is it?", "what colour am I?", "how many moves
 * to mate?" — are answered by the COMPUTER (computeLiveBoardVerdict), NOT by the
 * generic best-move position default and NOT by the LLM (G0; David 2026-09-02).
 *
 * A hand-driven KQ-vs-K prod audit showed EVERY board question returning the
 * same "The best move is Qd6, White is winning" readout. This reproduces the
 * play-surface grounding (surface='game-chat', engine data threaded, cleanAsk
 * set) and asserts each of the four gets its own verdict.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCoachChatResponse, __resetProviderCooldownsForTests } from './coachApi';

// KQ-vs-K, White to move, White winning. <=7 pieces → syzygy is authoritative.
const KQVK_FEN = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';

/** Mock fetch: the tablebase returns a White win (dtm 15); the LLM echoes back
 *  whatever facts it is handed (so if any answer DID reach the model we'd still
 *  see the computed text, but a preferRaw computed answer never calls it). */
function installMocks(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/lichess-tablebase')) {
      return new Response(JSON.stringify({ category: 'win', dtm: 15, dtz: 15, checkmate: false, stalemate: false, insufficient_material: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/llm/')) {
      const body = (() => { try { return typeof init?.body === 'string' ? init.body : ''; } catch { return ''; } })();
      // Flag any LLM call for a deterministic question as a failure signal.
      return new Response(JSON.stringify({
        id: 'c', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: `LLM_WAS_CALLED::${body.slice(0, 40)}` }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
}

function playGrounding(cleanAsk: string) {
  return {
    currentFen: KQVK_FEN,
    surface: 'game-chat',
    cleanAsk,
    studentColor: 'white' as const,
    engineBestMoveUci: 'd2d6',
    engineEvalCp: 1000, // white-POV, winning
  };
}

beforeEach(() => { __resetProviderCooldownsForTests(); installMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

async function ask(q: string): Promise<string> {
  return getCoachChatResponse(
    [{ role: 'user', content: `[Ask]\n${q}` }],
    '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
    playGrounding(q),
  );
}

describe('board-verdict questions route to the computer on the play surface', () => {
  it('"is this a draw?" answers the draw verdict, not the best move', async () => {
    const r = (await ask('is this a draw?')).toLowerCase();
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/draw|winning|win for you/);
  });

  it('"whose turn is it?" answers the side to move', async () => {
    const r = (await ask('whose turn is it?')).toLowerCase();
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/white to move|your turn/);
  });

  it('"what colour am I playing?" answers the colour', async () => {
    const r = (await ask('what color am I playing?')).toLowerCase();
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/you're playing white|playing white/);
  });

  it('"how many moves until mate?" answers the mate distance', async () => {
    const r = (await ask('how many moves until mate?')).toLowerCase();
    expect(r).not.toContain('llm_was_called');
    expect(r).not.toMatch(/the best move is/);
    expect(r).toMatch(/mate in \d+|win for you/);
  });
});

describe('a comparison is not a board verdict (question walk 2026-09-27)', () => {
  const SICILIAN = 'r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13';
  const grounding = (cleanAsk: string, withCompare: boolean) => ({
    currentFen: SICILIAN, surface: '/coach/teach', cleanAsk, studentColor: 'white' as const,
    engineBestMoveUci: 'g2g3', engineEvalCp: 100,
    ...(withCompare ? {
      compareMoves: {
        a: { san: 'g3', evalCp: 100, mateIn: null, lineUci: [] },
        b: { san: 'e5', evalCp: 30, mateIn: null, lineUci: ['d6e5', 'd4d5'] },
      },
    } : {}),
  });
  const run = (q: string, withCompare: boolean) => getCoachChatResponse(
    [{ role: 'user', content: `[Ask]\n${q}` }], '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
    grounding(q, withCompare),
  );
  it('"Why is that better than e5?" is answered by the comparison, naming e5', async () => {
    const r = await run('Why is that better than e5?', true);
    expect(r).not.toContain('LLM_WAS_CALLED');
    expect(r).toMatch(/e5/);
    expect(r).not.toMatch(/^Clearly your position/);
  });
});

describe('question run 2026-09-27 (Colle, White, move 15)', () => {
  const COLLE = 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16';
  const run = (q: string) => getCoachChatResponse(
    [{ role: 'user', content: `[Ask]\n${q}` }], '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
    { currentFen: COLLE, surface: '/coach/teach', cleanAsk: q, studentColor: 'white' as const, engineBestMoveUci: 'e1e5', engineEvalCp: 50, groundedBoardQuestion: true, conceptQuestion: false },
  );
  it('"What does their bishop on c8 do?" reads that bishop, never a book passage', async () => {
    const r = await run('What does their bishop on c8 do?');
    expect(r).not.toContain('LLM_WAS_CALLED');
    expect(r).not.toMatch(/doubled pawns/i);
    expect(r).toMatch(/bishop on c8/);
  });
});
