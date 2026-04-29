/**
 * CoachPlaySessionView
 * --------------------
 * Game where the user plays against Stockfish with the coach narrating
 * via the `coachMoveCommentary` service (in-depth, eval-tied LLM
 * analysis — not template filler).
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
import { resolveVerbosity } from '../../services/coachCommentaryPolicy';
import { useAppStore } from '../../stores/appStore';
import { stockfishEngine } from '../../services/stockfishEngine';
import { generateMoveCommentary } from '../../services/coachMoveCommentary';
import { useBoardContext } from '../../hooks/useBoardContext';
import type { PlaySessionConfig } from '../../services/coachPlaySession';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Depth used to pull an eval after each move. Small because we only need a
 *  centipawn reading for verdict classification, not a PV. */
const COMMENTARY_EVAL_DEPTH = 12;

export interface CoachPlaySessionViewProps {
  config: PlaySessionConfig;
  /** Student's side. */
  orientation: 'white' | 'black';
  /** Optional subject from the intent parser (e.g. "Sicilian Najdorf"). */
  subject?: string;
  onExit: () => void;
}

export function CoachPlaySessionView({
  config,
  orientation,
  subject,
  onExit,
}: CoachPlaySessionViewProps): JSX.Element {
  const [fen, setFen] = useState<string>(START_FEN);
  const [status, setStatus] = useState<string>('Your move. I will think, then reply — listen for a short analysis after each move.');
  const [thinking, setThinking] = useState<boolean>(false);
  const [commenting, setCommenting] = useState<boolean>(false);
  const chessRef = useRef<Chess>(new Chess());

  // Publish the live board as the "last position" so the user can
  // leave this game, ask "explain this position" in chat, and be
  // routed back here with the right FEN. See useBoardContext.ts.
  const turn: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  useBoardContext(
    fen,
    '',
    0,
    orientation,
    turn,
    undefined,
    undefined,
    'play-session',
    subject ? `Play vs. Coach — ${subject}` : 'Play vs. Coach',
  );
  // Track the evaluation BEFORE each move so we can classify the swing.
  const evalBeforeRef = useRef<number | null>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Configure Stockfish skill at session start.
  useEffect(() => {
    void setSkill(config.skill);
  }, [config.skill]);

  // Kick off commentary after EITHER side moves: analyze, then ask the LLM.
  const narrateCommentary = useCallback(async (mover: 'w' | 'b'): Promise<void> => {
    if (!isMountedRef.current) return;
    setCommenting(true);
    try {
      const evalBefore = evalBeforeRef.current;
      // Ask Stockfish for the eval (and best reply) at the current position.
      let evalAfter: number | null = null;
      let bestReplySan: string | undefined;
      try {
        const analysis = await stockfishEngine
          .queueAnalysis(chessRef.current.fen(), COMMENTARY_EVAL_DEPTH);
        if (!isMountedRef.current) return;
        evalAfter = analysis.evaluation;
        const bestUci = analysis.bestMove;
        if (bestUci) {
          try {
            const probe = new Chess(chessRef.current.fen());
            const from = bestUci.slice(0, 2);
            const to = bestUci.slice(2, 4);
            const promotion = bestUci.length > 4 ? bestUci[4] : undefined;
            const probeMove = probe.move({ from, to, promotion });
            bestReplySan = probeMove.san;
          } catch {
            // Ignore — best-move probe is best-effort only.
          }
        }
      } catch {
        // Stockfish unavailable — LLM will still speak from the move alone.
      }

      const commentary = await generateMoveCommentary({
        gameAfter: chessRef.current,
        mover,
        evalBefore,
        evalAfter,
        bestReplySan,
        subject,
      });
      if (!isMountedRef.current) return;
      // Store the new eval as the baseline for the NEXT move's swing.
      evalBeforeRef.current = evalAfter;
      if (commentary) {
        setStatus(commentary);
        // Per-move narration. Honors coachCommentaryVerbosity === 'off'
        // by skipping speech (the text still surfaces via setStatus).
        // Phase narration takes precedence — voiceService.speakInternal
        // calls stop() before each utterance, so a phase summary kicking
        // in cleanly cuts off move narration.
        const verbosity = resolveVerbosity(useAppStore.getState().activeProfile);
        if (verbosity !== 'off') {
          void voiceService.speak(commentary).catch((err: unknown) => {
            console.warn('[CoachPlaySession] move narration TTS failed:', err);
          });
        }
      } else {
        // No LLM available — keep the board moving but do not paint filler.
        // Clear any stale commentary so the student isn't misled.
        setStatus(defaultStatus(chessRef.current));
      }
    } finally {
      if (isMountedRef.current) setCommenting(false);
    }
  }, [subject]);

  // Engine move → update board → narrate.
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
        setStatus('The engine returned an illegal move. Please restart the session.');
        return;
      }
      const nextFen = chessRef.current.fen();
      if (!isMountedRef.current) return;
      setFen(nextFen);
      if (chessRef.current.isGameOver()) {
        setStatus(describeGameOver(chessRef.current));
        return;
      }
      await narrateCommentary(chessRef.current.turn() === 'w' ? 'b' : 'w');
    } finally {
      if (isMountedRef.current) setThinking(false);
    }
  }, [config, narrateCommentary]);

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
      // Narrate the student's move in the background, then make the
      // engine's reply (which will narrate itself).
      const moverForUser: 'w' | 'b' = chessRef.current.turn() === 'w' ? 'b' : 'w';
      void (async () => {
        await narrateCommentary(moverForUser);
        if (!isMountedRef.current) return;
        await playComputerMove();
      })();
      return true;
    },
    [narrateCommentary, playComputerMove],
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-theme-text truncate">Play vs. Coach</h1>
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          {config.label}
        </div>
        <p className="text-sm text-theme-text mt-2 leading-snug">
          {thinking ? 'Coach is thinking…' : commenting ? 'Analysing…' : status}
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
          interactive={!thinking && !commenting && !chessRef.current.isGameOver()}
          onPieceDrop={handlePieceDrop}
        />
      }
      controls={controls}
    />
  );
}

/** Minimal status when the LLM is unavailable — tells the student whose
 *  turn it is without painting any generic "analysis". */
function defaultStatus(game: Chess): string {
  if (game.isGameOver()) return describeGameOver(game);
  return game.turn() === 'w' ? "White to move." : "Black to move.";
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
