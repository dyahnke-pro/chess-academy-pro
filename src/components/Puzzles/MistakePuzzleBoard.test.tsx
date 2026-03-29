import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';

const mockSpeak = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: (...args: unknown[]) => mockSpeak(...args),
    stop: () => mockStop(),
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

  it('displays prompt text', () => {
    const puzzle = buildMistakePuzzle({
      promptText: 'This move cost you. What should you have played?',
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('prompt-text')).toHaveTextContent(
      'This move cost you. What should you have played?',
    );
  });

  it('displays "From your game" label', () => {
    const puzzle = buildMistakePuzzle();
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByText('From your game')).toBeInTheDocument();
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
      narration: { intro: '', moveNarrations: [], outro: '' },
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
