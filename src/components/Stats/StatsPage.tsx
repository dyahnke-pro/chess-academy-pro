import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { getPuzzleStats, getThemeSkills } from '../../services/puzzleService';
import { getRecentSessions } from '../../services/sessionGenerator';
import { detectBadHabits } from '../../services/coachFeatureService';
import { getLevelTitle, getXpToNextLevel } from '../../services/levelService';
import { SkillBar } from '../ui/SkillBar';
import { Star } from 'lucide-react';
import type { SessionRecord, BadHabit } from '../../types';
import type { PuzzleStats, ThemeSkill } from '../../services/puzzleService';

export function StatsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStats | null>(null);
  const [themeSkills, setThemeSkills] = useState<ThemeSkill[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [badHabits, setBadHabits] = useState<BadHabit[]>([]);

  useEffect(() => {
    void getPuzzleStats().then(setPuzzleStats);
    void getThemeSkills().then(setThemeSkills);
    void getRecentSessions(10).then(setRecentSessions);
    if (activeProfile) {
      void detectBadHabits(activeProfile).then(setBadHabits);
    }
  }, [activeProfile]);

  if (!activeProfile) return <></>;

  const xpProgress = getXpToNextLevel(activeProfile.xp);
  const last7Days = getLast7Days();

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="stats-page"
    >
      <h1 className="text-2xl font-bold">Stats & Progress</h1>

      {/* Header stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={getLevelTitle(activeProfile.level)} value={`Lv ${activeProfile.level}`} />
        <StatCard label="Total XP" value={activeProfile.xp.toLocaleString()} />
        <StatCard label="Puzzle Rating" value={`${activeProfile.puzzleRating}`} />
        <StatCard label="ELO" value={`${activeProfile.currentRating}`} />
      </div>

      {/* XP progress bar */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">{getLevelTitle(activeProfile.level)}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {xpProgress.current}/{xpProgress.needed} XP to next level
          </span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${xpProgress.percent}%`, background: 'var(--color-accent)' }}
            data-testid="xp-bar"
          />
        </div>
      </div>

      {/* Streak + 7-day activity */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Activity</h2>
          <span className="text-sm" style={{ color: 'var(--color-warning)' }}>
            {activeProfile.currentStreak} day streak
          </span>
        </div>
        <div className="flex gap-2 justify-center">
          {last7Days.map((day) => {
            const hasSession = recentSessions.some((s) => s.date === day);
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{
                    background: hasSession ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                  data-testid={`activity-dot-${day}`}
                />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(day).toLocaleDateString('en', { weekday: 'narrow' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill radar */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="font-semibold text-lg mb-4">Skill Breakdown</h2>
        <div className="space-y-2">
          {(Object.entries(activeProfile.skillRadar) as Array<[string, number]>).map(([skill, value]) => (
            <SkillBar key={skill} label={skill} value={value} />
          ))}
        </div>
      </div>

      {/* Tactical theme breakdown */}
      {themeSkills.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-lg mb-3">Tactical Themes</h2>
          <div className="space-y-2">
            {themeSkills.map((skill) => (
              <SkillBar
                key={skill.theme}
                label={skill.theme}
                value={Math.round(skill.accuracy * 100)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Puzzle stats panel */}
      {puzzleStats && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-lg mb-3">Puzzle Stats</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
            <MiniStat label="Attempted" value={`${puzzleStats.totalAttempted}`} />
            <MiniStat label="Correct" value={`${puzzleStats.totalCorrect}`} />
            <MiniStat label="Accuracy" value={`${Math.round(puzzleStats.overallAccuracy * 100)}%`} />
            <MiniStat label="Due" value={`${puzzleStats.duePuzzles}`} />
            <MiniStat label="Avg Rating" value={`${puzzleStats.averageRating}`} />
          </div>
        </div>
      )}

      {/* Session history */}
      {recentSessions.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-lg mb-3">Session History</h2>
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{s.date}</span>
                <div className="flex gap-3">
                  <span>{s.durationMinutes}m</span>
                  <span>{s.puzzlesSolved} puzzles</span>
                  <span>{s.xpEarned} XP</span>
                  {s.completed && <span style={{ color: 'var(--color-success)' }}>Done</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bad habits */}
      {badHabits.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-lg mb-3">Bad Habits</h2>
          <div className="space-y-2">
            {badHabits.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span>{h.description}</span>
                {h.isResolved ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--color-success)', color: 'var(--color-bg)' }}>
                    Resolved
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {h.occurrences}x
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-1"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div style={{ color: 'var(--color-text-muted)' }}>
        <Star size={16} />
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}
