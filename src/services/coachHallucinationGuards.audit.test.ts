/**
 * HAND-WRITTEN COACH HALLUCINATION AUDIT (2026-06-03)
 * ===================================================
 * David: "run hand written audit on coach to check if hallucinations are gone."
 *
 * WHY THIS SHAPE: a live Playwright run can't prove the fix right now — the
 * branch isn't on prod (prod runs the OLD code), and this container has no
 * DEEPSEEK_KEY/ANTHROPIC_KEY so a localhost coach can't call the brain. The
 * rigorous way to prove "the guard catches the hallucination" is to make the
 * brain hallucinate ON DEMAND: mock the LLM as the untrusted source, feed it
 * the EXACT historical production hallucinations + a broad adversarial
 * battery, and drive them through the REAL wired path
 * (getCoachChatResponse → intent → master-play validateClaims → the new
 * by-construction board gate). With a live LLM you can only HOPE it
 * hallucinates and then check; here every catch is exercised deterministically.
 *
 * Each case asserts the hallucination NEVER reaches the user, by the right
 * mechanism:
 *   - BOARD_STRIP   — board lie removed, the true sentence kept.
 *   - MASTERPLAY_BLOCK — fabricated stat/player/SAN/comparative → stock
 *                        "can't verify" (it never reached the user).
 *   - KEPT          — a TRUE / legitimate line is NOT touched (no false
 *                     positive, no false stock-out).
 *
 * NOT covered here (owed once this lands on main, where Vercel has the LLM
 * key): real-device TTS playback + the live prod 3-instrument Playwright run.
 * Attack/fork/"eyes" claims are the BUILD-time narration gate's job
 * (narrationFactCheck.test.ts), not this runtime board gate.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCoachChatResponse } from './coachApi';
import { __resetMasterPlayLookupForTests } from './masterPlayLookup';
import { _resetLichessCircuitBreaker } from './lichessExplorerService';
import { __resetProviderCooldownsForTests } from './coachApi';
import { masterPlayCache } from './masterPlayCache';

// ── Real positions (the actual incident FENs) ─────────────────────────
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// The verbatim 2026-06-01 production hallucination position (French Advance,
// move 6): Qb6, Nf3, Ke1 all real & correct, but b6/f3/e1 aren't collinear.
const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6';
// Ruy Lopez after 3.Bb5 — a REAL pin (b5/c6/e8 on one diagonal).
const RUY_FEN = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

const LICHESS_PAYLOAD = {
  white: 19950, draws: 20200, black: 9900,
  moves: [
    { uci: 'e2e4', san: 'e4', averageRating: 2480, white: 9000, draws: 8500, black: 4500, game: null },
    { uci: 'd2d4', san: 'd4', averageRating: 2510, white: 7600, draws: 7800, black: 3600, game: null },
    { uci: 'g1f3', san: 'Nf3', averageRating: 2500, white: 2400, draws: 2800, black: 1300, game: null },
  ],
  topGames: [
    { id: 'kasp85', white: { name: 'Kasparov, G', rating: 2700 }, black: { name: 'Karpov, A', rating: 2705 }, winner: 'white', year: 1985, month: '1985-10' },
  ],
  opening: null,
};
const EMPTY_LICHESS_PAYLOAD = { white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null };

function buildAnthropicResponse(text: string): unknown {
  return {
    id: 'msg_test', type: 'message', role: 'assistant',
    content: [{ type: 'text', text }], model: 'claude-sonnet-4-6',
    stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  };
}

function installFetchMock(plan: { lichess?: unknown; llmTexts: string[] }): void {
  let llmIdx = 0, lichessIdx = 0;
  const lichessSeq = Array.isArray(plan.lichess) ? plan.lichess : plan.lichess ? [plan.lichess] : [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/lichess-explorer')) {
      const body = lichessSeq[Math.min(lichessIdx, lichessSeq.length - 1)] ?? EMPTY_LICHESS_PAYLOAD;
      lichessIdx += 1;
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('api.anthropic.com/v1/messages')) {
      const text = plan.llmTexts[Math.min(llmIdx, plan.llmTexts.length - 1)] ?? '';
      llmIdx += 1;
      return new Response(JSON.stringify(buildAnthropicResponse(text)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('api.deepseek.com')) {
      const text = plan.llmTexts[Math.min(llmIdx, plan.llmTexts.length - 1)] ?? '';
      llmIdx += 1;
      const body = { id: 'cmpl', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
}

type Mechanism = 'BOARD_STRIP' | 'MASTERPLAY_BLOCK' | 'KEPT';
interface AuditCase {
  id: string;
  category: string;
  fen: string;
  intent: string;          // user message (drives whether master-play engages)
  llm: string[];           // mocked brain output(s) — the untrusted source
  lichess: unknown;        // master payload for this turn
  mechanism: Mechanism;
  lie?: string;            // substring that must NOT survive
  keep?: string;           // substring that MUST survive
}

const CASES: AuditCase[] = [
  // ── A. The verbatim production incidents ────────────────────────────
  {
    id: 'incident-impossible-pin',
    category: 'board: impossible pin (the 2026-06-01 prod bug)',
    fen: BUG_FEN, intent: 'explain this position to me', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ["Be2 is a solid developing move. Black's queen on b6 pins the knight on f3 to your king."],
    mechanism: 'BOARD_STRIP', lie: 'pins the knight on f3', keep: 'Be2 is a solid',
  },
  {
    id: 'incident-pin-pronoun',
    category: 'board: impossible pin (pronoun / conditional shape)',
    fen: BUG_FEN, intent: 'what is going on here', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ["Develop calmly. That knight on f3 is hanging because the queen on b6 pins it to your king if you castle."],
    mechanism: 'BOARD_STRIP', lie: 'pins it to your king', keep: 'Develop calmly',
  },
  // ── B. Piece-on-square lies ─────────────────────────────────────────
  {
    id: 'piece-empty-square',
    category: 'board: piece named on an empty square (f6)',
    fen: BUG_FEN, intent: 'tell me about this position', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ['The knight on f6 guards the centre. Trade pawns to open the position.'],
    mechanism: 'BOARD_STRIP', lie: 'knight on f6', keep: 'Trade pawns',
  },
  {
    id: 'piece-wrong-square-start',
    category: 'board: piece on a square it does not occupy (e4 at start)',
    fen: START_FEN, intent: 'explain this position', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ['The knight on e4 controls the centre. Develop your pieces calmly.'],
    mechanism: 'BOARD_STRIP', lie: 'knight on e4', keep: 'Develop your pieces',
  },
  {
    id: 'piece-lie-on-grounded-turn',
    category: 'board: lie survives the master-play layer, board gate catches it',
    fen: START_FEN, intent: 'what do masters play here?', lichess: LICHESS_PAYLOAD,
    llm: ['Masters develop naturally. The bishop on d5 dominates the long diagonal.'],
    mechanism: 'BOARD_STRIP', lie: 'bishop on d5', keep: 'develop naturally',
  },
  // ── C. Master-play fabrications (must stock out, never reach user) ───
  {
    id: 'fabricated-san',
    category: 'fabricated SAN ("the top master move is Nh6")',
    fen: START_FEN, intent: 'what do masters play here?', lichess: LICHESS_PAYLOAD,
    llm: ['The top master move here is Nh6, played in most games.', 'Definitely Nh6 — the crushing knight leap.', 'Nh6 is the only move masters consider.'],
    mechanism: 'MASTERPLAY_BLOCK',
  },
  {
    id: 'fabricated-percentage',
    category: 'fabricated percentage (88% with no backing)',
    fen: START_FEN, intent: 'what do masters play here?', lichess: LICHESS_PAYLOAD,
    llm: ['White scores a massive 88% after e4 here.', 'It really is 88% for White.', 'The data clearly shows 88%.'],
    mechanism: 'MASTERPLAY_BLOCK',
  },
  {
    id: 'fabricated-player-year',
    category: 'fabricated attribution (Carlsen in 1995 — topGames has Kasparov)',
    fen: START_FEN, intent: 'what do masters play here?', lichess: LICHESS_PAYLOAD,
    llm: ['Carlsen famously played this in his 1995 World Championship run.', 'Yes, Carlsen in 1995.', 'It was Carlsen, 1995.'],
    mechanism: 'MASTERPLAY_BLOCK',
  },
  {
    id: 'fabricated-comparative-mainline',
    category: 'fabricated comparative — WIDENED gate ("the main line is d4", top is e4)',
    fen: START_FEN, intent: 'what is the main line here?', lichess: LICHESS_PAYLOAD,
    llm: ['The main line here is d4, by a wide margin.', 'The main line is d4.', 'Without doubt the main line is d4.'],
    mechanism: 'MASTERPLAY_BLOCK',
  },
  {
    id: 'fabricated-comparative-sharpest',
    category: 'fabricated comparative — WIDENED gate ("the sharpest continuation is Nh6")',
    fen: START_FEN, intent: 'what do masters play here?', lichess: LICHESS_PAYLOAD,
    llm: ['The sharpest continuation here is Nh6.', 'The sharpest continuation is Nh6.', 'Truly the sharpest is Nh6.'],
    mechanism: 'MASTERPLAY_BLOCK',
  },
  // ── D. No-false-positive / no-false-stock-out (the HARD half) ───────
  {
    id: 'true-board-claim-kept',
    category: 'no false positive — a TRUE piece-on-square is kept',
    fen: START_FEN, intent: 'explain this position', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ['The knight on g1 is ready to develop. A calm setup serves here.'],
    mechanism: 'KEPT', keep: 'knight on g1',
  },
  {
    id: 'true-pin-kept',
    category: 'no false positive — a REAL pin (Bb5xNc6→Ke8) is kept',
    fen: RUY_FEN, intent: 'explain this position', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ['The bishop on b5 pins the knight on c6 to the king on e8. A classic Ruy idea.'],
    mechanism: 'KEPT', keep: 'pins the knight on c6',
  },
  {
    id: 'comparative-non-move-kept',
    category: 'no false positive — SAN-shape guard ("the main line is complex")',
    fen: START_FEN, intent: 'what is the main line here?', lichess: LICHESS_PAYLOAD,
    llm: ['The main line is complex and double-edged, so study it carefully.'],
    mechanism: 'KEPT', keep: 'complex and double-edged',
  },
  {
    id: 'offbook-plan-kept',
    category: 'no false stock-out — off-book plan SANs are forward-looking',
    fen: START_FEN, intent: 'what should I play here?', lichess: EMPTY_LICHESS_PAYLOAD,
    llm: ['A reasonable plan is Nf3 and then d4, contesting the centre.'],
    mechanism: 'KEPT', keep: 'Nf3',
  },
];

const STOCK_MARK = /can't verify|run it through|analyze with the engine|grounded master data/i;

beforeEach(() => {
  __resetMasterPlayLookupForTests();
  _resetLichessCircuitBreaker();
  __resetProviderCooldownsForTests();
  masterPlayCache.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  __resetMasterPlayLookupForTests();
});

interface Outcome { id: string; category: string; mechanism: Mechanism; pass: boolean; detail: string; response: string; }
const results: Outcome[] = [];

async function runCase(c: AuditCase): Promise<Outcome> {
  installFetchMock({ lichess: c.lichess, llmTexts: c.llm });
  const response = await getCoachChatResponse(
    [{ role: 'user', content: c.intent }],
    '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
    { currentFen: c.fen, surface: '/audit/coach' },
  );
  let pass = false; let detail = '';
  if (c.mechanism === 'BOARD_STRIP') {
    const lieGone = c.lie ? !response.toLowerCase().includes(c.lie.toLowerCase()) : true;
    const keep = c.keep ? response.toLowerCase().includes(c.keep.toLowerCase()) : true;
    pass = lieGone && keep;
    detail = `lie removed: ${lieGone}; true sentence kept: ${keep}`;
  } else if (c.mechanism === 'MASTERPLAY_BLOCK') {
    pass = STOCK_MARK.test(response);
    detail = `served stock "can't verify" (fabrication never reached user): ${pass}`;
  } else {
    const kept = c.keep ? response.toLowerCase().includes(c.keep.toLowerCase()) : true;
    const notStocked = !STOCK_MARK.test(response);
    pass = kept && notStocked;
    detail = `legitimate line kept: ${kept}; not falsely stocked: ${notStocked}`;
  }
  return { id: c.id, category: c.category, mechanism: c.mechanism, pass, detail, response };
}

describe('HAND-WRITTEN COACH HALLUCINATION AUDIT', () => {
  for (const c of CASES) {
    it(`[${c.mechanism}] ${c.id} — ${c.category}`, async () => {
      const o = await runCase(c);
      results.push(o);
      expect(o.pass, `${o.id}\n  ${o.detail}\n  response: "${o.response.slice(0, 200)}"`).toBe(true);
    });
  }

  it('AUDIT REPORT — every adversarial case caught, zero false positives', () => {
    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    const byMech = (m: Mechanism): string => {
      const rs = results.filter((r) => r.mechanism === m);
      return `${rs.filter((r) => r.pass).length}/${rs.length}`;
    };
    const lines: string[] = [];
    lines.push('');
    lines.push('═══════════════ COACH HALLUCINATION AUDIT ═══════════════');
    lines.push(`  board-lies stripped (BOARD_STRIP):     ${byMech('BOARD_STRIP')}`);
    lines.push(`  fabrications blocked (MASTERPLAY_BLOCK): ${byMech('MASTERPLAY_BLOCK')}`);
    lines.push(`  legit lines untouched (KEPT/no-FP):     ${byMech('KEPT')}`);
    lines.push(`  ─────────────────────────────────────────────`);
    lines.push(`  TOTAL: ${passed}/${total}`);
    for (const r of results) {
      lines.push(`  ${r.pass ? '✓' : '✗'} [${r.mechanism}] ${r.id} — ${r.detail}`);
    }
    lines.push('══════════════════════════════════════════════════════════');
    console.log(lines.join('\n'));
    expect(passed).toBe(total);
  });
});
