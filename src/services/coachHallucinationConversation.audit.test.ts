/**
 * HALLUCINATION AUDIT — MULTI-TURN CONVERSATIONAL GAME (pass 8)
 * ============================================================
 * David: "play a game ... make each test harder than the last."
 *
 * The hardest realistic shape: a real conversation as the board EVOLVES. We
 * play a game and, at each position, the student asks "explain" and the brain
 * emits a board lie SPECIFIC TO THAT POSITION (a piece named on a square that
 * is empty right now). Every turn must be gated against THAT turn's FEN — a
 * lie about move 4's board must not be judged against move 10's board. This
 * proves finalizeReply keys on the live grounding.currentFen across a session.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { getCoachChatResponse, __resetProviderCooldownsForTests } from './coachApi';
import { __resetMasterPlayLookupForTests } from './masterPlayLookup';
import { _resetLichessCircuitBreaker } from './lichessExplorerService';
import { masterPlayCache } from './masterPlayCache';

const EMPTY = { white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null };
function anthropic(text: string): unknown {
  return { id: 'm', type: 'message', role: 'assistant', content: [{ type: 'text', text }], model: 'claude-sonnet-4-6', stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 40, output_tokens: 25, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } };
}
function mockLLM(text: string): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const H = { status: 200, headers: { 'Content-Type': 'application/json' } };
    if (url.includes('/api/lichess-explorer')) return new Response(JSON.stringify(EMPTY), H);
    if (url.includes('api.anthropic.com/v1/messages')) return new Response(JSON.stringify(anthropic(text)), H);
    if (url.includes('api.deepseek.com')) return new Response(JSON.stringify({ id: 'c', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 40, completion_tokens: 25, total_tokens: 65 } }), H);
    return new Response('{}', { status: 404 });
  });
}

beforeEach(() => { __resetMasterPlayLookupForTests(); _resetLichessCircuitBreaker(); __resetProviderCooldownsForTests(); masterPlayCache.clear(); });
afterEach(() => { vi.restoreAllMocks(); __resetMasterPlayLookupForTests(); });

function firstEmptyNonEdgeSquare(chess: Chess, salt: number): Square {
  const all: Square[] = [];
  for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) all.push(`${f}${r}` as Square);
  const empties = all.filter((sq) => !chess.get(sq));
  return empties[salt % empties.length];
}

describe('HALLUCINATION AUDIT pass 8 — multi-turn conversational game', () => {
  it('catches a position-specific board lie at EVERY turn of an evolving game', async () => {
    const chess = new Chess();
    const moves = (() => {
      const c = new Chess(); const out: string[] = [];
      for (let i = 0; i < 24; i++) { const m = c.moves(); if (!m.length) break; const pick = m[(i * 5 + 2) % m.length]; c.move(pick); out.push(pick); }
      return out;
    })();

    const history: { role: 'user' | 'assistant'; content: string }[] = [];
    let turns = 0, caught = 0;

    for (let i = 0; i <= moves.length; i++) {
      const fen = chess.fen();
      // The brain emits a lie about THIS position: a knight on a verified-empty
      // square, plus a true closing instruction.
      const emptySq = firstEmptyNonEdgeSquare(chess, i + 3);
      const lie = `The knight on ${emptySq} dominates the centre.`;
      const truth = 'Keep developing toward the centre.';
      mockLLM(`${lie} ${truth}`);

      history.push({ role: 'user', content: 'explain this position' });
      const reply = await getCoachChatResponse(
        history, '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
        { currentFen: fen, surface: '/audit/conversation' },
      );
      history.push({ role: 'assistant', content: reply });
      turns += 1;
      const lieGone = !reply.toLowerCase().includes(`knight on ${emptySq}`.toLowerCase());
      const truthKept = /Keep developing/i.test(reply);
      if (lieGone && truthKept) caught += 1;
      expect(lieGone, `turn ${i}: lie about ${emptySq} survived: "${reply.slice(0, 140)}"`).toBe(true);
      expect(truthKept, `turn ${i}: truth wrongly dropped`).toBe(true);

      if (i < moves.length) chess.move(moves[i]);
    }

    console.log(`\n═══ MULTI-TURN CONVERSATION AUDIT ═══\n  turns: ${turns}  position-specific lies caught: ${caught}/${turns}\n════════════════════════════════════`);
    expect(caught).toBe(turns);
  });
});
