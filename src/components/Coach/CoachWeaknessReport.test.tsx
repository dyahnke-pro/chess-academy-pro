import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { CoachWeaknessReport } from './CoachWeaknessReport';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { WeaknessProfile } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetStoredWeaknessProfile = vi.fn();
const mockComputeWeaknessProfile = vi.fn();

vi.mock('../../services/weaknessAnalyzer', () => ({
  getStoredWeaknessProfile: (...args: unknown[]): unknown => mockGetStoredWeaknessProfile(...args),
  computeWeaknessProfile: (...args: unknown[]): unknown => mockComputeWeaknessProfile(...args),
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
    { category: 'tactics', label: 'Fork Recognition', metric: '32% accuracy', severity: 75, detail: 'Struggles with knight forks' },
    { category: 'openings', label: 'Italian Game', metric: '40% win rate', severity: 55, detail: 'Below average results' },
    { category: 'endgame', label: 'Pawn Endings', metric: '60% accuracy', severity: 30, detail: 'Doing okay' },
  ],
  strengths: ['Strong pin tactics', 'Good calculation speed'],
  overallAssessment: 'Focus on tactical patterns and opening preparation.',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CoachWeaknessReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    mockComputeWeaknessProfile.mockResolvedValue(mockProfile);
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

  it('shows strengths card when strengths exist', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(mockProfile);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('strengths-card')).toBeInTheDocument();
    });

    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText('Strong pin tactics')).toBeInTheDocument();
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

  it('expanding a weakness item shows detail text and Practice button', async () => {
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

    expect(screen.getByTestId('practice-btn')).toBeInTheDocument();
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

    const updatedProfile: WeaknessProfile = {
      ...mockProfile,
      overallAssessment: 'Updated assessment after recompute.',
    };
    mockComputeWeaknessProfile.mockResolvedValue(updatedProfile);

    fireEvent.click(screen.getByTestId('refresh-btn'));

    await waitFor(() => {
      expect(mockComputeWeaknessProfile).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Updated assessment after recompute.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no stored profile', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    setupProfile();
    render(<CoachWeaknessReport />);

    await waitFor(() => {
      expect(screen.getByTestId('report-empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/No data yet/)).toBeInTheDocument();
    expect(screen.getByText('Compute Now')).toBeInTheDocument();
  });
});
