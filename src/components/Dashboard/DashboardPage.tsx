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
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    label: 'Play with Coach',
    icon: GraduationCap,
    route: '/coach/play',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    label: 'Tactics',
    icon: Target,
    route: '/tactics',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    glowColor: 'rgba(34, 197, 94, 0.4)',
  },
  {
    label: 'Weaknesses',
    icon: AlertTriangle,
    route: '/weaknesses',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowColor: 'rgba(168, 85, 247, 0.35)',
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
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/10 hover:opacity-80 transition-opacity"
          data-testid="import-games-btn"
        >
          <Upload size={18} className="text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400">Import Games</span>
        </button>
      </div>

      {/* Smart Search */}
      <div className="max-w-lg mx-auto w-full">
        <SmartSearchBar />
      </div>

      {/* 5 big squares */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-center max-w-lg mx-auto w-full">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const isFirst = i === 0;
          return (
            <button
              key={section.route}
              onClick={() => void navigate(section.route)}
              className={`${section.bgColor} ${section.borderColor} border-2 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${isFirst ? 'col-span-2 py-10' : 'aspect-square'}`}
              style={{ boxShadow: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 14px ${section.glowColor}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              data-testid={`section-${section.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon size={isFirst ? 48 : 40} className={section.color} />
              <span className={`${isFirst ? 'text-lg' : 'text-base'} font-bold ${section.color}`}>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
