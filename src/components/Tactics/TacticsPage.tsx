import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Swords,
  Wrench,
  Lightbulb,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { backfillClassifiedTactics } from '../../services/tacticClassifierService';
import { SmartSearchBar } from '../Search/SmartSearchBar';

// ─── Section Definitions ───────────────────────────────────────────────────

interface SectionItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const SECTIONS: SectionItem[] = [
  {
    label: 'Spot',
    icon: Eye,
    route: '/tactics/profile',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    label: 'Drill',
    icon: Swords,
    route: '/tactics/drill',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    label: 'Setup',
    icon: Wrench,
    route: '/tactics/setup',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    label: 'Create',
    icon: Lightbulb,
    route: '/tactics/create',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export function TacticsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const navigate = useNavigate();

  const ensureClassified = useCallback(async (): Promise<void> => {
    await backfillClassifiedTactics();
  }, []);

  useEffect(() => {
    void ensureClassified();
  }, [ensureClassified]);

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
      <div className="grid grid-cols-2 gap-3 flex-1 content-center max-w-lg mx-auto w-full">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const isFirst = i === 0;
          return (
            <button
              key={section.route}
              onClick={() => void navigate(section.route)}
              className={`${section.bgColor} ${section.borderColor} border-2 rounded-2xl flex flex-col items-center justify-center gap-3 hover:opacity-80 transition-opacity ${isFirst ? 'col-span-2 py-10' : 'aspect-square'}`}
              data-testid={`section-${section.label.toLowerCase()}`}
            >
              <Icon size={isFirst ? 48 : 40} className={section.color} />
              <span className={`${isFirst ? 'text-lg' : 'text-base'} font-bold ${section.color}`}>
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
