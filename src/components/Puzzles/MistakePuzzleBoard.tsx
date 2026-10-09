import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLineWalk } from '../../hooks/useLineWalk';
import { WalkLineButton } from '../Board/WalkLineButton';
import { BoardQuestionBox } from '../Board/BoardQuestionBox';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { positionAsk, positionPosed } from '../../services/moveInsight';
import { spokenLineArrows } from '../../services/arrowEngine';
import type { BoardArrow } from '../Chessboard/ConsistentChessboard';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useSettings } from '../../hooks/useSettings';
import { readWrongTry, composeWrongTryLine } from '../../services/wrongTryRefutation';
import { usePositionNarration } from '../../hooks/usePositionNarration';
import { rerenderMistakeNarration } from '../../services/mistakePuzzleService';
import { puzzleMethodLine } from '../../services/puzzleMethod';
import { useStudentRecord } from '../../hooks/useStudentRecord';
import type { MethodHabit } from '../../services/methodBeat';
import { voiceService } from '../../services/voiceService';
import { explainPuzzleMoveGrounded } from '../../services/coachApi';
import { getCoachMove, resolveConfig } from '../../services/coachPlaySession';
import { opponentStrength, studentPlayingRating } from '../../services/engineStrength';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { getPieceNameOnSquare } from '../../utils/puzzleHints';
import { CheckCircle, XCircle, AlertTriangle, Volume2, Clock, User, BookOpen, Play, HelpCircle, Eye, EyeOff, Target, ChevronRight } from 'lucide-react';
import { ShowMeButton } from '../Coach/ShowMeButton';
import { useStruggleDetection } from '../../hooks/useStruggleDetection';
import { detectTacticType } from '../../services/missedTacticService';
import { usePuzzleMeter } from '../../hooks/usePuzzleMeter';
import { getCoachingMessage, recordTacticOutcome, tacticTypeLabel } from '../../services/tacticAlertService';
import { recordCapabilityEvidence } from '../../services/capabilityEvidence';
import { logAppAudit } from '../../services/appAuditor';
import type { CoachingTier } from '../../services/tacticAlertService';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MistakePuzzle, MistakeClassification, WalkableLine } from '../../types';
import { DEFAULT_STUDENT_RATING } from '../../services/ratingBands';
import { pliesFor, solveLengthOf } from '../../services/mistakeLineGrowth';
import { reward } from '../../services/rewardService';
import { rewardSeed } from '../../services/rewardEvents';
import { PuzzleHeader } from './PuzzleHeader';
import { useBoardFit } from '../../hooks/useBoardFit';

type PuzzleState = 'loading' | 'replay' | 'playing' | 'correct' | 'incorrect' | 'freeplay';

/** Number of half-moves (plies) before the mistake to replay */
const REPLAY_CONTEXT_PLIES = 8;
/** Delay between auto-played replay moves (ms) */
const REPLAY_MOVE_DELAY = 900;
/** The longest the play-out waits on the solve's voice before going anyway. */
const SOLVE_VOICE_MAX_WAIT_MS = 25_000;
/** A breath after the last word, so the board moving never reads as a cut. */
const AFTER_VOICE_BREATH_MS = 800;

interface ReplayStep {
  fen: string;
  san: string;
  from: string;
  to: string;
  moveLabel: string; // e.g. "1. e4" or "1... e5"
  isWhiteMove: boolean;
}

/** Extract the last N moves before the mistake from the game PGN */
function extractReplayMoves(pgn: string, _mistakeFen: string, playerColor: 'white' | 'black', moveNumber: number): ReplayStep[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const history = chess.history({ verbose: true });
  chess.reset();

  // Find the ply index of the mistake position
  // mistakeFen is the position BEFORE the wrong move, so it's the position after (moveNumber-1) full moves for white,
  // or after moveNumber moves for black
  const mistakePly = (moveNumber - 1) * 2 + (playerColor === 'black' ? 1 : 0);

  if (mistakePly <= 0 || mistakePly > history.length) return [];

  // Determine range to replay: last REPLAY_CONTEXT_PLIES plies before the mistake
  const startPly = Math.max(0, mistakePly - REPLAY_CONTEXT_PLIES);
  const endPly = mistakePly; // exclusive — stop right before the mistake

  // Advance chess to startPly position
  const replayChess = new Chess();
  for (let i = 0; i < startPly; i++) {
    replayChess.move(history[i].san);
  }

  const steps: ReplayStep[] = [];
  for (let i = startPly; i < endPly && i < history.length; i++) {
    const move = history[i];
    const fullMoveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const moveLabel = isWhite ? `${fullMoveNum}. ${move.san}` : `${fullMoveNum}... ${move.san}`;

    replayChess.move(move.san);
    steps.push({
      fen: replayChess.fen(),
      san: move.san,
      from: move.from,
      to: move.to,
      moveLabel,
      isWhiteMove: isWhite,
    });
  }

  return steps;
}

interface MistakePuzzleBoardProps {
  puzzle: MistakePuzzle;
  /** Fires ONCE per puzzle the moment it resolves — solved, or failed on bad
   *  data — so the host can record it. REQUIRED: the result used to ride the
   *  "Next puzzle" tap, so a student who solved and backed out recorded
   *  nothing, and one host (the tag drill) never recorded at all (hand walk
   *  2026-10-01). `correct` is false when any wrong move came first.
   *  solveTimeMs is the elapsed playing time. */
  onResolved: (correct: boolean, solveTimeMs: number) => void;
  /** The student is done with this puzzle — advance. Records nothing. */
  onComplete: () => void;
  /** Skip the internal game replay — use when the caller already showed context */
  skipReplayContext?: boolean;
  /** Puzzles solved in a row on the host surface, shown in the header. */
  streak?: number;
}

const CLASSIFICATION_BADGE: Record<MistakeClassification, { label: string; symbol: string; color: string }> = {
  miss: { label: 'Miss', symbol: '✕', color: 'text-purple-500 bg-purple-500/10' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'text-yellow-500 bg-yellow-500/10' },
  mistake: { label: 'Mistake', symbol: '?', color: 'text-orange-500 bg-orange-500/10' },
  blunder: { label: 'Blunder', symbol: '??', color: 'text-red-500 bg-red-500/10' },
};

const PHASE_LABELS: Record<string, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

function formatTimeAgo(dateStr: string): string {
  const gameDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - gameDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function parseUciMoves(uci: string): { from: string; to: string; promotion?: string }[] {
  if (!uci || uci.trim().length === 0) return [];
  return uci.trim().split(/\s+/).map((m) => ({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: m.length > 4 ? m.slice(4) : undefined,
  }));
}

export function MistakePuzzleBoard({ puzzle, onResolved, onComplete, skipReplayContext = false, streak }: MistakePuzzleBoardProps): JSX.Element {
  const meter = usePuzzleMeter();
  const consumedIdRef = useRef<string | null>(null);
  const [state, setState] = useState<PuzzleState>('loading');
  // Board + [show me] fit above the bottom nav on a short phone (David 2026-10-04).
  const { boardRef: fitRef, keepRef, boardStyle: fitStyle } = useBoardFit(state);
  const resolvedForRef = useRef<string | null>(null);
  const tryTokenRef = useRef(0);
  /** A wrong try's refutation is still being read. While it is, a coaching
   *  line the SAME miss triggered (the struggle coach's method beat) waits and
   *  is spoken with it as ONE line — spoken separately, the refutation landed
   *  ~80ms later and cut the method off mid-sentence (PostHog, David's phone,
   *  2026-10-02: "This was the moment to slow down — positions where one move"
   *  → "rook to e1? Then a-pawn takes b5…"). */
  const wrongTryPendingRef = useRef(false);
  const heldCoachRef = useRef<string | null>(null);
  const narrationRef = useRef(puzzle.narration);
  const saidHabitsRef = useRef(new Set<MethodHabit>());
  // The student's WHOLE record (holes + proven), so the method beat is decided
  // from their games and drills together, not from the puzzles alone.
  const recordRef = useStudentRecord();
  const resolve = useCallback((correct: boolean, solveTimeMs: number): void => {
    if (resolvedForRef.current === puzzle.id) return;
    resolvedForRef.current = puzzle.id;
    onResolved(correct, solveTimeMs);
  }, [puzzle.id, onResolved]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState(puzzle.fen);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: string; to: string } | null>(null);
  const [subtitle, setSubtitle] = useState<string>('');
  // boardKey increments to force ChessBoard remount only on resets
  const [boardKey, setBoardKey] = useState(0);
  const hasMadeMistakeRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  // TOLD BEFORE ANSWERING? Only that makes a row `prompted`. [show me] AFTER
  // a wrong first answer used to mark the row prompted too, which the profile
  // skips — so the failure the student had already made was erased from the
  // record (2026-10-01). The first answer is the evidence.
  const answeredRef = useRef(false);
  const toldBeforeAnswerRef = useRef(false);
  // SHOWN THE ANSWER? [show me] reveals the move itself, so a solve after it
  // is not a solve for spaced repetition or the solved count (David
  // 2026-10-04: "Show me" then solving counts as a miss). Teach-me withholds
  // the move, so it does not set this.
  const answerShownRef = useRef(false);
  const chessRef = useRef(new Chess(puzzle.fen));

  // Free-tier meter: count this puzzle against the 20-bucket once when it
  // reaches a terminal state (solved or revealed). Guarded by id so it fires
  // exactly once per puzzle. No-op for Pro / gate-off.
  useEffect(() => {
    if ((state === 'correct' || state === 'incorrect') && consumedIdRef.current !== puzzle.id) {
      consumedIdRef.current = puzzle.id;
      meter.consume();
    }
  }, [state, puzzle.id, meter]);
  // Only as many moves as the puzzle asks for TODAY — it grows by one per
  // clean solve (mistakeLineGrowth).
  const movesRef = useRef(parseUciMoves(pliesFor(puzzle.moves.trim().split(/\s+/).filter(Boolean), solveLengthOf(puzzle)).join(' ')));
  const playerMoveCountRef = useRef(0);
  const { playMoveSound } = usePieceSound();
  const { settings } = useSettings();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const puzzleShowTacticName = useAppStore((s) => s.puzzleShowTacticName);
  const togglePuzzleShowTacticName = useAppStore((s) => s.togglePuzzleShowTacticName);
  const puzzleTimerOn = useAppStore((s) => s.puzzleTimerOn);
  const puzzleClockTargetSec = useAppStore((s) => s.puzzleClockTargetSec);
  // Elapsed-time counter for this puzzle. Always runs (regardless of
  // puzzleTimerOn) — when the chip is hidden, we still need the value
  // to log into the mistakePuzzle record for /weaknesses aggregation.
  // David's design 2026-05-19: "count up if no setting is chosen but
  // run in background. this information will be sent to weaknesses."
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedStartRef = useRef<number | null>(null);
  useEffect(() => {
    // Reset when puzzle changes.
    setElapsedMs(0);
    elapsedStartRef.current = null;
  }, [puzzle.id]);
  useEffect(() => {
    if (state !== 'playing') {
      // Freeze on non-playing states (replay / correct / incorrect /
      // loading). Resume on next play.
      elapsedStartRef.current = null;
      return;
    }
    if (elapsedStartRef.current == null) {
      elapsedStartRef.current = performance.now() - elapsedMs;
    }
    const id = setInterval(() => {
      if (elapsedStartRef.current != null) {
        setElapsedMs(performance.now() - elapsedStartRef.current);
      }
    }, 250);
    return () => clearInterval(id);
    // elapsedMs intentionally omitted — would reset the interval on
    // every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  // Coach chat — visible after the puzzle is solved (state === 'correct').
  // Lets the student ask follow-up questions about the position without
  // leaving the puzzle. David's directive 2026-05-19: "maybe add a chat
  // bar to talk to coach! see, now we are creating!"

  // The tactic type for coaching — the RECORD's tag first (P4b: the persisted
  // tag IS the weakness bucket this puzzle lives in, so the coaching must name
  // the same motif); a row without one goes through the one classifier over its
  // stored solution line.
  const tacticType = useMemo(
    () => puzzle.tacticType ?? detectTacticType(puzzle.fen, puzzle.bestMove, puzzle.moves ? puzzle.moves.split(/\s+/).filter(Boolean) : undefined),
    [puzzle.tacticType, puzzle.fen, puzzle.bestMove, puzzle.moves],
  );

  // Proactive struggle detection — coach speaks up when player is stuck
  const handleStruggleCoach = useCallback((message: string, _tier: CoachingTier) => {
    if (wrongTryPendingRef.current) {
      heldCoachRef.current = message;
      return;
    }
    // Never over the top of a line already playing (the refutation of the
    // last try, the intro): wait for it to finish. A new try supersedes it.
    const token = tryTokenRef.current;
    void voiceService.speakWhenIdle(message, {
      stale: () => tryTokenRef.current !== token,
      onStart: () => setSubtitle(message),
    });
  }, []);

  const { reset: resetStruggle } = useStruggleDetection({
    tacticType,
    playerRating: activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING,
    active: state === 'playing',
    wrongAttempts: wrongAttemptCount,
    onCoach: handleStruggleCoach,
    earnedMethod: () => puzzleMethodLine(puzzle.bestMoveSan, puzzle.cpLoss, saidHabitsRef.current, recordRef.current),
  });

  // Replay state
  const [replaySteps, setReplaySteps] = useState<ReplayStep[]>([]);
  const [replayIndex, setReplayIndex] = useState(-1);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // THE CONTINUATION IS STILL TAUGHT (David 2026-10-01: "make sure we are
  // not slacking on the teaching aspect"). A growing puzzle asks for only
  // `solveLength` moves today, but the engine line runs on — so after the
  // solve the board plays the rest out: you see how it continues before the
  // puzzle grows to ask you for it.
  const [continuing, setContinuing] = useState(false);
  /** Arrows for the moves the current spoken line names (`spokenLineArrows`):
   *  their reply red, your mistake none, your good follow-up green. */
  const [lineArrows, setLineArrows] = useState<BoardArrow[]>([]);
  // The last wrong try's line, walkable (David 2026-10-05: "Button tap to
  // play out any lines the user wants").
  const [walkable, setWalkable] = useState<WalkableLine | null>(null);
  const lineWalk = useLineWalk(puzzle.playerColor);
  const clearWalk = lineWalk.clear;
  useEffect(() => { setLineArrows([]); setWalkable(null); clearWalk(); }, [puzzle.id, clearWalk]);
  const continuedForRef = useRef<string | null>(null);
  // THE SOLVE'S VOICE OWNS THE MOMENT (David 2026-10-02: "Auto advance needs to
  // not cut off narrations … Instant after last word can sound like cut off").
  // The play-out used to start 1.2s after the solve — before the TTS fetch had
  // even returned — so the board moved over the explanation. It now waits for
  // the solving line (or the outro why) to finish, then a breath.
  useEffect(() => {
    if (state !== 'correct' || continuedForRef.current === puzzle.id) return;
    continuedForRef.current = puzzle.id;
    const full = parseUciMoves(puzzle.moves);
    const rest = full.slice(movesRef.current.length);
    if (rest.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    // The grace covers the 800ms before the outro's why starts.
    void voiceService.untilQuiet({ graceMs: 1200, breathMs: AFTER_VOICE_BREATH_MS, maxWaitMs: SOLVE_VOICE_MAX_WAIT_MS }).then(() => {
      if (cancelled) return;
      setContinuing(true);
      rest.forEach((m, i) => {
        timers.push(setTimeout(() => {
          try {
            const r = chessRef.current.move({ from: m.from, to: m.to, promotion: m.promotion });
            playMoveSound(r.san);
            setLastMoveHighlight({ from: m.from, to: m.to });
            setFen(chessRef.current.fen());
            setBoardKey((k) => k + 1);
          } catch { /* a stale line — stop where it stops */ }
        }, 1000 * (i + 1)));
      });
    });
    return () => { cancelled = true; for (const t of timers) clearTimeout(t); };
  }, [state, puzzle.id, puzzle.moves, playMoveSound]);
  useEffect(() => { setContinuing(false); }, [puzzle.id]);

  const badge = CLASSIFICATION_BADGE[puzzle.classification];
  const totalMoves = movesRef.current.length;
  const isMultiMove = totalMoves > 1;

  // Derive the expected move for hint system
  const knownMove = useMemo((): { from: string; to: string; san: string } | null => {
    if (state !== 'playing') return null;
    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return null;
    const expected = allMoves[moveIndex];
    try {
      const chess = new Chess(fen);
      const result = chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      chess.undo();
      return { from: expected.from, to: expected.to, san: result.san };
    } catch {
      return { from: expected.from, to: expected.to, san: '' };
    }
  }, [state, moveIndex, fen]);

  const { hintState, requestHint, resetHints } = useHintSystem({
    fen,
    playerColor: puzzle.playerColor,
    enabled: settings.showHints && state === 'playing',
    knownMove,
    puzzleThemes: [],
  });

  // Reset when puzzle changes — fetch source game and start replay
  useEffect(() => {
    tryTokenRef.current += 1;
    narrationRef.current = puzzle.narration;
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    movesRef.current = parseUciMoves(pliesFor(puzzle.moves.trim().split(/\s+/).filter(Boolean), solveLengthOf(puzzle)).join(' '));
    if (movesRef.current.length === 0) {
      // No moves in puzzle — skip it. No elapsed value to report since
      // the student never had a chance to play.
      // No moves → the student never answered; record nothing, just move on.
      onComplete();
      return;
    }

    const fenTurn = puzzle.fen.split(' ')[1];
    const expectedColor = fenTurn === 'w' ? 'white' : 'black';
    if (expectedColor !== puzzle.playerColor) {
      console.warn(`Puzzle ${puzzle.id}: FEN turn (${fenTurn}) doesn't match playerColor (${puzzle.playerColor})`);
    }

    playerMoveCountRef.current = 0;
    setMoveIndex(0);
    setMoveCount(0);
    setLastMoveHighlight(null);
    setSubtitle('');
    hasMadeMistakeRef.current = false;
    wrongAttemptsRef.current = 0;
    answeredRef.current = false;
    toldBeforeAnswerRef.current = false;
    answerShownRef.current = false;
    setWrongAttemptCount(0);
    setReplayIndex(-1);

    resetHints();
    resetStruggle();
    voiceService.stop();

    void voiceService.warmup();
    // The lines this puzzle will say are already computed — load them now so
    // the intro, the first hint and the solve explanation play the moment
    // they are due (measured 2026-10-02: ~1s of silence each otherwise).
    void voiceService.prefetchAudio([
      puzzle.narration.intro,
      puzzle.narration.conceptHint,
      ...puzzle.narration.moveNarrations,
    ].filter((t) => t.trim().length > 0));

    // Try to load the source game for replay context (skip if caller already showed it)
    const cancelledRef = { value: false };
    void (async () => {
      let steps: ReplayStep[] = [];
      let pgn: string | null = null;
      try {
        pgn = (await db.games.get(puzzle.sourceGameId))?.pgn ?? null;
      } catch {
        // No game found — no replay, and the stored narration stands
      }
      if (cancelledRef.value) return;
      // Cards are re-rendered at open from the one narration computer, so a
      // card stored before the 2026-10-01 rebuild leads with what the move
      // allowed too — no migration. Before anything is spoken.
      if (pgn) {
        try {
          narrationRef.current = rerenderMistakeNarration(puzzle, pgn);
        } catch {
          // keep the stored narration
        }
      }
      if (!skipReplayContext && pgn) {
        steps = extractReplayMoves(pgn, puzzle.fen, puzzle.playerColor, puzzle.moveNumber);
      }

      if (cancelledRef.value) return;

      if (steps.length > 0) {
        // The starting FEN is the position before the first replay move
        const preReplayFen = (() => {
          // The first step's fen is AFTER the first replay move was played.
          // We need the FEN BEFORE that move. We can reconstruct it from the first step.
          const c = new Chess(steps[0].fen);
          c.undo();
          return c.fen();
        })();

        setFen(preReplayFen);
        setBoardKey((k) => k + 1);
        setReplaySteps(steps);
        setState('replay');

        // Narrate the replay intro
        const contextMsg = puzzle.openingName
          ? `Your ${puzzle.openingName}, as the game went.`
          : 'Your game, as it went.';
        setSubtitle(contextMsg);
        void voiceService.speak(contextMsg);
      } else {
        // No replay available — go straight to puzzle
        setFen(puzzle.fen);
        setReplaySteps([]);

        if (skipReplayContext) {
          // Caller already showed context — start immediately without
          // remounting the board so the position stays visually stable.
          setState('playing');
          if (narrationRef.current.intro) {
            setSubtitle(narrationRef.current.intro);
            setLineArrows(spokenLineArrows(narrationRef.current.intro, puzzle.fen, { studentColor: puzzle.playerColor === 'white' ? 'w' : 'b', studentMovesAreBad: true }));
            void voiceService.speak(narrationRef.current.intro);
          }
        } else {
          setBoardKey((k) => k + 1);
          setState('loading');
          const timer = setTimeout(() => {
            setState('playing');
            if (narrationRef.current.intro) {
              setSubtitle(narrationRef.current.intro);
            setLineArrows(spokenLineArrows(narrationRef.current.intro, puzzle.fen, { studentColor: puzzle.playerColor === 'white' ? 'w' : 'b', studentMovesAreBad: true }));
              void voiceService.speak(narrationRef.current.intro);
            }
          }, 400);
          replayTimerRef.current = timer;
        }
      }
    })();

    return () => {
      cancelledRef.value = true;
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      if (outroTimerRef.current) {
        clearTimeout(outroTimerRef.current);
        outroTimerRef.current = null;
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
      voiceService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracked for dedicated audit; intentional dep list.
  }, [puzzle, resetHints, resetStruggle, skipReplayContext]);

  // Auto-play replay moves one at a time
  useEffect(() => {
    if (state !== 'replay' || replaySteps.length === 0) return;

    // Cancellation guard: cleanup nulls this so any in-flight voice
    // promise from the replay-end sequence stops the puzzle from being
    // set up after the user has already advanced.
    const guard = { cancelled: false };

    // Start the first move after a brief pause for the intro narration
    const initialDelay = replayIndex === -1 ? 1800 : REPLAY_MOVE_DELAY;

    const timer = setTimeout(() => {
      if (guard.cancelled) return;
      const nextIdx = replayIndex + 1;

      if (nextIdx >= replaySteps.length) {
        // Replay done — show the player's mistake, then transition to puzzle
        const step = replaySteps[replaySteps.length - 1];
        setFen(step.fen);
        setBoardKey((k) => k + 1);

        // The board shows the move; the intro that follows names it and says
        // what it allowed. Announcing it here as well said the mistake twice
        // back to back (hand walk 2026-10-01, V3) — so the replay ends on the
        // board, silent, and hands over to the intro.
        setSubtitle(`You played ${puzzle.playerMoveSan}.`);
        voiceService.stop();

        let advanced = false;
        const advance = (): void => {
          if (guard.cancelled || advanced) return;
          advanced = true;
          chessRef.current = new Chess(puzzle.fen);
          setFen(puzzle.fen);
          setBoardKey((k) => k + 1);
          setState('playing');
          if (narrationRef.current.intro) {
            setSubtitle(narrationRef.current.intro);
            setLineArrows(spokenLineArrows(narrationRef.current.intro, puzzle.fen, { studentColor: puzzle.playerColor === 'white' ? 'w' : 'b', studentMovesAreBad: true }));
            void voiceService.speak(narrationRef.current.intro);
          }
        };

        replayTimerRef.current = setTimeout(advance, REPLAY_MOVE_DELAY);
        return;
      }

      const step = replaySteps[nextIdx];
      playMoveSound(step.san);
      setFen(step.fen);
      setLastMoveHighlight({ from: step.from, to: step.to });
      setBoardKey((k) => k + 1);

      // Narrate the move — use absolute ply color stored in the step,
      // not the array index, since replay may start at an arbitrary ply.
      const isPlayerMove = (puzzle.playerColor === 'white' && step.isWhiteMove)
        || (puzzle.playerColor === 'black' && !step.isWhiteMove);
      const whoPlayed = isPlayerMove ? 'You' : 'Opponent';
      // Only narrate every other move to keep pace — narrate player's moves
      if (isPlayerMove || nextIdx === replaySteps.length - 1) {
        setSubtitle(`${whoPlayed}: ${step.moveLabel}`);
      }

      setReplayIndex(nextIdx);
    }, initialDelay);

    replayTimerRef.current = timer;

    return () => {
      guard.cancelled = true;
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [state, replayIndex, replaySteps, puzzle, playMoveSound]);

  // Skip replay handler
  const skipReplay = useCallback(() => {
    if (state !== 'replay') return;
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    voiceService.stop();

    chessRef.current = new Chess(puzzle.fen);
    setFen(puzzle.fen);
    setLastMoveHighlight(null);
    setBoardKey((k) => k + 1);
    setState('playing');
    if (narrationRef.current.intro) {
      setSubtitle(narrationRef.current.intro);
            setLineArrows(spokenLineArrows(narrationRef.current.intro, puzzle.fen, { studentColor: puzzle.playerColor === 'white' ? 'w' : 'b', studentMovesAreBad: true }));
      void voiceService.speak(narrationRef.current.intro);
    }
  }, [state, puzzle]);

  // Speak WHY the solved move was best, GROUNDED (G0): the rationale (what it
  // really wins, whether the capture is recapturable) is computed in code and
  // only PHRASED by the LLM via the voiceFacts chokepoint. The LLM decides no
  // chess, so it can't invent a false fork or a wrong recapture (the 2026-06-11
  // weakness-drill hallucination). Spoken in FULL (bypassBriefCap) — David
  // 2026-09-12 wants the full teaching why on solve, even for "brief" users;
  // still honors the SILENT gate. Shared by the auto-fire on solve and the
  // manual "Why?" button so both speak the same explanation.
  const speakBestMoveWhy = useCallback(async (): Promise<void> => {
    setSubtitle('Analyzing why this was the best move...');
    const rating = activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING;
    try {
      const engineFramed = await explainPuzzleMoveGrounded({
        fen: puzzle.fen,
        bestMoveUci: puzzle.bestMove,
        bestMoveSan: puzzle.bestMoveSan,
        playedSan: puzzle.playerMoveSan,
        // The solution line (UCI half-moves) so the "why" RECALLS the full
        // engine-reasoning walk, not just the single move (David 2026-07-10).
        pvUci: puzzle.moves ? puzzle.moves.split(/\s+/).filter(Boolean) : undefined,
      });
      // The student played this move — it is theirs, not "the engine's".
      const response = engineFramed.replace(/^The engine plays (\S+) — it /, '$1 — it ').replace(/^The engine plays (\S+)\./, '$1.');
      setSubtitle(response);
      setLineArrows(spokenLineArrows(response, puzzle.fen, {
        studentColor: puzzle.playerColor === 'white' ? 'w' : 'b',
        exclude: puzzle.bestMove.length >= 4 ? [{ from: puzzle.bestMove.slice(0, 2), to: puzzle.bestMove.slice(2, 4) }] : [],
      }));
      await voiceService.speakGrounded(response, puzzle.fen, { bypassBriefCap: true });
    } catch {
      // Fallback to tactic-specific coaching
      const coaching = getCoachingMessage(tacticType, 'guide', rating);
      setSubtitle(coaching ?? '');
      if (coaching) void voiceService.speak(coaching);
    }
  }, [puzzle, activeProfile?.currentRating, tacticType]);

  // "TEACH ME THIS POSITION" (David 2026-10-01: "on demand teaching without
  // forcing it on the user"). The ONE read every surface shares — Learn's and
  // Play's "Read this position" — fed by the student's WHOLE record (spine,
  // needs, proven capabilities) through the one deciding door. Before the
  // answer it teaches the position and withholds the move; after it, the full
  // read, including why the alternatives fall short.
  const teach = usePositionNarration({
    fen: puzzle.fen,
    pgn: '',
    moveNumber: puzzle.moveNumber,
    playerColor: puzzle.playerColor,
    openingName: puzzle.openingName,
    corpusNotes: true, // the tactics drill is a kept corpus surface
    withhold: state === 'correct' ? null : puzzle.bestMoveSan,
  });
  const handleTeach = useCallback(() => {
    // Taught before answering → the answer is `prompted` (neither proven nor
    // failed): the student was helped, and the record says so.
    if (!answeredRef.current) toldBeforeAnswerRef.current = true;
    voiceService.stop();
    void teach.narrate();
  }, [teach]);
  useEffect(() => {
    if (teach.currentText) setSubtitle(teach.currentText);
  }, [teach.currentText]);

  // The post-solve question box's fallback: the puzzle's own best-move read,
  // so a question never dead-ends when the coach has nothing.
  const explainFallback = useCallback((question: string): Promise<string> => explainPuzzleMoveGrounded({
    fen: puzzle.fen,
    bestMoveUci: puzzle.bestMove,
    bestMoveSan: puzzle.bestMoveSan,
    playedSan: puzzle.playerMoveSan,
    studentMessage: question,
  }), [puzzle]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (state !== 'playing') return;
    setLineArrows([]); // the last line's moves belong to the last position
    setWalkable(null);

    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return;
    const expected = allMoves[moveIndex];

    const isCorrect = move.from === expected.from && move.to === expected.to && (!expected.promotion || move.promotion === expected.promotion);
    answeredRef.current = true;

    // Every move input, right or wrong, lands a `move-attempt` row — the SAME
    // shape PuzzleBoard emits (capability parity: a game-mistake drill is a
    // puzzle too, and it emitted nothing, so the per-move record and the
    // hint-effectiveness join were blind on My Weaknesses). The board BEFORE
    // the attempt: the ref already carries the student's move.
    const fenBeforeAttempt = chessRef.current.history({ verbose: true }).at(-1)?.before ?? fen;
    void logAppAudit({
      kind: 'move-attempt',
      category: 'subsystem',
      source: 'MistakePuzzleBoard.handleMove',
      summary: `${isCorrect ? '✓' : '✗'} ${move.san} (expected ${expected.from}${expected.to})`,
      details: JSON.stringify({
        surface: 'mistake-puzzle',
        fen: fenBeforeAttempt,
        attemptedSan: move.san,
        correctSan: `${expected.from}${expected.to}${expected.promotion ?? ''}`,
        isCorrect,
        moveMethod: 'unknown',
        timeFromPositionEnterMs: Math.round(elapsedStartRef.current != null ? performance.now() - elapsedStartRef.current : elapsedMs),
        sourceId: puzzle.id,
        tacticType,
      }),
      fen: fenBeforeAttempt,
    });

    if (isCorrect) {
      playMoveSound(move.san);
      resetHints();
      wrongAttemptsRef.current = 0;
      setLastMoveHighlight({ from: move.from, to: move.to });
      setMoveCount((c) => c + 1);

      // Speak per-move narration
      const currentPlayerMove = playerMoveCountRef.current;
      playerMoveCountRef.current += 1;
      const moveNarrations = narrationRef.current.moveNarrations;
      if (moveNarrations[currentPlayerMove]) {
        voiceService.stop();
        setSubtitle(moveNarrations[currentPlayerMove]);
        const before = chessRef.current.history({ verbose: true }).at(-1)?.before;
        setLineArrows(before ? spokenLineArrows(moveNarrations[currentPlayerMove], before, {
          studentColor: puzzle.playerColor === 'white' ? 'w' : 'b',
          exclude: [{ from: move.from, to: move.to }],
        }) : []);
        void voiceService.speak(moveNarrations[currentPlayerMove]);
      }

      const nextIndex = moveIndex + 1;
      if (nextIndex < allMoves.length) {
        reward({ kind: 'pip', square: move.to, step: currentPlayerMove, seed: rewardSeed(puzzle.id) + currentPlayerMove });
      }

      // SOLVED — on the student's last move OR on the opponent's reply when the
      // stored line ends with one (walk 2026-10-01: three of four generated
      // lines ended on a reply, and the board sat at "3/3" forever — no
      // celebration, no why, no Next button, no capability evidence).
      const finishSolved = (): void => {
        setState('correct');
        resolve(!hasMadeMistakeRef.current && !answerShownRef.current, Math.round(elapsedMs));
        reward({ kind: 'solved', square: move.to, step: currentPlayerMove, seed: rewardSeed(puzzle.id) });
        // Record outcome for cross-session coaching
        recordTacticOutcome({
          tacticType,
          found: true,
          wasCoached: hasMadeMistakeRef.current,
          context: skipReplayContext ? 'create' : 'drill',
        });
        // THE HEAT MAP'S GREEN (WO-3 S3, 2026-09-19). Until this call, a drill
        // solved correctly moved the misconception SRS (open -> improving) and
        // wrote NO capability evidence — `recordTagDrillResult` never imported
        // it. So the one surface where a student demonstrably proves competence
        // could never turn a tag green, and the Foundation's "the coach cannot
        // yet tell you that you have GOTTEN BETTER" was severed exactly here.
        //
        // Both halves computed, neither guessed: `capabilitiesPosed` reads what
        // this position ASKED off the best move; the outcome comes from the
        // FIRST answer. Clean first try -> cpLoss 0 -> held. A wrong attempt is
        // the board posing the question and the student not answering it ->
        // broken, at the cost the original game already measured. Tapping
        // [show me] first -> prompted -> grey; found-after-told is not evidence.
        // This is the ONE door every drill surface shares (five consumers), so
        // capability parity holds by construction.
        void recordCapabilityEvidence({
          fenBefore: puzzle.fen,
          playedSan: puzzle.bestMoveSan,
          moverColor: puzzle.playerColor,
          cpLoss: hasMadeMistakeRef.current ? puzzle.cpLoss : 0,
          origin: 'drill',
          prompted: toldBeforeAnswerRef.current,
          sourceGameId: puzzle.sourceGameId || undefined,
          // Both ways: what the insight computer says this position asked.
          alsoPosed: positionPosed(puzzle.fen, { bestSan: puzzle.bestMoveSan }),
        });
        // Auto-speak the GROUNDED "why this was the best move" after the
        // celebration sound — the teaching moment David 2026-09-12 wanted taken:
        // "When coach is training drills/weaknesses I want the why spoken! Why
        // was that the best move." This replaces the canned outro auto-speak
        // with the engine-grounded reasoning walk (G0), the same explanation the
        // "Why?" button gives. NO auto-advance — the student taps "Next puzzle"
        // themselves when they're done analyzing (David 2026-05-19: the deeper
        // meaning gets clipped otherwise).
        // ONE REASON, SAID ONCE: when the solving move already spoke its
        // computed reason ("Qc5 keeps your pawn on d6 protected"), a second,
        // competing why on top of it is noise; "Explain why" still answers.
        const spokeReason = narrationRef.current.moveNarrations.some((m) => m.trim().length > 0);
        if (!spokeReason) {
          outroTimerRef.current = setTimeout(() => {
            voiceService.stop();
            void speakBestMoveWhy();
          }, 800);
        }
      };
      if (nextIndex >= allMoves.length) {
        finishSolved();
        // Stay on 'correct' state until the user taps Next.
        return;
      }

      // Auto-play opponent's response after a delay
      setMoveIndex(nextIndex);
      if (nextIndex < allMoves.length) {
        const opponentMove = allMoves[nextIndex];
        setTimeout(() => {
          try {
            const result = chessRef.current.move({
              from: opponentMove.from,
              to: opponentMove.to,
              promotion: opponentMove.promotion,
            });
            playMoveSound(result.san);
            const newFen = chessRef.current.fen();
            setLastMoveHighlight({ from: opponentMove.from, to: opponentMove.to });
            setFen(newFen);
            setBoardKey((k) => k + 1);
            setMoveIndex(nextIndex + 1);
            if (nextIndex + 1 >= allMoves.length) finishSolved();
          } catch {
            // Invalid opponent move — puzzle data is corrupted, fail gracefully
            setState('incorrect');
            const elapsedAtFail = Math.round(elapsedMs);
            resolve(false, elapsedAtFail);
            completionTimerRef.current = setTimeout(() => {
              onComplete();
            }, 1200);
            return;
          }
        }, 500);
      }
    } else {
      // Wrong move — undo and let them try again from the same position
      hasMadeMistakeRef.current = true;
      wrongAttemptsRef.current += 1;
      setWrongAttemptCount(wrongAttemptsRef.current);
      chessRef.current.undo();
      const prevFen = chessRef.current.fen();
      setState('incorrect');
      voiceService.stop();
      reward({ kind: 'miss' });

      // Progressive verbal hints based on consecutive wrong attempts
      const attempts = wrongAttemptsRef.current;
      const expectedMove = movesRef.current[moveIndex];
      let hint = '';

      if (attempts === 1) {
        // The concept hint when the puzzle has one; otherwise what the
        // position asks (below) carries the first rung — the canned
        // per-classification line said the same thing every time.
        if (narrationRef.current.conceptHint) hint = narrationRef.current.conceptHint;
      } else if (attempts === 2) {
        // Piece hint — tell them which piece to look at
        const pieceName = getPieceNameOnSquare(chessRef.current, expectedMove.from);
        hint = pieceName
          ? `Look at what your ${pieceName} can do.`
          : 'One of your pieces has a strong move available.';
      } else {
        // Square hint — reveal the target square
        hint = `The key square is ${expectedMove.to}. What can reach it?`;
      }

      // Why the try fails before the next hint (Learn's weighing, hand walk
      // 2026-10-01): "a6? Then Qxd6, winning your pawn on d6." The escalating
      // hint is the fallback when the refutation is quiet; the token drops a
      // late engine read once a newer try or a new puzzle has arrived.
      const tryToken = ++tryTokenRef.current;
      wrongTryPendingRef.current = true;
      heldCoachRef.current = null;
      void readWrongTry(prevFen, move.san).catch(() => null).then((read) => {
        if (tryToken !== tryTokenRef.current) return;
        wrongTryPendingRef.current = false;
        const held = heldCoachRef.current;
        heldCoachRef.current = null;
        // ONE line per miss: why the try fails, the method, then the rung.
        // WHAT THE POSITION ASKS (David 2026-10-05) — the idea, never the move.
        const expectedSan = (() => {
          try { return new Chess(prevFen).move({ from: expectedMove.from, to: expectedMove.to, promotion: expectedMove.promotion ?? 'q' })?.san; } catch { return undefined; }
        })();
        const ask = positionAsk(prevFen, { bestSan: expectedSan }).text;
        const line = composeWrongTryLine(read?.text ?? null, ask, held, hint);
        setSubtitle(line);
        setWalkable(read?.kind === 'refuted' ? read.line ?? null : null);
        setLineArrows(spokenLineArrows(line, prevFen, { studentColor: puzzle.playerColor === 'white' ? 'w' : 'b', studentMovesAreBad: true }));
        voiceService.stop();
        void voiceService.speak(line);
      });

      setFen(prevFen);
      setBoardKey((k) => k + 1);

      // Brief feedback then back to playing
      setTimeout(() => {
        setState('playing');
      }, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracked for dedicated audit; intentional dep list.
  }, [state, moveIndex, onComplete, playMoveSound, resetHints, puzzle.narration, tacticType, skipReplayContext, speakBestMoveWhy]);

  // ── KEEP PLAYING (R4, David 2026-09-01) — after the puzzle is solved, let the
  // student play the position out; the computer answers each move. Reuses the
  // coach play loop (getCoachMove / resolveConfig) at a rating-matched strength.
  const [freeplayThinking, setFreeplayThinking] = useState(false);
  const coachDifficulty = useAppStore((st) => st.coachDifficulty);
  const startFreeplay = useCallback((): void => {
    try { chessRef.current.load(fen); } catch { /* stays at current */ }
    setLastMoveHighlight(null);
    setState('freeplay');
    setBoardKey((k) => k + 1);
  }, [fen]);

  const playFreeplayReply = useCallback(async (): Promise<void> => {
    if (chessRef.current.isGameOver()) return;
    setFreeplayThinking(true);
    try {
      // ONE ENGINE STRENGTH (P0b): the student's PLAYING rating (never the
      // puzzle Elo, a different skill that runs high) + the one offset table
      // at the student's own chosen difficulty.
      const strength = opponentStrength('mistake-puzzle-freeplay', studentPlayingRating(activeProfile), coachDifficulty);
      const reply = await getCoachMove(chessRef.current.fen(), resolveConfig(coachDifficulty, strength.studentElo), strength);
      if (reply?.from && reply.to) {
        try {
          const m = chessRef.current.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
          setFen(chessRef.current.fen());
          setBoardKey((k) => k + 1);
          setLastMoveHighlight({ from: reply.from, to: reply.to });
          playMoveSound(m.san);
        } catch { /* illegal reply — leave the board to the student */ }
      }
    } catch { /* engine unavailable — the student can keep moving */ } finally {
      setFreeplayThinking(false);
    }
  }, [activeProfile, playMoveSound, coachDifficulty]);

  const handleChessBoardMove = useCallback((moveResult: MoveResult): void => {
    // Apply the move to our chess ref but do NOT call setFen() here —
    // handleMove will update FEN after validation, avoiding a temporary
    // FEN change that would reset hint state on wrong moves.
    try {
      chessRef.current.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
    } catch {
      // Move already applied or invalid
    }
    if (state === 'freeplay') {
      // The student's move is on the ref + board; answer it with the engine.
      setFen(chessRef.current.fen());
      void playFreeplayReply();
      return;
    }
    handleMove(moveResult);
  }, [handleMove, state, playFreeplayReply]);

  return (
    <div className="space-y-3" data-testid="mistake-puzzle-board">
      {/* Header with classification badge and phase */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${badge.color}`}
          data-testid="classification-badge"
        >
          <AlertTriangle size={12} />
          {badge.symbol} {badge.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-theme-surface text-theme-text-muted border border-theme-border">
          {PHASE_LABELS[puzzle.gamePhase]}
        </span>
        {puzzle.openingName && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-theme-surface text-theme-text-muted border border-theme-border" data-testid="opening-name">
            <BookOpen size={10} />
            {puzzle.openingName}
          </span>
        )}
        {/* Countdown chip — visible only when puzzleTimerOn (opt-in
            time pressure). Counts down from puzzleClockTargetSec → 0
            and turns red in the final 10s / when expired. When OFF
            the timer still runs silently in the background and gets
            logged to the mistake-puzzle record for /weaknesses.
            David's design 2026-05-19: "if user selects a timer then
            it shows on page and counts down to add time pressure." */}
        {puzzleTimerOn && (
          (() => {
            const remainingMs = Math.max(0, puzzleClockTargetSec * 1000 - elapsedMs);
            const remainingSec = Math.ceil(remainingMs / 1000);
            const expired = remainingMs <= 0;
            const urgent = remainingMs > 0 && remainingMs <= 10_000;
            const m = Math.floor(remainingSec / 60);
            const s = remainingSec % 60;
            const cls = expired
              ? 'border-red-500/60 bg-red-500/15 text-red-400'
              : urgent
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-theme-border bg-theme-surface text-theme-text-muted';
            return (
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border tabular-nums ${cls}`}
                data-testid="puzzle-countdown-clock"
                data-expired={expired ? 'true' : 'false'}
              >
                <Clock size={10} />
                {`${m}:${s.toString().padStart(2, '0')}`}
              </span>
            );
          })()
        )}
        {/* Tactic-name chip — surfaces the named pattern (Skewer /
            Fork / Pin / etc.) so the student can target their
            search. Eye-icon toggle next to the chip hides the name
            when the student wants to find the tactic blind.
            Toggle persists per-profile via appStore /
            UserPreferences.puzzleShowTacticName.
            David's directive 2026-05-19: "a name of the tactic I'm
            suppose to be looking/missed at the top the puzzle. With
            a little on off toggle next to it". */}
        {puzzle.tacticType && puzzle.tacticType !== 'tactical_sequence' && (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-theme-accent/15 text-theme-accent border border-theme-accent/40 font-semibold"
            data-testid="tactic-name-chip"
          >
            <Target size={10} />
            {puzzleShowTacticName
              ? tacticTypeLabel(puzzle.tacticType)
                  .replace(/^./, (c) => c.toUpperCase())
              : 'Hidden'}
            <button
              type="button"
              onClick={() => togglePuzzleShowTacticName()}
              className="ml-1 p-0.5 rounded hover:bg-theme-accent/20 transition-colors"
              aria-label={puzzleShowTacticName ? 'Hide tactic name' : 'Show tactic name'}
              data-testid="tactic-name-toggle"
              data-tactic-name-shown={puzzleShowTacticName ? 'true' : 'false'}
            >
              {puzzleShowTacticName ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
          </span>
        )}
      </div>

      {/* Game context: opponent + time ago */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted" data-testid="game-context">
        {puzzle.opponentName && (
          <span className="inline-flex items-center gap-1">
            <User size={11} />
            vs {puzzle.opponentName}
          </span>
        )}
        {puzzle.gameDate && (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {formatTimeAgo(puzzle.gameDate)}
          </span>
        )}
        {!puzzle.opponentName && !puzzle.gameDate && (
          <span>From your game</span>
        )}
      </div>

      {/* Replay context header */}
      {state === 'replay' && (
        <div className="flex items-center justify-between" data-testid="replay-header">
          <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
            <Play size={14} className="text-theme-accent" />
            <span>Replaying game context...</span>
            {replaySteps.length > 0 && (
              <span className="text-xs text-theme-text-muted">
                {Math.max(0, replayIndex + 1)}/{replaySteps.length}
              </span>
            )}
          </div>
          <button
            onClick={skipReplay}
            className="text-xs px-3 py-1 rounded bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text-primary transition-colors"
            data-testid="skip-replay"
          >
            Skip
          </button>
        </div>
      )}

      {state !== 'replay' && (
        <PuzzleHeader
          total={Math.ceil(totalMoves / 2)}
          done={state === 'correct' ? Math.ceil(totalMoves / 2) : moveCount}
          streak={streak}
          missed={state === 'incorrect'}
        />
      )}

      {/* Show the wrong move before asking for the correct one */}
      {state !== 'replay' && (
        <div className="text-sm text-theme-text-secondary space-y-1" data-testid="prompt-text">
          <p>
            You played <span className="font-semibold text-red-400">{puzzle.playerMoveSan}</span> — {puzzle.classification === 'miss' ? 'missing an opportunity' : `a ${puzzle.classification}`}.
            {' '}Find the best move.
            {isMultiMove && (
              <span className="text-theme-text-muted ml-1">
                ({Math.ceil(totalMoves / 2)} move{Math.ceil(totalMoves / 2) > 1 ? 's' : ''} to find)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Board */}
      <div ref={fitRef} style={fitStyle} className="w-full md:max-w-[420px] mx-auto">
        {lineWalk.walkFen ? (
          <ConsistentChessboard
            fen={lineWalk.walkFen}
            arrows={lineWalk.walkArrows}
            interactive={false}
            boardOrientation={puzzle.playerColor}
            showLastMoveHighlight
          />
        ) : (
        <ChessBoard
          initialFen={fen}
          key={boardKey}
          orientation={puzzle.playerColor}
          interactive={state === 'playing' || (state === 'freeplay' && !freeplayThinking)}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={handleChessBoardMove}
          highlightSquares={lastMoveHighlight}
          arrows={hintState.arrows.length > 0 ? hintState.arrows : lineArrows.length > 0 ? lineArrows : undefined}
          ghostMove={hintState.ghostMove}
        />
        )}
      </div>
      {walkable && state === 'playing' && (
        <div className="px-1"><WalkLineButton line={walkable} onWalk={lineWalk.walk} testId="mistake-walk-line-btn" /></div>
      )}

      {/* Keep-playing status (R4) */}
      {state === 'freeplay' && (
        <div className="flex items-center justify-between gap-2 text-sm" data-testid="puzzle-freeplay-status">
          <span className="text-theme-text-muted">
            {chessRef.current.isGameOver()
              ? 'Game over.'
              : freeplayThinking
                ? 'Computer is thinking…'
                : 'Your move — play it out.'}
          </span>
        </div>
      )}

      {/* ONE row: [show me] beside Teach me, so both sit above the bottom nav
          on a short phone (David 2026-10-04). */}
      {(state === 'playing' || state === 'correct') && (
        <div ref={keepRef} className="flex flex-wrap items-center justify-between gap-2">
          {state === 'playing' && settings.showHints && (
            <div className="flex flex-col items-start gap-2" data-testid="puzzle-hint-area">
              <ShowMeButton
                onShow={() => {
                  // Told before answering -> the solve is `prompted` (refs, not
                  // hintState.level: `resetHints()` zeroes the level on the very
                  // move that solves). Told after a miss -> the miss stands.
                  if (!answeredRef.current) toldBeforeAnswerRef.current = true;
                  answerShownRef.current = true;
                  // Skip the hint ladder — jump straight to tier 3 (best
                  // move arrow + final answer). requestHint() bumps one
                  // tier; three consecutive calls reach tier 3.
                  if (hintState.level < 1) requestHint();
                  if (hintState.level < 2) requestHint();
                  if (hintState.level < 3) requestHint();
                }}
                disabled={hintState.isAnalyzing}
                revealed={hintState.level >= 3}
              />
            </div>
          )}
          <button
            onClick={handleTeach}
            disabled={teach.isNarrating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-accent text-sm transition-colors border border-theme-border disabled:opacity-50 disabled:cursor-wait"
            data-testid="teach-position-button"
          >
            <HelpCircle size={14} />
            <span className="whitespace-nowrap">{teach.isNarrating ? 'Reading…' : 'Teach me'}</span>
          </button>
        </div>
      )}

      {state === 'playing' && hintState.nudgeText && (
        <p className="text-xs text-amber-500 max-w-sm" data-testid="hint-nudge">
          {hintState.nudgeText}
        </p>
      )}

      {/* Status feedback */}
      {state === 'correct' && (
        <div className="space-y-3" data-testid="puzzle-correct">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">
              Correct!{isMultiMove ? ` You found all ${Math.ceil(totalMoves / 2)} moves.` : ` The best move was ${puzzle.bestMoveSan}.`}
            </span>
          </div>
          {continuing && (
            <p className="text-xs text-cyan-300" data-testid="mistake-continuation">
              Here&apos;s how the line continues — next time you&apos;ll be asked to find more of it.
            </p>
          )}

          {/* Keep playing (R4) — play the solved position out; the computer
              answers each move. Reuses the coach play loop. */}
          <button
            type="button"
            onClick={startFreeplay}
            className="w-full px-3 py-2 rounded-lg bg-theme-surface hover:bg-theme-border text-sm text-theme-text border border-theme-border transition-colors"
            data-testid="puzzle-keep-playing"
          >
            Keep playing this position →
          </button>

          {/* Coach chat — ask follow-up questions about the position
              without leaving the puzzle. Sends FEN + best move + tactic
              type as context. David's directive 2026-05-19. */}
          <div data-testid="puzzle-coach-chat">
            <BoardQuestionBox
              fen={puzzle.fen}
              studentColor={puzzle.fen.split(' ')[1] === 'b' ? 'black' : 'white'}
              route="/tactics"
              onWalkLine={lineWalk.walk}
              engineBestMoveUci={puzzle.bestMove}
              fallback={explainFallback}
              testIdPrefix="puzzle-chat"
              placeholder="Why did this work? What about ...?"
            />
          </div>

          {/* Next puzzle — manual advance. No auto-timeout: student
              taps when they're done analyzing. David's directive
              2026-05-19: prior 4000ms auto-onComplete clipped the
              outro narration. */}
          <button
            type="button"
            onClick={() => onComplete()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
            data-testid="puzzle-next-btn"
          >
            <span>Next puzzle</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      {state === 'incorrect' && (
        <div className="flex items-center gap-2 text-red-500" data-testid="puzzle-incorrect">
          <XCircle size={18} />
          <span className="text-sm font-medium">Incorrect — try again</span>
        </div>
      )}
      {state === 'loading' && (
        <div className="text-sm text-theme-text-muted" data-testid="puzzle-loading">
          Setting up position...
        </div>
      )}

      {/* Coach narration subtitle */}
      {subtitle && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg bg-theme-surface border border-theme-border"
          data-testid="narration-subtitle"
        >
          <Volume2 size={14} className="shrink-0 mt-0.5 text-theme-accent" />
          <p className="text-xs text-theme-text-muted leading-relaxed">{subtitle}</p>
        </div>
      )}

      {/* Puzzle info */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted">
        <span>Move {puzzle.moveNumber}</span>
        <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
        <span>{puzzle.cpLoss}cp loss</span>
        {isMultiMove && (
          <>
            <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
            <span>{Math.ceil(totalMoves / 2)} moves deep</span>
          </>
        )}
      </div>
    </div>
  );
}
