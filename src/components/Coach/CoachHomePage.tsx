import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, BarChart3, Calendar, Search, MessageCircle, GraduationCap } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getStoredWeaknessProfile, computeWeaknessProfile } from '../../services/weaknessAnalyzer';
import { GameImportCard } from './GameImportCard';
import type { WeaknessProfile, WeaknessItem, WeaknessCategory } from '../../types';

const CATEGORY_ICONS: Record<WeaknessCategory, string> = {
  tactics: '\u2694\uFE0F',
  openings: '\uD83D\uDCD6',
  endgame: '\u2654',
  calculation: '\uD83E\uDDEE',
  time_management: '\u23F1\uFE0F',
  positional: '\uD83C\uDFAF',
};

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function getSeverityColor(severity: number): string {
  if (severity > 70) return 'var(--color-error)';
  if (severity > 40) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function getTrainRoute(category: WeaknessCategory): string {
  switch (category) {
    case 'tactics':
    case 'calculation':
      return '/puzzles';
    case 'openings':
      return '/openings';
    case 'endgame':
      return '/puzzles';
    case 'time_management':
      return '/coach/plan';
    case 'positional':
      return '/puzzles';
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function CoachHomePage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [weaknessProfile, setWeaknessProfile] = useState<WeaknessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeaknesses(): Promise<void> {
      try {
        const stored = await getStoredWeaknessProfile();

        if (stored) {
          setWeaknessProfile(stored);
          setLoading(false);

          // If stale, recompute in background
          const age = Date.now() - new Date(stored.computedAt).getTime();
          if (age > STALE_THRESHOLD_MS && activeProfile) {
            const fresh = await computeWeaknessProfile(activeProfile);
            setWeaknessProfile(fresh);
          }
          return;
        }

        // No stored profile — compute if we have an active profile
        if (activeProfile) {
          const fresh = await computeWeaknessProfile(activeProfile);
          setWeaknessProfile(fresh);
        }
      } catch {
        // Silently fail — show empty state
      } finally {
        setLoading(false);
      }
    }

    void loadWeaknesses();
  }, [activeProfile]);

  const topWeaknesses = weaknessProfile?.items.slice(0, 3) ?? [];
  const hasData = weaknessProfile !== null && weaknessProfile.items.length > 0;

  const handleImportComplete = useCallback(async (count: number) => {
    if (count > 0 && activeProfile) {
      const fresh = await computeWeaknessProfile(activeProfile);
      setWeaknessProfile(fresh);
    }
  }, [activeProfile]);

  return (
    <motion.div
      className="flex flex-col gap-6 p-6 pb-20 md:pb-6 max-w-2xl mx-auto w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="coach-home-page"
    >
      {/* Weakness Summary Section */}
      <section data-testid="weakness-summary">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Your Training Focus
          </h2>
          {weaknessProfile && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {formatTimestamp(weaknessProfile.computedAt)}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8" data-testid="weakness-loading">
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Analysing your data...
            </div>
          </div>
        )}

        {!loading && !hasData && (
          <GameImportCard onImportComplete={(count) => void handleImportComplete(count)} />
        )}

        {!loading && hasData && (
          <div className="flex flex-col gap-3">
            {topWeaknesses.map((item: WeaknessItem, i: number) => (
              <WeaknessCard
                key={`${item.category}-${i}`}
                item={item}
                onTrain={() => void navigate(getTrainRoute(item.category))}
              />
            ))}
            <button
              onClick={() => void navigate('/coach/report')}
              className="text-sm font-medium self-center mt-1"
              style={{ color: 'var(--color-accent)' }}
              data-testid="view-full-report"
            >
              View Full Report
            </button>
          </div>
        )}
      </section>

      {/* Work with Coach — full-width card */}
      <section>
        <ActionCard
          icon={<GraduationCap size={24} />}
          label="Work with Coach"
          description="Get personalised training recommendations from your coach"
          accentColor="var(--color-accent)"
          onClick={() => void navigate('/coach/train')}
          testId="coach-action-train"
        />
      </section>

      {/* Primary Actions */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            icon={<Swords size={24} />}
            label="Play & Review"
            description="Play a game, then review it move by move"
            accentColor="var(--color-success)"
            onClick={() => void navigate('/coach/play')}
            testId="coach-action-play"
          />
          <ActionCard
            icon={<BarChart3 size={24} />}
            label="Weakness Report"
            description="Deep analysis of your strengths & weaknesses"
            accentColor="#8B5CF6"
            onClick={() => void navigate('/coach/report')}
            testId="coach-action-report"
          />
        </div>
      </section>

      {/* Secondary Actions */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <SecondaryAction
            icon={<Calendar size={20} />}
            label="Training Plan"
            onClick={() => void navigate('/coach/plan')}
            testId="coach-action-plan"
          />
          <SecondaryAction
            icon={<Search size={20} />}
            label="Analyse"
            onClick={() => void navigate('/coach/analyse')}
            testId="coach-action-analyse"
          />
          <SecondaryAction
            icon={<MessageCircle size={20} />}
            label="Chat"
            onClick={() => void navigate('/coach/chat')}
            testId="coach-action-chat"
          />
        </div>
      </section>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface WeaknessCardProps {
  item: WeaknessItem;
  onTrain: () => void;
}

function WeaknessCard({ item, onTrain }: WeaknessCardProps): JSX.Element {
  return (
    <div
      className="rounded-xl p-4 border flex items-center gap-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid="weakness-card"
    >
      <span className="text-2xl shrink-0">{CATEGORY_ICONS[item.category]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {item.label}
          </span>
        </div>
        <div className="rounded-full h-1.5 mb-1" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${item.severity}%`, background: getSeverityColor(item.severity) }}
            data-testid="severity-bar"
          />
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {item.metric}
        </span>
      </div>
      <button
        onClick={onTrain}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="train-btn"
      >
        Train
      </button>
    </div>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  accentColor: string;
  onClick: () => void;
  testId: string;
}

function ActionCard({ icon, label, description, accentColor, onClick, testId }: ActionCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-5 rounded-xl border transition-colors hover:opacity-90"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid={testId}
    >
      <div style={{ color: accentColor }}>{icon}</div>
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="text-xs text-left" style={{ color: 'var(--color-text-muted)' }}>{description}</span>
    </button>
  );
}

interface SecondaryActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
}

function SecondaryAction({ icon, label, onClick, testId }: SecondaryActionProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors hover:opacity-90"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid={testId}
    >
      <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
    </button>
  );
}
