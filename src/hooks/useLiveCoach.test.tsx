import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PlayerMoveNotification } from './useLiveCoach';

// The live-coach trigger fires a `grounded_voice` DeepSeek call via
// groundedMoveFeedback. David 2026-07-11 asked whether the narration re-fire
// was also spiking DeepSeek cost. The in-flight / per-ply guards in the hook
// are useRefs that RESET on remount, so a remount (OTA reload churn) could
// re-fire the same ply's DeepSeek call. These tests prove the store-backed
// dedup (a Zustand singleton that survives remounts) closes that.

const groundedMoveFeedback = vi.fn(async () => 'A knight jumps into d5.');
vi.mock('../services/coachApi', () => ({ groundedMoveFeedback: (...a: unknown[]) => groundedMoveFeedback(...a) }));
vi.mock('../services/liveTacticsContext', () => ({ buildFedTacticsContext: vi.fn(async () => null) }));
vi.mock('./stockfishFenCache', () => ({ getCachedStockfish: () => ({ bestMove: 'd2d4', evaluation: 120, isMate: false }) }));
vi.mock('../services/coachAnswerGates', () => ({ applyCandidateArrows: async (t: string) => t }));
vi.mock('../services/voiceService', () => ({ voiceService: { stop: vi.fn(), speakForced: vi.fn(async () => undefined) } }));
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
