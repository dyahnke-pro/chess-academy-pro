import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, BarChart3, Calendar, Search, MessageCircle, GraduationCap } from 'lucide-react';

export function CoachHomePage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex flex-col gap-6 p-6 pb-20 md:pb-6 max-w-2xl mx-auto w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="coach-home-page"
    >
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
            label="Game Insights"
            description="Full analysis of your games, openings & tactics"
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
