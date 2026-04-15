import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findPlanForOpening,
  findPlanBySubject,
  sessionFromPlan,
  resolveMiddlegameSession,
  resolveMiddlegameSessionWithFallback,
} from './middlegamePlanner';
import { stockfishEngine } from './stockfishEngine';

describe('middlegamePlanner', () => {
  it('finds an exact plan by openingId', () => {
    const plan = findPlanForOpening('italian-game');
    expect(plan).not.toBeNull();
    expect(plan?.id).toContain('italian');
  });

  it('returns null when no plan matches', () => {
    expect(findPlanForOpening('totally-made-up-opening')).toBeNull();
  });

  it('finds a plan by free-text subject', () => {
    const plan = findPlanBySubject('italian game');
    expect(plan).not.toBeNull();
  });

  it('returns null for empty subjects', () => {
    expect(findPlanBySubject('')).toBeNull();
    expect(findPlanBySubject('  ')).toBeNull();
  });

  it('builds a WalkthroughSession with a non-starting fen and middlegame kind', () => {
    const plan = findPlanForOpening('italian-game');
    expect(plan).not.toBeNull();
    const session = sessionFromPlan(plan!);
    expect(session).not.toBeNull();
    expect(session!.kind).toBe('middlegame');
    // The starting FEN is the middlegame critical position, not the
    // standard start position — this is the key invariant: board
    // context carries over from opening → middlegame.
    expect(session!.startFen).not.toContain('rnbqkbnr/pppppppp');
    expect(session!.steps.length).toBeGreaterThan(0);
    // Each step has embedded narration (no parallel array to maintain)
    for (const step of session!.steps) {
      expect(step.narration.length).toBeGreaterThan(0);
    }
  });

  it('resolveMiddlegameSession accepts subject or openingId', () => {
    const a = resolveMiddlegameSession({ openingId: 'italian-game' });
    const b = resolveMiddlegameSession({ subject: 'italian' });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });

  it('resolveMiddlegameSession returns null for unknown input', () => {
    expect(resolveMiddlegameSession({ subject: 'zzzzzzz' })).toBeNull();
  });
});

// Mock the LLM call so the fallback test doesn't require a real API key.
vi.mock('./coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue(
    JSON.stringify(['Control the center.', 'Develop a knight.']),
  ),
}));

describe('resolveMiddlegameSessionWithFallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the DB plan when a match exists (no engine call)', async () => {
    const spy = vi.spyOn(stockfishEngine, 'queueAnalysis');
    const session = await resolveMiddlegameSessionWithFallback({
      openingId: 'italian-game',
    });
    expect(session).not.toBeNull();
    expect(session!.kind).toBe('middlegame');
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to Stockfish PV when no DB plan matches', async () => {
    vi.spyOn(stockfishEngine, 'queueAnalysis').mockResolvedValueOnce({
      bestMove: 'e2e4',
      evaluation: 20,
      isMate: false,
      mateIn: null,
      depth: 18,
      topLines: [
        {
          rank: 1,
          evaluation: 20,
          mate: null,
          // 10-ply PV starting from the standard start position.
          moves: [
            'e2e4',
            'e7e5',
            'g1f3',
            'b8c6',
            'f1b5',
            'a7a6',
            'b5a4',
            'g8f6',
            'e1g1',
            'f8e7',
          ],
        },
      ],
      nodesPerSecond: 1_000_000,
    });

    const session = await resolveMiddlegameSessionWithFallback({
      subject: 'completely-unknown-opening',
    });
    expect(session).not.toBeNull();
    expect(session!.title).toBe('Engine-suggested plan');
    expect(session!.kind).toBe('middlegame');
    expect(session!.steps.length).toBeGreaterThan(0);
    expect(session!.steps.length).toBeLessThanOrEqual(10);
  });

  it('returns null when the engine has nothing useful', async () => {
    vi.spyOn(stockfishEngine, 'queueAnalysis').mockResolvedValueOnce({
      bestMove: '',
      evaluation: 0,
      isMate: false,
      mateIn: null,
      depth: 18,
      topLines: [],
      nodesPerSecond: 0,
    });

    const session = await resolveMiddlegameSessionWithFallback({
      subject: 'unknown',
    });
    expect(session).toBeNull();
  });
});
