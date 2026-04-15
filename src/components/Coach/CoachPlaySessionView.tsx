/**
 * CoachPlaySessionView
 * --------------------
 * Renders a game where the user plays against Stockfish with the
 * coach narrating the opponent's moves.
 *
 * Lives inside the CoachSessionPage route; always renders inside
 * ConsistentChessboard + ChessLessonLayout.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, Flag } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { getCoachMove, setSkill } from '../../services/coachPlaySession';
import { voiceService } from '../../services/voiceService';
import type { PlaySessionConfig } from '../../services/coachPlaySession';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface CoachPlaySessionViewProps {
  config: PlaySessionConfig;
  /** Student's side. */
  orientation: 'white' | 'black';
  onExit: () => void;
}

export function CoachPlaySessionView({
  config,
  orientation,
  onExit,
}: CoachPlaySessionViewProps): JSX.Element {
  const [fen, setFen] = useState<string>(START_FEN);
  const [status, setStatus] = useState<string>('Your move.');
  const [thinking, setThinking] = useState<boolean>(false);
  const chessRef = useRef<Chess>(new Chess());

  // Configure Stockfish skill at session start.
  useEffect(() => {
    void setSkill(config.skill);
  }, [config.skill]);

  // If the student plays black, Stockfish makes the first move.
  const playComputerMove = useCallback(async (): Promise<void> => {
    setThinking(true);
    try {
      const uci = await getCoachMove(chessRef.current.fen(), config);
      try {
        chessRef.current.move({
          from: uci.from,
          to: uci.to,
          promotion: uci.promotion,
        });
      } catch {
        // Illegal move — engine failure. Bail.
        setStatus('Engine returned an illegal move. Please restart.');
        setThinking(false);
        return;
      }
      const nextFen = chessRef.current.fen();
      setFen(nextFen);
      const narration = buildCoachNarration(chessRef.current);
      setStatus(narration);
      // Fire and forget — no blocking needed since this is one-off
      // commentary, not a scripted lesson.
      void voiceService.speak(narration);
    } finally {
      setThinking(false);
    }
  }, [config]);

  useEffect(() => {
    if (orientation === 'black') {
      void playComputerMove();
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!targetSquare) return false;
      try {
        chessRef.current.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      } catch {
        return false;
      }
      setFen(chessRef.current.fen());
      if (chessRef.current.isGameOver()) {
        setStatus(describeGameOver(chessRef.current));
        return true;
      }
      void playComputerMove();
      return true;
    },
    [playComputerMove],
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-theme-text truncate">Play vs. Coach</h1>
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          {config.label}
        </div>
        <p className="text-sm text-theme-text mt-2 leading-snug">
          {thinking ? 'Coach is thinking…' : status}
        </p>
      </div>
      <button
        onClick={onExit}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-theme-surface border border-theme-border text-sm"
        aria-label="Back to chat"
      >
        <ArrowLeft size={16} />
        Chat
      </button>
    </div>
  );

  const controls = (
    <button
      onClick={onExit}
      className="flex items-center gap-2 px-5 h-12 rounded-full bg-theme-surface border border-theme-border text-sm"
      aria-label="Resign and return to chat"
    >
      <Flag size={16} />
      Resign
    </button>
  );

  return (
    <ChessLessonLayout
      header={header}
      board={
        <ConsistentChessboard
          fen={fen}
          boardOrientation={orientation}
          interactive={!thinking && !chessRef.current.isGameOver()}
          onPieceDrop={handlePieceDrop}
        />
      }
      controls={controls}
    />
  );
}

/**
 * Build a short coach-style comment on the last move. Kept
 * template-based to avoid an LLM round-trip on every move; the coach
 * chat itself can deepen analysis on request.
 */
function buildCoachNarration(game: Chess): string {
  if (game.isCheckmate()) return "Checkmate. Good game!";
  if (game.isStalemate()) return 'Stalemate.';
  if (game.isDraw()) return "It's a draw.";
  if (game.inCheck()) return 'Check. Your king is under attack — watch the squares around it.';
  const history = game.history({ verbose: true });
  const last = history.length > 0 ? history[history.length - 1] : undefined;
  if (!last) return 'Your move.';
  if (last.isCapture()) return `I captured on ${last.to}.`;
  if (last.isKingsideCastle() || last.isQueensideCastle()) return 'I castled.';
  return `I played ${last.san}.`;
}

function describeGameOver(game: Chess): string {
  if (game.isCheckmate()) {
    return game.turn() === 'w'
      ? 'Checkmate! Black wins.'
      : 'Checkmate! White wins.';
  }
  if (game.isStalemate()) return 'Stalemate — a draw.';
  if (game.isThreefoldRepetition()) return 'Draw by threefold repetition.';
  if (game.isInsufficientMaterial()) return 'Draw — insufficient material.';
  if (game.isDraw()) return "It's a draw.";
  return 'Game over.';
}
