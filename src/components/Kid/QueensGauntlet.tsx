import { useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { BoardVoiceOverlay } from '../Board/BoardVoiceOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { getBoardColor } from '../../services/boardColorService';
import {
  QUEEN_GAUNTLET_LEVELS,
  initGauntletState,
  processGauntletMove,
  gauntletPosition,
  gauntletHighlights,
} from '../../services/queenGameEngine';
import type { QueenGauntletState } from '../../services/queenGameEngine';

interface QueensGauntletProps {
  onBack: () => void;
  onComplete: (level: number, won: boolean) => void;
}

export function QueensGauntlet({ onBack, onComplete }: QueensGauntletProps): JSX.Element {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = QUEEN_GAUNTLET_LEVELS[levelIndex];
  const [state, setState] = useState<QueenGauntletState>(() => initGauntletState(level));
  const { settings } = useSettings();
  const boardColors = useMemo(() => getBoardColor(settings.boardColor), [settings.boardColor]);

  const position = useMemo(() => gauntletPosition(state), [state]);

  const { attackedSquares, safeSquares } = useMemo(
    () => gauntletHighlights(state, level),
    [state, level],
  );

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    for (const sq of attackedSquares) {
      styles[sq] = {
        background: 'rgba(239, 68, 68, 0.35)',
        borderRadius: '0',
      };
    }

    for (const sq of safeSquares) {
      styles[sq] = {
        background: 'rgba(34, 197, 94, 0.3)',
        borderRadius: '0',
      };
    }

    // Target square always glows
    if (state.status === 'playing') {
      styles[state.target] = {
        ...styles[state.target],
        background: 'radial-gradient(circle, rgba(250, 204, 21, 0.7) 40%, rgba(250, 204, 21, 0.2) 70%)',
        boxShadow: 'inset 0 0 12px rgba(250, 204, 21, 0.6)',
      };
    }

    return styles;
  }, [attackedSquares, safeSquares, state.target, state.status]);

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }: { sourceSquare: string; targetSquare: string | null; piece: { pieceType: string } }): boolean => {
      if (piece.pieceType !== 'wQ') return false;
      if (state.status !== 'playing') return false;
      if (!targetSquare || sourceSquare === targetSquare) return false;

      const newState = processGauntletMove(state, targetSquare);
      if (newState === state) return false;

      setState(newState);

      if (newState.status === 'won' || newState.status === 'lost') {
        onComplete(level.id, newState.status === 'won');
      }

      return true;
    },
    [state, level, onComplete],
  );

  const handleReset = useCallback((): void => {
    setState(initGauntletState(level));
  }, [level]);

  const handleNextLevel = useCallback((): void => {
    const next = levelIndex + 1;
    if (next < QUEEN_GAUNTLET_LEVELS.length) {
      setLevelIndex(next);
      const nextLevel = QUEEN_GAUNTLET_LEVELS[next];
      setState(initGauntletState(nextLevel));
    } else {
      onBack();
    }
  }, [levelIndex, onBack]);

  const handleRetry = useCallback((): void => {
    setState(initGauntletState(level));
  }, [level]);

  return (
    <div
      className="flex flex-col items-center gap-4 p-4"
      style={{ color: 'var(--color-text)' }}
      data-testid="queens-gauntlet"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="gauntlet-back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold">Queen&apos;s Gauntlet — Level {level.id}</h2>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="gauntlet-reset"
          aria-label="Reset level"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Instructions */}
      <div
        className="text-center text-sm px-4 max-w-md"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {state.status === 'playing' && (
          <>
            Navigate your queen to the glowing square!
            <span className="block text-xs mt-1">
              Avoid attacked squares. Moves: {state.moveCount}
            </span>
          </>
        )}
      </div>

      {/* Board */}
      <BoardVoiceOverlay fen={position} className="w-full md:max-w-[420px]">
        <Chessboard
          options={{
            position,
            boardOrientation: 'white' as const,
            darkSquareStyle: { backgroundColor: boardColors.darkSquare },
            lightSquareStyle: { backgroundColor: boardColors.lightSquare },
            squareStyles: customSquareStyles,
            animationDurationInMs: 200,
            allowDragging: state.status === 'playing',
            onPieceDrop: handleDrop,
          }}
        />
      </BoardVoiceOverlay>

      {/* Win/Loss overlay */}
      <AnimatePresence>
        {state.status !== 'playing' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center gap-3 text-center"
            data-testid="gauntlet-result"
          >
            <span className="text-4xl">
              {state.status === 'won' ? '🎉' : '💥'}
            </span>
            <p className="text-xl font-bold">
              {state.status === 'won'
                ? 'You made it through!'
                : 'Your queen was captured!'}
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {state.status === 'won'
                ? `Navigated safely in ${state.moveCount} moves`
                : 'That square was attacked! Try a different path.'}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleRetry}
                className="px-6 py-2 rounded-xl font-bold"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                data-testid="gauntlet-retry"
              >
                Retry
              </button>
              {state.status === 'won' && (
                <button
                  onClick={handleNextLevel}
                  className="px-6 py-2 rounded-xl font-bold"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                  }}
                  data-testid="gauntlet-next"
                >
                  {levelIndex + 1 < QUEEN_GAUNTLET_LEVELS.length
                    ? 'Next Level'
                    : 'Done'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
