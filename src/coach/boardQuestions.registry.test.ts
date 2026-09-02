/**
 * THE ANTI-ROT GATE for the deterministic board questions.
 *
 * Four production bugs in one day came from the same shape: a hand-maintained
 * list of "which questions are these?" that some site forgot to extend. The
 * registry (boardQuestions.ts) collapses those lists into one; THIS test is what
 * makes that stick. It enumerates the registry and drives every entry through
 * every site, so adding an entry without wiring it is a build failure rather
 * than a silent hole a user finds.
 *
 * Every assertion here iterates BOARD_QUESTIONS. None of them name a question
 * — naming one would recreate the hand-maintained list this exists to kill.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BOARD_QUESTIONS, detectBoardQuestion, isAnyBoardQuestion } from './boardQuestions';
import { coachService } from './coachService';

// KQ-vs-K: <=7 pieces, so the tablebase is authoritative and every entry that
// lists 'tablebase' must answer here with NO engine data threaded at all.
const KQVK = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';

function installMocks(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/lichess-tablebase')) {
      return new Response(JSON.stringify({
        category: 'win', dtm: 15, dtz: 15, checkmate: false, stalemate: false,
        insufficient_material: false, moves: [{ uci: 'd2d5', san: 'Qd5' }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/llm/')) {
      return new Response(JSON.stringify({
        id: 'c', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: 'LLM_WAS_CALLED' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
}

/** DEAD ENGINE by construction: no engineBestMoveUci, no evalCp — exactly what
 *  GameChatPanel threads when the Stockfish cache misses. */
async function askDeadEngine(q: string, fen: string | undefined = KQVK): Promise<string> {
  const ans = await coachService.ask(
    {
      surface: 'game-chat', ask: q,
      liveState: {
        surface: 'game-chat' as const, fen, whoseTurn: 'white' as const,
        studentColor: 'white' as const, moveHistory: [] as string[],
        currentRoute: '/coach/play',
      },
    },
    { skipActionRouter: true, maxToolRoundTrips: 3 },
  );
  return ans.text.toLowerCase();
}

beforeEach(() => { installMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('board-question registry — structure', () => {
  it('every entry has a unique id and at least one sample', () => {
    const ids = BOARD_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size, `duplicate ids in ${ids.join(',')}`).toBe(ids.length);
    for (const q of BOARD_QUESTIONS) {
      expect(q.samples.length, `${q.id} has no samples`).toBeGreaterThan(0);
    }
  });

  it('every sample resolves to its OWN entry — no entry steals another', () => {
    // Order in the registry is precedence, so a broad detector placed too early
    // silently swallows a narrower question. This is what catches that.
    for (const q of BOARD_QUESTIONS) {
      for (const sample of q.samples) {
        expect(detectBoardQuestion(sample), `"${sample}" should resolve to ${q.id}`).toBe(q.id);
      }
    }
  });

  it('non-board asks resolve to null', () => {
    for (const q of ['thanks!', 'hello', 'teach me the Caro-Kann', 'how do you teach openings?']) {
      expect(isAnyBoardQuestion(q), `"${q}" must not be a board question`).toBe(false);
    }
  });
});

describe('board-question registry — every entry is wired at every site', () => {
  // SITE 1 — coachService autoGrounding: a board question must engage grounding
  // even with NO fen. Before the registry the list here omitted them, so they
  // produced no grounding object at all and the model answered freely.
  it('SITE 1 grounding engages for every entry with no fen — never a free LLM turn', async () => {
    for (const q of BOARD_QUESTIONS) {
      const r = await askDeadEngine(q.samples[0], undefined);
      expect(r, `${q.id}: reached the model with no grounding`).not.toContain('llm_was_called');
    }
  });

  // SITE 2 — the answer path. Every entry whose `needs` include 'tablebase'
  // MUST produce a real answer on a covered position with the engine dead. An
  // entry added without an answer case fails HERE.
  it('SITE 2 every tablebase-capable entry answers with the engine dead', async () => {
    for (const q of BOARD_QUESTIONS.filter((e) => e.needs.includes('tablebase'))) {
      const r = await askDeadEngine(q.samples[0]);
      expect(r, `${q.id}: refused on a tablebase-covered board`).not.toMatch(/can.t verify/);
      expect(r, `${q.id}: fell through to the opening picker`).not.toMatch(/did you mean/);
      expect(r, `${q.id}: answered by the model`).not.toContain('llm_was_called');
    }
  });

  // SITE 2b — the side-only entries need no board at all.
  it('SITE 2b side-only entries answer with NO fen and no engine', async () => {
    for (const q of BOARD_QUESTIONS.filter((e) => e.needs.length === 1 && e.needs[0] === 'side')) {
      const r = await askDeadEngine(q.samples[0], undefined);
      expect(r, `${q.id}: refused without a board it does not need`).not.toMatch(/can.t verify/);
      expect(r, `${q.id}: answered by the model`).not.toContain('llm_was_called');
    }
  });

  // SITE 3 — no entry may be preempted by a fuzzy lane. "am I winning?" was
  // captured by the opening-name picker with its intent flag ALREADY true; the
  // flag was right, nothing read it in time. This asserts the whole family
  // resolves before any picker can answer.
  it('SITE 3 no entry is preempted by the opening-name picker', async () => {
    for (const q of BOARD_QUESTIONS) {
      for (const sample of q.samples) {
        const r = await askDeadEngine(sample);
        expect(r, `${q.id}: "${sample}" hit the opening picker`).not.toMatch(/did you mean|exact opening mapped/);
      }
    }
  });
});
