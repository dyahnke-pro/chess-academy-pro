/**
 * CoachPracticeSessionView
 * ------------------------
 * Full-screen interactive practice board for coach-assigned exercises.
 *
 * The coach assigns a practice position via `[BOARD: practice:FEN:Label]`
 * in chat. Previously that rendered as a tiny inline board inside the
 * floating coach drawer; now the drawer shows a "Start Practice" button
 * that routes here so the student plays on a real full-size board.
 *
 * Reads the active practice position from `globalPracticePosition` in
 * the Zustand store. On exit (success, reveal, or manual), clears the
 * position and navigates back to the chat drawer / previous screen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { useChessGame } from '../../hooks/useChessGame';
import { useAppStore } from '../../stores/appStore';
import { usePracticePosition } from '../../hooks/usePracticePosition';
import type { MoveResult } from '../../hooks/useChessGame';
import type { BoardAnnotationCommand } from '../../types';

export interface CoachPracticeSessionViewProps {
  onExit: () => void;
}

type FeedbackState =
  | { kind: 'idle' }
  | { kind: 'thinking' }
  | { kind: 'correct'; message: string }
  | { kind: 'wrong'; message: string }
  | { kind: 'reveal'; message: string };

export function CoachPracticeSessionView({
  onExit,
}: CoachPracticeSessionViewProps): JSX.Element {
  const globalPractice = useAppStore((s) => s.globalPracticePosition);
  const setGlobalPractice = useAppStore((s) => s.setGlobalPracticePosition);

  const {
    practicePosition,
    handlePracticeMove: evaluatePracticeMove,
    exitPractice,
    setPracticeFromAnnotation,
  } = usePracticePosition();

  // Seed the local hook from the global store once the view mounts so
  // the hook's evaluation logic has a position to score against.
  useEffect(() => {
    if (globalPractice && !practicePosition) {
      const seed: BoardAnnotationCommand[] = [
        {
          type: 'practice',
          fen: globalPractice.fen,
          label: globalPractice.label,
        },
      ];
      setPracticeFromAnnotation(seed);
    }
  }, [globalPractice, practicePosition, setPracticeFromAnnotation]);

  const active = practicePosition ?? globalPractice;
  const orientation: 'white' | 'black' = useMemo(() => {
    if (!active?.fen) return 'white';
    return active.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  }, [active?.fen]);

  const game = useChessGame(active?.fen, orientation);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: 'idle' });

  const handleExit = useCallback(() => {
    exitPractice();
    setGlobalPractice(null);
    onExit();
  }, [exitPractice, setGlobalPractice, onExit]);

  const handleMove = useCallback(
    (move: MoveResult): void => {
      setFeedback({ kind: 'thinking' });
      void (async () => {
        const result = await evaluatePracticeMove(move);
        if (result.type === 'correct') {
          setFeedback({ kind: 'correct', message: result.message });
          setGlobalPractice(null);
        } else if (result.type === 'reveal') {
          setFeedback({ kind: 'reveal', message: result.message });
          setGlobalPractice(null);
        } else {
          setFeedback({ kind: 'wrong', message: result.message });
          // Roll the board back so the student can try again.
          game.undoMove();
        }
      })();
    },
    [game, evaluatePracticeMove, setGlobalPractice],
  );

  if (!active) {
    return (
      <ChessLessonLayout
        header={
          <div className="px-4 py-3 text-theme-text-muted text-sm">
            No active practice position. Return to chat and ask the coach to
            set one up.
          </div>
        }
        board={
          <div className="aspect-square rounded-lg bg-theme-surface/50" />
        }
        controls={
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-surface border border-theme-border"
          >
            <ArrowLeft size={16} /> Back to chat
          </button>
        }
      />
    );
  }

  const header = (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-theme-border">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          Practice
        </div>
        <h1 className="text-base font-semibold text-theme-text truncate">
          {active.label}
        </h1>
      </div>
      <button
        onClick={handleExit}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-theme-surface border border-theme-border text-sm"
        aria-label="Back to chat"
      >
        <ArrowLeft size={16} />
        Chat
      </button>
    </div>
  );

  const board = (
    <ConsistentChessboard
      game={game}
      interactive={feedback.kind !== 'thinking'}
      showFlipButton={false}
      showUndoButton={false}
      showResetButton={false}
      showVoiceMic={false}
      onMove={handleMove}
    />
  );

  const feedbackBanner = renderFeedback(feedback);

  const controls = (
    <div className="flex flex-col gap-2">
      {feedbackBanner}
      <div className="flex items-center justify-center gap-2">
        {(feedback.kind === 'correct' || feedback.kind === 'reveal') && (
          <button
            onClick={handleExit}
            className="px-4 py-2 rounded-xl bg-theme-accent text-theme-bg text-sm font-medium"
            data-testid="practice-return-chat"
          >
            Return to chat
          </button>
        )}
        {feedback.kind === 'wrong' && (
          <div className="text-xs text-theme-text-muted">
            Board reset — try a different move.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ChessLessonLayout
      header={header}
      board={board}
      controls={controls}
      data-testid="coach-practice-session"
    />
  );
}

function renderFeedback(feedback: FeedbackState): JSX.Element | null {
  switch (feedback.kind) {
    case 'idle':
      return (
        <div className="flex items-center justify-center gap-2 text-xs text-theme-text-muted">
          <Sparkles size={12} /> Make your move
        </div>
      );
    case 'thinking':
      return (
        <div className="flex items-center justify-center gap-2 text-xs text-theme-text-muted">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
          Checking with the engine…
        </div>
      );
    case 'correct':
      return (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }}
        >
          <CheckCircle2 size={16} /> {feedback.message}
        </div>
      );
    case 'wrong':
      return (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(239, 68, 68)' }}
        >
          <XCircle size={16} /> {feedback.message}
        </div>
      );
    case 'reveal':
      return (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'rgb(245, 158, 11)' }}
        >
          <Sparkles size={16} /> {feedback.message}
        </div>
      );
  }
}

