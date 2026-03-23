import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessBoard } from '../Board/ChessBoard';
import { BoardControls } from '../Board/BoardControls';
import { ExplanationCard } from './ExplanationCard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useSettings } from '../../hooks/useSettings';
import { voiceService } from '../../services/voiceService';
import { stockfishEngine } from '../../services/stockfishEngine';
import type { OpeningRecord, OpeningVariation } from '../../types';
import { useBoardContext } from '../../hooks/useBoardContext';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MoveQuality } from '../Board/ChessBoard';
import {
  ArrowRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';

export interface TrainModeProps {
  opening: OpeningRecord;
  lines: OpeningVariation[];
  sectionLabel: string;
  onExit: () => void;
}

interface MoveInfo {
  san: string;
  from: string;
  to: string;
}

function parseLineMoves(pgn: string): MoveInfo[] {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();
  const moves: MoveInfo[] = [];
  for (const san of tokens) {
    try {
      const move = chess.move(san);
      moves.push({ san, from: move.from, to: move.to });
    } catch {
      break;
    }
  }
  return moves;
}

export function TrainMode({ opening, lines, sectionLabel, onExit }: TrainModeProps): JSX.Element {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const currentLine = lines[currentLineIndex];
  const expectedMoves = useMemo(() => parseLineMoves(currentLine.pgn), [currentLine.pgn]);

  const playerColor = opening.color;
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [showWrongMove, setShowWrongMove] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [wrongSquare, setWrongSquare] = useState<string | null>(null);
  const [lineComplete, setLineComplete] = useState(false);
  const [showHintAfterUndo, setShowHintAfterUndo] = useState(false);
  const [computerLastMove, setComputerLastMove] = useState<{ from: string; to: string } | null>(null);
  const completedLinesRef = useRef<Set<number>>(new Set());

  const { settings } = useSettings();
  const [moveFlash, setMoveFlash] = useState<MoveQuality>(null);
  const { playCelebration, playEncouragement } = usePieceSound();

  // Stockfish eval state
  const [latestEval, setLatestEval] = useState<number | null>(null);
  const [latestIsMate, setLatestIsMate] = useState(false);
  const [latestMateIn, setLatestMateIn] = useState<number | null>(null);

  const isPlayerTurn = useCallback(
    (idx: number): boolean => {
      return playerColor === 'white' ? idx % 2 === 0 : idx % 2 === 1;
    },
    [playerColor],
  );

  const fenAtIndex = useCallback(
    (idx: number): string => {
      const chess = new Chess();
      for (let i = 0; i < idx && i < expectedMoves.length; i++) {
        try {
          chess.move(expectedMoves[i].san);
        } catch {
          break;
        }
      }
      return chess.fen();
    },
    [expectedMoves],
  );

  const currentFen = useMemo(() => fenAtIndex(currentMoveIndex), [fenAtIndex, currentMoveIndex]);

  // Publish board context for global coach drawer
  const trainTurn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
  useBoardContext(currentFen, currentLine.pgn, Math.floor(currentMoveIndex / 2) + 1, opening.color, trainTurn);

  // Auto-play opponent moves
  useEffect(() => {
    if (lineComplete || showWrongMove) return;
    if (currentMoveIndex >= expectedMoves.length) return;
    if (isPlayerTurn(currentMoveIndex)) return;

    const opponentMove = expectedMoves[currentMoveIndex];
    const timer = setTimeout(() => {
      setComputerLastMove({ from: opponentMove.from, to: opponentMove.to });
      setCurrentMoveIndex((prev) => prev + 1);
      setBoardKey((k) => k + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentMoveIndex, expectedMoves, isPlayerTurn, lineComplete, showWrongMove]);

  // Check for line completion
  useEffect(() => {
    if (currentMoveIndex >= expectedMoves.length && expectedMoves.length > 0 && !lineComplete) {
      setLineComplete(true);
      playCelebration();
      completedLinesRef.current.add(currentLineIndex);
      voiceService.speakNow(`Well done! You've completed the ${currentLine.name} line.`);
    }
  }, [currentMoveIndex, expectedMoves.length, lineComplete, currentLineIndex, currentLine.name, playCelebration]);

  // Handle player move
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (lineComplete) return;
      if (currentMoveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[currentMoveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        // Correct
        setComputerLastMove(null);
        setShowCorrectFlash(true);
        setShowWrongMove(false);
        setShowHintAfterUndo(false);
        setWrongSquare(null);
        if (settings.moveQualityFlash) {
          setMoveFlash('good');
          setTimeout(() => setMoveFlash(null), 600);
        }
        setTimeout(() => setShowCorrectFlash(false), 400);
        setCurrentMoveIndex((prev) => prev + 1);
        setBoardKey((k) => k + 1);
      } else {
        // Wrong — reset to start of line after undo
        setWrongSquare(result.to);
        setShowWrongMove(true);
        if (settings.moveQualityFlash) {
          setMoveFlash('blunder');
          setTimeout(() => setMoveFlash(null), 600);
        }
        playEncouragement();
        setBoardKey((k) => k + 1);
      }
    },
    [currentMoveIndex, expectedMoves, lineComplete, playEncouragement, settings.moveQualityFlash],
  );

  const handleUndo = useCallback((): void => {
    // On mistake, reset to start of line per WO spec
    setShowWrongMove(false);
    setWrongSquare(null);
    setComputerLastMove(null);
    setShowHintAfterUndo(true);
    setCurrentMoveIndex(0);
    setBoardKey((k) => k + 1);
  }, []);

  // Analyze position when it changes
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const analysis = await stockfishEngine.analyzePosition(currentFen, 12);
        if (!cancelled) {
          setLatestEval(analysis.evaluation);
          setLatestIsMate(analysis.isMate);
          setLatestMateIn(analysis.mateIn);
        }
      } catch {
        // Stockfish not ready yet
      }
    })();
    return () => { cancelled = true; };
  }, [currentFen]);

  // Auto-takeback: revert wrong move after brief delay
  useEffect(() => {
    if (!showWrongMove) return;
    const timer = setTimeout(() => {
      handleUndo();
    }, 1200);
    return () => clearTimeout(timer);
  }, [showWrongMove, handleUndo]);

  const handleRetry = useCallback((): void => {
    setCurrentMoveIndex(0);
    setBoardKey((k) => k + 1);
    setShowWrongMove(false);
    setShowCorrectFlash(false);
    setShowHintAfterUndo(false);
    setWrongSquare(null);
    setComputerLastMove(null);
    setLineComplete(false);
    voiceService.stop();
  }, []);

  const handleNextLine = useCallback((): void => {
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex((prev) => prev + 1);
      handleRetry();
    }
  }, [currentLineIndex, lines.length, handleRetry]);

  const handlePrevLine = useCallback((): void => {
    if (currentLineIndex > 0) {
      setCurrentLineIndex((prev) => prev - 1);
      handleRetry();
    }
  }, [currentLineIndex, handleRetry]);

  const progress = expectedMoves.length > 0
    ? Math.round((currentMoveIndex / expectedMoves.length) * 100)
    : 0;

  // Generate hint text showing what move to play
  const hintText = useMemo((): string => {
    if (currentMoveIndex >= expectedMoves.length) return '';
    const move = expectedMoves[currentMoveIndex];
    return `${currentLine.explanation} Play ${move.san}.`;
  }, [currentMoveIndex, expectedMoves, currentLine.explanation]);

  // ─── Line complete screen ───────────────────────────────────────────────
  if (lineComplete) {
    const allDone = completedLinesRef.current.size >= lines.length;
    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 items-center justify-center" data-testid="train-complete">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-theme-text">
              {allDone ? 'All Lines Complete!' : 'Line Complete!'}
            </h2>
            <p className="text-sm text-theme-text-muted mt-1">{currentLine.name}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="train-retry"
            >
              <RotateCcw size={16} />
              Again
            </button>
            {currentLineIndex < lines.length - 1 ? (
              <button
                onClick={handleNextLine}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
                data-testid="train-next"
              >
                Next Line
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={onExit}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
                data-testid="train-exit"
              >
                <ArrowRight size={16} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Board screen ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="train-mode">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-theme-surface"
            data-testid="train-back"
          >
            <ArrowRight size={16} className="text-theme-text rotate-180" />
          </button>
          <div>
            <p className="text-sm font-semibold text-theme-text">Train: {currentLine.name}</p>
            <p className="text-xs text-theme-text-muted">
              {sectionLabel} · Line {currentLineIndex + 1} / {lines.length}
            </p>
          </div>
        </div>
        {/* Line navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevLine}
            disabled={currentLineIndex === 0}
            className="p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-30"
            aria-label="Previous line"
          >
            <ChevronLeft size={16} className="text-theme-text" />
          </button>
          <button
            onClick={handleNextLine}
            disabled={currentLineIndex >= lines.length - 1}
            className="p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-30"
            aria-label="Next line"
          >
            <ChevronRightIcon size={16} className="text-theme-text" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-theme-text-muted uppercase font-medium">
            Move {currentMoveIndex} / {expectedMoves.length}
          </span>
        </div>
        <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-yellow-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            data-testid="train-progress"
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-start pt-2 px-2 py-2">
        <div className="w-full md:max-w-[420px]">
          <div className="relative">
            <ChessBoard
              key={boardKey}
              initialFen={currentFen}
              orientation={playerColor}
              interactive={isPlayerTurn(currentMoveIndex) && !showWrongMove}
              showFlipButton={true}
              showUndoButton={false}
              showResetButton={false}
              showEvalBar={true}
              evaluation={latestEval}
              isMate={latestIsMate}
              mateIn={latestMateIn}
              onMove={handleMove}
              highlightSquares={computerLastMove}
              showLastMoveHighlight={settings.highlightLastMove}
              moveQualityFlash={moveFlash}
            />
            {/* Green checkmark overlay */}
            <AnimatePresence>
              {showCorrectFlash && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  data-testid="correct-flash"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                    <CheckCircle size={28} className="text-green-500" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Red X overlay */}
            <AnimatePresence>
              {showWrongMove && wrongSquare && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  data-testid="wrong-flash"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                    <XCircle size={28} className="text-red-500" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Move navigation */}
      <div className="px-4">
        <BoardControls
          onFirst={() => { setCurrentMoveIndex(0); setBoardKey((k) => k + 1); setComputerLastMove(null); }}
          onPrev={() => { if (currentMoveIndex > 0) { setCurrentMoveIndex((i) => i - 1); setBoardKey((k) => k + 1); setComputerLastMove(null); } }}
          onNext={() => { if (currentMoveIndex < expectedMoves.length) { setCurrentMoveIndex((i) => i + 1); setBoardKey((k) => k + 1); } }}
          onLast={() => { setCurrentMoveIndex(expectedMoves.length); setBoardKey((k) => k + 1); }}
          canGoPrev={currentMoveIndex > 0}
          canGoNext={currentMoveIndex < expectedMoves.length}
        />
      </div>

      {/* Bottom: prompt */}
      <div className="px-4 pb-safe-4 min-h-[80px]">
        {showWrongMove ? (
          <ExplanationCard
            text="Incorrect move. Restarting line..."
            visible={true}
            variant="error"
          />
        ) : showHintAfterUndo && isPlayerTurn(currentMoveIndex) ? (
          <ExplanationCard
            text={hintText}
            visible={true}
            variant="info"
          />
        ) : (
          isPlayerTurn(currentMoveIndex) && currentMoveIndex < expectedMoves.length && (
            <div className="rounded-2xl backdrop-blur-xl bg-theme-surface/90 border border-white/15 p-4 shadow-lg">
              <p className="text-sm text-theme-text text-center font-medium" data-testid="train-prompt">
                What's the best move?
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
