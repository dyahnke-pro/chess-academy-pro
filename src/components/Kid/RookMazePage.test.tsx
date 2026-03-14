import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { RookMazePage } from './RookMazePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/themeService', () => ({
  applyTheme: vi.fn(),
  getThemeById: vi.fn().mockReturnValue({ id: 'kid-mode', name: 'Kid Mode', colors: {} }),
}));

vi.mock('../../services/rookGameService', async () => {
  const actual = await vi.importActual<typeof import('../../services/rookGameService')>(
    '../../services/rookGameService',
  );
  return {
    ...actual,
    completeMazeLevel: vi.fn().mockResolvedValue({ rookMaze: {}, rowClearer: {} }),
  };
});

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { onSquareClick?: (args: { square: string }) => void } }) => (
    <div data-testid="mock-chessboard">
      {/* Expose click handler for testing */}
      <button
        data-testid="sq-a4"
        onClick={() => options.onSquareClick?.({ square: 'a4' })}
      >
        a4
      </button>
      <button
        data-testid="sq-g4"
        onClick={() => options.onSquareClick?.({ square: 'g4' })}
      >
        g4
      </button>
      <button
        data-testid="sq-g7"
        onClick={() => options.onSquareClick?.({ square: 'g7' })}
      >
        g7
      </button>
      <button
        data-testid="sq-b2"
        onClick={() => options.onSquareClick?.({ square: 'b2' })}
      >
        b2
      </button>
    </div>
  ),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRoute(level: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/kid/rook-maze/${level}`]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/kid/rook-maze/:level" element={<RookMazePage />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RookMazePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(
      buildUserProfile({ isKidMode: true, name: 'TestKid' }),
    );
  });

  it('renders the maze page for level 1', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('rook-maze-page')).toBeInTheDocument();
    expect(screen.getByText('Rook Maze: Open Road')).toBeInTheDocument();
  }, 15_000);

  it('shows move counter', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('maze-move-counter')).toBeInTheDocument();
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    expect(screen.getByText('Par: 3')).toBeInTheDocument();
  });

  it('renders the chessboard', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
  });

  it('moves rook on valid square click', () => {
    renderWithRoute('1');
    // a4 is a legal move for rook on a1 (a5 blocks, so a4 is reachable)
    fireEvent.click(screen.getByTestId('sq-a4'));
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
  });

  it('ignores click on invalid square', () => {
    renderWithRoute('1');
    // b2 is not reachable from a1 in one rook move (different file AND rank)
    fireEvent.click(screen.getByTestId('sq-b2'));
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('shows win screen when reaching target', async () => {
    renderWithRoute('1');
    // Level 1: rook a1, target g7, obstacles a5, g3
    // Move to a4 (legal: up a-file, stopped by a5)
    fireEvent.click(screen.getByTestId('sq-a4'));
    // Move to g4 (legal: right on rank 4)
    fireEvent.click(screen.getByTestId('sq-g4'));
    // Move to g7 (legal: up g-file from g4, g3 is below)
    fireEvent.click(screen.getByTestId('sq-g7'));

    await waitFor(() => {
      expect(screen.getByTestId('maze-win-screen')).toBeInTheDocument();
    });

    expect(screen.getByText('Maze Complete!')).toBeInTheDocument();
    expect(screen.getByText('3 moves (par: 3)')).toBeInTheDocument();
  });

  it('undo button reverts last move', () => {
    renderWithRoute('1');
    fireEvent.click(screen.getByTestId('sq-a4'));
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('maze-undo-btn'));
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('reset button restarts the level', () => {
    renderWithRoute('1');
    fireEvent.click(screen.getByTestId('sq-a4'));
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('maze-reset-btn'));
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('back button navigates to rook games', () => {
    renderWithRoute('1');
    fireEvent.click(screen.getByTestId('maze-back-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid/rook-games');
  });

  it('voice toggle button is rendered', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('maze-voice-toggle')).toBeInTheDocument();
  });

  it('renders level 2', () => {
    renderWithRoute('2');
    expect(screen.getByText('Rook Maze: The Detour')).toBeInTheDocument();
    expect(screen.getByText('Par: 5')).toBeInTheDocument();
  });

  it('renders level 3', () => {
    renderWithRoute('3');
    expect(screen.getByText('Rook Maze: Castle Maze')).toBeInTheDocument();
    expect(screen.getByText('Par: 7')).toBeInTheDocument();
  });
});
