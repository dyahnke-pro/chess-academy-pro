import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ExplanationCardProps {
  text: string;
  visible: boolean;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'error' | 'warning';
}

export function ExplanationCard({
  text,
  visible,
  onDismiss,
  actionLabel,
  onAction,
  variant = 'info',
}: ExplanationCardProps): JSX.Element {
  const borderColor =
    variant === 'error'
      ? 'border-red-500/30'
      : variant === 'warning'
        ? 'border-amber-500/30'
        : 'border-white/15';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`relative rounded-2xl backdrop-blur-xl bg-theme-surface/90 border ${borderColor} p-4 shadow-lg`}
          data-testid="explanation-card"
        >
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-theme-border/50 text-theme-text-muted"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          )}

          <p className="text-sm text-theme-text leading-relaxed pr-6">{text}</p>

          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="mt-3 px-4 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              data-testid="explanation-action"
            >
              {actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
