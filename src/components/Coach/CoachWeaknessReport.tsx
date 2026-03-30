import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown, ChevronUp, Zap, Target, BarChart3 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getStoredWeaknessProfile, computeWeaknessProfile } from '../../services/weaknessAnalyzer';
import { analyzeAllGames, countGamesNeedingAnalysis } from '../../services/gameAnalysisService';
import type { BatchAnalysisProgress } from '../../services/gameAnalysisService';
import { SkillBar } from '../ui/SkillBar';
import type { WeaknessProfile, WeaknessItem, WeaknessCategory } from '../../types';

const CATEGORY_ICONS: Record<WeaknessCategory, string> = {
  tactics: '\u2694\uFE0F',
  openings: '\uD83D\uDCD6',
  opening_weakspots: '\uD83D\uDEA8',
  endgame: '\u2654',
  calculation: '\uD83E\uDDEE',
  time_management: '\u23F1\uFE0F',
  positional: '\uD83C\uDFAF',
};

function getSeverityLabel(severity: number): { text: string; color: string } {
  if (severity > 70) return { text: 'Critical', color: 'var(--color-error)' };
  if (severity > 40) return { text: 'Moderate', color: 'var(--color-warning)' };
  return { text: 'Minor', color: 'var(--color-success)' };
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CoachWeaknessReport(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [profile, setProfile] = useState<WeaknessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStrengths, setShowStrengths] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<BatchAnalysisProgress | null>(null);
  const [unanalyzedCount, setUnanalyzedCount] = useState(0);
  const hasAutoRefreshed = useRef(false);

  // Load stored profile, then auto-recompute if data exists
  useEffect(() => {
    void (async () => {
      const stored = await getStoredWeaknessProfile();
      setProfile(stored);
      setLoading(false);

      // Check how many games need analysis
      const count = await countGamesNeedingAnalysis();
      setUnanalyzedCount(count);

      // Auto-recompute once per visit (if profile + data exist)
      if (activeProfile && !hasAutoRefreshed.current) {
        hasAutoRefreshed.current = true;
        try {
          const fresh = await computeWeaknessProfile(activeProfile);
          setProfile(fresh);
          // Reload profile to get updated skillRadar
          const { db } = await import('../../db/schema');
          const updated = await db.profiles.get(activeProfile.id);
          if (updated) {
            useAppStore.getState().setActiveProfile(updated);
          }
        } catch {
          // Use stored profile
        }
      }
    })();
  }, [activeProfile]);

  const handleRefresh = useCallback(async () => {
    if (!activeProfile || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await computeWeaknessProfile(activeProfile);
      setProfile(fresh);
      // Reload profile to get updated skillRadar
      const { db } = await import('../../db/schema');
      const updated = await db.profiles.get(activeProfile.id);
      if (updated) {
        useAppStore.getState().setActiveProfile(updated);
      }
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  }, [activeProfile, refreshing]);

  const handleAnalyzeGames = useCallback(async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      await analyzeAllGames((progress) => {
        setAnalysisProgress(progress);
      });
      // Refresh the weakness profile after analysis
      const fresh = useAppStore.getState().weaknessProfile;
      if (fresh) setProfile(fresh);
      setUnanalyzedCount(0);
    } catch {
      // Silently fail
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(null);
    }
  }, [analyzing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="report-loading">
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading report...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto w-full p-6 pb-20 md:pb-6" data-testid="weakness-report">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Weakness Report</h2>
        </div>
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          data-testid="report-empty"
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No data yet. Import or play some games, then analyze them.
          </p>
          <div className="flex flex-col gap-3 mt-4 items-center">
            {unanalyzedCount > 0 && (
              <button
                onClick={() => void handleAnalyzeGames()}
                disabled={analyzing}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="analyze-games-btn"
              >
                <BarChart3 size={16} />
                {analyzing ? 'Analyzing...' : `Analyze My Games (${unanalyzedCount})`}
              </button>
            )}
            <button
              onClick={() => void handleRefresh()}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              Compute Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const skillRadar = activeProfile?.skillRadar;
  const topTrainingActions = profile.items
    .filter((item): item is typeof item & { trainingAction: NonNullable<typeof item.trainingAction> } => item.trainingAction !== undefined)
    .slice(0, 3);

  return (
    <motion.div
      className="max-w-2xl mx-auto w-full p-6 pb-20 md:pb-6 flex flex-col gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="weakness-report"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Weakness Report</h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Last updated: {formatTimestamp(profile.computedAt)}
          </span>
        </div>
        <button
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="p-2 rounded-lg hover:opacity-80 disabled:opacity-40"
          data-testid="refresh-btn"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Analyze My Games — prominent CTA */}
      {unanalyzedCount > 0 && (
        <button
          onClick={() => void handleAnalyzeGames()}
          disabled={analyzing}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="analyze-games-btn"
        >
          <BarChart3 size={18} />
          {analyzing
            ? analysisProgress
              ? `Analyzing game ${analysisProgress.currentGame}/${analysisProgress.totalGames}...`
              : 'Analyzing...'
            : `Analyze My Games (${unanalyzedCount} unanalyzed)`}
        </button>
      )}

      {/* Analysis progress bar */}
      {analyzing && analysisProgress && (
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} data-testid="analysis-progress">
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            <span>
              {analysisProgress.phase === 'computing_weaknesses'
                ? 'Computing weakness profile...'
                : analysisProgress.currentGameName}
            </span>
            <span>{analysisProgress.currentGame}/{analysisProgress.totalGames}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                background: 'var(--color-accent)',
                width: `${Math.round((analysisProgress.currentGame / analysisProgress.totalGames) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Training Plan — top priority actions */}
      {topTrainingActions.length > 0 && (
        <div
          className="rounded-xl p-4 border"
          style={{ borderColor: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))' }}
          data-testid="training-plan"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Your Training Plan</h3>
          </div>
          <div className="flex flex-col gap-2">
            {topTrainingActions.map((item, i) => (
              <button
                key={`train-${item.category}-${i}`}
                onClick={() => void navigate(item.trainingAction.route, item.trainingAction.state ? { state: item.trainingAction.state } : undefined)}
                className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                style={{ background: 'var(--color-surface)' }}
                data-testid="training-action"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate" style={{ color: 'var(--color-text)' }}>
                    {item.trainingAction.buttonLabel}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {item.metric}
                  </span>
                </div>
                <Target size={14} style={{ color: 'var(--color-accent)' }} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses List */}
      {profile.items.length > 0 && (
        <div className="flex flex-col gap-3" data-testid="weaknesses-list">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Areas to Improve</h3>
          {profile.items.map((item, i) => (
            <WeaknessItemCard
              key={`${item.category}-${i}`}
              item={item}
              onPractice={(() => {
                const action = item.trainingAction;
                if (!action) return undefined;
                return () => void navigate(action.route, action.state ? { state: action.state } : undefined);
              })()}
            />
          ))}
        </div>
      )}

      {/* Skill Radar */}
      {skillRadar && (
        <div
          className="rounded-xl p-5 border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          data-testid="skill-radar"
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Skills Overview</h3>
          <div className="space-y-3">
            <SkillBar label="Tactics" value={skillRadar.tactics} />
            <SkillBar label="Opening" value={skillRadar.opening} />
            <SkillBar label="Endgame" value={skillRadar.endgame} />
            <SkillBar label="Memory" value={skillRadar.memory} />
            <SkillBar label="Calculation" value={skillRadar.calculation} />
          </div>
        </div>
      )}

      {/* Overall Assessment */}
      {profile.overallAssessment && (
        <div
          className="rounded-xl p-5 border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          data-testid="overall-assessment"
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Overall Assessment</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {profile.overallAssessment}
          </p>
        </div>
      )}

      {/* Strengths — collapsed at the bottom */}
      {profile.strengths.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          data-testid="strengths-card"
        >
          <button
            onClick={() => setShowStrengths(!showStrengths)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
              Strengths ({profile.strengths.length})
            </h3>
            {showStrengths ? (
              <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </button>
          <AnimatePresence>
            {showStrengths && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="px-4 pb-4 space-y-1">
                  {profile.strengths.map((strength, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text)' }}>
                      <span style={{ color: 'var(--color-success)' }}>{'\u2713'}</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────

interface WeaknessItemCardProps {
  item: WeaknessItem;
  onPractice?: () => void;
}

function WeaknessItemCard({ item, onPractice }: WeaknessItemCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const severity = getSeverityLabel(item.severity);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid="weakness-item"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-xl shrink-0">{CATEGORY_ICONS[item.category]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {item.label}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ color: severity.color, background: `color-mix(in srgb, ${severity.color} 12%, transparent)` }}
              data-testid="severity-badge"
            >
              {severity.text}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {item.metric}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {item.detail}
              </p>
              {onPractice && (
                <button
                  onClick={onPractice}
                  className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="practice-btn"
                >
                  {item.trainingAction?.buttonLabel ?? 'Practice'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
