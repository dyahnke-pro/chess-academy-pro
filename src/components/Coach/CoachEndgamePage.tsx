/**
 * CoachEndgamePage — endgame teaching surface.
 *
 * Two views in one page:
 *   1. Pattern picker grid — 37 mating patterns categorized by Named
 *      Patterns vs Piece-Mate fundamentals. Each tile shows pattern
 *      name + count of multi-move practice puzzles available in our
 *      local DB.
 *   2. Lesson runtime — when a pattern is selected, runs through 8
 *      practice puzzles (multi-move mates from the Lichess puzzle DB
 *      filtered by the pattern's theme tag, sorted by rating ascending
 *      so the lesson opens easy and ramps up). The intro narration
 *      from `mating-patterns.json` plays at lesson start; each puzzle
 *      becomes a find-the-mate fork with chess.js-derived distractors.
 *
 * David's principle: "the DB is the brain." The pychess Lichess
 * Practice studies provide the canonical recognition position. The
 * Lichess puzzle DB provides the practice corpus. The narration is
 * hand-crafted prose. The LLM is voice (Polly TTS) only — zero
 * authorship at runtime.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, ChevronRight, RotateCw, Lightbulb, MessageCircle } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { useTeachWalkthrough } from '../../hooks/useTeachWalkthrough';
import {
  getAllPatterns,
  getPatternById,
  getPracticePuzzleCount,
  buildMatingPatternLesson,
  type EndgameTier,
} from '../../services/endgameService';
import { useAppStore } from '../../stores/appStore';
import { logAppAudit } from '../../services/appAuditor';
import type { MatingPattern } from '../../types/matingPattern';

const TIER_OPTIONS: { value: EndgameTier; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'mixed', label: 'Mixed' },
];

export function CoachEndgamePage(): JSX.Element {
  const navigate = useNavigate();
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [tier, setTier] = useState<EndgameTier>('beginner');
  // Session seed — bump on each lesson load so the within-tier
  // shuffle surfaces fresh puzzles even at the same difficulty.
  const [sessionSeed, setSessionSeed] = useState<number>(() => Date.now());

  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
  const [lessonMeta, setLessonMeta] = useState<{
    rating: number;
    movesToMate: number;
    totalAvailable: number;
    currentIndex: number;
  } | null>(null);
  const walkthrough = useTeachWalkthrough();

  const startLesson = useCallback(
    (patternId: string, t: EndgameTier, seed: number, index: number): void => {
      const pattern = getPatternById(patternId);
      if (!pattern) return;
      const built = buildMatingPatternLesson(pattern, {
        tier: t,
        seed,
        puzzleIndex: index,
      });
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'CoachEndgamePage.startLesson',
        summary: built
          ? `endgame lesson started: ${pattern.name} #${built.puzzleIndex + 1}/${built.totalAvailable} (mate in ${built.movesToMate}, rating ${built.rating}, tier=${t})`
          : `endgame lesson recognition-only: ${pattern.name} (no practice puzzles for tier=${t})`,
      });
      setSelectedPatternId(patternId);
      if (built) {
        setLessonMeta({
          rating: built.rating,
          movesToMate: built.movesToMate,
          totalAvailable: built.totalAvailable,
          currentIndex: built.puzzleIndex,
        });
        walkthrough.start(built.tree);
      } else {
        setLessonMeta(null);
      }
    },
    [walkthrough],
  );

  const exitLesson = useCallback((): void => {
    walkthrough.stop();
    setSelectedPatternId(null);
    setPuzzleIndex(0);
    setLessonMeta(null);
  }, [walkthrough]);

  const practiceMore = useCallback((): void => {
    if (!selectedPatternId) return;
    const nextIndex = puzzleIndex + 1;
    setPuzzleIndex(nextIndex);
    startLesson(selectedPatternId, tier, sessionSeed, nextIndex);
  }, [selectedPatternId, tier, sessionSeed, puzzleIndex, startLesson]);

  const reshufflePractice = useCallback((): void => {
    if (!selectedPatternId) return;
    const newSeed = Date.now();
    setSessionSeed(newSeed);
    setPuzzleIndex(0);
    startLesson(selectedPatternId, tier, newSeed, 0);
  }, [selectedPatternId, tier, startLesson]);

  const onTierChange = useCallback(
    (next: EndgameTier): void => {
      setTier(next);
      if (selectedPatternId) {
        const newSeed = Date.now();
        setSessionSeed(newSeed);
        setPuzzleIndex(0);
        startLesson(selectedPatternId, next, newSeed, 0);
      }
    },
    [selectedPatternId, startLesson],
  );

  // Picker view.
  if (selectedPatternId === null) {
    return <PatternPicker
      onPick={(id) => {
        setPuzzleIndex(0);
        startLesson(id, tier, sessionSeed, 0);
      }}
      onBack={() => void navigate('/coach/home')}
      tier={tier}
      onTierChange={onTierChange}
    />;
  }

  // Lesson view.
  const pattern = getPatternById(selectedPatternId);
  if (!pattern) {
    setSelectedPatternId(null);
    return <div />;
  }

  return (
    <LessonView
      pattern={pattern}
      walkthrough={walkthrough}
      tier={tier}
      lessonMeta={lessonMeta}
      onTierChange={onTierChange}
      onExit={exitLesson}
      onPracticeMore={practiceMore}
      onReshuffle={reshufflePractice}
    />
  );
}

// ─── Picker ─────────────────────────────────────────────────────────

interface PickerProps {
  onPick: (patternId: string) => void;
  onBack: () => void;
  tier: EndgameTier;
  onTierChange: (next: EndgameTier) => void;
}

function PatternPicker({ onPick, onBack, tier, onTierChange }: PickerProps): JSX.Element {
  const patterns = useMemo(() => getAllPatterns(), []);
  const named = patterns.filter((p) => p.category === 'named-pattern');
  const piece = patterns.filter((p) => p.category === 'piece-mate');

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="coach-endgame-page"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back to coach hub"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <h1 className="text-xl font-bold text-center flex-1">Endgame with Coach</h1>
        <div className="w-[44px]" />
      </div>

      <p className="text-sm text-center text-theme-text-muted max-w-lg mx-auto">
        Pick a checkmate pattern. Listen to the geometry, then practice setting it up across multiple positions.
      </p>

      {/* Tier selector */}
      <div className="flex justify-center gap-1 max-w-lg mx-auto w-full">
        {TIER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTierChange(opt.value)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tier === opt.value
                ? 'bg-theme-accent text-theme-bg'
                : 'bg-theme-surface text-theme-text-muted hover:bg-theme-bg'
            }`}
            data-testid={`endgame-tier-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <PatternSection title="Named Patterns" patterns={named} onPick={onPick} />
      <PatternSection title="Piece Mates" patterns={piece} onPick={onPick} subtitle="Recognition only — practice corpus coming soon" />
    </div>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  patterns: MatingPattern[];
  onPick: (patternId: string) => void;
}

function PatternSection({ title, subtitle, patterns, onPick }: SectionProps): JSX.Element {
  return (
    <div className="max-w-lg mx-auto w-full flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-theme-text-muted">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-theme-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {patterns.map((p) => {
          const count = getPracticePuzzleCount(p);
          const hasPractice = count > 0;
          return (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className={`relative rounded-xl border-2 p-3 text-left transition-colors ${
                hasPractice
                  ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/15'
                  : 'bg-theme-surface border-theme-border hover:bg-theme-bg opacity-75'
              }`}
              data-testid={`endgame-pattern-${p.id}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-sm font-semibold text-theme-text leading-tight">
                  {p.name}
                </span>
                <Crown size={14} className={hasPractice ? 'text-cyan-400' : 'text-theme-text-muted'} />
              </div>
              <div className="text-[10px] text-theme-text-muted mt-1.5">
                {hasPractice
                  ? `${count} practice ${count === 1 ? 'puzzle' : 'puzzles'}`
                  : 'Recognition only'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lesson view ────────────────────────────────────────────────────

interface LessonViewProps {
  pattern: MatingPattern;
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
  tier: EndgameTier;
  lessonMeta: {
    rating: number;
    movesToMate: number;
    totalAvailable: number;
    currentIndex: number;
  } | null;
  onTierChange: (next: EndgameTier) => void;
  onExit: () => void;
  onPracticeMore: () => void;
  onReshuffle: () => void;
}

function LessonView({
  pattern,
  walkthrough,
  tier,
  lessonMeta,
  onTierChange,
  onExit,
  onPracticeMore,
  onReshuffle,
}: LessonViewProps): JSX.Element {
  const { phase, fen, forkOptions, isLeaf, leafOutro } = walkthrough;
  const hasPractice = getPracticePuzzleCount(pattern) > 0;
  const studentSide = walkthrough.tree?.studentSide ?? 'white';

  const header = (
    <div className="px-3 py-2 md:p-4 border-b border-theme-border">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onExit}
          className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
          aria-label="Exit lesson"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-theme-text truncate">
            {pattern.name}
          </h2>
          <p className="text-xs text-theme-text-muted truncate">
            {hasPractice && lessonMeta
              ? `Mate in ${lessonMeta.movesToMate} · rating ${lessonMeta.rating} · #${lessonMeta.currentIndex + 1} of ${lessonMeta.totalAvailable}`
              : hasPractice
                ? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier`
                : 'Recognition only'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onReshuffle}
            disabled={!hasPractice}
            className="p-2 rounded-lg hover:bg-theme-surface min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-30"
            aria-label="Reshuffle practice puzzles"
            title="Reshuffle"
          >
            <RotateCw size={16} className="text-theme-text-muted" />
          </button>
          <button
            onClick={() => useAppStore.getState().setCoachDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-theme-surface min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Open chat"
          >
            <MessageCircle size={16} className="text-theme-accent" />
          </button>
        </div>
      </div>
      {hasPractice && (
        <div className="flex justify-center gap-1 mt-2">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onTierChange(opt.value)}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                tier === opt.value
                  ? 'bg-theme-accent text-theme-bg'
                  : 'bg-theme-surface text-theme-text-muted hover:bg-theme-bg'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // No-practice fallback: show recognition position from the JSON
  // with the narration prose. No interactive lesson.
  if (!hasPractice) {
    const recognition = pattern.lessonPositions.find((p) => p.movesToMate === 1) ?? pattern.lessonPositions[0];
    return (
      <ChessLessonLayout
        header={header}
        board={
          <ConsistentChessboard
            fen={recognition.fen}
            boardOrientation={studentSide}
          />
        }
        controls={
          <div className="flex flex-col gap-3 px-2">
            <div className="text-sm leading-relaxed text-theme-text">
              <span className="font-semibold">{pattern.name}.</span> {pattern.narration.intro}
            </div>
            <div className="text-xs leading-relaxed text-theme-text-muted">
              <span className="font-medium text-theme-text">Recognition: </span>
              {pattern.narration.recognition}
            </div>
            {pattern.narration.history && (
              <div className="text-xs leading-relaxed text-theme-text-muted">
                <span className="font-medium text-theme-text">History: </span>
                {pattern.narration.history}
              </div>
            )}
            {pattern.narration.tip && (
              <div className="text-xs leading-relaxed text-theme-text-muted flex gap-1.5">
                <Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{pattern.narration.tip}</span>
              </div>
            )}
            <div className="text-[11px] text-amber-400/80 mt-2">
              No practice puzzles available for this pattern yet — Lichess doesn&apos;t tag this one in their puzzle DB. The position above shows the canonical setup.
            </div>
            <button
              onClick={onExit}
              className="mt-2 px-4 py-2 rounded-lg bg-theme-surface text-sm font-medium text-theme-text hover:bg-theme-bg"
            >
              Back to patterns
            </button>
          </div>
        }
      />
    );
  }

  // Live lesson: render walkthrough state.
  const board = (
    <ConsistentChessboard
      fen={fen}
      boardOrientation={studentSide}
    />
  );

  let controls: React.ReactNode;
  if (phase === 'fork') {
    controls = (
      <div className="flex flex-col gap-2 px-2">
        <div className="text-xs font-medium text-theme-text-muted px-1">
          Find the move.
        </div>
        {forkOptions.map((opt, idx) => (
          <button
            key={`${opt.label ?? idx}-${idx}`}
            onClick={() => walkthrough.pickFork(idx)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors border-2 border-cyan-500/30"
            data-testid={`endgame-fork-option-${idx}`}
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-theme-text">
                {opt.label ?? `Option ${idx + 1}`}
              </span>
              {opt.forkSubtitle && (
                <span className="text-xs text-theme-text-muted">{opt.forkSubtitle}</span>
              )}
            </div>
            <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
          </button>
        ))}
      </div>
    );
  } else if (isLeaf) {
    controls = (
      <div className="flex flex-col gap-3 px-2">
        {leafOutro && (
          <div className="text-sm leading-relaxed text-theme-text">{leafOutro}</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onPracticeMore}
            className="flex-1 px-4 py-2 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold"
            data-testid="endgame-practice-more"
          >
            Practice more
          </button>
          <button
            onClick={onReshuffle}
            className="px-3 py-2 rounded-lg bg-theme-surface text-sm font-medium text-theme-text hover:bg-theme-bg"
            data-testid="endgame-reshuffle"
            aria-label="Reshuffle from start"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={onExit}
            className="flex-1 px-4 py-2 rounded-lg bg-theme-surface text-sm font-medium text-theme-text hover:bg-theme-bg"
          >
            Back to patterns
          </button>
        </div>
      </div>
    );
  } else {
    // Narration / animation in progress — minimal controls.
    controls = (
      <div className="flex justify-center px-2">
        <button
          onClick={() => walkthrough.skipNarration()}
          className="px-4 py-2 rounded-lg bg-theme-surface text-sm text-theme-text-muted hover:bg-theme-bg"
        >
          Skip
        </button>
      </div>
    );
  }

  return <ChessLessonLayout header={header} board={board} controls={controls} />;
}
