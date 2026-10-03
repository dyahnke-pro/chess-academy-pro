import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { HintButton } from '../Coach/HintButton';
import { motion } from 'framer-motion';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useWrongTryRefutation } from '../../hooks/useWrongTryRefutation';
import { useStruggleDetection } from '../../hooks/useStruggleDetection';
import { useSettings } from '../../hooks/useSettings';
import { useAppStore } from '../../stores/appStore';
import type { MoveResult } from '../../hooks/useChessGame';
import { tacticTypeLabel } from '../../services/tacticalProfileService';
import { voiceService } from '../../services/voiceService';
import { setupIntro, setupPrepPlanted, setupRevealComplete, setupIncorrect, setupHintIdea, setupHintPiece } from '../../services/tacticNarrationService';
import { describeMoveGeometry } from '../../services/groundedAnswer';
import { recordCapabilityEvidence } from '../../services/capabilityEvidence';
import { MISTAKE_CP } from '../../services/engineConstants';
import type { HintLevel } from '../../types';
import { recordTacticOutcome } from '../../services/tacticAlertService';
import { reward } from '../../services/rewardService';
import { rewardSeed } from '../../services/rewardEvents';
import type { CoachingTier } from '../../services/tacticAlertService';
import type { SetupPuzzle } from '../../types';
import { DEFAULT_STUDENT_RATING } from '../../services/ratingBands';

type BoardState = 'thinking' | 'incorrect' | 'solved' | 'revealing';

interface TacticSetupBoardProps {
  puzzle: SetupPuzzle;
  /** This puzzle's place in the session (0, 1, 2…). Keys the intro's stem
   *  rotation so two same-theme puzzles back to back never speak the identical
   *  line (which the say-once ledger would swallow). Required: a new caller
   *  must decide what is stable about the moment. */
  sequence: number;
  onComplete: (correct: boolean) => void;
}

const PIECE_WORDS: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Tier-2 highlight on the square of the piece that moves. */
const HINT_PIECE_HIGHLIGHT = 'rgba(255, 255, 0, 0.45)';

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
export function TacticSetupBoard({ puzzle, sequence, onComplete }: TacticSetupBoardProps): JSX.Element {
  const chessRef = useRef(new Chess(puzzle.setupFen));
  const [fen, setFen] = useState(puzzle.setupFen);
  const [boardState, setBoardState] = useState<BoardState>('thinking');
  const wrongTry = useWrongTryRefutation();
  const { refute: refuteTry, clearArrows: clearWrongArrows } = wrongTry;
  const puzzleIdRef = useRef(puzzle.id);
  puzzleIdRef.current = puzzle.id;
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState('Find the quiet setup move');
  const [boardKey, setBoardKey] = useState(0);
  const hasCompleted = useRef(false);

  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  const wrongAttemptsRef = useRef(0);

  /** THE HINT LADDER (hand walk 2026-10-03: one tap handed over the move).
   *  1 = the idea, 2 = the piece (its square lit), 3 = the move + arrow + why.
   *  Per student move: resets when a correct move lands. */
  const [hintTier, setHintTier] = useState<HintLevel>(0);
  const [ladderText, setLadderText] = useState<string | null>(null);
  const [ladderSquare, setLadderSquare] = useState<string | null>(null);
  /** Any hint tier or Show Solution before the first answer → the answer is
   *  PROMPTED (being told is not proving — capabilityEvidence.prompted). */
  const promptedRef = useRef(false);
  /** The first answer of this puzzle has been recorded (held or broken). */
  const answeredRef = useRef(false);

  const line = useMemo(() => puzzle.solutionMoves.split(' ').filter(Boolean), [puzzle.solutionMoves]);
  const totalSolverMoves = Math.ceil(line.length / 2);
  /** Same bar as PuzzleBoard: the second wrong try makes this puzzle a miss,
   *  even if the student goes on to find it. Without it nothing here could
   *  ever be missed, so the rating only climbed. */
  const MAX_WRONG_ATTEMPTS = 2;
  const isPlayerTurn = moveIndex % 2 === 0; // student plays even indices

  const orientation = puzzle.playerColor === 'black' ? 'black' : 'white';

  // GROUNDED payoff geometry (David 2026-06-28): replay the line to compute
  // what the FINAL (decisive) move actually does on the board — "forks the
  // king and rook", "wins the queen", "pins the knight to the queen" — so the
  // solved narration speaks the real tactic, not a generic "fork" template.
  const payoffGeometry = useMemo((): string | null => {
    try {
      const c = new Chess(puzzle.setupFen);
      let fenBeforeLast = puzzle.setupFen;
      let lastSan = '';
      for (let i = 0; i < line.length; i += 1) {
        fenBeforeLast = c.fen();
        const p = parseUciMove(line[i]);
        const r = c.move({ from: p.from, to: p.to, promotion: p.promotion });
        lastSan = r.san;
      }
      if (!lastSan) return null;
      // Last index is even → the student's (orientation) move; odd → opponent.
      const lastIdx = line.length - 1;
      const mover = lastIdx % 2 === 0 ? orientation : (orientation === 'white' ? 'black' : 'white');
      return describeMoveGeometry(fenBeforeLast, lastSan, mover);
    } catch {
      return null;
    }
  }, [puzzle.setupFen, line, orientation]);

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
    playerRating: activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING,
    active: boardState === 'thinking' && isPlayerTurn,
    wrongAttempts: wrongAttemptCount,
    onCoach: handleStruggleCoach,
    // A setup puzzle always names its tactic, so the pattern's own coaching
    // speaks; there is no unnamed case to fill.
    earnedMethod: () => null,
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

  const clearLadder = useCallback((): void => {
    setHintTier(0);
    setLadderText(null);
    setLadderSquare(null);
    resetHints();
  }, [resetHints]);

  // The graduated hint: idea → piece → move. Tiers 1-2 are computed here from
  // the puzzle's tactic type and the board; tier 3 is the shared one-tap
  // answer (move + arrow + grounded why) from useHintSystem. No LLM anywhere.
  const handleHint = useCallback((): void => {
    if (!knownMove || hintTier >= 3) return;
    if (!answeredRef.current) promptedRef.current = true;
    const next = (hintTier + 1) as HintLevel;
    const isSetupMove = moveIndex === 0;
    setHintTier(next);
    if (next === 1) {
      const text = setupHintIdea(puzzle.tacticType, isSetupMove);
      setLadderText(text);
      voiceService.stop();
      void voiceService.speak(text);
      return;
    }
    if (next === 2) {
      let pieceName: string | null = null;
      try {
        const p = new Chess(fen).get(knownMove.from as Parameters<Chess['get']>[0]);
        pieceName = p ? PIECE_WORDS[p.type] ?? null : null;
      } catch { /* the highlight still points at the square */ }
      const text = setupHintPiece(puzzle.tacticType, pieceName, isSetupMove);
      setLadderText(text);
      setLadderSquare(knownMove.from);
      voiceService.stop();
      void voiceService.speak(text);
      return;
    }
    setLadderText(null);
    setLadderSquare(null);
    requestHint();
  }, [knownMove, hintTier, moveIndex, puzzle.tacticType, fen, requestHint]);

  // Narrate intro on mount and reset hints/struggle
  useEffect(() => {
    clearLadder();
    resetStruggle();
    wrongAttemptsRef.current = 0;
    setWrongAttemptCount(0);
    promptedRef.current = false;
    answeredRef.current = false;
    const intro = setupIntro(puzzle.tacticType, puzzle.difficulty, sequence);
    void voiceService.speak(intro);
    return () => { voiceService.stop(); };
  }, [clearLadder, resetStruggle]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Speak the GROUNDED payoff geometry when we computed it ("That forks the
    // king on g8 and the rook on a8."), else the generic completion line.
    const base = setupRevealComplete(puzzle.tacticType);
    const msg = payoffGeometry
      ? `${base} That ${payoffGeometry}.`
      : base;
    setMessage(msg);
    void voiceService.speak(msg);
    recordTacticOutcome({
      tacticType: puzzle.tacticType,
      found: true,
      wasCoached: wrongAttemptsRef.current > 0 || promptedRef.current,
      context: 'setup',
    });
    const counted = wrongAttemptsRef.current < MAX_WRONG_ATTEMPTS;
    setTimeout(() => onComplete(counted), 1400);
  }, [puzzle.tacticType, onComplete, payoffGeometry]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (boardState !== 'thinking' || !isPlayerTurn) return;

    const expectedMove = line[moveIndex];
    if (!expectedMove) return;
    const expected = parseUciMove(expectedMove);
    const fenBeforeAttempt = chessRef.current.fen();

    // CLOSE THE RECORD — the same one call PuzzleBoard makes (2026-10-01):
    // the FIRST answer of the puzzle feeds capabilityEvidence, which owns the
    // board→tag mapping. A hint or Show Solution before it marks it prompted.
    const firstAnswer = !answeredRef.current;
    answeredRef.current = true;
    const isCorrect = move.from === expected.from && move.to === expected.to;
    if (firstAnswer && isCorrect) {
      void recordCapabilityEvidence({
        fenBefore: fenBeforeAttempt, playedSan: move.san, moverColor: orientation,
        cpLoss: 0, origin: 'puzzle', prompted: promptedRef.current,
      });
    }

    if (isCorrect) {
      try {
        chessRef.current.move({ from: move.from, to: move.to, promotion: move.promotion });
      } catch {
        chessRef.current.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      }
      clearLadder();
      setFen(chessRef.current.fen());
      const wasFirstMove = moveIndex === 0;
      const nextIndex = moveIndex + 1;
      setMoveIndex(nextIndex);

      const studentStep = Math.floor(moveIndex / 2);
      if (nextIndex >= line.length) {
        reward({ kind: 'solved', square: move.to, step: studentStep, seed: rewardSeed(puzzle.id) });
        finishSolved();
        return;
      }
      reward({ kind: 'pip', square: move.to, step: studentStep, seed: rewardSeed(puzzle.id) });
      if (wasFirstMove) {
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
    reward({ kind: 'miss', square: move.to });
    voiceService.stop();

    // REFUTE IT, KEEP THE ANSWER (David 2026-10-01): their reply to this move,
    // played out, while it is still on the board; the canned line is the
    // fallback when nothing is computed (a quiet wrong setup often loses
    // nothing — it just does not set the tactic up).
    const puzzleAtTry = puzzle.id;
    const fenBefore = fenBeforeAttempt;
    const promptedAtTry = promptedRef.current;
    void (async () => {
      const r = await refuteTry(fenBefore, move.san);
      // A first answer that is genuinely wrong breaks the capability; one that
      // keeps an edge (`not-best`) is not a failure and is not recorded — the
      // same honesty gate PuzzleBoard applies to an also-good try.
      if (firstAnswer && r?.kind !== 'not-best') {
        void recordCapabilityEvidence({
          fenBefore, playedSan: move.san, moverColor: orientation,
          cpLoss: MISTAKE_CP, origin: 'puzzle', prompted: promptedAtTry,
        });
      }
      if (puzzleIdRef.current !== puzzleAtTry) return;
      const wrongMsg = r?.text ?? setupIncorrect();
      setMessage(wrongMsg);
      const shownAt = Date.now();
      await voiceService.speak(wrongMsg).catch(() => undefined);
      const left = Math.max(0, (r ? 1800 + wrongMsg.length * 35 : 1500) - (Date.now() - shownAt));
      await new Promise((res) => setTimeout(res, left));
      if (puzzleIdRef.current !== puzzleAtTry || hasCompleted.current) return;
      // ChessBoard applied the wrong move internally — force-reset it to the
      // true position via a key change.
      setFen(chessRef.current.fen());
      setBoardKey((k) => k + 1);
      clearWrongArrows();
      setBoardState('thinking');
    })();
  }, [boardState, isPlayerTurn, moveIndex, line, puzzle.tacticType, puzzle.id, finishSolved, clearLadder, refuteTry, clearWrongArrows, orientation]);

  // Show Solution: play the rest of the line on the board, then count it as
  // missed — the fail path this trainer lacked (a student who could not find
  // the setup had no way out but the End-session button).
  const handleShowSolution = useCallback((): void => {
    if (hasCompleted.current || boardState === 'solved') return;
    hasCompleted.current = true;
    if (!answeredRef.current) promptedRef.current = true;
    setLadderText(null);
    setLadderSquare(null);
    voiceService.stop();
    clearWrongArrows();
    setBoardState('revealing');
    let i = moveIndex;
    const step = (): void => {
      if (i >= line.length) {
        const base = setupRevealComplete(puzzle.tacticType);
        const msg = payoffGeometry ? `${base} That ${payoffGeometry}.` : base;
        setMessage(msg);
        void voiceService.speak(msg);
        recordTacticOutcome({ tacticType: puzzle.tacticType, found: false, wasCoached: true, context: 'setup' });
        setTimeout(() => onComplete(false), 2200);
        return;
      }
      const p = parseUciMove(line[i]);
      try { chessRef.current.move({ from: p.from, to: p.to, promotion: p.promotion }); } catch { /* keep going */ }
      setFen(chessRef.current.fen());
      setBoardKey((k) => k + 1);
      i += 1;
      setMoveIndex(i);
      setTimeout(step, 700);
    };
    setMessage('Here is the line');
    step();
  }, [boardState, moveIndex, line, puzzle.tacticType, payoffGeometry, onComplete, clearWrongArrows]);

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
          arrows={wrongTry.arrows.length > 0 ? wrongTry.arrows : hintState.arrows.length > 0 ? hintState.arrows : undefined}
          ghostMove={hintState.ghostMove}
          annotationHighlights={ladderSquare ? [{ square: ladderSquare, color: HINT_PIECE_HIGHLIGHT }] : undefined}
        />
      </div>

      {/* Hint controls */}
      {boardState === 'thinking' && isPlayerTurn && settings.showHints && (
        <div className="flex flex-col items-start gap-2" data-testid="setup-hint-area">
          <HintButton
            currentLevel={hintTier}
            onRequestHint={handleHint}
            disabled={hintState.isAnalyzing}
          />
          {(hintTier >= 3 ? hintState.nudgeText : ladderText) && (
            <p className="text-xs text-amber-500 max-w-sm" data-testid="hint-nudge" data-tier={hintTier}>
              {hintTier >= 3 ? hintState.nudgeText : ladderText}
            </p>
          )}
        </div>
      )}

      {(boardState === 'thinking' || boardState === 'incorrect') && (
        <button
          onClick={handleShowSolution}
          className="self-center text-xs underline opacity-70 hover:opacity-100"
          style={{ color: 'var(--color-text-muted)' }}
          data-testid="setup-show-solution"
        >
          Show Solution
        </button>
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
