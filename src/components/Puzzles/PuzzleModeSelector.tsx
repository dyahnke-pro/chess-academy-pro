import { Zap, Calendar, Target, BookOpen, Crown } from 'lucide-react';
import { PUZZLE_MODES } from '../../services/puzzleService';
import type { PuzzleMode } from '../../services/puzzleService';

interface PuzzleModeSelectorProps {
  onSelectMode: (mode: PuzzleMode) => void;
}

const MODE_ICONS: Record<PuzzleMode, JSX.Element> = {
  standard: <Target size={24} />,
  timed_blitz: <Zap size={24} />,
  daily_challenge: <Calendar size={24} />,
  opening_traps: <BookOpen size={24} />,
  endgame: <Crown size={24} />,
};

export function PuzzleModeSelector({ onSelectMode }: PuzzleModeSelectorProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="puzzle-mode-selector">
      {PUZZLE_MODES.map((config) => (
        <button
          key={config.mode}
          onClick={() => onSelectMode(config.mode)}
          className="flex flex-col items-start gap-2 p-4 rounded-lg bg-theme-surface hover:bg-theme-border border border-theme-border transition-colors text-left group"
          aria-label={`${config.label}: ${config.description}`}
          data-testid={`mode-${config.mode}`}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="text-theme-accent">
              {MODE_ICONS[config.mode]}
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-theme-text">{config.label}</span>
            </div>
            {config.timeLimit !== null && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent">
                {config.timeLimit}s
              </span>
            )}
          </div>
          <p className="text-xs text-theme-text-muted leading-relaxed">
            {config.description}
          </p>
        </button>
      ))}
    </div>
  );
}
