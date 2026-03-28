import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { createSession, updateStreak, getRecentSessions } from '../../services/sessionGenerator';
import { getPuzzleStats } from '../../services/puzzleService';
import { seedDatabase } from '../../services/dataLoader';
import { getFavoriteOpenings } from '../../services/openingService';
import { checkAndAwardAchievements, getLevelTitle, getXpToNextLevel } from '../../services/gamificationService';
import { voicePackService, getVoicePackUrl } from '../../services/voicePackService';
import type { VoicePackStatus } from '../../services/voicePackService';
import { unlockAudioContext } from '../../services/audioContextManager';
import { SkillBar } from '../ui/SkillBar';
import { MiniBoard } from '../Board/MiniBoard';
import { Flame, Star, Brain, Clock, Play, Target, BookOpen, Heart, X, Download, Volume2, CheckCircle } from 'lucide-react';
import { DailyPuzzleCard } from './DailyPuzzleCard';
import { BETA_MODE } from '../../utils/constants';
import { db } from '../../db/schema';
import type { SessionRecord, Achievement, OpeningRecord } from '../../types';
import type { PuzzleStats } from '../../services/puzzleService';

export function DashboardPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setPendingAchievement = useAppStore((s) => s.setPendingAchievement);
  const navigate = useNavigate();
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [favorites, setFavorites] = useState<OpeningRecord[]>([]);
  const [betaBannerVisible, setBetaBannerVisible] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoicePackStatus>(voicePackService.getStatus());
  const [voiceProgress, setVoiceProgress] = useState(voicePackService.getDownloadProgress());
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    void seedDatabase();
    void getPuzzleStats().then(setPuzzleStats);
    void getRecentSessions(5).then(setRecentSessions);
    void getFavoriteOpenings().then(setFavorites);

    if (BETA_MODE) {
      void db.meta.get('beta_banner_dismissed').then((record) => {
        if (!record) setBetaBannerVisible(true);
      });
    }

    // Update streak on dashboard load
    if (activeProfile) {
      void updateStreak(activeProfile).then(({ currentStreak, longestStreak }) => {
        if (currentStreak !== activeProfile.currentStreak || longestStreak !== activeProfile.longestStreak) {
          setActiveProfile({ ...activeProfile, currentStreak, longestStreak });
        }
      });

      // Check for new achievements
      void checkAndAwardAchievements(activeProfile).then((newAchievements) => {
        if (newAchievements.length > 0) {
          queueAchievementToasts(newAchievements, setPendingAchievement);
          const totalXp = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
          const updatedXp = activeProfile.xp + totalXp;
          const updatedLevel = Math.floor(updatedXp / 500) + 1;
          setActiveProfile({
            ...activeProfile,
            achievements: [...activeProfile.achievements, ...newAchievements.map((a) => a.id)],
            xp: updatedXp,
            level: updatedLevel,
          });
        }
      });
    }
  }, [activeProfile, setActiveProfile, setPendingAchievement]);

  // Subscribe to voice pack status. Try loading from IndexedDB cache on mount.
  useEffect(() => {
    const unsubStatus = voicePackService.onStatusChange(setVoiceStatus);
    const unsubProgress = voicePackService.onProgress(setVoiceProgress);

    // Auto-load from cache if previously downloaded
    if (activeProfile?.preferences.kokoroEnabled && voicePackService.getStatus() === 'idle') {
      void voicePackService.loadCached(activeProfile.preferences.kokoroVoiceId);
    }

    return () => { unsubStatus(); unsubProgress(); };
  }, [activeProfile?.preferences.kokoroEnabled, activeProfile?.preferences.kokoroVoiceId]);

  const handleDownloadBella = useCallback(async (): Promise<void> => {
    unlockAudioContext();
    setVoiceError(null);
    const voiceId = activeProfile?.preferences.kokoroVoiceId || 'af_bella';
    try {
      await voicePackService.loadFromUrl(voiceId, getVoicePackUrl(voiceId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceError(msg);
    }
  }, [activeProfile?.preferences.kokoroVoiceId]);

  const handleStartSession = useCallback(async (): Promise<void> => {
    if (!activeProfile) return;
    const session = await createSession(activeProfile);
    const store = useAppStore.getState();
    store.setCurrentSession(session);
    void navigate('/openings');
  }, [activeProfile, navigate]);

  if (!activeProfile) return <></>;

  const { currentStreak, xp, level, puzzleRating, skillRadar } = activeProfile;
  const xpProgress = getXpToNextLevel(xp);

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="dashboard"
    >
      {/* Bella voice card — shows until model is ready */}
      {activeProfile.preferences.kokoroEnabled && voiceStatus !== 'ready' && (
        <div
          className="rounded-xl p-4 border flex items-start gap-3"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="bella-voice-card"
        >
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            <Volume2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            {voiceStatus === 'idle' && (
              <>
                <p className="text-sm font-semibold">Activate Bella — Your AI Voice Coach</p>
                <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Download the voice pack once. Bella will narrate openings and coach feedback — no internet required after download.
                </p>
                <button
                  onClick={() => void handleDownloadBella()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="bella-download-btn"
                >
                  <Download size={15} />
                  Download Bella Voice
                </button>
              </>
            )}
            {voiceStatus === 'downloading' && (
              <>
                <p className="text-sm font-semibold">Downloading Bella voice… {voiceProgress}%</p>
                <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${voiceProgress}%`, background: 'var(--color-accent)' }}
                  />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Keep this screen open — download runs in the foreground.
                </p>
              </>
            )}
            {voiceStatus === 'error' && (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>Bella download failed</p>
                {voiceError && (
                  <p className="text-xs mt-0.5 mb-1 font-mono break-all" style={{ color: 'var(--color-error)' }}>
                    {voiceError}
                  </p>
                )}
                <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Tap retry to try again.
                </p>
                <button
                  onClick={() => void handleDownloadBella()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                  data-testid="bella-retry-btn"
                >
                  <Download size={15} />
                  Retry Download
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {activeProfile.preferences.kokoroEnabled && voiceStatus === 'ready' && (
        <div
          className="rounded-xl px-4 py-2.5 border flex items-center gap-2 text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="bella-ready-card"
        >
          <CheckCircle size={15} style={{ color: 'var(--color-success)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Bella voice is active</span>
        </div>
      )}

      {betaBannerVisible && (
        <div
          className="rounded-xl p-3 text-sm flex items-center justify-between"
          style={{ background: 'var(--color-warning)', color: '#000' }}
          data-testid="beta-banner"
        >
          <span>
            <strong>Chess Academy Pro — Beta</strong> · You&apos;re testing an early version. Found a bug?{' '}
            <a href="mailto:feedback@chessacademy.pro" style={{ textDecoration: 'underline' }}>Send feedback</a>
          </span>
          <button
            onClick={() => {
              setBetaBannerVisible(false);
              void db.meta.put({ key: 'beta_banner_dismissed', value: 'true' });
            }}
            className="ml-3 shrink-0 p-0.5 rounded hover:opacity-70"
            aria-label="Dismiss beta banner"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
        <StatCard label={getLevelTitle(level)} value={`Lv ${level}`} icon={<Star size={18} />} xpProgress={xpProgress} />
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

      {/* Lichess Daily Puzzle */}
      <DailyPuzzleCard />

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction label="Openings" icon={<BookOpen size={18} />} onClick={() => void navigate('/openings')} />
        <QuickAction label="Play" icon={<Brain size={18} />} onClick={() => void navigate('/play')} />
        <QuickAction label="Coach" icon={<Target size={18} />} onClick={() => void navigate('/coach')} />
      </div>

      {/* Favorite openings */}
      {favorites.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="favorites-section"
        >
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-red-500 fill-red-500" />
            <h2 className="font-semibold text-lg">Favorite Openings</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {favorites.map((opening) => (
              <button
                key={opening.id}
                onClick={() => void navigate(`/openings/${opening.id}`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-theme-border/50 transition-colors"
                data-testid={`favorite-opening-${opening.id}`}
              >
                <MiniBoard fen={opening.fen} size={64} orientation={opening.color} />
                <div className="text-center">
                  <div className="text-xs font-semibold text-theme-text truncate max-w-[100px]">{opening.name}</div>
                  <div className="text-[10px] text-theme-text-muted">{opening.eco}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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

function queueAchievementToasts(
  achievements: Achievement[],
  setPending: (a: Achievement | null) => void,
): void {
  achievements.forEach((achievement, i) => {
    setTimeout(() => setPending(achievement), i * 3500);
  });
}

function StatCard({
  label,
  value,
  icon,
  xpProgress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  xpProgress?: { current: number; needed: number; percent: number };
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
      {xpProgress && (
        <div className="mt-1">
          <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${xpProgress.percent}%`, background: 'var(--color-accent)' }}
              data-testid="xp-progress-bar"
            />
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {xpProgress.current}/{xpProgress.needed} XP
          </div>
        </div>
      )}
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
