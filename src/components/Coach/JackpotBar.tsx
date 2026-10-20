import { AnimatePresence, motion } from 'framer-motion';
import { RollingNumber } from '../ui/RollingNumber';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { levelOfXp, multiplierFor } from '../../services/jackpot';

/** One payout landing in the bar (`useJackpot` makes it; this only draws it). */
export interface JackpotGain {
  id: string;
  coins: number;
  /** What paid ("DECISION", "CHECKMATE", "TACTICS +12"). */
  label: string;
  /** The payout crossed a level — the whole bar goes off. */
  jackpot: boolean;
}

const LIGHTS = 16;

/** The glow burns hotter as the streak multiplier climbs. */
const HEAT: Record<1 | 2 | 3 | 5, string> = {
  1: 'shadow-[0_0_18px_rgba(251,191,36,0.55)] border-amber-300',
  2: 'shadow-[0_0_28px_rgba(251,191,36,0.85)] border-yellow-200',
  3: 'shadow-[0_0_36px_rgba(251,146,60,0.95)] border-orange-300',
  5: 'shadow-[0_0_48px_rgba(239,68,68,1)] border-red-300',
};

/**
 * JackpotBar — the gold slot-machine bar over the top of the Learn board
 * (David 2026-10-20: "larger and gold glowing. Like a slot machine!! … I want
 * it over the top! Something that makes it exciting to play!!"). The player's
 * XP level on a reel, the fill toward the next level, the coin count, the
 * streak multiplier, and every payout landing with a shine and a coin pop.
 * It takes the student's own strip under the board — the row the player bar
 * had — so the board keeps its size; payouts pop upward over it for a moment.
 * It never takes a tap.
 */
export function JackpotBar({ xp, streak, gain }: { xp: number; streak: number; gain: JackpotGain | null }): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const { level, toNext, into, span } = levelOfXp(xp);
  const mult = multiplierFor(streak);
  const hot = mult > 1;
  return (
    <div className="pointer-events-none relative px-2 pt-1" data-testid="jackpot-bar" data-level={level} data-multiplier={mult}>
      <motion.div
        key={gain?.jackpot ? `jp-${gain.id}` : 'bar'}
        animate={gain?.jackpot && !reduced ? { scale: [1, 1.12, 0.98, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.9 }}
        className={`relative flex h-14 items-center gap-2 overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-[#4a3006] via-[#1f1403] to-black px-2 ${HEAT[mult]}`}
      >
        {/* Marquee lights along the top edge, chasing like a slot machine. */}
        <div className="absolute inset-x-3 top-0.5 flex justify-between" aria-hidden>
          {Array.from({ length: LIGHTS }, (_, i) => (
            <motion.span
              key={i}
              className={`h-1 w-1 rounded-full ${hot ? 'bg-orange-200' : 'bg-yellow-200'} shadow-[0_0_6px_rgba(253,224,71,1)]`}
              animate={reduced ? { opacity: 0.8 } : { opacity: [0.25, 1, 0.25] }}
              transition={{ duration: hot ? 0.6 : 1.2, repeat: Infinity, delay: (i % 4) * (hot ? 0.15 : 0.3) }}
            />
          ))}
        </div>

        {/* THE LEVEL REEL — a new level spins down and slams into place. */}
        <div className="relative flex h-10 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-amber-400/80 bg-black/80 shadow-[inset_0_0_10px_rgba(251,191,36,0.5)]">
          <span className="text-[8px] font-black uppercase leading-none tracking-widest text-amber-300/80">Level</span>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={level}
              initial={reduced ? false : { y: '-260%', opacity: 0.4 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? undefined : { y: '260%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 13 }}
              className="font-mono text-xl font-black leading-none text-yellow-200 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]"
              data-testid="jackpot-level"
            >
              {level}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* THE FILL toward the next level, with a shine on every payout. */}
        <div className="relative h-6 flex-1 overflow-hidden rounded-full border border-amber-500/60 bg-black/80">
          <motion.div
            initial={false}
            animate={{ width: `${Math.round(toNext * 1000) / 10}%` }}
            transition={{ duration: reduced ? 0 : 0.9, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-400 shadow-[0_0_14px_rgba(250,204,21,0.9)]"
            data-testid="jackpot-fill"
          />
          {!reduced && (
            <motion.div
              key={gain?.id ?? 'idle'}
              initial={{ x: '-120%' }}
              animate={{ x: '360%' }}
              transition={gain ? { duration: 0.8, ease: 'easeOut' } : { duration: 2.6, repeat: Infinity, repeatDelay: 1.2 }}
              className={`absolute inset-y-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent ${gain ? 'via-white' : 'via-white/40'} to-transparent`}
              aria-hidden
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap font-mono text-[10px] font-black tabular-nums">
            <span className="rounded px-1 text-yellow-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{into}/{span}{hot ? '' : ' XP'}</span>
          </span>
        </div>

        {/* THE STREAK MULTIPLIER — a flame that grows with every decision. */}
        <AnimatePresence>
          {hot && (
            <motion.span
              key={mult}
              initial={reduced ? false : { scale: 2.2, rotate: -12, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { scale: [1, 1.14, 1], rotate: 0, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={reduced ? undefined : { scale: { duration: 0.7, repeat: Infinity }, default: { type: 'spring', stiffness: 400, damping: 12 } }}
              className="shrink-0 rounded-lg bg-gradient-to-t from-red-600 via-orange-500 to-yellow-300 px-1.5 py-0.5 font-mono text-base font-black text-black shadow-[0_0_16px_rgba(249,115,22,1)]"
              data-testid="jackpot-multiplier"
            >
              ×{mult}
            </motion.span>
          )}
        </AnimatePresence>

        {/* THE COIN COUNT, rolling up like an odometer. */}
        <div className="flex shrink-0 items-center gap-1">
          <motion.span
            key={gain?.id ?? 'coin'}
            initial={gain && !reduced ? { rotateY: 0, scale: 1.6 } : false}
            animate={{ rotateY: 720, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative inline-block h-6 w-6 rounded-full border-2 border-yellow-100 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 shadow-[0_0_12px_rgba(250,204,21,1)]"
            aria-hidden
          >
            <span className="absolute inset-1 rounded-full border border-amber-800/60" />
          </motion.span>
          <RollingNumber value={xp} className="font-mono text-xl font-black tabular-nums text-yellow-200 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" testId="jackpot-coins" />
        </div>
      </motion.div>

      {/* THE PAYOUT — the coins won, popping off the bar. */}
      <AnimatePresence>
        {gain && (
          <motion.div
            key={gain.id}
            initial={reduced ? { opacity: 0 } : { y: 24, scale: 0.4, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { y: 0, scale: [0.4, 1.35, 1], opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: -40, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-full right-4 z-30 mb-1 flex flex-col items-end"
            data-testid="jackpot-gain"
          >
            <span className={`font-black tabular-nums text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,1)] ${gain.coins >= 100 ? 'text-4xl' : gain.coins >= 40 ? 'text-3xl' : 'text-2xl'}`}>
              +{gain.coins}
            </span>
            <span className="rounded-md bg-black/70 px-1.5 text-[11px] font-black uppercase tracking-widest text-amber-200">
              {gain.label}{hot ? ` ×${mult}` : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* THE JACKPOT — the screen's edges flash gold. */}
      <AnimatePresence>
        {gain?.jackpot && !reduced && (
          <motion.div
            key={`edge-${gain.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.2, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8 }}
            className="fixed inset-0 z-[69] border-[6px] border-yellow-300 shadow-[inset_0_0_90px_rgba(250,204,21,0.85)]"
            aria-hidden
            data-testid="jackpot-edges"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
