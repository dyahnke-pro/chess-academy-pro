import { Eye, RotateCcw, GitBranch, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoachGameMove, MoveClassification } from '../../types';

interface MoveActionButtonsProps {
  currentMove: CoachGameMove | null;
  onShowBestMove: () => void;
  onRetryPosition: () => void;
  onShowBestLine?: () => void;
  showingBestLine?: boolean;
  /** Drops the user into free-play / what-if mode from the current position
   *  so they can explore the best line (or alternatives) on the real board. */
  onPlayFromHere?: () => void;
  /** True when the board is already in play-from-here mode. */
  playingFromHere?: boolean;
  className?: string;
}

const SUBOPTIMAL_CLASSIFICATIONS: MoveClassification[] = [
  'inaccuracy', 'mistake', 'blunder', 'miss',
];

function isSuboptimal(move: CoachGameMove | null): boolean {
  if (!move) return false;
  if (move.isCoachMove) return false;
  return !!move.classification && SUBOPTIMAL_CLASSIFICATIONS.includes(move.classification);
}

export function MoveActionButtons({
  currentMove,
  onShowBestMove,
  onRetryPosition,
  onShowBestLine,
  showingBestLine = false,
  onPlayFromHere,
  playingFromHere = false,
  className = '',
}: MoveActionButtonsProps): JSX.Element {
  const show = isSuboptimal(currentMove);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="move-actions"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className={`flex items-center gap-2 ${className}`}
          data-testid="move-action-buttons"
        >
          <button
            onClick={onShowBestMove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: 'var(--color-surface)',
              color: 'rgb(52, 211, 153)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              boxShadow: '0 0 6px rgba(52, 211, 153, 0.2)',
            }}
            data-testid="show-best-btn"
          >
            <Eye size={14} />
            Show Best
          </button>
          {onPlayFromHere && (
            <button
              onClick={onPlayFromHere}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-80"
              style={{
                background: playingFromHere ? 'rgb(6, 182, 212)' : 'var(--color-surface)',
                color: playingFromHere ? 'var(--color-bg)' : 'rgb(6, 182, 212)',
                border: `1px solid ${playingFromHere ? 'rgb(6, 182, 212)' : 'rgba(6, 182, 212, 0.3)'}`,
                boxShadow: playingFromHere ? '0 0 10px rgba(6, 182, 212, 0.5)' : '0 0 6px rgba(6, 182, 212, 0.2)',
              }}
              data-testid="play-from-here-btn"
            >
              <Swords size={14} />
              {playingFromHere ? 'Exit Play' : 'Play'}
            </button>
          )}
          {onShowBestLine && (
            <button
              onClick={onShowBestLine}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-80"
              style={{
                background: showingBestLine ? 'var(--color-accent)' : 'var(--color-surface)',
                color: showingBestLine ? 'var(--color-bg)' : 'rgb(139, 92, 246)',
                border: `1px solid ${showingBestLine ? 'var(--color-accent)' : 'rgba(139, 92, 246, 0.3)'}`,
                boxShadow: showingBestLine ? '0 0 10px rgba(139, 92, 246, 0.5)' : '0 0 6px rgba(139, 92, 246, 0.2)',
              }}
              data-testid="show-line-btn"
            >
              <GitBranch size={14} />
              {showingBestLine ? 'Exit Line' : 'Best Line'}
            </button>
          )}
          <button
            onClick={onRetryPosition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: 'var(--color-surface)',
              color: 'rgb(251, 113, 133)',
              border: '1px solid rgba(251, 113, 133, 0.3)',
              boxShadow: '0 0 6px rgba(251, 113, 133, 0.2)',
            }}
            data-testid="retry-btn"
          >
            <RotateCcw size={14} />
            Retry
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
