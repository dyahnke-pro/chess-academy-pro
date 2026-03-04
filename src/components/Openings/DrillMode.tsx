import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { updateDrillProgress, updateWoodpecker } from '../../services/openingService';
import { speechService } from '../../services/speechService';
import type { OpeningRecord } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';
import { CheckCircle, XCircle, RotateCcw, ArrowRight, Timer, Repeat } from 'lucide-react';

export interface DrillModeProps {
  opening: OpeningRecord;
  onComplete: (correct: boolean) => void;
  onExit: () => void;
}

type DrillState = 'playing' | 'correct' | 'wrong';

export function DrillMode({ opening, onComplete, onExit }: DrillModeProps): JSX.Element {
  const expectedMoves = useMemo(() => {
    const tokens = opening.pgn.trim().split(/\s+/).filter(Boolean);
    const chess = new Chess();
    const moves: Array<{ san: string; from: string; to: string }> = [];
    for (const san of tokens) {
      try {
        const move = chess.move(san);
        moves.push({ san, from: move.from, to: move.to });
      } catch {
        break;
      }
    }
    return moves;
  }, [opening.pgn]);

  const [moveIndex, setMoveIndex] = useState(0);
  const [drillState, setDrillState] = useState<DrillState>('playing');
  const [message, setMessage] = useState('Play the correct move');
  const [boardKey, setBoardKey] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playCelebration, playEncouragement } = usePieceSound();

  const playerColor = opening.color;
  const isPlayerTurn = useCallback(
    (idx: number): boolean => {
      return playerColor === 'white' ? idx % 2 === 0 : idx % 2 === 1;
    },
    [playerColor],
  );

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (drillState === 'playing') {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [drillState]);

  const currentFen = useMemo((): string => {
    const chess = new Chess();
    for (let i = 0; i < moveIndex; i++) {
      try {
        chess.move(expectedMoves[i].san);
      } catch {
        break;
      }
    }
    return chess.fen();
  }, [moveIndex, expectedMoves]);

  // Auto-play opponent moves
  useEffect(() => {
    if (drillState !== 'playing') return;
    if (moveIndex >= expectedMoves.length) {
      setDrillState('correct');
      const timeSeconds = (Date.now() - startTimeRef.current) / 1000;
      const completionMsg = `Opening complete! ${Math.round(timeSeconds)} seconds.`;
      setMessage(completionMsg);
      playCelebration();
      speechService.speak(
        `Nice work! You completed the ${opening.name} in ${Math.round(timeSeconds)} seconds.`,
      );
      void updateDrillProgress(opening.id, true);
      void updateWoodpecker(opening.id, timeSeconds);
      onComplete(true);
      return;
    }
    if (!isPlayerTurn(moveIndex)) {
      const timer = setTimeout(() => {
        setMoveIndex((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [moveIndex, drillState, expectedMoves, isPlayerTurn, opening.id, opening.name, onComplete, playCelebration]);

  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (drillState !== 'playing') return;
      if (moveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[moveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        setMoveIndex((prev) => prev + 1);
        setMessage(`Correct! ${expected.san}`);
        // Find variation explanation if available
        const variation = opening.variations?.find((v) => {
          const varTokens = v.pgn.trim().split(/\s+/).filter(Boolean);
          return moveIndex < varTokens.length && varTokens[moveIndex] === expected.san;
        });
        if (variation) {
          speechService.speak(variation.explanation);
        }
      } else {
        setDrillState('wrong');
        const wrongMsg = `Incorrect. The correct move was ${expected.san}`;
        setMessage(wrongMsg);
        playEncouragement();
        speechService.speak(
          `That's not quite right. The correct move here is ${expected.san}.`,
        );
        void updateDrillProgress(opening.id, false);
        onComplete(false);
      }
    },
    [drillState, moveIndex, expectedMoves, opening, onComplete, playEncouragement],
  );

  const handleRetry = useCallback((): void => {
    setMoveIndex(0);
    setDrillState('playing');
    setMessage('Play the correct move');
    setBoardKey((k) => k + 1);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    speechService.stop();
  }, []);

  const progress = expectedMoves.length > 0
    ? Math.round((moveIndex / expectedMoves.length) * 100)
    : 0;

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4" data-testid="drill-mode">
      {/* Header with timer and Woodpecker stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-sm text-theme-text-muted">
            <Timer size={14} />
            <span data-testid="drill-timer">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Woodpecker stats */}
          {opening.woodpeckerReps > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-theme-text-muted">
              <Repeat size={14} />
              <span data-testid="woodpecker-reps">{opening.woodpeckerReps} reps</span>
              {opening.woodpeckerSpeed !== null && (
                <span className="text-xs">
                  (avg {Math.round(opening.woodpeckerSpeed)}s)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-theme-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-theme-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
          data-testid="drill-progress"
        />
      </div>

      {/* Status message */}
      <div className="flex items-center gap-2">
        {drillState === 'correct' && <CheckCircle size={18} className="text-green-500" />}
        {drillState === 'wrong' && <XCircle size={18} className="text-red-500" />}
        <span
          className={`text-sm font-medium ${
            drillState === 'correct'
              ? 'text-green-500'
              : drillState === 'wrong'
                ? 'text-red-500'
                : 'text-theme-text-muted'
          }`}
          data-testid="drill-message"
        >
          {message}
        </span>
      </div>

      {/* Board */}
      <div className="max-w-md">
        <ChessBoard
          key={boardKey}
          initialFen={currentFen}
          orientation={playerColor}
          interactive={drillState === 'playing' && isPlayerTurn(moveIndex)}
          showFlipButton={false}
          showUndoButton={false}
          showResetButton={false}
          onMove={handleMove}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {drillState !== 'playing' && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            data-testid="drill-retry"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
        )}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-theme-surface text-theme-text text-sm font-medium hover:bg-theme-border transition-colors"
          data-testid="drill-exit"
        >
          <ArrowRight size={14} />
          {drillState === 'correct' ? 'Next Opening' : 'Back to Explorer'}
        </button>
      </div>
    </div>
  );
}
