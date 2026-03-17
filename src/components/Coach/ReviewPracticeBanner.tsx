import { motion } from 'framer-motion';
import { Target, CheckCircle2, XCircle } from 'lucide-react';
import type { MissedTactic } from '../../types';

interface ReviewPracticeBannerProps {
  practiceTarget: MissedTactic;
  practiceResult: 'pending' | 'correct' | 'incorrect' | null;
  practiceAttempts: number;
  isGuidedLesson: boolean;
  onExitPractice: () => void;
}

export function ReviewPracticeBanner({
  practiceTarget,
  practiceResult,
  practiceAttempts,
  isGuidedLesson,
  onExitPractice,
}: ReviewPracticeBannerProps): JSX.Element {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="rounded-lg mx-2 mt-1 p-2.5 overflow-hidden"
      style={{ background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' }}
      data-testid="practice-banner"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: 'var(--color-success)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
            Find the best move!
          </span>
        </div>
        <button
          onClick={onExitPractice}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="exit-practice-btn"
        >
          {isGuidedLesson ? 'Back to Lesson' : 'Back to Review'}
        </button>
      </div>
      {practiceResult === 'correct' && (
        <div className="flex items-center gap-1.5 mt-2" data-testid="practice-correct">
          <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
            You found it! {practiceTarget.explanation}
          </span>
        </div>
      )}
      {practiceResult === 'incorrect' && (
        <div className="flex items-center gap-1.5 mt-2" data-testid="practice-incorrect">
          <XCircle size={14} style={{ color: 'var(--color-error)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
            The best move was {practiceTarget.bestMove}. {practiceTarget.explanation}
          </span>
        </div>
      )}
      {practiceResult === 'pending' && practiceAttempts > 0 && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Not quite — try again ({3 - practiceAttempts} attempt{3 - practiceAttempts !== 1 ? 's' : ''} left)
        </p>
      )}
    </motion.div>
  );
}
