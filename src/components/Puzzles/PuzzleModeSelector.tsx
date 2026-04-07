import { Zap, Calendar, Target, BookOpen, Crown } from 'lucide-react';
import { PUZZLE_MODES } from '../../services/puzzleService';
import type { PuzzleMode } from '../../services/puzzleService';

interface PuzzleModeSelectorProps {
  onSelectMode: (mode: PuzzleMode) => void;
}

interface ModeStyle {
  icon: JSX.Element;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
  glowHover: string;
  tagBg: string;
  tagText: string;
}

const MODE_STYLES: Record<PuzzleMode, ModeStyle> = {
  standard: {
    icon: <Target size={24} />,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/5',
    glowColor: '0 0 12px rgba(245, 158, 11, 0.3), 0 0 4px rgba(245, 158, 11, 0.15)',
    glowHover: '0 0 22px rgba(245, 158, 11, 0.5), 0 0 8px rgba(245, 158, 11, 0.25)',
    tagBg: 'bg-amber-500/20',
    tagText: 'text-amber-400',
  },
  timed_blitz: {
    icon: <Zap size={24} />,
    iconColor: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/5',
    glowColor: '0 0 12px rgba(139, 92, 246, 0.3), 0 0 4px rgba(139, 92, 246, 0.15)',
    glowHover: '0 0 22px rgba(139, 92, 246, 0.5), 0 0 8px rgba(139, 92, 246, 0.25)',
    tagBg: 'bg-violet-500/20',
    tagText: 'text-violet-400',
  },
  daily_challenge: {
    icon: <Calendar size={24} />,
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/5',
    glowColor: '0 0 12px rgba(34, 211, 238, 0.3), 0 0 4px rgba(34, 211, 238, 0.15)',
    glowHover: '0 0 22px rgba(34, 211, 238, 0.5), 0 0 8px rgba(34, 211, 238, 0.25)',
    tagBg: 'bg-cyan-500/20',
    tagText: 'text-cyan-400',
  },
  opening_traps: {
    icon: <BookOpen size={24} />,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5',
    glowColor: '0 0 12px rgba(52, 211, 153, 0.3), 0 0 4px rgba(52, 211, 153, 0.15)',
    glowHover: '0 0 22px rgba(52, 211, 153, 0.5), 0 0 8px rgba(52, 211, 153, 0.25)',
    tagBg: 'bg-emerald-500/20',
    tagText: 'text-emerald-400',
  },
  endgame: {
    icon: <Crown size={24} />,
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-500/5',
    glowColor: '0 0 12px rgba(244, 63, 94, 0.3), 0 0 4px rgba(244, 63, 94, 0.15)',
    glowHover: '0 0 22px rgba(244, 63, 94, 0.5), 0 0 8px rgba(244, 63, 94, 0.25)',
    tagBg: 'bg-rose-500/20',
    tagText: 'text-rose-400',
  },
};

export function PuzzleModeSelector({ onSelectMode }: PuzzleModeSelectorProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="puzzle-mode-selector">
      {PUZZLE_MODES.map((config) => {
        const s = MODE_STYLES[config.mode];
        return (
          <button
            key={config.mode}
            onClick={() => onSelectMode(config.mode)}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl ${s.bgColor} border-2 ${s.borderColor} transition-all duration-200 text-left group hover:opacity-90`}
            style={{ boxShadow: s.glowColor }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = s.glowHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = s.glowColor; }}
            aria-label={`${config.label}: ${config.description}`}
            data-testid={`mode-${config.mode}`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={s.iconColor}>
                {s.icon}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-theme-text">{config.label}</span>
              </div>
              {config.timeLimit !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.tagBg} ${s.tagText}`}>
                  {config.timeLimit}s
                </span>
              )}
            </div>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              {config.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
