/**
 * The door's reading on the REAL chat path (2026-10-08): real questions
 * students typed that used to get the board's best move although they were
 * not about the board. Read as what they are, each now gets its own lane's
 * answer or is asked back — and a question that IS about the board keeps its
 * answer. The reader is stubbed with the reading a correct read produces; the
 * rest of the path (door → service → catch-all) is the production one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dispatchCoachTurn, setChatTurnReaderForTests } from './dispatchCoachTurn';
import type { ChatKind } from './chatTurn';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/llm/')) {
      return new Response(JSON.stringify({
        id: 'c', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: 'LLM_WAS_CALLED' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
});
afterEach(() => { vi.restoreAllMocks(); });

async function ask(q: string, kind: ChatKind, surface: 'teach' | 'game-chat' = 'teach'): Promise<{ text: string; served: string | null }> {
  setChatTurnReaderForTests(async () => ({ kind, referents: [], seat: 'me', english: q }));
  const a = await dispatchCoachTurn(
    { surface, ask: q, liveState: { surface, fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: ['e4', 'e5', 'Nf3', 'Nc6'], engineBestMoveUci: 'f1b5', evalCp: 30 } },
    { maxToolRoundTrips: 2 },
  );
  return { text: a.text, served: a.servedIntent ?? null };
}

const OFF_BOARD: Array<[string, ChatKind]> = [
  ['What thinking errors have I made', 'misconceptions'],
  ["Don't show me the arrows", 'command'],
  ["You're still showing the arrows don't tell me what to do", 'command'],
  ['Calculation', 'method'],
  ['Help me calculate', 'method'],
  ['Which opening should I practice?', 'opening-profile'],
  ['What do I need to work on the most?', 'weakness-briefing'],
  ['Books', 'unclear'],
];

describe('the door\'s reading on the chat path', () => {
  afterEach(() => setChatTurnReaderForTests(undefined));
  for (const [q, kind] of OFF_BOARD) {
    it(`"${q}" (read as ${kind}) is not answered with the board's best move`, async () => {
      const r = await ask(q, kind);
      console.log(`${q}\n   → [${r.served}] ${r.text.slice(0, 160)}`);
      expect(r.text).not.toMatch(/the best move is/i);
      expect(r.text).not.toContain('LLM_WAS_CALLED');
    }, 30_000);
  }

  it('a board question keeps its board answer', async () => {
    const r = await ask('What should I do here', 'best-move', 'game-chat');
    expect(r.text).toMatch(/Bb5|best move/i);
  }, 30_000);
});
