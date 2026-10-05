import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { PatternSchoolPage } from './PatternSchoolPage';
import { PATTERN_REGISTRY } from '../../data/patternRegistry';

vi.mock('../../services/analytics', () => ({ captureEvent: vi.fn() }));
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}));
vi.mock('../../services/puzzleService', () => ({
  // One real Lichess-format puzzle: fen BEFORE the setup move; moves[0] is
  // the opponent's move that creates the tactic (here 1...e5 from the start
  // position — legality is all the component needs).
  getPuzzlesByTheme: vi.fn().mockResolvedValue([
    { id: 'p1', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', moves: 'e7e5 g1f3', rating: 1500, themes: ['fork'], openingTags: null, popularity: 90, nbPlays: 100 },
  ]),
}));
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen, arrows }: { fen: string; arrows?: Array<{ startSquare: string; endSquare: string }> }) => (
    <div data-testid="mock-board" data-fen={fen} data-arrows={(arrows ?? []).map((a) => `${a.startSquare}${a.endSquare}`).join(',')} />
  ),
}));

describe('PatternSchoolPage', () => {
  it('renders every registry pattern as a card', () => {
    render(<PatternSchoolPage />);
    expect(screen.getByTestId('pattern-school-page')).toBeInTheDocument();
    for (const lesson of PATTERN_REGISTRY) {
      expect(screen.getByTestId(`pattern-card-${lesson.id}`)).toBeInTheDocument();
    }
  });

  it('expands a card to the identify/recognize/prevent trio + real example board + drill button', async () => {
    render(<PatternSchoolPage />);
    fireEvent.click(screen.getByTestId('pattern-toggle-fork'));
    expect(screen.getByText(/Identify\./)).toBeInTheDocument();
    expect(screen.getByText(/Recognize\./)).toBeInTheDocument();
    expect(screen.getByText(/Prevent\./)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('pattern-example-board-fork')).toBeInTheDocument();
    });
    // The example board shows the position AFTER the setup move (pattern live).
    const board = screen.getByTestId('mock-board');
    expect(board.getAttribute('data-fen')).toContain(' w ');
    // The eye is led to the pattern: an arrow on the move that springs it.
    expect(board.getAttribute('data-arrows')).toBe('g1f3');
    expect(screen.getByTestId('pattern-drill-fork')).toBeInTheDocument();
  });

  it('"Drill this pattern" asks for SHORT puzzles (1-3 moves) so the pattern is the lesson', async () => {
    navigateMock.mockClear();
    render(<PatternSchoolPage />);
    fireEvent.click(screen.getByTestId('pattern-toggle-fork'));
    await waitFor(() => expect(screen.getByTestId('pattern-drill-fork')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('pattern-drill-fork'));
    expect(navigateMock).toHaveBeenCalledWith('/tactics/adaptive', {
      state: expect.objectContaining({ depth: { min: 1, max: 3 } }),
    });
  });

  it('IDENTIFY is a question first: no arrow until they find it or ask to be shown', async () => {
    const { getPuzzlesByTheme } = await import('../../services/puzzleService');
    // After ...h6, Nc7+ forks the king on e8 and the rook on a8.
    vi.mocked(getPuzzlesByTheme).mockResolvedValueOnce([
      { id: 'p2', fen: 'r3k3/7p/8/1N6/8/8/8/4K3 b - - 0 1', moves: 'h7h6 b5c7', rating: 1200, themes: ['fork'], openingTags: null, popularity: 90, nbPlays: 100 },
    ] as Awaited<ReturnType<typeof getPuzzlesByTheme>>);
    render(<PatternSchoolPage />);
    fireEvent.click(screen.getByTestId('pattern-toggle-fork'));
    await waitFor(() => expect(screen.getByTestId('pattern-find-it-fork')).toBeInTheDocument());
    expect(screen.getByTestId('mock-board').getAttribute('data-arrows')).toBe('');
    fireEvent.click(screen.getByTestId('pattern-show-it-fork'));
    expect(screen.getByTestId('mock-board').getAttribute('data-arrows')).toBe('b5c7');
    expect(screen.queryByTestId('pattern-find-it-fork')).toBeNull();
  });
});
