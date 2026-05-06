import { motion } from 'framer-motion';
import { RotateCcw, Home, ChevronRight, Bot, Target, FastForward } from 'lucide-react';
import { AnimatedAccuracy } from './AnimatedAccuracy';
import { ClassificationPills } from './ClassificationPills';
import { PhaseGrades } from './PhaseGrades';
import { EvalGraph } from './EvalGraph';
import type { CoachGameMove, GameAccuracy, MoveClassificationCounts, PhaseAccuracy } from '../../types';

interface ReviewSummaryCardProps {
  result: string;
  playerColor: 'white' | 'black';
  accuracy: GameAccuracy;
  classificationCounts: MoveClassificationCounts;
  phaseBreakdown: PhaseAccuracy[];
  openingName: string | null;
  moveCount: number;
  moves: CoachGameMove[];
  narrativeSummary?: string;
  missedOpportunities?: number;
  /** Optional now: when omitted, the Start Review buttons are hidden.
   *  The prep-failed fallback in CoachGameReview opts out so users
   *  don't get routed into the dormant analysis phase via this card. */
  onStartReview?: (depth: 'quick' | 'full') => void;
  onPlayAgain: () => void;
  onBackToCoach: () => void;
  onNavigateToMistakes?: () => void;
}

export function ReviewSummaryCard({
  result,
  playerColor,
  accuracy,
  classificationCounts,
  phaseBreakdown,
  openingName,
  moveCount,
  moves,
  narrativeSummary,
  missedOpportunities,
  onStartReview,
  onPlayAgain,
  onBackToCoach,
  onNavigateToMistakes,
}: ReviewSummaryCardProps): JSX.Element {
  const playerAccuracy = playerColor === 'white' ? accuracy.white : accuracy.black;

  const resultLabel = result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw';
  const resultColor =
    result === 'win'
      ? 'var(--color-success)'
      : result === 'loss'
        ? 'var(--color-error)'
        : 'var(--color-warning)';

  return (
    <div
      className="flex flex-col items-center w-full max-w-md mx-auto p-4 pb-24 gap-5 overflow-y-auto"
      data-testid="review-summary-card"
    >
      {/* Compact Result Banner */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
        data-testid="result-banner"
      >
        <span
          className="text-lg font-bold"
          style={{ color: resultColor }}
        >
          {resultLabel}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &middot; {moveCount} moves
        </span>
      </motion.div>

      {/* Hero Accuracy */}
      <AnimatedAccuracy accuracy={playerAccuracy} />

      {/* Eval Graph */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full"
        data-testid="summary-eval-graph"
      >
        <EvalGraph
          moves={moves}
          currentMoveIndex={null}
          size="compact"
        />
      </motion.div>

      {/* Phase Grades */}
      <PhaseGrades phases={phaseBreakdown} />

      {/* Classification Pills */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="w-full"
      >
        <ClassificationPills counts={classificationCounts} />
      </motion.div>

      {/* Opening name */}
      {openingName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full text-center"
        >
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
            data-testid="opening-label"
          >
            {openingName}
          </span>
        </motion.div>
      )}

      {/* Coach Narrative Bubble */}
      {narrativeSummary && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="w-full rounded-xl p-3.5 flex gap-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="coach-narrative"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            <Bot size={16} />
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text)' }}
          >
            {narrativeSummary}
          </p>
        </motion.div>
      )}

      {/* Missed Opportunities Callout */}
      {missedOpportunities !== undefined && missedOpportunities > 0 && (
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.38 }}
          onClick={onNavigateToMistakes}
          className="w-full rounded-lg p-3 flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
          data-testid="missed-opportunities-callout"
        >
          <Target size={16} style={{ color: '#a855f7' }} />
          <span className="text-sm" style={{ color: '#a855f7' }}>
            {missedOpportunities} missed {missedOpportunities === 1 ? 'opportunity' : 'opportunities'}
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
            Practice &rarr;
          </span>
        </motion.button>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="w-full flex flex-col gap-2 pt-1"
      >
        {/* Start Review buttons — hidden when onStartReview is omitted
            (the CoachGameReview prep-failed fallback opts out so users
            don't enter the dormant analysis phase via this card). */}
        {onStartReview && <div className="flex gap-2">
          <button
            onClick={() => onStartReview('quick')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            data-testid="start-review-quick-btn"
          >
            <FastForward size={14} />
            Quick Review
          </button>
          <button
            onClick={() => onStartReview('full')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="start-review-full-btn"
          >
            Full Review
            <ChevronRight size={16} />
          </button>
        </div>}
        <div className="flex gap-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            data-testid="summary-play-again-btn"
          >
            <RotateCcw size={14} />
            Play Again
          </button>
          <button
            onClick={onBackToCoach}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            data-testid="summary-back-btn"
          >
            <Home size={14} />
            Back to Coach
          </button>
        </div>
      </motion.div>
    </div>
  );
}
