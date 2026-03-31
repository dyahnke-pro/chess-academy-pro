import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { CoachWeaknessReport } from './CoachWeaknessReport';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { WeaknessProfile } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetStoredWeaknessProfile = vi.fn();
const mockComputeWeaknessProfile = vi.fn();
const mockAnalyzeAllGames = vi.fn();
const mockCountGamesNeedingAnalysis = vi.fn();

vi.mock('../../services/weaknessAnalyzer', () => ({
  getStoredWeaknessProfile: (...args: unknown[]): unknown => mockGetStoredWeaknessProfile(...args),
  computeWeaknessProfile: (...args: unknown[]): unknown => mockComputeWeaknessProfile(...args),
}));

vi.mock('../../services/gameAnalysisService', () => ({
  analyzeAllGames: (...args: unknown[]): unknown => mockAnalyzeAllGames(...args),
  countGamesNeedingAnalysis: (): unknown => mockCountGamesNeedingAnalysis(),
}));

vi.mock('../../db/schema', () => ({
  db: {
    profiles: {
      get: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('../ui/SkillBar', () => ({
  SkillBar: ({ label, value }: { label: string; value: number }): JSX.Element => (
    <div data-testid={`skill-bar-${label.toLowerCase()}`}>{label}: {value}</div>
  ),
}));

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockProfile: WeaknessProfile = {
  computedAt: '2026-03-07T10:00:00.000Z',
  items: [
    {
      category: 'tactics',
      label: 'Fork Recognition',
      metric: '32% accuracy',
      severity: 75,
      detail: 'Struggles with knight forks',
      trainingAction: { route: '/puzzles', buttonLabel: 'Train fork', state: { forcedWeakThemes: ['fork'] } },
    },
    {
      category: 'openings',
      label: 'Italian Game',
      metric: '40% drill accuracy',
      severity: 55,
      detail: 'Below average results',
      trainingAction: { route: '/openings/italian', buttonLabel: 'Drill Italian Game' },
    },
    {
      category: 'endgame',
      label: 'Pawn Endings',
      metric: '60% accuracy',
      severity: 30,
      detail: 'Doing okay',
      trainingAction: { route: '/puzzles', buttonLabel: 'Train Endgames', state: { forcedWeakThemes: ['endgame'] } },
    },
  ],
  strengths: ['Strong pin tactics', 'Good calculation speed'],
  strengthItems: [],
  overallAssessment: 'Focus on tactical patterns and opening preparation.',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CoachWeaknessReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    mockComputeWeaknessProfile.mockResolvedValue(mockProfile);
    mockAnalyzeAllGames.mockResolvedValue(0);
    mockCountGamesNeedingAnalysis.mockResolvedValue(0);
  });

  function setupProfile(): void {
    const profile = buildUserProfile({
      skillRadar: {
        opening: 65,
        tactics: 72,
        endgame: 48,
        memory: 55,
        calculation: 60,
      },
    });
    useAppStore.getState().setActiveProfile(profile);
  }

  it('renders loading state initially', () => {
    mockGetStoredWeaknessProfile.mockReturnValue(new Promise(() => {}));
    setupProfile();
    render(<CoachWeaknessReport />);

    expect(screen.getByTestId('report-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading report...')).toBeInTheDocument();
  });

  it('renders report with weakness data', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('weakness-report')).toBeInTheDocument();
    });

    expect(screen.getByText('Weakness Report')).toBeInTheDocument();
    expect(screen.getByText('Fork Recognition')).toBeInTheDocument();
    expect(screen.getByText('Italian Game')).toBeInTheDocument();
    expect(screen.getByText('Pawn Endings')).toBeInTheDocument();
  });

  it('shows training plan with top 3 actionable weaknesses', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('training-plan')).toBeInTheDocument();
    });

    expect(screen.getByText('Your Training Plan')).toBeInTheDocument();
    const actions = screen.getAllByTestId('training-action');
    expect(actions).toHaveLength(3);
    expect(screen.getByText('Train fork')).toBeInTheDocument();
    expect(screen.getByText('Drill Italian Game')).toBeInTheDocument();
    expect(screen.getByText('Train Endgames')).toBeInTheDocument();
  });

  it('strengths card is collapsed by default', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('strengths-card')).toBeInTheDocument();
    });

    // Strengths header shows count but content is hidden
    expect(screen.getByText('Your Strengths (2)')).toBeInTheDocument();
    expect(screen.queryByText('Strong pin tactics')).not.toBeInTheDocument();
  });

  it('expanding strengths card shows strength items', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('strengths-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Your Strengths (2)'));

    await waitFor(() => {
      expect(screen.getByText('Strong pin tactics')).toBeInTheDocument();
    });
    expect(screen.getByText('Good calculation speed')).toBeInTheDocument();
  });

  it('shows severity badges (Critical for >70, Moderate for 40-70, Minor for <40)', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getAllByTestId('severity-badge')).toHaveLength(3);
    });

    const badges = screen.getAllByTestId('severity-badge');
    expect(badges[0]).toHaveTextContent('Critical');
    expect(badges[1]).toHaveTextContent('Moderate');
    expect(badges[2]).toHaveTextContent('Minor');
  });

  it('expanding a weakness item shows detail text and specific Practice button label', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByText('Fork Recognition')).toBeInTheDocument();
    });

    expect(screen.queryByText('Struggles with knight forks')).not.toBeInTheDocument();

    const weaknessItems = screen.getAllByTestId('weakness-item');
    const firstItemButton = weaknessItems[0].querySelector('button');
    expect(firstItemButton).toBeTruthy();
    fireEvent.click(firstItemButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Struggles with knight forks')).toBeInTheDocument();
    });

    const practiceBtn = screen.getByTestId('practice-btn');
    expect(practiceBtn).toBeInTheDocument();
    expect(practiceBtn).toHaveTextContent('Train fork');
  });

  it('shows skill radar section with skill bars', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-radar')).toBeInTheDocument();
    });

    expect(screen.getByText('Skills Overview')).toBeInTheDocument();
    expect(screen.getByTestId('skill-bar-tactics')).toBeInTheDocument();
    expect(screen.getByTestId('skill-bar-opening')).toBeInTheDocument();
    expect(screen.getByTestId('skill-bar-endgame')).toBeInTheDocument();
    expect(screen.getByTestId('skill-bar-memory')).toBeInTheDocument();
    expect(screen.getByTestId('skill-bar-calculation')).toBeInTheDocument();
  });

  it('shows overall assessment', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('overall-assessment')).toBeInTheDocument();
    });

    expect(screen.getByText('Overall Assessment')).toBeInTheDocument();
    expect(screen.getByText('Focus on tactical patterns and opening preparation.')).toBeInTheDocument();
  });

  it('refresh button triggers recompute', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
    });

    // Wait for auto-recompute to finish
    await waitFor(() => {
      expect(mockComputeWeaknessProfile).toHaveBeenCalled();
    });

    const updatedProfile: WeaknessProfile = {
      ...mockProfile,
      overallAssessment: 'Updated assessment after recompute.',
    };
    mockComputeWeaknessProfile.mockResolvedValue(updatedProfile);

    fireEvent.click(screen.getByTestId('refresh-btn'));

    await waitFor(() => {
      // Called at least twice: once for auto-recompute, once for manual refresh
      expect(mockComputeWeaknessProfile).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('Updated assessment after recompute.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no stored profile and recompute returns empty', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    // Auto-recompute also returns null-like (no items)
    const emptyProfile: WeaknessProfile = {
      computedAt: new Date().toISOString(),
      items: [],
      strengths: [],
      strengthItems: [],
      overallAssessment: '',
    };
    mockComputeWeaknessProfile.mockResolvedValue(emptyProfile);
    // No active profile means no auto-recompute
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('report-empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/No data yet/)).toBeInTheDocument();
    expect(screen.getByText('Compute Now')).toBeInTheDocument();
  });

  it('does not show training plan when no weaknesses have training actions', async () => {
    const noActionProfile: WeaknessProfile = {
      ...mockProfile,
      items: [
        { category: 'tactics', label: 'Generic weakness', metric: '50%', severity: 50, detail: 'Detail' },
      ],
    };
    mockGetStoredWeaknessProfile.mockResolvedValue(noActionProfile);
    mockComputeWeaknessProfile.mockResolvedValue(noActionProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('weakness-report')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('training-plan')).not.toBeInTheDocument();
  });

  it('shows Analyze My Games button when unanalyzed games exist', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    mockCountGamesNeedingAnalysis.mockResolvedValue(5);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('analyze-games-btn')).toBeInTheDocument();
    });

    expect(screen.getByText(/Analyze My Games/)).toBeInTheDocument();
    expect(screen.getByText(/5 unanalyzed/)).toBeInTheDocument();
  });

  it('does not show Analyze My Games button when all games are analyzed', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    mockCountGamesNeedingAnalysis.mockResolvedValue(0);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('weakness-report')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('analyze-games-btn')).not.toBeInTheDocument();
  });

  it('clicking Analyze My Games calls analyzeAllGames', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    mockCountGamesNeedingAnalysis.mockResolvedValue(3);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('analyze-games-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('analyze-games-btn'));

    await waitFor(() => {
      expect(mockAnalyzeAllGames).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show strengths card when no strengths exist', async () => {
    const noStrengthsProfile: WeaknessProfile = {
      ...mockProfile,
      strengths: [],
    };
    mockGetStoredWeaknessProfile.mockResolvedValue(noStrengthsProfile);
    mockComputeWeaknessProfile.mockResolvedValue(noStrengthsProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('weakness-report')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('strengths-card')).not.toBeInTheDocument();
  });
});
