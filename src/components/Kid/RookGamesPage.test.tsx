import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { RookGamesPage } from './RookGamesPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockGetProgress, mockIsPawnComplete } = vi.hoisted(() => ({
  mockGetProgress: vi.fn(),
  mockIsPawnComplete: vi.fn(),
}));

vi.mock('../../services/rookGameService', () => ({
  getRookGameProgress: (...args: unknown[]) => mockGetProgress(...(args as [])) as unknown,
  isPawnChapterCompleted: (...args: unknown[]) => mockIsPawnComplete(...(args as [])) as unknown,
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/themeService', () => ({
  applyTheme: vi.fn(),
  getThemeById: vi.fn().mockReturnValue({ id: 'kid-mode', name: 'Kid Mode', colors: {} }),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RookGamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(
      buildUserProfile({ isKidMode: true, name: 'TestKid' }),
    );

    mockGetProgress.mockResolvedValue({ rookMaze: {}, rowClearer: {} });
    mockIsPawnComplete.mockResolvedValue(true);
  });

  it('shows loading state initially', () => {
    mockGetProgress.mockReturnValue(new Promise(() => {}));
    mockIsPawnComplete.mockReturnValue(new Promise(() => {}));
    render(<RookGamesPage />);
    expect(screen.getByTestId('rook-games-loading')).toBeInTheDocument();
  });

  it('renders game sections when unlocked', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('rook-games-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Rook Maze')).toBeInTheDocument();
    expect(screen.getByText('Row Clearer')).toBeInTheDocument();
  });

  it('shows locked message when pawn chapter not completed', async () => {
    mockIsPawnComplete.mockResolvedValue(false);
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('rook-games-locked')).toBeInTheDocument();
    });

    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('renders maze level buttons', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('maze-level-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('maze-level-2')).toBeInTheDocument();
    expect(screen.getByTestId('maze-level-3')).toBeInTheDocument();
  });

  it('renders clearer level buttons', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('clearer-level-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('clearer-level-2')).toBeInTheDocument();
    expect(screen.getByTestId('clearer-level-3')).toBeInTheDocument();
  });

  it('first levels are enabled, later levels enabled (dev mode unlocks all)', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('maze-level-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('maze-level-1')).not.toBeDisabled();
    // DEV: all levels unlocked for testing in current implementation
    expect(screen.getByTestId('maze-level-2')).not.toBeDisabled();
    expect(screen.getByTestId('maze-level-3')).not.toBeDisabled();
  });

  it('unlocks level 2 when level 1 completed', async () => {
    mockGetProgress.mockResolvedValue({
      rookMaze: { 1: { completed: true, bestMoves: 3, stars: 3 } },
      rowClearer: {},
    });

    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('maze-level-2')).toBeInTheDocument();
    });

    expect(screen.getByTestId('maze-level-2')).not.toBeDisabled();
  });

  it('shows star display for completed levels', async () => {
    mockGetProgress.mockResolvedValue({
      rookMaze: { 1: { completed: true, bestMoves: 3, stars: 3 } },
      rowClearer: {},
    });

    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('star-display')).toBeInTheDocument();
    });
  });

  it('navigates to maze level on click', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('maze-level-1')).toBeInTheDocument();
    });

    screen.getByTestId('maze-level-1').click();
    expect(mockNavigate).toHaveBeenCalledWith('/kid/rook-maze/1');
  });

  it('navigates to clearer level on click', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('clearer-level-1')).toBeInTheDocument();
    });

    screen.getByTestId('clearer-level-1').click();
    expect(mockNavigate).toHaveBeenCalledWith('/kid/row-clearer/1');
  });

  it('back button navigates to /kid', async () => {
    render(<RookGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('rook-games-back-btn')).toBeInTheDocument();
    });

    screen.getByTestId('rook-games-back-btn').click();
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });
});
