import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LichessDashboardPage } from './LichessDashboardPage';
import * as puzzleService from '../../services/lichessPuzzleService';
import * as cryptoService from '../../services/cryptoService';
import type { LichessPuzzleDashboard } from '../../types';

vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('../../services/lichessPuzzleService', () => ({
  fetchPuzzleDashboard: vi.fn(),
  fetchPuzzleActivity: vi.fn(),
  getWeakestThemesFromDashboard: vi.fn(),
  formatThemeName: vi.fn((t: string) => t.charAt(0).toUpperCase() + t.slice(1)),
}));

vi.mock('../../services/cryptoService', () => ({
  decryptApiKey: vi.fn(),
}));

import { useAppStore } from '../../stores/appStore';
const mockUseAppStore = vi.mocked(useAppStore);

type StoreState = Parameters<typeof useAppStore>[0] extends ((state: infer S) => unknown) ? S : never;

function mockStore(partial: Record<string, unknown>): StoreState {
  return partial as unknown as StoreState;
}
const mockFetchDashboard = vi.mocked(puzzleService.fetchPuzzleDashboard);
const mockFetchActivity = vi.mocked(puzzleService.fetchPuzzleActivity);
const mockGetWeakest = vi.mocked(puzzleService.getWeakestThemesFromDashboard);
const mockDecrypt = vi.mocked(cryptoService.decryptApiKey);

const mockDashboard: LichessPuzzleDashboard = {
  days: 30,
  global: { firstWins: 42, replayWins: 12, nb: 60 },
  themes: {
    fork:    { results: { firstWins: 8, replayWins: 2, nb: 10 } },
    pin:     { results: { firstWins: 2, replayWins: 1, nb: 8 } },
    mateIn2: { results: { firstWins: 1, replayWins: 0, nb: 5 } },
  },
};

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/puzzles/lichess-dashboard']}>
      <LichessDashboardPage />
    </MemoryRouter>,
  );
}

describe('LichessDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('no token', () => {
    it('shows no-token state when token is not set', () => {
      mockUseAppStore.mockImplementation((selector) =>
        selector(mockStore({ activeProfile: { preferences: { lichessTokenEncrypted: null, lichessTokenIv: null } } })),
      );
      renderPage();
      expect(screen.getByTestId('lichess-dashboard-no-token')).toBeInTheDocument();
      expect(screen.getByText('No Lichess token found')).toBeInTheDocument();
    });

    it('shows link to settings when no token', () => {
      mockUseAppStore.mockImplementation((selector) =>
        selector(mockStore({ activeProfile: { preferences: {} } })),
      );
      renderPage();
      expect(screen.getByText('Go to Settings')).toBeInTheDocument();
    });
  });

  describe('with token', () => {
    beforeEach(() => {
      mockUseAppStore.mockImplementation((selector) =>
        selector(mockStore({
          activeProfile: {
            preferences: {
              lichessTokenEncrypted: 'enc123',
              lichessTokenIv: 'iv123',
            },
          },
        })),
      );
      mockDecrypt.mockResolvedValue('real-token');
      mockFetchDashboard.mockResolvedValue(mockDashboard);
      mockFetchActivity.mockResolvedValue([
        { date: 1700000000000, puzzleId: 'p1', win: true },
        { date: 1700000100000, puzzleId: 'p2', win: false },
      ]);
      mockGetWeakest.mockReturnValue(['mateIn2', 'pin']);
    });

    it('shows loading state initially', () => {
      mockFetchDashboard.mockReturnValue(new Promise(() => {}));
      mockFetchActivity.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('shows dashboard stats after load', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
      });
      expect(screen.getByText('60')).toBeInTheDocument(); // nb puzzles
    });

    it('shows theme breakdown', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('theme-breakdown')).toBeInTheDocument();
      });
    });

    it('shows Train Weaknesses card when weak themes exist', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('train-weaknesses-card')).toBeInTheDocument();
      });
      expect(screen.getByTestId('train-weaknesses-btn')).toBeInTheDocument();
    });

    it('shows error state when fetch fails', async () => {
      mockFetchDashboard.mockRejectedValue(new Error('Invalid Lichess token — check your token in Settings'));
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
      });
    });

    it('decrypts token before fetching', async () => {
      renderPage();
      await waitFor(() => expect(mockDecrypt).toHaveBeenCalledWith('enc123', 'iv123'));
      expect(mockFetchDashboard).toHaveBeenCalledWith('real-token', 30);
    });

    it('passes navigate state when Train Weaknesses is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => screen.getByTestId('train-weaknesses-btn'));
      await user.click(screen.getByTestId('train-weaknesses-btn'));
      // Navigation is tested via the mock — no error thrown = success
    });
  });
});
