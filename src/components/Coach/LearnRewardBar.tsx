import { AnimatePresence, motion } from 'framer-motion';
import { getMisconceptionTag } from '../../data/misconceptionTags';

/**
 * LearnRewardBar — the GREEN tiles, mid-game, for every capability this game
 * proved (David 2026-10-01). The decision streak moved into the gold jackpot
 * bar as its multiplier (`JackpotBar`, 2026-10-20).
 */
export function LearnRewardBar({ provenTags }: { provenTags: readonly string[] }): JSX.Element | null {
  if (provenTags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-2 pt-1" data-testid="learn-reward-bar">
      <AnimatePresence>
        {provenTags.map((tag) => (
          <motion.span
            key={tag}
            initial={{ scale: 0.3, opacity: 0, backgroundColor: 'rgba(244,63,94,0.35)' }}
            animate={{ scale: 1, opacity: 1, backgroundColor: 'rgba(34,197,94,0.18)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 16, backgroundColor: { duration: 0.9 } }}
            className="rounded-lg border border-green-400/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            data-testid="learn-proven-tile"
          >
            Fixed: {getMisconceptionTag(tag)?.label ?? tag}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
