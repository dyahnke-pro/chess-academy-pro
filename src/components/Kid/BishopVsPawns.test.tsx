import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { BishopVsPawns } from './BishopVsPawns';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  const React = await import('react');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: {
      div: React.forwardRef(
        (
          {
            children,
            initial: _i,
            animate: _a,
            exit: _e,
            transition: _t,
            ...rest
          }: Record<string, unknown> & { children?: React.ReactNode },
          ref: React.Ref<HTMLDivElement>,
        ) => (
          <div ref={ref} {...rest}>
            {children}
          </div>
        ),
      ),
    },
  };
});

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('./StarDisplay', () => ({
  StarDisplay: ({ earned, total }: { earned: number; total: number }) => (
    <div data-testid="star-display">{earned}/{total}</div>
  ),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../services/themeService', () => ({
  applyTheme: vi.fn(),
  getThemeById: vi.fn().mockReturnValue({ id: 'classic', name: 'Classic', colors: {} }),
}));

function startLevel1(): void {
  fireEvent.click(screen.getByTestId('bvp-level-1'));
}

describe('BishopVsPawns', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the component with menu phase', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    expect(screen.getByTestId('bishop-vs-pawns')).toBeInTheDocument();
    expect(screen.getByTestId('bvp-menu')).toBeInTheDocument();
    expect(screen.getByText('Bishop vs. Pawns')).toBeInTheDocument();
  });

  it('shows 3 level buttons', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    expect(screen.getByTestId('bvp-level-1')).toBeInTheDocument();
    expect(screen.getByTestId('bvp-level-2')).toBeInTheDocument();
    expect(screen.getByTestId('bvp-level-3')).toBeInTheDocument();
  });

  it('level 2 and 3 are locked initially', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    expect(screen.getByTestId('bvp-level-2')).toBeDisabled();
    expect(screen.getByTestId('bvp-level-3')).toBeDisabled();
  });

  it('level 1 is not locked', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    expect(screen.getByTestId('bvp-level-1')).not.toBeDisabled();
  });

  it('clicking level 1 starts the game', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByTestId('bvp-playing')).toBeInTheDocument();
  });

  it('shows overlay grid when playing', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByTestId('bvp-overlay')).toBeInTheDocument();
  });

  it('shows pawn count and move count when playing', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByText('Pawns: 3')).toBeInTheDocument();
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('clicking bishop square shows instruction to move', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('bvp-sq-d2'));
    expect(screen.getByText('Tap a highlighted square to move!')).toBeInTheDocument();
  });

  it('clicking a legal move square executes bishop move', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('bvp-sq-d2'));
    fireEvent.click(screen.getByTestId('bvp-sq-e3'));
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
  });

  it('pawns advance after bishop move', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('bvp-sq-d2'));
    fireEvent.click(screen.getByTestId('bvp-sq-e3'));
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByText('Pawns: 3')).toBeInTheDocument();
  });

  it('retry button resets the game', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('bvp-sq-d2'));
    fireEvent.click(screen.getByTestId('bvp-sq-e3'));
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bvp-retry-btn'));
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    expect(screen.getByText('Pawns: 3')).toBeInTheDocument();
  });

  it('back button returns to menu from playing', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('bvp-back-btn'));
    expect(screen.getByTestId('bvp-menu')).toBeInTheDocument();
  });

  it('back button calls onBack from menu', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    fireEvent.click(screen.getByTestId('bvp-back-btn'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('voice toggle button works', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    const toggle = screen.getByTestId('bvp-voice-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'Mute voice');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-label', 'Unmute voice');
  });

  it('shows instruction to select bishop when no selection', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByText('Tap the bishop to select it!')).toBeInTheDocument();
  });

  it('shows level description text', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    expect(screen.getByText('Catch 3 pawns before they promote!')).toBeInTheDocument();
  });

  it('clicking non-legal square clears selection', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('bvp-sq-d2'));
    expect(screen.getByText('Tap a highlighted square to move!')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bvp-sq-a8'));
    expect(screen.getByText('Tap the bishop to select it!')).toBeInTheDocument();
  });

  it('renders chess board with position', () => {
    render(<BishopVsPawns onBack={mockOnBack} />);
    startLevel1();
    const board = screen.getByTestId('chess-board');
    expect(board).toBeInTheDocument();
    const fen = board.getAttribute('data-fen') ?? '';
    expect(fen).toContain('B');
    expect(fen).toContain('p');
  });
});
