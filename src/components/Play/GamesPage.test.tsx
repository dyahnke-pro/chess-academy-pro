import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { GamesPage } from './GamesPage';

const { mockGetOpeningsByMode, mockGetDueCount } = vi.hoisted(() => ({
  mockGetOpeningsByMode: vi.fn().mockResolvedValue([]),
  mockGetDueCount: vi.fn().mockResolvedValue(3),
}));

vi.mock('../../services/gamesService', () => ({
  getOpeningsByMode: mockGetOpeningsByMode,
  getDueCount: mockGetDueCount,
  getWelcomeMessage: vi.fn().mockReturnValue('Welcome!'),
  getWrongMoveMessage: vi.fn().mockReturnValue('Try again!'),
  getCorrectMoveMessage: vi.fn().mockReturnValue('Nice!'),
  getStars: vi.fn().mockReturnValue(3),
  getGuessPositions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/openingService', () => ({
  getRepertoireOpenings: vi.fn().mockResolvedValue([]),
  recordDrillAttempt: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
  getWeakestOpenings: vi.fn().mockResolvedValue([]),
  getWoodpeckerDue: vi.fn().mockResolvedValue([]),
  getFavoriteOpenings: vi.fn().mockResolvedValue([]),
}));

vi.mock('../Board/BoardPageLayout', () => ({
  BoardPageLayout: ({ testId, children }: { testId?: string; children?: React.ReactNode }) => (
    <div data-testid={testId}>{children}</div>
  ),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: () => <div data-testid="chess-board" />,
}));

vi.mock('../Coach/GameChatPanel', () => ({
  GameChatPanel: () => <div data-testid="game-chat" />,
}));

vi.mock('../Coach/HintButton', () => ({
  HintButton: ({ onRequestHint }: { onRequestHint: () => void }) => (
    <button data-testid="hint-button" onClick={onRequestHint}>Hint</button>
  ),
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../hooks/useBoardContext', () => ({
  useBoardContext: vi.fn(),
}));

describe('GamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDueCount.mockResolvedValue(3);
  });

  it('renders the game selector grid', () => {
    render(<GamesPage />);
    expect(screen.getByTestId('games-page')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Opening Challenge')).toBeInTheDocument();
    expect(screen.getByText('Opening Speedrun')).toBeInTheDocument();
    expect(screen.getByText('Guess the Move')).toBeInTheDocument();
    expect(screen.getByText('Blindfold Trainer')).toBeInTheDocument();
  });

  it('shows due count badge on Opening Challenge card', async () => {
    render(<GamesPage />);
    await waitFor(() => {
      expect(screen.getByText('3 due')).toBeInTheDocument();
    });
  });

  it('shows challenge mode selector when Opening Challenge is clicked', () => {
    render(<GamesPage />);
    fireEvent.click(screen.getByTestId('game-challenge'));
    expect(screen.getByTestId('challenge-modes')).toBeInTheDocument();
    expect(screen.getByText('Due for Review')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Weakest Lines')).toBeInTheDocument();
  });

  it('navigates directly to speedrun when clicked', () => {
    render(<GamesPage />);
    fireEvent.click(screen.getByTestId('game-speedrun'));
    expect(screen.getByTestId('speedrun-loading')).toBeInTheDocument();
  });

  it('navigates to blindfold trainer when clicked', () => {
    render(<GamesPage />);
    fireEvent.click(screen.getByTestId('game-blindfold'));
    expect(screen.getByTestId('blindfold-select')).toBeInTheDocument();
  });

  it('navigates to guess the move when clicked', () => {
    render(<GamesPage />);
    fireEvent.click(screen.getByTestId('game-guess'));
    // Should show loading or empty state
    expect(screen.getByTestId('guess-loading')).toBeInTheDocument();
  });

  it('returns to menu from challenge modes via back button', () => {
    render(<GamesPage />);
    fireEvent.click(screen.getByTestId('game-challenge'));
    expect(screen.getByTestId('challenge-modes')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('modes-back'));
    expect(screen.getByTestId('games-page')).toBeInTheDocument();
  });

  it('shows 4 game cards', () => {
    render(<GamesPage />);
    expect(screen.getByTestId('game-challenge')).toBeInTheDocument();
    expect(screen.getByTestId('game-speedrun')).toBeInTheDocument();
    expect(screen.getByTestId('game-guess')).toBeInTheDocument();
    expect(screen.getByTestId('game-blindfold')).toBeInTheDocument();
  });

  it('shows correct descriptions for each game', () => {
    render(<GamesPage />);
    expect(screen.getByText('Play the correct moves for your openings')).toBeInTheDocument();
    expect(screen.getByText('Race through your repertoire')).toBeInTheDocument();
    expect(screen.getByText('Find the move from real games')).toBeInTheDocument();
    expect(screen.getByText('Play your openings from memory')).toBeInTheDocument();
  });
});
