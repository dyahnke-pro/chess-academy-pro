import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { ColorWars } from './ColorWars';

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

vi.mock('../Puzzles/PuzzleTimer', () => ({
  PuzzleTimer: ({ duration, running, onTimeout }: { duration: number; running: boolean; onTimeout: () => void }) => (
    <div data-testid="puzzle-timer" data-duration={duration} data-running={String(running)}>
      <button data-testid="trigger-timeout" onClick={onTimeout}>Timeout</button>
      {duration}s
    </div>
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
  fireEvent.click(screen.getByTestId('cw-level-1'));
}

describe('ColorWars', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the component with menu phase', () => {
    render(<ColorWars onBack={mockOnBack} />);
    expect(screen.getByTestId('color-wars')).toBeInTheDocument();
    expect(screen.getByTestId('cw-menu')).toBeInTheDocument();
    expect(screen.getByText('Color Wars')).toBeInTheDocument();
  });

  it('shows 3 level buttons', () => {
    render(<ColorWars onBack={mockOnBack} />);
    expect(screen.getByTestId('cw-level-1')).toBeInTheDocument();
    expect(screen.getByTestId('cw-level-2')).toBeInTheDocument();
    expect(screen.getByTestId('cw-level-3')).toBeInTheDocument();
  });

  it('level 2 and 3 are locked initially', () => {
    render(<ColorWars onBack={mockOnBack} />);
    expect(screen.getByTestId('cw-level-2')).toBeDisabled();
    expect(screen.getByTestId('cw-level-3')).toBeDisabled();
  });

  it('level 1 is not locked', () => {
    render(<ColorWars onBack={mockOnBack} />);
    expect(screen.getByTestId('cw-level-1')).not.toBeDisabled();
  });

  it('clicking level 1 starts the game', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByTestId('cw-playing')).toBeInTheDocument();
  });

  it('shows timer when playing', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    const timer = screen.getByTestId('puzzle-timer');
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveAttribute('data-duration', '60');
    expect(timer).toHaveAttribute('data-running', 'true');
  });

  it('shows overlay grid when playing', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByTestId('cw-overlay')).toBeInTheDocument();
  });

  it('shows capture count when playing', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByText('Captured: 0/6')).toBeInTheDocument();
  });

  it('clicking a bishop square shows instruction to move', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('cw-sq-c2'));
    expect(screen.getByText('Tap a highlighted square to move!')).toBeInTheDocument();
  });

  it('clicking non-bishop square when no selection keeps instruction', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    expect(screen.getByText('Tap either bishop to select it!')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cw-sq-a1'));
    expect(screen.getByText('Tap either bishop to select it!')).toBeInTheDocument();
  });

  it('executing a move updates the board', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('cw-sq-c2'));
    fireEvent.click(screen.getByTestId('cw-sq-d3'));
    expect(screen.getByText('Tap either bishop to select it!')).toBeInTheDocument();
  });

  it('timer expiry triggers loss', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('trigger-timeout'));
    expect(screen.getByTestId('cw-lost')).toBeInTheDocument();
    expect(screen.getByText("Time's Up!")).toBeInTheDocument();
  });

  it('lost phase shows retry button', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('trigger-timeout'));
    expect(screen.getByTestId('cw-retry-lost')).toBeInTheDocument();
  });

  it('retry from lost restarts the game', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('trigger-timeout'));
    expect(screen.getByTestId('cw-lost')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cw-retry-lost'));
    expect(screen.getByTestId('cw-playing')).toBeInTheDocument();
    expect(screen.getByText('Captured: 0/6')).toBeInTheDocument();
  });

  it('restart button resets the game', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('cw-sq-c2'));
    fireEvent.click(screen.getByTestId('cw-sq-d3'));
    fireEvent.click(screen.getByTestId('cw-retry-btn'));
    expect(screen.getByText('Captured: 0/6')).toBeInTheDocument();
  });

  it('back button returns to menu from playing', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('cw-back-btn'));
    expect(screen.getByTestId('cw-menu')).toBeInTheDocument();
  });

  it('back button calls onBack from menu', () => {
    render(<ColorWars onBack={mockOnBack} />);
    fireEvent.click(screen.getByTestId('cw-back-btn'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('voice toggle button works', () => {
    render(<ColorWars onBack={mockOnBack} />);
    const toggle = screen.getByTestId('cw-voice-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'Mute voice');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-label', 'Unmute voice');
  });

  it('shows level descriptions', () => {
    render(<ColorWars onBack={mockOnBack} />);
    expect(screen.getByText('Clear 6 enemies with two bishops!')).toBeInTheDocument();
  });

  it('level 2 shows timer duration of 45s', () => {
    render(<ColorWars onBack={mockOnBack} />);
    expect(screen.getByText(/45s/)).toBeInTheDocument();
  });

  it('renders chess board with position when playing', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    const board = screen.getByTestId('chess-board');
    expect(board).toBeInTheDocument();
    const fen = board.getAttribute('data-fen') ?? '';
    expect(fen).toContain('B');
    expect(fen).toContain('p');
  });

  it('captures enemy piece when bishop moves to enemy square', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    // Level 1: light bishop c2, enemy on f5 (light sq)
    // c2 diags: d3->e4->f5 (capture!)
    fireEvent.click(screen.getByTestId('cw-sq-c2'));
    fireEvent.click(screen.getByTestId('cw-sq-f5'));
    expect(screen.getByText('Captured: 1/6')).toBeInTheDocument();
  });

  it('shows lost capture count on time out', () => {
    render(<ColorWars onBack={mockOnBack} />);
    startLevel1();
    fireEvent.click(screen.getByTestId('cw-sq-c2'));
    fireEvent.click(screen.getByTestId('cw-sq-f5'));
    fireEvent.click(screen.getByTestId('trigger-timeout'));
    expect(screen.getByText('You captured 1 of 6 enemies. Try to be faster!')).toBeInTheDocument();
  });
});
