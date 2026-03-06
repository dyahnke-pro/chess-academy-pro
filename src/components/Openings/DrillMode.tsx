import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessBoard } from '../Board/ChessBoard';
import { ExplanationCard } from './ExplanationCard';
import { usePieceSound } from '../../hooks/usePieceSound';
import {
  updateWoodpecker,
  recordDrillAttempt,
  updateVariationProgress,
} from '../../services/openingService';
import { speechService } from '../../services/speechService';
import type { OpeningRecord } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';
import {
  ArrowRight,
  Timer,
  Repeat,
  RotateCcw,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

export interface DrillModeProps {
  opening: OpeningRecord;
  variationIndex?: number;
  onComplete: (correct: boolean) => void;
  onExit: () => void;
}

type DrillPhase = 'demonstration' | 'natural-play' | 'summary';

interface MoveInfo {
  san: string;
  from: string;
  to: string;
  explanation: string;
}

export function DrillMode({ opening, variationIndex, onComplete, onExit }: DrillModeProps): JSX.Element {
  const isVariation = variationIndex !== undefined && variationIndex >= 0;
  const activePgn = isVariation && opening.variations?.[variationIndex]
    ? opening.variations[variationIndex].pgn
    : opening.pgn;
  const activeExplanation = isVariation && opening.variations?.[variationIndex]
    ? opening.variations[variationIndex].explanation
    : opening.overview ?? '';

  // Parse PGN into move list
  const expectedMoves = useMemo((): MoveInfo[] => {
    const tokens = activePgn.trim().split(/\s+/).filter(Boolean);
    const chess = new Chess();
    const moves: MoveInfo[] = [];
    for (const san of tokens) {
      try {
        const move = chess.move(san);
        moves.push({
          san,
          from: move.from,
          to: move.to,
          explanation: '',
        });
      } catch {
        break;
      }
    }
    // Add explanations from variations or generate simple ones
    if (moves.length > 0 && activeExplanation) {
      moves[moves.length - 1].explanation = activeExplanation;
    }
    // Add per-move explanations from matching variations
    if (opening.variations) {
      for (const variation of opening.variations) {
        const varTokens = variation.pgn.trim().split(/\s+/).filter(Boolean);
        for (let i = 0; i < varTokens.length && i < moves.length; i++) {
          if (varTokens[i] === moves[i].san && !moves[i].explanation && i === varTokens.length - 1) {
            moves[i].explanation = variation.explanation;
          }
        }
      }
    }
    return moves;
  }, [activePgn, activeExplanation, opening.variations]);

  const playerColor = opening.color;
  const [phase, setPhase] = useState<DrillPhase>('demonstration');

  // ─── Demonstration phase state ────────────────────────────────────────────
  const [demoMoveIndex, setDemoMoveIndex] = useState(0);
  const [showDemoExplanation, setShowDemoExplanation] = useState(false);
  const [autoplaying, setAutoplaying] = useState(true);

  // ─── Natural play phase state ─────────────────────────────────────────────
  const [playMoveIndex, setPlayMoveIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [showWrongCard, setShowWrongCard] = useState(false);
  const [wrongMessage, setWrongMessage] = useState('');
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [shakeBoard, setShakeBoard] = useState(false);
  const [showAskHelp, setShowAskHelp] = useState(false);
  const [helpRevealed, setHelpRevealed] = useState(false);

  // ─── Timer ────────────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { playCelebration, playEncouragement } = usePieceSound();

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

  const demoFen = useMemo(() => fenAtIndex(demoMoveIndex), [fenAtIndex, demoMoveIndex]);
  const playFen = useMemo(() => fenAtIndex(playMoveIndex), [fenAtIndex, playMoveIndex]);

  // Current explanation for demonstration
  const currentDemoExplanation = useMemo((): string => {
    if (demoMoveIndex === 0) return '';
    const move = expectedMoves[demoMoveIndex - 1];
    if (move.explanation) return move.explanation;
    // Generate a simple explanation
    const moveNumber = Math.ceil(demoMoveIndex / 2);
    const isWhite = (demoMoveIndex - 1) % 2 === 0;
    return `${isWhite ? 'White' : 'Black'} plays ${move.san} on move ${moveNumber}.`;
  }, [demoMoveIndex, expectedMoves]);

  // ─── Demonstration: auto-advance moves ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'demonstration' || !autoplaying) return;
    if (demoMoveIndex >= expectedMoves.length) {
      setShowDemoExplanation(false);
      // Small delay then transition to natural play
      const timer = setTimeout(() => {
        setPhase('natural-play');
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      }, 600);
      return () => clearTimeout(timer);
    }

    // Auto-advance next move after delay
    const timer = setTimeout(() => {
      setDemoMoveIndex((prev) => prev + 1);
      setShowDemoExplanation(true);
      setAutoplaying(false); // Pause for user to read
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, demoMoveIndex, autoplaying, expectedMoves.length]);

  // Speech during demonstration
  useEffect(() => {
    if (phase !== 'demonstration' || !showDemoExplanation) return;
    if (currentDemoExplanation) {
      speechService.speak(currentDemoExplanation);
    }
  }, [phase, showDemoExplanation, currentDemoExplanation]);

  // ─── Natural play: auto-play opponent moves ────────────────────────────────
  useEffect(() => {
    if (phase !== 'natural-play') return;
    if (showWrongCard || helpRevealed) return;
    if (playMoveIndex >= expectedMoves.length) {
      // Drill complete!
      if (timerRef.current) clearInterval(timerRef.current);
      const timeSeconds = (Date.now() - startTimeRef.current) / 1000;
      playCelebration();

      const accuracy = expectedMoves.length > 0
        ? Math.round(((expectedMoves.length - totalMistakes) / expectedMoves.length) * 100)
        : 100;

      speechService.speak(
        accuracy >= 80
          ? `Excellent! You nailed the ${opening.name}. ${Math.round(timeSeconds)} seconds, ${accuracy}% accuracy.`
          : `Good effort on the ${opening.name}. Keep drilling — you'll get smoother each time.`,
      );

      void recordDrillAttempt(opening.id, totalMistakes === 0, timeSeconds);
      void updateWoodpecker(opening.id, timeSeconds);
      if (isVariation) {
        void updateVariationProgress(opening.id, variationIndex, totalMistakes === 0);
      }
      onComplete(totalMistakes === 0);
      setPhase('summary');
      return;
    }

    if (!isPlayerTurn(playMoveIndex)) {
      const timer = setTimeout(() => {
        setPlayMoveIndex((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [playMoveIndex, phase, showWrongCard, helpRevealed, expectedMoves, isPlayerTurn, opening.id, opening.name, totalMistakes, playCelebration, onComplete, isVariation, variationIndex]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Handle player move in natural play ──────────────────────────────────
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (phase !== 'natural-play') return;
      if (playMoveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[playMoveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        // Correct move!
        setShowCorrectFlash(true);
        setTimeout(() => setShowCorrectFlash(false), 300);
        setWrongAttempts(0);
        setShowAskHelp(false);
        setHelpRevealed(false);
        setPlayMoveIndex((prev) => prev + 1);
      } else {
        // Wrong move
        const attempts = wrongAttempts + 1;
        setWrongAttempts(attempts);
        setTotalMistakes((prev) => prev + 1);
        setShakeBoard(true);
        setTimeout(() => setShakeBoard(false), 400);
        playEncouragement();

        // Show explanation but NEVER reveal the correct move
        setWrongMessage(
          `That's not the right move here. Think about the plan in this position.`,
        );
        speechService.speak(`Not quite. Think about what this position needs.`);
        setShowWrongCard(true);

        // After 2 failed attempts, show "Ask For Help" button
        if (attempts >= 2) {
          setShowAskHelp(true);
        }

        // Reset board to current position
        setBoardKey((k) => k + 1);
      }
    },
    [phase, playMoveIndex, expectedMoves, wrongAttempts, playEncouragement],
  );

  const handleAskForHelp = useCallback((): void => {
    if (playMoveIndex >= expectedMoves.length) return;
    const expected = expectedMoves[playMoveIndex];
    setHelpRevealed(true);
    setWrongMessage(`The correct move is ${expected.san}. Now play it on the board.`);
    speechService.speak(`The move you're looking for is ${expected.san}.`);
    setShowWrongCard(true);
  }, [playMoveIndex, expectedMoves]);

  const handleDismissWrong = useCallback((): void => {
    setShowWrongCard(false);
  }, []);

  const handleNextDemo = useCallback((): void => {
    setShowDemoExplanation(false);
    setAutoplaying(true);
  }, []);

  const handleRetry = useCallback((): void => {
    setPhase('natural-play');
    setPlayMoveIndex(0);
    setBoardKey((k) => k + 1);
    setWrongAttempts(0);
    setTotalMistakes(0);
    setShowWrongCard(false);
    setShowAskHelp(false);
    setHelpRevealed(false);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    speechService.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = phase === 'demonstration'
    ? Math.round((demoMoveIndex / expectedMoves.length) * 100)
    : Math.round((playMoveIndex / expectedMoves.length) * 100);

  const title = variationIndex !== undefined && opening.variations?.[variationIndex]
    ? opening.variations[variationIndex].name
    : opening.name;

  // ─── Summary screen ──────────────────────────────────────────────────────
  if (phase === 'summary') {
    const accuracy = expectedMoves.length > 0
      ? Math.round(((expectedMoves.length - totalMistakes) / expectedMoves.length) * 100)
      : 100;
    const timeSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 items-center justify-center" data-testid="drill-summary">
        <div className="w-full max-w-sm space-y-6">
          <h2 className="text-xl font-bold text-theme-text text-center">Drill Complete!</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-theme-surface rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-theme-accent" data-testid="summary-accuracy">{accuracy}%</p>
              <p className="text-xs text-theme-text-muted uppercase mt-1">Accuracy</p>
            </div>
            <div className="bg-theme-surface rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-theme-text" data-testid="summary-mistakes">{totalMistakes}</p>
              <p className="text-xs text-theme-text-muted uppercase mt-1">Mistakes</p>
            </div>
            <div className="bg-theme-surface rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-theme-text" data-testid="summary-time">{formatTime(timeSeconds)}</p>
              <p className="text-xs text-theme-text-muted uppercase mt-1">Time</p>
            </div>
            <div className="bg-theme-surface rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-theme-text" data-testid="summary-reps">{opening.woodpeckerReps + 1}</p>
              <p className="text-xs text-theme-text-muted uppercase mt-1">Woodpecker Reps</p>
            </div>
          </div>

          {opening.woodpeckerSpeed !== null && (
            <p className="text-sm text-theme-text-muted text-center">
              Previous avg: {Math.round(opening.woodpeckerSpeed)}s
              {timeSeconds < opening.woodpeckerSpeed && ' — new personal best!'}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="drill-again"
            >
              <RotateCcw size={16} />
              Drill Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="drill-exit"
            >
              <ArrowRight size={16} />
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Board screen (demonstration + natural play) ──────────────────────────
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
            <p className="text-sm font-semibold text-theme-text">{title}</p>
            <p className="text-xs text-theme-text-muted">
              {phase === 'demonstration' ? 'Watch & Learn' : 'Play From Memory'}
            </p>
          </div>
        </div>

        {phase === 'natural-play' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-theme-text-muted">
              <Timer size={14} />
              <span data-testid="drill-timer">{formatTime(elapsedSeconds)}</span>
            </div>
            {opening.woodpeckerReps > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-theme-text-muted">
                <Repeat size={14} />
                <span data-testid="woodpecker-reps">{opening.woodpeckerReps}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step indicator / progress bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-theme-text-muted uppercase font-medium">
            {phase === 'demonstration'
              ? `Move ${demoMoveIndex} / ${expectedMoves.length}`
              : `Move ${playMoveIndex} / ${expectedMoves.length}`}
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
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2">
        <motion.div
          className="w-full max-w-[360px]"
          animate={shakeBoard ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
          transition={shakeBoard ? { duration: 0.4 } : { duration: 0 }}
        >
          <div className="relative">
            <ChessBoard
              key={`${phase}-${boardKey}`}
              initialFen={phase === 'demonstration' ? demoFen : playFen}
              orientation={playerColor}
              interactive={phase === 'natural-play' && isPlayerTurn(playMoveIndex) && !showWrongCard}
              showFlipButton={false}
              showUndoButton={false}
              showResetButton={false}
              onMove={handleMove}
            />
            {/* Green flash overlay on correct move */}
            <AnimatePresence>
              {showCorrectFlash && (
                <motion.div
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-green-500/20 rounded-lg pointer-events-none"
                  data-testid="correct-flash"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Bottom: explanation cards + controls */}
      <div className="px-4 pb-4 space-y-3">
        {/* Demonstration explanation */}
        {phase === 'demonstration' && showDemoExplanation && (
          <ExplanationCard
            text={currentDemoExplanation}
            visible={true}
            actionLabel="Next Move"
            onAction={handleNextDemo}
          />
        )}

        {/* Wrong move explanation (never reveals correct move unless help requested) */}
        {phase === 'natural-play' && (
          <ExplanationCard
            text={wrongMessage}
            visible={showWrongCard}
            onDismiss={handleDismissWrong}
            variant={helpRevealed ? 'info' : 'error'}
          />
        )}

        {/* Ask For Help button — only after 2 wrong attempts */}
        {phase === 'natural-play' && showAskHelp && !helpRevealed && !showWrongCard && (
          <button
            onClick={handleAskForHelp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-sm text-theme-text-muted hover:text-theme-text transition-colors w-full justify-center"
            data-testid="ask-help-btn"
          >
            <HelpCircle size={16} />
            Ask For Help
          </button>
        )}

        {/* Demonstration: skip to play */}
        {phase === 'demonstration' && !showDemoExplanation && demoMoveIndex > 0 && (
          <button
            onClick={() => {
              setPhase('natural-play');
              startTimeRef.current = Date.now();
              timerRef.current = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
              }, 1000);
            }}
            className="flex items-center gap-2 justify-center w-full py-2.5 rounded-xl bg-theme-surface text-sm text-theme-text-muted hover:text-theme-text transition-colors"
            data-testid="skip-demo"
          >
            Skip to Play
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
