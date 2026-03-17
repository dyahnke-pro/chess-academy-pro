import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewAnalysisPanel } from './ReviewAnalysisPanel';
import type { CoachGameMove, KeyMoment, MissedTactic, PhaseAccuracy, GamePhase } from '../../types';

vi.mock('./EvalGraph', () => ({
  EvalGraph: ({ onMoveClick }: { onMoveClick: (i: number) => void }) => (
    <div data-testid="eval-graph" onClick={() => onMoveClick(3)}>EvalGraph</div>
  ),
}));

vi.mock('./MoveListPanel', () => ({
  MoveListPanel: ({ onMoveClick }: { onMoveClick: (i: number) => void }) => (
    <div data-testid="move-list-panel" onClick={() => onMoveClick(2)}>MoveList</div>
  ),
}));

vi.mock('./ChatInput', () => ({
  ChatInput: ({ onSend }: { onSend: (q: string) => void }) => (
    <button data-testid="chat-input" onClick={() => onSend('test question')}>Send</button>
  ),
}));

const baseMoves: CoachGameMove[] = [
  {
    moveNumber: 1,
    san: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    isCoachMove: false,
    commentary: 'Good move',
    evaluation: 30,
    classification: 'good',
    expanded: false,
    bestMove: 'e2e4',
    bestMoveEval: 30,
    preMoveEval: 0,
  },
];

const defaultProps = {
  moves: baseMoves,
  currentMoveIndex: 0,
  reviewMode: 'analysis' as const,
  openingName: null,
  onMoveClick: vi.fn(),
  keyMoments: [] as KeyMoment[],
  phaseBreakdown: [] as PhaseAccuracy[],
  phaseDetails: {} as Partial<Record<GamePhase, string>>,
  loadingPhase: null,
  onRequestPhaseDetail: vi.fn(),
  missedTactics: [] as MissedTactic[],
  onStartPractice: vi.fn(),
  commentary: '',
  aiCommentary: null,
  isLoadingAiCommentary: false,
  askExpanded: false,
  onToggleAsk: vi.fn(),
  askResponse: null,
  isAskStreaming: false,
  onAskSend: vi.fn(),
  isGuidedLesson: false,
  guidedComplete: false,
  narrativeSummary: null,
  isLoadingNarrative: false,
  onPlayAgain: vi.fn(),
  onBackToCoach: vi.fn(),
};

describe('ReviewAnalysisPanel', () => {
  it('renders eval graph and move list', () => {
    render(<ReviewAnalysisPanel {...defaultProps} />);
    expect(screen.getByTestId('eval-graph')).toBeInTheDocument();
    expect(screen.getByTestId('move-list-panel')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<ReviewAnalysisPanel {...defaultProps} />);
    expect(screen.getByTestId('play-again-btn')).toBeInTheDocument();
    expect(screen.getByTestId('back-to-coach-btn')).toBeInTheDocument();
  });

  it('calls onPlayAgain when clicked', () => {
    const handler = vi.fn();
    render(<ReviewAnalysisPanel {...defaultProps} onPlayAgain={handler} />);
    fireEvent.click(screen.getByTestId('play-again-btn'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders commentary when provided', () => {
    render(<ReviewAnalysisPanel {...defaultProps} commentary="Great opening play!" />);
    expect(screen.getByTestId('review-commentary')).toBeInTheDocument();
    expect(screen.getByText('Great opening play!')).toBeInTheDocument();
  });

  it('renders AI commentary when provided', () => {
    render(<ReviewAnalysisPanel {...defaultProps} aiCommentary="This blunder lost the game." />);
    expect(screen.getByTestId('ai-commentary')).toBeInTheDocument();
    expect(screen.getByText('This blunder lost the game.')).toBeInTheDocument();
  });

  it('shows ask position button when not expanded', () => {
    render(<ReviewAnalysisPanel {...defaultProps} askExpanded={false} />);
    expect(screen.getByTestId('ask-position-btn')).toBeInTheDocument();
  });

  it('calls onToggleAsk when ask button clicked', () => {
    const handler = vi.fn();
    render(<ReviewAnalysisPanel {...defaultProps} onToggleAsk={handler} />);
    fireEvent.click(screen.getByTestId('ask-position-btn'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders missed tactics panel when tactics exist', () => {
    const tactics: MissedTactic[] = [{
      moveIndex: 0,
      playerMoved: 'e4',
      bestMove: 'Nf3',
      fen: 'test',
      evalSwing: 200,
      tacticType: 'fork',
      explanation: 'Fork the king and queen',
    }];
    render(<ReviewAnalysisPanel {...defaultProps} missedTactics={tactics} />);
    expect(screen.getByTestId('missed-tactics-panel')).toBeInTheDocument();
  });

  it('renders practice in chat button when handler provided', () => {
    const tactics: MissedTactic[] = [{
      moveIndex: 0,
      playerMoved: 'e4',
      bestMove: 'Nf3',
      fen: 'test',
      evalSwing: 200,
      tacticType: 'fork',
      explanation: 'Fork',
    }];
    render(<ReviewAnalysisPanel {...defaultProps} missedTactics={tactics} onPracticeInChat={vi.fn()} />);
    expect(screen.getByTestId('practice-in-chat-btn')).toBeInTheDocument();
  });

  it('renders narrative summary in guided lesson mode', () => {
    render(
      <ReviewAnalysisPanel
        {...defaultProps}
        isGuidedLesson={true}
        guidedComplete={true}
        narrativeSummary="You played a great game!"
      />,
    );
    expect(screen.getByTestId('narrative-summary')).toBeInTheDocument();
  });
});
