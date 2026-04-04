import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { HintButton } from '../Coach/HintButton';
import { motion } from 'framer-motion';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useStruggleDetection } from '../../hooks/useStruggleDetection';
import { useSettings } from '../../hooks/useSettings';
import { useAppStore } from '../../stores/appStore';
import type { MoveResult } from '../../hooks/useChessGame';
import { tacticTypeLabel } from '../../services/tacticalProfileService';
import { voiceService } from '../../services/voiceService';
import { setupIntro, setupCorrectPrep, setupRevealComplete, setupIncorrect } from '../../services/tacticNarrationService';
import { recordTacticOutcome } from '../../services/tacticAlertService';
import type { CoachingTier } from '../../services/tacticAlertService';
import type { SetupPuzzle } from '../../types';

type BoardState = 'thinking' | 'correct' | 'incorrect' | 'reveal';

interface TacticSetupBoardProps {
  puzzle: SetupPuzzle;
  onComplete: (correct: boolean) => void;
}

function parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

export function TacticSetupBoard({ puzzle, onComplete }: TacticSetupBoardProps): JSX.Element {
  const chessRef = useRef(new Chess(puzzle.setupFen));
  const [fen, setFen] = useState(puzzle.setupFen);
  const [boardState, setBoardState] = useState<BoardState>('thinking');
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState('Find the preparatory move');
  const [revealStep, setRevealStep] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const hasCompleted = useRef(false);

  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  const wrongAttemptsRef = useRef(0);

  const solutionMoves = puzzle.solutionMoves.split(' ').filter(Boolean);
  const tacticMoves = puzzle.tacticMoves.split(' ').filter(Boolean);
  const isPlayerTurn = moveIndex % 2 === 0; // Player moves on even indices

  // Determine board orientation
  const orientation = puzzle.playerColor === 'black' ? 'black' : 'white';

  const { settings } = useSettings();
  const activeProfile = useAppStore((s) => s.activeProfile);

  // Proactive struggle detection — coach speaks up when player is stuck
  const handleStruggleCoach = useCallback((coachMsg: string, _tier: CoachingTier) => {
    voiceService.stop();
    setMessage(coachMsg);
    void voiceService.speak(coachMsg);
  }, []);

  const { reset: resetStruggle } = useStruggleDetection({
    tacticType: puzzle.tacticType,
    playerRating: activeProfile?.currentRating ?? 1200,
    active: boardState === 'thinking' && isPlayerTurn,
    wrongAttempts: wrongAttemptCount,
    onCoach: handleStruggleCoach,
  });

  // Derive the expected move for the hint system
  const knownMove = useMemo((): { from: string; to: string; san: string } | null => {
    if (boardState !== 'thinking' || !isPlayerTurn) return null;
    const uci = solutionMoves[moveIndex];
    if (!uci) return null;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const chess = new Chess(fen);
      const result = chess.move({ from, to, promotion });
      return { from, to, san: result.san };
    } catch {
      return { from, to, san: '' };
    }
  }, [boardState, isPlayerTurn, moveIndex, solutionMoves, fen]);

  const { hintState, requestHint, resetHints } = useHintSystem({
    fen,
    playerColor: puzzle.playerColor === 'black' ? 'black' : 'white',
    enabled: settings.showHints && boardState === 'thinking' && isPlayerTurn,
    knownMove,
  });

  // Narrate intro on mount and reset hints/struggle
  useEffect(() => {
    resetHints();
    resetStruggle();
    wrongAttemptsRef.current = 0;
    setWrongAttemptCount(0);
    const intro = setupIntro(puzzle.tacticType, puzzle.difficulty);
    void voiceService.speak(intro);
    return () => { voiceService.stop(); };
  }, [resetHints, resetStruggle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play opponent responses
  useEffect(() => {
    if (boardState !== 'thinking' || isPlayerTurn || moveIndex >= solutionMoves.length) return;

    const timer = setTimeout(() => {
      const move = solutionMoves[moveIndex];
      if (!move) return;
      const parsed = parseUciMove(move);
      try {
        chessRef.current.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion });
        setFen(chessRef.current.fen());
        setBoardKey((k) => k + 1);
        setMoveIndex((i) => i + 1);

        if (moveIndex + 1 >= solutionMoves.length) {
          // All prep moves done — show the tactic reveal
          setBoardState('reveal');
          setMessage(`Setup complete! Now watch the ${tacticTypeLabel(puzzle.tacticType).toLowerCase()}...`);
        }
      } catch {
        // Invalid move in solution — skip
        setMoveIndex((i) => i + 1);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [boardState, isPlayerTurn, moveIndex, solutionMoves, puzzle.tacticType]);

  // Reveal the tactic finish move by move
  useEffect(() => {
    if (boardState !== 'reveal' || revealStep >= tacticMoves.length) {
      if (boardState === 'reveal' && revealStep >= tacticMoves.length && !hasCompleted.current) {
        hasCompleted.current = true;
        const timer = setTimeout(() => {
          setBoardState('correct');
          const completeMsg = setupRevealComplete(puzzle.tacticType);
          setMessage(completeMsg);
          void voiceService.speak(completeMsg);
          recordTacticOutcome({
            tacticType: puzzle.tacticType,
            found: true,
            wasCoached: wrongAttemptsRef.current > 0,
            context: 'setup',
          });
          setTimeout(() => onComplete(true), 2000);
        }, 800);
        return () => clearTimeout(timer);
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      const move = tacticMoves[revealStep];
      if (!move) return;
      const parsed = parseUciMove(move);
      try {
        chessRef.current.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion });
        setFen(chessRef.current.fen());
        setBoardKey((k) => k + 1);
        setRevealStep((s) => s + 1);
      } catch {
        setRevealStep((s) => s + 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [boardState, revealStep, tacticMoves, puzzle.tacticType, onComplete]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (boardState !== 'thinking' || !isPlayerTurn) return;

    const expectedMove = solutionMoves[moveIndex];
    if (!expectedMove) return;

    const expected = parseUciMove(expectedMove);

    // Check if the move matches the expected solution
    if (move.from === expected.from && move.to === expected.to) {
      // Apply to our chess instance to stay in sync
      try {
        chessRef.current.move({ from: move.from, to: move.to, promotion: move.promotion });
      } catch {
        // Already applied or promotion mismatch — sync from expected
        chessRef.current.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      }
      resetHints();
      setFen(chessRef.current.fen());
      setMoveIndex((i) => i + 1);

      if (moveIndex + 1 >= solutionMoves.length) {
        setBoardState('reveal');
        const revealMsg = `Setup complete! Now watch the ${tacticTypeLabel(puzzle.tacticType).toLowerCase()}...`;
        setMessage(revealMsg);
        void voiceService.speak(revealMsg);
      } else {
        const remaining = Math.ceil((solutionMoves.length - moveIndex - 1) / 2);
        const prepMsg = setupCorrectPrep(remaining);
        setMessage(prepMsg);
        void voiceService.speak(prepMsg);
      }
      return;
    }

    // Wrong move — let the player retry (not one-shot fail)
    wrongAttemptsRef.current += 1;
    setWrongAttemptCount(wrongAttemptsRef.current);
    setBoardState('incorrect');
    voiceService.stop();

    const wrongMsg = setupIncorrect();
    setMessage(wrongMsg);
    void voiceService.speak(wrongMsg);

    // Remount board at the correct position (ChessBoard applied the wrong
    // move internally, so we force-reset it via key change)
    setFen(chessRef.current.fen());
    setBoardKey((k) => k + 1);

    // Brief feedback then back to thinking — allow retry
    setTimeout(() => {
      setBoardState('thinking');
    }, 1500);
  }, [boardState, isPlayerTurn, moveIndex, solutionMoves, puzzle.tacticType, onComplete, resetHints]);

  const statusColor = boardState === 'correct'
    ? 'var(--color-success)'
    : boardState === 'incorrect'
      ? 'var(--color-error)'
      : boardState === 'reveal'
        ? 'var(--color-accent)'
        : 'var(--color-text-muted)';

  return (
    <div className="flex flex-col gap-3">
      {/* Status message */}
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-2 px-4 rounded-lg text-sm font-medium"
        style={{ color: statusColor, background: `color-mix(in srgb, ${statusColor} 8%, transparent)` }}
      >
        {message}
      </motion.div>

      {/* Board */}
      <div className="w-full md:max-w-[420px] mx-auto" data-testid="setup-board">
        <ChessBoard
          key={boardKey}
          initialFen={fen}
          orientation={orientation}
          interactive={boardState === 'thinking' && isPlayerTurn}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={handleMove}
          arrows={hintState.arrows.length > 0 ? hintState.arrows : undefined}
          ghostMove={hintState.ghostMove}
        />
      </div>

      {/* Hint controls */}
      {boardState === 'thinking' && isPlayerTurn && settings.showHints && (
        <div className="flex flex-col items-start gap-2" data-testid="setup-hint-area">
          <HintButton
            currentLevel={hintState.level}
            onRequestHint={requestHint}
            disabled={hintState.isAnalyzing}
          />
          {hintState.nudgeText && (
            <p className="text-xs text-amber-500 max-w-sm" data-testid="hint-nudge">
              {hintState.nudgeText}
            </p>
          )}
        </div>
      )}

      {/* Move indicator */}
      <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {boardState === 'thinking' && isPlayerTurn && (
          <span>Your turn — find the prep move ({moveIndex / 2 + 1} of {Math.ceil(solutionMoves.length / 2)})</span>
        )}
        {boardState === 'thinking' && !isPlayerTurn && (
          <span>Opponent responding...</span>
        )}
        {boardState === 'reveal' && (
          <span>The tactic unfolds...</span>
        )}
      </div>
    </div>
  );
}
