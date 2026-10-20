import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { Chess } from 'chess.js';
import { CoachGamePage } from './CoachGamePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';
import { saveCoachPlayState } from '../../services/coachPlayPersistence';
import type { CoachGameMove } from '../../types';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    speakForced: vi.fn().mockResolvedValue(undefined),
    speakForcedPollyOnly: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/voiceInputService', () => ({
  voiceInputService: {
    isSupported: vi.fn().mockReturnValue(false),
    startListening: vi.fn().mockReturnValue(false),
    stopListening: vi.fn(),
    onResult: vi.fn(),
  },
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    newGame: vi.fn(),
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 12,
      topLines: [{ rank: 1, evaluation: 30, moves: ['e2e4'], mate: null }],
      nodesPerSecond: 1000000,
    }),
    queueAnalysis: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 16,
      topLines: [{ rank: 1, evaluation: 30, moves: ['e2e4'], mate: null }],
      nodesPerSecond: 1000000,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    // useEnginePonder polls isBusy() on an interval; async tests give that
    // interval time to fire, so the mock must provide it (real method:
    // stockfishEngine.isBusy, engine line ~1153).
    isBusy: vi.fn(() => false),
    analyzeWithBudget: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 12,
      topLines: [{ rank: 1, evaluation: 30, moves: ['e2e4'], mate: null }],
      nodesPerSecond: 1000000,
    }),
  },
}));

vi.mock('../../services/coachGameEngine', () => ({
  // Post-tightening (WO-BRAIN-04): the move-selector no longer calls
  // getAdaptiveMove or tryOpeningBookMove — the brain owns the move
  // via coachService.ask. getRandomLegalMove is the safety fallback
  // when the brain emits no play_move.
  getTargetStrength: vi.fn().mockReturnValue(1320),
  // The one owner of "how strong is this student as a player" — the real one
  // prefers the rating they SET over their puzzle rating (see its note).
  studentPlayingRating: vi.fn((p) => p?.currentRating ?? p?.puzzleRating ?? 1200),
  getRandomLegalMove: vi.fn().mockReturnValue('e7e5'),
  // The mount prewarm of the home steer (walk 4) — a no-op here; the steer has its own gates.
  prewarmTeachingReplies: vi.fn(),
}));

vi.mock('../../coach/coachService', () => ({
  // Render-only tests don't reach the move-selector path, but the
  // module import has to resolve. Default ask is a no-op.
  coachService: {
    ask: vi.fn().mockResolvedValue({
      text: '',
      toolCallIds: [],
      provider: 'deepseek',
    }),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('Good move!'),
  getCoachChatResponse: vi.fn().mockResolvedValue('Sure, I can help with that position.'),
}));

vi.mock('../../services/coachTemplates', () => ({
  getScenarioTemplate: vi.fn().mockReturnValue('Sure, take it back.'),
  getMoveCommentaryTemplate: vi.fn().mockReturnValue('Solid choice.'),
}));

vi.mock('../../services/coachPrompts', () => ({
  EXPLORE_REACTION_ADDITION: 'Test explore reaction prompt',
  SYSTEM_PROMPT: 'Test system prompt',
  // LIVE-COACH-01 system-prompt additions consumed by useLiveCoach.
  // Render-only tests don't exercise these branches, but the module
  // import has to resolve.
}));

vi.mock('../../services/openingDetectionService', () => ({
  detectOpening: vi.fn().mockReturnValue(null),
  isBookLine: vi.fn().mockReturnValue(false),
  getOpeningMoves: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/boardUtils', () => ({
  getCapturedPieces: vi.fn().mockReturnValue({ white: [], black: [] }),
  getMaterialAdvantage: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/accuracyService', () => ({
  calculateAccuracy: vi.fn().mockReturnValue({ white: 85, black: 78, moveCount: 20 }),
  gameAccuracy: vi.fn().mockReturnValue({ white: 85, black: 78, moveCount: 20 }),
  getClassificationCounts: vi.fn().mockReturnValue({
    brilliant: 0, great: 2, good: 8, book: 0, inaccuracy: 1, mistake: 0, blunder: 0,
  }),
  capEval: (evalCp: number) => {
    if (evalCp >= 20000) return 1500;
    if (evalCp <= -20000) return -1500;
    return evalCp;
  },
  cpLossToAccuracy: (cpLoss: number) => {
    const raw = 103.1668 * Math.exp(-0.009 * cpLoss) - 3.1668;
    return Math.max(0, Math.min(100, raw));
  },
}));

vi.mock('../../services/gamePhaseService', () => ({
  getPhaseBreakdown: vi.fn().mockReturnValue([
    { phase: 'opening', accuracy: 90, moveCount: 5, mistakes: 0 },
    { phase: 'middlegame', accuracy: 80, moveCount: 10, mistakes: 1 },
    { phase: 'endgame', accuracy: 85, moveCount: 5, mistakes: 0 },
  ]),
  // Used by autoAnalyzeGameMisconceptions (pulled into the graph via the
  // game-end capture). Material-based phase classifier.
  classifyPhase: vi.fn().mockReturnValue('middlegame'),
}));

vi.mock('../../services/missedTacticService', () => ({
  detectMissedTactics: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/coachFeatureService', () => ({
  segmentNamedArrows: () => [],
  detectBadHabitsFromGame: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));


vi.mock('react-chessboard', async (orig) => ({
  ...(await orig<typeof import('react-chessboard')>()),
  Chessboard: () => null,
}));

const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'];

function seedGame(): Promise<void> {
  const c = new Chess();
  const moves: CoachGameMove[] = SANS.map((san, i) => {
    const before = c.fen();
    const mv = c.move(san);
    return { moveNumber: Math.floor(i / 2) + 1, san: mv.san, fen: c.fen(), fenBefore: before, isCoachMove: i % 2 === 1, commentary: '', evaluation: 0, classification: null, expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: null } as unknown as CoachGameMove;
  });
  return saveCoachPlayState({
    fen: c.fen(), sans: SANS, lastMove: null,
    gameState: { gameId: 'game-abandoned', playerColor: 'white', targetStrength: 1400, moves, hintsUsed: 0, currentHintLevel: 0, takebacksUsed: 0, status: 'playing', result: 'ongoing', keyMoments: [] },
    clock: null, playerColor: 'white', difficulty: 'medium', subject: null, halfMoveCount: SANS.length, updatedAt: Date.now(),
  });
}

describe('CoachGamePage — a game left mid-way still reaches the record (persistent memory)', () => {
  beforeEach(async () => {
    db.close(); await db.delete(); await db.open();
    useAppStore.setState({ activeProfile: buildUserProfile({ id: 'main', name: 'Player', currentRating: 1420 }) });
  });

  it('Restart on a game in progress saves it, unfinished', async () => {
    await seedGame();
    render(<CoachGamePage />);
    await waitFor(() => expect(screen.getByTestId('restart-btn')).not.toBeDisabled(), { timeout: 4000 });
    fireEvent.click(screen.getByTestId('restart-btn'));
    await waitFor(async () => {
      const g = await db.games.get('game-abandoned');
      expect(g?.result).toBe('*');
      expect(g?.pgn.split(' ').length).toBe(SANS.length);
    }, { timeout: 4000 });
  }, 20000);
});
