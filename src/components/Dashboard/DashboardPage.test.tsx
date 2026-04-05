import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { DashboardPage } from './DashboardPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';
import type { UserProfile } from '../../types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockUpdateStreak = vi.fn();

vi.mock('../../services/sessionGenerator', () => ({
  updateStreak: (...args: unknown[]): unknown => mockUpdateStreak(...args),
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    mockUpdateStreak.mockResolvedValue({ currentStreak: 0, longestStreak: 0 });
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

  it('shows the app title', async () => {
    setProfile();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Chess Academy Pro')).toBeInTheDocument();
    });
  });

  it('shows all section buttons', async () => {
    setProfile();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('section-openings')).toBeInTheDocument();
      expect(screen.getByTestId('section-play-with-coach')).toBeInTheDocument();
      expect(screen.getByTestId('section-tactics')).toBeInTheDocument();
      expect(screen.getByTestId('section-weaknesses')).toBeInTheDocument();
    });
  });

  it('section buttons navigate to correct routes', async () => {
    setProfile();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('section-openings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('section-openings'));
    expect(mockNavigate).toHaveBeenCalledWith('/openings');

    fireEvent.click(screen.getByTestId('section-play-with-coach'));
    expect(mockNavigate).toHaveBeenCalledWith('/coach/play');

    fireEvent.click(screen.getByTestId('section-tactics'));
    expect(mockNavigate).toHaveBeenCalledWith('/tactics');

    fireEvent.click(screen.getByTestId('section-weaknesses'));
    expect(mockNavigate).toHaveBeenCalledWith('/weaknesses');
  });

  it('does not show stats, sessions, or streak cards', async () => {
    setProfile({ currentStreak: 7, puzzleRating: 1600 });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Puzzle Rating')).not.toBeInTheDocument();
    expect(screen.queryByText('Game ELO')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Sessions')).not.toBeInTheDocument();
    expect(screen.queryByText('Puzzle Progress')).not.toBeInTheDocument();
  });
});
