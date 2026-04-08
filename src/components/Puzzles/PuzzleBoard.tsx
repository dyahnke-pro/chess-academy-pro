import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { HintButton } from '../Coach/HintButton';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useSettings } from '../../hooks/useSettings';
import { useChessGame } from '../../hooks/useChessGame';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useStruggleDetection } from '../../hooks/useStruggleDetection';
import { Eye } from 'lucide-react';
import type { MoveResult } from '../../hooks/useChessGame';
import { useBoardContext } from '../../hooks/useBoardContext';
import { voiceService } from '../../services/voiceService';
import { getWrongMoveHint } from '../../utils/puzzleHints';
import { recordTacticOutcome } from '../../services/tacticAlertService';
import { getTacticTypeFromThemes, getPrimaryThemeLabel } from '../../services/tacticClassifierService';
import { useAppStore } from '../../stores/appStore';
import type { CoachingTier } from '../../services/tacticAlertService';
import type { PuzzleRecord } from '../../types';

type PuzzleState = 'loading' | 'playing' | 'correct' | 'incorrect';

/** Outcome metadata passed to the parent on puzzle completion. */
export interface PuzzleOutcome {
  correct: boolean;
  usedHint: boolean;
  /** True if the player needed more than one attempt on any move. */
  hadRetry: boolean;
  /** True if the player explicitly viewed the solution. */
  showedSolution: boolean;
  /** Time from first player move opportunity to completion (ms). */
  solveTimeMs: number;
}

interface PuzzleBoardProps {
  puzzle: PuzzleRecord;
  onComplete: (outcome: PuzzleOutcome) => void;
  disabled?: boolean;
  /** Maximum wrong attempts before auto-failing the puzzle (default: 2). */
  maxWrongAttempts?: number;
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
}: PuzzleBoardProps): JSX.Element {
  const [state, setState] = useState<PuzzleState>('loading');
  const [moveIndex, setMoveIndex] = useState(0);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: string; to: string } | null>(null);
  const [flashClass, setFlashClass] = useState<string>('');
  const hasMadeMistakeRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  const hintUsedRef = useRef(false);
  const showedSolutionRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solveStartRef = useRef<number>(Date.now());
  const movesRef = useRef(parseUciMoves(puzzle.moves));
  const { playMoveSound, playErrorPing, playSuccessChime } = usePieceSound();
  const { settings } = useSettings();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [subtitle, setSubtitle] = useState<string>('');
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);

  // Determine which color the user plays (opposite of who moves first in the FEN)
  const fenTurn = puzzle.fen.split(' ')[1];
  const userColor: 'white' | 'black' = fenTurn === 'w' ? 'black' : 'white';

  // Game state owned at page level — ControlledChessBoard renders from this
  const game = useChessGame(puzzle.fen, userColor);

  // Publish board context for global coach drawer
  useBoardContext(game.fen, '', 0, userColor, game.turn);

  // Use Lichess curated themes for tactic type (more accurate than pattern matching)
  const tacticType = useMemo(() => getTacticTypeFromThemes(puzzle.themes), [puzzle.themes]);
  const themeLabel = useMemo(() => getPrimaryThemeLabel(puzzle.themes), [puzzle.themes]);

  // Proactive struggle detection — coach speaks up when player is stuck
  const handleStruggleCoach = useCallback((message: string, _tier: CoachingTier) => {
    voiceService.stop();
    setSubtitle(message);
    void voiceService.speak(message);
  }, []);

  const { reset: resetStruggle } = useStruggleDetection({
    tacticType,
    playerRating: activeProfile?.currentRating ?? 1200,
    active: state === 'playing',
    wrongAttempts: wrongAttemptCount,
    onCoach: handleStruggleCoach,
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
    setLastMoveHighlight(null);
    setFlashClass('');
    hasMadeMistakeRef.current = false;
    wrongAttemptsRef.current = 0;
    hintUsedRef.current = false;
    showedSolutionRef.current = false;
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

  // Voice feedback on correct solve (respects user voice setting)
  useEffect(() => {
    if (!settings.voiceEnabled) return;
    if (state === 'correct') void voiceService.speak('Excellent! Puzzle solved!');
  }, [state, settings.voiceEnabled]);

  // Complete the puzzle with outcome metadata
  const completePuzzle = useCallback((correct: boolean): void => {
    if (tacticType && tacticType !== 'tactical_sequence') {
      recordTacticOutcome({
        tacticType,
        found: correct,
        wasCoached: subtitle !== '',
        context: 'drill',
      });
    }
    onComplete({
      correct,
      usedHint: hintUsedRef.current,
      hadRetry: hasMadeMistakeRef.current,
      showedSolution: showedSolutionRef.current,
      solveTimeMs: Date.now() - solveStartRef.current,
    });
  }, [onComplete, tacticType, subtitle]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (state !== 'playing' || disabled) return;

    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return;
    const expected = allMoves[moveIndex];

    const isCorrect = move.from === expected.from && move.to === expected.to && (!expected.promotion || move.promotion === expected.promotion);

    if (isCorrect) {
      playMoveSound(move.san);
      resetHints();
      setLastMoveHighlight({ from: move.from, to: move.to });
      const nextIndex = moveIndex + 1;

      // Check if puzzle is fully solved
      if (nextIndex >= movesRef.current.length) {
        setState('correct');
        triggerFlash('board-flash-success');
        playSuccessChime();
        completionTimerRef.current = setTimeout(() => {
          completePuzzle(true);
        }, 2500);
        return;
      }

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
      wrongAttemptsRef.current += 1;
      setWrongAttemptCount((c) => c + 1);
      game.undoMove();
      triggerFlash('board-flash-error');
      playErrorPing();

      // Record the failure at max wrong attempts, but don't lock the board
      if (wrongAttemptsRef.current === maxWrongAttempts) {
        completePuzzle(false);
      }

      setState('incorrect');
      voiceService.stop();

      // Progressive voice hint based on attempt count and puzzle themes
      if (settings.voiceEnabled) {
        const hint = getWrongMoveHint(
          wrongAttemptsRef.current,
          puzzle.themes,
          expected.from,
          expected.to,
          new Chess(game.fen),
        );
        void voiceService.speak(hint);
      }

      // Brief feedback then back to playing — user can keep trying
      setTimeout(() => {
        setState('playing');
      }, 1000);
    }
  }, [state, disabled, moveIndex, completePuzzle, playMoveSound, playErrorPing, playSuccessChime, resetHints, triggerFlash, maxWrongAttempts, settings.voiceEnabled, puzzle.themes, game]);

  // With ControlledChessBoard, the move is already applied to the game object
  const handleChessBoardMove = handleMove;

  // Show Solution: auto-play remaining moves and mark as failed
  const handleShowSolution = useCallback((): void => {
    if (state !== 'playing' && state !== 'incorrect') return;
    showedSolutionRef.current = true;

    // Play remaining moves in sequence
    const allMoves = movesRef.current;
    let currentIndex = moveIndex;

    const playNextMove = (): void => {
      if (currentIndex >= allMoves.length) {
        setState('incorrect');
        completionTimerRef.current = setTimeout(() => {
          completePuzzle(false);
        }, 1500);
        return;
      }

      const move = allMoves[currentIndex];
      const result = game.makeMove(move.from, move.to, move.promotion);
      if (result) {
        playMoveSound(result.san);
        setLastMoveHighlight({ from: move.from, to: move.to });
      }
      currentIndex += 1;
      setMoveIndex(currentIndex);

      if (currentIndex < allMoves.length) {
        setTimeout(playNextMove, 600);
      } else {
        setState('incorrect');
        completionTimerRef.current = setTimeout(() => {
          completePuzzle(false);
        }, 1500);
      }
    };

    setState('loading'); // Disable interaction during solution playback
    playNextMove();
  }, [state, moveIndex, completePuzzle, playMoveSound, game]);

  return (
    <div className="space-y-3" data-testid="puzzle-board">
      {/* Puzzle theme label — big neon text above the board */}
      {themeLabel && (
        <h2
          className="text-center text-2xl md:text-3xl font-extrabold tracking-wide uppercase drop-shadow-[0_0_12px_rgba(0,255,200,0.5)] text-cyan-400"
          data-testid="tactic-type-heading"
        >
          {themeLabel}
        </h2>
      )}
      <div className={`w-full md:max-w-[420px] mx-auto rounded-lg overflow-hidden ${flashClass}`} data-testid="board-wrapper">
        <ControlledChessBoard
          game={game}
          interactive={state === 'playing' && !disabled}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={handleChessBoardMove}
          highlightSquares={lastMoveHighlight}
          arrows={hintState.arrows.length > 0 ? hintState.arrows : undefined}
          ghostMove={hintState.ghostMove}
        />
      </div>

      {/* Coaching subtitle from struggle detection */}
      {subtitle && state === 'playing' && (
        <p className="text-sm text-amber-400 px-1" data-testid="coaching-subtitle">
          {subtitle}
        </p>
      )}

      {/* Hint + Show Solution controls */}
      {state === 'playing' && (
        <div className="flex items-center gap-3" data-testid="puzzle-controls">
          {settings.showHints && (
            <div className="flex flex-col items-start gap-2" data-testid="puzzle-hint-area">
              <HintButton
                currentLevel={hintState.level}
                onRequestHint={handleRequestHint}
                disabled={hintState.isAnalyzing}
              />
              {hintState.nudgeText && (
                <p className="text-xs text-amber-500 max-w-sm" data-testid="hint-nudge">
                  {hintState.nudgeText}
                </p>
              )}
            </div>
          )}
          <button
            onClick={handleShowSolution}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-theme-text-muted hover:text-theme-text rounded-lg border border-theme-border hover:bg-theme-surface transition-colors"
            data-testid="show-solution-button"
          >
            <Eye size={14} />
            Show Solution
          </button>
        </div>
      )}

      {/* Status message — only show for correct (incorrect uses flash-only feedback) */}
      {state === 'correct' && (
        <div className="flex items-center gap-2" style={{ color: 'var(--color-success)' }} data-testid="puzzle-correct">
          <span className="text-sm font-medium">Correct!</span>
        </div>
      )}
      {state === 'loading' && (
        <div className="text-sm text-theme-text-muted" data-testid="puzzle-loading">
          Setting up puzzle...
        </div>
      )}

      {/* Puzzle info with rating badge + tactic type */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-surface font-semibold text-theme-text ${flashClass.includes('success') || state === 'correct' ? 'rating-bump' : ''}`}
          data-testid="puzzle-rating-badge"
        >
          Puzzle Rating: {puzzle.rating}
        </span>
      </div>
    </div>
  );
}
