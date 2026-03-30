import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { QueenVsArmy } from './QueenVsArmy';

// Mock react-chessboard
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: {
    options?: {
      onPieceDrop?: (args: { sourceSquare: string; targetSquare: string; piece: { pieceType: string } }) => boolean;
      position: Record<string, { pieceType: string }>;
    };
  }) => (
    <div data-testid="mock-chessboard">
      <div data-testid="board-position">{JSON.stringify(options?.position)}</div>
      <button
        data-testid="drop-capture-pawn"
        onClick={() => options?.onPieceDrop?.({ sourceSquare: 'd5', targetSquare: 'd2', piece: { pieceType: 'wQ' } })}
      >
        Capture pawn
      </button>
      <button
        data-testid="drop-invalid"
        onClick={() => options?.onPieceDrop?.({ sourceSquare: 'd5', targetSquare: 'c3', piece: { pieceType: 'wQ' } })}
      >
        Invalid move
      </button>
      <button
        data-testid="drop-non-capture"
        onClick={() => options?.onPieceDrop?.({ sourceSquare: 'd5', targetSquare: 'd8', piece: { pieceType: 'wQ' } })}
      >
        Non-capture move
      </button>
    </div>
  ),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { boardColor: 'default' },
  }),
}));

vi.mock('../../services/boardColorService', () => ({
  getBoardColor: () => ({ light: '#f0d9b5', dark: '#b58863' }),
}));

describe('QueenVsArmy', () => {
  const onBack = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game board and UI', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByTestId('queen-vs-army')).toBeInTheDocument();
    expect(screen.getByText(/Queen vs. Army/)).toBeInTheDocument();
    expect(screen.getByText(/Capture all pawns/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
  });

  it('shows level 1 by default', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByText('Queen vs. Army — Level 1')).toBeInTheDocument();
  });

  it('shows pawn count and move count', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByText(/Pawns remaining: 6/)).toBeInTheDocument();
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('renders the correct initial position', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    const posJson = screen.getByTestId('board-position').textContent;
    const pos = JSON.parse(posJson) as Record<string, { pieceType: string }>;
    expect(pos['d5']).toEqual({ pieceType: 'wQ' });
    expect(pos['d2']).toEqual({ pieceType: 'bP' });
  });

  it('calls onBack when back button is clicked', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('queen-army-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('captures a pawn on valid move', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('drop-capture-pawn'));
    // After capturing d2 pawn, count should decrease
    expect(screen.getByText(/Pawns remaining: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Moves: 1/)).toBeInTheDocument();
  });

  it('resets the level when reset button is clicked', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    // Make a move first
    fireEvent.click(screen.getByTestId('drop-capture-pawn'));
    expect(screen.getByText(/Moves: 1/)).toBeInTheDocument();
    // Reset
    fireEvent.click(screen.getByTestId('queen-army-reset'));
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Pawns remaining: 6/)).toBeInTheDocument();
  });

  it('has accessible buttons', () => {
    render(<QueenVsArmy onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByLabelText('Reset level')).toBeInTheDocument();
  });
});
