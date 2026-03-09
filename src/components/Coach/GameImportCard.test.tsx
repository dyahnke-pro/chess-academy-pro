import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { GameImportCard } from './GameImportCard';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

const mockImportChessComGames = vi.fn();
const mockImportChessComStats = vi.fn();
const mockImportLichessGames = vi.fn();
const mockImportLichessStats = vi.fn();

vi.mock('../../services/chesscomService', () => ({
  importChessComGames: (...args: unknown[]): unknown =>
    mockImportChessComGames(...args),
  importChessComStats: (...args: unknown[]): unknown =>
    mockImportChessComStats(...args),
}));

vi.mock('../../services/lichessService', () => ({
  importLichessGames: (...args: unknown[]): unknown =>
    mockImportLichessGames(...args),
  importLichessStats: (...args: unknown[]): unknown =>
    mockImportLichessStats(...args),
}));

describe('GameImportCard', () => {
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockImportChessComGames.mockResolvedValue(5);
    mockImportChessComStats.mockResolvedValue({
      platform: 'chesscom',
      username: 'testplayer',
      fetchedAt: new Date().toISOString(),
      rapid: { rating: 1500, best: 1600, wins: 100, losses: 80, draws: 20 },
    });
    mockImportLichessGames.mockResolvedValue(3);
    mockImportLichessStats.mockResolvedValue({
      platform: 'lichess',
      username: 'testplayer',
      fetchedAt: new Date().toISOString(),
    });

    const profile = buildUserProfile({ id: 'main', name: 'Player' });
    useAppStore.setState({ activeProfile: profile });
  });

  it('renders the import card', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByTestId('game-import-card')).toBeInTheDocument();
  });

  it('shows Chess.com tab as active by default', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByTestId('tab-chesscom')).toBeInTheDocument();
    expect(screen.getByTestId('tab-lichess')).toBeInTheDocument();
    expect(screen.getByText(/Connect Your Chess.com Account/)).toBeInTheDocument();
  });

  it('switches to Lichess tab when clicked', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.click(screen.getByTestId('tab-lichess'));
    expect(screen.getByText(/Connect Your Lichess Account/)).toBeInTheDocument();
  });

  it('renders username input', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByTestId('import-username-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Chess.com username')).toBeInTheDocument();
  });

  it('shows Lichess placeholder when on Lichess tab', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.click(screen.getByTestId('tab-lichess'));
    expect(screen.getByPlaceholderText('Lichess username')).toBeInTheDocument();
  });

  it('renders import button', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByTestId('import-btn')).toBeInTheDocument();
    expect(screen.getByTestId('import-btn')).toHaveTextContent('Import');
  });

  it('import button is disabled when username is empty', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByTestId('import-btn')).toBeDisabled();
  });

  it('import button enables when username is entered', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'testplayer' },
    });
    expect(screen.getByTestId('import-btn')).not.toBeDisabled();
  });

  it('shows success message after importing games', async () => {
    mockImportChessComGames.mockResolvedValue(5);

    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'testplayer' },
    });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-success')).toBeInTheDocument();
      expect(screen.getByText(/Imported 5 games/)).toBeInTheDocument();
      expect(mockOnImportComplete).toHaveBeenCalledWith(5);
    });
  });

  it('shows stats summary after import', async () => {
    mockImportChessComGames.mockResolvedValue(5);
    mockImportChessComStats.mockResolvedValue({
      platform: 'chesscom',
      username: 'testplayer',
      fetchedAt: new Date().toISOString(),
      rapid: { rating: 1500, best: 1600, wins: 100, losses: 80, draws: 20 },
      blitz: { rating: 1400, best: 1500, wins: 200, losses: 180, draws: 40 },
    });

    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'testplayer' },
    });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-stats')).toBeInTheDocument();
    });
  });

  it('shows error message on import failure', async () => {
    mockImportChessComGames.mockRejectedValue(new Error('Player "nonexistent_user" not found on Chess.com'));

    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'nonexistent_user' },
    });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/not found/)).toBeInTheDocument();
    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });

  it('shows zero-game message when all games already imported', async () => {
    mockImportChessComGames.mockResolvedValue(0);

    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'testplayer' },
    });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-success')).toBeInTheDocument();
    });

    expect(screen.getByText(/No new games to import/)).toBeInTheDocument();
  });

  it('calls Lichess import when on Lichess tab', async () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.click(screen.getByTestId('tab-lichess'));
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'lichess_player' },
    });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(mockImportLichessGames).toHaveBeenCalledWith('lichess_player', expect.any(Function));
    });
  });

  it('shows description text', () => {
    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByText(/Import your games and stats/)).toBeInTheDocument();
  });

  it('pre-fills username from saved preferences', () => {
    const profile = buildUserProfile({
      id: 'main',
      name: 'Player',
      preferences: { chessComUsername: 'saveduser' },
    });
    useAppStore.setState({ activeProfile: profile });

    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    expect(screen.getByTestId('import-username-input')).toHaveValue('saveduser');
  });

  it('still shows success even if stats fetch fails', async () => {
    mockImportChessComGames.mockResolvedValue(10);
    mockImportChessComStats.mockRejectedValue(new Error('Stats unavailable'));

    render(<GameImportCard onImportComplete={mockOnImportComplete} />);
    fireEvent.change(screen.getByTestId('import-username-input'), {
      target: { value: 'testplayer' },
    });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-success')).toBeInTheDocument();
      expect(screen.getByText(/Imported 10 games/)).toBeInTheDocument();
    });
  });
});
