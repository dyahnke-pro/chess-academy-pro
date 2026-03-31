import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { CoachHomePage } from './CoachHomePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { WeaknessProfile } from '../../types';

const mockGetStoredWeaknessProfile = vi.fn();
const mockComputeWeaknessProfile = vi.fn();

vi.mock('../../services/weaknessAnalyzer', () => ({
  getStoredWeaknessProfile: (...args: unknown[]): unknown =>
    mockGetStoredWeaknessProfile(...args),
  computeWeaknessProfile: (...args: unknown[]): unknown =>
    mockComputeWeaknessProfile(...args),
}));

vi.mock('../../services/chesscomService', () => ({
  importChessComGames: vi.fn().mockResolvedValue(5),
}));

vi.mock('../../services/lichessService', () => ({
  importLichessGames: vi.fn().mockResolvedValue(3),
}));

vi.mock('../../services/voiceInputService', () => ({
  voiceInputService: {
    isSupported: vi.fn().mockReturnValue(false),
    startListening: vi.fn().mockReturnValue(false),
    stopListening: vi.fn(),
    onResult: vi.fn(),
  },
}));

const mockWeaknessProfile: WeaknessProfile = {
  computedAt: new Date().toISOString(),
  items: [
    {
      category: 'tactics',
      label: 'Fork Recognition',
      metric: '32% accuracy',
      severity: 75,
      detail: 'Struggles with knight forks',
    },
    {
      category: 'openings',
      label: 'Italian Game',
      metric: '40% win rate',
      severity: 55,
      detail: 'Below average results',
    },
    {
      category: 'endgame',
      label: 'Rook Endgames',
      metric: '25% accuracy',
      severity: 80,
      detail: 'Needs endgame practice',
    },
  ],
  strengths: ['Strong pin tactics', 'Good calculation speed'],
  strengthItems: [],
  overallAssessment: 'Focus on tactical patterns.',
};

describe('CoachHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    mockComputeWeaknessProfile.mockResolvedValue(null);
  });

  function setupProfile(): void {
    const profile = buildUserProfile({ level: 1 });
    useAppStore.getState().setActiveProfile(profile);
  }

  it('renders coach home page container', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-home-page')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    setupProfile();
    mockGetStoredWeaknessProfile.mockReturnValue(new Promise(() => {})); // never resolves
    render(<CoachHomePage />);

    expect(screen.getByTestId('weakness-loading')).toBeInTheDocument();
    expect(screen.getByText('Analysing your data...')).toBeInTheDocument();
  });

  it('shows weakness cards when profile data exists', async () => {
    setupProfile();
    mockGetStoredWeaknessProfile.mockResolvedValue(mockWeaknessProfile);

    render(<CoachHomePage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('weakness-card');
      expect(cards).toHaveLength(3);
    });
  });

  it('shows game import card when no weakness data', async () => {
    setupProfile();
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    mockComputeWeaknessProfile.mockResolvedValue(null);

    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-import-card')).toBeInTheDocument();
    });

    // Should show import card instead of old empty state
    expect(screen.queryByText('Play some games and solve puzzles to unlock insights')).not.toBeInTheDocument();
  });

  it('renders all primary action buttons', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-play')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-report')).toBeInTheDocument();
    });

    expect(screen.getByTestId('coach-action-play')).toHaveTextContent(
      'Play & Review',
    );
    expect(screen.getByTestId('coach-action-report')).toHaveTextContent(
      'Weakness Report',
    );
  });

  it('renders all secondary action buttons', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-plan')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-analyse')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-chat')).toBeInTheDocument();
    });

    expect(screen.getByTestId('coach-action-plan')).toHaveTextContent(
      'Training Plan',
    );
    expect(screen.getByTestId('coach-action-analyse')).toHaveTextContent(
      'Analyse',
    );
    expect(screen.getByTestId('coach-action-chat')).toHaveTextContent('Chat');
  });

  it('shows "View Full Report" link when weakness data exists', async () => {
    setupProfile();
    mockGetStoredWeaknessProfile.mockResolvedValue(mockWeaknessProfile);

    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('view-full-report')).toBeInTheDocument();
    });

    expect(screen.getByTestId('view-full-report')).toHaveTextContent(
      'View Full Report',
    );
  });

  it('weakness cards show correct data', async () => {
    setupProfile();
    mockGetStoredWeaknessProfile.mockResolvedValue(mockWeaknessProfile);

    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('weakness-card')).toHaveLength(3);
    });

    // Check labels
    expect(screen.getByText('Fork Recognition')).toBeInTheDocument();
    expect(screen.getByText('Italian Game')).toBeInTheDocument();
    expect(screen.getByText('Rook Endgames')).toBeInTheDocument();

    // Check metrics
    expect(screen.getByText('32% accuracy')).toBeInTheDocument();
    expect(screen.getByText('40% win rate')).toBeInTheDocument();
    expect(screen.getByText('25% accuracy')).toBeInTheDocument();

    // Check severity bars exist
    const severityBars = screen.getAllByTestId('severity-bar');
    expect(severityBars).toHaveLength(3);

    // Check train buttons exist
    const trainButtons = screen.getAllByTestId('train-btn');
    expect(trainButtons).toHaveLength(3);
    for (const btn of trainButtons) {
      expect(btn).toHaveTextContent('Train');
    }
  });

  it('import card shows both platform tabs', async () => {
    setupProfile();
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    mockComputeWeaknessProfile.mockResolvedValue(null);

    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-chesscom')).toBeInTheDocument();
      expect(screen.getByTestId('tab-lichess')).toBeInTheDocument();
    });
  });
});
