import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Zap,
  Timer,
  ArrowLeft,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { updateWoodpecker, getRepertoireOpenings } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

export interface OpeningSpeedrunProps {
  onExit: () => void;
}

interface MoveInfo {
  san: string;
  from: string;
  to: string;
}

interface SplitTime {
  openingName: string;
  timeSeconds: number;
  mistakes: number;
  perfect: boolean;
}

type SpeedrunPhase = 'loading' | 'countdown' | 'playing' | 'complete';

export function OpeningSpeedrun({ onExit }: OpeningSpeedrunProps): JSX.Element {
  const [phase, setPhase] = useState<SpeedrunPhase>('loading');
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [currentOpeningIdx, setCurrentOpeningIdx] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [computerLastMove, setComputerLastMove] = useState<{ from: string; to: string } | null>(null);
  const [countdownNum, setCountdownNum] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [splits, setSplits] = useState<SplitTime[]>([]);

  const startTimeRef = useRef<number>(0);
  const splitStartRef = useRef<number>(0);
  const splitMistakesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCorrectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playCelebration } = usePieceSound();

  const opening = openings[currentOpeningIdx] as OpeningRecord | undefined;

  // Parse expected moves for current opening
  const expectedMoves = useMemo((): MoveInfo[] => {
    if (!opening) return [];
    const tokens = opening.pgn.trim().split(/\s+/).filter(Boolean);
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
  }, [opening]);

  const isPlayerTurn = useCallback(
    (idx: number): boolean => {
      if (!opening) return false;
      return opening.color === 'white' ? idx % 2 === 0 : idx % 2 === 1;
    },
    [opening],
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

  // Load openings
  useEffect(() => {
    async function load(): Promise<void> {
      const all = await getRepertoireOpenings();
      // Shuffle for variety
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      setOpenings(shuffled);
      setPhase('countdown');
    }
    void load();
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      startTimeRef.current = Date.now();
      splitStartRef.current = Date.now();
      return;
    }
    const timer = setTimeout(() => setCountdownNum((n) => n - 1), 700);
    return () => clearTimeout(timer);
  }, [phase, countdownNum]);

  // Running timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Auto-play opponent moves
  useEffect(() => {
    if (phase !== 'playing' || !opening) return;
    if (currentMoveIndex >= expectedMoves.length) return;
    if (isPlayerTurn(currentMoveIndex)) return;

    const opponentMove = expectedMoves[currentMoveIndex];
    const timer = setTimeout(() => {
      setComputerLastMove({ from: opponentMove.from, to: opponentMove.to });
      setCurrentMoveIndex((prev) => prev + 1);
      setBoardKey((k) => k + 1);
    }, 200); // Faster for speedrun
    return () => clearTimeout(timer);
  }, [currentMoveIndex, expectedMoves, isPlayerTurn, phase, opening]);

  // Check for opening completion
  useEffect(() => {
    if (phase !== 'playing' || !opening) return;
    if (currentMoveIndex < expectedMoves.length || expectedMoves.length === 0) return;

    const splitTime = (Date.now() - splitStartRef.current) / 1000;
    const perfect = splitMistakesRef.current === 0;

    setSplits((prev) => [...prev, {
      openingName: opening.name,
      timeSeconds: splitTime,
      mistakes: splitMistakesRef.current,
      perfect,
    }]);

    void updateWoodpecker(opening.id, splitTime);

    // Move to next opening
    if (currentOpeningIdx + 1 < openings.length) {
      setCurrentOpeningIdx((prev) => prev + 1);
      setCurrentMoveIndex(0);
      setBoardKey((k) => k + 1);
      setComputerLastMove(null);
      splitStartRef.current = Date.now();
      splitMistakesRef.current = 0;
    } else {
      // All done
      setPhase('complete');
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedMs(Date.now() - startTimeRef.current);
      playCelebration();
    }
  }, [currentMoveIndex, expectedMoves.length, phase, opening, currentOpeningIdx, openings.length, playCelebration]);

  // Handle player move
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (phase !== 'playing') return;
      if (currentMoveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[currentMoveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        // Correct
        setComputerLastMove(null);
        setShowCorrectFlash(true);
        setCombo((c) => {
          const next = c + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
        setTimeout(() => setShowCorrectFlash(false), 300);
        setCurrentMoveIndex((prev) => prev + 1);
        setBoardKey((k) => k + 1);
      } else {
        // Wrong — flash orange, auto-correct after 1s
        setTotalMistakes((prev) => prev + 1);
        splitMistakesRef.current += 1;
        setCombo(0);
        setShowWrongFlash(true);
        setBoardKey((k) => k + 1);

        if (autoCorrectTimerRef.current) clearTimeout(autoCorrectTimerRef.current);
        autoCorrectTimerRef.current = setTimeout(() => {
          setShowWrongFlash(false);
          // Auto-advance past this move
          setCurrentMoveIndex((prev) => prev + 1);
          setBoardKey((k) => k + 1);
        }, 1000);
      }
    },
    [phase, currentMoveIndex, expectedMoves],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoCorrectTimerRef.current) clearTimeout(autoCorrectTimerRef.current);
    };
  }, []);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}.${tenths}` : `${secs}.${tenths}`;
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="speedrun-loading">
        <p className="text-theme-text-muted">Loading openings...</p>
      </div>
    );
  }

  // ─── Countdown ──────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="speedrun-countdown">
        <motion.div
          key={countdownNum}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-6xl font-bold text-theme-accent"
        >
          {countdownNum > 0 ? countdownNum : 'GO!'}
        </motion.div>
      </div>
    );
  }

  // ─── Complete ───────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    const perfectCount = splits.filter((s) => s.perfect).length;
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="speedrun-complete">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-4">
              <Trophy size={32} className="text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-theme-text">Speedrun Complete!</h2>
            <p className="text-3xl font-mono font-bold text-theme-accent mt-2">
              {formatTime(elapsedMs)}
            </p>
          </div>

          {/* Summary stats */}
          <div className="flex justify-center gap-6 text-center text-sm">
            <div>
              <p className="text-lg font-bold text-theme-text">{splits.length}</p>
              <p className="text-theme-text-muted">Openings</p>
            </div>
            <div>
              <p className="text-lg font-bold text-theme-text">{perfectCount}</p>
              <p className="text-theme-text-muted">Perfect</p>
            </div>
            <div>
              <p className="text-lg font-bold text-theme-text">{maxCombo}</p>
              <p className="text-theme-text-muted">Max Combo</p>
            </div>
            <div>
              <p className="text-lg font-bold text-theme-text">{totalMistakes}</p>
              <p className="text-theme-text-muted">Mistakes</p>
            </div>
          </div>

          {/* Split times */}
          <div className="bg-theme-surface rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-theme-text mb-3">Split Times</h3>
            {splits.map((split, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-theme-text truncate flex-1 mr-2">
                  {split.perfect && <CheckCircle size={12} className="inline text-green-500 mr-1" />}
                  {split.openingName}
                </span>
                <span className="text-theme-text-muted font-mono">
                  {split.timeSeconds.toFixed(1)}s
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPhase('countdown');
                setCountdownNum(3);
                setCurrentOpeningIdx(0);
                setCurrentMoveIndex(0);
                setBoardKey((k) => k + 1);
                setCombo(0);
                setMaxCombo(0);
                setTotalMistakes(0);
                setSplits([]);
                setComputerLastMove(null);
                splitMistakesRef.current = 0;
                // Re-shuffle
                setOpenings((prev) => [...prev].sort(() => Math.random() - 0.5));
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="speedrun-retry"
            >
              <RotateCcw size={16} />
              Run Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="speedrun-exit"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Playing ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="speedrun-playing">
      {/* Top bar: timer + combo + opening info */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-theme-surface"
            data-testid="speedrun-back"
          >
            <ArrowLeft size={16} className="text-theme-text" />
          </button>
          <div>
            <p className="text-sm font-semibold text-theme-text">{opening?.name ?? ''}</p>
            <p className="text-xs text-theme-text-muted">
              {currentOpeningIdx + 1} / {openings.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {combo > 1 && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Zap size={14} />
              <span className="text-sm font-bold">{combo}x</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-theme-text">
            <Timer size={14} />
            <span className="text-sm font-mono font-bold">{formatTime(elapsedMs)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-theme-accent rounded-full"
            animate={{ width: `${expectedMoves.length > 0 ? (currentMoveIndex / expectedMoves.length) * 100 : 0}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2">
        <div className="w-full md:max-w-[420px] relative">
          <ChessBoard
            key={boardKey}
            initialFen={currentFen}
            orientation={opening?.color ?? 'white'}
            interactive={isPlayerTurn(currentMoveIndex)}
            showFlipButton={false}
            showUndoButton={false}
            showResetButton={false}
            showEvalBar={false}
            onMove={handleMove}
            highlightSquares={computerLastMove}
          />

          {/* Correct flash */}
          <AnimatePresence>
            {showCorrectFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wrong flash */}
          <AnimatePresence>
            {showWrongFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center">
                  <XCircle size={24} className="text-orange-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
