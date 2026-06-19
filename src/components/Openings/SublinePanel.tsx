import { useMemo, useState } from 'react';
import { Eye, Swords, GitBranch } from 'lucide-react';
import { buildCourse, type CourseSubline } from '../../services/openingCourse';
import { sublineWhyFact } from '../../services/courseWhyFacts';
import type { OpeningRecord } from '../../types';

/**
 * The Level-3 SUBLINE panel for the Openings tab (David 2026-06-19). Surfaces
 * the opponent's frequency-ranked deviations WITHIN the currently-selected line
 * — the second level of the opening tree — each playable two ways:
 *   • Watch → the hand-authored narrated walkthrough (PlayableLinePlayer).
 *   • Play  → the coach LOCKED to the subline's exact moves (OpeningPlayMode
 *     customLine), the same lock used for variations, gems and traps.
 *
 * Sublines are computed by `buildCourse` from `course-sublines.json` (G3 — every
 * move from the masters DB, nothing invented) and keyed per variation tab. The
 * MAIN line carries none, and openings outside the course-subline set return an
 * empty list, so the panel SELF-HIDES (renders null) — empty beats filler.
 *
 * The parent (OpeningDetailPage) owns the player view-modes; this panel only
 * lists the deviations and reports a Watch/Play tap back up.
 */
export function SublinePanel({ opening, lineIndex, onWatch, onPlay }: {
  opening: OpeningRecord;
  /** The selected variation tab index (sublines are per-variation; main = none). */
  lineIndex: number;
  onWatch: (subline: CourseSubline, varIndex: number) => void;
  onPlay: (subline: CourseSubline, varIndex: number) => void;
}): JSX.Element | null {
  const sublines = useMemo<CourseSubline[]>(() => {
    const course = buildCourse(opening);
    return course.chapters.find((c) => c.lineIndex === lineIndex)?.sublines ?? [];
  }, [opening, lineIndex]);
  const [expanded, setExpanded] = useState(false);

  if (sublines.length === 0) return null;

  const OPEN_COUNT = 3;
  const shown = expanded ? sublines : sublines.slice(0, OPEN_COUNT);
  // Selective frequency caption — speak the % only when the top deviation is
  // dominant or rare (the rule: only when it adds value).
  const why = sublineWhyFact(sublines[0]);

  return (
    <div
      className="mb-6 rounded-2xl bg-theme-surface border border-theme-border p-4 flex flex-col gap-2"
      data-testid="subline-panel"
    >
      <div className="flex items-center gap-2">
        <GitBranch size={15} className="text-theme-accent shrink-0" />
        <p className="text-sm font-bold">They might play</p>
        <span className="text-[10px] uppercase tracking-wide text-theme-text-muted/70 ml-auto">
          Watch the reply or play it out
        </span>
      </div>
      {why.text && (
        <p className="text-[11px] italic text-theme-text-muted" data-testid="subline-why">{why.text}</p>
      )}
      {shown.map((s) => (
        <div key={`${s.triggerMove}-${s.atPly}`} className="flex items-center gap-2 text-xs py-0.5">
          <span className="font-mono font-semibold text-theme-accent shrink-0 w-12">{s.triggerMove}</span>
          <span className="truncate flex-1" style={{ color: 'var(--color-text-muted)' }}>{subName(s.name)}</span>
          <span className="text-theme-text-muted/60 shrink-0 w-9 text-right">{s.pct}%</span>
          <button
            type="button"
            onClick={() => onWatch(s, lineIndex)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 transition-colors font-semibold"
            data-testid={`subline-watch-${s.atPly}-${s.triggerMove}`}
            aria-label={`Watch how to meet ${s.triggerMove}`}
          >
            <Eye size={12} /> Watch
          </button>
          <button
            type="button"
            onClick={() => onPlay(s, lineIndex)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors font-semibold"
            data-testid={`subline-play-${s.atPly}-${s.triggerMove}`}
            aria-label={`Play out ${s.triggerMove}`}
          >
            <Swords size={12} /> Play
          </button>
        </div>
      ))}
      {sublines.length > OPEN_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-theme-accent/80 hover:text-theme-accent self-start font-semibold mt-0.5"
          data-testid="subline-toggle"
        >
          {expanded ? 'Show fewer' : `Show ${sublines.length - OPEN_COUNT} more`}
        </button>
      )}
    </div>
  );
}

/** The specific tail of an ECO name ("…: Advance Variation, Tal" → "Advance
 *  Variation, Tal"), matching the Academy course presentation. */
function subName(name: string): string {
  return name.includes(':') ? name.split(':').slice(1).join(':').trim() : name;
}
