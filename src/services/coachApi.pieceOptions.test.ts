// "Couldn't he just move the queen?" through the chat layer (WO-DANYA-01 C):
// the computed answer is SPOKEN (no model — G0) and its lines come back out of
// the one-turn channel so the surface can draw and walk them.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCoachChatResponse, consumeCoachLines, __resetProviderCooldownsForTests } from './coachApi';
import type { PieceOptionsAnswer } from './pieceOptions';

const FEN = '3r2k1/5ppp/8/8/8/3B4/5PPP/3Q2K1 w - - 0 1';

const ANSWER: PieceOptionsAnswer = {
  seat: 'opponent', piece: 'q', from: 'd1', duty: ['d3'], narrowedBy: 'duty',
  options: [], playedSan: null,
  facts: 'Where can their queen on d1 go and still guard d3? Just Qd2 and Qe2.',
  lines: [{ label: 'Qd2', startFen: FEN, plies: [{ san: 'Qd2', uci: 'd1d2', fenBefore: FEN, fenAfter: FEN }] }],
};

beforeEach(() => {
  __resetProviderCooldownsForTests();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/llm/')) {
      return new Response(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', content: 'LLM_WAS_CALLED' }, finish_reason: 'stop' }] }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  });
});
afterEach(() => { vi.restoreAllMocks(); });

function ask(grounding: Record<string, unknown>): Promise<string> {
  return getCoachChatResponse(
    [{ role: 'user', content: "couldn't he just move the queen?" }],
    '', undefined, 'chat_response', 1024, undefined, undefined, undefined,
    { currentFen: FEN, surface: 'coach-teach', cleanAsk: "couldn't he just move the queen?", studentColor: 'black', ...grounding },
  );
}

describe('the piece-options lane', () => {
  it('speaks the computed answer and hands its lines to the surface', async () => {
    const r = await ask({ pieceOptions: ANSWER });
    expect(r).not.toContain('LLM_WAS_CALLED');
    expect(r).toMatch(/Where can their queen on d1 go and still guard d3\?/);
    const lines = consumeCoachLines();
    expect(lines?.map((l) => l.label)).toEqual(['Qd2']);
    expect(consumeCoachLines()).toBeNull(); // read once
  });

  it('NEGATIVE CONTROL: no computed answer → no lines ride back', async () => {
    await ask({});
    expect(consumeCoachLines()).toBeNull();
  });
});
