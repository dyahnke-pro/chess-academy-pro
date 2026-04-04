import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Eye,
  Swords,
  Wrench,
  Lightbulb,
  ChevronRight,
  RefreshCw,
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

// ─── Layer Definitions ─────────────────────────────────────────────────────

interface LayerConfig {
  number: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const LAYERS: LayerConfig[] = [
  {
    number: 1,
    title: 'Spot',
    subtitle: 'See which tactics you miss in your games',
    icon: Eye,
    route: '/tactics/profile',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    number: 2,
    title: 'Drill',
    subtitle: 'Puzzles from your own missed opportunities',
    icon: Swords,
    route: '/tactics/drill',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    number: 3,
    title: 'Setup',
    subtitle: 'Find the quiet moves that create tactics',
    icon: Wrench,
    route: '/tactics/setup',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    number: 4,
    title: 'Create',
    subtitle: 'Replay games and spot tactics in context',
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

  const layerStats: Record<number, string | undefined> = {
    1: tacticalProfile ? `${tacticalProfile.stats.length} types tracked` : undefined,
    2: drillCount > 0 ? `${drillCount} drills ready` : undefined,
    3: setupCount > 0 ? `${setupCount} puzzles` : undefined,
    4: tacticalProfile ? `Depth: ${createDepth} moves` : undefined,
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="tactics-page"
    >
      <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-orange-400" />
            <div>
              <h1 className="text-xl font-bold">Tactical Training</h1>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {totalCount > 0
                  ? `${totalCount} missed tactics from your games`
                  : '4-layer program built from your games'}
              </p>
            </div>
          </div>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="p-2 rounded-lg hover:opacity-80 disabled:opacity-40"
            data-testid="tactics-refresh-btn"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Search */}
        <SmartSearchBar placeholder="Search tactics, games, openings..." />

        {/* Quick Stats */}
        {totalCount > 0 && (
          <div className="grid grid-cols-3 gap-3" data-testid="stats-row">
            <StatCard label="Found" value={`${totalCount}`} color="text-orange-400" />
            <StatCard label="Weakest" value={weakestLabel ?? '—'} color="text-red-400" />
            <StatCard label="Drills" value={drillCount > 0 ? `${drillCount}` : '—'} color="text-amber-400" />
          </div>
        )}

        {/* Layer Cards */}
        <div className="flex flex-col gap-3">
          {LAYERS.map((layer) => (
            <LayerCard
              key={layer.number}
              layer={layer}
              stat={layerStats[layer.number]}
              onClick={() => void navigate(layer.route)}
            />
          ))}
        </div>

        {/* Summary */}
        {tacticalProfile && (
          <div className="text-center text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
            {tacticalProfile.totalGamesAnalyzed} games analyzed &middot;{' '}
            {tacticalProfile.totalGamesMissed} tactical positions found
            {weakestLabel && (
              <> &middot; Focus: <span className="text-orange-400">{weakestLabel}</span></>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && totalCount === 0 && (
          <div
            className="bg-orange-500/10 border-orange-500/30 border-2 rounded-2xl p-8 text-center"
            data-testid="tactics-empty"
          >
            <Target size={48} className="text-orange-400 mx-auto mb-3" />
            <h2 className="font-semibold text-lg mb-2">No Tactics Yet</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Import and analyze your games to discover missed tactics.
              Each missed tactic gets classified by motif type — fork, pin,
              skewer, discovered attack, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────

function StatCard({ label, value, color }: {
  label: string;
  value: string;
  color: string;
}): JSX.Element {
  return (
    <div className="bg-orange-500/10 border-orange-500/30 border-2 rounded-2xl p-3 text-center">
      <div className={`text-lg font-bold truncate ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function LayerCard({ layer, stat, onClick }: {
  layer: LayerConfig;
  stat?: string;
  onClick: () => void;
}): JSX.Element {
  const Icon = layer.icon;
  return (
    <button
      onClick={onClick}
      className={`${layer.bgColor} ${layer.borderColor} border-2 rounded-2xl p-4 text-left w-full hover:opacity-80 transition-opacity`}
      data-testid={`layer-${layer.number}-card`}
    >
      <div className="flex items-center gap-4">
        <Icon size={28} className={layer.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{layer.title}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${layer.color}`}>
              Layer {layer.number}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {layer.subtitle}
          </p>
          {stat && (
            <span className={`text-xs font-medium mt-1 inline-block ${layer.color}`}>
              {stat}
            </span>
          )}
        </div>
        <ChevronRight size={16} className={`${layer.color} shrink-0`} />
      </div>
    </button>
  );
}
