import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { MiniGameHubPage } from './MiniGameHubPage';

const mockGetProgress = vi.fn().mockResolvedValue(null);
vi.mock('../../services/miniGameService', () => ({
  getMiniGameProgress: (...args: unknown[]): unknown => mockGetProgress(...args),
  isLevelUnlocked: vi.fn().mockReturnValue(true),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('MiniGameHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProgress.mockResolvedValue(null);
  });

  it('renders hub page with title', () => {
    render(<MiniGameHubPage />);

    expect(screen.getByTestId('mini-game-hub')).toBeInTheDocument();
    expect(screen.getByText('Mini-Games')).toBeInTheDocument();
  });

  it('shows Pawn Wars section', () => {
    render(<MiniGameHubPage />);

    expect(screen.getByText('Pawn Wars')).toBeInTheDocument();
    expect(
      screen.getByText('Race your pawns to the other side!'),
    ).toBeInTheDocument();
  });

  it('shows Blocker section', () => {
    render(<MiniGameHubPage />);

    expect(screen.getByText('Blocker')).toBeInTheDocument();
    expect(
      screen.getByText('Stop the enemy pawn while promoting yours!'),
    ).toBeInTheDocument();
  });

  it('shows 6 level select cards total (3 per game)', () => {
    render(<MiniGameHubPage />);

    const levelCards = screen.getAllByTestId(/^level-select-/);
    expect(levelCards).toHaveLength(6);
  });

  it('back button navigates to /kid', () => {
    render(<MiniGameHubPage />);

    fireEvent.click(screen.getByTestId('hub-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });

  it('clicking level 1 of pawn wars navigates to /kid/mini-games/pawn-wars/1', () => {
    render(<MiniGameHubPage />);

    // Pawn Wars is first section, so the first level-select-1 belongs to it
    const levelOneCards = screen.getAllByTestId('level-select-1');
    fireEvent.click(levelOneCards[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/kid/mini-games/pawn-wars/1');
  });

  it('loads progress for both games on mount', async () => {
    render(<MiniGameHubPage />);

    await waitFor(() => {
      expect(mockGetProgress).toHaveBeenCalledWith('pawn-wars');
      expect(mockGetProgress).toHaveBeenCalledWith('blocker');
    });
  });

  it('shows level 1 unlocked by default', () => {
    render(<MiniGameHubPage />);

    const levelOneCards = screen.getAllByTestId('level-select-1');
    // Level 1 buttons should not be disabled
    for (const card of levelOneCards) {
      expect(card).not.toBeDisabled();
    }
  });

  it('clicking level 2 of blocker navigates to /kid/mini-games/blocker/2', () => {
    render(<MiniGameHubPage />);

    // Blocker is the second section, so the second level-select-2 belongs to it
    const levelTwoCards = screen.getAllByTestId('level-select-2');
    fireEvent.click(levelTwoCards[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/kid/mini-games/blocker/2');
  });

  it('renders all 3 pawn wars levels with correct titles', () => {
    render(<MiniGameHubPage />);

    expect(screen.getByText('Pawn Skirmish')).toBeInTheDocument();
    expect(screen.getByText('Pawn Clash')).toBeInTheDocument();
    expect(screen.getByText('Pawn Battle')).toBeInTheDocument();
  });
});
