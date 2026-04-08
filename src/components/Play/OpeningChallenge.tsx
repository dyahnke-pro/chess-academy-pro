import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Undo2 } from 'lucide-react';
import { BoardPageLayout } from '../Board/BoardPageLayout';
import { HintButton } from '../Coach/HintButton';
import { GameCompleteCard } from './GameCompleteCard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useChessGame } from '../../hooks/useChessGame';
import { useBoardContext } from '../../hooks/useBoardContext';
import { useHintSystem } from '../../hooks/useHintSystem';
import {
  recordDrillAttempt,
  updateWoodpecker,
} from '../../services/openingService';
import {
  getWrongMoveMessage,
  getCorrectMoveMessage,
  getWelcomeMessage,
} from '../../services/gamesService';
import type { OpeningRecord, BoardArrow, BoardAnnotationCommand } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';
import type { GameChatPanelHandle } from '../Coach/GameChatPanel';

export interface OpeningChallengeProps {
  opening: OpeningRecord;
  queuePosition: string;
  hasNext: boolean;
  onComplete: (perfect: boolean) => void;
  onNext: () => void;
  onExit: () => void;
}

interface MoveInfo {
  san: string;
  from: string;
  to: string;
}

export function OpeningChallenge({
  opening,
  queuePosition,
  hasNext,
  onComplete,
  onNext,
  onExit,
}: OpeningChallengeProps): JSX.Element {
  const chatRef = useRef<GameChatPanelHandle>(null);

  // Parse PGN into expected moves
  const expectedMoves = useMemo((): MoveInfo[] => {
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
  }, [opening.pgn]);

  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [lineComplete, setLineComplete] = useState(false);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [takebacksUsed, setTakebacksUsed] = useState(0);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [computerLastMove, setComputerLastMove] = useState<{ from: string; to: string } | null>(null);
  const [annotationArrows, setAnnotationArrows] = useState<BoardArrow[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const wrongMoveCountRef = useRef(0);
  const welcomeSentRef = useRef(false);

  const { playCelebration } = usePieceSound();

  const isPlayerTurn = useCallback(
    (idx: number): boolean => {
      return opening.color === 'white' ? idx % 2 === 0 : idx % 2 === 1;
    },
    [opening.color],
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
  const currentTurn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';

  // Game state owned at page level — ControlledChessBoard renders from this
  const game = useChessGame(currentFen, opening.color);

  // Publish board context for global coach drawer
  useBoardContext(
    currentFen,
    opening.pgn,
    Math.floor(currentMoveIndex / 2) + 1,
    opening.color,
    currentTurn,
  );

  // Hint system
  const currentExpected = currentMoveIndex < expectedMoves.length ? expectedMoves[currentMoveIndex] : undefined;
  const knownMove = currentExpected && isPlayerTurn(currentMoveIndex) ? currentExpected : null;
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen: currentFen,
    playerColor: opening.color,
    enabled: true,
    knownMove,
  });

  const handleHint = useCallback((): void => {
    requestHint();
    // Inject nudge into chat when reaching level 2
    if (hintState.level === 1 && hintState.nudgeText === null) {
      // Nudge will be generated on next render — inject it then
    }
  }, [requestHint, hintState.level, hintState.nudgeText]);

  // Inject nudge text into chat when it appears
  const prevNudgeRef = useRef<string | null>(null);
  useEffect(() => {
    if (hintState.nudgeText && hintState.nudgeText !== prevNudgeRef.current) {
      prevNudgeRef.current = hintState.nudgeText;
      chatRef.current?.injectAssistantMessage(hintState.nudgeText);
    }
  }, [hintState.nudgeText]);

  // Send welcome message on mount
  useEffect(() => {
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;
    const timer = setTimeout(() => {
      chatRef.current?.injectAssistantMessage(getWelcomeMessage(opening));
    }, 300);
    return () => clearTimeout(timer);
  }, [opening]);

  // Auto-play opponent moves
  useEffect(() => {
    if (lineComplete) return;
    if (currentMoveIndex >= expectedMoves.length) return;
    if (isPlayerTurn(currentMoveIndex)) return;

    const opponentMove = expectedMoves[currentMoveIndex];
    const timer = setTimeout(() => {
      const nextFen = fenAtIndex(currentMoveIndex + 1);
      game.loadFen(nextFen);
      setComputerLastMove({ from: opponentMove.from, to: opponentMove.to });
      setCurrentMoveIndex((prev) => prev + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentMoveIndex, expectedMoves, isPlayerTurn, lineComplete, fenAtIndex, game]);

  // Check for line completion
  useEffect(() => {
    if (currentMoveIndex >= expectedMoves.length && expectedMoves.length > 0 && !lineComplete) {
      setLineComplete(true);
      playCelebration();

      const timeSeconds = (Date.now() - startTimeRef.current) / 1000;
      const perfect = totalMistakes === 0 && hintState.hintsUsed === 0;
      void recordDrillAttempt(opening.id, perfect, timeSeconds);
      void updateWoodpecker(opening.id, timeSeconds);

      chatRef.current?.injectAssistantMessage(
        perfect
          ? `Perfect run! You really know the ${opening.name}.`
          : `Line complete! Keep practicing the ${opening.name} to lock it in.`,
      );

      onComplete(perfect);
    }
  }, [currentMoveIndex, expectedMoves.length, lineComplete, totalMistakes, hintState.hintsUsed, opening, playCelebration, onComplete]);

  // Handle player move
  const handleMove = useCallback(
    (result: MoveResult): void => {
      if (lineComplete) return;
      if (currentMoveIndex >= expectedMoves.length) return;

      const expected = expectedMoves[currentMoveIndex];
      if (result.from === expected.from && result.to === expected.to) {
        // Correct move — game FEN is already at the post-move position
        setComputerLastMove(null);
        setShowCorrectFlash(true);
        resetHints();
        prevNudgeRef.current = null;
        wrongMoveCountRef.current = 0;
        setTimeout(() => setShowCorrectFlash(false), 400);
        setCurrentMoveIndex((prev) => prev + 1);

        // Occasional coach encouragement (every 3 correct moves)
        if (currentMoveIndex > 0 && currentMoveIndex % 3 === 0) {
          chatRef.current?.injectAssistantMessage(getCorrectMoveMessage());
        }
      } else {
        // Wrong move — reset board to pre-move position, coach encourages
        setTotalMistakes((prev) => prev + 1);
        wrongMoveCountRef.current += 1;
        game.loadFen(currentFen);

        const msg = getWrongMoveMessage(opening, wrongMoveCountRef.current);
        chatRef.current?.injectAssistantMessage(msg);

        // After 2 wrong attempts, auto-advance hint
        if (wrongMoveCountRef.current >= 2 && hintState.level < 1) {
          requestHint();
        }
      }
    },
    [currentMoveIndex, expectedMoves, lineComplete, opening, hintState.level, requestHint, resetHints, game, currentFen],
  );

  // Takeback system
  const handleTakeback = useCallback((): void => {
    if (currentMoveIndex <= 0) return;

    // Go back to previous player move
    let newIndex = currentMoveIndex - 1;
    if (!isPlayerTurn(newIndex) && newIndex > 0) {
      newIndex -= 1;
    }

    game.loadFen(fenAtIndex(newIndex));
    setCurrentMoveIndex(newIndex);
    resetHints();
    prevNudgeRef.current = null;
    setTakebacksUsed((prev) => prev + 1);
    wrongMoveCountRef.current = 0;

    chatRef.current?.injectAssistantMessage('No worries! Let\'s try that move again.');
  }, [currentMoveIndex, isPlayerTurn, resetHints, game, fenAtIndex]);

  // Board annotations from coach chat
  const handleBoardAnnotation = useCallback((commands: BoardAnnotationCommand[]): void => {
    for (const cmd of commands) {
      if (cmd.type === 'arrow' && cmd.arrows) {
        const arrows = cmd.arrows;
        setAnnotationArrows((prev) => [...prev, ...arrows]);
      } else if (cmd.type === 'clear') {
        setAnnotationArrows([]);
      }
    }
  }, []);

  // Reset for replay
  const handlePlayAgain = useCallback((): void => {
    game.loadFen(fenAtIndex(0));
    setCurrentMoveIndex(0);
    setLineComplete(false);
    setTotalMistakes(0);
    setTakebacksUsed(0);
    resetHints();
    prevNudgeRef.current = null;
    setComputerLastMove(null);
    setAnnotationArrows([]);
    wrongMoveCountRef.current = 0;
    startTimeRef.current = Date.now();
    welcomeSentRef.current = false;
  }, [resetHints, game, fenAtIndex]);

  const progress = expectedMoves.length > 0
    ? Math.round((currentMoveIndex / expectedMoves.length) * 100)
    : 0;

  const allArrows = [...hintState.arrows, ...annotationArrows];

  // Build PGN up to current position for chat context
  const pgnUpToCurrent = expectedMoves
    .slice(0, currentMoveIndex)
    .map((m) => m.san)
    .join(' ');

  const timeElapsed = (Date.now() - startTimeRef.current) / 1000;

  return (
    <BoardPageLayout
      testId="opening-challenge"
      header={{
        title: opening.name,
        subtitle: queuePosition,
        onBack: onExit,
      }}
      aboveBoard={
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
              data-testid="challenge-progress"
            />
          </div>
        </div>
      }
      belowBoard={
        !lineComplete ? (
          <div className="flex items-center justify-center gap-3 px-4 py-2">
            <HintButton
              currentLevel={hintState.level}
              onRequestHint={handleHint}
              disabled={!isPlayerTurn(currentMoveIndex) || hintState.isAnalyzing}
            />
            <button
              onClick={handleTakeback}
              disabled={currentMoveIndex <= 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-theme-border text-sm font-medium text-theme-text-muted transition-colors hover:bg-theme-surface disabled:opacity-50"
              data-testid="takeback-btn"
            >
              <Undo2 size={16} />
              Takeback
            </button>
          </div>
        ) : undefined
      }
      boardOverlay={
        <>
          {/* Correct flash */}
          <AnimatePresence>
            {showCorrectFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                data-testid="correct-flash"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Complete card overlay */}
          {lineComplete && (
            <div className="absolute inset-0 z-20 bg-theme-bg/80 backdrop-blur-sm flex items-center justify-center">
              <GameCompleteCard
                title={opening.name}
                subtitle={`${opening.eco} · ${opening.color === 'white' ? 'White' : 'Black'}`}
                mistakes={totalMistakes}
                hintsUsed={hintState.hintsUsed}
                takebacksUsed={takebacksUsed}
                timeSeconds={timeElapsed}
                onPlayAgain={handlePlayAgain}
                onNext={onNext}
                onBack={onExit}
                hasNext={hasNext}
              />
            </div>
          )}
        </>
      }
      game={game}
      boardFen={currentFen}
      boardInteractive={isPlayerTurn(currentMoveIndex) && !lineComplete}
      onBoardMove={handleMove}
      showEvalBar={false}
      highlightSquares={computerLastMove}
      arrows={allArrows}
      ghostMove={hintState.ghostMove}
      chat={{
        fen: game.fen,
        pgn: pgnUpToCurrent,
        moveNumber: Math.floor(currentMoveIndex / 2) + 1,
        playerColor: opening.color,
        turn: game.turn,
        isGameOver: lineComplete,
        gameResult: lineComplete ? 'Complete' : '',
        onBoardAnnotation: handleBoardAnnotation,
      }}
      chatRef={chatRef}
      initialChatPercent={100}
    />
  );
}
