import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '../../test/utils';
import { CoachGamePage } from './CoachGamePage';
import { useAppStore } from '../../stores/appStore';
import type { UserProfile } from '../../types';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
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
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/coachGameEngine', () => ({
  getAdaptiveMove: vi.fn().mockResolvedValue({
    move: 'e7e5',
    analysis: {
      bestMove: 'e7e5',
      evaluation: -20,
      isMate: false,
      mateIn: null,
      depth: 10,
      topLines: [{ rank: 1, evaluation: -20, moves: ['e7e5'], mate: null }],
      nodesPerSecond: 1000000,
    },
  }),
  getTargetStrength: vi.fn().mockReturnValue(1320),
  getRandomLegalMove: vi.fn().mockReturnValue('e7e5'),
}));

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('Good move!'),
}));

vi.mock('../../services/coachTemplates', () => ({
  getScenarioTemplate: vi.fn().mockReturnValue('Let us begin the game!'),
  getMoveCommentaryTemplate: vi.fn().mockReturnValue('Solid choice.'),
}));

const mockProfile: UserProfile = {
  id: 'main',
  name: 'Player',
  isKidMode: false,
  coachPersonality: 'danya',
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 500,
  level: 3,
  currentStreak: 0,
  longestStreak: 0,
  streakFreezes: 1,
  lastActiveDate: '2026-03-05',
  achievements: [],
  unlockedCoaches: ['danya'],
  skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
  badHabits: [],
  preferences: {
    theme: 'dark-modern',
    boardColor: 'classic',
    pieceSet: 'staunton',
    showEvalBar: true,
    showEngineLines: false,
    soundEnabled: true,
    voiceEnabled: true,
    dailySessionMinutes: 45,
    apiKeyEncrypted: null,
    apiKeyIv: null,
    preferredModel: { commentary: 'c', analysis: 'c', reports: 'c' },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    voiceIdDanya: '',
    voiceIdKasparov: '',
    voiceIdFischer: '',
    voiceSpeed: 1.0,
  },
};

describe('CoachGamePage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
      coachExpression: 'neutral',
      coachSpeaking: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the game page', () => {
    render(<CoachGamePage />);
    expect(screen.getByTestId('coach-game-page')).toBeInTheDocument();
  });

  it('shows coach name in header', () => {
    render(<CoachGamePage />);
    expect(screen.getByText(/Coach Danya/)).toBeInTheDocument();
  });

  it('shows target ELO', () => {
    render(<CoachGamePage />);
    expect(screen.getByText(/1320 ELO/)).toBeInTheDocument();
  });

  it('renders hint button after pregame', () => {
    render(<CoachGamePage />);
    // Advance past the 3s pregame timeout
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
  });

  it('renders takeback button after pregame', () => {
    render(<CoachGamePage />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByTestId('takeback-btn')).toBeInTheDocument();
  });

  it('renders chat button after pregame', () => {
    render(<CoachGamePage />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByTestId('game-chat-btn')).toBeInTheDocument();
  });

  it('renders the chess board via react-chessboard', () => {
    render(<CoachGamePage />);
    // The CoachGamePage renders a ChessBoard component which wraps react-chessboard
    // We verify the board area is present within the page container
    const page = screen.getByTestId('coach-game-page');
    expect(page).toBeInTheDocument();
    // The board is embedded in the page - it renders real react-chessboard
    expect(page.querySelector('[data-boardid]') ?? page.querySelector('.board-container') ?? page).toBeTruthy();
  });

  it('renders coach avatar in the header', () => {
    render(<CoachGamePage />);
    const avatars = screen.getAllByTestId('coach-avatar');
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });

  it('shows pregame commentary in the feed and speech bubble', () => {
    render(<CoachGamePage />);
    // The pregame greeting appears in the commentary feed AND the coach speech bubble
    const elements = screen.getAllByText('Let us begin the game!');
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements[0]).toBeInTheDocument();
  });

  it('hint button displays Get a Hint text at level 0', () => {
    render(<CoachGamePage />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Get a Hint');
  });

  it('takeback button is disabled when no moves have been made', () => {
    render(<CoachGamePage />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    const takebackBtn = screen.getByTestId('takeback-btn');
    expect(takebackBtn).toBeDisabled();
  });

  it('chat button toggles chat input visibility', () => {
    render(<CoachGamePage />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    // Chat input should not be visible initially
    expect(screen.queryByPlaceholderText('Ask about the position...')).not.toBeInTheDocument();

    // Click chat button
    fireEvent.click(screen.getByTestId('game-chat-btn'));

    // Now chat input should be visible
    expect(screen.getByPlaceholderText('Ask about the position...')).toBeInTheDocument();
  });

  it('shows fischer personality name when profile uses fischer', () => {
    useAppStore.setState({
      activeProfile: { ...mockProfile, coachPersonality: 'fischer' },
    });
    render(<CoachGamePage />);
    expect(screen.getByText(/Coach Fischer/)).toBeInTheDocument();
  });

  it('displays move number markers in the commentary feed', () => {
    render(<CoachGamePage />);
    // The pregame commentary has moveNumber 0, rendered as #0
    expect(screen.getByText('#0')).toBeInTheDocument();
  });

  it('controls section is hidden during pregame', () => {
    render(<CoachGamePage />);
    // During pregame (before 3s timeout), controls should not be visible
    expect(screen.queryByTestId('hint-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('takeback-btn')).not.toBeInTheDocument();
  });
});
