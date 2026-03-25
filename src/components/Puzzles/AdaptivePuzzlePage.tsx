import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Brain, BookOpen, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { seedPuzzles, recordAttempt, getPuzzleStats } from '../../services/puzzleService';
import type { PuzzleStats } from '../../services/puzzleService';
import {
  createAdaptiveSession,
  processAdaptiveResult,
  getNextAdaptivePuzzle,
  getAdaptiveSessionSummary,
} from '../../services/adaptivePuzzleService';
import type {
  AdaptiveDifficulty,
  AdaptiveSessionState,
  AdaptiveSessionSummary as SummaryData,
} from '../../services/adaptivePuzzleService';
import type { PuzzleRecord } from '../../types';
import { DifficultySelector } from './DifficultySelector';
import { PuzzleBoard } from './PuzzleBoard';
import { AdaptiveSessionPanel } from './AdaptiveSessionPanel';
import { AdaptiveSessionSummary } from './AdaptiveSessionSummary';
import { db } from '../../db/schema';

type Phase = 'select' | 'loading' | 'solving' | 'checkpoint' | 'summary';

const CHECKPOINT_INTERVAL = 10;

export function AdaptivePuzzlePage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const location = useLocation();
  const forcedWeakThemes = (location.state as { forcedWeakThemes?: string[] } | null)?.forcedWeakThemes;
  const autoStartedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('select');
  const [session, setSession] = useState<AdaptiveSessionState | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleRecord | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const userRating = activeProfile?.puzzleRating ?? 1200;

  // Seed puzzles and load stats on mount
  useEffect(() => {
    void seedPuzzles().then(() => getPuzzleStats()).then(setStats);
  }, []);

  const fetchNextPuzzle = useCallback(async (sess: AdaptiveSessionState): Promise<void> => {
    const puzzle = await getNextAdaptivePuzzle(sess, seenIdsRef.current);
    if (!puzzle) {
      // No more puzzles available — end session
      setSummary(getAdaptiveSessionSummary(sess));
      setPhase('summary');
      return;
    }
    seenIdsRef.current.add(puzzle.id);
    setCurrentPuzzle(puzzle);
    setPhase('solving');
  }, []);

  const handleSelectDifficulty = useCallback(async (difficulty: AdaptiveDifficulty): Promise<void> => {
    const newSession = createAdaptiveSession(difficulty, forcedWeakThemes);
    setSession(newSession);
    seenIdsRef.current = new Set();
    setPhase('loading');
    await fetchNextPuzzle(newSession);
  }, [fetchNextPuzzle, forcedWeakThemes]);

  // Auto-start with medium difficulty when forcedWeakThemes are provided (from Lichess Dashboard)
  useEffect(() => {
    if (!autoStartedRef.current && forcedWeakThemes && forcedWeakThemes.length > 0) {
      autoStartedRef.current = true;
      void handleSelectDifficulty('medium');
    }
  }, [forcedWeakThemes, handleSelectDifficulty]);

  const handlePuzzleComplete = useCallback(async (correct: boolean): Promise<void> => {
    if (!session || !currentPuzzle) return;

    // Update adaptive session state
    const updatedSession = processAdaptiveResult(
      session,
      currentPuzzle.rating,
      correct,
      currentPuzzle.themes,
    );
    setSession(updatedSession);

    // Record attempt in DB (auto-grade: correct='good', incorrect='again')
    const result = await recordAttempt(
      currentPuzzle.id,
      correct,
      userRating,
      correct ? 'good' : 'again',
    );

    // Update profile rating
    if (result && activeProfile) {
      const updatedProfile = { ...activeProfile, puzzleRating: result.newUserRating };
      setActiveProfile(updatedProfile);
      void db.profiles.update(activeProfile.id, { puzzleRating: result.newUserRating });
    }

    // Check if checkpoint
    if (updatedSession.totalPuzzles > 0 && updatedSession.totalPuzzles % CHECKPOINT_INTERVAL === 0) {
      setPhase('checkpoint');
      return;
    }

    // Fetch next puzzle
    await fetchNextPuzzle(updatedSession);
  }, [session, currentPuzzle, userRating, activeProfile, setActiveProfile, fetchNextPuzzle]);

  const handleContinueAfterCheckpoint = useCallback(async (): Promise<void> => {
    if (!session) return;
    await fetchNextPuzzle(session);
  }, [session, fetchNextPuzzle]);

  const handleEndSession = useCallback((): void => {
    if (!session) return;
    setSummary(getAdaptiveSessionSummary(session));
    setPhase('summary');
    void getPuzzleStats().then(setStats);
  }, [session]);

  const handleBackToSelect = useCallback((): void => {
    setPhase('select');
    setSession(null);
    setCurrentPuzzle(null);
    setSummary(null);
    seenIdsRef.current = new Set();
    void getPuzzleStats().then(setStats);
  }, []);

  const handlePlayAgain = useCallback(async (): Promise<void> => {
    if (!session) {
      handleBackToSelect();
      return;
    }
    await handleSelectDifficulty(session.difficulty);
  }, [session, handleSelectDifficulty, handleBackToSelect]);

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto" data-testid="adaptive-puzzle-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {phase !== 'select' && (
          <button
            onClick={handleBackToSelect}
            className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
            aria-label="Back to difficulty select"
            data-testid="back-button"
          >
            <ArrowLeft size={18} className="text-theme-text" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Brain size={24} className="text-theme-accent" />
          <h1 className="text-xl font-bold text-theme-text">Puzzles</h1>
        </div>
        <div className="flex-1" />
        <span className="text-sm text-theme-text-muted">Rating: {userRating}</span>
      </div>

      {/* Difficulty Select */}
      {phase === 'select' && (
        <div className="space-y-6">
          {stats && (
            <div className="flex flex-wrap gap-4 text-sm text-theme-text-muted">
              <span>{stats.totalPuzzles} puzzles</span>
              <span>{stats.totalAttempted} attempted</span>
              {stats.totalAttempted > 0 && (
                <span>{Math.round(stats.overallAccuracy * 100)}% accuracy</span>
              )}
            </div>
          )}
          <DifficultySelector onSelect={(d) => void handleSelectDifficulty(d)} />
          <div className="flex justify-center gap-6">
            <Link
              to="/puzzles/classic"
              className="flex items-center gap-2 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
              data-testid="classic-trainer-link"
            >
              <BookOpen size={14} />
              Classic Trainer
            </Link>
            <Link
              to="/puzzles/mistakes"
              className="flex items-center gap-2 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
              data-testid="my-mistakes-link"
            >
              <AlertTriangle size={14} />
              My Mistakes
            </Link>
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1" data-testid="loading">
          <p className="text-theme-text-muted">Loading puzzle...</p>
        </div>
      )}

      {/* Solving */}
      {phase === 'solving' && session && currentPuzzle && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <PuzzleBoard
              puzzle={currentPuzzle}
              onComplete={(correct) => void handlePuzzleComplete(correct)}
            />
          </div>
          <div className="space-y-4">
            <AdaptiveSessionPanel session={session} />
            <button
              onClick={handleEndSession}
              className="text-sm text-theme-text-muted hover:text-theme-text transition-colors"
              data-testid="end-session"
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* Checkpoint */}
      {phase === 'checkpoint' && session && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6" data-testid="checkpoint">
          <div className="text-center">
            <h2 className="text-xl font-bold text-theme-text">
              {session.totalPuzzles} Puzzles Complete!
            </h2>
            <p className="text-sm text-theme-text-muted mt-1">
              {session.puzzlesSolved} solved, {session.puzzlesFailed} missed
            </p>
            <p className="text-sm mt-2">
              Session Rating:{' '}
              <span className="font-bold text-theme-text">{session.sessionRating}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleEndSession}
              className="px-4 py-2 rounded-lg border border-theme-border text-theme-text hover:bg-theme-surface transition-colors"
              data-testid="checkpoint-end"
            >
              End Session
            </button>
            <button
              onClick={() => void handleContinueAfterCheckpoint()}
              className="px-4 py-2 rounded-lg bg-theme-accent text-white font-medium hover:opacity-90 transition-opacity"
              data-testid="checkpoint-continue"
            >
              Keep Going
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {phase === 'summary' && summary && (
        <AdaptiveSessionSummary
          summary={summary}
          onBackToSelect={handleBackToSelect}
          onPlayAgain={() => void handlePlayAgain()}
        />
      )}
    </div>
  );
}
