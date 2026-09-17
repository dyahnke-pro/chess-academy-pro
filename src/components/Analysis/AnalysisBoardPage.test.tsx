import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { AnalysisBoardPage } from './AnalysisBoardPage';

const { mockAnalyzePosition } = vi.hoisted(() => ({
  mockAnalyzePosition: vi.fn().mockResolvedValue({
    bestMove: 'e2e4',
    evaluation: 25,
    isMate: false,
    mateIn: null,
    depth: 18,
    topLines: [
      { rank: 1, evaluation: 25, moves: ['e2e4', 'e7e5', 'd2d4'], mate: null },
      { rank: 2, evaluation: 15, moves: ['d2d4', 'd7d5'], mate: null },
    ],
    nodesPerSecond: 2500000,
  }),
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    analyzePosition: mockAnalyzePosition,
    getBestMove: vi.fn().mockResolvedValue('e2e4'),
    stop: vi.fn(),
    destroy: vi.fn(),
    onAnalysis: vi.fn().mockReturnValue(() => {}),
  },
}));

// NO chess.js MOCK. CLAUDE.md's mocking conventions say so outright ("chess.js:
// Do NOT mock — use the real library in tests"), and this file showed why: the
// hand-rolled Chess class here had no `pgn()`, so when `useChessGame` began
// returning `pgn: chess.pgn()` for the review's adaptGameRecord, EVERY render of
// the hook threw `TypeError: chess.pgn is not a function` and all 8 tests below
// went red — on `main`, in no gate list, unnoticed. A stub of a library is a
// second implementation that has to be kept in step with the first, and this one
// silently was not. The real library needs no maintenance and cannot drift.
//
// Nothing here depended on the stub: every assertion is about rendered UI, and
// the board itself is mocked at the react-chessboard boundary below.

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="chessboard">Board</div>,
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../services/tablebases', async () => {
  const actual = await vi.importActual<typeof import('../../services/tablebases')>('../../services/tablebases');
  return {
    ...actual,
    fetchTablebase: vi.fn().mockResolvedValue({
      dtz: 10,
      dtm: 14,
      checkmate: false,
      stalemate: false,
      variant_win: false,
      variant_loss: false,
      insufficient_material: false,
      category: 'win',
      moves: [],
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnalysisBoardPage', () => {
  it('renders the analysis board page', () => {
    render(<AnalysisBoardPage />);
    expect(screen.getByTestId('analysis-board')).toBeInTheDocument();
    expect(screen.getByText('Analysis Board')).toBeInTheDocument();
  });

  it('shows FEN input field', () => {
    render(<AnalysisBoardPage />);
    expect(screen.getByTestId('fen-input')).toBeInTheDocument();
    expect(screen.getByTestId('load-fen-btn')).toBeInTheDocument();
  });

  it('shows analyze button', () => {
    render(<AnalysisBoardPage />);
    expect(screen.getByTestId('analyze-btn')).toBeInTheDocument();
  });

  it('shows depth slider', () => {
    render(<AnalysisBoardPage />);
    expect(screen.getByTestId('depth-slider')).toBeInTheDocument();
    expect(screen.getByText('Depth: 18')).toBeInTheDocument();
  });

  it('runs analysis when analyze button is clicked', async () => {
    render(<AnalysisBoardPage />);

    fireEvent.click(screen.getByTestId('analyze-btn'));

    await waitFor(() => {
      expect(mockAnalyzePosition).toHaveBeenCalled();
      expect(screen.getByTestId('analysis-result')).toBeInTheDocument();
    });
  });

  it('displays evaluation result', async () => {
    render(<AnalysisBoardPage />);

    fireEvent.click(screen.getByTestId('analyze-btn'));

    await waitFor(() => {
      expect(screen.getByText('+0.25')).toBeInTheDocument();
      expect(screen.getByText('e2e4')).toBeInTheDocument();
      expect(screen.getByText('Depth 18')).toBeInTheDocument();
    });
  });

  it('displays top analysis lines', async () => {
    render(<AnalysisBoardPage />);

    fireEvent.click(screen.getByTestId('analyze-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('top-line-1')).toBeInTheDocument();
      expect(screen.getByTestId('top-line-2')).toBeInTheDocument();
    });
  });

  it('changes depth when slider is moved', () => {
    render(<AnalysisBoardPage />);
    const slider = screen.getByTestId('depth-slider');
    fireEvent.change(slider, { target: { value: '22' } });
    expect(screen.getByText('Depth: 22')).toBeInTheDocument();
  });
});
