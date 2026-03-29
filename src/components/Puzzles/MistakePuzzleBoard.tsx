import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useSettings } from '../../hooks/useSettings';
import { voiceService } from '../../services/voiceService';
import { CheckCircle, XCircle, AlertTriangle, Volume2 } from 'lucide-react';
import { HintButton } from '../Coach/HintButton';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MistakePuzzle, MistakeClassification } from '../../types';

type PuzzleState = 'loading' | 'playing' | 'correct' | 'incorrect';

interface MistakePuzzleBoardProps {
  puzzle: MistakePuzzle;
  onComplete: (correct: boolean) => void;
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

function parseUciMoves(uci: string): { from: string; to: string; promotion?: string }[] {
  if (!uci || uci.trim().length === 0) return [];
  return uci.trim().split(/\s+/).map((m) => ({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: m.length > 4 ? m.slice(4) : undefined,
  }));
}

export function MistakePuzzleBoard({ puzzle, onComplete }: MistakePuzzleBoardProps): JSX.Element {
  const [state, setState] = useState<PuzzleState>('loading');
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState(puzzle.fen);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: string; to: string } | null>(null);
  const [subtitle, setSubtitle] = useState<string>('');
  // boardKey increments to force ChessBoard remount only on resets
  const [boardKey, setBoardKey] = useState(0);
  const hasMadeMistakeRef = useRef(false);
  const chessRef = useRef(new Chess(puzzle.fen));
  const movesRef = useRef(parseUciMoves(puzzle.moves));
  const playerMoveCountRef = useRef(0);
  const { playMoveSound, playCelebration, playEncouragement } = usePieceSound();
  const { settings } = useSettings();

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

  // Reset when puzzle changes
  useEffect(() => {
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    movesRef.current = parseUciMoves(puzzle.moves);
    playerMoveCountRef.current = 0;
    setMoveIndex(0);
    setMoveCount(0);
    setFen(puzzle.fen);
    setLastMoveHighlight(null);
    setSubtitle('');
    setBoardKey((k) => k + 1);
    hasMadeMistakeRef.current = false;
    setState('loading');
    resetHints();
    voiceService.stop();

    // Brief loading state then ready to play — speak intro narration
    const timer = setTimeout(() => {
      setState('playing');
      if (puzzle.narration.intro) {
        setSubtitle(puzzle.narration.intro);
        void voiceService.speak(puzzle.narration.intro);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      voiceService.stop();
    };
  }, [puzzle, resetHints]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (state !== 'playing') return;

    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return;
    const expected = allMoves[moveIndex];

    const isCorrect = move.from === expected.from && move.to === expected.to;

    if (isCorrect) {
      playMoveSound(move.san);
      resetHints();
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
          setTimeout(() => {
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
      chessRef.current.undo();
      const prevFen = chessRef.current.fen();
      setState('incorrect');
      voiceService.stop();
      playEncouragement();

      setFen(prevFen);
      setBoardKey((k) => k + 1);

      // Brief feedback then back to playing
      setTimeout(() => {
        setState('playing');
      }, 1000);
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
      <div className="flex items-center gap-2">
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
        <span className="text-xs text-theme-text-muted">
          From your game
        </span>
      </div>

      <p className="text-sm text-theme-text-secondary" data-testid="prompt-text">
        {puzzle.promptText}
        {isMultiMove && (
          <span className="text-theme-text-muted ml-1">
            ({Math.ceil(totalMoves / 2)} move{Math.ceil(totalMoves / 2) > 1 ? 's' : ''} to find)
          </span>
        )}
      </p>

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
