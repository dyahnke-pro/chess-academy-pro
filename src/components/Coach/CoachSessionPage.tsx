/**
 * CoachSessionPage
 * ----------------
 * The dynamic lesson route driven by the AI Agent Coach.
 *
 *   /coach/session/middlegame?opening=italian-game&orientation=white
 *   /coach/session/play-against?opening=sicilian&difficulty=auto&side=black
 *   /coach/session/walkthrough?subject=Sicilian%20Najdorf
 *   /coach/session/puzzle?theme=fork&difficulty=medium       (redirects)
 *   /coach/session/explain-position?fen=<FEN>
 *
 * - Middlegame: loads a WalkthroughSession via `middlegamePlanner`,
 *   falling back to a Stockfish-generated PV session when no DB plan
 *   matches. Runs with `useWalkthroughRunner` (voice-gated advance via
 *   `runStep`, no timer races).
 * - Play-against: Stockfish plays the coach's side at ELO-relative
 *   difficulty (player ELO ± 300 for easy/hard).
 * - Walkthrough: fuzzy-match an opening by subject, build a session
 *   from its PGN + annotations, run with `useWalkthroughRunner`.
 * - Puzzle: redirect to /puzzles with theme/difficulty query params —
 *   puzzles have their own dedicated full UI.
 * - Explain-position: Stockfish analysis + streaming coach commentary
 *   on a non-interactive board.
 *
 * All interactive surfaces render inside `ConsistentChessboard` +
 * `ChessLessonLayout` for visual consistency with every other lesson
 * screen. See CLAUDE.md → "Agent Coach Pattern".
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
  Navigate,
} from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { useWalkthroughRunner } from '../../hooks/useWalkthroughRunner';
import { resolveMiddlegameSessionWithFallback } from '../../services/middlegamePlanner';
import { resolveWalkthroughSession } from '../../services/walkthroughResolver';
import { buildNarrationSession } from '../../services/gameNarrationBuilder';
import { db } from '../../db/schema';
import { ExplainPositionSessionView } from './ExplainPositionSessionView';
import { CoachPracticeSessionView } from './CoachPracticeSessionView';
import { DynamicCoachSession } from './DynamicCoachSession';
import type { WalkthroughSession } from '../../types/walkthrough';

type SessionKind =
  | 'middlegame'
  | 'play-against'
  | 'walkthrough'
  | 'puzzle'
  | 'explain-position'
  | 'practice'
  | 'narrate';

export function CoachSessionPage(): JSX.Element {
  const { kind } = useParams<{ kind: SessionKind }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const openingId = searchParams.get('opening') ?? undefined;
  const subject = searchParams.get('subject') ?? undefined;
  const sideParam = searchParams.get('side');
  const orientationParam = searchParams.get('orientation');
  const orientation: 'white' | 'black' =
    sideParam === 'black' || orientationParam === 'black' ? 'black' : 'white';
  const theme = searchParams.get('theme') ?? undefined;
  const fen = searchParams.get('fen') ?? undefined;

  const goBack = (): void => {
    // Returning to the chat preserves scroll + history.
    void navigate(-1);
  };

  if (kind === 'middlegame') {
    return (
      <DynamicCoachSession title="Middlegame plan" onExit={goBack}>
        <MiddlegameSessionBody
          openingId={openingId}
          subject={subject}
          orientation={orientation}
          fen={fen}
          onExit={goBack}
        />
      </DynamicCoachSession>
    );
  }

  if (kind === 'play-against') {
    // The dynamic session used to render a stripped-down CoachPlaySessionView
    // with a static-mode board (no click-to-move, no themed board). Users
    // want the full /coach/play experience — themed board, click-to-move,
    // move classification, hints, post-game review. Forward the session's
    // params so CoachGamePage can start in the requested configuration.
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (searchParams.get('side') === 'black') params.set('side', 'black');
    if (searchParams.get('side') === 'white') params.set('side', 'white');
    const diffParam = searchParams.get('difficulty');
    if (diffParam && diffParam !== 'auto') params.set('difficulty', diffParam);
    // Carry the narrative training focus from the coach-chat affirmation
    // flow so the play page's coach keeps the agreed focus in mind.
    const focusParam = searchParams.get('focus');
    if (focusParam) params.set('focus', focusParam);
    const qs = params.toString();
    return <Navigate to={qs ? `/coach/play?${qs}` : '/coach/play'} replace />;
  }

  if (kind === 'walkthrough') {
    return (
      <DynamicCoachSession
        title={subject ? `Walkthrough: ${subject}` : 'Opening walkthrough'}
        onExit={goBack}
      >
        <WalkthroughSessionBody
          subject={subject}
          orientation={orientation}
          onExit={goBack}
        />
      </DynamicCoachSession>
    );
  }

  if (kind === 'puzzle') {
    // Puzzles have their own full UI — redirect rather than inline.
    // AdaptivePuzzlePage reads themes from `location.state.forcedWeakThemes`
    // (see src/components/Puzzles/AdaptivePuzzlePage.tsx: it auto-starts
    // the session when that state is set), so we forward the theme via
    // router state — not query params, which AdaptivePuzzlePage doesn't
    // read. Without a theme we land on the regular puzzle trainer hub.
    if (theme) {
      return (
        <Navigate
          to="/tactics/adaptive"
          state={{ forcedWeakThemes: [theme] }}
          replace
        />
      );
    }
    return <Navigate to="/tactics" replace />;
  }

  if (kind === 'explain-position') {
    return (
      <DynamicCoachSession title="Explain this position" onExit={goBack}>
        <ExplainPositionSessionView
          fen={fen}
          orientation={orientation}
          onExit={goBack}
        />
      </DynamicCoachSession>
    );
  }

  if (kind === 'practice') {
    return (
      <DynamicCoachSession title="Practice position" onExit={goBack}>
        <CoachPracticeSessionView onExit={goBack} />
      </DynamicCoachSession>
    );
  }

  if (kind === 'narrate') {
    const gameId = searchParams.get('gameId') ?? undefined;
    return (
      <DynamicCoachSession title="Narration" onExit={goBack}>
        <NarrateGameSessionBody gameId={gameId} orientation={orientation} onExit={goBack} />
      </DynamicCoachSession>
    );
  }

  return <Navigate to="/coach/chat" replace />;
}

// ─── Middlegame ─────────────────────────────────────────────────────

interface MiddlegameSessionBodyProps {
  openingId?: string;
  subject?: string;
  orientation: 'white' | 'black';
  fen?: string;
  onExit: () => void;
}

function MiddlegameSessionBody({
  openingId,
  subject,
  orientation,
  fen,
  onExit,
}: MiddlegameSessionBodyProps): JSX.Element {
  const [session, setSession] = useState<WalkthroughSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void resolveMiddlegameSessionWithFallback({
      openingId,
      subject,
      orientation,
      fen,
    })
      .then((s) => {
        if (cancelled) return;
        if (s) setSession(s);
        else setError('No middlegame plan found for that opening.');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[CoachSessionPage] middlegame fallback failed:', err);
        setError('Could not prepare a middlegame plan. Try again later.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openingId, subject, orientation, fen]);

  if (loading) return <LessonLoadingState label="Preparing plan…" onExit={onExit} />;
  if (error || !session) return <LessonErrorState message={error ?? 'Plan unavailable.'} onExit={onExit} />;
  return <WalkthroughRunnerBody session={session} onExit={onExit} />;
}

// ─── Walkthrough ────────────────────────────────────────────────────

interface WalkthroughSessionBodyProps {
  subject?: string;
  orientation: 'white' | 'black';
  onExit: () => void;
}

function WalkthroughSessionBody({
  subject,
  orientation,
  onExit,
}: WalkthroughSessionBodyProps): JSX.Element {
  const [session, setSession] = useState<WalkthroughSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) {
      setError('No opening specified.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void resolveWalkthroughSession({ subject, orientation })
      .then((s) => {
        if (cancelled) return;
        if (s) setSession(s);
        else
          setError(
            `I couldn't find an opening matching "${subject}". Try searching from the Openings tab.`,
          );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[CoachSessionPage] walkthrough resolve failed:', err);
        setError('Could not load that walkthrough.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subject, orientation]);

  if (loading) return <LessonLoadingState label="Loading walkthrough…" onExit={onExit} />;
  if (error || !session) return <LessonErrorState message={error ?? 'Walkthrough unavailable.'} onExit={onExit} />;
  return <WalkthroughRunnerBody session={session} onExit={onExit} />;
}

// play-against now redirects to /coach/play (CoachGamePage) which owns
// the full-featured game experience — themed board, click-to-move,
// move classification, hints, post-game review. The PlayAgainstBody
// wrapper that used to live here is retired along with its use of
// CoachPlaySessionView.

// ─── Narrate game ────────────────────────────────────────────────────

interface NarrateGameSessionBodyProps {
  gameId?: string;
  orientation: 'white' | 'black';
  onExit: () => void;
}

function NarrateGameSessionBody({
  gameId,
  orientation,
  onExit,
}: NarrateGameSessionBodyProps): JSX.Element {
  const [session, setSession] = useState<WalkthroughSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setError('No game specified.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void db.games
      .get(gameId)
      .then((game) => {
        if (cancelled) return;
        if (!game) {
          setError("I couldn't find that game in your history.");
          return;
        }
        setSession(buildNarrationSession(game, orientation));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[CoachSessionPage] narrate load failed:', err);
        setError('Could not load that game.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, orientation]);

  if (loading) return <LessonLoadingState label="Loading game…" onExit={onExit} />;
  if (error || !session) return <LessonErrorState message={error ?? 'Game unavailable.'} onExit={onExit} />;
  return <WalkthroughRunnerBody session={session} onExit={onExit} />;
}

// ─── Shared runner body ─────────────────────────────────────────────

interface WalkthroughRunnerBodyProps {
  session: WalkthroughSession;
  onExit: () => void;
}

function WalkthroughRunnerBody({
  session,
  onExit,
}: WalkthroughRunnerBodyProps): JSX.Element {
  const runner = useWalkthroughRunner(session);
  const step = runner.currentStep;

  const stepArrows = useMemo(
    () =>
      step?.arrows?.map((a) => ({
        startSquare: a.from,
        endSquare: a.to,
        color: a.color ?? 'rgba(34, 211, 238, 0.9)',
      })),
    [step],
  );
  const stepHighlights: Record<string, CSSProperties> | undefined = useMemo(
    () =>
      step?.highlights
        ? Object.fromEntries(
            step.highlights.map((h) => [
              h.square,
              {
                boxShadow: `inset 0 0 0 3px ${h.color ?? 'rgba(250, 204, 21, 0.6)'}`,
              },
            ]),
          )
        : undefined,
    [step],
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-theme-text truncate">
          {session.title}
        </h1>
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          {session.subtitle ?? 'Session'} ·{' '}
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

// ─── Loading / error states ─────────────────────────────────────────

function LessonLoadingState({
  label,
  onExit,
}: {
  label: string;
  onExit: () => void;
}): JSX.Element {
  return (
    <ChessLessonLayout
      header={<div className="text-theme-text-muted">{label}</div>}
      board={
        <div className="aspect-square rounded-lg bg-theme-surface/50 animate-pulse" />
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

function LessonErrorState({
  message,
  onExit,
}: {
  message: string;
  onExit: () => void;
}): JSX.Element {
  return (
    <ChessLessonLayout
      header={
        <div className="text-theme-text-muted">
          {message}
        </div>
      }
      board={<div className="aspect-square rounded-lg bg-theme-surface/50" />}
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
