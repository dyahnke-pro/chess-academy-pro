import { motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';

interface ReviewWhatIfBannerProps {
  isThinking: boolean;
  onBackToReview: () => void;
}

export function ReviewWhatIfBanner({ isThinking, onBackToReview }: ReviewWhatIfBannerProps): JSX.Element {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="rounded-lg mx-2 mt-1 p-2.5 flex items-center justify-between overflow-hidden"
      style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))' }}
      data-testid="whatif-banner"
    >
      <div className="flex items-center gap-2">
        <Undo2 size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
          What-If Mode
        </span>
        {isThinking && (
          <span className="text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
            Thinking...
          </span>
        )}
      </div>
      <button
        onClick={onBackToReview}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="back-to-review-btn"
      >
        Back to Review
      </button>
    </motion.div>
  );
}
