import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { LeapFrogGame } from './LeapFrogGame';

// Mock react-chessboard to render clickable squares
vi.mock('react-chessboard', () => ({
  Chessboard: ({
    options,
  }: {
    options: {
      onSquareClick?: (args: { square: string }) => void;
      position?: Record<string, { pieceType: string }>;
    };
  }) => (
    <div data-testid="chessboard" data-position={JSON.stringify(options.position)}>
      {Array.from({ length: 64 }).map((_, i) => {
        const file = String.fromCharCode(97 + (i % 8));
        const rank = 8 - Math.floor(i / 8);
        const sq = `${file}${rank}`;
        return (
          <button
            key={sq}
            data-testid={`sq-${sq}`}
            onClick={() => options.onSquareClick?.({ square: sq })}
          />
        );
      })}
    </div>
  ),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { boardColor: 'classic', pieceSet: 'staunton' },
    raw: {},
    updateSetting: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));

vi.mock('../../services/boardColorService', () => ({
  getBoardColor: () => ({
    darkSquare: '#b58863',
    lightSquare: '#f0d9b5',
  }),
}));

vi.mock('../../services/pieceSetService', () => ({
  buildPieceRenderer: () => null,
}));

describe('LeapFrogGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders level select screen initially', () => {
    render(<LeapFrogGame />);

    expect(screen.getByTestId('leap-frog-level-select')).toBeInTheDocument();
    expect(screen.getByText('Leap Frog')).toBeInTheDocument();
    expect(screen.getByTestId('leap-frog-level-1')).toBeInTheDocument();
    expect(screen.getByTestId('leap-frog-level-2')).toBeInTheDocument();
    expect(screen.getByTestId('leap-frog-level-3')).toBeInTheDocument();
  });

  it('shows level descriptions', () => {
    render(<LeapFrogGame />);

    expect(screen.getByText(/Level 1 — Easy Hop/)).toBeInTheDocument();
    expect(screen.getByText(/Level 2 — Tricky Path/)).toBeInTheDocument();
    expect(screen.getByText(/Level 3 — Dark Forest/)).toBeInTheDocument();
  });

  it('starts game when clicking a level', () => {
    render(<LeapFrogGame />);

    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    expect(screen.getByTestId('leap-frog-game')).toBeInTheDocument();
    expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('renders board with knight on e1', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    const board = screen.getByTestId('chessboard');
    const pos = JSON.parse(board.getAttribute('data-position') ?? '{}') as Record<string, { pieceType: string }>;
    expect(pos['e1'].pieceType).toBe('wN');
  });

  it('renders treasure overlay', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    expect(screen.getByTestId('treasure-icon')).toBeInTheDocument();
  });

  it('moves knight on valid square click', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    // e1 -> d3 (valid knight move, not a danger zone in level 1)
    fireEvent.click(screen.getByTestId('sq-d3'));

    expect(screen.getByText(/Moves: 1/)).toBeInTheDocument();
    const board = screen.getByTestId('chessboard');
    const pos = JSON.parse(board.getAttribute('data-position') ?? '{}') as Record<string, { pieceType: string }>;
    expect(pos['d3'].pieceType).toBe('wN');
    expect(pos['e1']).toBeUndefined();
  });

  it('ignores click on non-knight-move square', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    // e1 -> e4 is NOT a valid knight move
    fireEvent.click(screen.getByTestId('sq-e4'));

    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('shows feedback when clicking a danger zone', () => {
    vi.useFakeTimers();
    render(<LeapFrogGame />);

    // Level 1 has danger zones at b4 and h5
    // From e1, knight can go to d3, f3, c2, g2 — none are danger zones
    // Move to f3 first, then try b4 (knight on f3 can go to d2,d4,e1,e5,g1,g5,h2,h4)
    // b4 is not reachable from f3. Let me find a path to hit a danger zone.
    // From d3: b2,b4,c1,c5,e1,e5,f2,f4 — b4 is a danger zone!
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));
    fireEvent.click(screen.getByTestId('sq-d3')); // Move to d3
    fireEvent.click(screen.getByTestId('sq-b4')); // Try danger zone

    expect(screen.getByTestId('leap-frog-feedback')).toHaveTextContent(
      'Danger zone',
    );
    expect(screen.getByText(/Moves: 1/)).toBeInTheDocument(); // Move count didn't increase

    vi.useRealTimers();
  });

  it('shows win when reaching e8', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    // Path: e1 → d3 → c5 → d7 → f6 → e8
    fireEvent.click(screen.getByTestId('sq-d3'));
    fireEvent.click(screen.getByTestId('sq-c5'));
    fireEvent.click(screen.getByTestId('sq-d7'));
    fireEvent.click(screen.getByTestId('sq-f6'));
    fireEvent.click(screen.getByTestId('sq-e8'));

    expect(screen.getByTestId('leap-frog-win')).toBeInTheDocument();
    expect(screen.getByText('Treasure Found!')).toBeInTheDocument();
    expect(screen.getByText(/5 moves/)).toBeInTheDocument();
  });

  it('shows next level button after win (not last level)', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    // Win level 1
    fireEvent.click(screen.getByTestId('sq-d3'));
    fireEvent.click(screen.getByTestId('sq-c5'));
    fireEvent.click(screen.getByTestId('sq-d7'));
    fireEvent.click(screen.getByTestId('sq-f6'));
    fireEvent.click(screen.getByTestId('sq-e8'));

    expect(screen.getByTestId('next-level-btn')).toBeInTheDocument();
  });

  it('clicking next level starts the next level', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    // Win level 1
    fireEvent.click(screen.getByTestId('sq-d3'));
    fireEvent.click(screen.getByTestId('sq-c5'));
    fireEvent.click(screen.getByTestId('sq-d7'));
    fireEvent.click(screen.getByTestId('sq-f6'));
    fireEvent.click(screen.getByTestId('sq-e8'));

    fireEvent.click(screen.getByTestId('next-level-btn'));

    expect(screen.getByText(/Level 2/)).toBeInTheDocument();
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('back button returns to level select from game', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    expect(screen.getByTestId('leap-frog-game')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Back to levels'));

    expect(screen.getByTestId('leap-frog-level-select')).toBeInTheDocument();
  });

  it('has voice toggle button', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-1'));

    expect(screen.getByTestId('voice-toggle')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('voice-toggle'));
    expect(screen.getByLabelText('Unmute voice')).toBeInTheDocument();
  });

  it('level 3 has only one path through', () => {
    render(<LeapFrogGame />);
    fireEvent.click(screen.getByTestId('leap-frog-level-3'));

    // Level 3: safe squares are e1, d3, c5, b7, d6, e8
    // Path: e1 → d3 → c5 → b7 → d6 → e8
    fireEvent.click(screen.getByTestId('sq-d3'));
    fireEvent.click(screen.getByTestId('sq-c5'));
    fireEvent.click(screen.getByTestId('sq-b7'));
    fireEvent.click(screen.getByTestId('sq-d6'));
    fireEvent.click(screen.getByTestId('sq-e8'));

    expect(screen.getByTestId('leap-frog-win')).toBeInTheDocument();
  });
});
