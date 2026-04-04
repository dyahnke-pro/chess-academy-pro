import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Eye,
  Swords,
  Wrench,
  Lightbulb,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import {
  getClassifiedTacticCount,
  backfillClassifiedTactics,
} from '../../services/tacticClassifierService';
import { getStoredTacticalProfile, tacticTypeLabel } from '../../services/tacticalProfileService';
import { getTacticDrillCounts } from '../../services/tacticDrillService';
import { getContextDepth } from '../../services/tacticCreateService';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { db } from '../../db/schema';
import type { TacticalProfile } from '../../types';

// ─── Section Definitions ───────────────────────────────────────────────────

interface SectionItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  borderColor: string;
  statKey: number;
}

const SECTIONS: SectionItem[] = [
  {
    label: 'Spot',
    icon: Eye,
    route: '/tactics/profile',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    statKey: 1,
  },
  {
    label: 'Drill',
    icon: Swords,
    route: '/tactics/drill',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    statKey: 2,
  },
  {
    label: 'Setup',
    icon: Wrench,
    route: '/tactics/setup',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    statKey: 3,
  },
  {
    label: 'Create',
    icon: Lightbulb,
    route: '/tactics/create',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    statKey: 4,
  },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export function TacticsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [totalCount, setTotalCount] = useState(0);
  const [tacticalProfile, setTacticalProfile] = useState<TacticalProfile | null>(null);
  const [drillCount, setDrillCount] = useState(0);
  const [setupCount, setSetupCount] = useState(0);
  const [createDepth, setCreateDepth] = useState(8);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await backfillClassifiedTactics();
      const [count, profile, drillCounts, setups, depth] = await Promise.all([
        getClassifiedTacticCount(),
        getStoredTacticalProfile(),
        getTacticDrillCounts(),
        db.setupPuzzles.filter((sp) => sp.status !== 'mastered').count(),
        getContextDepth(),
      ]);

      setTotalCount(count);
      setTacticalProfile(profile);

      let drillTotal = 0;
      drillCounts.forEach((c) => { drillTotal += c; });
      setDrillCount(drillTotal);

      setSetupCount(setups);
      setCreateDepth(depth);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!activeProfile) return <></>;

  const weakestType = tacticalProfile?.weakestTypes[0];
  const weakestLabel = weakestType ? tacticTypeLabel(weakestType) : null;

  const sectionStats: Record<number, string | undefined> = {
    1: tacticalProfile ? `${tacticalProfile.stats.length} types` : undefined,
    2: drillCount > 0 ? `${drillCount} ready` : undefined,
    3: setupCount > 0 ? `${setupCount} puzzles` : undefined,
    4: tacticalProfile ? `Depth ${createDepth}` : undefined,
  };

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
          const stat = sectionStats[section.statKey];
          return (
            <button
              key={section.route}
              onClick={() => void navigate(section.route)}
              className={`${section.bgColor} ${section.borderColor} border-2 rounded-2xl flex flex-col items-center justify-center gap-3 hover:opacity-80 transition-opacity ${isFirst ? 'col-span-2 py-10' : 'aspect-square'}`}
              data-testid={`layer-${section.statKey}-card`}
            >
              <Icon size={isFirst ? 48 : 40} className={section.color} />
              <span className={`${isFirst ? 'text-lg' : 'text-base'} font-bold ${section.color}`}>
                {section.label}
              </span>
              {stat && (
                <span className={`text-xs ${section.color} opacity-70`}>
                  {stat}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {!loading && totalCount > 0 && (
        <div className="text-center text-xs max-w-lg mx-auto" style={{ color: 'var(--color-text-muted)' }}>
          {totalCount} tactics from {tacticalProfile?.totalGamesAnalyzed ?? 0} games
          {weakestLabel && (
            <> &middot; Focus: <span className="text-orange-400">{weakestLabel}</span></>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && totalCount === 0 && (
        <div
          className="bg-orange-500/10 border-orange-500/30 border-2 rounded-2xl p-8 text-center max-w-lg mx-auto w-full"
          data-testid="tactics-empty"
        >
          <Target size={48} className="text-orange-400 mx-auto mb-3" />
          <h2 className="font-semibold text-lg mb-2">No Tactics Yet</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Import and analyze your games to discover missed tactics.
          </p>
        </div>
      )}
    </div>
  );
}
