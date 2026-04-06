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
          accentColor="rgb(6, 182, 212)"
          glowColor="rgba(6, 182, 212, 0.3)"
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
            accentColor="rgb(52, 211, 153)"
            glowColor="rgba(52, 211, 153, 0.3)"
            onClick={() => void navigate('/coach/play')}
            testId="coach-action-play"
          />
          <ActionCard
            icon={<BarChart3 size={24} />}
            label="Game Insights"
            description="Full analysis of your games, openings & tactics"
            accentColor="rgb(139, 92, 246)"
            glowColor="rgba(139, 92, 246, 0.3)"
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
            accentColor="rgb(245, 158, 11)"
            glowColor="rgba(245, 158, 11, 0.25)"
            onClick={() => void navigate('/coach/plan')}
            testId="coach-action-plan"
          />
          <SecondaryAction
            icon={<Search size={20} />}
            label="Analyse"
            accentColor="rgb(56, 189, 248)"
            glowColor="rgba(56, 189, 248, 0.25)"
            onClick={() => void navigate('/coach/analyse')}
            testId="coach-action-analyse"
          />
          <SecondaryAction
            icon={<MessageCircle size={20} />}
            label="Chat"
            accentColor="rgb(251, 113, 133)"
            glowColor="rgba(251, 113, 133, 0.25)"
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
  glowColor: string;
  onClick: () => void;
  testId: string;
}

function ActionCard({ icon, label, description, accentColor, glowColor, onClick, testId }: ActionCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-5 rounded-xl border transition-all duration-200 hover:opacity-90"
      style={{
        borderColor: accentColor.replace('rgb', 'rgba').replace(')', ', 0.3)'),
        background: 'var(--color-surface)',
        boxShadow: `0 0 8px ${glowColor}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 18px ${glowColor.replace('0.3)', '0.55)')}`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 8px ${glowColor}`; }}
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
  accentColor: string;
  glowColor: string;
  onClick: () => void;
  testId: string;
}

function SecondaryAction({ icon, label, accentColor, glowColor, onClick, testId }: SecondaryActionProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 hover:opacity-90"
      style={{
        borderColor: accentColor.replace('rgb', 'rgba').replace(')', ', 0.25)'),
        background: 'var(--color-surface)',
        boxShadow: `0 0 6px ${glowColor}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 14px ${glowColor.replace('0.25)', '0.45)')}`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 6px ${glowColor}`; }}
      data-testid={testId}
    >
      <div style={{ color: accentColor }}>{icon}</div>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
    </button>
  );
}
