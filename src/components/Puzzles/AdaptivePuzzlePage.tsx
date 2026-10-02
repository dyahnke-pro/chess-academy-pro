import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, BookOpen, AlertTriangle, Crown } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { seedPuzzles, seedMasterPuzzles, seedLongPuzzles, recordAttempt, getPuzzleStats } from '../../services/puzzleService';
import { LENGTH_RANGE, type PuzzleLength } from '../../services/puzzleDepth';
import type { PuzzleStats } from '../../services/puzzleService';
import { recordTagDrillResult } from '../../services/misconceptionService';
import { markRepCompletedToday } from '../../services/repCompletion';
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
import {
  resolveReachState,
  recordReachResult,
  nextTarget,
  reachTier,
  type ReachState,
  type ReachOutcome,
} from '../../services/reachRating';
import { reachCueFor, spikeIncomingCue, type ReachCue } from '../../services/reachCue';
import type { PuzzleRecord } from '../../types';
import type { PuzzleOutcome } from './PuzzleBoard';
import { voiceService } from '../../services/voiceService';
import { logAppAudit } from '../../services/appAuditor';
import { DifficultySelector } from './DifficultySelector';
import { PuzzleBoard } from './PuzzleBoard';
import { AdaptiveSessionPanel } from './AdaptiveSessionPanel';
import { AdaptiveSessionSummary } from './AdaptiveSessionSummary';
import { db } from '../../db/schema';
import { recordPositiveMoment } from '../../services/reviewPromptService';
import { DEFAULT_STUDENT_RATING } from '../../services/ratingBands';
import { finishBite } from '../../services/activeBite';

type Phase = 'select' | 'loading' | 'solving' | 'checkpoint' | 'rep-complete' | 'summary';

const CHECKPOINT_INTERVAL = 10;

/** WO-TACTICS-ADAPTIVE-01: Rating adjustments per outcome. */
const RATING_DELTA_CLEAN = 20;
const RATING_DELTA_ASSISTED = 5;
const RATING_DELTA_FAILED = -20;

/** "+12" / "-8" / "0". */
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** The summary measures the ONE puzzle rating (the reach ladder), not the
 *  session's internal selection rating. */
function withReach(summary: SummaryData, history: readonly number[]): SummaryData {
  if (history.length === 0) return summary;
  return { ...summary, startRating: history[0], endRating: history[history.length - 1], ratingHistory: [...history] };
}

export function AdaptivePuzzlePage({ master = false, length }: { master?: boolean; length?: PuzzleLength } = {}): JSX.Element {
  // A POOLED page (Master Level, the Long tab) skips the difficulty select,
  // lazily fetches its own CC0 pool and auto-starts.
  const pooled = master || length !== undefined;
  const [lengthMode, setLengthMode] = useState<PuzzleLength | undefined>(length);
  const lengthModeRef = useRef<PuzzleLength | undefined>(length);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as {
    forcedWeakThemes?: string[];
    misconceptionTag?: string;
    repKey?: string;
    repCap?: number;
    /** Start straight away at the student's level (an Up-next warm-up bite). */
    autoStart?: boolean;
  } | null;
  const forcedWeakThemes = navState?.forcedWeakThemes;
  // When the Training Plan deep-links a weakness rep here, the real
  // misconception tag rides along so completing the drill spaces it out
  // (closes the capture → drill → space loop). analysis:* clusters carry
  // no tag and don't space.
  const misconceptionTag = navState?.misconceptionTag;
  // Dashboard rep deep-link: cap the drill at repCap puzzles, then offer to
  // continue or return to the Dashboard with this rep checked off.
  const repKey = navState?.repKey;
  const repCap = navState?.repCap;
  const autoStartedRef = useRef(false);
  const spacedTagRef = useRef(false);
  const repCapReachedRef = useRef(false);

  // Mount audit — see PR #504 F1 fix lineage; tactics tab was
  // observability-blind to the audit stream before this.
  useEffect(() => {
    void logAppAudit({
      kind: 'tactics-surface-event',
      category: 'subsystem',
      source: 'AdaptivePuzzlePage.mount',
      summary: forcedWeakThemes && forcedWeakThemes.length > 0
        ? `adaptive opened with forced weak themes (${forcedWeakThemes.length})`
        : 'adaptive opened (manual entry)',
      details: forcedWeakThemes ? JSON.stringify({ forcedWeakThemes }) : undefined,
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const [phase, setPhase] = useState<Phase>('select');
  const [session, setSession] = useState<AdaptiveSessionState | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleRecord | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const [playerRating, setPlayerRating] = useState<number>(activeProfile?.puzzleRating ?? DEFAULT_STUDENT_RATING);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const userRating = activeProfile?.puzzleRating ?? DEFAULT_STUDENT_RATING;

  // ── Adaptive Reach Ladder (docs/plans/2026-09-14-adaptive-reach-ladder.md) ──
  // ONE persisted difficulty controller drives selection + the felt cues. The
  // reach rating (not the classic puzzleRating) is the number the ladder shows
  // and floats to ~80% success; puzzleRating keeps updating classically in the
  // background for calibration continuity (P5 folds them fully).
  const reachRef = useRef<ReachState | null>(null);
  const spikeServedRef = useRef(false);
  const cueRotateRef = useRef(0);
  // Master Level rides its OWN persisted ladder (masterReachState) in the elite
  // band, so a bad day at 2600 never craters the normal tactics number.
  const persistedReach = master
    ? activeProfile?.preferences?.masterReachState
    : activeProfile?.preferences?.reachState;
  const [reachRating, setReachRating] = useState<number>(
    persistedReach?.rating
      ?? (activeProfile?.puzzleRating ?? DEFAULT_STUDENT_RATING) + (master ? 0 : 200),
  );
  const [reachDelta, setReachDelta] = useState<number | null>(null);
  /** The ONE puzzle rating (the reach ladder) across this session — the panel,
   *  the checkpoint and the summary all measure it, so the tab shows one number
   *  that moves, not a second "session rating" scored from the difficulty's
   *  fixed start (hand walk 2026-10-01, RT1: five ratings on one tab). */
  const [reachHistory, setReachHistory] = useState<number[]>([]);
  const [cue, setCue] = useState<ReachCue | null>(null);
  const [masterReady, setMasterReady] = useState<boolean>(!pooled);
  // Master concept-review pause: hold on the solved board until the student taps
  // Continue, so the concept lesson lands (the classroom teaching beat).
  const [awaitingConcept, setAwaitingConcept] = useState(false);
  const pendingSessionRef = useRef<AdaptiveSessionState | null>(null);
  const reachHistoryRef = useRef<number[]>([]);
  reachHistoryRef.current = reachHistory;

  // Keep playerRating synced with profile
  useEffect(() => {
    setPlayerRating(activeProfile?.puzzleRating ?? DEFAULT_STUDENT_RATING);
  }, [activeProfile?.puzzleRating]);

  /** Persist the reach ladder to profile.preferences (non-indexed — no schema
   *  bump), mirroring the puzzleRating write pattern. Master mode writes its
   *  own key. */
  const persistReach = useCallback((next: ReachState): void => {
    reachRef.current = next;
    setReachRating(next.rating);
    setReachHistory((h) => [...h, next.rating]);
    if (activeProfile) {
      const preferences = {
        ...activeProfile.preferences,
        ...(master ? { masterReachState: next } : { reachState: next }),
      };
      setActiveProfile({ ...activeProfile, preferences });
      void db.profiles.update(activeProfile.id, { preferences });
    }
  }, [activeProfile, setActiveProfile, master]);

  /** Show a cue: visual toast always; voice honors verbosity via speakForced
   *  (Silent users see it, don't hear it). Auto-clears. */
  const showCue = useCallback((c: ReachCue | null): void => {
    if (!c) return;
    setCue(c);
    if (c.voice) void voiceService.speakForced(c.voice);
    window.setTimeout(() => setCue((cur) => (cur === c ? null : cur)), 4500);
  }, []);

  // Seed puzzles and load stats on mount
  useEffect(() => {
    void seedPuzzles()
      .then(() => getPuzzleStats())
      .then(setStats)
      .catch((err: unknown) => {
        console.warn('[AdaptivePuzzlePage] puzzle seeding/stats failed:', err);
      });
  }, []);

  // Master Level: lazily fetch the elite (2400+) CC0 pool the first time this
  // section is opened, then flag it ready so the auto-start below can fire.
  useEffect(() => {
    if (!pooled) return;
    void (master ? seedMasterPuzzles() : seedLongPuzzles())
      .catch((err: unknown) => {
        console.warn('[AdaptivePuzzlePage] puzzle pool seeding failed:', err);
      })
      .finally(() => setMasterReady(true));
  }, [master, pooled]);

  const fetchNextPuzzle = useCallback(async (sess: AdaptiveSessionState): Promise<void> => {
    // The reach controller decides the target difficulty + whether this is a
    // boss spike; selection favors multi-move sequences (David 2026-09-14).
    const reach = reachRef.current;
    const { target, isSpike } = reach
      ? nextTarget(reach, { master })
      : { target: sess.sessionRating, isSpike: false };
    spikeServedRef.current = isSpike;
    if (isSpike) showCue(spikeIncomingCue(cueRotateRef.current++));

    const puzzle = await getNextAdaptivePuzzle(sess, seenIdsRef.current, {
      targetOverride: target,
      preferMultiMove: true,
      depth: lengthModeRef.current ? LENGTH_RANGE[lengthModeRef.current] : undefined,
    });
    if (!puzzle) {
      // No more puzzles available — end session
      voiceService.stop();
      setSummary(withReach(getAdaptiveSessionSummary(sess), reachHistoryRef.current));
      setPhase('summary');
      return;
    }
    voiceService.stop();
    seenIdsRef.current.add(puzzle.id);
    setCurrentPuzzle(puzzle);
    setReachDelta(null);
    setPhase('solving');
  }, [showCue]);

  const handleSelectDifficulty = useCallback(async (difficulty: AdaptiveDifficulty): Promise<void> => {
    // Seed the session at the player's real puzzle rating (clamped into the
    // chosen difficulty's band) so a strong player picking Medium doesn't start
    // at the fixed 1500 (David 2026-07-03: all training aids adaptive).
    const newSession = createAdaptiveSession(difficulty, forcedWeakThemes, userRating);
    setSession(newSession);
    seenIdsRef.current = new Set();
    // Resume the persisted reach ladder, or seed it first-time from the
    // player's puzzleRating + STRETCH_SEED. Never re-inflate on resume.
    const reach = resolveReachState(
      master ? activeProfile?.preferences?.masterReachState : activeProfile?.preferences?.reachState,
      userRating,
      { master },
    );
    reachRef.current = reach;
    setReachRating(reach.rating);
    setReachHistory([reach.rating]);
    setReachDelta(null);
    setPhase('loading');
    await fetchNextPuzzle(newSession);
  }, [fetchNextPuzzle, forcedWeakThemes, activeProfile, userRating, master]);

  // Auto-start with medium difficulty when forcedWeakThemes are provided (from Lichess Dashboard)
  useEffect(() => {
    if (!autoStartedRef.current && ((forcedWeakThemes && forcedWeakThemes.length > 0) || navState?.autoStart)) {
      autoStartedRef.current = true;
      void handleSelectDifficulty('medium');
    }
  }, [forcedWeakThemes, handleSelectDifficulty]);

  // Master Level auto-starts (no difficulty select) once the elite pool is
  // ready — the master reach ladder seeds/floors it in the 2400+ band.
  useEffect(() => {
    if (pooled && masterReady && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void handleSelectDifficulty('hard');
    }
  }, [pooled, masterReady, handleSelectDifficulty]);

  // On session end, space out the misconception tag that sent us here:
  // a solid session (≥60% accuracy) advances its SRS interval so it
  // resurfaces less often; a weak session keeps it due. Fires once.
  useEffect(() => {
    if (phase !== 'summary' || !misconceptionTag || spacedTagRef.current || !summary) return;
    spacedTagRef.current = true;
    void recordTagDrillResult(misconceptionTag, summary.accuracy >= 0.6);
  }, [phase, summary, misconceptionTag]);

  const handlePuzzleComplete = useCallback(async (outcome: PuzzleOutcome): Promise<void> => {
    if (!session || !currentPuzzle) return;

    // Determine WO-specified rating delta
    let delta: number;
    let askedForReview = false;
    if (outcome.correct && !outcome.usedHint && !outcome.hadRetry && !outcome.showedSolution) {
      // Clean solve: no hints, 1st try
      delta = RATING_DELTA_CLEAN;
      // A clean solve is a genuine "win" — feed the review-prompt gate. When
      // THIS solve opens the prompt, the board holds below so the ask lands
      // on the solved position, never over the next puzzle (David 2026-10-02).
      askedForReview = await recordPositiveMoment('puzzle-clean-solve').catch(() => false);
    } else if (outcome.correct) {
      // Correct but used hint or had retry
      delta = RATING_DELTA_ASSISTED;
    } else {
      // Failed (2 wrong attempts or showed solution)
      delta = RATING_DELTA_FAILED;
    }

    // Update adaptive session state (theme tracking, streak, weakness boost,
    // summary). Its band-clamped sessionRating is then OVERWRITTEN by the reach
    // ladder below so selection + the panel float freely (no band cage).
    const updatedSession = processAdaptiveResult(
      session,
      currentPuzzle.rating,
      outcome.correct,
      currentPuzzle.themes,
    );

    // ── The reach ladder: float to ~80% success, fire the felt cues ──
    const reach = reachRef.current;
    if (reach) {
      const reachOutcome: ReachOutcome = !outcome.correct
        ? 'missed'
        : outcome.usedHint || outcome.hadRetry || outcome.showedSolution ? 'assisted' : 'clean';
      const r = recordReachResult(reach, reachOutcome, {
        wasSpike: spikeServedRef.current,
        master,
      });
      persistReach(r.state);
      setReachDelta(r.delta);
      updatedSession.sessionRating = r.state.rating; // panel + selection = reach
      for (const ev of r.events) showCue(reachCueFor(ev, cueRotateRef.current++));
    }
    setSession(updatedSession);

    // Keep the classic persistent puzzleRating updating in the background for
    // calibration continuity (P5 folds the two systems fully).
    const newRating = Math.max(100, playerRating + delta);
    setPlayerRating(newRating);

    // Record attempt in DB (auto-grade: correct='good', incorrect='again')
    await recordAttempt(
      currentPuzzle.id,
      outcome.correct,
      userRating,
      outcome.correct ? 'good' : 'again',
    );

    // Update profile rating with the WO delta
    if (activeProfile) {
      const updatedProfile = { ...activeProfile, puzzleRating: newRating };
      setActiveProfile(updatedProfile);
      void db.profiles.update(activeProfile.id, { puzzleRating: newRating });
    }

    // Capped rep drill (from a Dashboard rep): once the cap is hit, mark the
    // rep done for today, space its misconception tag, and offer to continue
    // or return to the Dashboard. Fires once — extra puzzles fall back to the
    // normal open-session checkpoint cadence.
    if (
      repKey &&
      repCap &&
      repCap > 0 &&
      !repCapReachedRef.current &&
      updatedSession.totalPuzzles >= repCap
    ) {
      repCapReachedRef.current = true;
      void markRepCompletedToday(repKey);
      void finishBite(['weakness', 'warm-up', 'long']);
      if (misconceptionTag && !spacedTagRef.current) {
        spacedTagRef.current = true;
        const accuracy = updatedSession.totalPuzzles > 0
          ? updatedSession.puzzlesSolved / updatedSession.totalPuzzles
          : 0;
        void recordTagDrillResult(misconceptionTag, accuracy >= 0.6);
      }
      // The solve's line finishes before the screen changes (2026-10-02).
      await voiceService.untilQuiet();
      voiceService.stop();
      setPhase('rep-complete');
      return;
    }

    // Master Level: pause on the solved board so the CONCEPT lesson (rendered +
    // spoken in PuzzleBoard) is actually read/heard before advancing — the
    // "classroom" teaching beat (David 2026-09-14). Keeps PuzzleBoard mounted;
    // Continue runs the normal checkpoint-or-fetch below. Other surfaces keep
    // their existing cadence (the voice still carries the concept there).
    // …and EVERY surface holds after a MISS (2026-10-01): the result is
    // already recorded above, only the advance waits. Jumping straight on made
    // "Teach me this position" unreachable on exactly the puzzles where it
    // teaches most. A clean solve keeps the fast cadence — except the once a
    // solve opens the review prompt, which gets the same hold.
    if (master || !outcome.correct || askedForReview) {
      pendingSessionRef.current = updatedSession;
      setAwaitingConcept(true);
      return;
    }

    // NO AUTO-ADVANCE CUTS THE VOICE (David 2026-10-02): the solve's concept
    // line is spoken to its last word, then a breath, before the board moves on.
    await voiceService.untilQuiet();

    // Check if checkpoint
    if (updatedSession.totalPuzzles > 0 && updatedSession.totalPuzzles % CHECKPOINT_INTERVAL === 0) {
      setPhase('checkpoint');
      return;
    }

    // Fetch next puzzle
    await fetchNextPuzzle(updatedSession);
  }, [session, currentPuzzle, playerRating, userRating, activeProfile, setActiveProfile, fetchNextPuzzle, repKey, repCap, misconceptionTag, master]);

  /** Master concept-review Continue → run the deferred checkpoint-or-fetch. */
  const handleContinueAfterConcept = useCallback(async (): Promise<void> => {
    const updatedSession = pendingSessionRef.current;
    pendingSessionRef.current = null;
    setAwaitingConcept(false);
    if (!updatedSession) return;
    if (updatedSession.totalPuzzles > 0 && updatedSession.totalPuzzles % CHECKPOINT_INTERVAL === 0) {
      setPhase('checkpoint');
      return;
    }
    await fetchNextPuzzle(updatedSession);
  }, [fetchNextPuzzle]);

  const handleContinueAfterRepCap = useCallback(async (): Promise<void> => {
    if (!session) return;
    await fetchNextPuzzle(session);
  }, [session, fetchNextPuzzle]);

  const handleContinueAfterCheckpoint = useCallback(async (): Promise<void> => {
    if (!session) return;
    await fetchNextPuzzle(session);
  }, [session, fetchNextPuzzle]);

  const handleEndSession = useCallback((): void => {
    if (!session) return;
    setSummary(withReach(getAdaptiveSessionSummary(session), reachHistoryRef.current));
    setPhase('summary');
    void getPuzzleStats().then(setStats);
  }, [session]);

  const handleBackToSelect = useCallback((): void => {
    setPhase('select');
    setSession(null);
    setCurrentPuzzle(null);
    setSummary(null);
    setReachDelta(null);
    setCue(null);
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
    <div className="flex flex-col flex-1 p-4 md:p-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 overflow-y-auto" data-testid="adaptive-puzzle-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={pooled || phase === 'select' ? () => navigate('/tactics') : handleBackToSelect}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label={pooled || phase === 'select' ? 'Back to Tactics' : 'Back to difficulty select'}
          data-testid="back-button"
        >
          <ArrowLeft size={18} className="text-theme-text" />
        </button>
        <div className="flex items-center gap-2">
          <Brain size={24} className="text-theme-accent" />
          <h1 className="text-xl font-bold text-theme-text">{master ? 'Master Level' : length ? 'Long Puzzles' : 'Puzzles'}</h1>
        </div>
        <div className="flex-1" />
        {/* Reach-ladder badge: Level + reach rating with animated delta */}
        <div className="flex items-center gap-2" data-testid="player-rating-header">
          <span className={`text-sm font-semibold text-theme-text ${reachDelta !== null ? 'rating-bump' : ''}`} data-testid="player-rating-value">
            Level {reachTier(reachRating)} · {reachRating}
          </span>
          {reachDelta !== null && reachDelta !== 0 && (
            <span
              className={`text-xs font-bold ${reachDelta > 0 ? 'text-green-400' : 'text-red-400'}`}
              data-testid="rating-delta"
            >
              {reachDelta > 0 ? '+' : ''}{reachDelta}
            </span>
          )}
        </div>
      </div>

      {/* Reach cue toast — the felt step-up / boss / settle callout. Visual
          always; voice honored the verbosity setting when it fired. */}
      {cue && (
        <div
          className={`mb-3 rounded-lg px-4 py-2 text-sm font-semibold text-center animate-pulse ${
            cue.tone === 'down'
              ? 'bg-theme-surface text-theme-text-muted'
              : cue.tone === 'spike'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
              : 'bg-green-500/15 text-green-300 border border-green-500/40'
          }`}
          data-testid="reach-cue"
        >
          {cue.visual}
        </div>
      )}

      {/* Long tab: the two lengths, switchable mid-session (the next puzzle
          takes the new length; the one on the board stays). */}
      {length && (
        <div className="mb-3 flex justify-center gap-2" role="radiogroup" aria-label="Puzzle length" data-testid="length-toggle">
          {(['long', 'veryLong'] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={lengthMode === m}
              onClick={() => { lengthModeRef.current = m; setLengthMode(m); }}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${
                lengthMode === m
                  ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200 shadow-[0_0_14px_rgba(0,229,255,0.5)]'
                  : 'border-theme-border text-theme-text-muted hover:text-theme-text'
              }`}
              data-testid={`length-${m}`}
            >
              {m === 'long' ? 'Long · 3–4 moves' : 'Very Long · 5+ moves'}
            </button>
          ))}
        </div>
      )}

      {/* Long tab warm-up: fetching the long pool + auto-starting. */}
      {length && phase === 'select' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3" data-testid="long-loading">
          <p className="text-theme-text">Loading long puzzles…</p>
        </div>
      )}

      {/* Master Level warm-up: fetching the elite pool + auto-starting. */}
      {master && phase === 'select' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3" data-testid="master-loading">
          <p className="text-theme-text">Loading Master Level…</p>
          <p className="text-sm text-theme-text-muted">2400+ puzzles, multi-move favored</p>
        </div>
      )}

      {/* Difficulty Select (normal tactics only) */}
      {!pooled && phase === 'select' && (
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
              to="/tactics/classic"
              className="flex items-center gap-2 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
              data-testid="classic-trainer-link"
            >
              <BookOpen size={14} />
              Classic Trainer
            </Link>
            <Link
              to="/tactics/mistakes"
              className="flex items-center gap-2 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
              data-testid="my-mistakes-link"
            >
              <AlertTriangle size={14} />
              My Mistakes
            </Link>
          </div>
          {/* Master Level — opt-in elite (2400+) ladder, multi-move favored. */}
          <Link
            to="/tactics/master"
            className="flex items-center justify-center gap-2 mx-auto max-w-xs px-4 py-3 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold hover:bg-amber-500/20 transition-colors"
            data-testid="master-level-link"
          >
            <Crown size={18} />
            Master Level
          </Link>
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
              onComplete={(outcome) => void handlePuzzleComplete(outcome)}
              disabled={awaitingConcept}
              streak={session.streak}
            />
          </div>
          <div className="space-y-4">
            <AdaptiveSessionPanel session={session} ratingHistory={reachHistory} />
            {awaitingConcept ? (
              <button
                onClick={() => void handleContinueAfterConcept()}
                className="w-full px-4 py-3 rounded-2xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
                data-testid="concept-continue"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleEndSession}
                className="text-sm text-theme-text-muted hover:text-theme-text transition-colors"
                data-testid="end-session"
              >
                End Session
              </button>
            )}
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
              Puzzle rating:{' '}
              <span className="font-bold text-theme-text">{reachRating}</span>
              {reachHistory.length > 1 && (
                <span className="text-theme-text-muted">{' '}({signed(reachRating - reachHistory[0])} this session)</span>
              )}
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

      {/* Rep cap reached — capped Dashboard-rep drill */}
      {phase === 'rep-complete' && session && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6" data-testid="rep-complete">
          <div className="text-center">
            <h2 className="text-xl font-bold text-theme-text">
              {session.totalPuzzles} puzzles done!
            </h2>
            <p className="text-sm text-theme-text-muted mt-1">
              {session.puzzlesSolved} solved, {session.puzzlesFailed} missed
            </p>
            <p className="text-sm text-theme-text-muted mt-2">
              That&apos;s today&apos;s set. Keep going, or head back to the dashboard?
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void navigate('/')}
              className="px-4 py-2 rounded-lg border border-theme-border text-theme-text hover:bg-theme-surface transition-colors"
              data-testid="rep-complete-dashboard"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => void handleContinueAfterRepCap()}
              className="px-4 py-2 rounded-lg bg-theme-accent text-white font-medium hover:opacity-90 transition-opacity"
              data-testid="rep-complete-continue"
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
          onBackToSelect={pooled ? () => navigate('/tactics') : handleBackToSelect}
          onPlayAgain={() => void handlePlayAgain()}
        />
      )}
    </div>
  );
}
