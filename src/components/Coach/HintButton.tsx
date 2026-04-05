import { Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HintLevel } from '../../types';

interface HintButtonProps {
  currentLevel: HintLevel;
  onRequestHint: () => void;
  disabled?: boolean;
  maxLevel?: HintLevel;
  tacticActive?: boolean;
}

const LEVEL_LABELS: Record<HintLevel, string> = {
  0: 'Get a Hint',
  1: 'Show Nudge',
  2: 'Show Move',
  3: 'Hints Used',
};

const LEVEL_COLORS: Record<HintLevel, string> = {
  0: 'text-yellow-500 border-yellow-500/30',
  1: 'text-orange-500 border-orange-500/30',
  2: 'text-red-500 border-red-500/30',
  3: 'text-theme-text-muted border-theme-border',
};

export function HintButton({
  currentLevel,
  onRequestHint,
  disabled,
  maxLevel = 3,
  tacticActive = false,
}: HintButtonProps): JSX.Element {
  const isMaxed = currentLevel >= maxLevel;
  const showPulse = tacticActive && !isMaxed && !disabled;

  return (
    <div className="relative">
      <AnimatePresence>
        {showPulse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-1 rounded-xl bg-yellow-500/20 border border-yellow-500/40 pointer-events-none"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        )}
      </AnimatePresence>
      <button
        onClick={onRequestHint}
        disabled={disabled || isMaxed}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors active:scale-95 disabled:opacity-50 ${showPulse ? 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' : LEVEL_COLORS[currentLevel]}`}
        data-testid="hint-button"
        data-level={currentLevel}
        data-tactic-active={tacticActive}
      >
        <Lightbulb size={16} className={showPulse ? 'animate-bounce' : ''} />
        <span>{showPulse && currentLevel === 0 ? 'Tactic Hint' : LEVEL_LABELS[currentLevel]}</span>
        {/* Level dots */}
        <div className="flex gap-1 ml-1">
          {([1, 2, 3] as const).map((level) => (
            <span
              key={level}
              className={`w-1.5 h-1.5 rounded-full ${
                level <= currentLevel ? 'bg-current' : 'bg-theme-border'
              }`}
            />
          ))}
        </div>
      </button>
    </div>
  );
}
