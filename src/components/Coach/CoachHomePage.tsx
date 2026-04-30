import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, BarChart3, Calendar, Search, MessageCircle, GraduationCap } from 'lucide-react';
import { SmartSearchBar } from '../Search/SmartSearchBar';

export function CoachHomePage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex flex-col gap-6 p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-2xl mx-auto w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="coach-home-page"
    >
      {/* Ask coach / dictate / deep-link into any session — voice or text. */}
      <section>
        <SmartSearchBar placeholder="Ask your coach or say what you want to do..." />
      </section>

      {/* Work with Coach — full-width card */}
      <section>
        <ActionCard
          icon={<GraduationCap size={24} />}
          label="Work with Coach"
          description="Get personalised training recommendations from your coach"
          rgb="6, 182, 212"
          accentColor="rgb(6, 182, 212)"
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
            rgb="52, 211, 153"
            accentColor="rgb(52, 211, 153)"
            onClick={() => void navigate('/coach/play')}
            testId="coach-action-play"
          />
          <ActionCard
            icon={<BarChart3 size={24} />}
            label="Game Insights"
            description="Full analysis of your games, openings & tactics"
            rgb="139, 92, 246"
            accentColor="rgb(139, 92, 246)"
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
            rgb="245, 158, 11"
            accentColor="rgb(245, 158, 11)"
            onClick={() => void navigate('/coach/plan')}
            testId="coach-action-plan"
          />
          <SecondaryAction
            icon={<Search size={20} />}
            label="Analyse"
            rgb="56, 189, 248"
            accentColor="rgb(56, 189, 248)"
            onClick={() => void navigate('/coach/analyse')}
            testId="coach-action-analyse"
          />
          <SecondaryAction
            icon={<MessageCircle size={20} />}
            label="Chat"
            rgb="251, 113, 133"
            accentColor="rgb(251, 113, 133)"
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
  rgb: string;
  accentColor: string;
  onClick: () => void;
  testId: string;
}

function ActionCard({ icon, label, description, rgb, accentColor, onClick, testId }: ActionCardProps): JSX.Element {
  const shadow = `0 0 6px rgba(${rgb}, 0.5), 0 0 14px rgba(${rgb}, 0.3), 0 0 24px rgba(${rgb}, 0.15)`;
  const shadowHover = `0 0 8px rgba(${rgb}, 0.7), 0 0 18px rgba(${rgb}, 0.45), 0 0 30px rgba(${rgb}, 0.25)`;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-5 rounded-xl transition-all duration-200 hover:opacity-90"
      style={{
        borderTop: `1px solid rgba(${rgb}, 0.1)`,
        borderRight: `1px solid rgba(${rgb}, 0.1)`,
        borderLeft: `2px solid rgba(${rgb}, 0.6)`,
        borderBottom: `2px solid rgba(${rgb}, 0.6)`,
        background: 'var(--color-surface)',
        boxShadow: shadow,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderLeft = `2px solid rgba(${rgb}, 0.85)`;
        el.style.borderBottom = `2px solid rgba(${rgb}, 0.85)`;
        el.style.borderTop = `1px solid rgba(${rgb}, 0.2)`;
        el.style.borderRight = `1px solid rgba(${rgb}, 0.2)`;
        el.style.boxShadow = shadowHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderLeft = `2px solid rgba(${rgb}, 0.6)`;
        el.style.borderBottom = `2px solid rgba(${rgb}, 0.6)`;
        el.style.borderTop = `1px solid rgba(${rgb}, 0.1)`;
        el.style.borderRight = `1px solid rgba(${rgb}, 0.1)`;
        el.style.boxShadow = shadow;
      }}
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
  rgb: string;
  accentColor: string;
  onClick: () => void;
  testId: string;
}

function SecondaryAction({ icon, label, rgb, accentColor, onClick, testId }: SecondaryActionProps): JSX.Element {
  const shadow = `0 0 6px rgba(${rgb}, 0.4), 0 0 12px rgba(${rgb}, 0.2), 0 0 20px rgba(${rgb}, 0.1)`;
  const shadowHover = `0 0 8px rgba(${rgb}, 0.6), 0 0 16px rgba(${rgb}, 0.35), 0 0 24px rgba(${rgb}, 0.18)`;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 hover:opacity-90"
      style={{
        borderTop: `1px solid rgba(${rgb}, 0.08)`,
        borderRight: `1px solid rgba(${rgb}, 0.08)`,
        borderLeft: `2px solid rgba(${rgb}, 0.5)`,
        borderBottom: `2px solid rgba(${rgb}, 0.5)`,
        background: 'var(--color-surface)',
        boxShadow: shadow,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderLeft = `2px solid rgba(${rgb}, 0.8)`;
        el.style.borderBottom = `2px solid rgba(${rgb}, 0.8)`;
        el.style.borderTop = `1px solid rgba(${rgb}, 0.15)`;
        el.style.borderRight = `1px solid rgba(${rgb}, 0.15)`;
        el.style.boxShadow = shadowHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderLeft = `2px solid rgba(${rgb}, 0.5)`;
        el.style.borderBottom = `2px solid rgba(${rgb}, 0.5)`;
        el.style.borderTop = `1px solid rgba(${rgb}, 0.08)`;
        el.style.borderRight = `1px solid rgba(${rgb}, 0.08)`;
        el.style.boxShadow = shadow;
      }}
      data-testid={testId}
    >
      <div style={{ color: accentColor }}>{icon}</div>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
    </button>
  );
}
