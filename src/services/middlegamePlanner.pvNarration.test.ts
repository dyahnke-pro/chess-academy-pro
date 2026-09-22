/**
 * WO-STANDARD-01 F3 — the engine-line fallback's per-move why is COMPUTED.
 *
 * `narratePvLine` used to be one batched chat call ("For EACH move listed,
 * give ONE concise sentence explaining the idea") board-graded on the way
 * back. It is now `narrateContinuationMove` per replayed ply. Proof is
 * OUTPUT with the provider dead (`openai` 401s; the planner no longer
 * imports coachApi at all).
 *
 * NEGATIVE CONTROL: on the pre-inversion planner every entry is '' under
 * this mock, and the session's annotations degrade to bare "e4.".
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: async () => { throw Object.assign(new Error('401'), { status: 401 }); } } };
  },
}));

import { narratePvLine, resolveMiddlegameSessionWithFallback } from './middlegamePlanner';
import { stockfishEngine } from './stockfishEngine';
import { readFileSync } from 'node:fs';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('narratePvLine — computed per replayed ply', () => {
  it('speaks a board-true why for every move of the line', () => {
    const out = narratePvLine(START, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    expect(out).toHaveLength(5);
    expect(out[0]).toMatch(/^White's pawn to e4, taking central space/);
    expect(out[2]).toMatch(/^White's knight to f3, .*eyeing the pawn on e5/);
    expect(out[4]).toMatch(/^White's bishop to b5, .*knight on c6/);
    for (const s of out) expect(s.trim().length).toBeGreaterThan(0);
  });

  it('keeps the array aligned when the replay breaks', () => {
    const out = narratePvLine(START, ['e4', 'Qh9', 'e5']);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatch(/^White's pawn to e4/);
    expect(out[1]).toBe('');
  });

  it('the Stockfish fallback session carries the computed why with the provider dead', async () => {
    vi.spyOn(stockfishEngine, 'queueAnalysis').mockResolvedValueOnce({
      bestMove: 'e2e4', evaluation: 20, isMate: false, mateIn: null, depth: 18, nodesPerSecond: 1,
      topLines: [{ rank: 1, evaluation: 20, mate: null, moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'] }],
    });
    const session = await resolveMiddlegameSessionWithFallback({ subject: 'completely-unknown-opening' });
    expect(session).not.toBeNull();
    expect(session!.steps[0].narration).toMatch(/^White's pawn to e4, taking central space/);
    expect(session!.steps[2].narration).toMatch(/eyeing the pawn on e5/);
  });

  it('never imports the coach LLM path (source pin)', () => {
    const src = readFileSync('src/services/middlegamePlanner.ts', 'utf8');
    expect(src).not.toMatch(/getCoachChatResponse|coachApi|extractJsonArray/);
  });
});
