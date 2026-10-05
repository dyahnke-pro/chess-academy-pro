import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useLineWalk } from '../../hooks/useLineWalk';
import { WalkLineButton } from '../Board/WalkLineButton';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { lastMoveAlong, positionAsk } from '../../services/moveInsight';
import { spokenLineArrows } from '../../services/arrowEngine';
import type { BoardArrow } from '../Chessboard/ConsistentChessboard';
import { captureEvent } from '../../services/analytics';
import { Chess } from 'chess.js';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { HintButton } from '../Coach/HintButton';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useSettings } from '../../hooks/useSettings';
import { useChessGame } from '../../hooks/useChessGame';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useStruggleDetection } from '../../hooks/useStruggleDetection';
import { usePositionNarration } from '../../hooks/usePositionNarration';
import { Eye, RotateCcw } from 'lucide-react';
import { VoiceChatMic } from '../Board/VoiceChatMic';
import type { MoveResult } from '../../hooks/useChessGame';
import { useBoardContext } from '../../hooks/useBoardContext';
import { voiceService } from '../../services/voiceService';
import { getWrongMoveHint } from '../../utils/puzzleHints';
import { readWrongTry, composeWrongTryLine } from '../../services/wrongTryRefutation';
import { puzzleMethodLine, cpFromThemes } from '../../services/puzzleMethod';
import { useStudentRecord } from '../../hooks/useStudentRecord';
import { recordCapabilityEvidence } from '../../services/capabilityEvidence';
import { MISTAKE_CP } from '../../services/engineConstants';
import type { MethodHabit } from '../../services/methodBeat';
import { recordTacticOutcome } from '../../services/tacticAlertService';
import { recordPuzzleMiss, logPuzzleMisconception, type PuzzleMissRecord } from '../../services/puzzleMissService';
import { usePuzzleMeter } from '../../hooks/usePuzzleMeter';
import { getTacticTypeFromThemes, getPrimaryThemeLabel, focusThemeLabel } from '../../services/tacticClassifierService';
import { voiceFacts } from '../../services/coachApi';
import { describeMoveGeometry } from '../../services/groundedAnswer';
import { explainPuzzleConcept } from '../../services/puzzleConceptExplanation';
import { useAppStore } from '../../stores/appStore';
import { logAppAudit } from '../../services/appAuditor';
import type { CoachingTier } from '../../services/tacticAlertService';
import type { PuzzleRecord, WalkableLine } from '../../types';
import { DEFAULT_STUDENT_RATING } from '../../services/ratingBands';
import { solverMoves } from '../../services/puzzleDepth';
import { reward } from '../../services/rewardService';
import { rewardSeed } from '../../services/rewardEvents';
import { PuzzleHeader } from './PuzzleHeader';
import { useBoardFit } from '../../hooks/useBoardFit';

type PuzzleState = 'loading' | 'playing' | 'correct' | 'incorrect';

/** Outcome metadata passed to the parent on puzzle completion. */
export interface PuzzleOutcome {
  correct: boolean;
  usedHint: boolean;
  /** True if the player needed more than one attempt on any move. */
  hadRetry: boolean;
  /** True if the player explicitly viewed the solution. */
  showedSolution: boolean;
  /** Solver moves found with no wrong try and no hint since the previous
   *  one — Deep Run banks exactly these (David 2026-10-02: "Only clean moves
   *  bank"). */
  cleanMoves: number;
  /** Time from first player move opportunity to completion (ms). */
  solveTimeMs: number;
}

interface PuzzleBoardProps {
  puzzle: PuzzleRecord;
  onComplete: (outcome: PuzzleOutcome) => void;
  disabled?: boolean;
  /** Maximum wrong attempts before auto-failing the puzzle (default: 2). */
  maxWrongAttempts?: number;
  /** Puzzles solved in a row, shown in the header; omit on surfaces with no
   *  session. */
  streak?: number;
  /** A surface's own score row (deep-run) above the pips. */
  headerExtra?: ReactNode;
  /** Each wrong try climbs one rung of the puzzle's hint ladder for THAT
   *  move (theme → piece → square); at the top, Show solution lights up. It
   *  stays one tap away throughout (David 2026-10-02:
   *  "Hints are given until top of ladder is reached. Then show solution
   *  button. But we give the user as many tries as they want"). */
  hintOnMiss?: boolean;
  /** Which Tactics surface hosts the board — a missed puzzle is recorded
   *  under it (`recordPuzzleMiss`). REQUIRED so a new host has to answer. */
  surface: PuzzleMissRecord['surface'];
  /** The Lichess themes the host drilled for ("Discovered Attacks" card →
   *  ['discoveredAttack']). When the puzzle carries one, the heading names
   *  THAT theme, not the puzzle's first classified tactic — a Discovered
   *  Attacks drill was headed FORK (live walk 2026-10-03). */
  focusThemes?: readonly string[];
}

/** Speak computed puzzle prose through the ONE chokepoint (G0). preferRaw:
 *  the computed text is already the sentence, so no model rewrites it. */
async function voiceComputed(text: string): Promise<string> {
  try {
    return (await voiceFacts(text, { preferRaw: true, intent: 'puzzle-concept' })) ?? text;
  } catch {
    return text;
  }
}

function parseUciMoves(uci: string): { from: string; to: string; promotion?: string }[] {
  return uci.trim().split(/\s+/).map((m) => ({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: m.length > 4 ? m.slice(4) : undefined,
  }));
}

export function PuzzleBoard({
  puzzle,
  onComplete,
  disabled = false,
  maxWrongAttempts = 2,
  streak,
  headerExtra,
  hintOnMiss = false,
  surface,
  focusThemes,
}: PuzzleBoardProps): JSX.Element {
  // The line's depth, counted (never a theme tag), and how far the student is.
  const totalMoves = useMemo(() => Math.max(1, solverMoves(puzzle)), [puzzle]);
  const [pipsDone, setPipsDone] = useState(0);
  const [missedPip, setMissedPip] = useState(false);
  const seed = useMemo(() => rewardSeed(puzzle.id), [puzzle.id]);
  const meter = usePuzzleMeter();
  const consumedIdRef = useRef<string | null>(null);
  const [state, setState] = useState<PuzzleState>('loading');
  // The board shrinks just enough that Hint / Show solution sit above the
  // bottom nav on a short phone (David 2026-10-04).
  const { boardRef: fitRef, keepRef, boardStyle: fitStyle } = useBoardFit(state);
  const [moveIndex, setMoveIndex] = useState(0);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: string; to: string } | null>(null);
  const [flashClass, setFlashClass] = useState<string>('');
  const hasMadeMistakeRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  const hintUsedRef = useRef(false);
  const showedSolutionRef = useRef(false);
  const cleanMovesRef = useRef(0);
  /** A wrong try or a hint on the CURRENT move — it no longer counts clean. */
  const moveAssistedRef = useRef(false);
  /** Wrong tries on the CURRENT move — the hint ladder's rung (hintOnMiss). */
  const moveWrongRef = useRef(0);
  const [ladderTop, setLadderTop] = useState(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solveStartRef = useRef<number>(Date.now());
  const movesRef = useRef(parseUciMoves(puzzle.moves));
  const { playMoveSound } = usePieceSound();
  const { settings } = useSettings();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [subtitle, setSubtitle] = useState<string>('');
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  // Terminal = the puzzle is resolved (solved OR failed/shown) — the moment to
  // TEACH the concept behind the solution (David 2026-09-14: "not just a hint
  // with an arrow, but an explanation of the concepts to understand the
  // solution"). Distinct from the transient 'incorrect' of a single wrong try.
  // Resolution belongs to ONE puzzle: the id that was resolved, never a bare
  // boolean. A boolean outlived the puzzle by a render on every swap, so the
  // concept effect saw "resolved, not yet spoken" against the NEXT puzzle and
  // read its whole solution aloud before the student moved (hand walk
  // 2026-10-01). Keyed by id, a stale resolution cannot match a new puzzle.
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const terminal = terminalId === puzzle.id;
  const conceptSpokenRef = useRef<string | null>(null);
  /** Arrows for the moves the current spoken line names (`spokenLineArrows`). */
  const [lineArrows, setLineArrows] = useState<BoardArrow[]>([]);
  // The last wrong try's line, walkable (David 2026-10-05: "Button tap to
  // play out any lines the user wants"). Cleared with the arrows.
  const [walkable, setWalkable] = useState<WalkableLine | null>(null);
  const tryTokenRef = useRef(0);
  /** A wrong try's refutation is still being read. While it is, a coaching
   *  line the SAME miss triggered (the struggle coach's method beat) waits and
   *  is spoken with it as ONE line — spoken separately, the refutation landed
   *  ~80ms later and cut the method off mid-sentence (PostHog, David's phone,
   *  2026-10-02: "This was the moment to slow down — positions where one move"
   *  → "rook to e1? Then a-pawn takes b5…"). */
  const wrongTryPendingRef = useRef(false);
  const heldCoachRef = useRef<string | null>(null);
  // The FIRST answer is the evidence (see MistakePuzzleBoard): recorded once.
  const answeredRef = useRef(false);
  // Habits taught this session — the method beat says each one once.
  const saidHabitsRef = useRef(new Set<MethodHabit>());
  // The student's WHOLE record (holes + proven), so the method beat is decided
  // from their games and drills together, not from the puzzles alone.
  const recordRef = useStudentRecord();
  // The board the solver faces: a Lichess line opens with the opponent's move.
  const solverFen = useMemo((): string => {
    try {
      const c = new Chess(puzzle.fen);
      const [opp] = parseUciMoves(puzzle.moves);
      if (opp) c.move({ from: opp.from, to: opp.to, promotion: opp.promotion });
      return c.fen();
    } catch {
      return puzzle.fen;
    }
  }, [puzzle.fen, puzzle.moves]);
  // The solver's first move (a Lichess line opens with the opponent's move).
  const solverFirstSan = useMemo((): string | null => {
    try {
      const c = new Chess(puzzle.fen);
      const [opp, mine] = parseUciMoves(puzzle.moves);
      if (!opp || !mine) return null;
      c.move({ from: opp.from, to: opp.to, promotion: opp.promotion });
      return c.move({ from: mine.from, to: mine.to, promotion: mine.promotion }).san;
    } catch {
      return null;
    }
  }, [puzzle.fen, puzzle.moves]);

  // Determine which color the user plays (opposite of who moves first in the FEN)
  const fenTurn = puzzle.fen.split(' ')[1];
  const userColor: 'white' | 'black' = fenTurn === 'w' ? 'black' : 'white';
  const lineWalk = useLineWalk(userColor);

  // GROUNDED solve geometry (David 2026-06-28): replay the puzzle to compute
  // what the FINAL (solving) move actually does — "forks the king and rook",
  // "wins the queen" — so the solve narration speaks the real tactic instead
  // of the banned generic "Excellent! Puzzle solved!" (voice rule #5). The
  // line ends on the solver's (userColor) decisive move.
  const solveGeometry = useMemo((): string | null => {
    try {
      const c = new Chess(puzzle.fen);
      const moves = parseUciMoves(puzzle.moves);
      if (moves.length === 0) return null;
      let fenBeforeLast = puzzle.fen;
      let lastSan = '';
      for (const m of moves) {
        fenBeforeLast = c.fen();
        const r = c.move({ from: m.from, to: m.to, promotion: m.promotion });
        lastSan = r.san;
      }
      if (!lastSan) return null;
      return describeMoveGeometry(fenBeforeLast, lastSan, userColor);
    } catch {
      return null;
    }
  }, [puzzle.fen, puzzle.moves, userColor]);

  // The CONCEPT behind the solution — computed board mechanics + the general
  // idea from the concept corpus (G0, no LLM). Shared teaching for every puzzle
  // surface; taught at the terminal state below.
  const conceptExplanation = useMemo(
    () => explainPuzzleConcept({
      fen: puzzle.fen,
      solutionUci: puzzle.moves.trim().split(/\s+/),
      themes: puzzle.themes,
    }),
    [puzzle.fen, puzzle.moves, puzzle.themes],
  );

  // Game state owned at page level — ControlledChessBoard renders from this
  const game = useChessGame(puzzle.fen, userColor);

  // Publish board context for global coach drawer
  useBoardContext(game.fen, '', 0, userColor, game.turn);

  // Use Lichess curated themes for tactic type (more accurate than pattern matching)
  const tacticType = useMemo(() => getTacticTypeFromThemes(puzzle.themes), [puzzle.themes]);
  const themeLabel = useMemo(
    () => (focusThemes && focusThemes.length > 0 ? focusThemeLabel(puzzle.themes, focusThemes) : null)
      ?? getPrimaryThemeLabel(puzzle.themes),
    [puzzle.themes, focusThemes],
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

  // "TEACH ME THIS POSITION" — the one read every surface shares, fed by the
  // student's whole record through the one deciding door. Before the answer it
  // teaches the position and withholds the move; once resolved, the full read.
  const teach = usePositionNarration({
    fen: solverFen,
    pgn: '',
    moveNumber: Number(solverFen.split(' ')[5] ?? 1),
    playerColor: userColor,
    openingName: null,
    corpusNotes: true, // the tactics drill is a kept corpus surface
    withhold: terminal ? null : solverFirstSan,
  });
  const handleTeach = useCallback((): void => {
    // Taught before answering → the answer is recorded as prompted.
    if (!answeredRef.current) hintUsedRef.current = true;
    voiceService.stop();
    void teach.narrate();
  }, [teach]);
  useEffect(() => {
    if (teach.currentText) setSubtitle(teach.currentText);
  }, [teach.currentText]);

  const { reset: resetStruggle } = useStruggleDetection({
    tacticType,
    playerRating: activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING,
    active: state === 'playing',
    // On the ladder (hintOnMiss) each miss already speaks its rung — the
    // struggle coach reacting to the same miss talked over it and pinned the
    // ladder at rung one. It keeps its stuck-too-long nudge.
    wrongAttempts: hintOnMiss ? 0 : wrongAttemptCount,
    onCoach: handleStruggleCoach,
    earnedMethod: () => puzzleMethodLine(solverFirstSan, cpFromThemes(puzzle.themes), saidHabitsRef.current, recordRef.current),
  });

  // Derive the expected move for the hint system
  const knownMove = useMemo((): { from: string; to: string; san: string } | null => {
    if (state !== 'playing') return null;
    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return null;
    const expected = allMoves[moveIndex];

    // Get the SAN for the expected move
    try {
      const chess = new Chess(game.fen);
      const result = chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      chess.undo();
      return { from: expected.from, to: expected.to, san: result.san };
    } catch {
      return { from: expected.from, to: expected.to, san: '' };
    }
  }, [state, moveIndex, game.fen]);

  // Hint system
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen: game.fen,
    playerColor: userColor,
    enabled: settings.showHints && state === 'playing',
    knownMove,
    puzzleThemes: puzzle.themes,
  });

  // Track hint usage
  const handleRequestHint = useCallback((): void => {
    hintUsedRef.current = true;
    moveAssistedRef.current = true;
    requestHint();
  }, [requestHint]);

  // Trigger flash animation helper
  const triggerFlash = useCallback((cls: string): void => {
    setFlashClass('');
    // Force reflow to re-trigger animation
    requestAnimationFrame(() => {
      setFlashClass(cls);
    });
  }, []);

  // Reset state when puzzle changes
  useEffect(() => {
    game.loadFen(puzzle.fen);
    game.setOrientation(userColor);
    movesRef.current = parseUciMoves(puzzle.moves);
    setMoveIndex(0);
    setPipsDone(0);
    setMissedPip(false);
    setLastMoveHighlight(null);
    setLineArrows([]);
    setWalkable(null);
    setFlashClass('');
    hasMadeMistakeRef.current = false;
    wrongAttemptsRef.current = 0;
    hintUsedRef.current = false;
    showedSolutionRef.current = false;
    cleanMovesRef.current = 0;
    moveAssistedRef.current = false;
    moveWrongRef.current = 0;
    setLadderTop(false);
    setTerminalId(null);
    tryTokenRef.current += 1;
    answeredRef.current = false;
    setState('loading');
    resetHints();
    setSubtitle('');
    setWrongAttemptCount(0);
    resetStruggle();
    void voiceService.warmup();

    // Auto-play the first move (opponent sets up the puzzle)
    const timer = setTimeout(() => {
      const moves = movesRef.current;
      const firstMove = moves.length > 0 ? moves[0] : undefined;
      if (firstMove) {
        const result = game.makeMove(firstMove.from, firstMove.to, firstMove.promotion);
        if (result) {
          playMoveSound(result.san);
          setLastMoveHighlight({ from: firstMove.from, to: firstMove.to });
        }
      }
      setMoveIndex(1);
      solveStartRef.current = Date.now();
      setState('playing');
    }, 600);

    return () => {
      clearTimeout(timer);
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
      voiceService.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, playMoveSound, resetHints, resetStruggle]);

  // TEACH THE CONCEPT when the puzzle resolves (solved or shown) — the computed
  // explanation of WHY the solution works, not just the grounded geometry of
  // the last move. Speaks the concept (mechanics + the general idea) once per
  // puzzle; falls back to the solve geometry when no concept explanation is
  // computable, and to silence when neither is (voice rule #5, no filler).
  // Verbosity-gated via voiceService.speak (speakInternal honours the setting).
  // The computed text reaches the voice through the voiceFacts chokepoint
  // (preferRaw — the prose is already computed, nothing is re-phrased).
  const puzzleIdRef = useRef(puzzle.id);
  puzzleIdRef.current = puzzle.id;
  useEffect(() => {
    if (!settings.voiceEnabled || !terminal || conceptSpokenRef.current === puzzle.id) return;
    conceptSpokenRef.current = puzzle.id;
    const line = conceptExplanation?.spoken
      ?? (state === 'correct' && solveGeometry ? `That ${solveGeometry}.` : null);
    if (!line) return;
    const id = puzzle.id;
    void voiceComputed(line).then((say) => {
      if (puzzleIdRef.current !== id) return; // a newer puzzle owns the voice
      void voiceService.speak(say, { sentenceFirst: true });
    });
  }, [terminal, puzzle.id, state, settings.voiceEnabled, solveGeometry, conceptExplanation]);

  // Complete the puzzle with outcome metadata
  const completePuzzle = useCallback((correct: boolean): void => {
    setTerminalId(puzzle.id); // resolved — teach the concept (render + speak below)
    if (tacticType && tacticType !== 'tactical_sequence') {
      recordTacticOutcome({
        tacticType,
        found: correct,
        wasCoached: subtitle !== '',
        context: 'drill',
      });
    }
    // Free-tier meter: count this puzzle against the 20-bucket once (guarded by
    // id so a double terminal can't double-decrement). No-op for Pro / gate-off.
    if (consumedIdRef.current !== puzzle.id) {
      consumedIdRef.current = puzzle.id;
      meter.consume();
      // DUAL-USE (David 2026-10-01): a puzzle that ends unsolved is a miss of
      // its motif — recorded once, as weaker evidence than a game miss.
      if (!correct) {
        let solveFen = puzzle.fen;
        try {
          const c = new Chess(puzzle.fen);
          const first = movesRef.current[0];
          if (first) c.move({ from: first.from, to: first.to, promotion: first.promotion });
          solveFen = c.fen();
        } catch { /* the setup FEN is the honest fallback */ }
        void recordPuzzleMiss({ puzzleId: puzzle.id, themes: puzzle.themes, fen: solveFen, rating: puzzle.rating, surface });
        // …and into the misconception bucket the moment it fails, as Game
        // Review logs a fall-off (display row; the spine weight is the miss).
        void logPuzzleMisconception({ puzzleId: puzzle.id, themes: puzzle.themes, fen: solveFen, bestSan: solverFirstSan });
      }
    }
    onComplete({
      correct,
      usedHint: hintUsedRef.current,
      hadRetry: hasMadeMistakeRef.current,
      showedSolution: showedSolutionRef.current,
      cleanMoves: cleanMovesRef.current,
      solveTimeMs: Date.now() - solveStartRef.current,
    });
  }, [onComplete, tacticType, subtitle, puzzle.id, puzzle.fen, puzzle.themes, puzzle.rating, surface, meter, solverFirstSan]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (state !== 'playing' || disabled) return;
    setLineArrows([]); // the last line's moves belong to the last position
    setWalkable(null);
    lineWalk.clear();

    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return;
    const expected = allMoves[moveIndex];

    const isCorrect = move.from === expected.from && move.to === expected.to && (!expected.promotion || move.promotion === expected.promotion);

    // Tier 1 analytic emit — every move input (correct or wrong) lands
    // a `move-attempt` event with the FEN of the position the student
    // was solving (derived via chess.js undo since `game.fen` is the
    // post-attempt state). Pairs with `hint-revealed` via FEN equality
    // in analyticsService.recentHintActivity for hint effectiveness.
    // Drives analyticsService.moveAttemptsPerPuzzle aggregation.
    // The board BEFORE this attempt, rebuilt from the puzzle line: the
    // solution moves already played from `puzzle.fen`. The old version undid
    // on a fresh Chess with no history (a no-op), so this always held the
    // board AFTER the attempt — wrong for the analytics join, and wrong for
    // reading what the try runs into.
    let fenBeforeAttempt = game.fen;
    try {
      const replay = new Chess(puzzle.fen);
      for (const m of movesRef.current.slice(0, moveIndex)) {
        replay.move({ from: m.from, to: m.to, promotion: m.promotion });
      }
      fenBeforeAttempt = replay.fen();
    } catch {
      // Keep the post-attempt fen — still a usable key for the join.
    }
    const timeFromStart = Date.now() - solveStartRef.current;
    void logAppAudit({
      kind: 'move-attempt',
      category: 'subsystem',
      source: 'PuzzleBoard.handleMove',
      summary: `${isCorrect ? '✓' : '✗'} ${move.san} (expected ${expected.from}${expected.to})`,
      details: JSON.stringify({
        surface: 'puzzle',
        fen: fenBeforeAttempt,
        attemptedSan: move.san,
        correctSan: `${expected.from}${expected.to}${expected.promotion ?? ''}`,
        isCorrect,
        moveMethod: 'unknown',
        timeFromPositionEnterMs: timeFromStart,
        sourceId: puzzle.id,
        tacticType: tacticType ?? undefined,
      }),
      fen: fenBeforeAttempt,
    });

    // CLOSE THE RECORD (2026-10-01): Lichess puzzles wrote nothing to the
    // student model — solve fifty pins and the coach never learned it.
    const firstAnswer = !answeredRef.current;
    answeredRef.current = true;
    if (firstAnswer && isCorrect) {
      void recordCapabilityEvidence({
        fenBefore: fenBeforeAttempt, playedSan: move.san, moverColor: userColor,
        cpLoss: 0, origin: 'puzzle', prompted: hintUsedRef.current,
      });
    }

    if (isCorrect) {
      if (!moveAssistedRef.current) cleanMovesRef.current += 1;
      moveAssistedRef.current = false;
      moveWrongRef.current = 0;
      setLadderTop(false);
      playMoveSound(move.san);
      resetHints();
      setLastMoveHighlight({ from: move.from, to: move.to });
      const nextIndex = moveIndex + 1;
      const step = pipsDone;
      setPipsDone(step + 1);
      setMissedPip(false);

      // Check if puzzle is fully solved
      if (nextIndex >= movesRef.current.length) {
        captureEvent('puzzle_solved', {
          puzzle_id: puzzle.id,
          themes: puzzle.themes,
          rating: puzzle.rating,
        });
        setState('correct');
        triggerFlash('board-flash-success');
        reward({ kind: 'solved', square: move.to, step, seed });
        completionTimerRef.current = setTimeout(() => {
          completePuzzle(true);
        }, 2500);
        return;
      }

      reward({ kind: 'pip', square: move.to, step, seed: seed + step });

      // Auto-play opponent's response
      if (nextIndex < allMoves.length) {
        const opponentMove = allMoves[nextIndex];
        setTimeout(() => {
          const result = game.makeMove(opponentMove.from, opponentMove.to, opponentMove.promotion);
          if (result) {
            playMoveSound(result.san);
            setLastMoveHighlight({ from: opponentMove.from, to: opponentMove.to });
          }
          setMoveIndex(nextIndex + 1);
        }, 400);
      }
    } else {
      // Wrong move — undo, flash red, play error sound
      hasMadeMistakeRef.current = true;
      moveAssistedRef.current = true;
      wrongAttemptsRef.current += 1;
      setWrongAttemptCount((c) => c + 1);
      game.undoMove();
      triggerFlash('board-flash-error');
      setMissedPip(true);
      reward({ kind: 'miss' });
      moveWrongRef.current += 1;
      // THE LADDER is the puzzle's own graded rungs (theme → piece → square),
      // one per wrong try ON THIS MOVE. Not the hint button: that one is "one
      // tap = the answer" (David 2026-09-06), which on a miss skipped every
      // rung and handed the move over (hand walk 2026-10-02).
      if (hintOnMiss && moveWrongRef.current >= 3) setLadderTop(true);

      // Record the failure at max wrong attempts, but don't lock the board
      if (wrongAttemptsRef.current === maxWrongAttempts) completePuzzle(false);

      setState('incorrect');
      voiceService.stop();

      // WHY THE TRY FAILS first (Learn's weighing, brought to puzzles — hand
      // walk 2026-10-01): "Qe3? Then Bxg5, winning your pawn on g5." The
      // template hint toward the answer stays as the fallback when the
      // refutation is quiet. A token drops a late engine read once a newer
      // try or a new puzzle has arrived.
      const tryToken = ++tryTokenRef.current;
      const expectedSan = (() => {
        try { return new Chess(fenBeforeAttempt).move({ from: expected.from, to: expected.to, promotion: expected.promotion })?.san; } catch { return undefined; }
      })();
      const hint = getWrongMoveHint(
        hintOnMiss ? moveWrongRef.current : wrongAttemptsRef.current,
        puzzle.themes,
        expected.from,
        expected.to,
        new Chess(fenBeforeAttempt),
      );
      wrongTryPendingRef.current = true;
      heldCoachRef.current = null;
      void readWrongTry(fenBeforeAttempt, move.san).catch(() => null).then((read) => {
        // A first answer that is genuinely wrong breaks the capability; one
        // that still wins ("also good") is not a failure and is not recorded.
        if (firstAnswer && read?.kind !== 'also-good') {
          void recordCapabilityEvidence({
            fenBefore: fenBeforeAttempt, playedSan: move.san, moverColor: userColor,
            cpLoss: cpFromThemes(puzzle.themes) ?? MISTAKE_CP, origin: 'puzzle', prompted: hintUsedRef.current,
          });
        }
        if (tryToken !== tryTokenRef.current) return;
        wrongTryPendingRef.current = false;
        const held = heldCoachRef.current;
        heldCoachRef.current = null;
        // ONE line per miss. On the ladder: why the try fails, the method,
        // then the next rung. Off it: the refutation (or the rung when the
        // try is quietly fine), then the method.
        // WHAT THE POSITION ASKS (David 2026-10-05: "keep pressing? defend
        // something? more pieces in the attack?") — the idea, never the move.
        // Their last move along the puzzle's own line leads (catalogue §1).
        const lastMove = moveIndex > 0 ? lastMoveAlong(puzzle.fen, allMoves.slice(0, moveIndex)) ?? undefined : undefined;
        const ask = read?.kind === 'also-good' ? null : positionAsk(fenBeforeAttempt, { bestSan: expectedSan, lastMove }).text;
        const line = hintOnMiss && read && read.kind !== 'also-good'
          ? composeWrongTryLine(read.text, ask, held, hint)
          : composeWrongTryLine(read?.text ?? hint, ask, held);
        setSubtitle(line);
        setWalkable(read?.kind === 'refuted' ? read.line ?? null : null);
        // Every move the line names, on the board: their punishing reply red,
        // your try none (it was just taken back).
        setLineArrows(spokenLineArrows(line, fenBeforeAttempt, {
          studentColor: userColor === 'white' ? 'w' : 'b',
          studentMovesAreBad: read?.kind !== 'also-good',
        }));
        voiceService.stop();
        if (settings.voiceEnabled) void voiceService.speak(line);
      });

      // Brief feedback then back to playing — user can keep trying.
      setTimeout(() => {
        setState('playing');
      }, 1000);
    }
  }, [state, disabled, moveIndex, pipsDone, seed, hintOnMiss, completePuzzle, playMoveSound, resetHints, triggerFlash, maxWrongAttempts, settings.voiceEnabled, puzzle.themes, puzzle.id, tacticType, game]);

  // With ControlledChessBoard, the move is already applied to the game object
  const handleChessBoardMove = handleMove;

  // Show Solution: play the remaining moves, each SAID AS IT LANDS (David
  // 2026-10-02: "Make sure the narrations fire at appropriate times (with the
  // moves)"). The line used to be read as one long sentence while the board
  // raced through it at 0.6s a move — the moves were over before the voice had
  // finished the first. Now each move waits for its own clause, then a beat.
  const solutionRunRef = useRef(0);
  useEffect(() => () => { solutionRunRef.current += 1; }, [puzzle.id]);
  const handleShowSolution = useCallback((): void => {
    if (state !== 'playing' && state !== 'incorrect') return;
    showedSolutionRef.current = true;
    const ex = conceptExplanation;
    const speakAlong = settings.voiceEnabled && ex !== null;
    // The synced read below replaces the whole-line read the concept card
    // would otherwise start.
    if (speakAlong) conceptSpokenRef.current = puzzle.id;
    setTerminalId(puzzle.id);

    const allMoves = movesRef.current;
    const from = moveIndex;
    const run = ++solutionRunRef.current;
    const stale = (): boolean => run !== solutionRunRef.current;
    const sleep = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
    const clauseAt = (i: number): string => (ex ? ex.clauses[i - ex.clausePlyStart] ?? '' : '');
    if (speakAlong) {
      voiceService.stop();
      void voiceService.prefetchAudio(allMoves.map((_, i) => clauseAt(i)).slice(from).filter(Boolean));
    }

    setState('loading'); // Disable interaction during solution playback
    // A local copy of the position, so each clause's arrows resolve from the
    // board BEFORE its move (the hook's fen is a render snapshot).
    const track = new Chess(game.fen);
    void (async () => {
      for (let i = from; i < allMoves.length; i += 1) {
        if (stale()) return;
        const move = allMoves[i];
        const fenBefore = track.fen();
        try { track.move({ from: move.from, to: move.to, promotion: move.promotion }); } catch { /* the board decides */ }
        const result = game.makeMove(move.from, move.to, move.promotion);
        if (result) {
          playMoveSound(result.san);
          setLastMoveHighlight({ from: move.from, to: move.to });
        }
        setMoveIndex(i + 1);
        const clause = speakAlong ? clauseAt(i) : '';
        // The move that just landed keeps its highlight; anything else the
        // clause names gets its arrow.
        setLineArrows(clause ? spokenLineArrows(clause, fenBefore, {
          studentColor: userColor === 'white' ? 'w' : 'b',
          exclude: [{ from: move.from, to: move.to }],
        }) : []);
        // Never faster than a readable move, never ahead of the voice.
        const say = clause ? await voiceComputed(clause) : '';
        if (stale()) return;
        await Promise.all([say ? voiceService.speak(say).catch(() => undefined) : null, sleep(600)]);
        if (clause) await sleep(250);
      }
      if (stale()) return;
      // The motif sentence rides the clause of the move that lands it; it is
      // said on its own only when that clause was already played (the student
      // found the key move before asking for the rest).
      const ideaRead = ex !== null && ex.ideaClause !== null && ex.ideaClause + ex.clausePlyStart >= from;
      if (speakAlong && ex.idea && !ideaRead) {
        const idea = await voiceComputed(ex.idea);
        if (!stale()) await voiceService.speak(idea).catch(() => undefined);
      }
      if (stale()) return;
      setState('incorrect');
      completionTimerRef.current = setTimeout(() => {
        completePuzzle(false);
      }, speakAlong ? 800 : 1500);
    })();
  }, [state, moveIndex, completePuzzle, playMoveSound, game, puzzle.id, conceptExplanation, settings.voiceEnabled, userColor]);

  return (
    <div className="space-y-3" data-testid="puzzle-board" data-puzzle-id={puzzle.id}>
      <PuzzleHeader total={totalMoves} done={pipsDone} difficulty={puzzle.rating} streak={streak} missed={missedPip}>
        {headerExtra}
      </PuzzleHeader>
      {/* Puzzle theme label — big neon text above the board */}
      {themeLabel && (
        <h2
          className="text-center text-2xl md:text-3xl font-extrabold tracking-wide uppercase drop-shadow-[0_0_12px_rgba(0,255,200,0.5)] text-cyan-400"
          data-testid="tactic-type-heading"
        >
          {themeLabel}
        </h2>
      )}
      <div ref={fitRef} style={fitStyle} className={`w-full md:max-w-[420px] mx-auto rounded-lg overflow-hidden ${flashClass}`} data-testid="board-wrapper">
        {lineWalk.walkFen ? (
          <ConsistentChessboard
            fen={lineWalk.walkFen}
            arrows={lineWalk.walkArrows}
            interactive={false}
            boardOrientation={userColor}
            showLastMoveHighlight
          />
        ) : (
        <ControlledChessBoard
          game={game}
          interactive={state === 'playing' && !disabled}
          showFlipButton={false}
          showVoiceMic={false}
          showUndoButton={false}
          showResetButton={false}
          onMove={handleChessBoardMove}
          highlightSquares={lastMoveHighlight}
          arrows={hintState.arrows.length > 0 ? hintState.arrows : lineArrows.length > 0 ? lineArrows : undefined}
          ghostMove={hintState.ghostMove}
        />
        )}
      </div>

      {/* Coaching subtitle from struggle detection */}
      {subtitle && state === 'playing' && (
        <p className="text-sm text-amber-400 px-1" data-testid="coaching-subtitle">
          {subtitle}
        </p>
      )}
      {walkable && state === 'playing' && (
        <div className="px-1"><WalkLineButton line={walkable} onWalk={lineWalk.walk} testId="puzzle-walk-line-btn" /></div>
      )}

      {/* ONE control row (David 2026-10-04: on a short phone the old two rows
          pushed Hint / Show solution under the bottom nav). The puzzle's own
          buttons on the left, Flip and Ask on the right; every label one line.
          After it resolves, the full read stays one tap away. */}
      <div ref={keepRef} className="flex flex-wrap items-center gap-1.5">
        {state === 'playing' && (
          <div className="flex min-w-0 items-center gap-1.5" data-testid="puzzle-controls">
            {settings.showHints && (
              <div className="flex flex-col items-start gap-2" data-testid="puzzle-hint-area">
                <HintButton
                  currentLevel={hintState.level}
                  onRequestHint={handleRequestHint}
                  disabled={hintState.isAnalyzing}
                />
              </div>
            )}
            <button
              onClick={handleTeach}
              disabled={teach.isNarrating}
              className="flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs text-theme-text-muted hover:text-theme-text rounded-lg border border-theme-border hover:bg-theme-surface transition-colors disabled:opacity-50"
              data-testid="teach-position-button"
            >
              {teach.isNarrating ? 'Reading…' : 'Teach'}
            </button>
            <button
              onClick={handleShowSolution}
              className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${ladderTop ? 'animate-pulse border-amber-400/60 text-amber-200 bg-amber-500/10' : 'text-theme-text-muted hover:text-theme-text border-theme-border hover:bg-theme-surface'}`}
              data-testid="show-solution-button"
            >
              <Eye size={14} />
              Solution
            </button>
          </div>
        )}
        {terminal && (
          <button
            onClick={handleTeach}
            disabled={teach.isNarrating}
            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs text-theme-text-muted hover:text-theme-text rounded-lg border border-theme-border hover:bg-theme-surface transition-colors disabled:opacity-50"
            data-testid="teach-position-button"
          >
            {teach.isNarrating ? 'Reading the position…' : 'Teach me this position'}
          </button>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            onClick={game.flipBoard}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-theme-surface text-theme-text-muted hover:bg-theme-border hover:text-theme-text transition-colors"
            title="Flip board"
            aria-label="Flip board"
            data-testid="flip-button"
          >
            <RotateCcw size={14} />
          </button>
          <VoiceChatMic fen={game.position} turn={game.turn} playerColor={userColor} compact />
        </div>
      </div>
      {state === 'playing' && hintState.nudgeText && (
        <p className="text-xs text-amber-500" data-testid="hint-nudge">
          {hintState.nudgeText}
        </p>
      )}

      {/* Status message — only show for correct (incorrect uses flash-only feedback) */}
      {state === 'correct' && (
        <div className="flex flex-col items-center gap-0.5" style={{ color: 'var(--color-success)' }} data-testid="puzzle-correct">
          <span className="text-sm font-medium">Correct!</span>
          {solveGeometry && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }} data-testid="puzzle-solve-geometry">
              That {solveGeometry}.
            </span>
          )}
        </div>
      )}
      {/* Concept teaching — the WHY behind the solution, not just an arrow.
          Shown whenever the puzzle is resolved (solved or shown). Computed
          (G0): board mechanics + the general idea from the concept corpus. */}
      {terminal && conceptExplanation && (
        <div
          className="w-full max-w-md rounded-lg border border-theme-border bg-theme-surface/60 px-3 py-2 text-left"
          data-testid="puzzle-concept-explanation"
        >
          {conceptExplanation.conceptName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-accent mb-0.5">
              {conceptExplanation.conceptName}
            </p>
          )}
          <p className="text-sm text-theme-text">{conceptExplanation.spoken}</p>
        </div>
      )}
      {state === 'loading' && (
        <div className="text-sm text-theme-text-muted" data-testid="puzzle-loading">
          Setting up puzzle...
        </div>
      )}

    </div>
  );
}
