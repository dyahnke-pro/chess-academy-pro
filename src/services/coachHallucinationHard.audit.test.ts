/**
 * HALLUCINATION AUDIT — DISGUISED & BURIED (2026-06-03, pass 4)
 * ============================================================
 * David: "make each test harder than the last."
 *
 * Passes 1-3 used isolated lies. Real hallucinations hide: buried among true
 * sentences, tucked inside a [VOICE:] block (what TTS actually SPEAKS, even
 * when the visible text looks clean), or smuggled in as one fabricated stat
 * inside an otherwise-grounded answer. Every case routes through the REAL
 * getCoachChatResponse path; the LLM is mocked as a cunning adversary.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCoachChatResponse } from './coachApi';
import { __resetMasterPlayLookupForTests } from './masterPlayLookup';
import { _resetLichessCircuitBreaker } from './lichessExplorerService';
import { __resetProviderCooldownsForTests } from './coachApi';
import { masterPlayCache } from './masterPlayCache';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6';

const LICHESS_PAYLOAD = {
  white: 19950, draws: 20200, black: 9900,
  moves: [
    { uci: 'e2e4', san: 'e4', averageRating: 2480, white: 9000, draws: 8500, black: 4500, game: null },
    { uci: 'd2d4', san: 'd4', averageRating: 2510, white: 7600, draws: 7800, black: 3600, game: null },
  ],
  topGames: [{ id: 'kt', white: { name: 'Kasparov, G', rating: 2812 }, black: { name: 'Topalov, V', rating: 2700 }, winner: 'white', year: 1999, month: '1999-01' }],
  opening: null,
};
const EMPTY = { white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null };

function anthropic(text: string): unknown {
  return { id: 'm', type: 'message', role: 'assistant', content: [{ type: 'text', text }], model: 'claude-sonnet-4-6', stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 50, output_tokens: 30, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } };
}
function installFetchMock(plan: { lichess?: unknown; llmTexts: string[] }): void {
  let li = 0, ci = 0;
  const seq = Array.isArray(plan.lichess) ? plan.lichess : plan.lichess ? [plan.lichess] : [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const JSON_H = { status: 200, headers: { 'Content-Type': 'application/json' } };
    if (url.includes('/api/lichess-explorer')) { const b = seq[Math.min(ci, seq.length - 1)] ?? EMPTY; ci++; return new Response(JSON.stringify(b), JSON_H); }
    if (url.includes('api.anthropic.com/v1/messages')) { const t = plan.llmTexts[Math.min(li, plan.llmTexts.length - 1)] ?? ''; li++; return new Response(JSON.stringify(anthropic(t)), JSON_H); }
    if (url.includes('api.deepseek.com')) { const t = plan.llmTexts[Math.min(li, plan.llmTexts.length - 1)] ?? ''; li++; return new Response(JSON.stringify({ id: 'c', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: t }, finish_reason: 'stop' }], usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 } }), JSON_H); }
    return new Response('{}', { status: 404 });
  });
}

beforeEach(() => { __resetMasterPlayLookupForTests(); _resetLichessCircuitBreaker(); __resetProviderCooldownsForTests(); masterPlayCache.clear(); });
afterEach(() => { vi.restoreAllMocks(); __resetMasterPlayLookupForTests(); });

async function ask(intent: string, fen: string, llm: string[], lichess: unknown = EMPTY): Promise<string> {
  installFetchMock({ lichess, llmTexts: llm });
  return getCoachChatResponse(
    [{ role: 'user', content: intent }], '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
    { currentFen: fen, surface: '/audit/hard' },
  );
}
const STOCK = /can't verify|run it through|analyze with the engine|grounded master data/i;

describe('HALLUCINATION AUDIT pass 4 — disguised & buried', () => {
  it('strips a board lie BURIED between two true sentences (keeps the truths)', async () => {
    const r = await ask('explain this position', BUG_FEN, [
      'Develop calmly and castle soon. The knight on f6 shields your king. Keep the centre closed.',
    ]);
    expect(r).not.toMatch(/knight on f6/i);     // f6 empty → buried lie removed
    expect(r).toMatch(/Develop calmly/i);        // truth before kept
    expect(r).toMatch(/centre closed/i);         // truth after kept
  });

  it('strips a board lie hidden INSIDE the spoken [VOICE:] block (TTS-critical)', async () => {
    // The visible prose is clean; the LIE is only in what Ruth would SPEAK.
    const r = await ask('what is going on here', BUG_FEN, [
      'A calm developing move keeps things solid. [VOICE: The bishop on d5 rakes the long diagonal, so trade it off.]',
    ]);
    expect(r).not.toMatch(/bishop on d5/i);      // d5 empty → stripped from VOICE too
    expect(r).toMatch(/calm developing move/i);  // clean prose survives
  });

  it('strips an impossible pin claim inside a [VOICE:] block', async () => {
    const r = await ask('explain', BUG_FEN, [
      "Castle next. [VOICE: Careful — the queen on b6 pins your knight on f3 to the king on e1.]",
    ]);
    expect(r).not.toMatch(/pins your knight on f3/i);
    expect(r).toMatch(/Castle next/i);
  });

  it('drops a fabricated PRO-STAT on a teach turn (name kept, number gone)', async () => {
    // Non-grounded turn (no master data) → the player-stat gate fires.
    const r = await ask('tell me about the Caro-Kann plan', START_FEN, [
      'The Caro-Kann is rock solid. Over 1,700 of his games reach this very structure. Aim for the c5 break.',
    ]);
    expect(r).not.toMatch(/1,700/);              // fabricated count dropped
    expect(r).toMatch(/rock solid/i);            // teaching kept
    expect(r).toMatch(/c5 break/i);
  });

  it('blocks a fabricated stat BURIED in an otherwise-grounded answer (grounded turn)', async () => {
    // e4 + ~22000 games are real; "92% for White" is fabricated. The whole
    // turn regenerates; a persistent fabrication never reaches the user.
    const r = await ask('what do masters play here?', START_FEN, [
      'Masters play e4 here, about 22000 games. White scores a crushing 92% after it.',
      'Masters favour e4 and d4 in this position.',
    ], LICHESS_PAYLOAD);
    expect(r).not.toMatch(/92%/);                // fabrication never served
    expect(r).toMatch(/e4|d4/);                  // clean retry served
  });

  it('blocks a disguised illegal-move recommendation ("the engine loves Qh5!")', async () => {
    const r = await ask('what should I play here?', START_FEN, [
      'The engine loves Qh5 here — a devastating early strike masters swear by.',
      'Still Qh5, the silicon crusher.',
      'Definitely Qh5.',
    ], LICHESS_PAYLOAD);
    expect(r).toMatch(STOCK);                     // Qh5 illegal/ungrounded → stock-out
  });

  it('does NOT over-strip a fully-grounded multi-sentence answer', async () => {
    const r = await ask('what do masters play here?', START_FEN, [
      'Masters play e4 here, the most popular move across roughly 22000 games. The bishop on f1 will develop next. Kasparov favoured it.',
    ], LICHESS_PAYLOAD);
    // All grounded: e4 in moves, ~22000 games real, f1 bishop true at start,
    // Kasparov in topGames → nothing stripped, no stock-out.
    expect(r).not.toMatch(STOCK);
    expect(r).toMatch(/Masters play e4/i);
    expect(r).toMatch(/bishop on f1/i);
  });
});
