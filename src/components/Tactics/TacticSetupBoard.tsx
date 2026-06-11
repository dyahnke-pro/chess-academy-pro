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
import { setupIntro, setupPrepPlanted, setupRevealComplete, setupIncorrect } from '../../services/tacticNarrationService';
import { recordTacticOutcome } from '../../services/tacticAlertService';
import type { CoachingTier } from '../../services/tacticAlertService';
import type { SetupPuzzle } from '../../types';

type BoardState = 'thinking' | 'incorrect' | 'solved';

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

/**
 * The student plays the WHOLE solver line — the quiet setup move FIRST, then
 * calculates and plays the tactic to the end (David 2026-06-11: "essentially
 * calculation training mixed with tactics spotting"). Opponent replies
 * auto-play. No passive "watch the reveal" phase.
 *
 * `solutionMoves` is the full alternating line from `setupFen`: the student
 * plays even indices, the opponent auto-plays odd indices. Lichess lines
 * always end on the solver's decisive move, so the student plays the last move.
 */
export function TacticSetupBoard({ puzzle, onComplete }: TacticSetupBoardProps): JSX.Element {
  const chessRef = useRef(new Chess(puzzle.setupFen));
  const [fen, setFen] = useState(puzzle.setupFen);
  const [boardState, setBoardState] = useState<BoardState>('thinking');
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState('Find the quiet setup move');
  const [boardKey, setBoardKey] = useState(0);
  const hasCompleted = useRef(false);

  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  const wrongAttemptsRef = useRef(0);

  const line = useMemo(() => puzzle.solutionMoves.split(' ').filter(Boolean), [puzzle.solutionMoves]);
  const totalSolverMoves = Math.ceil(line.length / 2);
  const isPlayerTurn = moveIndex % 2 === 0; // student plays even indices

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

  // Derive the expected move for the hint system (always the student's next move).
  const knownMove = useMemo((): { from: string; to: string; san: string } | null => {
    if (boardState !== 'thinking' || !isPlayerTurn) return null;
    const uci = line[moveIndex];
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
  }, [boardState, isPlayerTurn, moveIndex, line, fen]);

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

  // Auto-play opponent responses (odd indices in the line)
  useEffect(() => {
    if (boardState !== 'thinking' || isPlayerTurn || moveIndex >= line.length) return;

    const timer = setTimeout(() => {
      const move = line[moveIndex];
      if (!move) return;
      const parsed = parseUciMove(move);
      try {
        chessRef.current.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion });
        setFen(chessRef.current.fen());
        setBoardKey((k) => k + 1);
        setMoveIndex((i) => i + 1);
      } catch {
        setMoveIndex((i) => i + 1);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [boardState, isPlayerTurn, moveIndex, line]);

  const finishSolved = useCallback((): void => {
    if (hasCompleted.current) return;
    hasCompleted.current = true;
    setBoardState('solved');
    const msg = setupRevealComplete(puzzle.tacticType);
    setMessage(msg);
    void voiceService.speak(msg);
    recordTacticOutcome({
      tacticType: puzzle.tacticType,
      found: true,
      wasCoached: wrongAttemptsRef.current > 0,
      context: 'setup',
    });
    setTimeout(() => onComplete(true), 1400);
  }, [puzzle.tacticType, onComplete]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (boardState !== 'thinking' || !isPlayerTurn) return;

    const expectedMove = line[moveIndex];
    if (!expectedMove) return;
    const expected = parseUciMove(expectedMove);

    if (move.from === expected.from && move.to === expected.to) {
      try {
        chessRef.current.move({ from: move.from, to: move.to, promotion: move.promotion });
      } catch {
        chessRef.current.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      }
      resetHints();
      setFen(chessRef.current.fen());
      const wasFirstMove = moveIndex === 0;
      const nextIndex = moveIndex + 1;
      setMoveIndex(nextIndex);

      if (nextIndex >= line.length) {
        finishSolved();
      } else if (wasFirstMove) {
        // The quiet setup just landed — the tactic is now on.
        const prepMsg = setupPrepPlanted(puzzle.tacticType);
        setMessage(prepMsg);
        void voiceService.speak(prepMsg);
      } else {
        // Mid-tactic student move — stay quiet (the board is the lesson here),
        // just update the on-screen prompt.
        setMessage('Keep calculating…');
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

    // ChessBoard applied the wrong move internally — force-reset it to the
    // true position via a key change.
    setFen(chessRef.current.fen());
    setBoardKey((k) => k + 1);

    setTimeout(() => {
      setBoardState('thinking');
    }, 1500);
  }, [boardState, isPlayerTurn, moveIndex, line, puzzle.tacticType, finishSolved, resetHints]);

  const statusColor = boardState === 'solved'
    ? 'var(--color-success)'
    : boardState === 'incorrect'
      ? 'var(--color-error)'
      : 'var(--color-text-muted)';

  const tacticLabel = tacticTypeLabel(puzzle.tacticType);

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
        {boardState === 'thinking' && isPlayerTurn && moveIndex === 0 && (
          <span>Your turn — find the quiet move that sets up the {tacticLabel.toLowerCase()}</span>
        )}
        {boardState === 'thinking' && isPlayerTurn && moveIndex > 0 && (
          <span>Calculate the {tacticLabel.toLowerCase()} — move {Math.floor(moveIndex / 2) + 1} of {totalSolverMoves}</span>
        )}
        {boardState === 'thinking' && !isPlayerTurn && (
          <span>Opponent responding...</span>
        )}
        {boardState === 'solved' && (
          <span>Solved — {tacticLabel.toLowerCase()} calculated to the end</span>
        )}
      </div>
    </div>
  );
}
