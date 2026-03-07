import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoachAnalysePage } from './CoachAnalysePage';
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
      depth: 18,
      topLines: [
        { rank: 1, evaluation: 30, moves: ['e2e4'], mate: null },
        { rank: 2, evaluation: 20, moves: ['d2d4'], mate: null },
      ],
      nodesPerSecond: 1000000,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('This position is equal.'),
}));

const mockProfile: UserProfile = {
  id: 'main',
  name: 'Player',
  isKidMode: false,
  coachPersonality: 'danya',
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 0,
  level: 1,
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
    highlightLastMove: true,
    showLegalMoves: true,
    showCoordinates: true,
    pieceAnimationSpeed: 'medium',
    boardOrientation: true,
    moveQualityFlash: true,
    showHints: true,
    moveMethod: 'both',
    moveConfirmation: false,
    autoPromoteQueen: true,
    masterAllOff: false,
  },
};

describe('CoachAnalysePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
      coachExpression: 'neutral',
    });
  });

  it('renders the analyse page', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('coach-analyse-page')).toBeInTheDocument();
  });

  it('shows FEN input field', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('fen-input')).toBeInTheDocument();
  });

  it('shows analyse button', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('load-fen-btn')).toBeInTheDocument();
  });

  it('shows header with coach name', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByText(/Position Analysis with Danya/)).toBeInTheDocument();
  });

  it('renders follow-up input', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });
});
