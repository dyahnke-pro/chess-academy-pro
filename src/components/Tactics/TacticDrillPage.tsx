import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Swords, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  getPuzzleForThemeAtRating,
  getPuzzleForOpeningAtRating,
  calculateRatingDelta,
  applyTimeBonus,
  THEME_MAP,
} from '../../services/puzzleService';
import { getPuzzleIdsByOpening } from '../../services/puzzlesByOpening';
import { useAppStore } from '../../stores/appStore';
import { PuzzleBoard } from '../Puzzles/PuzzleBoard';
import type { PuzzleOutcome } from '../Puzzles/PuzzleBoard';
import type { PuzzleRecord } from '../../types';
import { db } from '../../db/schema';
import { logAppAudit } from '../../services/appAuditor';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText, tacticNoteForPuzzleThemes } from '../../services/danyaTeachingService';

type Phase = 'loading' | 'solving' | 'summary';

const DRILL_SIZE = 10;

/** Aggressive adaptive ramping — find the player's ceiling in 10 puzzles. */
const CLEAN_FAST_BONUS = 100;   // Clean solve < 20s
const CLEAN_SOLVE_BONUS = 75;   // Clean solve (any time)
const ASSISTED_SOLVE_BONUS = 30; // Solved with hint or retry
const FAIL_PENALTY = -50;        // Failed puzzle

interface DrillResult {
  puzzleRating: number;
  correct: boolean;
  solveTimeMs: number;
}

export function TacticDrillPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setGlobalBoardContext = useAppStore((s) => s.setGlobalBoardContext);

  // Opening-filtered drill (WO-ROLODEX-UI-01 PR-3) — entered via the
  // rolodex Puzzles row at /coach/plan. When `?opening=` is set, the
  // drill skips theme-based fetching and pulls puzzles tagged with the
  // favorited opening (with family-fallback ladder via
  // getPuzzleIdsByOpening). The chip in the header reflects the
  // resolution: exact ("Italian Game") or family-fallback
  // ("Italian Game family"). When the param is absent the drill
  // behaves exactly as before (theme-based).
  const openingFilter = (searchParams.get('opening') ?? '').trim() || null;
  const openingResolution = useMemo(
    () => (openingFilter ? getPuzzleIdsByOpening(openingFilter) : null),
    [openingFilter],
  );

  const filterThemes = (location.state as { filterThemes?: string[] } | null)?.filterThemes;
  const filterTypes = (location.state as { filterTypes?: string[] } | null)?.filterTypes;
  const themes = filterThemes ?? filterTypes ?? ['fork'];

  // Resolve theme labels to Lichess tags
  const lichessThemes = themes.flatMap((t) => {
    const mapped = THEME_MAP[t];
    return mapped ?? [t];
  });

  const [phase, setPhase] = useState<Phase>('loading');
  const [puzzleHistory, setPuzzleHistory] = useState<PuzzleRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [failed, setFailed] = useState(0);
  const [sessionRating, setSessionRating] = useState(
    activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? 1200,
  );
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const completedRef = useRef<Set<number>>(new Set());
  const resultsRef = useRef<DrillResult[]>([]);

  // POST-SOLVE NOTE — after a puzzle is graded, one corpus teaching note about
  // THIS position, WRITTEN only (narration rule #8: drill positions stay
  // silent — the board is the lesson; text under it doesn't break the
  // silence). Selection is the same deterministic ladder every other surface
  // uses (position → structure), framed honestly by origin. Keyed by index so
  // navigating between puzzles shows each one's own note.
  const [postSolveNotes, setPostSolveNotes] = useState<Record<number, string>>({});
  /** Notes already shown this session — the same pattern note twice in a row
   *  teaches nothing and reads like the app is stuck. */
  const noteIdsSeenRef = useRef(new Set<string>());
  // AUTO-ADVANCE — a solved puzzle flows to the next after a beat instead of
  // demanding a tap per puzzle. Fails stay put (the student should sit with
  // the solution), and any manual nav cancels the pending advance.
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAutoAdvance = useCallback((): void => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, []);
  useEffect(() => cancelAutoAdvance, [cancelAutoAdvance]);

  const currentPuzzle = puzzleHistory[currentIndex] ?? null;
  const themeLabel = themes.length === 1
    ? themes[0].replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
    : 'Mixed';

  // Clear board context on unmount
  useEffect(() => {
    return () => { setGlobalBoardContext(null); };
  }, [setGlobalBoardContext]);

  /** Fetch the next puzzle at the current adaptive rating. Routes
   *  through the opening-filtered fetch when `?opening=` is set, the
   *  theme-based fetch otherwise. */
  const fetchNextPuzzle = useCallback(async (targetRating: number): Promise<PuzzleRecord | null> => {
    if (openingFilter) {
      return getPuzzleForOpeningAtRating(openingFilter, targetRating, seenIdsRef.current);
    }
    return getPuzzleForThemeAtRating(lichessThemes, targetRating, seenIdsRef.current);
  }, [lichessThemes, openingFilter]);

  /** Start or restart a drill session. */
  const startSession = useCallback(async (): Promise<void> => {
    setPhase('loading');
    const startRating = activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? 1200;
    setSessionRating(startRating);
    seenIdsRef.current = new Set();
    completedRef.current = new Set();
    resultsRef.current = [];
    setSolved(0);
    setFailed(0);
    setRatingDelta(null);
    void logAppAudit({
      kind: 'tactics-surface-event',
      category: 'subsystem',
      source: 'TacticDrillPage.session-start',
      summary: openingFilter
        ? `drill started at rating ${startRating} opening="${openingFilter}" source=${openingResolution?.source ?? '?'}`
        : `drill started at rating ${startRating} themes=[${lichessThemes.slice(0, 4).join(',')}]`,
      details: JSON.stringify({
        startRating,
        themes: lichessThemes,
        openingFilter,
        openingResolution,
      }),
    });

    const puzzle = openingFilter
      ? await getPuzzleForOpeningAtRating(openingFilter, startRating, seenIdsRef.current)
      : await getPuzzleForThemeAtRating(lichessThemes, startRating, seenIdsRef.current);
    if (!puzzle) {
      setPhase('summary');
      return;
    }
    seenIdsRef.current.add(puzzle.id);
    setPuzzleHistory([puzzle]);
    setCurrentIndex(0);
    setPhase('solving');
  }, [lichessThemes, activeProfile, openingFilter, openingResolution]);

  useEffect(() => {
    void startSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Handle puzzle completion — update adaptive rating and fetch next. */
  const handlePuzzleComplete = useCallback((outcome: PuzzleOutcome): void => {
    if (completedRef.current.has(currentIndex)) return;
    completedRef.current.add(currentIndex);

    const puzzle = puzzleHistory[currentIndex];
    if (!puzzle) return;

    void logAppAudit({
      kind: 'tactics-surface-event',
      category: 'subsystem',
      source: 'TacticDrillPage.puzzle-graded',
      summary: `puzzle ${currentIndex + 1}/${DRILL_SIZE} ${outcome.correct ? 'solved' : 'failed'} in ${outcome.solveTimeMs}ms`,
      details: JSON.stringify({
        puzzleId: puzzle.id,
        correct: outcome.correct,
        solveTimeMs: outcome.solveTimeMs,
        usedHint: outcome.usedHint,
        hadRetry: outcome.hadRetry,
      }),
    });

    // Determine adaptive rating bump
    const isClean = outcome.correct && !outcome.usedHint && !outcome.hadRetry && !outcome.showedSolution;
    const isFast = outcome.solveTimeMs < 20_000;
    let ratingBump: number;
    if (outcome.correct) {
      if (isClean && isFast) {
        ratingBump = CLEAN_FAST_BONUS;
      } else if (isClean) {
        ratingBump = CLEAN_SOLVE_BONUS;
      } else {
        ratingBump = ASSISTED_SOLVE_BONUS;
      }
      setSolved((s) => s + 1);
    } else {
      ratingBump = FAIL_PENALTY;
      setFailed((f) => f + 1);
    }

    const newSessionRating = Math.max(400, sessionRating + ratingBump);
    setSessionRating(newSessionRating);

    // Apply Elo with time bonus to the player's persistent puzzle rating
    const eloDelta = calculateRatingDelta(
      activeProfile?.puzzleRating ?? 1200,
      puzzle.rating,
      outcome.correct,
    );
    const adjustedDelta = outcome.correct
      ? applyTimeBonus(eloDelta, outcome.solveTimeMs)
      : eloDelta;
    setRatingDelta(adjustedDelta);

    if (activeProfile) {
      const newPuzzleRating = Math.max(100, (activeProfile.puzzleRating ?? 1200) + adjustedDelta);
      const updated = { ...activeProfile, puzzleRating: newPuzzleRating };
      setActiveProfile(updated);
      void db.profiles.update(activeProfile.id, { puzzleRating: newPuzzleRating });
    }

    resultsRef.current.push({
      puzzleRating: puzzle.rating,
      correct: outcome.correct,
      solveTimeMs: outcome.solveTimeMs,
    });

    // Pre-fetch next puzzle if we haven't reached the drill size
    if (resultsRef.current.length < DRILL_SIZE) {
      void fetchNextPuzzle(newSessionRating).then((next) => {
        if (next) {
          seenIdsRef.current.add(next.id);
          setPuzzleHistory((prev) => [...prev, next]);
        }
      });
    }

    // The post-solve note — one grounded teaching line about the position just
    // played, when the corpus genuinely has one (most puzzles get none; empty
    // beats generic). Scoped to the opening filter when the drill has one,
    // otherwise unscoped — a bare puzzle has no lesson to stay inside.
    try {
      // POSITION first — exact and rare. A puzzle that happens to sit on a
      // taught line gets the note written about that very board.
      const source = teachingSourceForBoard([], puzzle.fen, openingFilter);
      const exact = source ? spokenBeatText(source.note).trim() : '';
      let note = source && exact ? generalizedTeaching(source.origin, exact) : '';

      // THEME second, and this is what actually fires. The lookup above asks
      // the corpus of taught OPENING LINES whether it knows this puzzle's
      // position; it essentially never does, so the drill has been silent.
      // The puzzle already declares its pattern, and the corpus has thousands
      // of notes about those patterns — measured, 83.5% of the shipped puzzle
      // set now gets one. The note is geometry-free by construction, because
      // it is about a pattern and not about this board.
      if (!note) {
        const themed = tacticNoteForPuzzleThemes({
          themes: puzzle.themes ?? [],
          seenIds: noteIdsSeenRef.current,
        });
        if (themed) note = themed.text;
      }
      if (note) setPostSolveNotes((prev) => ({ ...prev, [currentIndex]: note }));
    } catch { /* the note is a bonus, never a blocker */ }

    // Auto-advance on a SOLVE. 3s is enough to see the final position and the
    // rating tick; a fail never auto-advances. `goNextRef` — goNext is
    // declared below and this callback must not capture a stale one.
    if (outcome.correct) {
      cancelAutoAdvance();
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null;
        goNextRef.current?.();
      }, 3000);
    }
  }, [currentIndex, puzzleHistory, sessionRating, activeProfile, setActiveProfile, fetchNextPuzzle, openingFilter, cancelAutoAdvance]);

  const goNext = useCallback((): void => {
    cancelAutoAdvance(); // manual or timed — either way the pending one is spent
    const nextIndex = currentIndex + 1;
    if (nextIndex >= DRILL_SIZE || nextIndex >= puzzleHistory.length) {
      // Check if we need to wait for the next puzzle to load
      if (nextIndex < DRILL_SIZE && nextIndex >= puzzleHistory.length) {
        // Puzzle still loading — fetch and navigate when ready
        setPhase('loading');
        void fetchNextPuzzle(sessionRating).then((puzzle) => {
          if (puzzle) {
            seenIdsRef.current.add(puzzle.id);
            setPuzzleHistory((prev) => [...prev, puzzle]);
            setCurrentIndex(nextIndex);
            setPhase('solving');
          } else {
            setPhase('summary');
          }
        });
        return;
      }
      if (nextIndex >= DRILL_SIZE) {
        setPhase('summary');
        return;
      }
    }
    setCurrentIndex(nextIndex);
  }, [currentIndex, puzzleHistory.length, sessionRating, fetchNextPuzzle, cancelAutoAdvance]);

  // handlePuzzleComplete fires before goNext is declared; the ref bridges the
  // ordering without reshuffling the callbacks.
  const goNextRef = useRef<(() => void) | null>(null);
  goNextRef.current = goNext;

  const goPrev = useCallback((): void => {
    cancelAutoAdvance(); // stepping back means the student wants to look, not flow
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, cancelAutoAdvance]);

  const totalCompleted = solved + failed;

  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
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
          {openingFilter
            ? `Drill: ${openingResolution?.source === 'family' && openingResolution.family ? openingResolution.family : openingFilter}`
            : `Drill: ${themeLabel}`}
        </h1>
        {openingFilter && (
          <button
            type="button"
            onClick={() => void navigate('/tactics/drill')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-theme-accent/15 text-theme-accent hover:opacity-80 transition-opacity"
            data-testid="drill-opening-filter-chip"
            aria-label={`Clear ${openingFilter} filter`}
          >
            <span>
              {openingResolution?.source === 'family' && openingResolution.family
                ? `${openingResolution.family} family`
                : openingFilter}
            </span>
            <X size={12} aria-hidden />
          </button>
        )}
        {phase === 'solving' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Target: {sessionRating}
            </span>
            {ratingDelta !== null && (
              <span className={`text-xs font-bold ${ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1">
          <p style={{ color: 'var(--color-text-muted)' }}>Loading puzzle...</p>
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
              {currentIndex + 1} / {DRILL_SIZE}
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
            <span>Puzzle: {currentPuzzle.rating}</span>
          </div>

          {/* Post-solve teaching note — written only; drill positions stay
              silent (narration rule #8). Renders only once THIS puzzle is
              graded, so it can never leak a hint mid-solve. */}
          {completedRef.current.has(currentIndex) && postSolveNotes[currentIndex] && (
            <div
              className="mx-4 mt-1 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              data-testid="post-solve-note"
            >
              {postSolveNotes[currentIndex]}
            </div>
          )}
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
            {totalCompleted > 0 ? (
              <>
                <p className="text-lg mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  {solved}/{totalCompleted} tactics found ({Math.round((solved / totalCompleted) * 100)}%)
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Peak difficulty: {Math.max(...resultsRef.current.map((r) => r.puzzleRating))}
                </p>
              </>
            ) : (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                No puzzles found for this theme. Try a different category.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void startSession()}
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
