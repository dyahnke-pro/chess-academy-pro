import { useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useSettings } from '../../hooks/useSettings';
import { getBoardColor } from '../../services/boardColorService';
import {
  QUEEN_ARMY_LEVELS,
  initQueenArmyState,
  processQueenArmyMove,
  queenArmyPosition,
  queenArmyHighlights,
} from '../../services/queenGameEngine';
import type { QueenArmyState } from '../../services/queenGameEngine';

interface QueenVsArmyProps {
  onBack: () => void;
  onComplete: (level: number, won: boolean) => void;
}

export function QueenVsArmy({ onBack, onComplete }: QueenVsArmyProps): JSX.Element {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = QUEEN_ARMY_LEVELS[levelIndex];
  const [state, setState] = useState<QueenArmyState>(() => initQueenArmyState(level));
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const boardColors = useMemo(() => getBoardColor(settings.boardColor), [settings.boardColor]);

  const position = useMemo(() => queenArmyPosition(state), [state]);
  const highlights = useMemo(
    () => queenArmyHighlights(state, level),
    [state, level],
  );

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    for (const sq of highlights.promotionSquares) {
      styles[sq] = {
        background: 'rgba(239, 68, 68, 0.4)',
        borderRadius: '0',
      };
    }

    for (const sq of highlights.queenMoveSquares) {
      const existing = styles[sq] as React.CSSProperties | undefined;
      styles[sq] = {
        ...existing,
        background: existing
          ? 'rgba(239, 68, 68, 0.4)'
          : 'radial-gradient(circle, rgba(34, 197, 94, 0.5) 25%, transparent 25%)',
      };
    }

    return styles;
  }, [highlights]);

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }: { sourceSquare: string; targetSquare: string | null; piece: string }): boolean => {
      if (piece !== 'wQ') return false;
      if (state.status !== 'playing') return false;
      if (!targetSquare || sourceSquare === targetSquare) return false;

      const newState = processQueenArmyMove(state, targetSquare);
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
    setState(initQueenArmyState(level));
  }, [level]);

  const handleNextLevel = useCallback((): void => {
    const next = levelIndex + 1;
    if (next < QUEEN_ARMY_LEVELS.length) {
      setLevelIndex(next);
      const nextLevel = QUEEN_ARMY_LEVELS[next];
      setState(initQueenArmyState(nextLevel));
    } else {
      onBack();
    }
  }, [levelIndex, onBack]);

  const handleRetry = useCallback((): void => {
    setState(initQueenArmyState(level));
  }, [level]);

  const boardWidth = isMobile ? Math.min(window.innerWidth - 48, 360) : 400;

  return (
    <div
      className="flex flex-col items-center gap-4 p-4"
      style={{ color: 'var(--color-text)' }}
      data-testid="queen-vs-army"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="queen-army-back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold">Queen vs. Army — Level {level.id}</h2>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="queen-army-reset"
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
            Capture all pawns before they reach the top!
            <span className="block text-xs mt-1">
              Pawns remaining: {state.pawns.length} · Moves: {state.moveCount}
            </span>
          </>
        )}
      </div>

      {/* Board */}
      <div style={{ width: boardWidth }}>
        <Chessboard
          id="queen-vs-army"
          position={position}
          onPieceDrop={handleDrop}
          boardWidth={boardWidth}
          customDarkSquareStyle={{ backgroundColor: boardColors.darkSquare }}
          customLightSquareStyle={{ backgroundColor: boardColors.lightSquare }}
          customSquareStyles={customSquareStyles}
          animationDuration={200}
          arePiecesDraggable={state.status === 'playing'}
        />
      </div>

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
            data-testid="queen-army-result"
          >
            <span className="text-4xl">
              {state.status === 'won' ? '🎉' : '😢'}
            </span>
            <p className="text-xl font-bold">
              {state.status === 'won'
                ? 'You captured them all!'
                : 'A pawn got through!'}
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {state.status === 'won'
                ? `Completed in ${state.moveCount} moves`
                : 'Try again — plan your captures!'}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleRetry}
                className="px-6 py-2 rounded-xl font-bold"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                data-testid="queen-army-retry"
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
                  data-testid="queen-army-next"
                >
                  {levelIndex + 1 < QUEEN_ARMY_LEVELS.length
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
