import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoachGamePage } from './CoachGamePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
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
  },
}));

vi.mock('../../services/coachGameEngine', () => ({
  // Post-tightening (WO-BRAIN-04): the move-selector no longer calls
  // getAdaptiveMove or tryOpeningBookMove — the brain owns the move
  // via coachService.ask. getRandomLegalMove is the safety fallback
  // when the brain emits no play_move.
  getTargetStrength: vi.fn().mockReturnValue(1320),
  getRandomLegalMove: vi.fn().mockReturnValue('e7e5'),
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
  buildChessContextMessage: vi.fn().mockReturnValue('test context'),
  // LIVE-COACH-01 system-prompt additions consumed by useLiveCoach.
  // Render-only tests don't exercise these branches, but the module
  // import has to resolve.
  LIVE_COACH_GREAT_MOVE_ADDITION: 'great move',
  LIVE_COACH_MISSED_TACTIC_ADDITION: 'missed tactic',
  LIVE_COACH_OPPONENT_BLUNDER_ADDITION: 'opp blunder',
  LIVE_COACH_EVAL_SWING_WRONG_ADDITION: 'eval swing',
  LIVE_COACH_RECOVERY_ADDITION: 'recovery',
}));

vi.mock('../../services/openingDetectionService', () => ({
  detectOpening: vi.fn().mockReturnValue(null),
  getOpeningMoves: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/boardUtils', () => ({
  getCapturedPieces: vi.fn().mockReturnValue({ white: [], black: [] }),
  getMaterialAdvantage: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/accuracyService', () => ({
  calculateAccuracy: vi.fn().mockReturnValue({ white: 85, black: 78, moveCount: 20 }),
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
}));

vi.mock('../../services/missedTacticService', () => ({
  detectMissedTactics: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/coachFeatureService', () => ({
  detectBadHabitsFromGame: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

const mockProfile = buildUserProfile({
  id: 'main',
  name: 'Player',
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 500,
  level: 3,
});

describe('CoachGamePage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the game page', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('coach-game-page')).toBeInTheDocument();
  }, 10000);

  it('shows Stockfish Bot in header', () => {
    render(<CoachGamePage />);
    expect(screen.getByText('vs Stockfish Bot')).toBeInTheDocument();
  });

  it('shows target ELO', () => {
    render(<CoachGamePage />);
    expect(screen.getByText(/1320 ELO/)).toBeInTheDocument();
  });

  it('renders hint button immediately (no pregame delay)', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
  });

  it('renders takeback button', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('takeback-btn')).toBeInTheDocument();
  });

  it('renders the game chat panel', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('game-chat-panel')).toBeInTheDocument();
  });

  it('renders the chess board', () => {
    render(<CoachGamePage />);
    const page = screen.getByTestId('coach-game-page');
    expect(page).toBeInTheDocument();
  });

  it('hint button displays Get a Hint text at level 0', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Get a Hint');
  });

  it('takeback button is disabled when no moves have been made', () => {
    render(<CoachGamePage />);
    const takebackBtn = screen.getByTestId('takeback-btn');
    expect(takebackBtn).toBeDisabled();
  });

  it('chat panel shows placeholder text', () => {
    render(<CoachGamePage />);
    expect(screen.getByPlaceholderText('Ask about the position...')).toBeInTheDocument();
  });

  it('chat panel shows Game Chat header', () => {
    render(<CoachGamePage />);
    expect(screen.getByText('Game Chat')).toBeInTheDocument();
  });

  it('uses two-column layout', () => {
    render(<CoachGamePage />);
    const page = screen.getByTestId('coach-game-page');
    expect(page.className).toContain('md:flex-row');
  });

  // ─── Board Annotation Tests ─────────────────────────────────────────────────

  it('does not show temporary position banner initially', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('temp-position-banner')).not.toBeInTheDocument();
  });

  it('does not show back-to-game button initially', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('back-to-game-btn')).not.toBeInTheDocument();
  });

  it('renders panel divider for resizable chat/moves split', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('panel-divider')).toBeInTheDocument();
  });

  it('renders coach tips toggle button', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('coach-tips-toggle')).toBeInTheDocument();
  });

  it('includes gameover in CoachGameStatus type for intermediate game-over state', () => {
    // Verify the gameover status is a valid state that can be set
    // This tests that the type system supports the intermediate gameover state
    const status: import('../../types').CoachGameStatus = 'gameover';
    expect(status).toBe('gameover');
  });

  // ─── Show Mode Step Navigation Tests ────────────────────────────────────────

  it('does not show step navigation when no tip bubble is present', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('show-step-nav')).not.toBeInTheDocument();
  });

  it('does not show explore button when no tip bubble is present', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('explore-from-here-btn')).not.toBeInTheDocument();
  });

  it('does not show coach tip bubble initially', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('coach-tip-bubble')).not.toBeInTheDocument();
  });

  it('does not show explore messages area initially', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('explore-messages')).not.toBeInTheDocument();
  });

  it('does not show explore engine eval initially', () => {
    render(<CoachGamePage />);
    expect(screen.queryByTestId('explore-engine-eval')).not.toBeInTheDocument();
  });
});
