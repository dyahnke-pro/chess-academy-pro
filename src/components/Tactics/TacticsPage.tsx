import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Crosshair,
  Shield,
  Zap,
  Crown,
  Eye,
  Swords,
  Wrench,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import {
  getTacticMotifStats,
  getRecentClassifiedTactics,
  getClassifiedTacticCount,
  backfillClassifiedTactics,
} from '../../services/tacticClassifierService';
import { getStoredTacticalProfile, tacticTypeLabel } from '../../services/tacticalProfileService';
import { getTacticDrillCounts } from '../../services/tacticDrillService';
import { getContextDepth } from '../../services/tacticCreateService';
import { SkillBar } from '../ui/SkillBar';
import { db } from '../../db/schema';
import type { TacticMotifStats as MotifStats, ClassifiedTactic, TacticType, TacticalProfile } from '../../types';

type TabId = 'profile' | 'training';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile tab state
  const [motifStats, setMotifStats] = useState<MotifStats[]>([]);
  const [recentTactics, setRecentTactics] = useState<ClassifiedTactic[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedMotif, setExpandedMotif] = useState<TacticType | null>(null);
  const [loading, setLoading] = useState(true);

  // Training tab state
  const [tacticalProfile, setTacticalProfile] = useState<TacticalProfile | null>(null);
  const [drillCount, setDrillCount] = useState(0);
  const [setupCount, setSetupCount] = useState(0);
  const [createDepth, setCreateDepth] = useState(8);

  const loadProfileData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await backfillClassifiedTactics();
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

  const loadTrainingData = useCallback(async (): Promise<void> => {
    try {
      const stored = await getStoredTacticalProfile();
      setTacticalProfile(stored);

      const counts = await getTacticDrillCounts();
      let total = 0;
      counts.forEach((c) => { total += c; });
      setDrillCount(total);

      const setups = await db.setupPuzzles
        .filter((sp) => sp.status !== 'mastered')
        .count();
      setSetupCount(setups);

      const depth = await getContextDepth();
      setCreateDepth(depth);
    } catch {
      // Training tab data is non-critical; defaults are fine
    }
  }, []);

  useEffect(() => {
    void loadProfileData();
    void loadTrainingData();
  }, [loadProfileData, loadTrainingData]);

  if (!activeProfile) return <></>;

  const weakestLabel = tacticalProfile?.weakestTypes
    .slice(0, 2)
    .map((t) => t.replace(/_/g, ' '))
    .join(', ');

  return (
    <div
      className="flex flex-col gap-5 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="tactics-page"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={24} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 className="text-xl font-bold">Tactical Training</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {totalCount > 0
                ? `${totalCount} missed tactics classified from your games`
                : '4-layer program built from your games'}
            </p>
          </div>
        </div>
        {activeTab === 'profile' && (
          <button
            onClick={() => void loadProfileData()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            data-testid="tactics-refresh-btn"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? '...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div
        className="flex rounded-xl overflow-hidden border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <TabButton
          label="Profile"
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          testId="tab-profile"
        />
        <TabButton
          label="Training"
          active={activeTab === 'training'}
          onClick={() => setActiveTab('training')}
          testId="tab-training"
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            <ProfileTab
              motifStats={motifStats}
              recentTactics={recentTactics}
              totalCount={totalCount}
              expandedMotif={expandedMotif}
              setExpandedMotif={setExpandedMotif}
              loading={loading}
              onTacticTap={(type) => void navigate('/tactics/drill', { state: { filterTypes: [type] } })}
            />
          </motion.div>
        ) : (
          <motion.div
            key="training"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3"
          >
            <TrainingTab
              tacticalProfile={tacticalProfile}
              drillCount={drillCount}
              setupCount={setupCount}
              createDepth={createDepth}
              weakestLabel={weakestLabel}
              navigate={navigate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab Button ─────────────────────────────────────────────────────────────

function TabButton({ label, active, onClick, testId }: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 text-sm font-semibold transition-colors"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-surface)',
        color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
      }}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────────────────

function ProfileTab({
  motifStats,
  recentTactics,
  totalCount,
  expandedMotif,
  setExpandedMotif,
  loading,
  onTacticTap,
}: {
  motifStats: MotifStats[];
  recentTactics: ClassifiedTactic[];
  totalCount: number;
  expandedMotif: TacticType | null;
  setExpandedMotif: (t: TacticType | null) => void;
  loading: boolean;
  onTacticTap: (type: TacticType) => void;
}): JSX.Element {
  return (
    <>
      {/* Summary Cards */}
      {motifStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Tactics Found" value={`${totalCount}`} color="var(--color-accent)" />
          <SummaryCard label="Motif Types" value={`${motifStats.length}`} color="var(--color-warning)" />
          <SummaryCard
            label="Top Weakness"
            value={motifStats[0] ? tacticTypeLabel(motifStats[0].tacticType) : '—'}
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
              Missed in games vs puzzle accuracy — tap to drill
            </p>
          </div>
          <div className="px-5 pb-5 space-y-1">
            {motifStats.map((stat) => {
              const Icon = getTacticIcon(stat.tacticType);
              const isExpanded = expandedMotif === stat.tacticType;

              return (
                <div key={stat.tacticType} data-testid={`motif-${stat.tacticType}`}>
                  <div className="flex items-center gap-1">
                    <button
                      className="flex-1 flex items-center gap-3 py-2 px-1 rounded-lg transition-colors hover:bg-black/5"
                      onClick={() => onTacticTap(stat.tacticType)}
                      data-testid={`motif-train-${stat.tacticType}`}
                    >
                      <Icon size={16} />
                      <div className="flex-1">
                        <SkillBar
                          label={tacticTypeLabel(stat.tacticType)}
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
                    </button>
                    <button
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/5 shrink-0"
                      onClick={() => setExpandedMotif(isExpanded ? null : stat.tacticType)}
                      data-testid={`motif-toggle-${stat.tacticType}`}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${tacticTypeLabel(stat.tacticType)} details`}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {isExpanded && <MotifDetail stat={stat} />}
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
    </>
  );
}

// ─── Training Tab ───────────────────────────────────────────────────────────

interface LayerCardProps {
  number: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  stat?: string;
  locked?: boolean;
  onClick: () => void;
}

function LayerCard({ number, title, subtitle, description, icon: Icon, color, stat, locked, onClick }: LayerCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className="w-full rounded-xl border p-5 text-left transition-all hover:opacity-90 disabled:opacity-50"
      style={{
        borderColor: locked ? 'var(--color-border)' : `color-mix(in srgb, ${color} 30%, var(--color-border))`,
        background: locked ? 'var(--color-surface)' : `color-mix(in srgb, ${color} 4%, var(--color-surface))`,
      }}
      data-testid={`layer-${number}-card`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon size={20} style={{ color: locked ? 'var(--color-text-muted)' : color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              Layer {number}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</span>
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: locked ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
            {title}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
          {stat && (
            <span
              className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-lg"
              style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
            >
              {stat}
            </span>
          )}
        </div>
        <ChevronRight size={16} style={{ color: locked ? 'var(--color-text-muted)' : color }} className="shrink-0 mt-1" />
      </div>
    </button>
  );
}

function TrainingTab({
  tacticalProfile,
  drillCount,
  setupCount,
  createDepth,
  weakestLabel,
  navigate,
}: {
  tacticalProfile: TacticalProfile | null;
  drillCount: number;
  setupCount: number;
  createDepth: number;
  weakestLabel: string | undefined;
  navigate: ReturnType<typeof useNavigate>;
}): JSX.Element {
  return (
    <>
      <LayerCard
        number={1}
        title="Spot"
        subtitle="Tactic Classifier"
        description="See exactly what tactics you miss in your games — forks, pins, skewers — broken down by opening and game phase. The gap between puzzle accuracy and game performance reveals your blind spots."
        icon={Eye}
        color="var(--color-accent)"
        stat={tacticalProfile ? `${tacticalProfile.stats.length} tactic types tracked` : undefined}
        onClick={() => void navigate('/tactics/profile')}
      />

      <LayerCard
        number={2}
        title="Drill"
        subtitle="Missed Opportunity Puzzles"
        description="Your own games become your puzzle set. Every missed fork, pin, and skewer is a drill position — tagged by type, opening, and opponent. More targeted than any puzzle database."
        icon={Swords}
        color="var(--color-warning)"
        stat={drillCount > 0 ? `${drillCount} tactic drills available` : undefined}
        onClick={() => void navigate('/tactics/drill')}
      />

      <LayerCard
        number={3}
        title="Setup"
        subtitle="Tactic Setup Trainer"
        description="Not 'find the fork' — 'engineer the fork.' Start 1-3 moves before the tactic and find the quiet preparatory moves that make it inevitable."
        icon={Wrench}
        color="var(--color-success)"
        stat={setupCount > 0 ? `${setupCount} setup puzzles` : undefined}
        onClick={() => void navigate('/tactics/setup')}
      />

      <LayerCard
        number={4}
        title="Create"
        subtitle="Full Game Replay"
        description="Replay your actual games from the opening. Stay alert through quiet positions and find the tactic when it appears. Context depth grows as you succeed."
        icon={Lightbulb}
        color="#a78bfa"
        stat={tacticalProfile ? `Context: ${createDepth} moves` : undefined}
        onClick={() => void navigate('/tactics/create')}
      />

      {/* Summary */}
      {tacticalProfile && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {tacticalProfile.totalGamesAnalyzed} games analyzed &middot;{' '}
            {tacticalProfile.totalGamesMissed} tactical positions found
            {weakestLabel && (
              <> &middot; Weakest: <span style={{ color: 'var(--color-warning)' }}>{weakestLabel}</span></>
            )}
          </p>
        </div>
      )}
    </>
  );
}

// ─── Shared Sub-Components ──────────────────────────────────────────────────

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
            ? `You solve ${tacticTypeLabel(stat.tacticType).toLowerCase()} puzzles well but miss them in games. Focus on pattern recognition during play.`
            : `Both puzzle accuracy and game detection need work. Practice more ${tacticTypeLabel(stat.tacticType).toLowerCase()} puzzles.`}
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
          <span className="text-sm font-medium">{tacticTypeLabel(tactic.tacticType)}</span>
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
