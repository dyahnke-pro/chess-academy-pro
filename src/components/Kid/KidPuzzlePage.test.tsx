import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { KidPuzzlePage } from './KidPuzzlePage';
import { useAppStore } from '../../stores/appStore';
import type { UserProfile, PuzzleRecord } from '../../types';

const mockGetKidPuzzles = vi.fn<() => Promise<PuzzleRecord[]>>();
const mockSeedPuzzles = vi.fn<() => Promise<void>>();
const mockRecordAttempt = vi.fn();

vi.mock('../../services/puzzleService', () => ({
  getKidPuzzles: (...args: unknown[]) => mockGetKidPuzzles(...(args as [])),
  seedPuzzles: () => mockSeedPuzzles(),
  recordAttempt: (...args: unknown[]) => mockRecordAttempt(...args) as unknown,
}));

vi.mock('../Puzzles/PuzzleBoard', () => ({
  PuzzleBoard: ({ puzzle, onComplete }: { puzzle: PuzzleRecord; onComplete: (correct: boolean) => void }) => (
    <div data-testid="puzzle-board" data-puzzle-id={puzzle.id}>
      <button data-testid="complete-correct" onClick={() => onComplete(true)}>Correct</button>
      <button data-testid="complete-incorrect" onClick={() => onComplete(false)}>Incorrect</button>
    </div>
  ),
}));

vi.mock('../Coach/DifficultyToggle', () => ({
  DifficultyToggle: ({ value, onChange }: { value: string; onChange: (d: string) => void }) => (
    <div data-testid="difficulty-toggle">
      <button data-testid="difficulty-easy" onClick={() => onChange('easy')}>Easy</button>
      <button data-testid="difficulty-medium" onClick={() => onChange('medium')}>Medium</button>
      <button data-testid="difficulty-hard" onClick={() => onChange('hard')}>Hard</button>
      <span data-testid="current-difficulty">{value}</span>
    </div>
  ),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

function createProfile(): UserProfile {
  return {
    id: 'main',
    name: 'Kiddo',
    isKidMode: true,
    currentRating: 800,
    puzzleRating: 800,
    xp: 100,
    level: 1,
    currentStreak: 2,
    longestStreak: 5,
    streakFreezes: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    achievements: [],
    skillRadar: { opening: 30, tactics: 40, endgame: 20, memory: 35, calculation: 25 },
    badHabits: [],
    preferences: {
      theme: 'kid-mode',
      boardColor: 'classic',
      pieceSet: 'staunton',
      showEvalBar: false,
      showEngineLines: false,
      soundEnabled: true,
      voiceEnabled: true,
      dailySessionMinutes: 15,
      aiProvider: 'deepseek',
      apiKeyEncrypted: null,
      apiKeyIv: null,
      anthropicApiKeyEncrypted: null,
      anthropicApiKeyIv: null,
      preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      elevenlabsVoiceId: null,
      voiceSpeed: 1.0,
      highlightLastMove: true,
      showLegalMoves: true,
      showCoordinates: true,
      pieceAnimationSpeed: 'medium',
      boardOrientation: true,
      moveQualityFlash: true,
      showHints: true,
      moveMethod: 'both',
      moveConfirmation: false,
      autoPromoteQueen: true,
      masterAllOff: false,
    },
  };
}

function makePuzzle(id: string, rating: number): PuzzleRecord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    moves: 'e7e5',
    rating,
    themes: ['fork'],
    openingTags: null,
    popularity: 80,
    nbPlays: 1000,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: today,
    srsLastReview: null,
    userRating: 1200,
    attempts: 0,
    successes: 0,
  };
}

describe('KidPuzzlePage', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(createProfile());
    mockGetKidPuzzles.mockReset();
    mockSeedPuzzles.mockReset().mockResolvedValue(undefined);
    mockRecordAttempt.mockReset().mockResolvedValue(null);
  });

  it('renders the select phase by default', () => {
    render(<KidPuzzlePage />);

    expect(screen.getByTestId('kid-puzzle-page')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('start-puzzle-btn')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Level!')).toBeInTheDocument();
  });

  it('has a back button', () => {
    render(<KidPuzzlePage />);
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('has a voice toggle', () => {
    render(<KidPuzzlePage />);
    expect(screen.getByTestId('voice-toggle')).toBeInTheDocument();
    expect(screen.getByLabelText('Mute voice')).toBeInTheDocument();
  });

  it('toggles voice on/off', () => {
    render(<KidPuzzlePage />);
    const btn = screen.getByTestId('voice-toggle');
    fireEvent.click(btn);
    expect(screen.getByLabelText('Unmute voice')).toBeInTheDocument();
  });

  it('starts puzzles and transitions to playing phase', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600), makePuzzle('p3', 700)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    expect(screen.getByTestId('puzzle-progress')).toBeInTheDocument();
    expect(screen.getByText('Puzzle 1 of 3')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle-solved-count')).toHaveTextContent('Solved: 0');
  });

  it('calls seedPuzzles before loading puzzles', async () => {
    mockGetKidPuzzles.mockResolvedValue([makePuzzle('p1', 500)]);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(mockSeedPuzzles).toHaveBeenCalled();
    });
  });

  it('shows between phase with correct message after solving', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));

    expect(screen.getByTestId('puzzle-result-message')).toHaveTextContent('Correct!');
    expect(screen.getByTestId('next-puzzle-btn')).toBeInTheDocument();
  });

  it('shows between phase with incorrect message after failing', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-incorrect'));

    expect(screen.getByTestId('puzzle-result-message')).toHaveTextContent('Good Try!');
  });

  it('advances to next puzzle when clicking Next Puzzle', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));
    fireEvent.click(screen.getByTestId('next-puzzle-btn'));

    expect(screen.getByTestId('puzzle-board')).toHaveAttribute('data-puzzle-id', 'p2');
    expect(screen.getByText('Puzzle 2 of 2')).toBeInTheDocument();
  });

  it('shows complete summary after last puzzle', async () => {
    const puzzles = [makePuzzle('p1', 500)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));

    expect(screen.getByTestId('puzzle-complete-summary')).toBeInTheDocument();
    expect(screen.getByText('All Done!')).toBeInTheDocument();
    expect(screen.getByText(/1 out of 1/)).toBeInTheDocument();
  });

  it('play again button reloads puzzles', async () => {
    const puzzles = [makePuzzle('p1', 500)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));
    expect(screen.getByTestId('play-again-btn')).toBeInTheDocument();

    mockGetKidPuzzles.mockResolvedValue([makePuzzle('p2', 600)]);
    fireEvent.click(screen.getByTestId('play-again-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });
  });

  it('change level button returns to select phase', async () => {
    const puzzles = [makePuzzle('p1', 500)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));
    fireEvent.click(screen.getByTestId('change-level-btn'));

    expect(screen.getByTestId('difficulty-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('start-puzzle-btn')).toBeInTheDocument();
  });

  it('stays on select phase when no puzzles are available', async () => {
    mockGetKidPuzzles.mockResolvedValue([]);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('start-puzzle-btn')).toBeInTheDocument();
    });
  });

  it('tracks solved count correctly', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600), makePuzzle('p3', 700)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    // Solve first puzzle correctly
    fireEvent.click(screen.getByTestId('complete-correct'));
    fireEvent.click(screen.getByTestId('next-puzzle-btn'));

    // Fail second puzzle
    fireEvent.click(screen.getByTestId('complete-incorrect'));
    fireEvent.click(screen.getByTestId('next-puzzle-btn'));

    // Solve third puzzle correctly — this is the last so it goes to complete
    fireEvent.click(screen.getByTestId('complete-correct'));

    expect(screen.getByTestId('puzzle-complete-summary')).toBeInTheDocument();
    expect(screen.getByText(/2 out of 3/)).toBeInTheDocument();
  });

  it('records attempt via puzzleService', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));

    expect(mockRecordAttempt).toHaveBeenCalledWith('p1', true, 800, 'good');
  });
});
