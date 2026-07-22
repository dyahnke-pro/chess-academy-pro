import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { PatternSchoolPage } from './PatternSchoolPage';
import { PATTERN_REGISTRY } from '../../data/patternRegistry';

vi.mock('../../services/analytics', () => ({ captureEvent: vi.fn() }));
vi.mock('../../services/puzzleService', () => ({
  // One real Lichess-format puzzle: fen BEFORE the setup move; moves[0] is
  // the opponent's move that creates the tactic (here 1...e5 from the start
  // position — legality is all the component needs).
  getPuzzlesByTheme: vi.fn().mockResolvedValue([
    { id: 'p1', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', moves: 'e7e5 g1f3', rating: 1500, themes: ['fork'], openingTags: null, popularity: 90, nbPlays: 100 },
  ]),
}));
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => <div data-testid="mock-board" data-fen={fen} />,
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
    expect(screen.getByTestId('pattern-drill-fork')).toBeInTheDocument();
  });
});
