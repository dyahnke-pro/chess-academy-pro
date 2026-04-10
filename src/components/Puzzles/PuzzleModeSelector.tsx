import { Zap, Calendar, Target, BookOpen, Crown } from 'lucide-react';
import { PUZZLE_MODES } from '../../services/puzzleService';
import type { PuzzleMode } from '../../services/puzzleService';

interface PuzzleModeSelectorProps {
  onSelectMode: (mode: PuzzleMode) => void;
}

interface ModeStyle {
  icon: JSX.Element;
  iconColor: string;
  rgb: string;
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
    rgb: '245, 158, 11',
    bgColor: 'bg-amber-500/5',
    glowColor: '0 0 6px rgba(245, 158, 11, 0.5), 0 0 14px rgba(245, 158, 11, 0.3), 0 0 24px rgba(245, 158, 11, 0.15)',
    glowHover: '0 0 8px rgba(245, 158, 11, 0.7), 0 0 18px rgba(245, 158, 11, 0.45), 0 0 30px rgba(245, 158, 11, 0.25)',
    tagBg: 'bg-amber-500/20',
    tagText: 'text-amber-400',
  },
  timed_blitz: {
    icon: <Zap size={24} />,
    iconColor: 'text-violet-400',
    rgb: '139, 92, 246',
    bgColor: 'bg-violet-500/5',
    glowColor: '0 0 6px rgba(139, 92, 246, 0.5), 0 0 14px rgba(139, 92, 246, 0.3), 0 0 24px rgba(139, 92, 246, 0.15)',
    glowHover: '0 0 8px rgba(139, 92, 246, 0.7), 0 0 18px rgba(139, 92, 246, 0.45), 0 0 30px rgba(139, 92, 246, 0.25)',
    tagBg: 'bg-violet-500/20',
    tagText: 'text-violet-400',
  },
  daily_challenge: {
    icon: <Calendar size={24} />,
    iconColor: 'text-cyan-400',
    rgb: '34, 211, 238',
    bgColor: 'bg-cyan-500/5',
    glowColor: '0 0 6px rgba(34, 211, 238, 0.5), 0 0 14px rgba(34, 211, 238, 0.3), 0 0 24px rgba(34, 211, 238, 0.15)',
    glowHover: '0 0 8px rgba(34, 211, 238, 0.7), 0 0 18px rgba(34, 211, 238, 0.45), 0 0 30px rgba(34, 211, 238, 0.25)',
    tagBg: 'bg-cyan-500/20',
    tagText: 'text-cyan-400',
  },
  opening_traps: {
    icon: <BookOpen size={24} />,
    iconColor: 'text-emerald-400',
    rgb: '52, 211, 153',
    bgColor: 'bg-emerald-500/5',
    glowColor: '0 0 6px rgba(52, 211, 153, 0.5), 0 0 14px rgba(52, 211, 153, 0.3), 0 0 24px rgba(52, 211, 153, 0.15)',
    glowHover: '0 0 8px rgba(52, 211, 153, 0.7), 0 0 18px rgba(52, 211, 153, 0.45), 0 0 30px rgba(52, 211, 153, 0.25)',
    tagBg: 'bg-emerald-500/20',
    tagText: 'text-emerald-400',
  },
  endgame: {
    icon: <Crown size={24} />,
    iconColor: 'text-rose-400',
    rgb: '244, 63, 94',
    bgColor: 'bg-rose-500/5',
    glowColor: '0 0 6px rgba(244, 63, 94, 0.5), 0 0 14px rgba(244, 63, 94, 0.3), 0 0 24px rgba(244, 63, 94, 0.15)',
    glowHover: '0 0 8px rgba(244, 63, 94, 0.7), 0 0 18px rgba(244, 63, 94, 0.45), 0 0 30px rgba(244, 63, 94, 0.25)',
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
            className={`flex flex-col items-start gap-2 p-4 rounded-xl ${s.bgColor} transition-all duration-200 text-left group hover:opacity-90`}
            style={{
              borderTop: `1px solid rgba(${s.rgb}, 0.1)`,
              borderRight: `1px solid rgba(${s.rgb}, 0.1)`,
              borderLeft: `2px solid rgba(${s.rgb}, 0.6)`,
              borderBottom: `2px solid rgba(${s.rgb}, 0.6)`,
              boxShadow: s.glowColor,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderLeft = `2px solid rgba(${s.rgb}, 0.85)`;
              el.style.borderBottom = `2px solid rgba(${s.rgb}, 0.85)`;
              el.style.borderTop = `1px solid rgba(${s.rgb}, 0.2)`;
              el.style.borderRight = `1px solid rgba(${s.rgb}, 0.2)`;
              el.style.boxShadow = s.glowHover;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderLeft = `2px solid rgba(${s.rgb}, 0.6)`;
              el.style.borderBottom = `2px solid rgba(${s.rgb}, 0.6)`;
              el.style.borderTop = `1px solid rgba(${s.rgb}, 0.1)`;
              el.style.borderRight = `1px solid rgba(${s.rgb}, 0.1)`;
              el.style.boxShadow = s.glowColor;
            }}
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
