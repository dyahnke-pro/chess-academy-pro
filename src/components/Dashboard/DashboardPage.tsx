import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { createSession, updateStreak, getRecentSessions } from '../../services/sessionGenerator';
import { getPuzzleStats } from '../../services/puzzleService';
import { seedDatabase } from '../../services/dataLoader';
import { getFavoriteOpenings } from '../../services/openingService';
import { MiniBoard } from '../Board/MiniBoard';
import { Flame, Brain, Swords, Play, Target, BookOpen, Heart, X, Upload, MessageCircle, Search } from 'lucide-react';
import { BETA_MODE } from '../../utils/constants';
import { db } from '../../db/schema';
import type { SessionRecord, OpeningRecord } from '../../types';
import type { PuzzleStats } from '../../services/puzzleService';

export function DashboardPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const navigate = useNavigate();
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [favorites, setFavorites] = useState<OpeningRecord[]>([]);
  const [betaBannerVisible, setBetaBannerVisible] = useState(false);

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

    }
  }, [activeProfile, setActiveProfile]);

  const handleStartSession = useCallback(async (): Promise<void> => {
    if (!activeProfile) return;
    const session = await createSession(activeProfile);
    const store = useAppStore.getState();
    store.setCurrentSession(session);
    void navigate('/openings');
  }, [activeProfile, navigate]);

  if (!activeProfile) return <></>;

  const { currentStreak, puzzleRating } = activeProfile;

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="dashboard"
    >
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
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Puzzle Rating" value={`${puzzleRating}`} icon={<Brain size={18} />} />
        <StatCard label="Game ELO" value={`${activeProfile.currentRating}`} icon={<Swords size={18} />} />
      </div>

      {/* Play & Review — hero section */}
      <div className="grid grid-cols-2 gap-3" data-testid="hero-actions">
        <button
          onClick={() => void navigate('/coach/play')}
          className="rounded-xl p-6 border flex flex-col items-center gap-3 hover:opacity-90 transition-opacity"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            borderColor: 'var(--color-accent)',
          }}
          data-testid="hero-play-btn"
        >
          <Play size={28} />
          <span className="text-lg font-bold">Play</span>
          <span className="text-xs opacity-80">Play a game with AI coach</span>
        </button>
        <button
          onClick={() => void navigate('/games')}
          className="rounded-xl p-6 border flex flex-col items-center gap-3 hover:opacity-90 transition-opacity"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          data-testid="hero-review-btn"
        >
          <Search size={28} style={{ color: 'var(--color-accent)' }} />
          <span className="text-lg font-bold">Review</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Import & review games</span>
        </button>
      </div>

      {/* Play with Coach — featured card */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-accent-dim, var(--color-surface)) 100%)',
          borderColor: 'var(--color-accent)',
          borderWidth: '2px',
        }}
        data-testid="coach-card"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            C
          </div>
          <div>
            <h2 className="font-bold text-lg">Play with Coach</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Get real-time guidance while you play
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => void navigate('/coach/play')}
            className="py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="coach-play-btn"
          >
            <Play size={14} />
            New Game
          </button>
          <button
            onClick={() => void navigate('/coach/chat')}
            className="py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            data-testid="coach-chat-btn"
          >
            <MessageCircle size={14} />
            Chat
          </button>
          <button
            onClick={() => void navigate('/coach/analyse')}
            className="py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            data-testid="coach-analyse-btn"
          >
            <Brain size={14} />
            Analyse
          </button>
          <button
            onClick={() => void navigate('/coach/train')}
            className="py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            data-testid="coach-train-btn"
          >
            <Target size={14} />
            Train
          </button>
        </div>
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
      <div className="grid grid-cols-4 gap-3">
        <QuickAction label="Openings" icon={<BookOpen size={18} />} onClick={() => void navigate('/openings')} />
        <QuickAction label="Puzzles" icon={<Brain size={18} />} onClick={() => void navigate('/play')} />
        <QuickAction label="Tactics" icon={<Swords size={18} />} onClick={() => void navigate('/tactics')} />
        <QuickAction label="Import" icon={<Upload size={18} />} onClick={() => void navigate('/games/import')} />
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
