import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { TacticsPage } from './TacticsPage';
import { db } from '../../db/schema';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetStoredTacticalProfile = vi.fn();
const mockGetTacticDrillCounts = vi.fn();
const mockGetContextDepth = vi.fn();

vi.mock('../../services/tacticalProfileService', () => ({
  getStoredTacticalProfile: (): unknown => mockGetStoredTacticalProfile(),
  tacticTypeLabel: (t: string): string => t.replace(/_/g, ' '),
  tacticTypeIcon: (): string => '⚔️',
}));

vi.mock('../../services/tacticDrillService', () => ({
  getTacticDrillCounts: (): unknown => mockGetTacticDrillCounts(),
}));

vi.mock('../../services/tacticCreateService', () => ({
  getContextDepth: (): unknown => mockGetContextDepth(),
}));

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TacticsPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.clearAllMocks();

    mockGetStoredTacticalProfile.mockResolvedValue(null);
    mockGetTacticDrillCounts.mockResolvedValue(new Map());
    mockGetContextDepth.mockResolvedValue(8);
  });

  it('renders the 4-layer training hub', async () => {
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tactics Training')).toBeInTheDocument();
    });

    expect(screen.getByText('4-layer program built from your games')).toBeInTheDocument();
  });

  it('renders all 4 layer cards', async () => {
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('layer-1-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('layer-2-card')).toBeInTheDocument();
    expect(screen.getByTestId('layer-3-card')).toBeInTheDocument();
    expect(screen.getByTestId('layer-4-card')).toBeInTheDocument();
  });

  it('shows layer titles', async () => {
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Spot')).toBeInTheDocument();
    });

    expect(screen.getByText('Drill')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('shows drill count stat when drills available', async () => {
    const counts = new Map([['fork', 5], ['pin', 3]]);
    mockGetTacticDrillCounts.mockResolvedValue(counts);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('8 tactic drills available')).toBeInTheDocument();
    });
  });

  it('shows context depth when profile exists', async () => {
    mockGetStoredTacticalProfile.mockResolvedValue({
      computedAt: new Date().toISOString(),
      stats: [{ tacticType: 'fork', puzzleAccuracy: 80, puzzleAttempts: 10, gameMissCount: 5, gameSpotCount: 2, gameTotalOccurrences: 7, gameSpotRate: 0.28, gap: 52, byPhase: {}, byOpening: {} }],
      totalGamesMissed: 5,
      totalGamesAnalyzed: 10,
      weakestTypes: ['fork', 'pin'],
    });
    mockGetContextDepth.mockResolvedValue(12);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Context: 12 moves')).toBeInTheDocument();
    });
  });

  it('shows profile summary when profile exists', async () => {
    mockGetStoredTacticalProfile.mockResolvedValue({
      computedAt: new Date().toISOString(),
      stats: [{ tacticType: 'fork', puzzleAccuracy: 80, puzzleAttempts: 10, gameMissCount: 5, gameSpotCount: 2, gameTotalOccurrences: 7, gameSpotRate: 0.28, gap: 52, byPhase: {}, byOpening: {} }],
      totalGamesMissed: 5,
      totalGamesAnalyzed: 10,
      weakestTypes: ['fork', 'pin'],
    });
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/10 games analyzed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/5 tactical positions found/)).toBeInTheDocument();
  });

  it('does not show summary when no profile', async () => {
    mockGetStoredTacticalProfile.mockResolvedValue(null);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tactics Training')).toBeInTheDocument();
    });

    expect(screen.queryByText(/games analyzed/)).not.toBeInTheDocument();
  });
});
