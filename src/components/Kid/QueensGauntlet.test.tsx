import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { QueensGauntlet } from './QueensGauntlet';

// Mock react-chessboard — expose onSquareClick by rendering a tap button
// per occupied square. KidChessboard → ConsistentChessboard forward the
// handler + position through `options`.
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: {
    options?: {
      onSquareClick?: (args: { square: string }) => void;
      position?: Record<string, { pieceType: string }>;
    };
  }) => (
    <div data-testid="mock-chessboard">
      <div data-testid="board-position">{JSON.stringify(options?.position)}</div>
      {Object.keys(options?.position ?? {}).map((sq) => (
        <button key={sq} data-testid={`sq-${sq}`} onClick={() => options?.onSquareClick?.({ square: sq })}>
          {sq}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { boardColor: 'default' } }),
}));
vi.mock('../../services/boardColorService', () => ({
  getBoardColor: () => ({ light: '#f0d9b5', dark: '#b58863' }),
}));
vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
}));

// Level 1: queen d4; enemies bishop d7 (guards a4 & g4), rook a4, knight g4.
describe('QueensGauntlet', () => {
  const onBack = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the gauntlet board and instructions', () => {
    render(<QueensGauntlet onBack={onBack} />);
    expect(screen.getByTestId('queens-gauntlet')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
    expect(screen.getByText(/Level 1/)).toBeInTheDocument();
  });

  it('calls onBack from the back button', () => {
    render(<QueensGauntlet onBack={onBack} />);
    fireEvent.click(screen.getByTestId('gauntlet-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('capturing a GUARDED piece loses the level', () => {
    render(<QueensGauntlet onBack={onBack} />);
    // g4 is guarded by the d7 bishop — grabbing it first is a trap.
    fireEvent.click(screen.getByTestId('sq-g4'));
    expect(screen.getByTestId('gauntlet-result')).toBeInTheDocument();
    expect(screen.getByText(/captured/i)).toBeInTheDocument();
    expect(screen.getByTestId('gauntlet-retry')).toBeInTheDocument();
  });

  it('capturing in the SAFE order clears the army', () => {
    render(<QueensGauntlet onBack={onBack} />);
    // d7 (undefended) → a4 → g4
    fireEvent.click(screen.getByTestId('sq-d7'));
    fireEvent.click(screen.getByTestId('sq-a4'));
    fireEvent.click(screen.getByTestId('sq-g4'));
    expect(screen.getByTestId('gauntlet-result')).toBeInTheDocument();
    expect(screen.getByText(/Army cleared/i)).toBeInTheDocument();
    expect(screen.getByTestId('gauntlet-next')).toBeInTheDocument();
  });
});
