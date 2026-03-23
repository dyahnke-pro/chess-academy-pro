import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessBoard } from '../Board/ChessBoard';
import { BoardControls } from '../Board/BoardControls';
import { ExplanationCard } from './ExplanationCard';
import { usePieceSound } from '../../hooks/usePieceSound';
import {
  recordDrillAttempt,
  updateVariationProgress,
  markLineDiscovered,
} from '../../services/openingService';
import { voiceService } from '../../services/voiceService';
import { stockfishEngine } from '../../services/stockfishEngine';
import type { OpeningRecord, OpeningVariation } from '../../types';
import { useBoardContext } from '../../hooks/useBoardContext';
import type { MoveResult } from '../../hooks/useChessGame';
import {
  ArrowRight,
  RotateCcw,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export interface DrillModeProps {
  opening: OpeningRecord;
  variationIndex?: number;
  customLine?: OpeningVariation;
  onComplete: (correct: boolean) => void;
  onExit: () => void;
}

interface MoveInfo {
  san: string;
  from: string;
  to: string;
}

export function DrillMode({ opening, variationIndex, customLine, onComplete, onExit }: DrillModeProps): JSX.Element {
  const isVariation = variationIndex !== undefined && variationIndex >= 0;
  const variation = customLine ?? (isVariation ? opening.variations?.[variationIndex] : undefined);
  const activePgn = variation ? variation.pgn : opening.pgn;
  const activeExplanation = variation ? variation.explanation : opening.overview ?? '';

  // Parse PGN into move list
  const expectedMoves = useMemo((): MoveInfo[] => {
    const tokens = activePgn.trim().split(/\s+/).filter(Boolean);
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
  }, [activePgn]);

  const playerColor = opening.color;
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [showWrongMove, setShowWrongMove] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [correctSquare, setCorrectSquare] = useState<string | null>(null);
  const [wrongSquare, setWrongSquare] = useState<string | null>(null);
  const [lineComplete, setLineComplete] = useState(false);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [computerLastMove, setComputerLastMove] = useState<{ from: string; to: string } | null>(null);
  const startTimeRef = useRef<number>(Date.now());

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

  // Compute FEN at a given move index
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
  const drillTurn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
  useBoardContext(currentFen, activePgn, Math.floor(currentMoveIndex / 2) + 1, opening.color, drillTurn);

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

  // Generate explanation for current move (what player should play)
  const currentExplanation = useMemo((): string => {
    if (currentMoveIndex >= expectedMoves.length) return '';
    if (!isPlayerTurn(currentMoveIndex)) return '';

    const move = expectedMoves[currentMoveIndex];
    const moveNumber = Math.floor(currentMoveIndex / 2) + 1;

    // For the first player move, use the opening/variation explanation
    if (currentMoveIndex <= 1) {
      if (activeExplanation) {
        return `${activeExplanation} *Play ${move.san}.*`;
      }
    }

    // Generate contextual explanation based on move
    const piece = move.san.replace(/[x+#=]/g, '');
    if (piece.startsWith('O-O')) {
      return `Castle to safety. *Play ${move.san}.*`;
    }
    if (piece.startsWith('N')) {
      return `Develop your knight. *Play ${move.san}.*`;
    }
    if (piece.startsWith('B')) {
      return `Develop your bishop. *Play ${move.san}.*`;
    }
    if (piece.startsWith('Q')) {
      return `Bring your queen out. *Play ${move.san}.*`;
    }
    if (piece.startsWith('R')) {
      return `Activate your rook. *Play ${move.san}.*`;
    }
    if (piece[0] === piece[0].toLowerCase()) {
      return `Continue with the plan. Move ${moveNumber}. *Play ${move.san}.*`;
    }
    return `Move ${moveNumber}. *Play ${move.san}.*`;
  }, [currentMoveIndex, expectedMoves, isPlayerTurn, activeExplanation]);

  // Auto-play opponent moves
  useEffect(() => {
    if (lineComplete || showWrongMove) return;
    if (currentMoveIndex >= expectedMoves.length) return;
    if (isPlayerTurn(currentMoveIndex)) return;

    // Opponent move — auto-play after delay
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

      const timeSeconds = (Date.now() - startTimeRef.current) / 1000;
      void recordDrillAttempt(opening.id, totalMistakes === 0, timeSeconds);
      if (isVariation) {
        void updateVariationProgress(opening.id, variationIndex, totalMistakes === 0);
        void markLineDiscovered(opening.id, variationIndex);
      }

      const lineName = variation ? variation.name : opening.name;
      voiceService.speakNow(`Line discovered! You've learned the ${lineName}.`);
      onComplete(totalMistakes === 0);
    }
  }, [currentMoveIndex, expectedMoves.length, lineComplete, totalMistakes, opening.id, isVariation, variationIndex, variation, opening.name, playCelebration, onComplete]);

  // Speech for current explanation
  useEffect(() => {
    if (lineComplete || showWrongMove) return;
    if (!isPlayerTurn(currentMoveIndex)) return;
    if (currentExplanation) {
      // Strip the italic markers for speech
      const speechText = currentExplanation.replace(/\*/g, '');
      voiceService.speakNow(speechText);
    }
  }, [currentMoveIndex, currentExplanation, isPlayerTurn, lineComplete, showWrongMove]);

  // Handle player move
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (lineComplete) return;
      if (currentMoveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[currentMoveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        // Correct move!
        setComputerLastMove(null);
        setCorrectSquare(expected.to);
        setShowCorrectFlash(true);
        setShowWrongMove(false);
        setWrongSquare(null);
        setTimeout(() => {
          setShowCorrectFlash(false);
          setCorrectSquare(null);
        }, 400);
        setCurrentMoveIndex((prev) => prev + 1);
        setBoardKey((k) => k + 1);
      } else {
        // Wrong move
        setTotalMistakes((prev) => prev + 1);
        setWrongSquare(result.to);
        setShowWrongMove(true);
        playEncouragement();
        setBoardKey((k) => k + 1);
      }
    },
    [currentMoveIndex, expectedMoves, lineComplete, playEncouragement],
  );

  const handleUndo = useCallback((): void => {
    setShowWrongMove(false);
    setWrongSquare(null);
    setBoardKey((k) => k + 1);
  }, []);

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
    setCorrectSquare(null);
    setWrongSquare(null);
    setComputerLastMove(null);
    setLineComplete(false);
    setTotalMistakes(0);
    startTimeRef.current = Date.now();
    voiceService.stop();
  }, []);

  const progress = expectedMoves.length > 0
    ? Math.round((currentMoveIndex / expectedMoves.length) * 100)
    : 0;

  const title = variation ? variation.name : opening.name;
  const lineLabel = isVariation
    ? `Line ${variationIndex + 1} / ${opening.variations?.length ?? 1}`
    : opening.name;

  // ─── Line complete screen ───────────────────────────────────────────────
  if (lineComplete) {
    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 items-center justify-center" data-testid="learn-complete">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-theme-text">Line Discovered!</h2>
            <p className="text-sm text-theme-text-muted mt-1">
              {title}
            </p>
          </div>

          {totalMistakes > 0 && (
            <p className="text-sm text-theme-text-muted text-center">
              {totalMistakes} mistake{totalMistakes !== 1 ? 's' : ''} — try again to perfect it!
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="learn-retry"
            >
              <RotateCcw size={16} />
              Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="learn-exit"
            >
              <ArrowRight size={16} />
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Board screen ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="drill-mode">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-theme-surface"
            data-testid="drill-back"
          >
            <ArrowRight size={16} className="text-theme-text rotate-180" />
          </button>
          <div>
            <p className="text-sm font-semibold text-theme-text">Learn {title}</p>
            <p className="text-xs text-theme-text-muted">{lineLabel}</p>
          </div>
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
            className="h-full bg-theme-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            data-testid="drill-progress"
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
            />
            {/* Green checkmark overlay */}
            <AnimatePresence>
              {showCorrectFlash && correctSquare && (
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
            {/* Red X overlay on wrong move */}
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

      {/* Bottom: explanation */}
      <div className="px-4 pb-safe-4 min-h-[80px]">
        {showWrongMove ? (
          <ExplanationCard
            text="Incorrect move. Try again."
            visible={true}
            variant="error"
          />
        ) : (
          isPlayerTurn(currentMoveIndex) && currentMoveIndex < expectedMoves.length && (
            <ExplanationCard
              text={currentExplanation}
              visible={true}
            />
          )
        )}
      </div>
    </div>
  );
}
