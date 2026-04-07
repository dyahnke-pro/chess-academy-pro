import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { updateStreak } from '../../services/sessionGenerator';
import { seedDatabase } from '../../services/dataLoader';
import { BookOpen, GraduationCap, Target, AlertTriangle, Upload } from 'lucide-react';
import { SmartSearchBar } from '../Search/SmartSearchBar';

interface SectionItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}

const SECTIONS: SectionItem[] = [
  {
    label: 'Openings',
    icon: BookOpen,
    route: '/openings',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    label: 'Play with Coach',
    icon: GraduationCap,
    route: '/coach/play',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    glowColor: 'rgba(251, 113, 133, 0.4)',
  },
  {
    label: 'Tactics',
    icon: Target,
    route: '/tactics',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'rgba(52, 211, 153, 0.4)',
  },
  {
    label: 'Weaknesses',
    icon: AlertTriangle,
    route: '/weaknesses',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
];

export function DashboardPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const navigate = useNavigate();

  useEffect(() => {
    void seedDatabase();

    if (activeProfile) {
      void updateStreak(activeProfile).then(({ currentStreak, longestStreak }) => {
        if (currentStreak !== activeProfile.currentStreak || longestStreak !== activeProfile.longestStreak) {
          setActiveProfile({ ...activeProfile, currentStreak, longestStreak });
        }
      });
    }
  }, [activeProfile, setActiveProfile]);

  if (!activeProfile) return <></>;

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="dashboard"
    >
      <h1 className="text-xl font-bold text-center mt-2">
        Chess Academy Pro
      </h1>

      {/* Import Games */}
      <div className="max-w-lg mx-auto w-full">
        <button
          onClick={() => void navigate('/games/import')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 hover:opacity-80 transition-opacity"
          style={{ boxShadow: '0 0 12px rgba(245, 158, 11, 0.35), 0 0 4px rgba(245, 158, 11, 0.2)' }}
          data-testid="import-games-btn"
        >
          <Upload size={18} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Import Games</span>
        </button>
      </div>

      {/* Smart Search */}
      <div className="max-w-lg mx-auto w-full">
        <SmartSearchBar />
      </div>

      {/* Section grid — uniform cards, order matches sidebar */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-center max-w-lg mx-auto w-full">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.route}
              onClick={() => void navigate(section.route)}
              className={`${section.bgColor} ${section.borderColor} border-2 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 aspect-square`}
              style={{ boxShadow: `0 0 12px ${section.glowColor}, 0 0 4px ${section.glowColor}` }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${section.glowColor}, 0 0 8px ${section.glowColor}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 12px ${section.glowColor}, 0 0 4px ${section.glowColor}`; }}
              data-testid={`section-${section.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon size={40} className={section.color} />
              <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
