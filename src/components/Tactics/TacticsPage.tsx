import { useNavigate } from 'react-router-dom';
import { Eye, AlertTriangle, Shuffle, Trophy, Wrench } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { THEME_MAP } from '../../services/puzzleService';

// ─── Theme Category Definitions ──────────────────────────────────────────

interface ThemeCard {
  label: string;
  themes: string[];
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}

const THEME_STYLE: Record<string, { emoji: string; color: string; bgColor: string; borderColor: string; glowColor: string }> = {
  'Forks':              { emoji: '\u2694\uFE0F', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', glowColor: 'rgba(239, 68, 68, 0.3)' },
  'Pins & Skewers':     { emoji: '\uD83D\uDCCC', color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/30', glowColor: 'rgba(56, 189, 248, 0.3)' },
  'Discovered Attacks':  { emoji: '\uD83D\uDCA5', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', glowColor: 'rgba(249, 115, 22, 0.3)' },
  'Back Rank Mates':     { emoji: '\uD83C\uDFF0', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', glowColor: 'rgba(168, 85, 247, 0.3)' },
  'Sacrifices':          { emoji: '\uD83D\uDD25', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', glowColor: 'rgba(245, 158, 11, 0.3)' },
  'Deflection & Decoy':  { emoji: '\u21AA\uFE0F', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', glowColor: 'rgba(6, 182, 212, 0.3)' },
  'Zugzwang':            { emoji: '\u26A1', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', glowColor: 'rgba(250, 204, 21, 0.3)' },
  'Endgame Technique':   { emoji: '\uD83C\uDFC1', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', glowColor: 'rgba(52, 211, 153, 0.3)' },
  'Opening Traps':       { emoji: '\uD83E\uDEA4', color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30', glowColor: 'rgba(251, 113, 133, 0.3)' },
  'Mating Nets':         { emoji: '\uD83D\uDC51', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30', glowColor: 'rgba(99, 102, 241, 0.3)' },
};

const THEME_CARDS: ThemeCard[] = Object.entries(THEME_MAP).map(([label, themes]) => {
  const config = THEME_STYLE[label] ?? { emoji: '\uD83C\uDFAF', color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30', glowColor: 'rgba(156, 163, 175, 0.3)' };
  return { label, themes, ...config };
});

// ─── Main Page ──────────────────────────────────────────────────────────────

export function TacticsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const navigate = useNavigate();

  if (!activeProfile) return <></>;

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="tactics-page"
    >
      <h1 className="text-xl font-bold text-center mt-2">
        Tactical Training
      </h1>

      {/* Search */}
      <div className="max-w-lg mx-auto w-full">
        <SmartSearchBar placeholder="Search tactics, games, openings..." />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-start max-w-lg mx-auto w-full">
        {/* My Profile — spans full width at top */}
        <button
          onClick={() => void navigate('/tactics/profile')}
          className="col-span-2 py-8 bg-amber-500/10 border-amber-500/30 border-2 rounded-2xl flex flex-col items-center justify-center gap-3 hover:opacity-80 transition-all duration-200"
          style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.3)'; }}
          data-testid="section-spot"
        >
          <Eye size={40} className="text-amber-400" />
          <span className="text-lg font-bold text-amber-400">My Profile</span>
        </button>

        {/* Daily Challenge + Setup Trainer — side by side */}
        <button
          onClick={() => void navigate('/tactics/classic')}
          className="py-6 bg-violet-500/10 border-violet-500/30 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-all duration-200"
          style={{ boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(139, 92, 246, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 8px rgba(139, 92, 246, 0.3)'; }}
          data-testid="section-daily"
        >
          <Trophy size={28} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-400">Daily Training</span>
        </button>
        <button
          onClick={() => void navigate('/tactics/setup')}
          className="py-6 bg-teal-500/10 border-teal-500/30 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-all duration-200"
          style={{ boxShadow: '0 0 8px rgba(45, 212, 191, 0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(45, 212, 191, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 8px rgba(45, 212, 191, 0.3)'; }}
          data-testid="section-setup"
        >
          <Wrench size={28} className="text-teal-400" />
          <span className="text-sm font-bold text-teal-400">Setup Trainer</span>
        </button>

        {/* Random Mix */}
        <button
          onClick={() => void navigate('/tactics/drill', { state: { filterThemes: ['fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate', 'sacrifice', 'deflection'] } })}
          className="col-span-2 py-6 bg-emerald-500/10 border-emerald-500/30 border-2 rounded-2xl flex flex-col items-center justify-center gap-3 hover:opacity-80 transition-all duration-200"
          style={{ boxShadow: '0 0 8px rgba(52, 211, 153, 0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(52, 211, 153, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 8px rgba(52, 211, 153, 0.3)'; }}
          data-testid="section-random-mix"
        >
          <Shuffle size={32} className="text-emerald-400" />
          <span className="text-base font-bold text-emerald-400">Random Mix</span>
        </button>

        {/* Individual tactic categories */}
        {THEME_CARDS.map((card) => (
          <button
            key={card.label}
            onClick={() => void navigate('/tactics/drill', { state: { filterThemes: card.themes } })}
            className={`${card.bgColor} ${card.borderColor} border-2 rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-all duration-200 aspect-square`}
            style={{ boxShadow: `0 0 8px ${card.glowColor}` }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 18px ${card.glowColor.replace('0.3)', '0.55)')}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 8px ${card.glowColor}`; }}
            data-testid={`section-${card.label.toLowerCase()}`}
          >
            <span className="text-2xl">{card.emoji}</span>
            <span className={`text-sm font-bold ${card.color} text-center px-2 leading-tight`}>{card.label}</span>
          </button>
        ))}

        {/* My Mistakes — spans full width at bottom */}
        <button
          onClick={() => void navigate('/tactics/mistakes')}
          className="col-span-2 py-6 bg-red-500/10 border-red-500/30 border-2 rounded-2xl flex flex-col items-center justify-center gap-3 hover:opacity-80 transition-all duration-200"
          style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.3)'; }}
          data-testid="section-my mistakes"
        >
          <AlertTriangle size={32} className="text-red-400" />
          <span className="text-base font-bold text-red-400">My Mistakes</span>
        </button>
      </div>
    </div>
  );
}
