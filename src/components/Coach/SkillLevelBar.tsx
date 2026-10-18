import { AnimatePresence, motion } from 'framer-motion';

/** One meter moving, as the board saw it (`useSkillMeterWatcher`). */
export interface SkillMove {
  id: string;
  label: string;
  /** Rating points this move added (gold) or took away (red). */
  delta: number;
  level: number;
  /** 0..1 toward the next level, after the move. */
  toNext: number;
  /** The level changed on this move: up or down. */
  levelChange: -1 | 0 | 1;
}

/**
 * SkillLevelBar — the small coin and level bar that shows one skill meter
 * moving mid-game (David 2026-10-18: "a little coin pings and sweeps up quickly
 * filling the bar. Not enough to stop game play"). Gold up, red down, one at a
 * time; the caller removes it after the same few seconds as the other chips.
 * The coin's size follows the points — a hard find is a fat coin.
 */
export function SkillLevelBar({ move }: { move: SkillMove | null }): JSX.Element {
  return (
    <AnimatePresence>
      {move && (
        <motion.div
          key={move.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none flex items-center gap-2 px-2 pt-1"
          data-testid="skill-level-bar"
          data-direction={move.delta >= 0 ? 'up' : 'down'}
        >
          <motion.span
            initial={{ y: 18, scale: 0.4, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className={`inline-block shrink-0 rounded-full ${coinSize(move.delta)} ${move.delta >= 0 ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]'}`}
            aria-hidden
          />
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text)]">
            {move.label} · Lv {move.level}
          </span>
          <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <motion.span
              initial={{ width: `${Math.round(Math.max(0, Math.min(1, move.toNext - move.delta / 100)) * 100)}%` }}
              animate={{ width: `${Math.round(move.toNext * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`absolute inset-y-0 left-0 rounded-full ${move.delta >= 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-200' : 'bg-rose-500'}`}
            />
          </span>
          <span className={`text-[11px] font-mono tabular-nums ${move.delta >= 0 ? 'text-amber-200' : 'text-rose-300'}`}>
            {move.levelChange === 1 ? 'LEVEL UP' : move.levelChange === -1 ? 'level down' : `${move.delta >= 0 ? '+' : '−'}${Math.max(1, Math.round(Math.abs(move.delta)))}`}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A tiny coin for an easy point, a fat one for a hard find. */
function coinSize(delta: number): string {
  const a = Math.abs(delta);
  return a >= 20 ? 'h-4 w-4' : a >= 8 ? 'h-3 w-3' : a >= 3 ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5';
}
