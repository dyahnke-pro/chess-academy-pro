import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { DashboardPage } from './DashboardPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile, buildSessionRecord, buildOpeningRecord } from '../../test/factories';
import { db } from '../../db/schema';
import type { UserProfile } from '../../types';
import type { PuzzleStats } from '../../services/puzzleService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetPuzzleStats = vi.fn<() => Promise<PuzzleStats | null>>();
const mockGetRecentSessions = vi.fn();
const mockUpdateStreak = vi.fn();
const mockCreateSession = vi.fn();
const mockCheckAndAwardAchievements = vi.fn();
const mockGetFavoriteOpenings = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../services/puzzleService', () => ({
  getPuzzleStats: (): unknown => mockGetPuzzleStats(),
}));

vi.mock('../../services/sessionGenerator', () => ({
  getRecentSessions: (...args: unknown[]): unknown => mockGetRecentSessions(...args),
  updateStreak: (...args: unknown[]): unknown => mockUpdateStreak(...args),
  createSession: (...args: unknown[]): unknown => mockCreateSession(...args),
}));

vi.mock('../../services/gamificationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/gamificationService')>(
    '../../services/gamificationService',
  );
  return {
    ...actual,
    checkAndAwardAchievements: (...args: unknown[]): unknown => mockCheckAndAwardAchievements(...args),
  };
});

vi.mock('../../services/openingService', () => ({
  getFavoriteOpenings: (...args: unknown[]): unknown => mockGetFavoriteOpenings(...args),
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>(
    '../../services/themeService',
  );
  return { ...actual, applyTheme: vi.fn() };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPuzzleStats(overrides: Partial<PuzzleStats> = {}): PuzzleStats {
  return {
    totalAttempted: 42,
    totalCorrect: 30,
    overallAccuracy: 0.714,
    averageRating: 1350,
    totalPuzzles: 500,
    duePuzzles: 12,
    ...overrides,
  };
}

function setProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const profile = buildUserProfile(overrides);
  useAppStore.getState().setActiveProfile(profile);
  return profile;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
    vi.clearAllMocks();

    mockGetPuzzleStats.mockResolvedValue(null);
    mockGetRecentSessions.mockResolvedValue([]);
    mockGetFavoriteOpenings.mockResolvedValue([]);
    mockUpdateStreak.mockResolvedValue({ currentStreak: 0, longestStreak: 0 });
    mockCheckAndAwardAchievements.mockResolvedValue([]);
    mockCreateSession.mockResolvedValue(buildSessionRecord());
  });

  it('renders the dashboard container when profile is set', async () => {
    setProfile();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('renders empty fragment when no active profile', () => {
    render(<DashboardPage />);
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('displays the profile name in the greeting', async () => {
    setProfile({ name: 'Bobby' });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Bobby/)).toBeInTheDocument();
    });
  });

  it('displays the greeting with time of day', async () => {
    setProfile({ name: 'TestUser' });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Good (morning|afternoon|evening), TestUser/)).toBeInTheDocument();
    });
  });

  it('shows streak display', async () => {
    setProfile({ currentStreak: 7 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('7 day streak')).toBeInTheDocument();
    });
  });

  it('shows level card with level value', async () => {
    setProfile({ level: 3 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Lv 3')).toBeInTheDocument();
      expect(screen.getByText('Knight')).toBeInTheDocument();
    });
  });

  it('shows XP progress bar and XP values', async () => {
    setProfile({ xp: 250 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('xp-progress-bar')).toBeInTheDocument();
      expect(screen.getByText('250/500 XP')).toBeInTheDocument();
    });
  });

  it('shows XP stat card', async () => {
    setProfile({ xp: 1200 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('1,200')).toBeInTheDocument();
    });
  });

  it('shows puzzle rating stat card', async () => {
    setProfile({ puzzleRating: 1600 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('1600')).toBeInTheDocument();
      expect(screen.getByText('Puzzle Rating')).toBeInTheDocument();
    });
  });

  it('shows ELO rating stat card', async () => {
    setProfile({ currentRating: 1500 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('ELO')).toBeInTheDocument();
    });
  });

  it('renders Start Session button', async () => {
    setProfile();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('start-session-btn')).toBeInTheDocument();
      expect(screen.getByText('Start Session')).toBeInTheDocument();
    });
  });

  it('Start Session button calls createSession and navigates', async () => {
    const profile = setProfile();
    const session = buildSessionRecord({ profileId: profile.id });
    mockCreateSession.mockResolvedValue(session);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('start-session-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('start-session-btn'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(profile);
      expect(mockNavigate).toHaveBeenCalledWith('/openings');
    });
  });

  it('renders quick action navigation buttons', async () => {
    setProfile();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('quick-action-openings')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-play')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-coach')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-import')).toBeInTheDocument();
    });
  });

  it('quick action buttons navigate to correct routes', async () => {
    setProfile();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('quick-action-openings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quick-action-openings'));
    expect(mockNavigate).toHaveBeenCalledWith('/openings');

    fireEvent.click(screen.getByTestId('quick-action-play'));
    expect(mockNavigate).toHaveBeenCalledWith('/play');

    fireEvent.click(screen.getByTestId('quick-action-coach'));
    expect(mockNavigate).toHaveBeenCalledWith('/coach');

    fireEvent.click(screen.getByTestId('quick-action-import'));
    expect(mockNavigate).toHaveBeenCalledWith('/games');
  });

  it('shows puzzle stats when data is available', async () => {
    setProfile();
    mockGetPuzzleStats.mockResolvedValue(buildPuzzleStats());
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Puzzle Progress')).toBeInTheDocument();
    });
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('71%')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('hides puzzle stats when totalAttempted is 0', async () => {
    setProfile();
    mockGetPuzzleStats.mockResolvedValue(buildPuzzleStats({ totalAttempted: 0 }));
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Puzzle Progress')).not.toBeInTheDocument();
  });

  it('hides puzzle stats when no data returned', async () => {
    setProfile();
    mockGetPuzzleStats.mockResolvedValue(null);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Puzzle Progress')).not.toBeInTheDocument();
  });

  it('shows recent sessions when available', async () => {
    setProfile();
    const sessions = [
      buildSessionRecord({ id: 's1', date: '2026-03-01', puzzlesSolved: 5, xpEarned: 100, completed: true }),
      buildSessionRecord({ id: 's2', date: '2026-03-02', puzzlesSolved: 3, xpEarned: 75, completed: false }),
    ];
    mockGetRecentSessions.mockResolvedValue(sessions);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    });
    expect(screen.getByText('2026-03-01')).toBeInTheDocument();
    expect(screen.getByText('5 puzzles')).toBeInTheDocument();
    expect(screen.getByText('100 XP')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('hides recent sessions when empty', async () => {
    setProfile();
    mockGetRecentSessions.mockResolvedValue([]);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Recent Sessions')).not.toBeInTheDocument();
  });

  it('renders skill overview with all five skills', async () => {
    setProfile({
      skillRadar: { opening: 60, tactics: 70, endgame: 40, memory: 55, calculation: 65 },
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Skill Overview')).toBeInTheDocument();
    });
    expect(screen.getByText('opening')).toBeInTheDocument();
    expect(screen.getByText('tactics')).toBeInTheDocument();
    expect(screen.getByText('endgame')).toBeInTheDocument();
    expect(screen.getByText('memory')).toBeInTheDocument();
    expect(screen.getByText('calculation')).toBeInTheDocument();
  });

  it('does not show beta banner when BETA_MODE is false', async () => {
    setProfile();
    await db.meta.delete('beta_banner_dismissed');
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('beta-banner')).not.toBeInTheDocument();
  });

  it('does not show beta banner when already dismissed', async () => {
    setProfile();
    await db.meta.put({ key: 'beta_banner_dismissed', value: 'true' });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('beta-banner')).not.toBeInTheDocument();
  });

  it('shows Today\'s Training card with session duration', async () => {
    setProfile({ preferences: { dailySessionMinutes: 30 } as UserProfile['preferences'] });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Today's Training")).toBeInTheDocument();
      expect(screen.getByText(/~30 min/)).toBeInTheDocument();
    });
  });

  it('shows favorites section when favorite openings exist', async () => {
    setProfile();
    const favOpening = buildOpeningRecord({ id: 'fav-1', name: 'Italian Game', isFavorite: true });
    mockGetFavoriteOpenings.mockResolvedValue([favOpening]);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('favorites-section')).toBeInTheDocument();
      expect(screen.getByText('Favorite Openings')).toBeInTheDocument();
      expect(screen.getByTestId('favorite-opening-fav-1')).toBeInTheDocument();
    });
  });

  it('hides favorites section when no favorites exist', async () => {
    setProfile();
    mockGetFavoriteOpenings.mockResolvedValue([]);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('favorites-section')).not.toBeInTheDocument();
  });

  it('favorite opening card navigates to opening detail', async () => {
    setProfile();
    const favOpening = buildOpeningRecord({ id: 'fav-1', name: 'Italian Game', isFavorite: true });
    mockGetFavoriteOpenings.mockResolvedValue([favOpening]);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('favorite-opening-fav-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('favorite-opening-fav-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/openings/fav-1');
  });
});
