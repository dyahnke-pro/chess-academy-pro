import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Swords, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPuzzlesByTheme, getPuzzlesInRatingBand } from '../../services/puzzleService';
import { useAppStore } from '../../stores/appStore';
import { PuzzleBoard } from '../Puzzles/PuzzleBoard';
import type { PuzzleOutcome } from '../Puzzles/PuzzleBoard';
import type { PuzzleRecord } from '../../types';
import { shuffleArray } from '../../services/puzzleService';

type Phase = 'loading' | 'solving' | 'summary';

const DRILL_SIZE = 10;

export function TacticDrillPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setGlobalBoardContext = useAppStore((s) => s.setGlobalBoardContext);

  const filterThemes = (location.state as { filterThemes?: string[] } | null)?.filterThemes;
  // Legacy support: filterTypes from old Spot page
  const filterTypes = (location.state as { filterTypes?: string[] } | null)?.filterTypes;
  const themes = filterThemes ?? filterTypes ?? ['fork'];

  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<PuzzleRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [failed, setFailed] = useState(0);
  const completedRef = useRef<Set<number>>(new Set());

  const total = queue.length;
  const currentPuzzle = queue[currentIndex] ?? null;
  const themeLabel = themes.length === 1
    ? themes[0].replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
    : 'Mixed';

  // Clear board context on unmount
  useEffect(() => {
    return () => { setGlobalBoardContext(null); };
  }, [setGlobalBoardContext]);

  const loadQueue = useCallback(async (): Promise<void> => {
    setPhase('loading');

    // Fetch puzzles for each theme and merge
    const allPuzzles: PuzzleRecord[] = [];
    for (const theme of themes) {
      const puzzles = await getPuzzlesByTheme(theme, DRILL_SIZE);
      allPuzzles.push(...puzzles);
    }

    // Deduplicate and shuffle
    const seen = new Set<string>();
    const unique = allPuzzles.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    let shuffled = shuffleArray(unique).slice(0, DRILL_SIZE);

    // Fallback: if no puzzles found for the theme, use rating-matched puzzles
    if (shuffled.length === 0) {
      const userRating = activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? 1200;
      const fallback = await getPuzzlesInRatingBand(userRating, 300, DRILL_SIZE);
      shuffled = shuffleArray(fallback).slice(0, DRILL_SIZE);
    }

    if (shuffled.length === 0) {
      setPhase('summary');
      return;
    }

    setQueue(shuffled);
    setCurrentIndex(0);
    setSolved(0);
    setFailed(0);
    completedRef.current = new Set();
    setPhase('solving');
  }, [themes]);

  useEffect(() => {
    void loadQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePuzzleComplete = useCallback((_outcome: PuzzleOutcome): void => {
    // Only count the first completion of each puzzle
    if (completedRef.current.has(currentIndex)) return;
    completedRef.current.add(currentIndex);

    if (_outcome.correct) {
      setSolved((s) => s + 1);
    } else {
      setFailed((f) => f + 1);
    }
    // No auto-advance — user navigates with arrows
  }, [currentIndex]);

  const goNext = useCallback((): void => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setPhase('summary');
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, queue.length]);

  const goPrev = useCallback((): void => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="tactic-drill-page"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => void navigate('/tactics')} className="p-2 rounded-lg hover:opacity-80" data-testid="back-btn">
          <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
        </button>
        <Swords size={22} style={{ color: 'var(--color-warning)' }} />
        <h1 className="text-lg font-bold flex-1" style={{ color: 'var(--color-text)' }}>
          Drill: {themeLabel}
        </h1>
        {phase === 'solving' && (
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {currentIndex + 1}/{total}
          </span>
        )}
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1">
          <p style={{ color: 'var(--color-text-muted)' }}>Loading puzzles...</p>
        </div>
      )}

      {/* Solving */}
      {phase === 'solving' && currentPuzzle && (
        <div className="flex-1">
          <PuzzleBoard
            key={currentPuzzle.id}
            puzzle={currentPuzzle}
            onComplete={handlePuzzleComplete}
          />

          {/* Navigation arrows */}
          <div className="flex items-center justify-center gap-6 py-3" data-testid="puzzle-nav">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg border transition-opacity disabled:opacity-30"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="nav-prev"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {currentIndex + 1} / {total}
            </span>
            <button
              onClick={goNext}
              className="p-2 rounded-lg border transition-opacity"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="nav-next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Session stats bar */}
          <div className="flex justify-center gap-6 text-sm py-2" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'var(--color-success)' }}>{solved} solved</span>
            <span style={{ color: 'var(--color-error)' }}>{failed} missed</span>
          </div>
        </div>
      )}

      {/* Summary */}
      {phase === 'summary' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center flex-1 gap-6"
          data-testid="session-summary"
        >
          <Swords size={40} style={{ color: 'var(--color-warning)' }} />
          <div className="text-center">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Drill Complete</h2>
            {total > 0 ? (
              <p className="text-lg mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {solved}/{total} tactics found ({Math.round((solved / total) * 100)}%)
              </p>
            ) : (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                No puzzles found for this theme. Try a different category.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void loadQueue()}
              className="px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="play-again"
            >
              Drill Again
            </button>
            <button
              onClick={() => void navigate('/tactics/profile')}
              className="px-6 py-3 rounded-xl font-semibold text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              View Profile
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
