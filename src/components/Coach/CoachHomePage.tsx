import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, MessageCircle, Search, Calendar } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getRecentSessions } from '../../services/sessionGenerator';
import { CoachAvatar } from './CoachAvatar';
import { CoachSelectionScreen } from './CoachSelectionScreen';
import type { SessionRecord, CoachPersonality } from '../../types';

const ACTION_BUTTONS = [
  { id: 'play', label: 'Play a Game', icon: Swords, path: '/coach/play', color: 'text-green-500' },
  { id: 'chat', label: 'Just Chat', icon: MessageCircle, path: '/coach/chat', color: 'text-blue-500' },
  { id: 'analyse', label: 'Analyse Position', icon: Search, path: '/coach/analyse', color: 'text-purple-500' },
  { id: 'plan', label: 'Plan My Session', icon: Calendar, path: '/coach/plan', color: 'text-orange-500' },
] as const;

const PERSONALITY_NAMES: Record<CoachPersonality, string> = {
  danya: 'Danya',
  kasparov: 'Kasparov',
  fischer: 'Fischer',
};

export function CoachHomePage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const coachExpression = useAppStore((s) => s.coachExpression);
  const coachSpeaking = useAppStore((s) => s.coachSpeaking);
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null);
  const [showSelection, setShowSelection] = useState(false);

  const hasCoach = activeProfile?.unlockedCoaches && activeProfile.unlockedCoaches.length > 0;
  const personality = activeProfile?.coachPersonality ?? 'danya';

  useEffect(() => {
    void getRecentSessions(1).then((sessions) => {
      if (sessions.length > 0) {
        setLastSession(sessions[0] ?? null);
      }
    });
  }, []);

  // Show selection screen if no coach selected yet
  if (!hasCoach || showSelection) {
    return (
      <CoachSelectionScreen
        onSelect={() => setShowSelection(false)}
      />
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="coach-home-page"
    >
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <CoachAvatar
          personality={personality}
          expression={coachExpression}
          speaking={coachSpeaking}
          size="lg"
        />
        <h2 className="text-xl font-bold text-theme-text">
          Coach {PERSONALITY_NAMES[personality]}
        </h2>
        <button
          onClick={() => setShowSelection(true)}
          className="text-xs text-theme-accent hover:underline"
        >
          Change Coach
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {ACTION_BUTTONS.map((action, i) => (
          <motion.button
            key={action.id}
            onClick={() => void navigate(action.path)}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-border transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            data-testid={`coach-action-${action.id}`}
          >
            <action.icon size={28} className={action.color} />
            <span className="text-sm font-medium text-theme-text">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Recent Session Summary */}
      {lastSession && (
        <div className="w-full bg-theme-surface rounded-xl border border-theme-border p-4">
          <h3 className="text-sm font-semibold text-theme-text mb-2">Last Session</h3>
          <div className="flex justify-between text-xs text-theme-text-muted">
            <span>{lastSession.date}</span>
            <span>{lastSession.durationMinutes} min</span>
            <span>{lastSession.puzzlesSolved} puzzles</span>
            <span>+{lastSession.xpEarned} XP</span>
          </div>
          {lastSession.coachSummary && (
            <p className="text-xs text-theme-text-muted mt-2 italic">
              &ldquo;{lastSession.coachSummary}&rdquo;
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
