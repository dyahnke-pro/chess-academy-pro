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
  PuzzleBoard: ({ puzzle, onComplete }: { puzzle: PuzzleRecord; onComplete: (outcome: { correct: boolean; usedHint: boolean; hadRetry: boolean; showedSolution: boolean; solveTimeMs: number }) => void }) => (
    <div data-testid="puzzle-board" data-puzzle-id={puzzle.id}>
      <button data-testid="complete-correct" onClick={() => onComplete({ correct: true, usedHint: false, hadRetry: false, showedSolution: false, solveTimeMs: 5000 })}>Correct</button>
      <button data-testid="complete-incorrect" onClick={() => onComplete({ correct: false, usedHint: false, hadRetry: false, showedSolution: false, solveTimeMs: 10000 })}>Incorrect</button>
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
      kokoroEnabled: true,
      kokoroVoiceId: 'af_bella',
      systemVoiceURI: null,
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
      pollyEnabled: false,
      pollyVoice: 'ruth',
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
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    expect(screen.getByTestId('puzzle-progress')).toBeInTheDocument();
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

  it('shows result overlay after solving correctly', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-correct'));

    expect(screen.getByTestId('puzzle-result-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle-result-message')).toHaveTextContent('Correct!');
  });

  it('shows result overlay after failing', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('complete-incorrect'));

    expect(screen.getByTestId('puzzle-result-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle-result-message')).toHaveTextContent('Good Try!');
  });

  it('auto-advances to next puzzle after delay', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    expect(screen.getByTestId('puzzle-board')).toHaveAttribute('data-puzzle-id', 'p1');

    fireEvent.click(screen.getByTestId('complete-correct'));
    expect(screen.getByTestId('puzzle-result-overlay')).toBeInTheDocument();

    // Wait for auto-advance (2s timer)
    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toHaveAttribute('data-puzzle-id', 'p2');
    }, { timeout: 3000 });

    expect(screen.queryByTestId('puzzle-result-overlay')).not.toBeInTheDocument();
  });

  it('has a Done button that returns to select phase', async () => {
    const puzzles = [makePuzzle('p1', 500), makePuzzle('p2', 600)];
    mockGetKidPuzzles.mockResolvedValue(puzzles);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('done-btn'));

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

  it('displays Playing as white/black based on puzzle FEN', async () => {
    // FEN has 'b' to move → user plays white
    const whitePuzzle = makePuzzle('pw', 500);
    whitePuzzle.fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    mockGetKidPuzzles.mockResolvedValue([whitePuzzle, makePuzzle('p2', 500)]);

    render(<KidPuzzlePage />);
    fireEvent.click(screen.getByTestId('start-puzzle-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });

    expect(screen.getByText(/Playing as white/)).toBeInTheDocument();
  });
});
