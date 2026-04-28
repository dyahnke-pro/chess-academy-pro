import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface EvalBarProps {
  /** Evaluation in centipawns. Positive = white winning, negative = black winning. */
  evaluation: number | null;
  isMate: boolean;
  mateIn: number | null;
  /** Render as a horizontal bar (left = black, right = white). */
  horizontal?: boolean;
  /** WO-VISIBLE-POLISH bug 4 — when the displayed value is held over
   *  from a prior tick (Stockfish failed on the current position), the
   *  bar renders at reduced opacity and the label gets a `?` suffix
   *  so the user knows the value is approximate, not engine-grounded. */
  approximate?: boolean;
  className?: string;
}

const MAX_PAWNS = 10; // Clamp bar display at ±10 pawns (±1000 cp)

/** Convert centipawn evaluation to a 0–100 white percentage for the bar. */
function getWhitePercent(
  evaluation: number | null,
  isMate: boolean,
  mateIn: number | null,
): number {
  if (isMate) {
    return mateIn !== null && mateIn > 0 ? 100 : 0;
  }
  if (evaluation === null) return 50;
  const pawns = evaluation / 100;
  const clamped = Math.min(MAX_PAWNS, Math.max(-MAX_PAWNS, pawns));
  // Map from [-10, +10] to [5%, 95%] to always show a sliver of each colour
  return 50 + (clamped / MAX_PAWNS) * 45;
}

/** Format evaluation text shown at the segment boundary. */
function getEvalLabel(
  evaluation: number | null,
  isMate: boolean,
  mateIn: number | null,
): string {
  if (isMate && mateIn !== null) {
    return `M${mateIn}`;
  }
  if (evaluation === null) return '0.0';
  const pawns = evaluation / 100;
  const abs = Math.abs(pawns);
  const formatted = abs.toFixed(1);
  return pawns >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function EvalBar({
  evaluation,
  isMate,
  mateIn,
  horizontal = false,
  approximate = false,
  className = '',
}: EvalBarProps): JSX.Element {
  const whitePercent = useMemo(
    () => getWhitePercent(evaluation, isMate, mateIn),
    [evaluation, isMate, mateIn],
  );
  const blackPercent = 100 - whitePercent;
  const baseLabel = useMemo(
    () => getEvalLabel(evaluation, isMate, mateIn),
    [evaluation, isMate, mateIn],
  );
  const label = approximate ? `${baseLabel}?` : baseLabel;
  const opacityClass = approximate ? 'opacity-60' : '';

  // Show label on the winning side's segment (wherever there's more room)
  const whiteIsWinning = whitePercent >= 50;

  if (horizontal) {
    return (
      <div
        className={`relative flex flex-row h-5 w-full rounded overflow-hidden select-none ${opacityClass} ${className}`}
        data-testid="eval-bar"
        aria-label={`Evaluation: ${label}`}
        data-approximate={approximate ? 'true' : 'false'}
      >
        {/* Black segment (left) */}
        <motion.div
          className="bg-neutral-800 flex items-center justify-start pl-1.5 overflow-hidden"
          style={{ fontSize: '0.6rem', color: '#aaa', fontWeight: 600 }}
          initial={false}
          animate={{ width: `${blackPercent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          data-testid="eval-bar-black"
        >
          {!whiteIsWinning && (
            <span className="whitespace-nowrap" data-testid="eval-label">{label}</span>
          )}
        </motion.div>

        {/* White segment (right) */}
        <motion.div
          className="bg-neutral-100 flex items-center justify-end pr-1.5 overflow-hidden"
          style={{ fontSize: '0.6rem', color: '#555', fontWeight: 600 }}
          initial={false}
          animate={{ width: `${whitePercent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          data-testid="eval-bar-white"
        >
          {whiteIsWinning && (
            <span className="whitespace-nowrap" data-testid="eval-label">{label}</span>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col w-4 rounded overflow-hidden select-none ${opacityClass} ${className}`}
      data-testid="eval-bar"
      aria-label={`Evaluation: ${label}`}
      data-approximate={approximate ? 'true' : 'false'}
      style={{ minHeight: '100%' }}
    >
      {/* Black segment (top) */}
      <motion.div
        className="bg-neutral-800 flex items-start justify-center pt-1"
        style={{ fontSize: '0.55rem', color: '#aaa', fontWeight: 600 }}
        initial={false}
        animate={{ height: `${blackPercent}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        data-testid="eval-bar-black"
      >
        {!whiteIsWinning && (
          <span data-testid="eval-label">{label}</span>
        )}
      </motion.div>

      {/* White segment (bottom) */}
      <motion.div
        className="bg-neutral-100 flex items-end justify-center pb-1"
        style={{ fontSize: '0.55rem', color: '#555', fontWeight: 600 }}
        initial={false}
        animate={{ height: `${whitePercent}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        data-testid="eval-bar-white"
      >
        {whiteIsWinning && (
          <span data-testid="eval-label">{label}</span>
        )}
      </motion.div>
    </div>
  );
}
