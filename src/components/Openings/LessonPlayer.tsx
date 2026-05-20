import { useCallback, useMemo, useState, type CSSProperties } from 'react';
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
  const [beatIndex, setBeatIndex] = useState(0);

  const beats = script.beats;
  const fens = useMemo(() => beats.map((b) => fenForMoves(b.moves)), [beats]);

  const applyStep = useCallback((i: number) => setBeatIndex(i), []);
  const getNarration = useCallback((i: number) => beats[i]?.say ?? '', [beats]);

  const { isAutoPlaying, next, prev, goToStep, toggleAutoPlay } = useStrictNarration({
    stepCount: beats.length,
    applyStep,
    getNarration,
    postNarrationDelayMs: 900,
    voiceEnabled,
    // A master class is opt-in long-form teaching — speak it in full,
    // not clipped to the coach's brief cap.
    speak: (t: string) => voiceService.speakLecture(t),
    // The story plays itself — beats auto-advance as each line finishes.
    initialAutoPlay: true,
  });

  const idx = beatIndex;
  const beat = beats[idx];

  const boardArrows: BoardArrow[] = (beat.arrows ?? []).map((a) => ({
    startSquare: a.from,
    endSquare: a.to,
    color: a.color ?? 'rgba(60,120,220,0.85)',
  }));

  const squareStyles: Record<string, CSSProperties> = {};
  for (const h of beat.highlights ?? []) {
    squareStyles[h.square] = {
      backgroundColor: h.color ?? 'rgba(255,214,0,0.88)',
    };
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
            fen={fens[idx]}
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

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
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
