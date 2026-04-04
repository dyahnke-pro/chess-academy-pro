import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { HintButton } from '../Coach/HintButton';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useSettings } from '../../hooks/useSettings';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useStruggleDetection } from '../../hooks/useStruggleDetection';
import { Eye } from 'lucide-react';
import type { MoveResult } from '../../hooks/useChessGame';
import { useBoardContext } from '../../hooks/useBoardContext';
import { voiceService } from '../../services/voiceService';
import { getWrongMoveHint } from '../../utils/puzzleHints';
import { detectTacticType } from '../../services/missedTacticService';
import { recordTacticOutcome } from '../../services/tacticAlertService';
import { TACTIC_LABELS } from '../../services/tacticClassifierService';
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
  const [fen, setFen] = useState(puzzle.fen);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: string; to: string } | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const [flashClass, setFlashClass] = useState<string>('');
  const hasMadeMistakeRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  const hintUsedRef = useRef(false);
  const showedSolutionRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chessRef = useRef(new Chess(puzzle.fen));
  const movesRef = useRef(parseUciMoves(puzzle.moves));
  const { playMoveSound, playErrorPing, playSuccessChime } = usePieceSound();
  const { settings } = useSettings();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [subtitle, setSubtitle] = useState<string>('');
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);

  // Determine which color the user plays (opposite of who moves first in the FEN)
  const fenTurn = puzzle.fen.split(' ')[1];
  const userColor: 'white' | 'black' = fenTurn === 'w' ? 'black' : 'white';

  // Publish board context for global coach drawer
  useBoardContext(fen, '', 0, userColor, fen.split(' ')[1] === 'b' ? 'b' : 'w');

  // Detect tactic type from first player move (after opponent's setup move)
  const tacticType = useMemo(() => {
    const moves = parseUciMoves(puzzle.moves);
    if (moves.length < 2) return null;
    try {
      const chess = new Chess(puzzle.fen);
      const setupMove = moves[0];
      chess.move({ from: setupMove.from, to: setupMove.to, promotion: setupMove.promotion });
      const playerFen = chess.fen();
      const playerMove = moves[1];
      return detectTacticType(playerFen, `${playerMove.from}${playerMove.to}${playerMove.promotion ?? ''}`);
    } catch {
      return null;
    }
  }, [puzzle.fen, puzzle.moves]);

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
      const chess = new Chess(fen);
      const result = chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      chess.undo();
      return { from: expected.from, to: expected.to, san: result.san };
    } catch {
      return { from: expected.from, to: expected.to, san: '' };
    }
  }, [state, moveIndex, fen]);

  // Hint system
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen,
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
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    movesRef.current = parseUciMoves(puzzle.moves);
    setMoveIndex(0);
    setFen(puzzle.fen);
    setLastMoveHighlight(null);
    setBoardKey((k) => k + 1);
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
        try {
          const result = chess.move({ from: firstMove.from, to: firstMove.to, promotion: firstMove.promotion });
          playMoveSound(result.san);
          setFen(chess.fen());
          setLastMoveHighlight({ from: firstMove.from, to: firstMove.to });
          setBoardKey((k) => k + 1);
        } catch {
          // Invalid move in puzzle data - skip
        }
      }
      setMoveIndex(1);
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
          try {
            const result = chessRef.current.move({
              from: opponentMove.from,
              to: opponentMove.to,
              promotion: opponentMove.promotion,
            });
            playMoveSound(result.san);
            setLastMoveHighlight({ from: opponentMove.from, to: opponentMove.to });
            setFen(chessRef.current.fen());
            setBoardKey((k) => k + 1);
          } catch {
            // skip
          }
          setMoveIndex(nextIndex + 1);
        }, 400);
      }
    } else {
      // Wrong move — undo, flash red, play error sound
      hasMadeMistakeRef.current = true;
      wrongAttemptsRef.current += 1;
      setWrongAttemptCount((c) => c + 1);
      chessRef.current.undo();
      setFen(chessRef.current.fen());
      setBoardKey((k) => k + 1);
      triggerFlash('board-flash-error');
      playErrorPing();

      // Check if max wrong attempts reached
      if (wrongAttemptsRef.current >= maxWrongAttempts) {
        setState('incorrect');
        voiceService.stop();
        // Auto-fail after max wrong attempts
        completionTimerRef.current = setTimeout(() => {
          completePuzzle(false);
        }, 1200);
        return;
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
          chessRef.current,
        );
        void voiceService.speak(hint);
      }

      // Brief feedback then back to playing
      setTimeout(() => {
        setState('playing');
      }, 1000);
    }
  }, [state, disabled, moveIndex, completePuzzle, playMoveSound, playErrorPing, playSuccessChime, resetHints, triggerFlash, maxWrongAttempts, settings.voiceEnabled, puzzle.themes]);

  const handleChessBoardMove = useCallback((moveResult: MoveResult): void => {
    try {
      chessRef.current.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
    } catch {
      // Move already applied or invalid — ignore
    }
    handleMove(moveResult);
  }, [handleMove]);

  // Show Solution: auto-play remaining moves and mark as failed
  const handleShowSolution = useCallback((): void => {
    if (state !== 'playing' && state !== 'incorrect') return;
    showedSolutionRef.current = true;

    // Play remaining moves in sequence
    const allMoves = movesRef.current;
    let currentIndex = moveIndex;
    const chess = chessRef.current;

    const playNextMove = (): void => {
      if (currentIndex >= allMoves.length) {
        setState('incorrect');
        completionTimerRef.current = setTimeout(() => {
          completePuzzle(false);
        }, 1500);
        return;
      }

      const move = allMoves[currentIndex];
      try {
        const result = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        playMoveSound(result.san);
        setLastMoveHighlight({ from: move.from, to: move.to });
        setFen(chess.fen());
        setBoardKey((k) => k + 1);
      } catch {
        // skip
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
  }, [state, moveIndex, completePuzzle, playMoveSound]);

  return (
    <div className="space-y-3" data-testid="puzzle-board">
      <div className={`w-full md:max-w-[420px] mx-auto rounded-lg overflow-hidden ${flashClass}`} data-testid="board-wrapper">
        <ChessBoard
          initialFen={fen}
          key={boardKey}
          orientation={userColor}
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
        {tacticType && tacticType !== 'tactical_sequence' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium" data-testid="tactic-type-badge">
            {TACTIC_LABELS[tacticType]}
          </span>
        )}
        <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
        <span>{puzzle.themes.slice(0, 3).join(', ')}</span>
      </div>
    </div>
  );
}
