import { ChevronRight, CheckCircle2 } from 'lucide-react';
import type { OpeningRecord } from '../../types';
import { buildCourse } from '../../services/openingCourse';

interface AcademyCourseCardProps {
  opening: OpeningRecord;
  onOpen: () => void;
}

/**
 * A course tile in The Academy — the opening framed as an enrolled GM course:
 * cover (name / ECO / style / side), a course-wide progress bar, the chapter
 * count, and a Resume / Start / Review call-to-action that reflects where the
 * student is. Progress is computed by `buildCourse` from the WLPP ladder the
 * opening already tracks. Router-free: the parent passes `onOpen`.
 */
export function AcademyCourseCard({ opening, onOpen }: AcademyCourseCardProps): JSX.Element {
  const course = buildCourse(opening);
  const { percent, total, completedChapters, currentChapter, complete } = course;

  const cta = complete
    ? 'Review'
    : percent === 0
      ? 'Start course'
      : `Resume · Chapter ${currentChapter}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 hover:border-indigo-400/60 transition-colors p-4 flex flex-col gap-3"
      data-testid={`academy-course-${opening.id}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-3 h-3 rounded-full border border-theme-border shrink-0"
          style={{ background: opening.color === 'white' ? '#fff' : '#1f1f1f' }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-indigo-300/80">{opening.eco}</span>
            <span className="text-sm font-bold text-theme-text truncate">{opening.name}</span>
          </div>
          {opening.style && (
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-300">
              {opening.style}
            </span>
          )}
        </div>
        {complete
          ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" data-testid={`academy-course-complete-${opening.id}`} />
          : <ChevronRight size={18} className="text-indigo-400/70 shrink-0" />}
      </div>

      {/* Course progress */}
      <div className="flex flex-col gap-1">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-400 transition-all"
            style={{ width: `${percent}%` }}
            data-testid={`academy-course-bar-${opening.id}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          <span data-testid={`academy-course-chapters-${opening.id}`}>
            {completedChapters}/{total} chapters · {percent}%
          </span>
          <span className="font-semibold text-indigo-300">{cta}</span>
        </div>
      </div>
    </button>
  );
}
