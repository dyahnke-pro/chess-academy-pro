import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { BoardPageLayout } from '../Board/BoardPageLayout';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useChessGame } from '../../hooks/useChessGame';
import {
  getGuessPositions,
  type GuessPosition,
  type GuessGrade,
} from '../../services/gamesService';
import type { MoveResult } from '../../hooks/useChessGame';
import type { GameChatPanelHandle } from '../Coach/GameChatPanel';
import type { BoardAnnotationCommand } from '../../types';

export interface GuessTheMoveProps {
  onExit: () => void;
}

type Phase = 'loading' | 'guessing' | 'revealed' | 'complete';

interface GuessResult {
  grade: GuessGrade;
  playerMove: string;
  actualMove: string;
}

const GRADE_COLORS: Record<GuessGrade, string> = {
  brilliant: 'text-cyan-400',
  great: 'text-green-500',
  good: 'text-yellow-500',
  miss: 'text-red-400',
};

const GRADE_LABELS: Record<GuessGrade, string> = {
  brilliant: 'Brilliant!',
  great: 'Great Move!',
  good: 'Good',
  miss: 'Not Quite',
};

export function GuessTheMove({ onExit }: GuessTheMoveProps): JSX.Element {
  const chatRef = useRef<GameChatPanelHandle>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [positions, setPositions] = useState<GuessPosition[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<GuessResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lastGrade, setLastGrade] = useState<GuessGrade | null>(null);

  const { playCelebration } = usePieceSound();

  const current = positions[currentIdx] as GuessPosition | undefined;

  // Game state owned at page level — ControlledChessBoard renders from this
  const game = useChessGame(current?.fen);

  // Sync orientation and FEN when position changes
  useEffect(() => {
    if (current) {
      game.loadFen(current.fen);
      game.setOrientation(current.color);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  // Load positions
  useEffect(() => {
    async function load(): Promise<void> {
      const pos = await getGuessPositions(20);
      setPositions(pos);
      if (pos.length > 0) {
        setPhase('guessing');
      }
    }
    void load();
  }, []);

  // Send intro message when position changes
  useEffect(() => {
    if (phase !== 'guessing' || !current) return;
    const timer = setTimeout(() => {
      chatRef.current?.injectAssistantMessage(
        `${current.color === 'white' ? 'White' : 'Black'} to move. What would you play?`,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [currentIdx, phase, current]);

  // Evaluate the player's move against the actual move
  const evaluateGuess = useCallback(
    (playerMove: string): GuessGrade => {
      if (!current) return 'miss';

      // If the player played the exact same move, it's brilliant
      if (playerMove === current.actualMove) return 'brilliant';

      // Use Stockfish eval if available, otherwise use simple comparison
      if (current.actualEval !== null) {
        // We'd need to evaluate the player's move too, but for now
        // use a simpler heuristic: exact match = brilliant, else grade by move type
        try {
          const chess = new Chess(current.fen);
          const actualResult = chess.move(current.actualMove);
          const chess2 = new Chess(current.fen);
          const playerResult = chess2.move(playerMove);

          // Same target square = likely similar idea
          if (actualResult.to === playerResult.to) return 'great';

          // Both captures = decent instinct
          if (actualResult.captured && playerResult.captured) return 'good';

          return 'miss';
        } catch {
          return 'miss';
        }
      }

      return 'miss';
    },
    [current],
  );

  // Handle player move
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (phase !== 'guessing' || !current) return;

      const grade = evaluateGuess(result.san);
      setLastGrade(grade);
      setPhase('revealed');

      const guessResult: GuessResult = {
        grade,
        playerMove: result.san,
        actualMove: current.actualMove,
      };
      setResults((prev) => [...prev, guessResult]);

      if (grade === 'brilliant' || grade === 'great') {
        setStreak((s) => {
          const next = s + 1;
          setMaxStreak((m) => Math.max(m, next));
          return next;
        });
      } else {
        setStreak(0);
      }

      // Coach feedback
      const feedbackMessages: Record<GuessGrade, string> = {
        brilliant: `Incredible! You found the exact move: ${current.actualMove}.`,
        great: `Great instinct! The actual move was ${current.actualMove} — your move was very close.`,
        good: `Decent idea. The game continued ${current.actualMove}.`,
        miss: `The move played was ${current.actualMove}. Let's see the next position!`,
      };
      chatRef.current?.injectAssistantMessage(feedbackMessages[grade]);

      // Reset board to original position after evaluation
      game.loadFen(current.fen);
    },
    [phase, current, evaluateGuess],
  );

  // Advance to next position
  const handleNext = useCallback((): void => {
    if (currentIdx + 1 >= positions.length) {
      setPhase('complete');
      playCelebration();
      return;
    }
    setCurrentIdx((prev) => prev + 1);
    setPhase('guessing');
    setLastGrade(null);
  }, [currentIdx, positions.length, playCelebration]);

  const handleBoardAnnotation = useCallback(
    (_commands: BoardAnnotationCommand[]): void => { /* no-op */ },
    [],
  );

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="guess-loading">
        <p className="text-theme-text-muted">Finding positions...</p>
      </div>
    );
  }

  // ─── No positions ───────────────────────────────────────────────────────────
  if (positions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4" data-testid="guess-empty">
        <p className="text-theme-text-muted text-center">
          No analyzed games yet. Play some coach games first to unlock this mode!
        </p>
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-accent text-white font-semibold"
          data-testid="guess-back"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
    );
  }

  // ─── Complete ───────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    const brilliantCount = results.filter((r) => r.grade === 'brilliant').length;
    const greatCount = results.filter((r) => r.grade === 'great').length;
    const goodCount = results.filter((r) => r.grade === 'good').length;
    const missCount = results.filter((r) => r.grade === 'miss').length;

    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="guess-complete">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 mb-4">
              <Trophy size={32} className="text-cyan-500" />
            </div>
            <h2 className="text-xl font-bold text-theme-text">Session Complete!</h2>
            <p className="text-sm text-theme-text-muted mt-1">
              {results.length} positions analyzed
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6 text-center text-sm">
            <div>
              <p className="text-lg font-bold text-cyan-400">{brilliantCount}</p>
              <p className="text-theme-text-muted">Brilliant</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">{greatCount}</p>
              <p className="text-theme-text-muted">Great</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-500">{goodCount}</p>
              <p className="text-theme-text-muted">Good</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">{missCount}</p>
              <p className="text-theme-text-muted">Miss</p>
            </div>
          </div>

          {maxStreak > 1 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-500">
                <Zap size={16} />
                <span className="font-bold">Best streak: {maxStreak}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentIdx(0);
                setResults([]);
                setStreak(0);
                setMaxStreak(0);
                setLastGrade(null);
                setPhase('loading');
                // Reload positions
                void getGuessPositions(20).then((pos) => {
                  setPositions(pos);
                  if (pos.length > 0) {
                    setPhase('guessing');
                    if (pos[0]) {
                      game.loadFen(pos[0].fen);
                      game.setOrientation(pos[0].color);
                    }
                  }
                });
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="guess-retry"
            >
              <RotateCcw size={16} />
              Play Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="guess-exit"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Guessing / Revealed ────────────────────────────────────────────────────
  return (
    <BoardPageLayout
      testId="guess-the-move"
      header={{
        title: 'Guess the Move',
        subtitle: `Position ${currentIdx + 1} / ${positions.length}${streak > 1 ? ` · ${streak}x streak` : ''}`,
        onBack: onExit,
        rightControls: streak > 1 ? (
          <div className="flex items-center gap-1 text-yellow-500">
            <Zap size={14} />
            <span className="text-sm font-bold">{streak}x</span>
          </div>
        ) : undefined,
      }}
      aboveBoard={
        <AnimatePresence>
          {lastGrade && phase === 'revealed' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-center py-1 text-sm font-bold ${GRADE_COLORS[lastGrade]}`}
            >
              {GRADE_LABELS[lastGrade]}
            </motion.div>
          )}
        </AnimatePresence>
      }
      belowBoard={
        phase === 'revealed' ? (
          <div className="flex justify-center px-4 py-2">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-theme-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              data-testid="next-position-btn"
            >
              {currentIdx + 1 < positions.length ? 'Next Position' : 'See Results'}
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="text-center px-4 py-2">
            <p className="text-xs text-theme-text-muted">
              {current?.white ?? ''} vs {current?.black ?? ''} · Move {current?.moveNumber ?? 0}
            </p>
          </div>
        )
      }
      game={game}
      boardFen={current?.fen ?? 'start'}
      boardInteractive={phase === 'guessing'}
      onBoardMove={handleMove}
      showEvalBar={false}
      chat={{
        fen: game.fen,
        pgn: '',
        moveNumber: current?.moveNumber ?? 1,
        playerColor: current?.color ?? 'white',
        turn: game.turn,
        isGameOver: false,
        gameResult: '',
        lastMove: game.lastMove ? { ...game.lastMove, san: game.history[game.history.length - 1] ?? '' } : null,
        history: game.history,
        onBoardAnnotation: handleBoardAnnotation,
      }}
      chatRef={chatRef}
      initialChatPercent={100}
    />
  );
}
