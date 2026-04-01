import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Play, Eye, ChevronRight } from 'lucide-react';
import {
  computeTacticalProfile,
  getStoredTacticalProfile,
  tacticTypeLabel,
  tacticTypeIcon,
} from '../../services/tacticalProfileService';
import type { TacticalProfile, TacticTypeStats, TacticType } from '../../types';

export function TacticalProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TacticalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile(): Promise<void> {
    setLoading(true);
    let stored = await getStoredTacticalProfile();
    if (!stored) {
      stored = await computeTacticalProfile();
    }
    setProfile(stored);
    setLoading(false);
  }

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    const fresh = await computeTacticalProfile();
    setProfile(fresh);
    setRefreshing(false);
  }, []);

  const handleBeginTraining = useCallback((): void => {
    if (!profile || profile.weakestTypes.length === 0) {
      void navigate('/tactics/drill');
      return;
    }
    // Navigate to drill page pre-filtered to weakest tactic types
    void navigate('/tactics/drill', { state: { filterTypes: profile.weakestTypes } });
  }, [profile, navigate]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full p-6 flex items-center justify-center min-h-[60vh]">
        <p style={{ color: 'var(--color-text-muted)' }}>Analyzing your tactical profile...</p>
      </div>
    );
  }

  if (!profile || profile.stats.length === 0) {
    return (
      <div className="max-w-2xl mx-auto w-full p-6 pb-20 md:pb-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => void navigate('/tactics')} className="p-2 rounded-lg hover:opacity-80">
            <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
          </button>
          <Eye size={24} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Tactical Profile</h1>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No tactical data yet. Import and analyze some games to build your profile.
          </p>
        </div>
      </div>
    );
  }

  const maxMissCount = Math.max(...profile.stats.map((s) => s.gameMissCount), 1);

  return (
    <motion.div
      className="max-w-2xl mx-auto w-full p-6 pb-20 md:pb-6 flex flex-col gap-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => void navigate('/tactics')} className="p-2 rounded-lg hover:opacity-80" data-testid="back-btn">
          <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
        </button>
        <Eye size={24} style={{ color: 'var(--color-accent)' }} />
        <h1 className="text-xl font-bold flex-1" style={{ color: 'var(--color-text)' }}>Tactical Profile</h1>
        <button
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="p-2 rounded-lg hover:opacity-80 disabled:opacity-40"
          data-testid="refresh-btn"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Begin Your Training CTA */}
      <button
        onClick={handleBeginTraining}
        className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-opacity hover:opacity-90"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="begin-training-btn"
      >
        <Play size={18} />
        Begin Your Training
        {profile.weakestTypes.length > 0 && (
          <span className="text-xs opacity-80">
            — Focus: {profile.weakestTypes.slice(0, 2).map((t) => tacticTypeLabel(t)).join(', ')}
          </span>
        )}
      </button>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{profile.totalGamesAnalyzed}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Games Analyzed</div>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="text-lg font-bold" style={{ color: 'var(--color-error)' }}>{profile.totalGamesMissed}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tactics Found</div>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{profile.stats.length}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Types Tracked</div>
        </div>
      </div>

      {/* Tactic Type Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Tactic Breakdown
          <span className="font-normal ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>tap to drill</span>
        </h3>
        {profile.stats.map((stat) => (
          <TacticTypeRow
            key={stat.tacticType}
            stat={stat}
            maxMissCount={maxMissCount}
            onTrain={(type) => void navigate('/tactics/drill', { state: { filterTypes: [type] } })}
          />
        ))}
      </div>

      {/* Game Phase Distribution */}
      <PhaseBreakdown stats={profile.stats} />

      {/* Opening Correlation */}
      <OpeningBreakdown stats={profile.stats} />
    </motion.div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TacticTypeRow({ stat, maxMissCount, onTrain }: { stat: TacticTypeStats; maxMissCount: number; onTrain: (type: TacticType) => void }): JSX.Element {
  const barWidth = maxMissCount > 0 ? Math.round((stat.gameMissCount / maxMissCount) * 100) : 0;
  const puzzlePct = stat.puzzleAttempts > 0 ? Math.round(stat.puzzleAccuracy * 100) : -1;
  const gapDisplay = stat.gap > 0 ? `${Math.round(stat.gap * 100)}%` : null;

  return (
    <button
      onClick={() => onTrain(stat.tacticType)}
      className="w-full rounded-lg border p-3 text-left transition-all hover:opacity-90"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid="tactic-type-row"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{tacticTypeIcon(stat.tacticType)}</span>
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text)' }}>
          {tacticTypeLabel(stat.tacticType)}
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>
          {stat.gameMissCount} missed
        </span>
        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
      </div>

      {/* Miss count bar */}
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ background: 'var(--color-error)', width: `${barWidth}%` }}
        />
      </div>

      {/* Puzzle accuracy vs game gap */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {puzzlePct >= 0 && (
          <span>Puzzle accuracy: <span style={{ color: 'var(--color-success)' }}>{puzzlePct}%</span></span>
        )}
        {gapDisplay && (
          <span>Gap: <span style={{ color: 'var(--color-warning)' }}>{gapDisplay}</span></span>
        )}
        {stat.puzzleAttempts > 0 && (
          <span>{stat.puzzleAttempts} puzzle attempts</span>
        )}
      </div>
    </button>
  );
}

function PhaseBreakdown({ stats }: { stats: TacticTypeStats[] }): JSX.Element {
  const totals = { opening: 0, middlegame: 0, endgame: 0 };
  for (const stat of stats) {
    totals.opening += stat.byPhase.opening || 0;
    totals.middlegame += stat.byPhase.middlegame || 0;
    totals.endgame += stat.byPhase.endgame || 0;
  }
  const total = totals.opening + totals.middlegame + totals.endgame;
  if (total === 0) return <></>;

  const phases = [
    { label: 'Opening', count: totals.opening, color: 'var(--color-accent)' },
    { label: 'Middlegame', count: totals.middlegame, color: 'var(--color-warning)' },
    { label: 'Endgame', count: totals.endgame, color: 'var(--color-success)' },
  ];

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }} data-testid="phase-breakdown">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>When You Miss Tactics</h3>
      <div className="flex gap-2 h-3 rounded-full overflow-hidden mb-3" style={{ background: 'var(--color-border)' }}>
        {phases.map((p) => (
          <div
            key={p.label}
            className="h-full transition-all duration-500"
            style={{ background: p.color, width: `${Math.round((p.count / total) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {phases.map((p) => (
          <span key={p.label}>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: p.color }} />
            {p.label} ({p.count})
          </span>
        ))}
      </div>
    </div>
  );
}

function OpeningBreakdown({ stats }: { stats: TacticTypeStats[] }): JSX.Element {
  const openingCounts: Record<string, number> = {};
  for (const stat of stats) {
    for (const [opening, count] of Object.entries(stat.byOpening)) {
      openingCounts[opening] = (openingCounts[opening] || 0) + count;
    }
  }

  const sorted = Object.entries(openingCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sorted.length === 0) return <></>;

  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }} data-testid="opening-breakdown">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Openings Where You Miss Tactics</h3>
      <div className="flex flex-col gap-2">
        {sorted.map(([opening, count]) => (
          <div key={opening} className="flex items-center gap-3">
            <span className="text-xs truncate flex-1 min-w-0" style={{ color: 'var(--color-text)' }}>{opening}</span>
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full"
                style={{ background: 'var(--color-error)', width: `${Math.round((count / maxCount) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--color-error)' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
