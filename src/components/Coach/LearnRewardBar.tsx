import { AnimatePresence, motion } from 'framer-motion';
import { RollingNumber } from '../ui/RollingNumber';
import { getMisconceptionTag } from '../../data/misconceptionTags';

/**
 * LearnRewardBar — the Learn game's running reward strip (David 2026-10-01):
 * the DECISION STREAK (real questions answered in a row; book and obvious
 * moves neither count nor break it) and the GREEN tiles, mid-game, for every
 * capability this game proved. Small, in the corner of attention — the
 * coach's voice stays the main channel.
 */
export function LearnRewardBar({ streak, provenTags }: { streak: number; provenTags: readonly string[] }): JSX.Element | null {
  if (streak === 0 && provenTags.length === 0) return null;
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
      {streak > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/50 bg-cyan-400/10 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.45)]"
          data-testid="learn-decision-streak"
        >
          Decisions in a row <RollingNumber value={streak} className="font-mono tabular-nums" />
        </span>
      )}
    </div>
  );
}
