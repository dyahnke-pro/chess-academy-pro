import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  getTacticMotifStats,
  getRecentClassifiedTactics,
  getClassifiedTacticCount,
  TACTIC_LABELS,
} from '../../services/tacticClassifierService';
import { SkillBar } from '../ui/SkillBar';
import {
  Target,
  Crosshair,
  Shield,
  Zap,
  Crown,
  Eye,
  ChevronDown,
  ChevronUp,
  Swords,
  RefreshCw,
} from 'lucide-react';
import type { TacticMotifStats as MotifStats, ClassifiedTactic, TacticType } from '../../types';

// ─── Tactic Icons ───────────────────────────────────────────────────────────

const TACTIC_ICONS: Partial<Record<TacticType, React.ComponentType<{ size?: number }>>> = {
  fork: Swords,
  pin: Shield,
  skewer: Crosshair,
  discovered_attack: Zap,
  back_rank: Crown,
  double_check: Zap,
  deflection: Target,
  overloaded_piece: Shield,
  trapped_piece: Eye,
};

function getTacticIcon(type: TacticType): React.ComponentType<{ size?: number }> {
  return TACTIC_ICONS[type] ?? Target;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function TacticsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [motifStats, setMotifStats] = useState<MotifStats[]>([]);
  const [recentTactics, setRecentTactics] = useState<ClassifiedTactic[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedMotif, setExpandedMotif] = useState<TacticType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [stats, recent, count] = await Promise.all([
        getTacticMotifStats(),
        getRecentClassifiedTactics(15),
        getClassifiedTacticCount(),
      ]);
      setMotifStats(stats);
      setRecentTactics(recent);
      setTotalCount(count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!activeProfile) return <></>;

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="tactics-page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tactical Training</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {totalCount > 0
              ? `${totalCount} missed tactics classified from your games`
              : 'Analyze games to discover missed tactics'}
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          data-testid="tactics-refresh-btn"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Cards */}
      {motifStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="Tactics Found"
            value={`${totalCount}`}
            color="var(--color-accent)"
          />
          <SummaryCard
            label="Motif Types"
            value={`${motifStats.length}`}
            color="var(--color-warning)"
          />
          <SummaryCard
            label="Top Weakness"
            value={motifStats[0] ? TACTIC_LABELS[motifStats[0].tacticType] : '—'}
            color="var(--color-error)"
          />
        </div>
      )}

      {/* Tactic Motif Breakdown */}
      {motifStats.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="motif-breakdown"
        >
          <div className="p-5 pb-3">
            <h2 className="font-semibold text-lg">Tactic Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Missed in games vs puzzle accuracy — tap to expand
            </p>
          </div>
          <div className="px-5 pb-5 space-y-1">
            {motifStats.map((stat) => {
              const Icon = getTacticIcon(stat.tacticType);
              const isExpanded = expandedMotif === stat.tacticType;

              return (
                <div key={stat.tacticType} data-testid={`motif-${stat.tacticType}`}>
                  <button
                    className="w-full flex items-center gap-3 py-2 px-1 rounded-lg transition-colors hover:bg-black/5"
                    onClick={() => setExpandedMotif(isExpanded ? null : stat.tacticType)}
                    data-testid={`motif-toggle-${stat.tacticType}`}
                  >
                    <Icon size={16} />
                    <div className="flex-1">
                      <SkillBar
                        label={TACTIC_LABELS[stat.tacticType]}
                        value={stat.puzzleAccuracy || 0}
                      />
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: 'var(--color-error)',
                        color: 'var(--color-bg)',
                        opacity: 0.9,
                      }}
                    >
                      {stat.missedInGames}x missed
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <MotifDetail stat={stat} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Missed Tactics */}
      {recentTactics.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="recent-tactics"
        >
          <h2 className="font-semibold text-lg mb-3">Recent Missed Tactics</h2>
          <div className="space-y-2">
            {recentTactics.map((t) => (
              <RecentTacticCard key={t.id} tactic={t} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && totalCount === 0 && (
        <div
          className="rounded-xl p-8 border text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="tactics-empty"
        >
          <Target size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <h2 className="font-semibold text-lg mb-2">No Tactics Yet</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Import and analyze your games to discover missed tactics.
            Each missed tactic gets classified by motif type — fork, pin,
            skewer, discovered attack, and more.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}): JSX.Element {
  return (
    <div
      className="rounded-xl p-3 border flex flex-col gap-0.5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="text-lg font-bold truncate" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function MotifDetail({ stat }: { stat: MotifStats }): JSX.Element {
  return (
    <div
      className="ml-7 mr-1 mb-3 mt-1 rounded-lg p-4 space-y-3 border"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      data-testid={`motif-detail-${stat.tacticType}`}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Missed in Games
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--color-error)' }}>
            {stat.missedInGames}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Puzzle Accuracy
          </div>
          <div
            className="text-xl font-bold"
            style={{ color: stat.puzzleAccuracy >= 70 ? 'var(--color-success)' : stat.puzzleAccuracy >= 40 ? 'var(--color-warning)' : 'var(--color-error)' }}
          >
            {stat.puzzleAttempts > 0 ? `${stat.puzzleAccuracy}%` : '—'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Puzzle Attempts
        </div>
        <div className="text-sm font-medium">
          {stat.puzzleAttempts > 0 ? `${stat.puzzleAttempts} attempts` : 'No puzzles attempted yet'}
        </div>
      </div>

      {stat.puzzleAccuracy > 0 && stat.missedInGames > 0 && (
        <div
          className="text-xs p-2 rounded-lg"
          style={{ background: 'var(--color-warning)', color: 'var(--color-bg)', opacity: 0.9 }}
        >
          {stat.puzzleAccuracy >= 70
            ? `You solve ${TACTIC_LABELS[stat.tacticType].toLowerCase()} puzzles well but miss them in games. Focus on pattern recognition during play.`
            : `Both puzzle accuracy and game detection need work. Practice more ${TACTIC_LABELS[stat.tacticType].toLowerCase()} puzzles.`}
        </div>
      )}
    </div>
  );
}

function RecentTacticCard({ tactic }: { tactic: ClassifiedTactic }): JSX.Element {
  const Icon = getTacticIcon(tactic.tacticType);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', opacity: 0.9 }}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{TACTIC_LABELS[tactic.tacticType]}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              background: tactic.evalSwing >= 200 ? 'var(--color-error)' : 'var(--color-warning)',
              color: 'var(--color-bg)',
            }}
          >
            {(tactic.evalSwing / 100).toFixed(1)} pawns
          </span>
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
          {tactic.explanation}
        </div>
        {tactic.opponentName && (
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            vs {tactic.opponentName}{tactic.gameDate ? ` · ${tactic.gameDate}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
