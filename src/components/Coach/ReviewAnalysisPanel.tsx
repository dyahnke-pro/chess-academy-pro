import { Zap, Crosshair, MessageCircle, Loader2, Target, GraduationCap, RotateCcw, Home } from 'lucide-react';
import { EvalGraph } from './EvalGraph';
import { MoveListPanel } from './MoveListPanel';
import { CriticalMomentsStrip } from './CriticalMomentsStrip';
import { PhaseSummaryCards } from './PhaseSummaryCards';
import { ChatInput } from './ChatInput';
import type { CoachGameMove, KeyMoment, ReviewMode, MissedTactic, PhaseAccuracy, GamePhase } from '../../types';

interface ReviewAnalysisPanelProps {
  moves: CoachGameMove[];
  currentMoveIndex: number;
  reviewMode: ReviewMode;
  openingName: string | null;
  onMoveClick: (moveIndex: number) => void;
  // Critical moments
  keyMoments: KeyMoment[];
  // Phase summary
  phaseBreakdown: PhaseAccuracy[];
  phaseDetails: Partial<Record<GamePhase, string>>;
  loadingPhase: GamePhase | null;
  onRequestPhaseDetail: (phase: GamePhase) => void;
  // Missed tactics
  missedTactics: MissedTactic[];
  onStartPractice: (tactic: MissedTactic) => void;
  // Commentary
  commentary: string;
  aiCommentary: string | null;
  isLoadingAiCommentary: boolean;
  // Ask about position
  askExpanded: boolean;
  onToggleAsk: () => void;
  askResponse: string | null;
  isAskStreaming: boolean;
  onAskSend: (question: string) => void;
  // Practice in chat
  onPracticeInChat?: () => void;
  // Guided lesson narrative
  isGuidedLesson: boolean;
  guidedComplete: boolean;
  narrativeSummary: string | null;
  isLoadingNarrative: boolean;
  // Actions
  onPlayAgain: () => void;
  onBackToCoach: () => void;
}

export function ReviewAnalysisPanel({
  moves,
  currentMoveIndex,
  reviewMode,
  openingName,
  onMoveClick,
  keyMoments,
  phaseBreakdown,
  phaseDetails,
  loadingPhase,
  onRequestPhaseDetail,
  missedTactics,
  onStartPractice,
  commentary,
  aiCommentary,
  isLoadingAiCommentary,
  askExpanded,
  onToggleAsk,
  askResponse,
  isAskStreaming,
  onAskSend,
  onPracticeInChat,
  isGuidedLesson,
  guidedComplete,
  narrativeSummary,
  isLoadingNarrative,
  onPlayAgain,
  onBackToCoach,
}: ReviewAnalysisPanelProps): JSX.Element {
  const showMoveIndex = reviewMode === 'analysis' || reviewMode === 'guided_lesson' ? currentMoveIndex : null;

  return (
    <div className="flex flex-col h-[45dvh] md:h-auto md:flex-1 md:border-l border-theme-border min-h-[220px] overflow-y-auto">
      {/* Eval graph */}
      <div className="px-2 py-1 border-b border-theme-border">
        <EvalGraph
          moves={moves}
          currentMoveIndex={showMoveIndex}
          onMoveClick={onMoveClick}
        />
      </div>

      {/* Critical moments strip */}
      <CriticalMomentsStrip
        moments={keyMoments}
        moves={moves}
        currentMoveIndex={currentMoveIndex}
        onMomentClick={onMoveClick}
      />

      {/* Phase summary cards */}
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={phaseDetails}
        loadingPhase={loadingPhase}
        onRequestDetail={onRequestPhaseDetail}
      />

      {/* Move list panel */}
      <div className="flex-1 min-h-[100px] border-b border-theme-border overflow-hidden">
        <MoveListPanel
          moves={moves}
          openingName={openingName}
          currentMoveIndex={showMoveIndex}
          onMoveClick={onMoveClick}
          className="h-full"
        />
      </div>

      {/* Missed Tactics Panel */}
      {missedTactics.length > 0 && (
        <div className="px-3 py-2 border-b border-theme-border" data-testid="missed-tactics-panel">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={12} style={{ color: 'var(--color-warning)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-warning)' }}>
              Missed Tactics ({missedTactics.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {missedTactics.map((tactic, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-theme-surface transition-colors cursor-pointer"
                onClick={() => onMoveClick(tactic.moveIndex)}
                data-testid={`missed-tactic-${i}`}
              >
                <Crosshair size={12} style={{ color: 'var(--color-text-muted)' }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    Move {Math.ceil(moves[tactic.moveIndex].moveNumber / 2)}:{' '}
                    <span className="capitalize">{tactic.tacticType.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="text-[10px] ml-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    ({(tactic.evalSwing / 100).toFixed(1)} pawns)
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPractice(tactic);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid={`try-it-${i}`}
                >
                  Try It
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commentary panel */}
      {commentary && (
        <div
          className="p-3 border-b border-theme-border"
          data-testid="review-commentary"
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
            {commentary}
          </p>
        </div>
      )}

      {/* AI Key Moment Commentary */}
      {(aiCommentary || isLoadingAiCommentary) && (
        <div
          className="px-3 py-2 border-b border-theme-border"
          data-testid="ai-commentary"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
              AI Analysis
            </span>
            {isLoadingAiCommentary && (
              <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            )}
          </div>
          {aiCommentary && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {aiCommentary}
            </p>
          )}
        </div>
      )}

      {/* Ask About This Position */}
      <div className="border-b border-theme-border">
        {!askExpanded ? (
          <button
            onClick={onToggleAsk}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-accent)' }}
            data-testid="ask-position-btn"
          >
            <MessageCircle size={14} />
            Ask about this position
          </button>
        ) : (
          <div data-testid="ask-position-panel">
            {askResponse !== null && (
              <div className="px-3 pt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                    Coach
                  </span>
                  {isAskStreaming && (
                    <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                  )}
                </div>
                <p
                  className="text-xs leading-relaxed mb-2"
                  style={{ color: 'var(--color-text)' }}
                  data-testid="ask-response"
                >
                  {askResponse || (isAskStreaming ? '' : 'No response')}
                </p>
              </div>
            )}
            <ChatInput
              onSend={onAskSend}
              disabled={isAskStreaming}
              placeholder="Ask about this position..."
            />
          </div>
        )}
      </div>

      {/* Practice Suggestions */}
      {missedTactics.length > 0 && onPracticeInChat && (
        <div className="px-3 py-2 border-b border-theme-border" data-testid="practice-suggestions">
          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Want to practice similar positions? The coach can set up interactive tactics for you.
          </p>
          <button
            onClick={onPracticeInChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="practice-in-chat-btn"
          >
            <Target size={12} />
            Practice in Chat
          </button>
        </div>
      )}

      {/* Guided Lesson Narrative Summary */}
      {isGuidedLesson && guidedComplete && (
        <div className="p-3 border-b border-theme-border" data-testid="narrative-summary">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
              Game Summary
            </span>
            {isLoadingNarrative && (
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            )}
          </div>
          {narrativeSummary ? (
            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
              {narrativeSummary}
            </p>
          ) : isLoadingNarrative ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Generating your game summary...
            </p>
          ) : null}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-center p-3">
        <button
          onClick={onPlayAgain}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="play-again-btn"
        >
          <RotateCcw size={14} />
          Play Again
        </button>
        <button
          onClick={onBackToCoach}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:opacity-90"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="back-to-coach-btn"
        >
          <Home size={14} />
          Back to Coach
        </button>
      </div>
    </div>
  );
}
