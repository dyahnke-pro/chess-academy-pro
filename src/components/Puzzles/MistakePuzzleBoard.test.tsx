import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';

const mockSpeak = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: (...args: unknown[]): Promise<void> => mockSpeak(...args) as Promise<void>,
    stop: (): void => { mockStop(); },
    warmup: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

describe('MistakePuzzleBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
  });

  it('renders the board with classification badge', () => {
    const puzzle = buildMistakePuzzle({ classification: 'blunder' });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('mistake-puzzle-board')).toBeInTheDocument();
    expect(screen.getByTestId('classification-badge')).toHaveTextContent('?? Blunder');
  });

  it('shows inaccuracy badge for inaccuracy classification', () => {
    const puzzle = buildMistakePuzzle({ classification: 'inaccuracy' });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('classification-badge')).toHaveTextContent('?! Inaccuracy');
  });

  it('shows mistake badge for mistake classification', () => {
    const puzzle = buildMistakePuzzle({ classification: 'mistake' });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('classification-badge')).toHaveTextContent('? Mistake');
  });

  it('displays the wrong move and prompt to find the best move', () => {
    const puzzle = buildMistakePuzzle({
      playerMoveSan: 'Ng5',
      classification: 'mistake',
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    const prompt = screen.getByTestId('prompt-text');
    expect(prompt).toHaveTextContent('You played Ng5');
    expect(prompt).toHaveTextContent('Find the best move');
  });

  it('displays opponent name and time ago', () => {
    const puzzle = buildMistakePuzzle({
      opponentName: 'Magnus',
      gameDate: new Date().toISOString().split('T')[0],
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    const context = screen.getByTestId('game-context');
    expect(context).toHaveTextContent('vs Magnus');
    expect(context).toHaveTextContent('today');
  });

  it('displays opening name when available', () => {
    const puzzle = buildMistakePuzzle({
      openingName: 'Sicilian Defense',
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('opening-name')).toHaveTextContent('Sicilian Defense');
  });

  it('falls back to "From your game" when no opponent/date', () => {
    const puzzle = buildMistakePuzzle({
      opponentName: null,
      gameDate: null,
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('game-context')).toHaveTextContent('From your game');
  });

  it('shows move number and cp loss info', () => {
    const puzzle = buildMistakePuzzle({ moveNumber: 12, cpLoss: 250 });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByText('Move 12')).toBeInTheDocument();
    expect(screen.getByText('250cp loss')).toBeInTheDocument();
  });

  it('renders board oriented to player color', () => {
    const puzzle = buildMistakePuzzle({ playerColor: 'black' });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    // Board is rendered (orientation is internal to ChessBoard)
    expect(screen.getByTestId('mistake-puzzle-board')).toBeInTheDocument();
  });

  it('speaks intro narration after loading', async () => {
    const puzzle = buildMistakePuzzle({
      narration: {
        intro: 'You played Ng5, but d4 was better.',
        moveNarrations: [],
        outro: 'Always develop pieces first.',
        conceptHint: '',
      },
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalledWith('You played Ng5, but d4 was better.');
    });

    expect(screen.getByTestId('narration-subtitle')).toHaveTextContent(
      'You played Ng5, but d4 was better.',
    );
  });

  it('stops voice on unmount', () => {
    const puzzle = buildMistakePuzzle();
    const { unmount } = render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    unmount();
    expect(mockStop).toHaveBeenCalled();
  });

  it('does not speak when narration is empty', async () => {
    const puzzle = buildMistakePuzzle({
      narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument();
    });

    expect(mockSpeak).not.toHaveBeenCalled();
    expect(screen.queryByTestId('narration-subtitle')).not.toBeInTheDocument();
  });
});
