import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';

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
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.getByTestId('mistake-puzzle-board')).toBeInTheDocument();
    expect(screen.getByTestId('classification-badge')).toHaveTextContent('?? Blunder');
  });

  it('shows inaccuracy badge for inaccuracy classification', () => {
    const puzzle = buildMistakePuzzle({ classification: 'inaccuracy' });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.getByTestId('classification-badge')).toHaveTextContent('?! Inaccuracy');
  });

  it('shows mistake badge for mistake classification', () => {
    const puzzle = buildMistakePuzzle({ classification: 'mistake' });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.getByTestId('classification-badge')).toHaveTextContent('? Mistake');
  });

  it('displays prompt text', () => {
    const puzzle = buildMistakePuzzle({
      promptText: 'This move cost you. What should you have played?',
    });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.getByTestId('prompt-text')).toHaveTextContent(
      'This move cost you. What should you have played?',
    );
  });

  it('displays "From your game" label', () => {
    const puzzle = buildMistakePuzzle();
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.getByText('From your game')).toBeInTheDocument();
  });

  it('shows move number and cp loss info', () => {
    const puzzle = buildMistakePuzzle({ moveNumber: 12, cpLoss: 250 });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.getByText('Move 12')).toBeInTheDocument();
    expect(screen.getByText('250cp loss')).toBeInTheDocument();
  });

  it('renders board oriented to player color', () => {
    const puzzle = buildMistakePuzzle({ playerColor: 'black' });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    // Board is rendered (orientation is internal to ChessBoard)
    expect(screen.getByTestId('mistake-puzzle-board')).toBeInTheDocument();
  });

  it('does not show progress indicator in easy mode', () => {
    const puzzle = buildMistakePuzzle({
      continuationMoves: ['d2d4'],
    });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    expect(screen.queryByTestId('move-progress')).not.toBeInTheDocument();
  });

  it('shows progress indicator in medium mode with multi-move puzzle', () => {
    const puzzle = buildMistakePuzzle({
      continuationMoves: ['d2d4', 'e5d4', 'f3d4'],
    });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="medium" onComplete={vi.fn()} />);

    expect(screen.getByTestId('move-progress')).toBeInTheDocument();
    expect(screen.getByText('Move 1 of 2')).toBeInTheDocument();
  });

  it('shows progress indicator in hard mode with long continuation', () => {
    const puzzle = buildMistakePuzzle({
      continuationMoves: ['d2d4', 'e5d4', 'f3d4', 'b8c6', 'd4c6', 'b7c6', 'f1d3'],
    });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="hard" onComplete={vi.fn()} />);

    expect(screen.getByTestId('move-progress')).toBeInTheDocument();
    // 7 half-moves = 4 player moves (indices 0, 2, 4, 6)
    expect(screen.getByText('Move 1 of 4')).toBeInTheDocument();
  });

  it('shows difficulty label for multi-move puzzles', () => {
    const puzzle = buildMistakePuzzle({
      continuationMoves: ['d2d4', 'e5d4', 'f3d4'],
    });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="medium" onComplete={vi.fn()} />);

    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  it('falls back to bestMove when continuationMoves is empty', () => {
    const puzzle = buildMistakePuzzle({
      bestMove: 'd2d4',
      continuationMoves: [],
    });
    render(<MistakePuzzleBoard puzzle={puzzle} difficulty="easy" onComplete={vi.fn()} />);

    // Should render without error (falls back to [bestMove])
    expect(screen.getByTestId('mistake-puzzle-board')).toBeInTheDocument();
  });
});
