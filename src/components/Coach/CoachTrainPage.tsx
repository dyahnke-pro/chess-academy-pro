import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Target,
  BookOpen,
  Puzzle,
  Layers,
  Swords,
  Flame,
  ChevronRight,
  MessageCircle,
  Search,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import {
  getCoachGreeting,
  getTrainingRecommendations,
} from '../../services/coachTrainingService';
import type { TrainingType, TrainingRecommendation } from '../../services/coachTrainingService';

const TYPE_ICONS: Record<TrainingType, React.ComponentType<{ size?: number }>> = {
  guided_lesson: GraduationCap,
  tactic_drill: Target,
  opening_review: BookOpen,
  endgame_practice: Puzzle,
  flashcard_review: Layers,
  position_practice: Swords,
};

function getRouteForRecommendation(rec: TrainingRecommendation): string {
  switch (rec.type) {
    case 'guided_lesson':
      return rec.data.gameId
        ? `/coach/play?review=${rec.data.gameId}`
        : '/coach/play';
    case 'tactic_drill':
      return rec.data.puzzleTheme
        ? `/weaknesses/adaptive?theme=${rec.data.puzzleTheme}`
        : '/weaknesses/adaptive';
    case 'opening_review':
      return rec.data.openingId
        ? `/openings/${rec.data.openingId}`
        : '/openings';
    case 'endgame_practice':
      return '/weaknesses/adaptive?theme=endgame';
    case 'flashcard_review':
      return '/play';
    case 'position_practice':
      return '/coach/play';
  }
}

export function CoachTrainPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [greeting, setGreeting] = useState('');
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfile) {
      setLoading(false);
      return;
    }

    const profile = activeProfile;
    setGreeting(getCoachGreeting(profile));

    async function loadRecommendations(): Promise<void> {
      try {
        const recs = await getTrainingRecommendations(profile);
        setRecommendations(recs);
      } catch {
        // graceful failure — show empty state
      } finally {
        setLoading(false);
      }
    }

    void loadRecommendations();
  }, [activeProfile]);

  return (
    <motion.div
      className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="coach-train-page"
    >
      {/* Coach Greeting */}
      <section className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        >
          <GraduationCap size={20} />
        </div>
        <div className="flex-1">
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text)' }}
            data-testid="coach-greeting"
          >
            {greeting}
          </p>
          {activeProfile && activeProfile.currentStreak > 0 && (
            <div
              className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-warning)', color: 'var(--color-bg)' }}
              data-testid="streak-badge"
            >
              <Flame size={12} />
              {activeProfile.currentStreak}-day streak
            </div>
          )}
        </div>
      </section>

      {/* Today's Training */}
      <section>
        <h2
          className="text-lg font-bold mb-3"
          style={{ color: 'var(--color-text)' }}
          data-testid="training-heading"
        >
          Today&apos;s Training
        </h2>

        {loading && (
          <div
            className="flex items-center justify-center py-8"
            data-testid="train-loading"
          >
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Preparing your training plan...
            </span>
          </div>
        )}

        {!loading && recommendations.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 py-8 rounded-xl border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            data-testid="no-recommendations"
          >
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Play a game or import your games
            </span>
            <button
              onClick={() => void navigate('/coach/play')}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              Play a Game
            </button>
          </div>
        )}

        {!loading && recommendations.length > 0 && (
          <div className="flex flex-col gap-3" data-testid="recommendations">
            {recommendations.map((rec) => (
              <TrainingCard
                key={rec.id}
                recommendation={rec}
                onClick={() => void navigate(getRouteForRecommendation(rec))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Or choose your own */}
      <section>
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Or choose your own
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon={<Swords size={20} />}
            label="Play"
            onClick={() => void navigate('/coach/play')}
            testId="quick-play"
          />
          <QuickAction
            icon={<Search size={20} />}
            label="Analyse"
            onClick={() => void navigate('/coach/analyse')}
            testId="quick-analyse"
          />
          <QuickAction
            icon={<MessageCircle size={20} />}
            label="Chat"
            onClick={() => void navigate('/coach/chat')}
            testId="quick-chat"
          />
        </div>
      </section>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface TrainingCardProps {
  recommendation: TrainingRecommendation;
  onClick: () => void;
}

function TrainingCard({ recommendation, onClick }: TrainingCardProps): JSX.Element {
  const Icon = TYPE_ICONS[recommendation.type];

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl border transition-colors hover:opacity-90 text-left w-full"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid="training-card"
    >
      <div
        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-semibold block truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {recommendation.title}
        </span>
        <span
          className="text-xs block mt-0.5 line-clamp-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {recommendation.description}
        </span>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Clock size={10} />
          ~{recommendation.estimatedMinutes}m
        </span>
        <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </button>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
}

function QuickAction({ icon, label, onClick, testId }: QuickActionProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors hover:opacity-90"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      data-testid={testId}
    >
      <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
    </button>
  );
}
