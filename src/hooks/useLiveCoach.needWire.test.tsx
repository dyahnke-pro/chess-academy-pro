// B3 (PLAN WO-STANDARD-01, 2026-09-22): the live coach hands the composer the
// STUDENT MODEL'S NEED HALF and the RAW BOARD DATA of the move just played —
// and only the student's move, never the opponent's filed under them.
//
// The composer is mocked HERE ONLY to read what reached it; `useLiveCoach.test`
// keeps the real composer for the concept-fires test. Negative controls, both
// run and reverted: drop `...(ctx.lastMove ? { lastMove } : {})` from the
// computePositionFacts call → the first test fails; pass `lastMove` from
// `notifyOpponentMove` too → the second test fails.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PlayerMoveNotification } from './useLiveCoach';

const groundedMoveFeedback = vi.fn(async (..._a: unknown[]) => 'A knight jumps into d5.');
vi.mock('../services/coachApi', () => ({ groundedMoveFeedback: (...a: unknown[]) => groundedMoveFeedback(...a) }));
vi.mock('../services/liveTacticsContext', () => ({ buildFedTacticsContext: vi.fn(async (..._a: unknown[]) => null) }));
vi.mock('./stockfishFenCache', () => ({ getCachedStockfish: () => ({ bestMove: 'd2d4', evaluation: 120, isMate: false, topLines: [{ rank: 1, evaluation: 120, moves: ['d2d4'], mate: null }] }) }));
vi.mock('../services/stockfishEngine', () => ({ stockfishEngine: { evalBoard: async () => { throw new Error('no engine in test'); } } }));
vi.mock('../services/coachAnswerGates', () => ({ applyCandidateArrows: async (t: string) => t }));
vi.mock('../services/voiceService', () => ({ voiceService: { stop: vi.fn(), speakForced: vi.fn(async (..._a: unknown[]) => undefined) } }));
vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('../services/skillScaling', () => ({ alertSensitivityMultiplier: () => 1 }));
vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { currentRating: 1500, skillRadar: { tactics: 1500 } } }) },
}));
vi.mock('../services/liveCoachTriggers', () => ({
  evaluatePlayerMoveTriggers: () => ({ winner: { trigger: 'great-move' }, suppressed: [] }),
  evaluateOpponentMoveTriggers: () => ({ winner: { trigger: 'opponent-blunder' } }),
}));
vi.mock('../stores/coachMemoryStore', () => ({
  useCoachMemoryStore: { getState: () => ({ conversationHistory: [], appendConversationMessage: vi.fn() }) },
}));
// A loaded student: five analysed games, so the context is provably NOT the
// cold one when it reaches the composer.
vi.mock('../services/studentNeedLoader', async (orig) => ({
  ...(await orig<typeof import('../services/studentNeedLoader')>()),
  loadStudentNeedBase: vi.fn(async () => ({
    rating: 1500, studentColor: 'white', openingId: null, gamesPlayed: 5, signals: [], bookDepartures: [],
    capabilities: new Map(), games: [], analysed: [], inOpening: [], names: {},
  })),
}));
const computePositionFacts = vi.fn(async (_input: unknown) => ({ clauses: [], remember: [], importance: { speak: true, rank: 50, tier: 'none' }, speaks: true }));
vi.mock('../services/positionFacts', () => ({
  computePositionFacts: (input: unknown) => computePositionFacts(input),
  clauseText: () => [],
}));

const { useLiveCoach } = await import('./useLiveCoach');

const FEN_BEFORE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FEN_AFTER = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1';
const move = (ply: number): PlayerMoveNotification => ({
  ply, san: 'Nf3', fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER,
  evalBefore: 20, evalAfter: 120, bestMoveEval: 130, bestMoveSan: 'Nf3',
  isBestMove: false, bestMoveWasTactical: true, hasHangingPiece: false,
  historySans: ['Nf3'], bestMoveUci: 'g1f3', bestPvUci: ['g1f3', 'g8f6'], replyPvUci: ['g8f6', 'd2d4'],
});

type Seen = {
  lastMove?: { fenBefore: string; san: string; cpLoss: number | null; reads: { historySans: readonly string[]; bestMoveUci: string | null; bestPvUci?: readonly string[]; playedPvUci?: readonly string[]; evalBeforeWhiteCp?: number; evalAfterWhiteCp?: number; missedMate?: number | null; allowedMate?: number | null } | null };
  studentNeedContext?: { gamesPlayed: number } | null;
};

beforeEach(() => { computePositionFacts.mockClear(); groundedMoveFeedback.mockClear(); });

describe('useLiveCoach hands the composer the student model (B3)', () => {
  it('the STUDENT\'s move reaches the composer as raw board data with its REAL cost, beside the loaded need context', async () => {
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g1', playerColor: 'white', getHistory: () => ['Nf3'] }));
    await vi.waitFor(() => expect(computePositionFacts).not.toHaveBeenCalled());
    // Let the base land so the context is the loaded one, not cold.
    await new Promise((r) => setTimeout(r, 10));
    result.current.notifyPlayerMove(move(1));
    await vi.waitFor(() => expect(computePositionFacts).toHaveBeenCalledTimes(1));
    const seen = computePositionFacts.mock.calls[0][0] as Seen;
    // bestMoveEval 130 → played 120, White POV: the move cost 10cp.
    expect(seen.lastMove).toMatchObject({ fenBefore: FEN_BEFORE, san: 'Nf3', cpLoss: 10 });
    expect(seen.studentNeedContext?.gamesPlayed, 'the loaded context, not the cold one').toBe(5);
  });

  it('C4: the STUDENT\'s move carries the raw engine reads whole — the composer attributes the fundamental, the hook composes nothing', async () => {
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g3', playerColor: 'white', getHistory: () => ['Nf3'] }));
    await new Promise((r) => setTimeout(r, 10));
    result.current.notifyPlayerMove(move(1));
    await vi.waitFor(() => expect(computePositionFacts).toHaveBeenCalledTimes(1));
    const seen = computePositionFacts.mock.calls[0][0] as Seen;
    expect(seen.lastMove?.reads).toEqual({
      historySans: ['Nf3'], bestMoveUci: 'g1f3', bestPvUci: ['g1f3', 'g8f6'], playedPvUci: ['g8f6', 'd2d4'],
      evalBeforeWhiteCp: 20, evalAfterWhiteCp: 120, missedMate: null, allowedMate: null,
    });
  });

  it('the OPPONENT\'s move never reaches the composer as the student\'s; the context still does', async () => {
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g2', playerColor: 'white', getHistory: () => ['Nf3', 'Nf6'] }));
    await new Promise((r) => setTimeout(r, 10));
    result.current.notifyOpponentMove({ ply: 2, san: 'Nf6', fenAfter: 'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2', evalBefore: 120, evalAfter: 120 });
    await vi.waitFor(() => expect(computePositionFacts).toHaveBeenCalledTimes(1));
    const seen = computePositionFacts.mock.calls[0][0] as Seen;
    expect(seen.lastMove).toBeUndefined();
    expect(seen.studentNeedContext?.gamesPlayed).toBe(5);
  });
});
