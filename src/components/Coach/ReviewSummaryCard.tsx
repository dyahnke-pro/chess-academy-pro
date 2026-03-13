import { motion } from 'framer-motion';
import { Bot, User, RotateCcw, Home, ChevronRight } from 'lucide-react';
import { AccuracyRing } from './AccuracyRing';
import { ClassificationBar } from './ClassificationBar';
import type { GameAccuracy, GamePhase, MoveClassificationCounts, PhaseAccuracy } from '../../types';

interface ReviewSummaryCardProps {
  result: string;
  playerName: string;
  playerRating: number;
  opponentRating: number;
  playerColor: 'white' | 'black';
  accuracy: GameAccuracy;
  classificationCounts: MoveClassificationCounts;
  opponentClassificationCounts: MoveClassificationCounts;
  phaseBreakdown: PhaseAccuracy[];
  openingName: string | null;
  moveCount: number;
  onStartReview: () => void;
  onPlayAgain: () => void;
  onBackToCoach: () => void;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

function getAccuracyBarColor(accuracy: number): string {
  if (accuracy >= 80) return 'var(--color-success)';
  if (accuracy >= 50) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function ReviewSummaryCard({
  result,
  playerName,
  playerRating,
  opponentRating,
  playerColor,
  accuracy,
  classificationCounts,
  opponentClassificationCounts,
  phaseBreakdown,
  openingName,
  moveCount,
  onStartReview,
  onPlayAgain,
  onBackToCoach,
}: ReviewSummaryCardProps): JSX.Element {
  const playerAccuracy = playerColor === 'white' ? accuracy.white : accuracy.black;
  const opponentAccuracy = playerColor === 'white' ? accuracy.black : accuracy.white;

  const resultLabel = result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw';
  const resultBg =
    result === 'win'
      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))'
      : result === 'loss'
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))'
        : 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))';
  const resultBorder =
    result === 'win'
      ? 'var(--color-success)'
      : result === 'loss'
        ? 'var(--color-error)'
        : 'var(--color-warning)';
  const resultTextColor =
    result === 'win'
      ? 'var(--color-success)'
      : result === 'loss'
        ? 'var(--color-error)'
        : 'var(--color-warning)';

  // Count player's classified moves
  const playerTotalClassified = (Object.values(classificationCounts) as number[]).reduce((a, b) => a + b, 0);
  const opponentTotalClassified = (Object.values(opponentClassificationCounts) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div
      className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-5 overflow-y-auto"
      data-testid="review-summary-card"
    >
      {/* Result Banner */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-xl p-4 text-center"
        style={{
          background: resultBg,
          border: `1px solid ${resultBorder}`,
        }}
        data-testid="result-banner"
      >
        <h2
          className="text-2xl font-bold mb-1"
          style={{ color: resultTextColor }}
        >
          {resultLabel}
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {moveCount} moves played
        </p>
      </motion.div>

      {/* Player vs Opponent with Accuracy Rings */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="w-full flex items-center justify-between px-2"
        data-testid="accuracy-comparison"
      >
        {/* Player side */}
        <div className="flex flex-col items-center gap-1.5">
          <AccuracyRing accuracy={playerAccuracy} size={90} strokeWidth={5} label="You" />
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-border)' }}
            >
              <User size={12} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--color-text)' }}>
                {playerName}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {playerRating}
              </p>
            </div>
          </div>
        </div>

        {/* VS divider */}
        <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
          vs
        </span>

        {/* Opponent side */}
        <div className="flex flex-col items-center gap-1.5">
          <AccuracyRing accuracy={opponentAccuracy} size={90} strokeWidth={5} label="Opp" />
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-border)' }}
            >
              <Bot size={12} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                Stockfish Bot
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {opponentRating}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Classification Bar (player) */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="w-full"
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Your Move Accuracy
        </p>
        <ClassificationBar counts={classificationCounts} totalMoves={playerTotalClassified} />
      </motion.div>

      {/* Opponent Classification Bar */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="w-full"
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Opponent Move Accuracy
        </p>
        <ClassificationBar counts={opponentClassificationCounts} totalMoves={opponentTotalClassified} />
      </motion.div>

      {/* Phase Accuracy */}
      {phaseBreakdown.some((p) => p.moveCount > 0) && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="w-full"
          data-testid="phase-breakdown"
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Phase Accuracy
          </p>
          <div className="space-y-2">
            {phaseBreakdown
              .filter((p) => p.moveCount > 0)
              .map((phase) => {
                const color = getAccuracyBarColor(phase.accuracy);
                return (
                  <div key={phase.phase} className="flex items-center gap-2">
                    <span
                      className="text-xs w-20 shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {PHASE_LABELS[phase.phase]}
                    </span>
                    <div
                      className="flex-1 h-2.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--color-surface)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, phase.accuracy)}%` }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="h-full rounded-full"
                        style={{ background: color }}
                      />
                    </div>
                    <span
                      className="text-xs font-mono w-10 text-right"
                      style={{ color }}
                    >
                      {phase.accuracy.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Opening name */}
      {openingName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full text-center"
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Opening:{' '}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-accent)' }}
            data-testid="opening-label"
          >
            {openingName}
          </span>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="w-full flex flex-col gap-2 pt-1"
      >
        <button
          onClick={onStartReview}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="start-review-btn"
        >
          Review Game
          <ChevronRight size={16} />
        </button>
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
