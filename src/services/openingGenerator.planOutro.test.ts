import { describe, it, expect, vi } from 'vitest';
import { generateOpening } from './openingGenerator';

// THE LESSON CLOSES ON THE PLAN THE GAMES SHOW (WO-STORY-MATRIX-01 P1-9c):
// `computedPlanAt`, the plan the opening's own page shows for the same line.
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: async () => { throw Object.assign(new Error('401 plan-outro'), { status: 401 }); } } };
  },
}));
vi.mock('./explorerTeachLine', () => ({
  buildExplorerBranches: vi.fn(async () => ({ branches: [], source: null, results: null, incomplete: false })),
  resultsLine: () => null,
}));
const planAt = vi.fn(async () => ({ title: 'The d4 break and the knight to g3' }));
vi.mock('./computedPlan', () => ({ computedPlanAt: (...a: unknown[]) => planAt(...(a as [])) }));

const PONZIANI = { canonicalName: 'Ponziani Opening', eco: 'C44', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'], studentSide: 'white' as const, corpusNotes: true };

describe('the lesson closes on the computed plan', () => {
  it('names the break and the route from the student\'s seat', async () => {
    const r = await generateOpening(PONZIANI.canonicalName, { mode: 'learn', entryOverride: PONZIANI });
    expect(r.ok).toBe(true);
    expect(r.ok && r.tree?.outro).toBe('From here, the plan the strongest games show for your side: the d4 break and the knight to g3. Drill the moves to lock them in.');
    // Read on the lesson's own line (its spine, from the opening's moves on), for the student's side.
    const [line, side, name] = planAt.mock.calls[0] as unknown as [string[], string, string];
    expect(line.slice(0, 5)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'c3']);
    expect(side).toBe('white');
    expect(name).toBe('Ponziani Opening');
  });
  it('a line whose games run out keeps the plain close', async () => {
    planAt.mockResolvedValueOnce(null as never);
    const r = await generateOpening('Ponziani Opening: no plan', { mode: 'learn', entryOverride: { ...PONZIANI, canonicalName: 'Ponziani Opening: no plan' } });
    expect(r.ok && r.tree?.outro).toBe('Drill the moves to lock them in.');
  });
});
