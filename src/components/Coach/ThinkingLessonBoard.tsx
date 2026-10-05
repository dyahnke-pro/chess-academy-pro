// ThinkingLessonBoard — the tap board for a "Learn how to think" lesson. Shows
// the lesson's board, paints found (green), wrong (red) and shown (yellow)
// squares, and forwards taps. Display only: every decision is the session's.
import type { CSSProperties } from 'react';
import type { Square } from 'chess.js';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import type { LessonView } from '../../hooks/useThinkingLesson';

export interface ThinkingLessonBoardProps {
  view: LessonView;
  onTap: (square: Square) => void;
  onDontKnow: () => void;
  onStop: () => void;
  /** A mixed round: the student picked which step a board asks. A surface that
   *  never runs a mixed round may omit it (the chips then never show). */
  onChoose?: (step: string) => void;
}

const FOUND: CSSProperties = { background: 'rgba(34,197,94,0.55)' };
const WRONG: CSSProperties = { background: 'rgba(239,68,68,0.5)' };
const SHOWN: CSSProperties = { background: 'rgba(250,204,21,0.55)' };
const FOCUS: CSSProperties = { background: 'rgba(59,130,246,0.45)' };

const STAGE_LABEL: Record<NonNullable<LessonView['stage']>, string> = {
  show: 'Watch',
  guide: 'Your turn',
  solo: 'On your own',
};

export function lessonSquareStyles(view: LessonView): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};
  // The piece a follow-up chain asks about, under everything else.
  for (const s of view.focus) styles[s] = FOCUS;
  for (const s of view.shown) styles[s] = SHOWN;
  for (const s of view.wrong) styles[s] = WRONG;
  for (const s of view.found) styles[s] = FOUND;
  return styles;
}

export function ThinkingLessonBoard({ view, onTap, onDontKnow, onStop, onChoose }: ThinkingLessonBoardProps): JSX.Element | null {
  if (!view.active || !view.fen) return null;
  const orientation = view.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  return (
    <div className="flex flex-col gap-2 w-full" data-testid="thinking-lesson" data-step={view.step ?? undefined} data-fen={view.fen} data-asking={view.asking ? '1' : '0'}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span data-testid="thinking-lesson-stage">{view.stage ? STAGE_LABEL[view.stage] : ''}</span>
        <span data-testid="thinking-lesson-progress">{view.index} / {view.total}</span>
      </div>
      <ConsistentChessboard
        fen={view.fen}
        boardOrientation={orientation}
        interactive={view.asking}
        squareStyles={lessonSquareStyles(view)}
        onSquareClick={(a) => { if (view.asking) onTap(a.square as Square); }}
      />
      {view.prompt && (view.asking || view.choosing) && (
        <p className="text-sm text-center font-semibold" data-testid="thinking-lesson-prompt">{view.prompt}</p>
      )}
      {view.choosing && onChoose && view.choices.length > 0 && (
        // A mixed round: first decide WHICH question this board asks.
        <div className="flex flex-wrap justify-center gap-2" data-testid="thinking-lesson-choices">
          {view.choices.map((c) => (
            <button
              key={c.step}
              type="button"
              onClick={() => onChoose(c.step)}
              className="px-3 py-2 rounded-xl border-2 border-sky-500/30 bg-sky-500/10 text-sky-300 text-sm font-semibold"
              data-testid={`thinking-lesson-choice-${c.step}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDontKnow}
          disabled={!view.asking && !view.choosing}
          className="flex-1 py-2 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold disabled:opacity-40"
          data-testid="thinking-lesson-dont-know"
        >
          I don&apos;t know
        </button>
        <button
          type="button"
          onClick={onStop}
          className="px-4 py-2 rounded-xl border-2 border-slate-500/30 bg-slate-500/10 text-slate-300 text-sm font-semibold"
          data-testid="thinking-lesson-stop"
        >
          End lesson
        </button>
      </div>
    </div>
  );
}
