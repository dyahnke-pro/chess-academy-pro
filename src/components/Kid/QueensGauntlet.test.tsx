import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { QueensGauntlet } from './QueensGauntlet';

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
        data-testid="drop-safe"
        onClick={() => options?.onPieceDrop?.({ sourceSquare: 'a1', targetSquare: 'a2', piece: { pieceType: 'wQ' } })}
      >
        Safe move
      </button>
      <button
        data-testid="drop-attacked"
        onClick={() => options?.onPieceDrop?.({ sourceSquare: 'a1', targetSquare: 'd1', piece: { pieceType: 'wQ' } })}
      >
        Attacked square
      </button>
      <button
        data-testid="drop-invalid"
        onClick={() => options?.onPieceDrop?.({ sourceSquare: 'a1', targetSquare: 'b3', piece: { pieceType: 'wQ' } })}
      >
        Invalid move
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

describe('QueensGauntlet', () => {
  const onBack = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game board and UI', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByTestId('queens-gauntlet')).toBeInTheDocument();
    expect(screen.getByText(/Queen's Gauntlet/)).toBeInTheDocument();
    expect(screen.getByText(/Navigate your queen/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
  });

  it('shows level 1 by default', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByText("Queen's Gauntlet — Level 1")).toBeInTheDocument();
  });

  it('shows move count', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('renders correct initial position', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    const posJson = screen.getByTestId('board-position').textContent;
    const pos = JSON.parse(posJson) as Record<string, { pieceType: string }>;
    expect(pos['a1']).toEqual({ pieceType: 'wQ' });
    expect(pos['d4']).toEqual({ pieceType: 'bR' });
    expect(pos['f5']).toEqual({ pieceType: 'bB' });
  });

  it('calls onBack when back button is clicked', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('gauntlet-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('moves queen to a safe square', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('drop-safe'));
    expect(screen.getByText(/Moves: 1/)).toBeInTheDocument();
  });

  it('loses when landing on attacked square', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('drop-attacked'));
    // Should show loss result
    expect(screen.getByTestId('gauntlet-result')).toBeInTheDocument();
    expect(screen.getByText(/Your queen was captured/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(1, false);
  });

  it('shows retry button after loss', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('drop-attacked'));
    expect(screen.getByTestId('gauntlet-retry')).toBeInTheDocument();
  });

  it('resets the level when reset button is clicked', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('drop-safe'));
    expect(screen.getByText(/Moves: 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('gauntlet-reset'));
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('has accessible buttons', () => {
    render(<QueensGauntlet onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByLabelText('Reset level')).toBeInTheDocument();
  });
});
