import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoachAnalysePage } from './CoachAnalysePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

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

const mockProfile = buildUserProfile({
  id: 'main',
  name: 'Player',
  currentRating: 1420,
  puzzleRating: 1400,
});

describe('CoachAnalysePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
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

  it('shows header with Position Analysis', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByText(/Position Analysis/)).toBeInTheDocument();
  });

  it('renders follow-up input', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });
});
