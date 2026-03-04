import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { createSession, updateStreak, getRecentSessions } from '../../services/sessionGenerator';
import { getPuzzleStats } from '../../services/puzzleService';
import { seedDatabase } from '../../services/dataLoader';
import { Flame, Star, Brain, Clock, Play, Target, BookOpen } from 'lucide-react';
import type { SessionRecord } from '../../types';
import type { PuzzleStats } from '../../services/puzzleService';

export function DashboardPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const navigate = useNavigate();
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    void seedDatabase();
    void getPuzzleStats().then(setPuzzleStats);
    void getRecentSessions(5).then(setRecentSessions);

    // Update streak on dashboard load
    if (activeProfile) {
      void updateStreak(activeProfile).then(({ currentStreak, longestStreak }) => {
        if (currentStreak !== activeProfile.currentStreak || longestStreak !== activeProfile.longestStreak) {
          setActiveProfile({ ...activeProfile, currentStreak, longestStreak });
        }
      });
    }
  }, [activeProfile, setActiveProfile]);

  const handleStartSession = useCallback(async (): Promise<void> => {
    if (!activeProfile) return;
    const session = await createSession(activeProfile);
    const store = useAppStore.getState();
    store.setCurrentSession(session);
    void navigate('/puzzles');
  }, [activeProfile, navigate]);

  if (!activeProfile) return <></>;

  const { currentStreak, xp, level, puzzleRating, skillRadar } = activeProfile;

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Good {getGreeting()}, {activeProfile.name}
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mt-1">
            Ready for today's session?
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <Flame size={16} style={{ color: 'var(--color-warning)' }} />
          <span>{currentStreak} day streak</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Level" value={`${level}`} icon={<Star size={18} />} />
        <StatCard label="XP" value={xp.toLocaleString()} icon={<Star size={18} />} />
        <StatCard label="Puzzle Rating" value={`${puzzleRating}`} icon={<Brain size={18} />} />
        <StatCard label="ELO" value={`${activeProfile.currentRating}`} icon={<Clock size={18} />} />
      </div>

      {/* Today's session card */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="font-semibold text-lg mb-1">Today's Training</h2>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mb-4">
          Your personalised session is ready. ~{activeProfile.preferences.dailySessionMinutes} min
        </p>
        <button
          onClick={() => void handleStartSession()}
          className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
          data-testid="start-session-btn"
        >
          <Play size={16} />
          Start Session
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction label="Puzzles" icon={<Target size={18} />} onClick={() => void navigate('/puzzles')} />
        <QuickAction label="Openings" icon={<BookOpen size={18} />} onClick={() => void navigate('/openings')} />
        <QuickAction label="Flashcards" icon={<Brain size={18} />} onClick={() => void navigate('/flashcards')} />
      </div>

      {/* Puzzle stats */}
      {puzzleStats && puzzleStats.totalAttempted > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-lg mb-3">Puzzle Progress</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold">{puzzleStats.totalAttempted}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Attempted</div>
            </div>
            <div>
              <div className="text-xl font-bold">{Math.round(puzzleStats.overallAccuracy * 100)}%</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Accuracy</div>
            </div>
            <div>
              <div className="text-xl font-bold">{puzzleStats.duePuzzles}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Due</div>
            </div>
          </div>
        </div>
      )}

      {/* Skill radar */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="font-semibold text-lg mb-4">Skill Overview</h2>
        <div className="space-y-2">
          {(Object.entries(skillRadar) as Array<[string, number]>).map(([skill, value]) => (
            <SkillBar key={skill} label={skill} value={value} />
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-lg mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>{s.date}</span>
                <div className="flex gap-3">
                  <span>{s.puzzlesSolved} puzzles</span>
                  <span>{s.xpEarned} XP</span>
                  {s.completed && <span style={{ color: 'var(--color-success)' }}>Done</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-1"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-4 border flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid={`quick-action-${label.toLowerCase()}`}
    >
      <div style={{ color: 'var(--color-accent)' }}>{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function SkillBar({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm capitalize w-24 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${value}%`, background: 'var(--color-accent)' }}
        />
      </div>
      <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
        {value}
      </span>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
