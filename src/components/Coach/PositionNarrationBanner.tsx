import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface PositionNarrationBannerProps {
  text: string;
  active: boolean;
}

/**
 * One-line subtitle banner for the "Read this position" narration.
 *
 * `active` stays true while the coach is streaming + speaking. When it
 * flips to false, the banner lingers for a beat so the student can
 * finish reading the last sentence before it fades out.
 */
export function PositionNarrationBanner({ text, active }: PositionNarrationBannerProps): JSX.Element {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mx-2 mb-1 rounded-xl backdrop-blur-md border border-emerald-500/30 px-3 py-2 shrink-0"
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
