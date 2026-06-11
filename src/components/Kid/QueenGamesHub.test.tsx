import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { QueenGamesHub } from './QueenGamesHub';
import { getGameProgress } from '../../services/journeyService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../services/journeyService', () => ({
  getGameProgress: vi.fn(),
  isChapterUnlocked: vi.fn(),
}));
vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
}));
// The hub imports these for its route wrappers but never renders them
// inline — keep them light so the hub test doesn't mount real boards.
vi.mock('./QueenVsArmy', () => ({ QueenVsArmy: () => <div /> }));
vi.mock('./QueensGauntlet', () => ({ QueensGauntlet: () => <div /> }));

const mockGetGameProgress = vi.mocked(getGameProgress);

function unlock(): void {
  mockGetGameProgress.mockResolvedValue({
    chapters: {},
    currentChapterId: 'queen',
    startedAt: '2024-01-01',
    completedAt: null,
  });
}

describe('QueenGamesHub', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows loading state initially', () => {
    mockGetGameProgress.mockReturnValue(new Promise(() => {})); // never resolves
    render(<QueenGamesHub />);
    expect(screen.getByTestId('queen-games-loading')).toBeInTheDocument();
  });

  it('shows the game cards when unlocked', async () => {
    unlock();
    render(<QueenGamesHub />);
    await waitFor(() => expect(screen.getByTestId('queen-army-card')).toBeInTheDocument());
    expect(screen.getByTestId('queen-gauntlet-card')).toBeInTheDocument();
    expect(screen.getByText('Queen vs. Army')).toBeInTheDocument();
    expect(screen.getByText(/Queen's Gauntlet/)).toBeInTheDocument();
  });

  it('routes (not setView) to Queen vs Army', async () => {
    unlock();
    render(<QueenGamesHub />);
    await waitFor(() => expect(screen.getByTestId('queen-army-card')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('queen-army-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid/queen-games/vs-army');
  });

  it('routes (not setView) to Queen\'s Gauntlet', async () => {
    unlock();
    render(<QueenGamesHub />);
    await waitFor(() => expect(screen.getByTestId('queen-gauntlet-card')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('queen-gauntlet-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid/queen-games/gauntlet');
  });

  it('shows the locked state when progression is not met', async () => {
    mockGetGameProgress.mockResolvedValue(null);
    render(<QueenGamesHub />);
    await waitFor(() => expect(screen.getByTestId('queen-games-locked')).toBeInTheDocument());
  });
});
