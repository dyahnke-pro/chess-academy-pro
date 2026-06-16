import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, X } from 'lucide-react';

interface PositionNarrationBannerProps {
  text: string;
  active: boolean;
  /** When provided, the banner PERSISTS until the student dismisses it — via
   *  the X button (calls this) or a board move (the parent clears `text`).
   *  Without it, the banner keeps the old auto-linger behaviour (phase
   *  narration, which is transient + auto). David 2026-06-15: the "Read this
   *  position" subtitle vanished too fast; let it stay until dismissed. */
  onDismiss?: () => void;
}

/**
 * One-line subtitle banner for the "Read this position" narration.
 *
 * Two modes:
 *  - **Dismissible (onDismiss provided):** persists while `text` is present
 *    until the student taps the X (→ onDismiss) or makes a move (parent
 *    clears `text`). No auto-fade — David asked for it to stay long enough
 *    to read.
 *  - **Auto (no onDismiss):** `active` stays true while streaming; when it
 *    flips false the banner lingers ~2s then fades (transient phase
 *    narration).
 */
export function PositionNarrationBanner({ text, active, onDismiss }: PositionNarrationBannerProps): JSX.Element {
  const dismissible = !!onDismiss;
  const [autoVisible, setAutoVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-linger timer — only used in the non-dismissible (phase) mode.
  useEffect(() => {
    if (dismissible) return;
    if (active) {
      setAutoVisible(true);
      return;
    }
    const t = setTimeout(() => setAutoVisible(false), 2000);
    return () => clearTimeout(t);
  }, [active, dismissible]);

  // A NEW narration (text change) clears any prior manual dismissal.
  useEffect(() => {
    if (text) setDismissed(false);
  }, [text]);

  const visible = dismissible ? (!!text && !dismissed) : (autoVisible && !!text);

  const handleDismiss = (): void => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="sticky top-0 z-20 mx-2 mb-1 rounded-xl backdrop-blur-md border border-emerald-500/30 px-3 py-2 shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--color-bg) 85%, rgba(16, 185, 129, 0.3))',
          }}
          data-testid="position-narration-banner"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <Volume2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <p
              className="text-xs leading-relaxed flex-1 min-w-0"
              style={{ color: 'var(--color-text)' }}
            >
              {text}
            </p>
            {dismissible && (
              <button
                onClick={handleDismiss}
                aria-label="Dismiss narration"
                data-testid="position-narration-dismiss"
                className="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded-md hover:bg-emerald-500/20 transition-colors"
              >
                <X size={15} className="text-emerald-400" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
