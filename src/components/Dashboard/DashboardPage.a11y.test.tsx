import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// Mock all service deps
vi.mock('../../services/sessionGenerator', () => ({
  createSession: vi.fn().mockResolvedValue({ id: 'test-session' }),
  updateStreak: vi.fn().mockResolvedValue({ currentStreak: 5, longestStreak: 10 }),
  getRecentSessions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/puzzleService', () => ({
  getPuzzleStats: vi.fn().mockResolvedValue({
    total: 100,
    solved: 50,
    accuracy: 75,
    duePuzzles: 10,
    totalAttempted: 50,
    totalCorrect: 38,
    averageRating: 1400,
  }),
}));

vi.mock('../../services/gamificationService', () => ({
  checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
  getLevelTitle: vi.fn().mockReturnValue('Apprentice'),
  getXpToNextLevel: vi.fn().mockReturnValue({ current: 250, needed: 500, percent: 50 }),
}));

vi.mock('../../services/openingService', () => ({
  getFavoriteOpenings: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../db/schema', () => ({
  db: {
    meta: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    },
  },
}));

vi.mock('../../utils/constants', () => ({
  BETA_MODE: false,
}));

const { DashboardPage } = await import('./DashboardPage');

describe('DashboardPage a11y', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    const profile = buildUserProfile({
      id: 'main',
      name: 'TestPlayer',
      level: 3,
      currentRating: 1500,
      puzzleRating: 1450,
      xp: 750,
      currentStreak: 5,
    });
    useAppStore.getState().setActiveProfile(profile);
  });

  it('has h1 heading with greeting', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('TestPlayer');
    });
  });

  it('has h2 heading for training section', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Today's Training")).toBeInTheDocument();
    });
  });

  it('start session button is accessible', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const btn = screen.getByTestId('start-session-btn');
      expect(btn).toBeInTheDocument();
      expect(btn.textContent).toContain('Start Session');
    });
  });

  it('displays streak information', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/5 day streak/)).toBeInTheDocument();
    });
  });

  it('stat cards contain meaningful text', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Puzzle Rating')).toBeInTheDocument();
      expect(screen.getByText('ELO')).toBeInTheDocument();
      expect(screen.getByText('XP')).toBeInTheDocument();
    });
  });

  it('dashboard has data-testid', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });
});
