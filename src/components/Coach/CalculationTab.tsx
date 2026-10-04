/**
 * CalculationTab — six calculation skill drills layered over the
 * Lichess puzzle DB.
 *
 * Three views:
 *   1. Skill picker — grid of 6 tiles (one per skill)
 *   2. Skill rationale screen — shows the "why this matters"
 *      narration before the drill starts
 *   3. Drill view — adaptive puzzle stream (no per-session cap;
 *      the user plays until they exit). Interactive board, the
 *      student drags pieces to attempt the first move of each
 *      puzzle's solution; right move → green + advance, wrong →
 *      red flash + retry. Difficulty steps via
 *      useAdaptiveEndgameSession.
 *
 * Architectural contract: positions and moves come from the curated
 * Lichess puzzle DB (15K on disk) BLENDED with the student's own
 * game-derived puzzles (mined mistakes) — but a game puzzle only feeds
 * a skill when its solution line PROVABLY matches that skill's pattern
 * (see gameCalculationPuzzleService + calculationSkillMatch; the match
 * is computed with chess.js, never assumed from a stored tag). The UI
 * verifies user input via chess.js. No runtime LLM authorship.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronRight,
  Lightbulb,
  RotateCw,
  X,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { TacticsPageHeader } from '../Tactics/TacticsPageHeader';
import { useEndgamePlayout } from '../../hooks/useEndgamePlayout';
import { useClickToMove } from '../../hooks/useClickToMove';
import {
  getCalculationSkills,
  getCalculationSkillById,
  getDrillPuzzleCount,
  skillAcceptsPuzzle,
  type CalculationSkill,
  isLegalMove,
  recordCalculationFirstAnswer,
} from '../../services/calculationDrillService';
import { countGameCalculationPuzzlesBySkill } from '../../services/gameCalculationPuzzleService';
import type { EndgameLessonPosition } from '../../types/endgameLesson';
import { useAdaptiveEndgameSession } from '../../hooks/useAdaptiveEndgameSession';
import { useGameCalculationPuzzles } from '../../hooks/useGameCalculationPuzzles';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { WrongTryNote } from '../Puzzles/WrongTryNote';
import { hintSquareStyles } from '../../utils/hintSquareStyles';
import { useSolvedDrillConcept } from '../../hooks/useWrongTryRefutation';
import type { PieceDropHandlerArgs } from 'react-chessboard';

const EMPTY_LINE: readonly string[] = [];

interface CalculationTabProps {
  onExit: () => void;
}

type ViewMode = 'picker' | 'rationale' | 'drill' | 'summary';

export function CalculationTab({ onExit }: CalculationTabProps): JSX.Element {
  const [view, setView] = useState<ViewMode>('picker');
  const [skillId, setSkillId] = useState<string | null>(null);

  const startSkill = useCallback((id: string) => {
    setSkillId(id);
    setView('rationale');
  }, []);

  const startDrill = useCallback(() => {
    if (!skillId) return;
    setView('drill');
  }, [skillId]);

  const exitToPicker = useCallback(() => {
    setView('picker');
    setSkillId(null);
  }, []);

  if (view === 'picker') {
    return <SkillPicker onPick={startSkill} onBack={onExit} />;
  }

  const skill = skillId ? getCalculationSkillById(skillId) : null;
  if (!skill) {
    return <SkillPicker onPick={startSkill} onBack={onExit} />;
  }

  if (view === 'rationale') {
    return (
      <RationaleScreen
        skill={skill}
        onStart={startDrill}
        onBack={exitToPicker}
      />
    );
  }

  if (view === 'drill') {
    return <AdaptiveDrillScreen skill={skill} onExit={exitToPicker} />;
  }

  return <SkillPicker onPick={startSkill} onBack={onExit} />;
}

// ─── Picker ───────────────────────────────────────────────────────

interface SkillPickerProps {
  onPick: (skillId: string) => void;
  onBack: () => void;
}

function SkillPicker({ onPick, onBack }: SkillPickerProps): JSX.Element {
  const skills = useMemo(() => getCalculationSkills(), []);
  const [gameCounts, setGameCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    countGameCalculationPuzzlesBySkill(skills.map((s) => s.id))
      .then((counts) => {
        if (!cancelled) setGameCounts(counts);
      })
      .catch(() => {
        /* no game puzzles — picker just shows static counts */
      });
    return () => {
      cancelled = true;
    };
  }, [skills]);
  return (
    <div className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      {/* The picker had no way back to Tactics — its onBack was wired and
          never rendered (hand walk 2026-10-04, C8). */}
      <TacticsPageHeader
        title="Calculation"
        icon={<Calculator size={22} className="text-blue-400" />}
        onBack={onBack}
        backTestId="calculation-back"
      />
      <p className="text-xs text-theme-text-muted -mt-2">
        Six drills built on Lichess puzzle theme tags. Pick a skill to train.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {skills.map((skill, idx) => {
          const count = getDrillPuzzleCount(skill.id);
          const gameCount = gameCounts[skill.id] ?? 0;
          return (
            <button
              key={skill.id}
              onClick={() => onPick(skill.id)}
              className="rounded-xl border-2 p-3 text-left transition-colors bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/15"
              data-testid={`calculation-skill-${skill.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-theme-text leading-tight">
                      {skill.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-theme-text-muted leading-snug line-clamp-2">
                    {skill.description}
                  </p>
                  <div className="text-[10px] text-cyan-400 mt-1.5">
                    {count.toLocaleString()} puzzles available
                    {gameCount > 0 && (
                      <span
                        className="ml-1.5 text-emerald-400 font-semibold"
                        data-testid={`calc-game-count-${skill.id}`}
                      >
                        · +{gameCount} from your games
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-cyan-400 flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rationale screen ────────────────────────────────────────────

interface RationaleScreenProps {
  skill: CalculationSkill;
  onStart: () => void;
  onBack: () => void;
}

function RationaleScreen({ skill, onStart, onBack }: RationaleScreenProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      <TacticsPageHeader title={skill.name} onBack={onBack} backLabel="Back to skills" />
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Why this matters
          </span>
        </div>
        <p className="text-[13px] text-theme-text leading-relaxed">{skill.rationale}</p>
      </div>
      <button
        onClick={onStart}
        className="w-full px-4 py-3 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold"
        data-testid="calculation-start-drill"
      >
        Start drill
      </button>
    </div>
  );
}

// ─── Drill screen — adaptive stream ──────────────────────────────

interface AdaptiveDrillScreenProps {
  skill: CalculationSkill;
  onExit: () => void;
}

function AdaptiveDrillScreen({ skill, onExit }: AdaptiveDrillScreenProps): JSX.Element {
  // Blend the student's OWN game-derived puzzles (only those whose
  // solution line matches THIS skill's pattern) into the stream.
  const { puzzles: gamePuzzles } = useGameCalculationPuzzles(skill.id);
  // Adaptive endgame session scoped to this skill's puzzle themes.
  // currentDrill auto-advances when recordOutcome is called.
  const adaptive = useAdaptiveEndgameSession(null, {
    themes: skill.themes,
    extraPuzzles: gamePuzzles,
    // Roughly every other puzzle prefers one of the student's own
    // games when the matched pool has an unplayed one.
    preferExtraEvery: 2,
    // The skill's own gate (Find the Mate admits only lines that END in
    // checkmate on the board) — the same one the picker counts with.
    accept: (p) => skillAcceptsPuzzle(skill, p),
  });

  if (!adaptive.currentDrill) {
    // Pool exhausted (or still loading the first puzzle on initial mount).
    return (
      <DrillSummary
        skill={skill}
        sessionRating={adaptive.sessionRating}
        userRating={adaptive.userRating}
        solved={adaptive.solved}
        failed={adaptive.failed}
        bestStreak={adaptive.bestStreak}
        onExit={onExit}
        onReshuffle={() => adaptive.reset()}
      />
    );
  }

  return (
    <AdaptivePuzzleRunner
      key={`${skill.id}-${adaptive.currentDrillRating}-${adaptive.solved + adaptive.failed}`}
      skill={skill}
      drill={adaptive.currentDrill}
      drillRating={adaptive.currentDrillRating ?? 0}
      drillThemes={adaptive.currentDrillThemes}
      sessionRating={adaptive.sessionRating}
      userRating={adaptive.userRating}
      solved={adaptive.solved}
      failed={adaptive.failed}
      lastAdjustment={adaptive.lastAdjustment}
      onRecordOutcome={adaptive.recordOutcome}
      onExit={onExit}
    />
  );
}

interface AdaptivePuzzleRunnerProps {
  skill: CalculationSkill;
  drill: EndgameLessonPosition;
  drillRating: number;
  drillThemes: readonly string[];
  sessionRating: number;
  userRating: number;
  solved: number;
  failed: number;
  lastAdjustment: 'up' | 'down' | null;
  onRecordOutcome: (firstTryPerfect: boolean) => void;
  onExit: () => void;
}

function AdaptivePuzzleRunner({
  skill,
  drill,
  drillRating,
  drillThemes,
  sessionRating,
  userRating,
  solved,
  failed,
  lastAdjustment,
  onRecordOutcome,
  onExit,
}: AdaptivePuzzleRunnerProps): JSX.Element {
  const studentSide: 'white' | 'black' =
    drill.fen.split(' ')[1] === 'w' ? 'white' : 'black';
  // Game-derived puzzles are tagged with this title by
  // adaptivePuzzleToLessonPosition; surface the origin so the student
  // knows they're calculating their own missed shot.
  const fromGame = drill.title === 'From your game';

  // Drive the puzzle through the playout runner with max-strength
  // Stockfish extending to obvious win after the curated line.
  const playout = useEndgamePlayout({
    startFen: drill.fen,
    solution: drill.solution ?? [],
    extendToObviousWin: true,
    fallbackPliesToPlay: 8,
    fallbackDifficulty: 'hard',
    replyDelayMs: 450,
  });
  // THE RECORD (capability parity with the puzzle board): the student's FIRST
  // answer to the position this drill posed — held when the drill accepts it,
  // broken when it does not. Later tries were coached and record nothing. The
  // runner remounts per puzzle (see its `key`), so this resets per puzzle.
  const answeredRef = useRef(false);
  const recordFirstAnswer = useCallback(
    (from: string, to: string, accepted: boolean, prompted: boolean): void => {
      if (answeredRef.current) return;
      // An illegal drop answers nothing; the first LEGAL try is the answer.
      if (!isLegalMove(drill.fen, from, to)) return;
      answeredRef.current = true;
      void recordCalculationFirstAnswer({ fen: drill.fen, from, to, accepted, themes: drillThemes, prompted });
    },
    [drill.fen, drillThemes],
  );
  const onPieceDrop = playout.onPieceDrop;
  const playMove = playout.playMove;
  const hintRevealed = playout.hintRevealed;
  const atStart = playout.fen === drill.fen && playout.phase === 'student-to-move';
  const trackedPlayMove = useCallback(
    (from: string, to: string): boolean => {
      const accepted = playMove(from, to);
      if (atStart) recordFirstAnswer(from, to, accepted, hintRevealed);
      return accepted;
    },
    [playMove, atStart, recordFirstAnswer, hintRevealed],
  );
  const trackedPieceDrop = useCallback(
    (args: PieceDropHandlerArgs): boolean => {
      const accepted = onPieceDrop(args);
      if (atStart && args.targetSquare) recordFirstAnswer(args.sourceSquare, args.targetSquare, accepted, hintRevealed);
      return accepted;
    },
    [onPieceDrop, atStart, recordFirstAnswer, hintRevealed],
  );
  // Skip / Reveal before any answer: the board still posed the question, and
  // the drill answered it FOR them — a prompted row, which counts as neither.
  const revealAnswer = playout.reveal;
  const hintMove = playout.hintMove;
  const trackedReveal = useCallback((): void => {
    if (hintMove) recordFirstAnswer(hintMove.from, hintMove.to, true, true);
    revealAnswer();
  }, [hintMove, recordFirstAnswer, revealAnswer]);
  const trackedPlayout = useMemo(
    () => ({ ...playout, playMove: trackedPlayMove, onPieceDrop: trackedPieceDrop }),
    [playout, trackedPlayMove, trackedPieceDrop],
  );
  const clickToMove = useClickToMove(trackedPlayout);
  // SOLVED → TEACH THE CONCEPT (tactics map 2026-10-01: Calculation ended on
  // "Solved — played to the win." and nothing else). The same computed
  // explanation the puzzle board gives, for a student-to-move drill.
  const solvedConcept = useSolvedDrillConcept(playout.isComplete, drill.fen, drill.solution ?? EMPTY_LINE);

  const [recorded, setRecorded] = useState(false);

  // Speak the concept hint aloud the first time it appears (after a
  // wrong first attempt), when the user hasn't turned it off. The
  // AdaptivePuzzleRunner is remounted per puzzle (see the `key` in
  // AdaptiveDrillScreen), so this ref resets naturally each puzzle.
  const hintSpokenRef = useRef(false);
  const showHint =
    !playout.isComplete && playout.wrongAttempts > 0 && Boolean(drill.conceptHint);
  // ONE spoken line per wrong try: the refutation first (why THEIR move
  // fails), then the concept hint the first time it appears. Speaking them
  // separately cut the hint mid-sentence when the refutation landed (speak()
  // stops what is playing). When no refutation comes back the hint still
  // speaks on its own once the engine has had its chance.
  const wrongTryText = playout.wrongTryText;
  useEffect(() => {
    if (playout.isComplete) return;
    const speakHints =
      useAppStore.getState().activeProfile?.preferences.calcHintVoice ?? true;
    const hint = showHint && speakHints && !hintSpokenRef.current ? drill.conceptHint : null;
    if (wrongTryText) {
      if (hint) hintSpokenRef.current = true;
      void voiceService.speak(hint ? `${wrongTryText} ${hint}` : wrongTryText);
      return;
    }
    if (!hint) return;
    const id = setTimeout(() => {
      if (hintSpokenRef.current) return;
      hintSpokenRef.current = true;
      void voiceService.speakLecture(hint);
    }, 3500);
    return () => clearTimeout(id);
  }, [showHint, wrongTryText, playout.isComplete, drill.conceptHint]);
  // Stop any in-flight hint speech when leaving the puzzle/drill.
  useEffect(() => () => voiceService.stop(), []);

  const wrongFlash = useMemo<Record<string, CSSProperties>>(() => {
    if (!playout.wrongSquare) return {};
    return { [playout.wrongSquare]: { background: 'rgba(239, 68, 68, 0.45)' } };
  }, [playout.wrongSquare]);
  const hintStyles = useMemo<Record<string, CSSProperties>>(
    () => hintSquareStyles(playout.hintMove, playout.hintRevealed),
    [playout.hintRevealed, playout.hintMove],
  );
  const mergedSquareStyles = useMemo<Record<string, CSSProperties>>(
    () => ({ ...clickToMove.squareStyles, ...hintStyles, ...wrongFlash }),
    [clickToMove.squareStyles, hintStyles, wrongFlash],
  );

  const answered = solved + failed;

  const advance = useCallback(() => {
    if (!playout.isComplete) return;
    if (recorded) return;
    setRecorded(true);
    onRecordOutcome(playout.firstTryPerfect);
  }, [playout.isComplete, playout.firstTryPerfect, recorded, onRecordOutcome]);

  const header = (
    <div className="px-3 py-2 md:p-4 border-b border-theme-border">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onExit}
          className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
          aria-label="Exit drill"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h2 className="text-sm font-semibold text-theme-text truncate">{skill.name}</h2>
          <p className="text-xs text-theme-text-muted truncate">
            Puzzle #{answered + 1} · {drillRating}
            {lastAdjustment === 'up' ? ' ↑' : lastAdjustment === 'down' ? ' ↓' : ''} · target {sessionRating} · you {userRating} · {solved}/{answered}
          </p>
        </div>
        <div className="w-[44px]" />
      </div>
    </div>
  );

  const board = (
    <ConsistentChessboard
      fen={playout.fen}
      boardOrientation={studentSide}
      interactive={playout.phase === 'student-to-move'}
      onPieceDrop={trackedPieceDrop}
      onSquareClick={clickToMove.onSquareClick}
      squareStyles={mergedSquareStyles}
    />
  );

  const controls = (
    <div className="flex flex-col gap-3 px-2 pb-4">
      <div className="rounded-xl border border-theme-border bg-theme-surface p-3 flex flex-col gap-2">
        {fromGame && (
          <div
            className="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-2 py-0.5"
            data-testid="calc-from-your-game"
            title={drill.source}
          >
            From your game
          </div>
        )}
        <p className="text-sm text-theme-text">
          {studentSide === 'white' ? 'White' : 'Black'} to play.{' '}
          {playout.isComplete
            ? playout.firstTryPerfect
              ? 'Solved — played to the win.'
              : 'Played through to the win.'
            : 'Play the best move — keep going until the win.'}
        </p>
        {solvedConcept && (
          <p className="text-[12px] text-theme-text leading-relaxed" data-testid="calc-solved-concept">
            {solvedConcept}
          </p>
        )}
        {!playout.isComplete && playout.wrongAttempts > 0 && drill.conceptHint && (
          <div
            className="text-[12px] text-amber-300 leading-relaxed border-l-2 border-amber-500/40 pl-2"
            data-testid="calc-concept-hint"
          >
            <span className="font-semibold">Concept:</span> {drill.conceptHint}
          </div>
        )}
        {playout.isComplete && playout.firstTryPerfect && (
          <div className="flex items-center gap-1.5 text-[12px] text-green-400 font-semibold">
            <Check size={14} />
            Correct — first try
          </div>
        )}
        {playout.isComplete && !playout.firstTryPerfect && (
          <div className="flex items-center gap-1.5 text-[12px] text-amber-400 font-semibold">
            <X size={14} />
            Solved with hint or retry
          </div>
        )}
        {!playout.isComplete && <WrongTryNote text={playout.wrongTryText} speak={false} />}
        {!playout.isComplete && (
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-cyan-400">
              {playout.wrongAttempts > 0
                ? 'Try again — drag or tap a piece.'
                : 'Drag or tap a piece to play your move.'}
            </p>
            {playout.hintMove && !playout.hintRevealed && (
              <button
                onClick={playout.revealHint}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                data-testid="calc-hint"
              >
                <Lightbulb size={11} />
                Hint
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={trackedReveal}
          disabled={playout.isComplete}
          className="px-3 py-2 rounded-lg bg-theme-surface text-sm text-theme-text-muted hover:text-theme-text disabled:opacity-30"
          data-testid="calculation-skip"
        >
          Skip / Reveal
        </button>
        <span className="text-xs text-theme-text-muted font-mono">
          {answered}/∞
        </span>
        <button
          onClick={advance}
          disabled={!playout.isComplete}
          className="px-4 py-2 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid="calculation-next"
        >
          Next
        </button>
      </div>
    </div>
  );

  return <ChessLessonLayout header={header} board={board} controls={controls} />;
}

// ─── Summary ─────────────────────────────────────────────────────

interface DrillSummaryProps {
  skill: CalculationSkill;
  sessionRating: number;
  userRating: number;
  solved: number;
  failed: number;
  bestStreak: number;
  onReshuffle: () => void;
  onExit: () => void;
}

function DrillSummary({
  skill,
  sessionRating,
  userRating,
  solved,
  failed,
  bestStreak,
  onReshuffle,
  onExit,
}: DrillSummaryProps): JSX.Element {
  const total = solved + failed;
  const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
  const grade =
    percent === 100
      ? 'Perfect'
      : percent >= 80
        ? 'Sharp'
        : percent >= 60
          ? 'Solid'
          : percent >= 40
            ? 'Building up'
            : 'Drill again';

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full"
      style={{ color: 'var(--color-text)' }}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <h2 className="text-base font-semibold text-theme-text">{skill.name} — done</h2>
        <div className="w-[44px]" />
      </div>
      <div className="rounded-xl border-2 border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
        <div className="text-4xl font-bold text-cyan-400">
          {solved} / {total}
        </div>
        <div className="text-sm text-theme-text-muted mt-1">{percent}% solved on first try</div>
        <div className="text-xs font-semibold text-theme-text mt-2">{grade}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-theme-text-muted">
          <div>
            <div className="text-cyan-400 font-mono text-base">{userRating}</div>
            <div>Endgame rating</div>
          </div>
          <div>
            <div className="text-cyan-400 font-mono text-base">{sessionRating}</div>
            <div>Session target</div>
          </div>
          <div>
            <div className="text-cyan-400 font-mono text-base">{bestStreak}</div>
            <div>Best streak</div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onReshuffle}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold"
          data-testid="calculation-reshuffle"
        >
          <RotateCw size={14} />
          New drill
        </button>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-lg bg-theme-surface text-sm font-medium text-theme-text hover:bg-theme-bg"
        >
          Done
        </button>
      </div>
    </div>
  );
}
