/**
 * CoachSessionPage
 * ----------------
 * The dynamic lesson route driven by the AI Agent Coach.
 *
 *   /coach/session/middlegame?opening=italian-game&orientation=white
 *   /coach/session/play-against?opening=sicilian&difficulty=auto
 *
 * - Middlegame: loads a WalkthroughSession via `middlegamePlanner` and
 *   runs it with `useWalkthroughRunner`, keeping the plan's starting
 *   FEN (carries board context over from the opening).
 * - Play-against: Stockfish plays the coach's side at the resolved
 *   difficulty (rating-matched when 'auto').
 *
 * Always rendered inside `ConsistentChessboard` + `ChessLessonLayout`
 * so it looks and behaves identically to every other lesson screen.
 */
import { useMemo, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { useWalkthroughRunner } from '../../hooks/useWalkthroughRunner';
import { resolveMiddlegameSession } from '../../services/middlegamePlanner';
import { useAppStore } from '../../stores/appStore';
import { resolveConfig } from '../../services/coachPlaySession';
import { CoachPlaySessionView } from './CoachPlaySessionView';
import type { CoachDifficulty } from '../../services/coachAgent';

type SessionKind = 'middlegame' | 'play-against';

export function CoachSessionPage(): JSX.Element {
  const { kind } = useParams<{ kind: SessionKind }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);

  const openingId = searchParams.get('opening') ?? undefined;
  const subject = searchParams.get('subject') ?? undefined;
  const orientation =
    searchParams.get('orientation') === 'black' ? 'black' : 'white';
  const difficulty =
    (searchParams.get('difficulty') as CoachDifficulty | null) ?? 'auto';

  const goBack = (): void => {
    // Returning to the chat preserves scroll + history.
    void navigate(-1);
  };

  if (kind === 'middlegame') {
    return (
      <MiddlegameSessionBody
        openingId={openingId}
        subject={subject}
        orientation={orientation}
        onExit={goBack}
      />
    );
  }

  if (kind === 'play-against') {
    const rating = activeProfile?.currentRating;
    const config = resolveConfig(difficulty, rating);
    return (
      <CoachPlaySessionView
        config={config}
        orientation={orientation}
        subject={subject}
        onExit={goBack}
      />
    );
  }

  return <Navigate to="/coach/chat" replace />;
}

interface MiddlegameSessionBodyProps {
  openingId?: string;
  subject?: string;
  orientation: 'white' | 'black';
  onExit: () => void;
}

function MiddlegameSessionBody({
  openingId,
  subject,
  orientation,
  onExit,
}: MiddlegameSessionBodyProps): JSX.Element {
  const session = useMemo(
    () => resolveMiddlegameSession({ openingId, subject, orientation }),
    [openingId, subject, orientation],
  );

  if (!session) {
    return (
      <ChessLessonLayout
        header={
          <div className="text-theme-text-muted">
            No middlegame plan found for that opening.
          </div>
        }
        board={
          <div className="aspect-square rounded-lg bg-theme-surface/50" />
        }
        controls={
          <button
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-theme-surface border border-theme-border"
          >
            Back to chat
          </button>
        }
      />
    );
  }

  return <MiddlegameRunner session={session} onExit={onExit} />;
}

interface MiddlegameRunnerProps {
  session: NonNullable<ReturnType<typeof resolveMiddlegameSession>>;
  onExit: () => void;
}

function MiddlegameRunner({ session, onExit }: MiddlegameRunnerProps): JSX.Element {
  const runner = useWalkthroughRunner(session);
  const step = runner.currentStep;
  const stepArrows = step?.arrows?.map((a) => ({
    startSquare: a.from,
    endSquare: a.to,
    color: a.color ?? 'rgba(34, 211, 238, 0.9)',
  }));
  const stepHighlights: Record<string, CSSProperties> | undefined = step?.highlights
    ? Object.fromEntries(
        step.highlights.map((h) => [
          h.square,
          { boxShadow: `inset 0 0 0 3px ${h.color ?? 'rgba(250, 204, 21, 0.6)'}` },
        ]),
      )
    : undefined;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-theme-text truncate">{session.title}</h1>
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          {session.subtitle ?? 'Middlegame plan'} ·{' '}
          {Math.max(runner.currentIndex + 1, 0)} / {session.steps.length}
        </div>
        {step && (
          <p className="text-sm text-theme-text mt-2 leading-snug">
            {step.narration}
          </p>
        )}
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
    <>
      <button
        onClick={runner.prev}
        disabled={runner.currentIndex <= 0}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-theme-surface border border-theme-border disabled:opacity-40"
        aria-label="Previous move"
      >
        <ChevronLeft size={20} />
      </button>
      {runner.isPlaying ? (
        <button
          onClick={runner.pause}
          className="flex items-center gap-2 px-6 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
          aria-label="Pause"
        >
          <Pause size={18} /> Pause
        </button>
      ) : (
        <button
          onClick={runner.play}
          className="flex items-center gap-2 px-6 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
          aria-label="Play"
        >
          <Play size={18} /> {runner.isFinished ? 'Replay' : 'Play'}
        </button>
      )}
      <button
        onClick={runner.next}
        disabled={runner.isFinished}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-theme-surface border border-theme-border disabled:opacity-40"
        aria-label="Next move"
      >
        <ChevronRight size={20} />
      </button>
      <button
        onClick={runner.restart}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-theme-surface border border-theme-border"
        aria-label="Restart"
      >
        <RotateCcw size={18} />
      </button>
    </>
  );

  return (
    <ChessLessonLayout
      header={header}
      board={
        <ConsistentChessboard
          fen={runner.fen}
          boardOrientation={session.orientation}
          arrows={stepArrows}
          squareStyles={stepHighlights}
          interactive={false}
        />
      }
      controls={controls}
    />
  );
}
