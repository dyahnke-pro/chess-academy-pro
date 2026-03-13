import { motion } from 'framer-motion';
import { Star, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import { getStars } from '../../services/gamesService';

export interface GameCompleteCardProps {
  title: string;
  subtitle?: string;
  mistakes: number;
  hintsUsed: number;
  takebacksUsed: number;
  timeSeconds: number;
  onPlayAgain: () => void;
  onNext?: () => void;
  onBack: () => void;
  nextLabel?: string;
  hasNext: boolean;
}

export function GameCompleteCard({
  title,
  subtitle,
  mistakes,
  hintsUsed,
  takebacksUsed,
  timeSeconds,
  onPlayAgain,
  onNext,
  onBack,
  nextLabel = 'Next Opening',
  hasNext,
}: GameCompleteCardProps): JSX.Element {
  const stars = getStars(mistakes, hintsUsed);
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = Math.round(timeSeconds % 60);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const perfect = mistakes === 0 && hintsUsed === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center p-6 space-y-5"
      data-testid="game-complete-card"
    >
      {/* Stars */}
      <div className="flex gap-1">
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: n * 0.15 }}
          >
            <Star
              size={32}
              className={n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-theme-border'}
            />
          </motion.div>
        ))}
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-theme-text">
          {perfect ? 'Perfect!' : 'Line Complete!'}
        </h3>
        <p className="text-sm text-theme-text-muted mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-theme-text-muted">{subtitle}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-center text-xs text-theme-text-muted">
        <div>
          <p className="text-lg font-semibold text-theme-text">{timeStr}</p>
          <p>Time</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-theme-text">{mistakes}</p>
          <p>Retries</p>
        </div>
        {hintsUsed > 0 && (
          <div>
            <p className="text-lg font-semibold text-theme-text">{hintsUsed}</p>
            <p>Hints</p>
          </div>
        )}
        {takebacksUsed > 0 && (
          <div>
            <p className="text-lg font-semibold text-theme-text">{takebacksUsed}</p>
            <p>Takebacks</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-xs">
        {hasNext && onNext ? (
          <>
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-semibold text-theme-text hover:bg-theme-border transition-colors"
              data-testid="play-again-btn"
            >
              <RotateCcw size={14} />
              Again
            </button>
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              data-testid="next-btn"
            >
              {nextLabel}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              data-testid="play-again-btn"
            >
              <RotateCcw size={14} />
              Play Again
            </button>
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-semibold text-theme-text hover:bg-theme-border transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
