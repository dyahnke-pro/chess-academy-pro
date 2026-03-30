import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Zap, Target } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getStoredWeaknessProfile, computeWeaknessProfile } from '../../services/weaknessAnalyzer';
import { SkillBar } from '../ui/SkillBar';
import type { WeaknessProfile, WeaknessItem, WeaknessCategory } from '../../types';

const CATEGORY_ICONS: Record<WeaknessCategory, string> = {
  tactics: '\u2694\uFE0F',
  openings: '\uD83D\uDCD6',
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

  useEffect(() => {
    void getStoredWeaknessProfile().then((stored) => {
      setProfile(stored);
      setLoading(false);
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!activeProfile || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await computeWeaknessProfile(activeProfile);
      setProfile(fresh);
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  }, [activeProfile, refreshing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="report-loading">
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading report...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto w-full p-6" data-testid="weakness-report">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => void navigate('/coach')} className="p-1.5 rounded-lg hover:opacity-80">
            <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
          </button>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Weakness Report</h2>
        </div>
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          data-testid="report-empty"
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No data yet. Play some games and solve puzzles, then come back.
          </p>
          <button
            onClick={() => void handleRefresh()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            Compute Now
          </button>
        </div>
      </div>
    );
  }

  const skillRadar = activeProfile?.skillRadar;
  const topTrainingActions = profile.items
    .filter((item) => item.trainingAction)
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
        <div className="flex items-center gap-3">
          <button onClick={() => void navigate('/coach')} className="p-1.5 rounded-lg hover:opacity-80">
            <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
          </button>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Weakness Report</h2>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Last updated: {formatTimestamp(profile.computedAt)}
            </span>
          </div>
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
                onClick={() => void navigate(item.trainingAction!.route, item.trainingAction!.state ? { state: item.trainingAction!.state } : undefined)}
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
                    {item.trainingAction!.buttonLabel}
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
              onPractice={
                item.trainingAction
                  ? () => void navigate(item.trainingAction!.route, item.trainingAction!.state ? { state: item.trainingAction!.state } : undefined)
                  : undefined
              }
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
