import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { voiceService } from '../../services/voiceService';
import {
  getKidPiecePuzzles,
  seedPuzzles,
  recordAttempt,
} from '../../services/puzzleService';
import {
  getKidRating,
  bumpKidRating,
} from '../../services/kidRatingService';
import { PuzzleBoard } from '../Puzzles/PuzzleBoard';
import type { PuzzleOutcome } from '../Puzzles/PuzzleBoard';
import { useAppStore } from '../../stores/appStore';
import type { ChessPiece, PuzzleRecord } from '../../types';

interface Props {
  piece: ChessPiece;
}

type Phase = 'loading' | 'playing' | 'empty' | 'done';

const PIECE_LABEL: Record<ChessPiece, string> = {
  king: 'King', queen: 'Queen', rook: 'Rook',
  bishop: 'Bishop', knight: 'Knight', pawn: 'Pawn',
};

const PIECE_HUB_ROUTE: Record<ChessPiece, string> = {
  king: '/kid/king-games',
  queen: '/kid/queen-games',
  rook: '/kid/rook-games',
  bishop: '/kid/bishop-games',
  knight: '/kid/knight-games',
  pawn: '/kid/pawn-games',
};

// Reusable per-piece adaptive puzzle session. Routed at
// /kid/<piece>-games/puzzles. Pulls puzzles where the kid moves
// `piece` and the puzzle rating sits ±50 of the kid's per-piece
// rating. Bumps the rating via kidRatingService after each attempt.
// Praise stays milestone-only per non-negotiable #5: silent on
// per-move responses; one short line at session end.

const BATCH_SIZE = 10;
const REFETCH_THRESHOLD = 3;
const RESULT_AUTO_ADVANCE_MS = 1400;

export function KidPiecePuzzlesPage({ piece }: Props): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);

  const [phase, setPhase] = useState<Phase>('loading');
  const [puzzles, setPuzzles] = useState<PuzzleRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [rating, setRating] = useState<number>(100);
  const [solved, setSolved] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [overlay, setOverlay] = useState<'correct' | 'incorrect' | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const fetchingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMore = useCallback(async (currentRating: number): Promise<PuzzleRecord[]> => {
    if (fetchingRef.current) return [];
    fetchingRef.current = true;
    try {
      await seedPuzzles();
      return await getKidPiecePuzzles(piece, currentRating, BATCH_SIZE);
    } finally {
      fetchingRef.current = false;
    }
  }, [piece]);

  // Boot: read rating, fetch initial batch.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await getKidRating(piece);
      if (cancelled) return;
      setRating(r);
      const initial = await fetchMore(r);
      if (cancelled) return;
      if (initial.length === 0) {
        setPhase('empty');
        return;
      }
      setPuzzles(initial);
      setPhase('playing');
    })();
    return () => { cancelled = true; };
  }, [piece, fetchMore]);

  // Pre-fetch as we approach the end of the batch.
  useEffect(() => {
    if (phase !== 'playing') return;
    const remaining = puzzles.length - index;
    if (remaining <= REFETCH_THRESHOLD && !fetchingRef.current) {
      void fetchMore(rating).then((next) => {
        if (next.length > 0) setPuzzles((prev) => [...prev, ...next]);
      });
    }
  }, [phase, puzzles.length, index, rating, fetchMore]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      voiceService.stop();
    };
  }, []);

  const handleOutcome = useCallback(({ correct }: PuzzleOutcome): void => {
    setAttempted((n) => n + 1);
    if (correct) setSolved((n) => n + 1);
    setOverlay(correct ? 'correct' : 'incorrect');

    if (activeProfile) {
      const puzzle = puzzles[index];
      void recordAttempt(
        puzzle.id,
        correct,
        activeProfile.puzzleRating,
        correct ? 'good' : 'again',
      );
    }
    void bumpKidRating(piece, correct).then(setRating);

    // Per-move praise banned (non-negotiable #5). Silence here.
    voiceService.stop();

    timerRef.current = setTimeout(() => {
      setOverlay(null);
      setIndex((i) => i + 1);
    }, RESULT_AUTO_ADVANCE_MS);
  }, [piece, puzzles, index, activeProfile]);

  const handleDone = useCallback((): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    voiceService.stop();
    // Milestone praise — single short line on session exit.
    if (voiceOn && attempted > 0) {
      const msg = solved === attempted
        ? `Perfect run! ${solved} of ${attempted}.`
        : solved > attempted / 2
          ? `${solved} of ${attempted} solved.`
          : 'Good practice. Try again later.';
      void voiceService.speak(msg);
    }
    setPhase('done');
  }, [attempted, solved, voiceOn]);

  const handleToggleVoice = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  const current = puzzles[index];

  return (
    <div
      className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid={`kid-piece-puzzles-${piece}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            aria-label="Back to hub"
            data-testid="kid-piece-puzzles-back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xl font-bold">{PIECE_LABEL[piece]} Puzzles</h2>
        </div>
        <button
          onClick={handleToggleVoice}
          className="p-2 rounded-lg border transition-colors"
          style={{
            background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
          }}
          aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
          data-testid="kid-piece-puzzles-voice-toggle"
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      <div
        className="rounded-2xl p-3 border-2 text-center"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-accent)',
        }}
        data-testid="kid-piece-puzzles-status"
      >
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Rating: <span data-testid="kid-piece-puzzles-rating">{rating}</span>
          {' '}· Solved {solved}/{attempted}
        </div>
      </div>

      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1 gap-2" data-testid="kid-piece-puzzles-loading">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading {PIECE_LABEL[piece]} puzzles…</span>
        </div>
      )}

      {phase === 'empty' && (
        <div className="flex flex-col items-center gap-3 p-6 text-center" data-testid="kid-piece-puzzles-empty">
          <p className="text-lg font-medium">No {PIECE_LABEL[piece]} puzzles at this level yet.</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Try the games to bring your rating up.
          </p>
          <button
            onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
            className="px-6 py-3 rounded-xl font-bold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="kid-piece-puzzles-back-to-hub"
          >
            Back to {PIECE_LABEL[piece]} Games
          </button>
        </div>
      )}

      {phase === 'playing' && current && (
        <div className="flex flex-col gap-3 relative">
          <PuzzleBoard puzzle={current} onComplete={handleOutcome} />
          {overlay && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              data-testid="kid-piece-puzzles-overlay"
            >
              <div
                className="rounded-2xl px-8 py-6 text-center shadow-lg"
                style={{
                  background: overlay === 'correct'
                    ? 'rgba(34, 197, 94, 0.95)'
                    : 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                }}
              >
                <span className="text-4xl">{overlay === 'correct' ? '⭐' : '💪'}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleDone}
            className="self-end px-3 py-1 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface)',
            }}
            data-testid="kid-piece-puzzles-done"
          >
            Done
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-4 p-6 text-center" data-testid="kid-piece-puzzles-summary">
          <span className="text-5xl">🎉</span>
          <p className="text-xl font-bold">Solved {solved} of {attempted}.</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Your {PIECE_LABEL[piece]} rating is now {rating}.
          </p>
          <button
            onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
            className="px-6 py-3 rounded-xl font-bold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            Back to {PIECE_LABEL[piece]} Games
          </button>
        </div>
      )}
    </div>
  );
}
