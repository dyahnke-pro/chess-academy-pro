import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PlayerMoveNotification } from './useLiveCoach';

// The live-coach trigger fires a `grounded_voice` DeepSeek call via
// groundedMoveFeedback. David 2026-07-11 asked whether the narration re-fire
// was also spiking DeepSeek cost. The in-flight / per-ply guards in the hook
// are useRefs that RESET on remount, so a remount (OTA reload churn) could
// re-fire the same ply's DeepSeek call. These tests prove the store-backed
// dedup (a Zustand singleton that survives remounts) closes that.

const groundedMoveFeedback = vi.fn(async (..._a: unknown[]) => 'A knight jumps into d5.');
vi.mock('../services/coachApi', () => ({ groundedMoveFeedback: (...a: unknown[]) => groundedMoveFeedback(...a) }));
vi.mock('../services/liveTacticsContext', () => ({ buildFedTacticsContext: vi.fn(async (..._a: unknown[]) => null) }));
// Fen-aware so a single test can hand the hook a REAL engine line (the
// concept fires-for-real test below); everything else keeps the flat default.
const cachedAnalysisByFen: Record<string, unknown> = {};
vi.mock('./stockfishFenCache', () => ({ getCachedStockfish: (fen: string) => cachedAnalysisByFen[fen] ?? { bestMove: 'd2d4', evaluation: 120, isMate: false } }));
// No engine in a hook test: positionFacts' null-move probe must fail closed
// (it is wrapped in try/catch) instead of reaching for a Worker.
vi.mock('../services/stockfishEngine', () => ({ stockfishEngine: { evalBoard: async () => { throw new Error('no engine in test'); } } }));
vi.mock('../services/coachAnswerGates', () => ({ applyCandidateArrows: async (t: string) => t }));
vi.mock('../services/voiceService', () => ({ voiceService: { stop: vi.fn(), speakForced: vi.fn(async (..._a: unknown[]) => undefined) } }));
vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('../services/skillScaling', () => ({ alertSensitivityMultiplier: () => 1 }));
vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { currentRating: 1500, skillRadar: { tactics: 1500 } } }) },
}));

// Force a trigger so handleTrigger always runs.
vi.mock('../services/liveCoachTriggers', () => ({
  evaluatePlayerMoveTriggers: () => ({ winner: { trigger: 'great-move' }, suppressed: [] }),
  evaluateOpponentMoveTriggers: () => ({ winner: null }),
}));

// Controllable conversation history + append.
let history: Array<{ surface: string; gameId?: string; ply?: number }> = [];
const appendConversationMessage = vi.fn();
vi.mock('../stores/coachMemoryStore', () => ({
  useCoachMemoryStore: {
    getState: () => ({ conversationHistory: history, appendConversationMessage }),
  },
}));

// Imported AFTER the mocks are registered.
const { useLiveCoach } = await import('./useLiveCoach');

const move = (ply: number): PlayerMoveNotification => ({
  ply,
  san: 'Nf3',
  fenAfter: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
  evalBefore: 20,
  evalAfter: 120,
  bestMoveEval: 130,
  bestMoveSan: 'Nf3',
  isBestMove: true,
  bestMoveWasTactical: true,
  hasHangingPiece: false,
});

describe('useLiveCoach — DeepSeek re-fire guard', () => {
  beforeEach(() => {
    history = [];
    groundedMoveFeedback.mockClear();
  });

  it('fires the grounded_voice call once for a fresh ply', async () => {
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g1', playerColor: 'white' }));
    result.current.notifyPlayerMove(move(7));
    await vi.waitFor(() => expect(groundedMoveFeedback).toHaveBeenCalledTimes(1));
  });

  it('does NOT re-fire the DeepSeek call after a remount when the store already has this gameId+ply', async () => {
    // Simulate: the coach already spoke on gameId g1, ply 7 (persisted in the
    // Zustand singleton) — then CoachGamePage remounts (fresh hook, empty refs).
    history = [{ surface: 'live-coach', gameId: 'g1', ply: 7 }];
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g1', playerColor: 'white' }));
    result.current.notifyPlayerMove(move(7));
    // Give any async work a chance to run, then assert no call was made.
    await new Promise((r) => setTimeout(r, 20));
    expect(groundedMoveFeedback).not.toHaveBeenCalled();
  });

  it('a different gameId at the same ply is NOT deduped (new game speaks)', async () => {
    history = [{ surface: 'live-coach', gameId: 'OTHER', ply: 7 }];
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g1', playerColor: 'white' }));
    result.current.notifyPlayerMove(move(7));
    await vi.waitFor(() => expect(groundedMoveFeedback).toHaveBeenCalledTimes(1));
  });
});

describe('the COMPUTED CONCEPT reaches the Learn live coach (P4c — a wire that fires)', () => {
  beforeEach(() => {
    history = [];
    groundedMoveFeedback.mockClear();
  });

  it('hands the fork the engine line lands to the grounded chokepoint as a computed fact', async () => {
    // Student is BLACK and just moved; white to move. The engine's line is
    // h3 then ...Ne4+, a royal fork on Kd2 and the winnable Rc3. Probed
    // through conceptForBoard with this exact analysis before it was pinned.
    const FEN_AFTER = '6k1/8/3n4/8/8/2R5/3K3P/8 w - - 0 40';
    cachedAnalysisByFen[FEN_AFTER] = {
      bestMove: 'h2h3', evaluation: -250, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 1,
      topLines: [{ rank: 1, evaluation: -250, moves: ['h2h3', 'd6e4'], mate: null }],
    };
    const { result } = renderHook(() => useLiveCoach({ gameId: 'g-concept', playerColor: 'black' }));
    result.current.notifyPlayerMove({ ...move(11), san: 'Kg8', fenAfter: FEN_AFTER });
    await vi.waitFor(() => expect(groundedMoveFeedback).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const call = (groundedMoveFeedback.mock.calls[0] as unknown[])[0] as { extraFacts?: string };
    expect(call.extraFacts ?? '', 'the concept clause never reached the chokepoint').toMatch(/a fork hits two targets at once/);
    // Play/Learn commentary stays descriptive: never "you must defend" here.
    expect(call.extraFacts ?? '').not.toMatch(/\b(we|our|us)\b/i);
  });
});
