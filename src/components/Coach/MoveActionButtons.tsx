import { Eye, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoachGameMove, MoveClassification } from '../../types';

interface MoveActionButtonsProps {
  currentMove: CoachGameMove | null;
  onShowBestMove: () => void;
  onRetryPosition: () => void;
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            data-testid="show-best-btn"
          >
            <Eye size={14} />
            Show Best
          </button>
          <button
            onClick={onRetryPosition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
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
