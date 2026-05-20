import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chess } from 'chess.js';
import { ChevronLeft, ChevronRight, Play, Pause, X, GraduationCap } from 'lucide-react';
import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import { useStrictNarration } from '../../hooks/useStrictNarration';
import { voiceService } from '../../services/voiceService';
import { useSettings } from '../../hooks/useSettings';
import type { LessonScript } from '../../types';

interface LessonPlayerProps {
  script: LessonScript;
  onExit: () => void;
}

function fenForMoves(moves: string[]): string {
  const c = new Chess();
  for (const m of moves) {
    try { c.move(m); } catch { break; }
  }
  return c.fen();
}

/** The from/to squares of `move` played after `prefix`. */
function moveSquares(prefix: string[], move: string): { from: string; to: string } | null {
  const c = new Chess();
  for (const m of prefix) { try { c.move(m); } catch { return null; } }
  try { const mv = c.move(move); return { from: mv.from, to: mv.to }; } catch { return null; }
}

/**
 * LessonPlayer — story-first master class. The narration is the spine;
 * the board follows. Each beat shows its own position (so beats can
 * rewind or branch), draws piece arrows + square highlights, and speaks
 * via the voice-gated useStrictNarration runtime. Used by the openings
 * walkthrough surface whenever a LessonScript exists for the opening.
 */
export function LessonPlayer({ script, onExit }: LessonPlayerProps): JSX.Element {
  const { settings } = useSettings();
  const voiceEnabled = settings.voiceEnabled;

  const beats = script.beats;
  const fens = useMemo(() => beats.map((b) => fenForMoves(b.moves)), [beats]);

  const [beatIndex, setBeatIndex] = useState(0);
  // The board is animated independently of the beat index: we play a
  // beat's moves one at a time (see the effect below), so `displayFen`
  // lags `beatIndex` while the sequence runs.
  const [displayFen, setDisplayFen] = useState(fens[0]);
  const [trailArrows, setTrailArrows] = useState<BoardArrow[]>([]);
  const [settled, setSettled] = useState(true);

  const prevIdxRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  // Animation-complete promise. applyStep (which runs synchronously inside
  // playStep, before speak) arms a fresh one; the animation effect resolves
  // it when the moves finish. The speak wrapper awaits it so auto-advance
  // waits for BOTH the voice and the board animation — never advancing
  // mid-sequence.
  const animResolveRef = useRef<(() => void) | null>(null);
  const animPromiseRef = useRef<Promise<void>>(Promise.resolve());

  const applyStep = useCallback((i: number) => {
    animPromiseRef.current = new Promise<void>((res) => { animResolveRef.current = res; });
    setBeatIndex(i);
  }, []);
  const getNarration = useCallback((i: number) => beats[i]?.say ?? '', [beats]);

  const { isAutoPlaying, next, prev, goToStep, toggleAutoPlay } = useStrictNarration({
    stepCount: beats.length,
    applyStep,
    getNarration,
    postNarrationDelayMs: 700,
    voiceEnabled,
    // A master class is opt-in long-form teaching — speak it in full,
    // not clipped to the coach's brief cap. Also wait for the board
    // animation to finish before auto-advancing.
    speak: (t: string) =>
      Promise.all([voiceService.speakLecture(t), animPromiseRef.current]).then(() => undefined),
    // The story plays itself — beats auto-advance as each line finishes.
    initialAutoPlay: true,
  });

  const idx = beatIndex;
  const beat = beats[idx];

  // Play this beat's moves ONE AT A TIME from the longest common prefix
  // with the previously-shown line — a linear path the eye can follow,
  // never a multi-move jump. Each move adds a trail arrow that stays on
  // the board so the viewer can trace the sequence back. Authored vision
  // arrows + highlights reveal once the moves settle.
  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    const prevIdx = prevIdxRef.current;
    prevIdxRef.current = idx;
    const prevMoves = beats[prevIdx]?.moves ?? [];
    const curMoves = beat.moves;

    let cp = 0;
    while (cp < prevMoves.length && cp < curMoves.length && prevMoves[cp] === curMoves[cp]) cp += 1;

    const forwardMoves = curMoves.length - cp;
    if (forwardMoves <= 0) {
      // Same line or a pure rewind — nothing to play out; snap.
      setDisplayFen(fens[idx]);
      setTrailArrows([]);
      setSettled(true);
      animResolveRef.current?.();
      return;
    }

    setSettled(false);
    setTrailArrows([]);
    setDisplayFen(fenForMoves(curMoves.slice(0, cp))); // start at the fork
    const STEP_MS = 1300;
    const TRAIL = 'rgba(255,170,60,0.6)';
    const accumulated: BoardArrow[] = [];
    let delay = 300; // brief look at the fork before the first move
    for (let k = cp + 1; k <= curMoves.length; k += 1) {
      const fen = fenForMoves(curMoves.slice(0, k));
      const sq = moveSquares(curMoves.slice(0, k - 1), curMoves[k - 1]);
      const isLast = k === curMoves.length;
      const t = window.setTimeout(() => {
        setDisplayFen(fen);
        if (sq) { accumulated.push({ startSquare: sq.from, endSquare: sq.to, color: TRAIL }); setTrailArrows([...accumulated]); }
        if (isLast) { setSettled(true); animResolveRef.current?.(); }
      }, delay);
      timersRef.current.push(t);
      delay += STEP_MS;
    }
    return () => { timersRef.current.forEach((t) => clearTimeout(t)); };
  }, [idx, beat, beats, fens]);

  // Trail arrows stay on the board; authored vision arrows + highlights
  // add once the moves have settled.
  const boardArrows: BoardArrow[] = [
    ...trailArrows,
    ...(settled
      ? (beat.arrows ?? []).map((a) => ({
          startSquare: a.from,
          endSquare: a.to,
          color: a.color ?? 'rgba(60,120,220,0.85)',
        }))
      : []),
  ];

  const squareStyles: Record<string, CSSProperties> = {};
  if (settled) {
    for (const h of beat.highlights ?? []) {
      squareStyles[h.square] = { background: h.color ?? 'rgba(255,214,0,0.88)' };
    }
  }

  const orientation = beat.orientation ?? script.orientation;
  const atStart = idx <= 0;
  const atEnd = idx >= beats.length - 1;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" data-testid="lesson-player">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border/40">
        <button
          type="button"
          onClick={onExit}
          className="p-1.5 -ml-1.5 text-theme-text-muted hover:text-theme-text"
          aria-label="Exit lesson"
        >
          <X size={20} />
        </button>
        <GraduationCap size={18} className="text-amber-400 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-theme-text truncate">{script.title}</h2>
          <p className="text-[11px] text-theme-text-muted/70">
            {script.minutes} min · beat {idx + 1} / {beats.length}
          </p>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ConsistentChessboard
            fen={displayFen}
            boardOrientation={orientation}
            arrows={boardArrows}
            squareStyles={squareStyles}
            animationDurationInMs={350}
          />
        </div>
      </div>

      {/* Narration card */}
      <div className="px-4 pb-2">
        <div
          className="bg-theme-surface rounded-xl p-4 border-l-2 border-amber-400/50"
          data-testid="lesson-narration"
        >
          <p className="text-sm text-theme-text leading-relaxed">{beat.say}</p>
        </div>
      </div>

      {/* Controls — clear the fixed mobile bottom nav (~4.5rem) + the
          iOS home-indicator safe-area inset so the Play/Next buttons
          aren't clipped (David 2026-05-20: "play button getting cut off
          … cannot progress"). */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
        <button
          type="button"
          onClick={prev}
          disabled={atStart}
          className="p-2.5 rounded-full bg-theme-surface text-theme-text disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous beat"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={toggleAutoPlay}
          className="p-3.5 rounded-full bg-amber-500 text-white shadow-lg"
          aria-label={isAutoPlaying ? 'Pause' : 'Play lesson'}
        >
          {isAutoPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          type="button"
          onClick={atEnd ? () => goToStep(0) : next}
          className="p-2.5 rounded-full bg-theme-surface text-theme-text"
          aria-label={atEnd ? 'Restart' : 'Next beat'}
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}
