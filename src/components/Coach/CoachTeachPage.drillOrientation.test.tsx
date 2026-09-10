/**
 * Regression: a coach in-place drill must orient the board to the drill's
 * side to move (David 2026-09-10). PostHog + a live repro showed a
 * black-to-move weakness drill rendering White-at-bottom, so every piece the
 * student naturally reached for was the wrong colour → the move was illegal
 * and silently rejected → "unable to move any pieces after the coach set up
 * tactical sequences". The fix: loadDrillOntoBoard sets the board orientation
 * (and playerColor) to drill.playerColor. This test seeds a BLACK-to-move
 * mistake, loads /coach/teach?drill=mistakes, and asserts the board flips to
 * black orientation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { CoachTeachPage } from './CoachTeachPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';
import type { MistakePuzzle } from '../../types';

// react-chessboard: expose the board orientation as a data attribute so the
// test can read which side is at the bottom.
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { boardOrientation?: string; position?: string } }) => (
    <div
      data-testid="mock-board"
      data-orientation={options?.boardOrientation}
      data-position={options?.position}
    />
  ),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speakForced: vi.fn().mockResolvedValue(undefined),
    speakForcedPollyOnly: vi.fn().mockResolvedValue(undefined),
    speakQueuedForced: vi.fn(),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    warmup: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../coach/coachService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../coach/coachService')>();
  return { ...actual, coachService: { ask: vi.fn().mockResolvedValue({ text: '', toolCallIds: [], dispatchedToolNames: [], provider: 'anthropic' }) } };
});

vi.mock('../../services/gameAnalysisService', () => ({
  analyzeRecentGames: vi.fn().mockResolvedValue(0),
  gameNeedsAnalysis: vi.fn().mockReturnValue(false),
}));

vi.mock('../../services/stockfishEngine', () => {
  const analysis = { bestMove: 'e2e4', evaluation: 0, isMate: false, mateIn: null, depth: 12, topLines: [], nodesPerSecond: 0 };
  return {
    stockfishEngine: {
      analyzePosition: vi.fn().mockResolvedValue(analysis),
      analyzeWithBudget: vi.fn().mockResolvedValue(analysis),
      isBusy: vi.fn(() => false),
      newGame: vi.fn(),
    },
    resolveWorkerUrl: vi.fn(() => ({ url: '', variant: 'single', reason: 'test', workerType: 'classic' })),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

function makeBlackToMoveMistake(): MistakePuzzle {
  return {
    id: 'drill-orient-black-1',
    // Black to move; best move ...Nc6.
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    playerMove: 'd7d5', playerMoveSan: 'd5',
    bestMove: 'b8c6', bestMoveSan: 'Nc6',
    moves: 'b8c6',
    cpLoss: 300,
    classification: 'mistake', gamePhase: 'opening', moveNumber: 1,
    sourceGameId: 'g1', sourceMode: 'review',
    playerColor: 'black',
    promptText: 'Find the best move.',
    narration: { intro: '', success: '', failure: '' },
    createdAt: new Date().toISOString(),
    opponentName: null, gameDate: null, openingName: null, evalBefore: null,
    srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0,
    srsDueDate: '2020-01-01', srsLastReview: null,
    status: 'learning', attempts: 0, successes: 0,
    tacticType: 'fork', positionalMotif: null,
  } as MistakePuzzle;
}

function renderAt(path: string): void {
  rtlRender(
    <MemoryRouter initialEntries={[path]}>
      <MotionConfig transition={{ duration: 0 }}>
        <CoachTeachPage />
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('CoachTeachPage — drill board orientation (regression 2026-09-10)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile({ name: 'Player', aiDataConsent: 'granted' }));
    await db.mistakePuzzles.put(makeBlackToMoveMistake());
  });

  it('orients the board to Black when a black-to-move drill loads', async () => {
    renderAt('/coach/teach?drill=mistakes');
    // The board starts White-oriented; once the drill loads it must flip to the
    // drill's side (Black), so the student's pieces are at the bottom.
    await waitFor(
      () => {
        const board = screen.getByTestId('mock-board');
        expect(board.getAttribute('data-orientation')).toBe('black');
      },
      { timeout: 8000 },
    );
  });
});
