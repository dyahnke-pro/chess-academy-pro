import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { KnightGamesPage } from './KnightGamesPage';

const mockGetGameProgress = vi.fn();

vi.mock('../../services/journeyService', () => ({
  getGameProgress: (...args: unknown[]): unknown => mockGetGameProgress(...args),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

describe('KnightGamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows locked state when bishop chapter not completed', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {
        pawn: { completed: true },
        rook: { completed: true },
        bishop: { completed: false },
      },
      currentChapterId: 'bishop',
      startedAt: new Date().toISOString(),
      completedAt: null,
    });

    render(<KnightGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('knight-games-locked')).toBeInTheDocument();
    });
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText(/Complete the Bishop chapter/)).toBeInTheDocument();
  });

  it('shows locked state when no journey progress exists', async () => {
    mockGetGameProgress.mockResolvedValue(null);

    render(<KnightGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('knight-games-locked')).toBeInTheDocument();
    });
  });

  it('shows game cards when bishop chapter completed', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {
        pawn: { completed: true },
        rook: { completed: true },
        bishop: { completed: true },
      },
      currentChapterId: 'knight',
      startedAt: new Date().toISOString(),
      completedAt: null,
    });

    render(<KnightGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('leap-frog-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('knight-sweep-card')).toBeInTheDocument();
    expect(screen.getByText('Leap Frog')).toBeInTheDocument();
    expect(screen.getByText('Knight Sweep')).toBeInTheDocument();
  });

  it('has back button that navigates to /kid', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: { bishop: { completed: true } },
      currentChapterId: 'knight',
      startedAt: new Date().toISOString(),
      completedAt: null,
    });

    render(<KnightGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('knight-games-page')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('has voice toggle button', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: { bishop: { completed: true } },
      currentChapterId: 'knight',
      startedAt: new Date().toISOString(),
      completedAt: null,
    });

    render(<KnightGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('voice-toggle')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('voice-toggle'));
    expect(screen.getByLabelText('Unmute voice')).toBeInTheDocument();
  });
});
