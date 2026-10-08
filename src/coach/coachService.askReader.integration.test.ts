/**
 * The question reader on the REAL chat path (answers rebuild step 3): real
 * questions students typed that used to get the board's best move although
 * they were not about the board. Each must now get its own lane's answer or
 * be asked back — and a question that IS about the board keeps its answer.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { coachService } from './coachService';

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

async function ask(q: string, surface: 'teach' | 'game-chat' = 'teach'): Promise<{ text: string; served: string | null }> {
  const a = await coachService.ask(
    { surface, ask: q, liveState: { surface, fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: ['e4', 'e5', 'Nf3', 'Nc6'], engineBestMoveUci: 'f1b5', evalCp: 30 } },
    { maxToolRoundTrips: 2 },
  );
  return { text: a.text, served: a.servedIntent ?? null };
}

const OFF_BOARD = [
  'What thinking errors have I made',
  "Don't show me the arrows",
  "You're still showing the arrows don't tell me what to do",
  'Calculation',
  'Calculating lines',
  'Help me calculate',
  'Which opening should I practice?',
  'What do I need to work on the most?',
  'Books',
];

describe('the reader on the chat path', () => {
  for (const q of OFF_BOARD) {
    it(`"${q}" is not answered with the board's best move`, async () => {
      const r = await ask(q);
      console.log(`${q}\n   → [${r.served}] ${r.text.slice(0, 160)}`);
      expect(r.text).not.toMatch(/the best move is/i);
      expect(r.text).not.toContain('LLM_WAS_CALLED');
    }, 30_000);
  }

  it('a board question keeps its board answer', async () => {
    const r = await ask('What should I do here', 'game-chat');
    expect(r.text).toMatch(/Bb5|best move/i);
  }, 30_000);
});
