import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { HintButton } from '../Coach/HintButton';
import { usePieceSound } from '../../hooks/usePieceSound';
import { getRepertoireOpenings, recordDrillAttempt } from '../../services/openingService';
import type { OpeningRecord, HintLevel, BoardArrow } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

export interface BlindfolTrainerProps {
  onExit: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type Phase = 'select' | 'visible' | 'blind' | 'complete';

interface MoveInfo {
  san: string;
  from: string;
  to: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; description: string }> = {
  easy: { label: 'Easy', description: 'See all but the last 3 moves' },
  medium: { label: 'Medium', description: 'See only the first half' },
  hard: { label: 'Hard', description: 'Board goes blind after move 2' },
};

export function BlindfolTrainer({ onExit }: BlindfolTrainerProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [currentOpening, setCurrentOpening] = useState<OpeningRecord | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [hintArrows, setHintArrows] = useState<BoardArrow[]>([]);
  const [showPeek, setShowPeek] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [computerLastMove, setComputerLastMove] = useState<{ from: string; to: string } | null>(null);


  const startTimeRef = useRef<number>(Date.now());
  const wrongMoveCountRef = useRef(0);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playCelebration } = usePieceSound();

  // Load openings
  useEffect(() => {
    async function load(): Promise<void> {
      const all = await getRepertoireOpenings();
      setOpenings(all.sort(() => Math.random() - 0.5));
    }
    void load();
  }, []);

  // Parse expected moves
  const expectedMoves = useMemo((): MoveInfo[] => {
    if (!currentOpening) return [];
    const tokens = currentOpening.pgn.trim().split(/\s+/).filter(Boolean);
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
  }, [currentOpening]);

  // Calculate blind threshold based on difficulty
  const blindStartIndex = useMemo((): number => {
    const total = expectedMoves.length;
    switch (difficulty) {
      case 'easy':
        return Math.max(0, total - 3);
      case 'medium':
        return Math.floor(total / 2);
      case 'hard':
        return Math.min(4, Math.floor(total / 4)); // After ~2 moves per side
    }
  }, [expectedMoves.length, difficulty]);

  const isBlind = currentMoveIndex >= blindStartIndex && phase !== 'select';

  const isPlayerTurn = useCallback(
    (idx: number): boolean => {
      if (!currentOpening) return false;
      return currentOpening.color === 'white' ? idx % 2 === 0 : idx % 2 === 1;
    },
    [currentOpening],
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

  // Auto-play opponent moves
  useEffect(() => {
    if (phase !== 'visible' && phase !== 'blind') return;
    if (!currentOpening) return;
    if (currentMoveIndex >= expectedMoves.length) return;
    if (isPlayerTurn(currentMoveIndex)) return;

    const opponentMove = expectedMoves[currentMoveIndex];
    const timer = setTimeout(() => {
      setComputerLastMove({ from: opponentMove.from, to: opponentMove.to });
      setCurrentMoveIndex((prev) => prev + 1);
      setBoardKey((k) => k + 1);
      // Check if we should transition to blind
      if (currentMoveIndex + 1 >= blindStartIndex && phase === 'visible') {
        setPhase('blind');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentMoveIndex, expectedMoves, isPlayerTurn, phase, currentOpening, blindStartIndex]);

  // Check for phase transitions (visible → blind)
  useEffect(() => {
    if (phase === 'visible' && currentMoveIndex >= blindStartIndex) {
      setPhase('blind');
    }
  }, [currentMoveIndex, blindStartIndex, phase]);

  // Check for completion
  useEffect(() => {
    if ((phase === 'visible' || phase === 'blind') && currentOpening) {
      if (currentMoveIndex >= expectedMoves.length && expectedMoves.length > 0) {
        setPhase('complete');
        playCelebration();

        const timeSeconds = (Date.now() - startTimeRef.current) / 1000;
        void recordDrillAttempt(currentOpening.id, totalMistakes === 0, timeSeconds);
      }
    }
  }, [currentMoveIndex, expectedMoves.length, phase, currentOpening, totalMistakes, playCelebration]);

  // Handle player move
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (phase !== 'visible' && phase !== 'blind') return;
      if (currentMoveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[currentMoveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        // Correct
        setComputerLastMove(null);
        setShowCorrectFlash(true);
        setHintLevel(0);
        setHintArrows([]);
        wrongMoveCountRef.current = 0;
        setTimeout(() => setShowCorrectFlash(false), 400);
        setCurrentMoveIndex((prev) => prev + 1);
        setBoardKey((k) => k + 1);
      } else {
        // Wrong — show pieces briefly in blind mode
        setTotalMistakes((prev) => prev + 1);
        wrongMoveCountRef.current += 1;
        setBoardKey((k) => k + 1);

        if (isBlind) {
          setShowPeek(true);
          if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
          peekTimerRef.current = setTimeout(() => {
            setShowPeek(false);
          }, 1500);
        }
      }
    },
    [phase, currentMoveIndex, expectedMoves, isBlind],
  );

  // Hint system
  const handleHint = useCallback((): void => {
    if (currentMoveIndex >= expectedMoves.length) return;

    const nextLevel = Math.min(hintLevel + 1, 3) as HintLevel;
    setHintLevel(nextLevel);
    setHintsUsed((prev) => prev + 1);

    const expected = expectedMoves[currentMoveIndex];
    if (nextLevel === 3) {
      setHintArrows([{
        startSquare: expected.from,
        endSquare: expected.to,
        color: 'rgba(245, 158, 11, 0.7)',
      }]);
    }
  }, [currentMoveIndex, expectedMoves, hintLevel]);

  // Start a new opening
  const startOpening = useCallback((opening: OpeningRecord): void => {
    setCurrentOpening(opening);
    setCurrentMoveIndex(0);
    setBoardKey((k) => k + 1);
    setTotalMistakes(0);
    setHintsUsed(0);
    setHintLevel(0);
    setHintArrows([]);
    setShowPeek(false);
    setComputerLastMove(null);
    wrongMoveCountRef.current = 0;
    startTimeRef.current = Date.now();
    setPhase('visible');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  // ─── Select Phase ───────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="blindfold-select">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-2 rounded-lg hover:bg-theme-surface"
              data-testid="blindfold-back"
            >
              <ArrowLeft size={18} className="text-theme-text" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-theme-text">Blindfold Trainer</h2>
              <p className="text-xs text-theme-text-muted">Play from memory</p>
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-theme-text">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`p-3 rounded-xl border text-center transition-colors ${
                    difficulty === d
                      ? 'border-theme-accent bg-theme-accent/10 text-theme-accent'
                      : 'border-theme-border text-theme-text-muted hover:bg-theme-surface'
                  }`}
                  data-testid={`difficulty-${d}`}
                >
                  <p className="text-sm font-semibold">{DIFFICULTY_CONFIG[d].label}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-theme-text-muted text-center">
              {DIFFICULTY_CONFIG[difficulty].description}
            </p>
          </div>

          {/* Opening list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-theme-text">Choose an Opening</p>
            {openings.length === 0 ? (
              <p className="text-sm text-theme-text-muted">Loading openings...</p>
            ) : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {openings.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => startOpening(o)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-surface hover:bg-theme-border transition-colors text-left"
                    data-testid={`opening-${o.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-theme-text">{o.name}</p>
                      <p className="text-xs text-theme-text-muted">
                        {o.eco} · {o.color === 'white' ? 'White' : 'Black'} · {o.pgn.trim().split(/\s+/).length} moves
                      </p>
                    </div>
                    <EyeOff size={14} className="text-theme-text-muted" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Complete ───────────────────────────────────────────────────────────────
  if (phase === 'complete' && currentOpening) {
    const perfect = totalMistakes === 0 && hintsUsed === 0;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-5" data-testid="blindfold-complete">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20">
          {perfect ? (
            <Trophy size={32} className="text-yellow-500" />
          ) : (
            <CheckCircle size={32} className="text-green-500" />
          )}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-theme-text">
            {perfect ? 'Perfect Blindfold!' : 'Line Complete!'}
          </h3>
          <p className="text-sm text-theme-text-muted mt-1">{currentOpening.name}</p>
          <p className="text-xs text-theme-text-muted">
            {difficulty} difficulty · {totalMistakes} mistake{totalMistakes !== 1 ? 's' : ''}
            {hintsUsed > 0 ? ` · ${hintsUsed} hints` : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startOpening(currentOpening)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
            data-testid="blindfold-retry"
          >
            <RotateCcw size={14} />
            Again
          </button>
          <button
            onClick={() => setPhase('select')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
            data-testid="blindfold-new"
          >
            New Opening
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
            data-testid="blindfold-exit"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </div>
    );
  }

  // ─── Playing (visible or blind) ─────────────────────────────────────────────
  const showPieces = !isBlind || showPeek;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="blindfold-playing">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase('select')}
            className="p-1.5 rounded-lg hover:bg-theme-surface"
          >
            <ArrowLeft size={16} className="text-theme-text" />
          </button>
          <div>
            <p className="text-sm font-semibold text-theme-text">{currentOpening?.name ?? ''}</p>
            <p className="text-xs text-theme-text-muted">
              Move {currentMoveIndex} / {expectedMoves.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBlind ? (
            <div className="flex items-center gap-1 text-purple-500">
              <EyeOff size={14} />
              <span className="text-xs font-medium">Blind</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-theme-text-muted">
              <Eye size={14} />
              <span className="text-xs font-medium">Visible</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isBlind ? 'bg-purple-500' : 'bg-theme-accent'}`}
            animate={{ width: `${expectedMoves.length > 0 ? (currentMoveIndex / expectedMoves.length) * 100 : 0}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {/* Blind threshold marker */}
        <div className="relative h-0">
          <div
            className="absolute top-[-6px] w-0.5 h-2 bg-purple-500"
            style={{ left: `${expectedMoves.length > 0 ? (blindStartIndex / expectedMoves.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2">
        <div className="w-full md:max-w-[420px] relative">
          {showPieces ? (
            <ChessBoard
              key={boardKey}
              initialFen={currentFen}
              orientation={currentOpening?.color ?? 'white'}
              interactive={isPlayerTurn(currentMoveIndex)}
              showFlipButton={false}
              showUndoButton={false}
              showResetButton={false}
              showEvalBar={false}
              onMove={handleMove}
              highlightSquares={computerLastMove}
              arrows={hintArrows}
            />
          ) : (
            /* Blind board — empty board with coordinates, clickable */
            <div className="relative">
              <ChessBoard
                key={`blind-${boardKey}`}
                initialFen="8/8/8/8/8/8/8/8 w - - 0 1"
                orientation={currentOpening?.color ?? 'white'}
                interactive={false}
                showFlipButton={false}
                showUndoButton={false}
                showResetButton={false}
                showEvalBar={false}
              />
              {/* Invisible interactive layer over the blank board */}
              <div className="absolute inset-0">
                <ChessBoard
                  key={`blind-interactive-${boardKey}`}
                  initialFen={currentFen}
                  orientation={currentOpening?.color ?? 'white'}
                  interactive={isPlayerTurn(currentMoveIndex)}
                  showFlipButton={false}
                  showUndoButton={false}
                  showResetButton={false}
                  showEvalBar={false}
                  onMove={handleMove}
                  arrows={hintArrows}
                  className="opacity-0"
                />
              </div>
            </div>
          )}

          {/* Correct flash */}
          <AnimatePresence>
            {showCorrectFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-3">
        {isBlind && (
          <button
            onClick={() => {
              setShowPeek(true);
              setHintsUsed((h) => h + 1);
              if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
              peekTimerRef.current = setTimeout(() => setShowPeek(false), 2000);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-500/30 text-purple-500 text-sm font-medium transition-colors hover:bg-purple-500/10"
            data-testid="peek-btn"
          >
            <Eye size={16} />
            Peek
          </button>
        )}
        <HintButton
          currentLevel={hintLevel}
          onRequestHint={handleHint}
          disabled={!isPlayerTurn(currentMoveIndex)}
        />
      </div>
    </div>
  );
}
