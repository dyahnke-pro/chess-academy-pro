import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Trophy, GraduationCap, PlayCircle } from 'lucide-react';
import { getOpeningById } from '../../services/openingService';
import { buildCourse } from '../../services/openingCourse';
import { MAIN_LINE_INDEX, type Rung } from '../../utils/wlppLadder';
import type { OpeningRecord } from '../../types';
import type { CourseChapter } from '../../services/openingCourse';

/**
 * The course front door (P3) — the opening rendered as an enrolled GM-style
 * course: cover, a course-wide progress bar + "Chapter X of Y", a Resume / Start
 * button, the numbered chapter syllabus (each chapter's WLPP rungs as a progress
 * row), and the finish-line state. Everything is computed by `buildCourse` from
 * the WLPP ladder the opening already tracks. Tapping a chapter (or Resume) deep-
 * links into the existing detail page scoped to that line via `?line=<index>`.
 */
export function CourseSyllabusPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<OpeningRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!id) { setLoading(false); return; }
    void getOpeningById(id).then((o) => {
      if (alive) { setOpening(o ?? null); setLoading(false); }
    });
    return () => { alive = false; };
  }, [id]);

  const wrap = (children: JSX.Element): JSX.Element => (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="course-syllabus"
    >
      {children}
    </div>
  );

  if (loading) {
    return wrap(
      <p className="text-sm text-theme-text-muted py-8 text-center" data-testid="course-loading">Loading course…</p>,
    );
  }
  if (!opening) {
    return wrap(
      <div className="py-8 text-center flex flex-col gap-3" data-testid="course-notfound">
        <p className="text-sm text-theme-text-muted">Course not found.</p>
        <button onClick={() => void navigate('/academy')} className="text-indigo-400 text-sm font-semibold">← Back to The Academy</button>
      </div>,
    );
  }

  const course = buildCourse(opening);
  const chapterHref = (lineIndex: number): string =>
    lineIndex === MAIN_LINE_INDEX ? `/openings/${opening.id}` : `/openings/${opening.id}?line=${lineIndex}`;
  const openChapter = (lineIndex: number): void => { void navigate(chapterHref(lineIndex)); };
  const resume = (): void => { if (course.nextStep) openChapter(course.nextStep.lineIndex); };

  const resumeLabel = course.complete
    ? 'Review the course'
    : course.percent === 0
      ? 'Start course'
      : `Resume · Chapter ${course.currentChapter}`;

  return wrap(
    <>
      {/* Header / back */}
      <div className="max-w-lg mx-auto w-full flex items-center gap-2">
        <button onClick={() => void navigate('/academy')} aria-label="Back to The Academy" className="p-1 text-theme-text-muted hover:text-theme-text">
          <ChevronLeft size={22} />
        </button>
        <GraduationCap size={16} className="text-indigo-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-theme-text-muted">Course</span>
      </div>

      {/* Cover */}
      <div className="max-w-lg mx-auto w-full rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 p-5 flex flex-col gap-3" data-testid="course-cover">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full border border-theme-border shrink-0" style={{ background: opening.color === 'white' ? '#fff' : '#1f1f1f' }} aria-hidden />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-indigo-300/80">{opening.eco}</span>
              {opening.style && <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-300">{opening.style}</span>}
            </div>
            <h1 className="text-lg font-bold leading-tight mt-0.5">{opening.name}</h1>
          </div>
        </div>
        {opening.overview && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{opening.overview}</p>}

        {/* Course progress */}
        <div className="flex flex-col gap-1.5">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${course.percent}%` }} data-testid="course-progress-bar" />
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span data-testid="course-progress-label">Chapter {course.currentChapter} of {course.total} · {course.percent}%</span>
            <span>{course.completedChapters}/{course.total} complete</span>
          </div>
        </div>

        {/* Resume / Start / Review */}
        <button
          onClick={resume}
          className="mt-1 w-full rounded-xl bg-indigo-500/20 border-2 border-indigo-400/60 py-3 font-bold text-indigo-100 hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2"
          data-testid="course-resume"
        >
          <PlayCircle size={18} />
          {resumeLabel}
        </button>
      </div>

      {/* Finish line */}
      {course.complete && (
        <div className="max-w-lg mx-auto w-full rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 p-4 flex items-center gap-3" data-testid="course-finish-line">
          <Trophy size={22} className="text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-emerald-200">Course complete — you've finished every chapter of {opening.name}.</p>
        </div>
      )}

      {/* Syllabus — numbered chapters */}
      <div className="max-w-lg mx-auto w-full flex flex-col gap-2" data-testid="course-chapters">
        {course.chapters.map((ch) => (
          <ChapterRow key={ch.lineIndex} chapter={ch} onOpen={() => openChapter(ch.lineIndex)} />
        ))}
      </div>
    </>,
  );
}

const RUNG_SHORT: Record<Rung, string> = { watch: 'Watch', learn: 'Learn', practice: 'Practice', play: 'Play' };

function ChapterRow({ chapter, onOpen }: { chapter: CourseChapter; onOpen: () => void }): JSX.Element {
  const done = chapter.status === 'complete';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-theme-surface border-2 border-indigo-500/20 hover:border-indigo-400/50 transition-colors p-4 flex flex-col gap-2.5"
      data-testid={`course-chapter-${chapter.n}`}
    >
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-200'}`}>
          {done ? <CheckCircle2 size={16} /> : chapter.n}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{chapter.label}</p>
          {chapter.summary && <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{chapter.summary}</p>}
        </div>
        <span className="text-[11px] font-semibold text-indigo-300 shrink-0">{chapter.percent}%</span>
        <ChevronRight size={16} className="text-indigo-400/60 shrink-0" />
      </div>

      {/* WLPP rung row */}
      <div className="flex items-center gap-1.5 pl-10">
        {chapter.rungs.map((r) => (
          <span
            key={r.rung}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              r.complete
                ? 'bg-indigo-500/25 text-indigo-200'
                : r.unlocked
                  ? 'bg-white/5 text-theme-text-muted'
                  : 'bg-white/5 text-theme-text-muted/40'
            }`}
            title={r.complete ? `${RUNG_SHORT[r.rung]} — done` : r.unlocked ? `${RUNG_SHORT[r.rung]} — unlocked` : `${RUNG_SHORT[r.rung]} — locked`}
          >
            {!r.complete && !r.unlocked ? <Lock size={9} className="inline mb-0.5 mr-0.5" /> : null}
            {RUNG_SHORT[r.rung]}
          </span>
        ))}
      </div>
    </button>
  );
}
