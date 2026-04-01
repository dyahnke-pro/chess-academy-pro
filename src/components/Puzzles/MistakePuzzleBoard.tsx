import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useSettings } from '../../hooks/useSettings';
import { voiceService } from '../../services/voiceService';
import { describePositionIdea } from '../../services/mistakeNarration';
import { db } from '../../db/schema';
import { CheckCircle, XCircle, AlertTriangle, Volume2, Clock, User, BookOpen, Play, HelpCircle } from 'lucide-react';
import { HintButton } from '../Coach/HintButton';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MistakePuzzle, MistakeClassification } from '../../types';

type PuzzleState = 'loading' | 'replay' | 'playing' | 'correct' | 'incorrect';

/** Number of half-moves (plies) before the mistake to replay */
const REPLAY_CONTEXT_PLIES = 8;
/** Delay between auto-played replay moves (ms) */
const REPLAY_MOVE_DELAY = 900;

interface ReplayStep {
  fen: string;
  san: string;
  from: string;
  to: string;
  moveLabel: string; // e.g. "1. e4" or "1... e5"
}

/** Extract the last N moves before the mistake from the game PGN */
function extractReplayMoves(pgn: string, _mistakeFen: string, playerColor: 'white' | 'black', moveNumber: number): ReplayStep[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const history = chess.history({ verbose: true });
  chess.reset();

  // Find the ply index of the mistake position
  // mistakeFen is the position BEFORE the wrong move, so it's the position after (moveNumber-1) full moves for white,
  // or after moveNumber moves for black
  const mistakePly = (moveNumber - 1) * 2 + (playerColor === 'black' ? 1 : 0);

  if (mistakePly <= 0 || mistakePly > history.length) return [];

  // Determine range to replay: last REPLAY_CONTEXT_PLIES plies before the mistake
  const startPly = Math.max(0, mistakePly - REPLAY_CONTEXT_PLIES);
  const endPly = mistakePly; // exclusive — stop right before the mistake

  // Advance chess to startPly position
  const replayChess = new Chess();
  for (let i = 0; i < startPly; i++) {
    replayChess.move(history[i].san);
  }

  const steps: ReplayStep[] = [];
  for (let i = startPly; i < endPly && i < history.length; i++) {
    const move = history[i];
    const fullMoveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const moveLabel = isWhite ? `${fullMoveNum}. ${move.san}` : `${fullMoveNum}... ${move.san}`;

    replayChess.move(move.san);
    steps.push({
      fen: replayChess.fen(),
      san: move.san,
      from: move.from,
      to: move.to,
      moveLabel,
    });
  }

  return steps;
}

interface MistakePuzzleBoardProps {
  puzzle: MistakePuzzle;
  onComplete: (correct: boolean) => void;
  /** Skip the internal game replay — use when the caller already showed context */
  skipReplayContext?: boolean;
}

const CLASSIFICATION_BADGE: Record<MistakeClassification, { label: string; symbol: string; color: string }> = {
  miss: { label: 'Miss', symbol: '✕', color: 'text-purple-500 bg-purple-500/10' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'text-yellow-500 bg-yellow-500/10' },
  mistake: { label: 'Mistake', symbol: '?', color: 'text-orange-500 bg-orange-500/10' },
  blunder: { label: 'Blunder', symbol: '??', color: 'text-red-500 bg-red-500/10' },
};

const PHASE_LABELS: Record<string, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

function formatTimeAgo(dateStr: string): string {
  const gameDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - gameDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const PIECE_NAMES: Record<string, string> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
};

function getPieceNameOnSquare(chess: Chess, square: string): string | null {
  const piece = chess.get(square as Parameters<Chess['get']>[0]);
  if (!piece) return null;
  return PIECE_NAMES[piece.type] ?? null;
}

function parseUciMoves(uci: string): { from: string; to: string; promotion?: string }[] {
  if (!uci || uci.trim().length === 0) return [];
  return uci.trim().split(/\s+/).map((m) => ({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: m.length > 4 ? m.slice(4) : undefined,
  }));
}

export function MistakePuzzleBoard({ puzzle, onComplete, skipReplayContext = false }: MistakePuzzleBoardProps): JSX.Element {
  const [state, setState] = useState<PuzzleState>('loading');
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState(puzzle.fen);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: string; to: string } | null>(null);
  const [subtitle, setSubtitle] = useState<string>('');
  // boardKey increments to force ChessBoard remount only on resets
  const [boardKey, setBoardKey] = useState(0);
  const hasMadeMistakeRef = useRef(false);
  const wrongAttemptsRef = useRef(0);
  const chessRef = useRef(new Chess(puzzle.fen));
  const movesRef = useRef(parseUciMoves(puzzle.moves));
  const playerMoveCountRef = useRef(0);
  const { playMoveSound, playCelebration, playEncouragement } = usePieceSound();
  const { settings } = useSettings();

  // Replay state
  const [replaySteps, setReplaySteps] = useState<ReplayStep[]>([]);
  const [replayIndex, setReplayIndex] = useState(-1);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const badge = CLASSIFICATION_BADGE[puzzle.classification];
  const totalMoves = movesRef.current.length;
  const isMultiMove = totalMoves > 1;

  // Derive the expected move for hint system
  const knownMove = useMemo((): { from: string; to: string; san: string } | null => {
    if (state !== 'playing') return null;
    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return null;
    const expected = allMoves[moveIndex];
    try {
      const chess = new Chess(fen);
      const result = chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      chess.undo();
      return { from: expected.from, to: expected.to, san: result.san };
    } catch {
      return { from: expected.from, to: expected.to, san: '' };
    }
  }, [state, moveIndex, fen]);

  const { hintState, requestHint, resetHints } = useHintSystem({
    fen,
    playerColor: puzzle.playerColor,
    enabled: settings.showHints && state === 'playing',
    knownMove,
    puzzleThemes: [],
  });

  // Reset when puzzle changes — fetch source game and start replay
  useEffect(() => {
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    movesRef.current = parseUciMoves(puzzle.moves);
    playerMoveCountRef.current = 0;
    setMoveIndex(0);
    setMoveCount(0);
    setLastMoveHighlight(null);
    setSubtitle('');
    hasMadeMistakeRef.current = false;
    setReplayIndex(-1);

    resetHints();
    voiceService.stop();

    void voiceService.warmup();

    // Try to load the source game for replay context (skip if caller already showed it)
    const cancelledRef = { value: false };
    void (async () => {
      let steps: ReplayStep[] = [];
      if (!skipReplayContext) {
        try {
          const game = await db.games.get(puzzle.sourceGameId);
          if (game?.pgn && !cancelledRef.value) {
            steps = extractReplayMoves(game.pgn, puzzle.fen, puzzle.playerColor, puzzle.moveNumber);
          }
        } catch {
          // No game found — skip replay
        }
      }

      if (cancelledRef.value) return;

      if (steps.length > 0) {
        // The starting FEN is the position before the first replay move
        const preReplayFen = (() => {
          // The first step's fen is AFTER the first replay move was played.
          // We need the FEN BEFORE that move. We can reconstruct it from the first step.
          const c = new Chess(steps[0].fen);
          c.undo();
          return c.fen();
        })();

        setFen(preReplayFen);
        setBoardKey((k) => k + 1);
        setReplaySteps(steps);
        setState('replay');

        // Narrate the replay intro
        const contextMsg = puzzle.openingName
          ? `Let's replay the ${puzzle.openingName}. Here's how the game reached this position.`
          : `Let's see how the game reached this position.`;
        setSubtitle(contextMsg);
        void voiceService.speak(contextMsg);
      } else {
        // No replay available — go straight to puzzle
        setFen(puzzle.fen);
        setBoardKey((k) => k + 1);
        setReplaySteps([]);
        setState('loading');
        const timer = setTimeout(() => {
          setState('playing');
          if (puzzle.narration.intro) {
            setSubtitle(puzzle.narration.intro);
            void voiceService.speak(puzzle.narration.intro);
          }
        }, 400);
        replayTimerRef.current = timer;
      }
    })();

    return () => {
      cancelledRef.value = true;
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      if (outroTimerRef.current) {
        clearTimeout(outroTimerRef.current);
        outroTimerRef.current = null;
      }
      voiceService.stop();
    };
  }, [puzzle, resetHints, skipReplayContext]);

  // Auto-play replay moves one at a time
  useEffect(() => {
    if (state !== 'replay' || replaySteps.length === 0) return;

    // Start the first move after a brief pause for the intro narration
    const initialDelay = replayIndex === -1 ? 1800 : REPLAY_MOVE_DELAY;

    const timer = setTimeout(() => {
      const nextIdx = replayIndex + 1;

      if (nextIdx >= replaySteps.length) {
        // Replay done — show the player's mistake, then transition to puzzle
        const step = replaySteps[replaySteps.length - 1];
        setFen(step.fen);
        setBoardKey((k) => k + 1);

        // Brief pause then show the wrong move narration and start puzzle
        const mistakeMsg = `You played ${puzzle.playerMoveSan} here — ${puzzle.classification === 'miss' ? 'missing an opportunity' : `a ${puzzle.classification}`}. Let's find the best move.`;
        setSubtitle(mistakeMsg);
        void voiceService.speak(mistakeMsg);

        replayTimerRef.current = setTimeout(() => {
          // Set up puzzle position
          chessRef.current = new Chess(puzzle.fen);
          setFen(puzzle.fen);
          setBoardKey((k) => k + 1);
          setState('playing');
          if (puzzle.narration.intro) {
            setSubtitle(puzzle.narration.intro);
            void voiceService.speak(puzzle.narration.intro);
          }
        }, 2500);
        return;
      }

      const step = replaySteps[nextIdx];
      playMoveSound(step.san);
      setFen(step.fen);
      setLastMoveHighlight({ from: step.from, to: step.to });
      setBoardKey((k) => k + 1);

      // Narrate the move
      const isPlayerMove = (puzzle.playerColor === 'white' && nextIdx % 2 === 0)
        || (puzzle.playerColor === 'black' && nextIdx % 2 === 1);
      // Adjust: replay steps may not start at ply 0, so use the step's moveLabel
      const whoPlayed = isPlayerMove ? 'You' : 'Opponent';
      // Only narrate every other move to keep pace — narrate player's moves
      if (isPlayerMove || nextIdx === replaySteps.length - 1) {
        setSubtitle(`${whoPlayed}: ${step.moveLabel}`);
      }

      setReplayIndex(nextIdx);
    }, initialDelay);

    replayTimerRef.current = timer;

    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [state, replayIndex, replaySteps, puzzle, playMoveSound]);

  // Skip replay handler
  const skipReplay = useCallback(() => {
    if (state !== 'replay') return;
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    voiceService.stop();

    chessRef.current = new Chess(puzzle.fen);
    setFen(puzzle.fen);
    setLastMoveHighlight(null);
    setBoardKey((k) => k + 1);
    setState('playing');
    if (puzzle.narration.intro) {
      setSubtitle(puzzle.narration.intro);
      void voiceService.speak(puzzle.narration.intro);
    }
  }, [state, puzzle]);

  // "Why?" button — explain the concept without revealing the move
  const handleWhy = useCallback(() => {
    if (state !== 'playing' && state !== 'correct') return;
    voiceService.stop();
    const hint = puzzle.narration.conceptHint;
    if (hint) {
      setSubtitle(hint);
      void voiceService.speak(hint);
    } else {
      // Generate a spoiler-free positional explanation
      const explanation = describePositionIdea(puzzle.fen, puzzle.bestMoveSan, puzzle.gamePhase);
      setSubtitle(explanation);
      void voiceService.speak(explanation);
    }
  }, [state, puzzle]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (state !== 'playing') return;

    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return;
    const expected = allMoves[moveIndex];

    const isCorrect = move.from === expected.from && move.to === expected.to;

    if (isCorrect) {
      playMoveSound(move.san);
      resetHints();
      wrongAttemptsRef.current = 0;
      setLastMoveHighlight({ from: move.from, to: move.to });
      setMoveCount((c) => c + 1);

      // Speak per-move narration
      const currentPlayerMove = playerMoveCountRef.current;
      playerMoveCountRef.current += 1;
      const moveNarrations = puzzle.narration.moveNarrations;
      if (moveNarrations[currentPlayerMove]) {
        voiceService.stop();
        setSubtitle(moveNarrations[currentPlayerMove]);
        void voiceService.speak(moveNarrations[currentPlayerMove]);
      }

      const nextIndex = moveIndex + 1;

      // Check if puzzle is fully solved
      if (nextIndex >= allMoves.length) {
        const solvedCleanly = !hasMadeMistakeRef.current;
        setState('correct');
        playCelebration();
        // Speak outro after a brief delay so celebration sound plays first
        if (puzzle.narration.outro) {
          outroTimerRef.current = setTimeout(() => {
            setSubtitle(puzzle.narration.outro);
            void voiceService.speak(puzzle.narration.outro);
          }, 800);
        }
        onComplete(solvedCleanly);
        return;
      }

      // Auto-play opponent's response after a delay
      setMoveIndex(nextIndex);
      if (nextIndex < allMoves.length) {
        const opponentMove = allMoves[nextIndex];
        setTimeout(() => {
          try {
            const result = chessRef.current.move({
              from: opponentMove.from,
              to: opponentMove.to,
              promotion: opponentMove.promotion,
            });
            playMoveSound(result.san);
            const newFen = chessRef.current.fen();
            setLastMoveHighlight({ from: opponentMove.from, to: opponentMove.to });
            setFen(newFen);
            setBoardKey((k) => k + 1);
          } catch {
            // skip invalid opponent move
          }
          setMoveIndex(nextIndex + 1);
        }, 500);
      }
    } else {
      // Wrong move — undo and let them try again from the same position
      hasMadeMistakeRef.current = true;
      wrongAttemptsRef.current += 1;
      chessRef.current.undo();
      const prevFen = chessRef.current.fen();
      setState('incorrect');
      voiceService.stop();
      playEncouragement();

      // Progressive verbal hints based on consecutive wrong attempts
      const attempts = wrongAttemptsRef.current;
      const expectedMove = movesRef.current[moveIndex];
      let hint = '';

      if (attempts === 1 && puzzle.narration.conceptHint) {
        hint = puzzle.narration.conceptHint;
      } else if (attempts === 2) {
        // Piece hint — tell them which piece to look at
        const pieceName = getPieceNameOnSquare(chessRef.current, expectedMove.from);
        hint = pieceName
          ? `Look at what your ${pieceName} can do.`
          : 'Look more carefully at the position.';
      } else if (attempts >= 3) {
        // Square hint — reveal the target square
        hint = `The key square is ${expectedMove.to}. What can reach it?`;
      } else {
        hint = 'Try again — think about the position.';
      }

      setSubtitle(hint);
      void voiceService.speak(hint);

      setFen(prevFen);
      setBoardKey((k) => k + 1);

      // Brief feedback then back to playing
      setTimeout(() => {
        setState('playing');
      }, 1500);
    }
  }, [state, moveIndex, onComplete, playMoveSound, playCelebration, playEncouragement, resetHints, puzzle.narration]);

  const handleChessBoardMove = useCallback((moveResult: MoveResult): void => {
    try {
      chessRef.current.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
    } catch {
      // Move already applied or invalid
    }
    setFen(chessRef.current.fen());
    handleMove(moveResult);
  }, [handleMove]);

  return (
    <div className="space-y-3" data-testid="mistake-puzzle-board">
      {/* Header with classification badge and phase */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${badge.color}`}
          data-testid="classification-badge"
        >
          <AlertTriangle size={12} />
          {badge.symbol} {badge.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-theme-surface text-theme-text-muted border border-theme-border">
          {PHASE_LABELS[puzzle.gamePhase]}
        </span>
        {puzzle.openingName && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-theme-surface text-theme-text-muted border border-theme-border" data-testid="opening-name">
            <BookOpen size={10} />
            {puzzle.openingName}
          </span>
        )}
      </div>

      {/* Game context: opponent + time ago */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted" data-testid="game-context">
        {puzzle.opponentName && (
          <span className="inline-flex items-center gap-1">
            <User size={11} />
            vs {puzzle.opponentName}
          </span>
        )}
        {puzzle.gameDate && (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {formatTimeAgo(puzzle.gameDate)}
          </span>
        )}
        {!puzzle.opponentName && !puzzle.gameDate && (
          <span>From your game</span>
        )}
      </div>

      {/* Replay context header */}
      {state === 'replay' && (
        <div className="flex items-center justify-between" data-testid="replay-header">
          <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
            <Play size={14} className="text-theme-accent" />
            <span>Replaying game context...</span>
            {replaySteps.length > 0 && (
              <span className="text-xs text-theme-text-muted">
                {Math.max(0, replayIndex + 1)}/{replaySteps.length}
              </span>
            )}
          </div>
          <button
            onClick={skipReplay}
            className="text-xs px-3 py-1 rounded bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text-primary transition-colors"
            data-testid="skip-replay"
          >
            Skip
          </button>
        </div>
      )}

      {/* Show the wrong move before asking for the correct one */}
      {state !== 'replay' && (
        <div className="text-sm text-theme-text-secondary space-y-1" data-testid="prompt-text">
          <p>
            You played <span className="font-semibold text-red-400">{puzzle.playerMoveSan}</span> — {puzzle.classification === 'miss' ? 'missing an opportunity' : `a ${puzzle.classification}`}.
            {' '}Find the best move.
            {isMultiMove && (
              <span className="text-theme-text-muted ml-1">
                ({Math.ceil(totalMoves / 2)} move{Math.ceil(totalMoves / 2) > 1 ? 's' : ''} to find)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Board */}
      <div className="w-full md:max-w-[420px] mx-auto">
        <ChessBoard
          initialFen={fen}
          key={boardKey}
          orientation={puzzle.playerColor}
          interactive={state === 'playing'}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={handleChessBoardMove}
          highlightSquares={lastMoveHighlight}
          arrows={hintState.arrows.length > 0 ? hintState.arrows : undefined}
          ghostMove={hintState.ghostMove}
        />
      </div>

      {/* Why button — explains the concept behind the best move */}
      {(state === 'playing' || state === 'correct') && (
        <div className="flex justify-end">
          <button
            onClick={handleWhy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-accent text-sm transition-colors border border-theme-border"
            data-testid="why-button"
          >
            <HelpCircle size={14} />
            <span>Why?</span>
          </button>
        </div>
      )}

      {/* Hint controls */}
      {state === 'playing' && settings.showHints && (
        <div className="flex flex-col items-start gap-2" data-testid="puzzle-hint-area">
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

      {/* Progress indicator for multi-move */}
      {isMultiMove && state === 'playing' && moveCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-theme-text-muted" data-testid="move-progress">
          <div className="flex-1 h-1.5 rounded-full bg-theme-border overflow-hidden">
            <div
              className="h-full rounded-full bg-theme-accent transition-all"
              style={{ width: `${(moveCount / Math.ceil(totalMoves / 2)) * 100}%` }}
            />
          </div>
          <span>{moveCount}/{Math.ceil(totalMoves / 2)}</span>
        </div>
      )}

      {/* Status feedback */}
      {state === 'correct' && (
        <div className="flex items-center gap-2 text-green-500" data-testid="puzzle-correct">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">
            Correct!{isMultiMove ? ` You found all ${Math.ceil(totalMoves / 2)} moves.` : ` The best move was ${puzzle.bestMoveSan}.`}
          </span>
        </div>
      )}
      {state === 'incorrect' && (
        <div className="flex items-center gap-2 text-red-500" data-testid="puzzle-incorrect">
          <XCircle size={18} />
          <span className="text-sm font-medium">Incorrect — try again</span>
        </div>
      )}
      {state === 'loading' && (
        <div className="text-sm text-theme-text-muted" data-testid="puzzle-loading">
          Setting up position...
        </div>
      )}

      {/* Coach narration subtitle */}
      {subtitle && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg bg-theme-surface border border-theme-border"
          data-testid="narration-subtitle"
        >
          <Volume2 size={14} className="shrink-0 mt-0.5 text-theme-accent" />
          <p className="text-xs text-theme-text-muted leading-relaxed">{subtitle}</p>
        </div>
      )}

      {/* Puzzle info */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted">
        <span>Move {puzzle.moveNumber}</span>
        <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
        <span>{puzzle.cpLoss}cp loss</span>
        {isMultiMove && (
          <>
            <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
            <span>{Math.ceil(totalMoves / 2)} moves deep</span>
          </>
        )}
      </div>
    </div>
  );
}
