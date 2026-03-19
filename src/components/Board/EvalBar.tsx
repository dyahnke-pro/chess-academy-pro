import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface EvalBarProps {
  evaluation: number | null;
  isMate: boolean;
  mateIn: number | null;
  horizontal?: boolean;
  className?: string;
}

const MAX_PAWNS = 10;

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
  return 50 + (clamped / MAX_PAWNS) * 45;
}

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

const SPRING_CONFIG = { type: 'spring' as const, stiffness: 80, damping: 15 };

export function EvalBar({
  evaluation,
  isMate,
  mateIn,
  horizontal = false,
  className = '',
}: EvalBarProps): JSX.Element {
  const whitePercent = useMemo(
    () => getWhitePercent(evaluation, isMate, mateIn),
    [evaluation, isMate, mateIn],
  );
  const blackPercent = 100 - whitePercent;
  const label = useMemo(
    () => getEvalLabel(evaluation, isMate, mateIn),
    [evaluation, isMate, mateIn],
  );

  const whiteIsWinning = whitePercent >= 50;
  const isMateScore = isMate && mateIn !== null;

  if (horizontal) {
    return (
      <div
        className={`relative flex flex-row h-6 w-full rounded-md overflow-hidden select-none ${className}`}
        data-testid="eval-bar"
        aria-label={`Evaluation: ${label}`}
      >
        {/* Black segment (left) */}
        <motion.div
          className="flex items-center justify-start pl-2 overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #1a1a1a, #2d2d2d)',
            fontSize: '0.65rem',
            color: '#aaa',
            fontWeight: 600,
          }}
          animate={{ width: `${blackPercent}%` }}
          transition={SPRING_CONFIG}
          data-testid="eval-bar-black"
        >
          {!whiteIsWinning && (
            <motion.span
              className="whitespace-nowrap"
              animate={isMateScore ? { scale: [1, 1.1, 1] } : {}}
              transition={isMateScore ? { repeat: Infinity, duration: 1.5 } : {}}
              data-testid="eval-label"
            >
              {label}
            </motion.span>
          )}
        </motion.div>

        {/* Center tick */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ background: 'rgba(128, 128, 128, 0.3)' }}
        />

        {/* White segment (right) */}
        <motion.div
          className="flex items-center justify-end pr-2 overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #e5e5e5, #f5f5f5)',
            fontSize: '0.65rem',
            color: '#444',
            fontWeight: 600,
          }}
          animate={{ width: `${whitePercent}%` }}
          transition={SPRING_CONFIG}
          data-testid="eval-bar-white"
        >
          {whiteIsWinning && (
            <motion.span
              className="whitespace-nowrap"
              animate={isMateScore ? { scale: [1, 1.1, 1] } : {}}
              transition={isMateScore ? { repeat: Infinity, duration: 1.5 } : {}}
              data-testid="eval-label"
            >
              {label}
            </motion.span>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col w-7 rounded-md overflow-hidden select-none ${className}`}
      data-testid="eval-bar"
      aria-label={`Evaluation: ${label}`}
      style={{ minHeight: '100%' }}
    >
      {/* Black segment (top) */}
      <motion.div
        className="flex items-start justify-center pt-1.5"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a, #2d2d2d)',
          fontSize: '0.6rem',
          color: '#aaa',
          fontWeight: 600,
        }}
        animate={{ height: `${blackPercent}%` }}
        transition={SPRING_CONFIG}
        data-testid="eval-bar-black"
      >
        {!whiteIsWinning && (
          <motion.span
            animate={isMateScore ? { scale: [1, 1.15, 1] } : {}}
            transition={isMateScore ? { repeat: Infinity, duration: 1.5 } : {}}
            data-testid="eval-label"
          >
            {label}
          </motion.span>
        )}
      </motion.div>

      {/* Center tick */}
      <div
        className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
        style={{ background: 'rgba(128, 128, 128, 0.3)' }}
      />

      {/* White segment (bottom) */}
      <motion.div
        className="flex items-end justify-center pb-1.5"
        style={{
          background: 'linear-gradient(180deg, #e5e5e5, #f5f5f5)',
          fontSize: '0.6rem',
          color: '#444',
          fontWeight: 600,
        }}
        animate={{ height: `${whitePercent}%` }}
        transition={SPRING_CONFIG}
        data-testid="eval-bar-white"
      >
        {whiteIsWinning && (
          <motion.span
            animate={isMateScore ? { scale: [1, 1.15, 1] } : {}}
            transition={isMateScore ? { repeat: Infinity, duration: 1.5 } : {}}
            data-testid="eval-label"
          >
            {label}
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
