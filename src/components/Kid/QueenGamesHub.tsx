import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { voiceService } from '../../services/voiceService';
import { getGameProgress } from '../../services/journeyService';
import { QueenVsArmy } from './QueenVsArmy';
import { QueensGauntlet } from './QueensGauntlet';
import type { JourneyProgress } from '../../types';

// Pure routing hub — every game has its own route (no setView). The two
// gauntlet-style games and the puzzle/maze/sweep tiles all navigate.

export function QueenGamesHub(): JSX.Element {
  const navigate = useNavigate();
  const [voiceOn, setVoiceOn] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getGameProgress('pawns-journey').then((progress: JourneyProgress | null) => {
      if (progress) setUnlocked(true); // DEV: unlocked for testing
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading && voiceOn) {
      void voiceService.speak(
        unlocked
          ? 'Welcome to the Queen Games! Choose your challenge.'
          : 'Complete the Knight chapter first to unlock the Queen Games!',
      );
    }
  }, [loading, unlocked, voiceOn]);

  const handleVoiceToggle = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center flex-1 p-6"
        style={{ color: 'var(--color-text)' }}
        data-testid="queen-games-loading"
      >
        <p className="text-xl font-bold animate-pulse">Loading...</p>
      </div>
    );
  }

  const cards: Array<{ testid: string; emoji: string; title: string; subtitle: string; to: string }> = [
    { testid: 'queen-army-card', emoji: '⚔️', title: 'Queen vs. Army', subtitle: 'Capture all enemy pawns before they promote!', to: '/kid/queen-games/vs-army' },
    { testid: 'queen-gauntlet-card', emoji: '🛡️', title: "Queen's Gauntlet", subtitle: 'Carve through a guarded army — capture them all in the safe order!', to: '/kid/queen-games/gauntlet' },
    { testid: 'queen-puzzles-card', emoji: '🧩', title: 'Queen Puzzles', subtitle: 'Find the queen move that wins.', to: '/kid/queen-games/puzzles' },
    { testid: 'queen-maze-card', emoji: '🧭', title: 'Queen Path', subtitle: 'Guide the queen to the target square.', to: '/kid/queen-games/maze/1' },
    { testid: 'queen-hunt-card', emoji: '⚔️', title: 'Queen Hunt', subtitle: 'Capture every target.', to: '/kid/queen-games/sweep/1' },
  ];

  return (
    <div
      className="flex flex-col gap-4 p-6 flex-1 overflow-y-auto pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="queen-games-hub"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => void navigate('/kid')}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            data-testid="queen-hub-back"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold">Queen Games</h1>
        </div>
        <button
          onClick={handleVoiceToggle}
          className="p-2 rounded-lg border transition-colors"
          style={{
            background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
          }}
          aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
          data-testid="queen-hub-voice"
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {!unlocked && (
        <div
          className="rounded-xl p-5 border-2 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="queen-games-locked"
        >
          <span className="text-4xl block mb-2">🔒</span>
          <p className="font-bold">Locked</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Complete the Knight chapter to unlock these games!
          </p>
        </div>
      )}

      {unlocked && (
        <div className="flex flex-col gap-4">
          {cards.map((c) => (
            <motion.button
              key={c.testid}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void navigate(c.to)}
              className="rounded-xl p-5 border-2 flex items-center gap-4 text-left transition-colors"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-accent)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
              }}
              data-testid={c.testid}
            >
              <span className="text-4xl flex-shrink-0">{c.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-lg">{c.title}</div>
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {c.subtitle}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// Route wrappers — keep each game's `onBack` contract while wiring
// navigation, so the games are deep-linkable (#9: everything routes).
export function QueenVsArmyRoute(): JSX.Element {
  const navigate = useNavigate();
  return <QueenVsArmy onBack={() => void navigate('/kid/queen-games')} onComplete={() => {}} />;
}

export function QueensGauntletRoute(): JSX.Element {
  const navigate = useNavigate();
  return <QueensGauntlet onBack={() => void navigate('/kid/queen-games')} />;
}
