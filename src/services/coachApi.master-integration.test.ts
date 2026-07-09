/**
 * coachApi.master-integration.test
 * --------------------------------
 * End-to-end tests for the four-layer master-play grounding pipeline
 * wired into `getCoachChatResponse`. Exercises:
 *
 *   - Layer B (pre-injection): intent detection on the last user
 *     message → master-play context built from cache/local/live →
 *     injected as a system-prompt block.
 *   - Layer D (post-validation): claim validator runs on the LLM's
 *     response; ungrounded SANs / numbers / entities trigger up to
 *     two retries; on exhaustion the stock fallback is served.
 *   - Kid contract: `getKidLlmResponse` does NOT engage grounding;
 *     master-play paths never touch kid LLM calls.
 *   - Non-move-question chat: intent doesn't fire → grounding stays
 *     dormant → streaming behaves as before.
 *
 * Mocks `globalThis.fetch` to intercept both the Lichess explorer
 * proxy and the Anthropic / DeepSeek LLM endpoints. No real network.
 * No `vi.mock()` of the new services (per WO).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCoachChatResponse, getKidLlmResponse } from './coachApi';
import { __resetMasterPlayLookupForTests } from './masterPlayLookup';
import { _resetLichessCircuitBreaker } from './lichessExplorerService';
import { __resetProviderCooldownsForTests } from './coachApi';
import { masterPlayCache } from './masterPlayCache';
import { __resetMasterPlayPersistenceForTests } from './masterPlayPersistence';
import { db } from '../db/schema';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const STARTING_FEN_4 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

const LICHESS_PAYLOAD = {
  white: 19950,
  draws: 20200,
  black: 9900,
  moves: [
    { uci: 'e2e4', san: 'e4', averageRating: 2480, white: 9000, draws: 8500, black: 4500, game: null },
    { uci: 'd2d4', san: 'd4', averageRating: 2510, white: 7600, draws: 7800, black: 3600, game: null },
    { uci: 'g1f3', san: 'Nf3', averageRating: 2500, white: 2400, draws: 2800, black: 1300, game: null },
    { uci: 'c2c4', san: 'c4', averageRating: 2520, white: 950, draws: 1100, black: 450, game: null },
  ],
  topGames: [
    { id: 'kasp85', white: { name: 'Kasparov, G', rating: 2700 }, black: { name: 'Karpov, A', rating: 2705 }, winner: 'white', year: 1985, month: '1985-10' },
  ],
  opening: null,
};

const EMPTY_LICHESS_PAYLOAD = {
  white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null,
};

function buildAnthropicResponse(text: string): unknown {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-sonnet-4-6',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  };
}

/** Mock fetch that routes Lichess proxy + Anthropic + DeepSeek to
 *  caller-controlled response sequences. */
interface FetchPlan {
  /** Sequence of Lichess explorer payloads (one per call). */
  lichess?: unknown;
  /** Sequence of LLM text responses. First call gets [0], second [1], etc. */
  llmTexts: string[];
}

function installFetchMock(plan: FetchPlan): { llmCalls: number; lichessCalls: number } {
  const counters = { llmCalls: 0, lichessCalls: 0 };
  let llmIdx = 0;
  let lichessIdx = 0;
  const lichessSeq = Array.isArray(plan.lichess) ? plan.lichess : plan.lichess ? [plan.lichess] : [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/lichess-explorer')) {
      counters.lichessCalls += 1;
      const body = lichessSeq[Math.min(lichessIdx, lichessSeq.length - 1)] ?? EMPTY_LICHESS_PAYLOAD;
      lichessIdx += 1;
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Provider calls now route through the first-party proxy
    // (/api/llm/{anthropic,deepseek}); the key is injected server-side.
    if (url.includes('/api/llm/anthropic')) {
      counters.llmCalls += 1;
      const text = plan.llmTexts[Math.min(llmIdx, plan.llmTexts.length - 1)] ?? '';
      llmIdx += 1;
      return new Response(JSON.stringify(buildAnthropicResponse(text)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/llm/deepseek')) {
      counters.llmCalls += 1;
      // OpenAI-shaped response
      const text = plan.llmTexts[Math.min(llmIdx, plan.llmTexts.length - 1)] ?? '';
      llmIdx += 1;
      const body = {
        id: 'cmpl_test',
        object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
  return counters;
}

beforeEach(async () => {
  __resetMasterPlayLookupForTests();
  _resetLichessCircuitBreaker();
  __resetProviderCooldownsForTests();
  masterPlayCache.clear();
  // The DURABLE Dexie master-play cache (readPersistedMasterPlay, David
  // 2026-06-17) survives the in-memory clear above and leaks across tests
  // in the shared fake-indexeddb: the first test that hits STARTING_FEN
  // persists its live result, so every later same-FEN test is served from
  // disk and never calls /api/lichess-explorer — making a lichessCalls>0
  // assertion fail even though the answer stays correctly grounded. Clear
  // the persisted store so each test exercises the live path in isolation.
  __resetMasterPlayPersistenceForTests();
  await db.masterPlayCache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetMasterPlayLookupForTests();
});

// Helper to drive a single grounded turn.
async function ask(message: string, llmReplies: string[]): Promise<{ response: string; counters: ReturnType<typeof installFetchMock> }> {
  const counters = installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: llmReplies });
  const response = await getCoachChatResponse(
    [{ role: 'user', content: message }],
    '',
    undefined,
    'chat_response',
    1024,
    undefined,
    undefined,
    undefined,
    {
      currentFen: STARTING_FEN,
      surface: '/coach/chat',
      sessionId: 'test-session',
    },
  );
  return { response, counters };
}

describe('grounding — intent detection', () => {
  it('does NOT engage on casual chat ("hi")', async () => {
    const counters = installFetchMock({ llmTexts: ['Hello!'] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'hi' }],
      '',
      undefined,
      'chat_response',
      1024,
      undefined,
      undefined,
      undefined,
      { currentFen: STARTING_FEN, surface: '/coach/chat' },
    );
    expect(r).toBe('Hello!');
    expect(counters.lichessCalls).toBe(0); // grounding never built context
  });

  it('does NOT engage on non-move chat ("what is the Sicilian?")', async () => {
    const counters = installFetchMock({ llmTexts: ['The Sicilian is a defense against 1.e4 starting with 1...c5.'] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'what is the Sicilian?' }],
      '',
      undefined,
      'chat_response',
      1024,
      undefined,
      undefined,
      undefined,
      { currentFen: STARTING_FEN, surface: '/coach/chat' },
    );
    // RIP #2 (coach grounding build): the coach no longer FREE-explains an
    // opening with fabricated "1.e4 c5" moves. With no books/pedagogy assembler
    // yet, an opening-definition question stays dormant (no master-play) and
    // serves the honest line; the F3/F11 assembler grounds it properly later.
    expect(counters.lichessCalls).toBe(0); // grounding stayed dormant
    expect(r).toContain("can't verify");
  });

  it('engages on "what should I play here?"', async () => {
    // Grounding ENGAGES (lichess fetched). With no engine snapshot threaded, the
    // grounded-path fall-through serves the honest default (no free LLM call) —
    // RIP (David 2026-07-09): the LLM no longer free-composes a move answer here.
    const { counters } = await ask(
      'what should I play here?',
      ['The most popular move here is e4, played in many master games.'],
    );
    expect(counters.lichessCalls).toBeGreaterThan(0);
    expect(counters.llmCalls).toBe(0); // grounded default, no free-compose
  });

  it('engages on "what do masters play?"', async () => {
    const { counters } = await ask(
      'what do masters play in this position?',
      ['Masters favor e4 here.'],
    );
    expect(counters.lichessCalls).toBeGreaterThan(0);
  });

  it('engages on "what about Nf3?" (a move question)', async () => {
    const { counters } = await ask('what about Nf3?', ['Nf3 is a fine developing move.']);
    expect(counters.lichessCalls).toBeGreaterThan(0);
  });

  // Regression (David 2026-07-04): these phrasings trip the grounded
  // detectors (isBestMoveQuestion / isMasterPlayQuestion / isPlanQuestion)
  // but were MISSED by the legacy MOVE_QUESTION_PATTERNS, so the engage gate
  // skipped grounding and the LLM answered the move question freely — an
  // ungrounded G0 violation. The gate now also engages on the detector flags.
  it.each([
    "what's the strongest move here",
    'best move in this position',
    'how should I continue',
    'what do the pros prefer here',
    "what's my best option here",
  ])('engages grounding on "%s" (previously slipped past the engage gate)', async (q) => {
    const { counters } = await ask(q, ['e4 is the top choice here.']);
    expect(counters.lichessCalls).toBeGreaterThan(0);
  });

  it('does NOT engage on "what about the Caro-Kann?" (general opening question, not a move)', async () => {
    // 2026-06-02: this used to engage master-play on the CURRENT FEN, the
    // coach named Caro moves, the validator gated them against the wrong
    // position, and a teaching question got the stock fallback.
    const counters = installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: [
      'The Caro-Kann starts 1.e4 c6 2.d4 d5 — solid, with a good light-squared bishop.',
    ] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'what about the Caro-Kann?' }],
      '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
      { currentFen: STARTING_FEN, surface: '/coach/teach' },
    );
    // RIP #2: no free opening explanation. Grounding still stays dormant (the
    // original 2026-06-02 bug — engaging master-play on the wrong FEN and
    // stocking out — must not return); the honest line is served until the F3
    // books assembler grounds "what is opening X" properly.
    expect(counters.lichessCalls).toBe(0); // grounding stayed dormant
    expect(r).toContain("can't verify");
  });

  it('engages on forceEngage even without intent match', async () => {
    installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: ['Sure.'] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'tell me about this' }],
      '',
      undefined,
      'chat_response',
      1024,
      undefined,
      undefined,
      undefined,
      { currentFen: STARTING_FEN, surface: '/coach/chat', forceEngage: true },
    );
    // forceEngage builds the grounding context (cache warmed) but no assembler
    // answers "tell me about this" and no engine snapshot is threaded — so the
    // grounded default serves the honest line, NOT the free 'Sure.' (RIP).
    expect(r).toContain("can't verify");
    expect(masterPlayCache.has(STARTING_FEN_4)).toBe(true);
  });
});

// RIP (David 2026-07-09): the grounded-path fall-through no longer lets the LLM
// reason freely. When no assembler answers, it serves the COMPUTED default —
// the engine's best move + eval when a snapshot is threaded, else the honest
// stock line. The LLM decides no chess, so invented SANs / players / percentages
// can NEVER reach the user: there is nothing to strip, and both the claim
// validator and groundCoachReply are deleted. The `llmReplies` in these tests
// are deliberately hallucinatory to prove they never surface.
describe('grounding — the grounded default (no free-compose)', () => {
  it('serves the computed best move when an engine snapshot is threaded', async () => {
    const counters = installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: ['ignored'] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'what should I play here?' }],
      '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
      { currentFen: STARTING_FEN, surface: '/coach/chat', engineBestMoveUci: 'g1f3', engineEvalCp: 30 },
    );
    expect(r).toContain('f3');                 // Nf3 — the engine's COMPUTED best move
    expect(r).not.toContain("can't verify");
    expect(counters.llmCalls).toBe(0);         // voiceFacts raw — the LLM decides nothing
  });

  it('serves the honest stock line when nothing can be grounded (no engine data)', async () => {
    const { response, counters } = await ask('what should I play here?', ['I recommend Nh6. Masters favor e4.']);
    expect(response).toContain("can't verify"); // grounded default — no free-compose
    expect(response).not.toContain('Nh6');       // the LLM's invented move NEVER reaches the user
    expect(counters.llmCalls).toBe(0);           // the LLM is never called to decide chess
  });

  it('never lets an invented player or percentage reach the user', async () => {
    const { response } = await ask('what do masters play here?', ['Carlsen plays this. Nf3 scores 58% here.']);
    expect(response).not.toContain('Carlsen'); // structurally impossible — LLM not asked to decide
    expect(response).not.toContain('58%');
  });

  // MOVE-NARRATION exemption (the Learn step-by-step flow) is NOT ripped — the
  // coach still narrates the played move + a ply-ahead continuation there.
  it('does NOT gate bare SANs on a MOVE-NARRATION turn (deep Learn teaching)', async () => {
    const counters = installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: [
      'Good — and if I recapture with bxc3, my pawns double but the b-file opens for your rook.',
    ] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'I played Nc3. Your move.' }],
      '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
      { currentFen: STARTING_FEN, moveNarration: true, surface: '/coach/teach', sessionId: 'test-session' },
    );
    expect(r).toContain('bxc3');
    expect(r).not.toContain("can't verify");
    expect(counters.llmCalls).toBe(1);
  });

  it('does NOT trip when the coach names the move JUST PLAYED (engine-driven Learn step)', async () => {
    const POST_C5_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const counters = installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: [
      'c5 is the Sicilian Defense — Black fights for the center from the flank. Your move.',
    ] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'I played e4.' }],
      '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
      { currentFen: POST_C5_FEN, moveHistory: ['e4', 'c5'], surface: '/coach/teach', sessionId: 'test-session' },
    );
    expect(r).toContain('Sicilian');
    expect(r).not.toContain("can't verify");
    expect(counters.llmCalls).toBe(1);
  });
});

describe('kid contract — getKidLlmResponse never engages grounding', () => {
  it('does not engage master-play even when kid LLM is asked a move question', async () => {
    const counters = installFetchMock({ lichess: LICHESS_PAYLOAD, llmTexts: ['That\'s the white pawn.'] });
    const r = await getKidLlmResponse(
      [{ role: 'user', content: 'what should I play here?' }],
      '',
      512,
    );
    expect(r).toBe("That's the white pawn.");
    // Lichess should NEVER be called for kid calls.
    expect(counters.lichessCalls).toBe(0);
  });
});

describe('grounding — passes through when grounding is undefined', () => {
  it('keeps the legacy non-grounded path for callers that opt out', async () => {
    const counters = installFetchMock({ llmTexts: ['e4 is a great move!'] });
    const r = await getCoachChatResponse(
      [{ role: 'user', content: 'what should I play here?' }],
      '',
      // no grounding arg
    );
    expect(r).toBe('e4 is a great move!');
    expect(counters.lichessCalls).toBe(0);
  });
});
