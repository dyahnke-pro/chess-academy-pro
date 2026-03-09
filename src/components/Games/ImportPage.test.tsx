import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { ImportPage } from './ImportPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

const mockImportLichessGames = vi.fn();
const mockImportLichessStats = vi.fn();
const mockImportChessComGames = vi.fn();
const mockImportChessComStats = vi.fn();

vi.mock('../../services/lichessService', () => ({
  importLichessGames: (...args: unknown[]): unknown =>
    mockImportLichessGames(...args),
  importLichessStats: (...args: unknown[]): unknown =>
    mockImportLichessStats(...args),
}));

vi.mock('../../services/chesscomService', () => ({
  importChessComGames: (...args: unknown[]): unknown =>
    mockImportChessComGames(...args),
  importChessComStats: (...args: unknown[]): unknown =>
    mockImportChessComStats(...args),
}));

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImportLichessGames.mockResolvedValue(5);
    mockImportLichessStats.mockResolvedValue({
      platform: 'lichess',
      username: 'testuser',
      fetchedAt: new Date().toISOString(),
    });
    mockImportChessComGames.mockResolvedValue(3);
    mockImportChessComStats.mockResolvedValue({
      platform: 'chesscom',
      username: 'testuser',
      fetchedAt: new Date().toISOString(),
    });

    const profile = buildUserProfile({ id: 'main', name: 'Player' });
    useAppStore.setState({ activeProfile: profile });
  });

  it('renders the import page', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import Games & Stats' })).toBeInTheDocument();
  });

  it('shows platform toggle buttons', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('platform-lichess')).toBeInTheDocument();
    expect(screen.getByTestId('platform-chesscom')).toBeInTheDocument();
  });

  it('shows username input', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('username-input')).toBeInTheDocument();
  });

  it('has import button', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-btn')).toBeInTheDocument();
  });

  it('import button is disabled when no username', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-btn')).toBeDisabled();
  });

  it('platform toggle renders both options', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('platform-lichess')).toHaveTextContent('Lichess');
    expect(screen.getByTestId('platform-chesscom')).toHaveTextContent('Chess.com');
  });

  it('username input has correct placeholder', () => {
    render(<ImportPage />);
    expect(screen.getByPlaceholderText('Enter username...')).toBeInTheDocument();
  });

  it('import button shows correct text', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-btn')).toHaveTextContent('Import Games & Stats');
  });

  it('import button becomes enabled when username is entered', () => {
    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'testplayer' } });
    expect(screen.getByTestId('import-btn')).not.toBeDisabled();
  });

  it('Chess.com is default platform, switching updates label', () => {
    render(<ImportPage />);
    expect(screen.getByText('Chess.com Username')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('platform-lichess'));
    expect(screen.getByText('Lichess Username')).toBeInTheDocument();
  });

  it('displays error state when import fails', async () => {
    mockImportChessComGames.mockRejectedValueOnce(new Error('User not found'));

    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-error')).toHaveTextContent('User not found');
  });

  it('displays success result after importing', async () => {
    mockImportChessComGames.mockResolvedValue(5);

    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'testplayer' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-result')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-result')).toHaveTextContent('Imported 5 games');
  });

  it('calls chesscom service when Chess.com is selected', async () => {
    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'hikaru' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(mockImportChessComGames).toHaveBeenCalledWith('hikaru', expect.any(Function));
    });
  });

  it('calls lichess service when Lichess is selected', async () => {
    render(<ImportPage />);
    fireEvent.click(screen.getByTestId('platform-lichess'));
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'DrNykterstein' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(mockImportLichessGames).toHaveBeenCalledWith('DrNykterstein', expect.any(Function));
    });
  });

  it('shows stats after successful import', async () => {
    mockImportChessComGames.mockResolvedValue(10);
    mockImportChessComStats.mockResolvedValue({
      platform: 'chesscom',
      username: 'testplayer',
      fetchedAt: new Date().toISOString(),
      rapid: { rating: 1500, best: 1600, wins: 100, losses: 80, draws: 20 },
    });

    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'testplayer' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-stats')).toBeInTheDocument();
    });
  });
});
