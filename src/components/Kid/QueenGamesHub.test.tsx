import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { QueenGamesHub } from './QueenGamesHub';
import { getGameProgress, isChapterUnlocked } from '../../services/journeyService';

vi.mock('../../services/journeyService', () => ({
  getGameProgress: vi.fn(),
  isChapterUnlocked: vi.fn(),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

// Mock the game subcomponents
vi.mock('./QueenVsArmy', () => ({
  QueenVsArmy: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="queen-vs-army-game">
      <button onClick={onBack} data-testid="army-back">Back</button>
    </div>
  ),
}));

vi.mock('./QueensGauntlet', () => ({
  QueensGauntlet: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="queens-gauntlet-game">
      <button onClick={onBack} data-testid="gauntlet-back">Back</button>
    </div>
  ),
}));

const mockGetGameProgress = vi.mocked(getGameProgress);
const mockIsChapterUnlocked = vi.mocked(isChapterUnlocked);

describe('QueenGamesHub', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGetGameProgress.mockReturnValue(new Promise(() => {})); // never resolves
    render(<QueenGamesHub />);
    expect(screen.getByTestId('queen-games-loading')).toBeInTheDocument();
  });

  it('shows locked state when knight chapter not completed', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: { pawn: { chapterId: 'pawn', completed: true, lessonsCompleted: 3, puzzlesCompleted: 3, puzzlesCorrect: 3, bestScore: 3, completedAt: '2024-01-01' } },
      currentChapterId: 'rook',
      startedAt: '2024-01-01',
      completedAt: null,
    });
    mockIsChapterUnlocked.mockReturnValue(false);

    render(<QueenGamesHub />);
    await waitFor(() => {
      expect(screen.getByTestId('queen-games-locked')).toBeInTheDocument();
    });
    expect(screen.getByText(/Complete the Knight chapter/)).toBeInTheDocument();
  });

  it('shows game cards when unlocked', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {
        knight: { chapterId: 'knight', completed: true, lessonsCompleted: 3, puzzlesCompleted: 3, puzzlesCorrect: 3, bestScore: 3, completedAt: '2024-01-01' },
      },
      currentChapterId: 'queen',
      startedAt: '2024-01-01',
      completedAt: null,
    });
    mockIsChapterUnlocked.mockReturnValue(true);

    render(<QueenGamesHub />);
    await waitFor(() => {
      expect(screen.getByTestId('queen-army-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('queen-gauntlet-card')).toBeInTheDocument();
    expect(screen.getByText('Queen vs. Army')).toBeInTheDocument();
    expect(screen.getByText(/Queen's Gauntlet/)).toBeInTheDocument();
  });

  it('navigates to Queen vs Army game', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {},
      currentChapterId: 'queen',
      startedAt: '2024-01-01',
      completedAt: null,
    });
    mockIsChapterUnlocked.mockReturnValue(true);

    render(<QueenGamesHub />);
    await waitFor(() => {
      expect(screen.getByTestId('queen-army-card')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('queen-army-card'));
    expect(screen.getByTestId('queen-vs-army-game')).toBeInTheDocument();
  });

  it('navigates to Queens Gauntlet game', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {},
      currentChapterId: 'queen',
      startedAt: '2024-01-01',
      completedAt: null,
    });
    mockIsChapterUnlocked.mockReturnValue(true);

    render(<QueenGamesHub />);
    await waitFor(() => {
      expect(screen.getByTestId('queen-gauntlet-card')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('queen-gauntlet-card'));
    expect(screen.getByTestId('queens-gauntlet-game')).toBeInTheDocument();
  });

  it('returns to menu from a game', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {},
      currentChapterId: 'queen',
      startedAt: '2024-01-01',
      completedAt: null,
    });
    mockIsChapterUnlocked.mockReturnValue(true);

    render(<QueenGamesHub />);
    await waitFor(() => {
      expect(screen.getByTestId('queen-army-card')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('queen-army-card'));
    expect(screen.getByTestId('queen-vs-army-game')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('army-back'));
    expect(screen.getByTestId('queen-games-hub')).toBeInTheDocument();
  });

  it('shows completion progress', async () => {
    mockGetGameProgress.mockResolvedValue({
      chapters: {},
      currentChapterId: 'queen',
      startedAt: '2024-01-01',
      completedAt: null,
    });
    mockIsChapterUnlocked.mockReturnValue(true);

    render(<QueenGamesHub />);
    await waitFor(() => {
      expect(screen.getByTestId('queen-army-card')).toBeInTheDocument();
    });
    // Both cards show "0/3 levels completed" — text split by React rendering
    const cards = screen.getAllByText(/levels completed/);
    expect(cards).toHaveLength(2);
  });
});
