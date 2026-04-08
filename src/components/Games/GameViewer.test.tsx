import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { GameViewer } from './GameViewer';
import { buildGameRecord } from '../../test/factories';

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('../Board/ControlledChessBoard', () => ({
  ControlledChessBoard: (props: Record<string, unknown>) => {
    const game = props.game as { fen?: string; boardOrientation?: string } | undefined;
    return (
      <div data-testid="chess-board" data-fen={game?.fen ?? ''} data-orientation={game?.boardOrientation ?? 'white'}>Board</div>
    );
  },
}));

vi.mock('../../hooks/useChessGame', () => ({
  useChessGame: (_initialFen?: string, initialOrientation: 'white' | 'black' = 'white') => ({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    inCheck: false,
    isCheck: false,
    checkSquare: null,
    isGameOver: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    lastMove: null,
    history: [],
    selectedSquare: null,
    legalMoves: [],
    boardOrientation: initialOrientation,
    makeMove: vi.fn().mockReturnValue(null),
    onDrop: vi.fn().mockReturnValue(null),
    onSquareClick: vi.fn().mockReturnValue(null),
    flipBoard: vi.fn(),
    setOrientation: vi.fn(),
    undoMove: vi.fn(),
    resetGame: vi.fn(),
    clearSelection: vi.fn(),
    getLegalMoves: vi.fn().mockReturnValue([]),
    getPiece: vi.fn().mockReturnValue(null),
    reset: vi.fn(),
    loadFen: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('../Openings/MoveTree', () => ({
  MoveTree: ({ currentMoveIndex, onMoveSelect }: { currentMoveIndex: number; onMoveSelect: (idx: number) => void }) => (
    <div data-testid="move-tree" data-move-index={currentMoveIndex} onClick={() => onMoveSelect(0)}>
      Moves
    </div>
  ),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

describe('GameViewer', () => {
  const defaultGame = buildGameRecord({
    id: 'viewer-g1',
    pgn: '[Event "Test"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0',
    white: 'Alice',
    black: 'Bob',
    result: '1-0',
    date: '2026-01-15',
  });

  const onCloseMock = vi.fn();

  it('renders the game-viewer container', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByTestId('game-viewer')).toBeInTheDocument();
  });

  it('renders the chess board at starting position', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    const board = screen.getByTestId('chess-board');
    expect(board).toBeInTheDocument();
    expect(board).toHaveAttribute('data-fen', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('renders forward and back navigation buttons', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByTestId('nav-start')).toBeInTheDocument();
    expect(screen.getByTestId('nav-prev')).toBeInTheDocument();
    expect(screen.getByTestId('nav-next')).toBeInTheDocument();
    expect(screen.getByTestId('nav-end')).toBeInTheDocument();
  });

  it('renders the close callback button', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByTestId('close-viewer-btn')).toBeInTheDocument();
  });

  it('close button calls onClose callback when clicked', () => {
    const closeFn = vi.fn();
    render(<GameViewer game={defaultGame} onClose={closeFn} />);
    fireEvent.click(screen.getByTestId('close-viewer-btn'));
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it('renders the PGN export button', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByTestId('export-pgn-btn')).toBeInTheDocument();
  });

  it('displays player names and result', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByText('Alice vs Bob')).toBeInTheDocument();
    expect(screen.getByText(/1-0/)).toBeInTheDocument();
  });

  it('displays the game date', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument();
  });

  it('renders the move tree component', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.getByTestId('move-tree')).toBeInTheDocument();
  });

  it('shows move counter at 0 of total moves initially', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    // moveIdx starts at -1, display is moveIdx+1 = 0, and there are 4 moves (e4, e5, Nf3, Nc6)
    expect(screen.getByText('0/4')).toBeInTheDocument();
  });

  it('does not render coach analysis when none exists', () => {
    render(<GameViewer game={defaultGame} onClose={onCloseMock} />);
    expect(screen.queryByText('Coach Analysis')).not.toBeInTheDocument();
  });

  it('renders coach analysis when coachAnalysis is present', () => {
    const gameWithAnalysis = buildGameRecord({
      id: 'viewer-analysis',
      pgn: '1. e4 e5 1-0',
      white: 'White',
      black: 'Black',
      coachAnalysis: 'Good game overall. Consider developing knights early.',
    });
    render(<GameViewer game={gameWithAnalysis} onClose={onCloseMock} />);
    expect(screen.getByText('Coach Analysis')).toBeInTheDocument();
    expect(screen.getByText('Good game overall. Consider developing knights early.')).toBeInTheDocument();
  });
});
