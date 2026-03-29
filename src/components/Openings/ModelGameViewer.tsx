import { useState, useCallback, useMemo, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PlayCircle,
  PauseCircle,
  Star,
} from 'lucide-react';
import type { ModelGame, ModelGameCriticalMoment, AnnotationArrow } from '../../types';

interface ModelGameViewerProps {
  game: ModelGame;
  boardOrientation: 'white' | 'black';
  onExit: () => void;
}

interface ParsedMove {
  san: string;
  fen: string;
  moveNumber: number;
  isWhite: boolean;
}

function parseGameMoves(pgn: string): ParsedMove[] {
  const chess = new Chess();
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const moves: ParsedMove[] = [];

  for (const san of tokens) {
    try {
      chess.move(san);
      const history = chess.history();
      const moveIndex = history.length;
      const moveNum = Math.ceil(moveIndex / 2);
      const isWhite = moveIndex % 2 === 1;
      moves.push({
        san,
        fen: chess.fen(),
        moveNumber: moveNum,
        isWhite,
      });
    } catch {
      break;
    }
  }

  return moves;
}

function getCriticalMomentForMove(
  moments: ModelGameCriticalMoment[],
  moveNumber: number,
  isWhite: boolean,
): ModelGameCriticalMoment | null {
  return moments.find(
    (m) => m.moveNumber === moveNumber && m.color === (isWhite ? 'white' : 'black'),
  ) ?? null;
}

function annotationArrowsToBoard(arrows: AnnotationArrow[] | undefined): [string, string, string][] {
  if (!arrows) return [];
  return arrows.map((a) => [a.from, a.to, a.color ?? 'rgba(0, 128, 0, 0.8)'] as [string, string, string]);
}

export function ModelGameViewer({
  game,
  boardOrientation,
  onExit,
}: ModelGameViewerProps): JSX.Element {
  const moves = useMemo(() => parseGameMoves(game.pgn), [game.pgn]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = starting position
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const currentFen = currentIndex >= 0 && currentIndex < moves.length
    ? moves[currentIndex].fen
    : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const currentMove = currentIndex >= 0 && currentIndex < moves.length
    ? moves[currentIndex]
    : null;

  const criticalMoment = currentMove
    ? getCriticalMomentForMove(game.criticalMoments, currentMove.moveNumber, currentMove.isWhite)
    : null;

  const isCriticalMove = criticalMoment !== null;

  const customArrows = criticalMoment
    ? annotationArrowsToBoard(criticalMoment.arrows)
    : [];

  const goFirst = useCallback((): void => {
    setCurrentIndex(-1);
    setIsAutoPlaying(false);
  }, []);

  const goPrev = useCallback((): void => {
    setCurrentIndex((i) => Math.max(-1, i - 1));
  }, []);

  const goNext = useCallback((): void => {
    setCurrentIndex((i) => Math.min(moves.length - 1, i + 1));
  }, [moves.length]);

  const goLast = useCallback((): void => {
    setCurrentIndex(moves.length - 1);
    setIsAutoPlaying(false);
  }, [moves.length]);

  const toggleAutoPlay = useCallback((): void => {
    setIsAutoPlaying((p) => !p);
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (currentIndex >= moves.length - 1) {
      setIsAutoPlaying(false);
      return;
    }

    const delay = isCriticalMove ? 3000 : 1200;
    const timer = setTimeout(() => {
      setCurrentIndex((i) => i + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentIndex, moves.length, isCriticalMove]);

  const progressPercent = moves.length > 0
    ? Math.round(((currentIndex + 1) / moves.length) * 100)
    : 0;

  const moveLabel = currentMove
    ? `${currentMove.moveNumber}${currentMove.isWhite ? '.' : '...'} ${currentMove.san}`
    : 'Starting Position';

  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="model-game-viewer">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <button
          onClick={onExit}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label="Back"
          data-testid="model-game-back"
        >
          <ArrowLeft size={18} className="text-theme-text" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-theme-text truncate">
            {game.white} vs {game.black}
          </h2>
          <p className="text-xs text-theme-text-muted">
            {game.event}, {game.year} &middot; {game.result}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-theme-border mx-4 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-theme-accent rounded-full"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        <div className="w-full max-w-[400px] aspect-square">
          <Chessboard
            position={currentFen}
            boardOrientation={boardOrientation}
            arePiecesDraggable={false}
            customArrows={customArrows}
            animationDuration={200}
            customDarkSquareStyle={{ backgroundColor: '#779952' }}
            customLightSquareStyle={{ backgroundColor: '#edeed1' }}
          />
        </div>

        {/* Move label */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-theme-accent">
            {moveLabel}
          </span>
          {isCriticalMove && (
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={goFirst}
            className="p-2 rounded-lg hover:bg-theme-surface border border-theme-border transition-colors"
            aria-label="First move"
            data-testid="model-game-first"
          >
            <ChevronsLeft size={18} className="text-theme-text" />
          </button>
          <button
            onClick={goPrev}
            className="p-2 rounded-lg hover:bg-theme-surface border border-theme-border transition-colors"
            aria-label="Previous move"
            data-testid="model-game-prev"
          >
            <ChevronLeft size={18} className="text-theme-text" />
          </button>
          <button
            onClick={toggleAutoPlay}
            className="p-3 rounded-xl bg-theme-accent text-white hover:opacity-90 transition-opacity"
            aria-label={isAutoPlaying ? 'Pause' : 'Play'}
            data-testid="model-game-autoplay"
          >
            {isAutoPlaying
              ? <PauseCircle size={20} />
              : <PlayCircle size={20} />
            }
          </button>
          <button
            onClick={goNext}
            className="p-2 rounded-lg hover:bg-theme-surface border border-theme-border transition-colors"
            aria-label="Next move"
            data-testid="model-game-next"
          >
            <ChevronRight size={18} className="text-theme-text" />
          </button>
          <button
            onClick={goLast}
            className="p-2 rounded-lg hover:bg-theme-surface border border-theme-border transition-colors"
            aria-label="Last move"
            data-testid="model-game-last"
          >
            <ChevronsRight size={18} className="text-theme-text" />
          </button>
        </div>
      </div>

      {/* Annotation panel */}
      <div className="px-4 pb-4">
        <AnimatePresence mode="wait">
          {currentIndex === -1 ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl bg-theme-surface/90 border border-white/15 p-4"
              data-testid="model-game-overview"
            >
              <p className="text-sm font-semibold text-theme-accent mb-1">
                {game.middlegameTheme}
              </p>
              <p className="text-sm text-theme-text-muted leading-relaxed">
                {game.overview}
              </p>
            </motion.div>
          ) : criticalMoment ? (
            <motion.div
              key={`critical-${criticalMoment.moveNumber}-${criticalMoment.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl bg-theme-surface/90 border border-yellow-500/30 p-4"
              data-testid="model-game-critical-moment"
            >
              <div className="flex items-center gap-2 mb-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">
                  {criticalMoment.concept}
                </span>
              </div>
              <p className="text-sm text-theme-text leading-relaxed">
                {criticalMoment.annotation}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="lesson"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl bg-theme-surface/90 border border-white/15 p-3"
            >
              <p className="text-xs text-theme-text-muted">
                {moveLabel} — navigate to find critical moments marked with a star.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lesson summary at end */}
        {currentIndex === moves.length - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-2xl bg-theme-accent/10 border border-theme-accent/30 p-4"
            data-testid="model-game-lesson"
          >
            <p className="text-xs font-semibold text-theme-accent uppercase tracking-wide mb-1">
              Lesson
            </p>
            <p className="text-sm text-theme-text leading-relaxed">
              {game.lessonSummary}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
