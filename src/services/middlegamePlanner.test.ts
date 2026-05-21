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

describe('Ruy Lopez variation middlegame plans', () => {
  const RUY_VARIATION_PLAN_IDS = [
    'mp-ruylopez-marshall',
    'mp-ruylopez-berlin',
    'mp-ruylopez-open',
    'mp-ruylopez-exchange',
    'mp-ruylopez-breyer',
    'mp-ruylopez-chigorin',
    'mp-ruylopez-zaitsev',
    'mp-ruylopez-exchange-endgame',
    'mp-ruylopez-berlin-endgame',
    'mp-ruylopez-breyer-endgame',
    'mp-ruylopez-chigorin-endgame',
    'mp-ruylopez-zaitsev-endgame',
    'mp-ruylopez-open-endgame',
  ];

  for (const id of RUY_VARIATION_PLAN_IDS) {
    it(`${id}: every playable line is legal, annotated, and arrow-consistent`, async () => {
      const { Chess } = await import('chess.js');
      const plans = (await import('../data/middlegame-plans.json')).default as Array<{
        id: string;
        openingId: string;
        criticalPositionFen: string;
        playableLines: Array<{
          fen: string;
          moves: string[];
          annotations: string[];
          arrows?: Array<Array<{ from: string; to: string }>>;
        }>;
      }>;
      const plan = plans.find((p) => p.id === id);
      expect(plan, `plan ${id} missing`).toBeTruthy();
      expect(plan!.openingId).toBe('ruy-lopez');
      expect(plan!.playableLines.length).toBeGreaterThan(0);

      for (const line of plan!.playableLines) {
        expect(line.annotations.length).toBe(line.moves.length);
        const c = new Chess(line.fen);
        line.moves.forEach((san, i) => {
          const mv = c.move(san); // chess.js throws on an illegal move, failing the test
          const arrow = line.arrows?.[i]?.[0];
          if (arrow) {
            expect(arrow.from).toBe(mv.from);
            expect(arrow.to).toBe(mv.to);
          }
        });
      }
    });
  }

  it('each Ruy variation plan builds a white-oriented middlegame session', async () => {
    const plans = (await import('../data/middlegame-plans.json')).default as Array<{
      id: string;
    }>;
    for (const id of RUY_VARIATION_PLAN_IDS) {
      const plan = plans.find((p) => p.id === id);
      // sessionFromPlan takes the canonical MiddlegamePlan shape; the JSON
      // row satisfies it. Cast through unknown since the JSON import is
      // typed loosely.
      const session = sessionFromPlan(plan as unknown as Parameters<typeof sessionFromPlan>[0], {
        orientation: 'white',
      });
      expect(session, `session for ${id}`).not.toBeNull();
      expect(session!.steps.length, `steps for ${id}`).toBeGreaterThan(0);
      expect(session!.orientation).toBe('white');
    }
  });
});
