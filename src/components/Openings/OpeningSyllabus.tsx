import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Lock, Eye, Swords } from 'lucide-react';
import { buildCourse, type CourseChapter, type CourseSubline } from '../../services/openingCourse';
import { sublineWhyFact } from '../../services/courseWhyFacts';
import { MAIN_LINE_INDEX, type Rung } from '../../utils/wlppLadder';
import type { OpeningRecord } from '../../types';

/**
 * The course-style SYLLABUS for the Openings tab (David 2026-06-19, from the
 * Academy course layout — "separate by variations", "keep the syllabus", "make
 * it coherent"). One numbered card per line (Main Line + each variation) showing
 * its WLPP ladder STATUS and its expandable "They might play" deviations.
 *
 * Coherence contract — the syllabus is the MAP, not a second launcher:
 *   • the WLPP chips are STATUS pills (done / available / locked), exactly like
 *     the Academy chapter rows — they don't launch.
 *   • tapping a chapter FOCUSES that variation (onSelectChapter → the page's
 *     existing tabs + big WLPP buttons + Understand/Plans/Models sections all
 *     rescope to it) and reveals its deviations. The focused chapter is
 *     highlighted so the map mirrors the workspace below.
 *   • the only launchers here are the per-deviation Watch / Play — the single
 *     home for sublines (the interim under-tab panel is retired).
 *
 * Built from `buildCourse` (any opening). Self-hides when the opening doesn't
 * branch into variations — the page's own WLPP buttons already cover the trunk.
 */
export function OpeningSyllabus({ opening, selectedIndex, onSelectChapter, onWatchSubline, onPlaySubline }: {
  opening: OpeningRecord;
  /** The currently focused line (selectedTabIndex), highlighted in the map. */
  selectedIndex: number;
  onSelectChapter: (lineIndex: number) => void;
  onWatchSubline: (subline: CourseSubline, varIndex: number) => void;
  onPlaySubline: (subline: CourseSubline, varIndex: number) => void;
}): JSX.Element | null {
  const course = useMemo(() => buildCourse(opening), [opening]);

  if (course.chapters.length <= 1) return null;

  return (
    <div className="mb-5 flex flex-col gap-2" data-testid="opening-syllabus">
      <p className="text-xs font-bold uppercase tracking-widest text-theme-text-muted px-0.5">
        Chapters · by variation
      </p>
      {course.chapters.map((ch) => (
        <SyllabusCard
          key={ch.lineIndex}
          chapter={ch}
          focused={ch.lineIndex === selectedIndex}
          onSelect={() => onSelectChapter(ch.lineIndex)}
          onWatchSubline={onWatchSubline}
          onPlaySubline={onPlaySubline}
        />
      ))}
    </div>
  );
}

const RUNG_LABEL: Record<Rung, string> = { watch: 'Watch', learn: 'Learn', practice: 'Practice', play: 'Play' };

function lineKey(lineIndex: number): string {
  return lineIndex === MAIN_LINE_INDEX ? 'main' : String(lineIndex);
}

function SyllabusCard({ chapter, focused, onSelect, onWatchSubline, onPlaySubline }: {
  chapter: CourseChapter;
  focused: boolean;
  onSelect: () => void;
  onWatchSubline: (subline: CourseSubline, varIndex: number) => void;
  onPlaySubline: (subline: CourseSubline, varIndex: number) => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const done = chapter.status === 'complete';
  const sublines = chapter.sublines;
  const hasSublines = sublines.length > 0;
  const OPEN_COUNT = 3;
  const shown = showAll ? sublines : sublines.slice(0, OPEN_COUNT);
  const k = lineKey(chapter.lineIndex);

  return (
    <div
      className={`rounded-2xl bg-theme-surface border overflow-hidden transition-colors ${
        focused ? 'border-theme-accent/70 ring-1 ring-theme-accent/40' : 'border-theme-border'
      }`}
      data-testid={`syllabus-card-${k}`}
      data-focused={focused}
    >
      {/* Header — tap to FOCUS this variation (rescopes the page) and reveal its
          deviations. The launching happens via the page's WLPP buttons below. */}
      <button
        type="button"
        onClick={() => { onSelect(); if (hasSublines) setExpanded((v) => !v); }}
        className="w-full text-left p-3 flex items-center gap-3 hover:bg-theme-border/40 transition-colors"
        data-testid={`syllabus-select-${k}`}
        aria-expanded={hasSublines ? expanded : undefined}
      >
        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-theme-accent/20 text-theme-accent'}`}>
          {done ? <CheckCircle2 size={16} /> : chapter.n}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{chapter.label}</p>
          {chapter.summary && <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{chapter.summary}</p>}
        </div>
        <span className="text-[11px] font-semibold text-theme-accent shrink-0">{chapter.percent}%</span>
        {hasSublines
          ? (expanded ? <ChevronDown size={16} className="text-theme-accent/60 shrink-0" /> : <ChevronRight size={16} className="text-theme-accent/60 shrink-0" />)
          : <span className="w-4 shrink-0" aria-hidden />}
      </button>

      {/* WLPP ladder STATUS — progress at a glance (done / available / locked),
          matching the Academy chapter rows. Not launchers; the page's WLPP
          buttons launch the focused line. */}
      <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap" data-testid={`syllabus-status-${k}`}>
        {chapter.rungs.map((r) => (
          <span
            key={r.rung}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              r.complete
                ? 'bg-theme-accent/25 text-theme-accent'
                : r.unlocked
                  ? 'bg-white/5 text-theme-text-muted'
                  : 'bg-white/5 text-theme-text-muted/40'
            }`}
            title={r.complete ? `${RUNG_LABEL[r.rung]} — done` : r.unlocked ? `${RUNG_LABEL[r.rung]} — open` : `${RUNG_LABEL[r.rung]} — locked`}
          >
            {r.complete ? <CheckCircle2 size={9} /> : !r.unlocked ? <Lock size={9} /> : null}
            {RUNG_LABEL[r.rung]}
          </span>
        ))}
      </div>

      {/* "They might play" — the opponent's deviations within this variation, the
          single home for sublines. Revealed on expand. */}
      {expanded && hasSublines && (
        <div className="px-3 pb-3 pt-2 flex flex-col gap-1 border-t border-theme-border" data-testid={`syllabus-sublines-${k}`}>
          <p className="text-[10px] uppercase tracking-wide text-theme-text-muted/70">They might play · Watch the reply or play it out</p>
          {(() => {
            const why = sublineWhyFact(sublines[0]);
            return why.text ? <p className="text-[11px] italic text-theme-accent/80">{why.text}</p> : null;
          })()}
          {shown.map((s) => (
            <div key={`${s.triggerMove}-${s.atPly}`} className="flex items-center gap-2 text-[11px] py-0.5">
              <span className="font-mono font-semibold text-theme-accent shrink-0 w-12">{s.triggerMove}</span>
              <span className="truncate flex-1" style={{ color: 'var(--color-text-muted)' }}>{subName(s.name)}</span>
              <span className="text-theme-text-muted/60 shrink-0 w-9 text-right">{s.pct}%</span>
              <button
                type="button"
                onClick={() => onWatchSubline(s, chapter.lineIndex)}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 transition-colors font-semibold"
                data-testid={`syllabus-subline-watch-${k}-${s.atPly}-${s.triggerMove}`}
                aria-label={`Watch how to meet ${s.triggerMove}`}
              >
                <Eye size={12} /> Watch
              </button>
              <button
                type="button"
                onClick={() => onPlaySubline(s, chapter.lineIndex)}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors font-semibold"
                data-testid={`syllabus-subline-play-${k}-${s.atPly}-${s.triggerMove}`}
                aria-label={`Play out ${s.triggerMove}`}
              >
                <Swords size={12} /> Play
              </button>
            </div>
          ))}
          {sublines.length > OPEN_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[10px] text-theme-accent/80 hover:text-theme-accent self-start font-semibold"
              data-testid={`syllabus-sublines-toggle-${k}`}
            >
              {showAll ? 'Show fewer' : `Show ${sublines.length - OPEN_COUNT} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The tail of an ECO name ("…: Advance Variation, Tal" → "Advance Variation, Tal"). */
function subName(name: string): string {
  return name.includes(':') ? name.split(':').slice(1).join(':').trim() : name;
}
