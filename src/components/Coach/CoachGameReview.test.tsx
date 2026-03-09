import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import type { CoachGameMove, KeyMoment } from '../../types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/coachGameEngine', () => ({
  getAdaptiveMove: vi.fn().mockResolvedValue({
    move: 'e7e5',
    analysis: {
      bestMove: 'e7e5',
      evaluation: -20,
      isMate: false,
      mateIn: null,
      depth: 10,
      topLines: [{ rank: 1, evaluation: -20, moves: ['e7e5'], mate: null }],
      nodesPerSecond: 1000000,
    },
  }),
}));

vi.mock('../../services/coachTemplates', () => ({
  getMoveCommentaryTemplate: vi.fn().mockReturnValue('Solid choice.'),
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 12,
      topLines: [{ rank: 1, evaluation: 30, moves: ['e2e4'], mate: null }],
      nodesPerSecond: 1000000,
    }),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('AI generated commentary for this key moment.'),
  getCoachChatResponse: vi.fn().mockResolvedValue('The position is balanced with chances for both sides.'),
}));

vi.mock('../../services/coachPrompts', () => ({
  buildChessContextMessage: vi.fn().mockReturnValue('Position (FEN): test-fen'),
  POSITION_ANALYSIS_ADDITION: 'Test position analysis prompt',
}));

vi.mock('./ChatInput', () => ({
  ChatInput: ({ onSend, disabled, placeholder }: {
    onSend: (text: string) => void;
    disabled?: boolean;
    placeholder?: string;
  }) => (
    <div data-testid="chat-input" data-disabled={String(disabled ?? false)} data-placeholder={placeholder}>
      <button data-testid="mock-ask-send" onClick={() => onSend('Why is this position bad?')}>Send</button>
    </div>
  ),
}));

vi.mock('../../services/accuracyService', () => ({
  calculateAccuracy: vi.fn().mockReturnValue({ white: 72.5, black: 68.3, moveCount: 10 }),
  getClassificationCounts: vi.fn().mockReturnValue({
    brilliant: 1, great: 2, good: 4, book: 0,
    inaccuracy: 1, mistake: 1, blunder: 0,
  }),
}));

vi.mock('../../services/boardUtils', () => ({
  getCapturedPieces: vi.fn().mockReturnValue({ white: [], black: [] }),
  getMaterialAdvantage: vi.fn().mockReturnValue(0),
  uciToArrow: vi.fn().mockReturnValue(null),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ onMove, initialFen, interactive, arrows }: {
    onMove?: (r: unknown) => void;
    initialFen?: string;
    interactive?: boolean;
    arrows?: unknown[];
  }) => (
    <div data-testid="chess-board" data-fen={initialFen} data-interactive={String(interactive)} data-arrows={arrows?.length ?? 0}>
      {onMove && (
        <button data-testid="mock-board-move" onClick={() => onMove({ from: 'e2', to: 'e4', san: 'e4', fen: 'test-fen-after-move' })}>
          Mock Move
        </button>
      )}
    </div>
  ),
}));

vi.mock('./EvalGraph', () => ({
  EvalGraph: ({ currentMoveIndex, onMoveClick }: { currentMoveIndex: number | null; onMoveClick?: (i: number) => void }) => (
    <div data-testid="eval-graph" data-current-index={currentMoveIndex}>
      {onMoveClick && (
        <button data-testid="eval-graph-click" onClick={() => onMoveClick(0)}>
          Click Move
        </button>
      )}
    </div>
  ),
}));

vi.mock('./GameSummaryStats', () => ({
  GameSummaryStats: ({ result }: { result: string }) => (
    <div data-testid="game-summary-stats" data-result={result}>
      Summary
    </div>
  ),
}));

vi.mock('./PlayerInfoBar', () => ({
  PlayerInfoBar: ({ name }: { name: string }) => (
    <div data-testid="player-info-bar">{name}</div>
  ),
}));

vi.mock('./MoveNavigationControls', () => ({
  MoveNavigationControls: ({ onFirst, onPrev, onNext, onLast, currentIndex, totalMoves }: {
    onFirst: () => void; onPrev: () => void; onNext: () => void; onLast: () => void;
    currentIndex: number; totalMoves: number;
  }) => (
    <div data-testid="move-nav-controls">
      <button data-testid="nav-first" onClick={onFirst} disabled={currentIndex <= -1}>First</button>
      <button data-testid="nav-prev" onClick={onPrev} disabled={currentIndex <= -1}>Prev</button>
      <button data-testid="nav-next" onClick={onNext} disabled={currentIndex >= totalMoves - 1}>Next</button>
      <button data-testid="nav-last" onClick={onLast} disabled={currentIndex >= totalMoves - 1}>Last</button>
    </div>
  ),
}));

vi.mock('./MoveListPanel', () => ({
  MoveListPanel: ({ currentMoveIndex, openingName }: { currentMoveIndex: number | null; openingName: string | null }) => (
    <div data-testid="move-list-panel" data-current-index={currentMoveIndex} data-opening={openingName ?? ''}>
      Move List
    </div>
  ),
}));

// ─── Test Data ──────────────────────────────────────────────────────────────

const mockMoves: CoachGameMove[] = [
  { moveNumber: 1, san: 'e4', fen: 'fen-after-e4', isCoachMove: false, commentary: 'Good opening', evaluation: 30, classification: 'good', expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: 0 },
  { moveNumber: 2, san: 'e5', fen: 'fen-after-e5', isCoachMove: true, commentary: '', evaluation: -20, classification: null, expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: 30 },
  { moveNumber: 3, san: 'Nf3', fen: 'fen-after-nf3', isCoachMove: false, commentary: 'Developing knight', evaluation: 40, classification: 'good', expanded: false, bestMove: 'g1f3', bestMoveEval: 40, preMoveEval: -20 },
  { moveNumber: 4, san: 'Nc6', fen: 'fen-after-nc6', isCoachMove: true, commentary: '', evaluation: -15, classification: null, expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: 40 },
];

const mockKeyMoments: KeyMoment[] = [
  { moveNumber: 1, fen: 'fen-after-e4', explanation: 'You missed a fork', type: 'blunder' },
  { moveNumber: 3, fen: 'fen-after-nf3', explanation: 'Excellent sacrifice', type: 'brilliant' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderReview(overrides?: {
  moves?: CoachGameMove[];
  keyMoments?: KeyMoment[];
  playerColor?: 'white' | 'black';
  result?: string;
  openingName?: string | null;
  onPlayAgain?: () => void;
  onBackToCoach?: () => void;
}): ReturnType<typeof render> {
  return render(
    <CoachGameReviewComponent
      moves={overrides?.moves ?? mockMoves}
      keyMoments={overrides?.keyMoments ?? mockKeyMoments}
      playerColor={overrides?.playerColor ?? 'white'}
      result={overrides?.result ?? 'win'}
      openingName={overrides?.openingName ?? 'Italian Game'}
      playerName="Player"
      playerRating={1420}
      opponentRating={1320}
      onPlayAgain={overrides?.onPlayAgain ?? vi.fn()}
      onBackToCoach={overrides?.onBackToCoach ?? vi.fn()}
    />,
  );
}

// We need a lazy import reference since vi.mock hoists above imports
let CoachGameReviewComponent: typeof import('./CoachGameReview').CoachGameReview;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CoachGameReview', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./CoachGameReview');
    CoachGameReviewComponent = mod.CoachGameReview;
  });

  it('renders empty state when no moves', () => {
    renderReview({ moves: [] });

    const container = screen.getByTestId('coach-game-review');
    expect(container).toBeInTheDocument();
    expect(container).toHaveTextContent('No moves to review');
  });

  it('renders the review layout with all sections', () => {
    renderReview();

    expect(screen.getByTestId('coach-game-review')).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    expect(screen.getByTestId('eval-graph')).toBeInTheDocument();
    expect(screen.getByTestId('game-summary-stats')).toBeInTheDocument();
    expect(screen.getByTestId('move-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('move-nav-controls')).toBeInTheDocument();
  });

  it('defaults to last move position', () => {
    renderReview();

    // Board should show the last move FEN
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-nc6');
  });

  it('shows player info bars', () => {
    renderReview();

    const infoBars = screen.getAllByTestId('player-info-bar');
    expect(infoBars.length).toBe(2);
    expect(infoBars[0]).toHaveTextContent('AI Coach');
    expect(infoBars[1]).toHaveTextContent('Player');
  });

  it('passes result to GameSummaryStats', () => {
    renderReview({ result: 'loss' });

    expect(screen.getByTestId('game-summary-stats')).toHaveAttribute('data-result', 'loss');
  });

  it('passes opening name to MoveListPanel', () => {
    renderReview({ openingName: 'Sicilian Defense' });

    expect(screen.getByTestId('move-list-panel')).toHaveAttribute('data-opening', 'Sicilian Defense');
  });

  it('navigating with prev/next updates board position', () => {
    renderReview();

    // Initially at last move (index 3)
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-nc6');

    // Click prev
    fireEvent.click(screen.getByTestId('nav-prev'));
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-nf3');

    // Click prev again
    fireEvent.click(screen.getByTestId('nav-prev'));
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-e5');

    // Click next
    fireEvent.click(screen.getByTestId('nav-next'));
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-nf3');
  });

  it('navigating to first shows starting position', () => {
    renderReview();

    fireEvent.click(screen.getByTestId('nav-first'));

    // Should show starting FEN
    expect(screen.getByTestId('chess-board')).toHaveAttribute(
      'data-fen',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
  });

  it('navigating to last shows final position', () => {
    renderReview();

    // Go to first, then last
    fireEvent.click(screen.getByTestId('nav-first'));
    fireEvent.click(screen.getByTestId('nav-last'));

    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-nc6');
  });

  it('shows commentary for key moment moves', () => {
    renderReview();

    // Navigate to move index 0 (moveNumber 1) which is a key moment
    fireEvent.click(screen.getByTestId('nav-first'));
    fireEvent.click(screen.getByTestId('nav-next'));

    // Move 1 has key moment explanation 'You missed a fork'
    expect(screen.getByTestId('review-commentary')).toHaveTextContent('You missed a fork');
  });

  it('shows play again and back to coach buttons', () => {
    renderReview();

    expect(screen.getByTestId('play-again-btn')).toBeInTheDocument();
    expect(screen.getByTestId('play-again-btn')).toHaveTextContent('Play Again');
    expect(screen.getByTestId('back-to-coach-btn')).toBeInTheDocument();
    expect(screen.getByTestId('back-to-coach-btn')).toHaveTextContent('Back to Coach');
  });

  it('onPlayAgain callback fires when clicked', () => {
    const onPlayAgain = vi.fn();
    renderReview({ onPlayAgain });

    fireEvent.click(screen.getByTestId('play-again-btn'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('onBackToCoach callback fires when clicked', () => {
    const onBackToCoach = vi.fn();
    renderReview({ onBackToCoach });

    fireEvent.click(screen.getByTestId('back-to-coach-btn'));
    expect(onBackToCoach).toHaveBeenCalledTimes(1);
  });

  it('empty moves show play again and back to coach buttons', () => {
    const onPlayAgain = vi.fn();
    const onBackToCoach = vi.fn();
    renderReview({ moves: [], onPlayAgain, onBackToCoach });

    const playBtn = screen.getByText('Play Again');
    const backBtn = screen.getByText('Back to Coach');
    expect(playBtn).toBeInTheDocument();
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(onPlayAgain).toHaveBeenCalledTimes(1);

    fireEvent.click(backBtn);
    expect(onBackToCoach).toHaveBeenCalledTimes(1);
  });

  it('entering what-if mode shows banner and back-to-review button', async () => {
    renderReview();

    // Initially no whatif banner
    expect(screen.queryByTestId('whatif-banner')).not.toBeInTheDocument();

    // Make a move on the board to enter what-if mode
    fireEvent.click(screen.getByTestId('mock-board-move'));

    await waitFor(() => {
      expect(screen.getByTestId('whatif-banner')).toBeInTheDocument();
    });
    expect(screen.getByTestId('back-to-review-btn')).toBeInTheDocument();
    expect(screen.getByTestId('back-to-review-btn')).toHaveTextContent('Back to Review');
  });

  it('what-if mode shows variation move list', async () => {
    renderReview();

    // Make a move on the board
    fireEvent.click(screen.getByTestId('mock-board-move'));

    await waitFor(() => {
      expect(screen.getByTestId('whatif-moves')).toBeInTheDocument();
    });
    // Should include the move SAN in the variation list
    expect(screen.getByTestId('whatif-moves')).toHaveTextContent('e4');
  });

  it('back-to-review button returns to analysis mode', async () => {
    renderReview();

    // Enter what-if mode
    fireEvent.click(screen.getByTestId('mock-board-move'));

    await waitFor(() => {
      expect(screen.getByTestId('whatif-banner')).toBeInTheDocument();
    });

    // Click back to review
    fireEvent.click(screen.getByTestId('back-to-review-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('whatif-banner')).not.toBeInTheDocument();
    });

    // Should be back in analysis mode with move nav controls visible
    expect(screen.getByTestId('move-nav-controls')).toBeInTheDocument();
  });

  it('syncs eval graph current index with navigation', () => {
    renderReview();

    // Initially at last move
    expect(screen.getByTestId('eval-graph')).toHaveAttribute('data-current-index', '3');

    // Navigate to prev
    fireEvent.click(screen.getByTestId('nav-prev'));
    expect(screen.getByTestId('eval-graph')).toHaveAttribute('data-current-index', '2');
  });

  it('clicking eval graph move updates board position', () => {
    renderReview();

    // Click move 0 from eval graph
    fireEvent.click(screen.getByTestId('eval-graph-click'));

    // Board should now show the first move's FEN
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', 'fen-after-e4');
  });

  // ─── AI Features ───────────────────────────────────────────────────────────

  it('shows "Ask about this position" button', () => {
    renderReview();

    expect(screen.getByTestId('ask-position-btn')).toBeInTheDocument();
    expect(screen.getByTestId('ask-position-btn')).toHaveTextContent('Ask about this position');
  });

  it('expands ask panel when button is clicked', () => {
    renderReview();

    // Initially no ask panel
    expect(screen.queryByTestId('ask-position-panel')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByTestId('ask-position-btn'));

    expect(screen.getByTestId('ask-position-panel')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('sends question to coach API and shows response', async () => {
    const { getCoachChatResponse } = await import('../../services/coachApi');
    renderReview();

    // Expand ask panel
    fireEvent.click(screen.getByTestId('ask-position-btn'));

    // Send a question
    fireEvent.click(screen.getByTestId('mock-ask-send'));

    // Should call getCoachChatResponse
    await waitFor(() => {
      expect(getCoachChatResponse).toHaveBeenCalled();
    });

    // Should show response
    await waitFor(() => {
      expect(screen.getByTestId('ask-response')).toBeInTheDocument();
    });
  });

  it('loads AI commentary for key moment moves (blunder)', async () => {
    const { getCoachCommentary } = await import('../../services/coachApi');
    const blunderMoves: CoachGameMove[] = [
      { moveNumber: 1, san: 'e4', fen: 'fen-after-e4', isCoachMove: false, commentary: '', evaluation: 30, classification: 'blunder', expanded: false, bestMove: 'e2e4', bestMoveEval: 30, preMoveEval: 0 },
      { moveNumber: 2, san: 'e5', fen: 'fen-after-e5', isCoachMove: true, commentary: '', evaluation: -20, classification: null, expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: 30 },
    ];

    renderReview({ moves: blunderMoves });

    // Navigate to the blunder move (index 0)
    fireEvent.click(screen.getByTestId('nav-first'));
    fireEvent.click(screen.getByTestId('nav-next'));

    // Should call getCoachCommentary for the blunder
    await waitFor(() => {
      expect(getCoachCommentary).toHaveBeenCalledWith(
        'interactive_review',
        expect.objectContaining({ fen: 'fen-after-e4' }),
        expect.any(Function),
      );
    });

    // AI commentary section should appear
    await waitFor(() => {
      expect(screen.getByTestId('ai-commentary')).toBeInTheDocument();
    });
  });

  it('does not load AI commentary for good moves', async () => {
    const { getCoachCommentary } = await import('../../services/coachApi');
    (getCoachCommentary as ReturnType<typeof vi.fn>).mockClear();

    renderReview();

    // Navigate to move index 2 (classification: 'good')
    fireEvent.click(screen.getByTestId('nav-prev'));

    // getCoachCommentary should NOT be called for good classification
    await waitFor(() => {
      expect(getCoachCommentary).not.toHaveBeenCalled();
    });

    expect(screen.queryByTestId('ai-commentary')).not.toBeInTheDocument();
  });

  it('resets ask panel when navigating to different move', () => {
    renderReview();

    // Expand ask panel
    fireEvent.click(screen.getByTestId('ask-position-btn'));
    expect(screen.getByTestId('ask-position-panel')).toBeInTheDocument();

    // Navigate to different move
    fireEvent.click(screen.getByTestId('nav-prev'));

    // Ask panel should be collapsed
    expect(screen.queryByTestId('ask-position-panel')).not.toBeInTheDocument();
    // Button should be visible again
    expect(screen.getByTestId('ask-position-btn')).toBeInTheDocument();
  });
});
