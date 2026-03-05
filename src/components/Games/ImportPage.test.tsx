import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { ImportPage } from './ImportPage';
import { importLichessGames } from '../../services/lichessService';
import { importChessComGames } from '../../services/chesscomService';

vi.mock('../../services/lichessService', () => ({
  importLichessGames: vi.fn().mockResolvedValue(5),
}));

vi.mock('../../services/chesscomService', () => ({
  importChessComGames: vi.fn().mockResolvedValue(3),
}));

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the import page', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import Games' })).toBeInTheDocument();
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

  it('platform toggle renders both Lichess and Chess.com options', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('platform-lichess')).toHaveTextContent('Lichess');
    expect(screen.getByTestId('platform-chesscom')).toHaveTextContent('Chess.com');
  });

  it('username input has correct placeholder', () => {
    render(<ImportPage />);
    expect(screen.getByPlaceholderText('Enter username...')).toBeInTheDocument();
  });

  it('import button shows Import Games text', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-btn')).toHaveTextContent('Import Games');
  });

  it('import button becomes enabled when username is entered', () => {
    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'testplayer' } });
    expect(screen.getByTestId('import-btn')).not.toBeDisabled();
  });

  it('switching to Chess.com updates label to Chess.com Username', () => {
    render(<ImportPage />);
    fireEvent.click(screen.getByTestId('platform-chesscom'));
    expect(screen.getByText('Chess.com Username')).toBeInTheDocument();
  });

  it('default label is Lichess Username', () => {
    render(<ImportPage />);
    expect(screen.getByText('Lichess Username')).toBeInTheDocument();
  });

  it('displays error state when import fails', async () => {
    vi.mocked(importLichessGames).mockRejectedValueOnce(new Error('User not found'));

    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-result')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-result')).toHaveTextContent('Error: User not found');
  });

  it('displays success result after importing from Lichess', async () => {
    render(<ImportPage />);
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'DrNykterstein' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-result')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-result')).toHaveTextContent('Imported 5 games');
  });

  it('calls chesscom service when Chess.com is selected', async () => {
    render(<ImportPage />);
    fireEvent.click(screen.getByTestId('platform-chesscom'));
    const input = screen.getByTestId('username-input');
    fireEvent.change(input, { target: { value: 'hikaru' } });
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(importChessComGames).toHaveBeenCalledWith('hikaru', expect.any(Function));
    });
  });
});
