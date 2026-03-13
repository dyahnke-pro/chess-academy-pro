import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { OpeningChallenge } from './OpeningChallenge';
import { buildOpeningRecord } from '../../test/factories';

const mockRecordDrillAttempt = vi.fn().mockResolvedValue(undefined);
const mockUpdateWoodpecker = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/openingService', () => ({
  recordDrillAttempt: (...args: unknown[]): Promise<void> => mockRecordDrillAttempt(...args) as Promise<void>,
  updateWoodpecker: (...args: unknown[]): Promise<void> => mockUpdateWoodpecker(...args) as Promise<void>,
}));

vi.mock('../../services/gamesService', () => ({
  getWelcomeMessage: vi.fn().mockReturnValue('Let\'s practice!'),
  getWrongMoveMessage: vi.fn().mockReturnValue('Try again!'),
  getCorrectMoveMessage: vi.fn().mockReturnValue('Nice!'),
  getStars: vi.fn().mockReturnValue(3),
}));

const mockInjectAssistantMessage = vi.fn();
vi.mock('../Board/BoardPageLayout', () => ({
  BoardPageLayout: ({
    testId,
    aboveBoard,
    belowBoard,
    boardOverlay,
    boardFen,
    boardInteractive,
    onBoardMove,
    chatRef,
    header,
  }: {
    testId?: string;
    aboveBoard?: React.ReactNode;
    belowBoard?: React.ReactNode;
    boardOverlay?: React.ReactNode;
    boardFen: string;
    boardInteractive: boolean;
    onBoardMove?: (move: { from: string; to: string; san?: string }) => void;
    chatRef?: React.RefObject<{ injectAssistantMessage: (text: string) => void } | null>;
    header?: { title: string; subtitle?: string; onBack: () => void };
  }) => {
    // Wire up the chatRef mock
    if (chatRef && 'current' in chatRef) {
      (chatRef as { current: { injectAssistantMessage: typeof mockInjectAssistantMessage } | null }).current = {
        injectAssistantMessage: mockInjectAssistantMessage,
      };
    }
    return (
      <div data-testid={testId}>
        {header && <div data-testid="header">{header.title} <span data-testid="subtitle">{header.subtitle}</span> <button data-testid="back-btn" onClick={header.onBack}>Back</button></div>}
        {aboveBoard}
        <div data-testid="board-area">
          <span data-testid="board-fen">{boardFen}</span>
          <span data-testid="board-interactive">{String(boardInteractive)}</span>
          {boardInteractive && (
            <button
              data-testid="make-correct-move"
              onClick={() => onBoardMove?.({ from: 'e2', to: 'e4', san: 'e4' })}
            >
              Play Correct
            </button>
          )}
          {boardInteractive && (
            <button
              data-testid="make-wrong-move"
              onClick={() => onBoardMove?.({ from: 'a2', to: 'a3', san: 'a3' })}
            >
              Play Wrong
            </button>
          )}
        </div>
        {boardOverlay}
        {belowBoard}
      </div>
    );
  },
}));

vi.mock('../Coach/HintButton', () => ({
  HintButton: ({ onRequestHint, currentLevel, disabled }: { onRequestHint: () => void; currentLevel: number; disabled?: boolean }) => (
    <button data-testid="hint-button" data-level={currentLevel} onClick={onRequestHint} disabled={disabled}>
      Hint
    </button>
  ),
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../hooks/useBoardContext', () => ({
  useBoardContext: vi.fn(),
}));

describe('OpeningChallenge', () => {
  const opening = buildOpeningRecord({
    id: 'test-opening',
    name: 'Test Opening',
    pgn: 'e4 e5 Nf3',
    color: 'white',
    eco: 'C20',
    keyIdeas: ['Control the center'],
  });

  const defaultProps = {
    opening,
    queuePosition: '1 / 3',
    hasNext: true,
    onComplete: vi.fn(),
    onNext: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the opening name in header', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByTestId('opening-challenge')).toBeInTheDocument();
    expect(screen.getByText('Test Opening')).toBeInTheDocument();
  });

  it('shows queue position in subtitle', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByText(/Move 0 \/ 3/)).toBeInTheDocument();
  });

  it('renders hint and takeback buttons', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    expect(screen.getByTestId('takeback-btn')).toBeInTheDocument();
  });

  it('board is interactive on player turn', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByTestId('board-interactive').textContent).toBe('true');
  });

  it('mounts without errors', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByTestId('opening-challenge')).toBeInTheDocument();
  });

  it('calls onExit when back button is clicked', () => {
    render(<OpeningChallenge {...defaultProps} />);
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(defaultProps.onExit).toHaveBeenCalled();
  });

  it('handles wrong move by injecting coach message', () => {
    render(<OpeningChallenge {...defaultProps} />);
    fireEvent.click(screen.getByTestId('make-wrong-move'));
    expect(mockInjectAssistantMessage).toHaveBeenCalledWith('Try again!');
  });

  it('handles correct move without crashing', () => {
    render(<OpeningChallenge {...defaultProps} />);
    // Clicking correct move should not throw
    fireEvent.click(screen.getByTestId('make-correct-move'));
    expect(screen.getByTestId('opening-challenge')).toBeInTheDocument();
  });

  it('hint button increments level when clicked', () => {
    render(<OpeningChallenge {...defaultProps} />);
    const hintBtn = screen.getByTestId('hint-button');
    expect(hintBtn.getAttribute('data-level')).toBe('0');
    fireEvent.click(hintBtn);
    expect(hintBtn.getAttribute('data-level')).toBe('1');
  });

  it('takeback button is disabled when at move 0', () => {
    render(<OpeningChallenge {...defaultProps} />);
    expect(screen.getByTestId('takeback-btn')).toBeDisabled();
  });
});
