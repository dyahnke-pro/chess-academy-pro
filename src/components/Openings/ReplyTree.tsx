import { useMemo, useState } from 'react';
import { GitBranch, ChevronRight, Check } from 'lucide-react';
import { buildCourse, type ChapterSubline, type CourseSubline, type SublineRef } from '../../services/openingCourse';
import { replyTag, type ReplyTag } from '../../services/replyTags';
import { sublineLineKey } from '../../services/srsOpeningService';
import { getSublineNarration } from '../../data/lessons/sublineNarration';
import { numberedMove } from '../../utils/numberedMove';
import { isSublineRungComplete } from '../../utils/wlppLadder';
import type { OpeningRecord } from '../../types';

/**
 * THEIR REPLIES — the opponent's deviations inside the selected line, as a
 * tree grouped by the move they branch at (WO-COURSE-01 B, David 2026-10-27:
 * "make sure that the layout is well organized and makes sense … make sure
 * traps are included"). It replaces the flat "They might play" list, where a
 * reply showed as a bare move with no number and two different replies could
 * both read "Short Varia…".
 *
 * Each row: the reply with its move number, a tag (Trap / Mistake / Main /
 * Sideline — `replyTag`, computed from the engine-verified gems and the
 * reply's own frequency), the line's one-line idea, its share, and a check
 * once its Learn is done. Tapping a row opens the reply like a variation
 * (Watch / Learn / Practice / Play). Self-hides when the line has none.
 */
export function ReplyTree({ opening, lineIndex, onOpen }: {
  opening: OpeningRecord;
  /** The selected variation tab index (replies are per variation). */
  lineIndex: number;
  /** `varIndex` is the chapter the reply is shown on (where Back returns);
   *  the reply's identity is its own `tab`. */
  onOpen: (subline: ChapterSubline, varIndex: number, isTopOfGroup: boolean) => void;
}): JSX.Element | null {
  const groups = useMemo(() => {
    const course = buildCourse(opening);
    const list = course.chapters.find((c) => c.lineIndex === lineIndex)?.sublines ?? [];
    const byPly = new Map<number, ChapterSubline[]>();
    for (const s of list) {
      const g = byPly.get(s.atPly) ?? [];
      g.push(s);
      byPly.set(s.atPly, g);
    }
    return [...byPly.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([atPly, subs]) => {
        const sorted = [...subs].sort((a, b) => b.pct - a.pct || b.games - a.games);
        return {
          atPly,
          after: atPly > 0 && sorted[0].moves[atPly - 1] ? numberedMove(atPly - 1, sorted[0].moves[atPly - 1]) : null,
          rows: sorted.map((s, i) => ({
            subline: s,
            tag: replyTag(opening.id, s.moves.slice(0, atPly + 1), s.pct, i === 0),
            idea: replyIdea(opening.id, s),
            learned: isSublineRungComplete(opening, sublineLineKey(s), 'learn'),
          })),
        };
      });
  }, [opening, lineIndex]);
  const [expanded, setExpanded] = useState(false);

  if (groups.length === 0) return null;

  const OPEN_GROUPS = 3;
  const shown = expanded ? groups : groups.slice(0, OPEN_GROUPS);
  const hiddenReplies = groups.slice(OPEN_GROUPS).reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="mb-6 rounded-2xl bg-theme-surface border border-theme-border p-4 flex flex-col gap-3" data-testid="reply-tree">
      <div className="flex items-center gap-2">
        <GitBranch size={15} className="text-theme-accent shrink-0" />
        <p className="text-sm font-bold">Their replies</p>
        <span className="text-[11px] text-theme-text-muted ml-auto">Tap one to learn it</span>
      </div>
      {shown.map((g) => (
        <div key={g.atPly} className="flex flex-col gap-1" data-testid={`reply-group-${g.atPly}`}>
          {g.after && (
            <p className="text-[11px] uppercase tracking-wide text-theme-text-muted">After {g.after}</p>
          )}
          {g.rows.map(({ subline: s, tag, idea, learned }, i) => (
            <button
              key={`${s.triggerMove}-${s.atPly}`}
              type="button"
              onClick={() => onOpen(s, lineIndex, i === 0)}
              className="flex items-center gap-2 text-left text-xs py-2 px-2 rounded-lg hover:bg-theme-border/40 transition-colors"
              data-testid={`reply-${s.atPly}-${s.triggerMove}`}
              aria-label={`Learn the reply ${numberedMove(s.atPly, s.triggerMove)}`}
            >
              <span className="font-mono font-semibold text-theme-accent shrink-0 w-16">{numberedMove(s.atPly, s.triggerMove)}</span>
              <TagChip tag={tag} />
              <span className="flex-1 min-w-0 truncate text-theme-text-muted">{idea}</span>
              <span className="text-theme-text-muted/70 shrink-0 w-9 text-right">{s.pct}%</span>
              {learned ? (
                <Check size={14} className="text-emerald-400 shrink-0" data-testid={`reply-learned-${s.atPly}-${s.triggerMove}`} />
              ) : (
                <ChevronRight size={14} className="text-theme-text-muted shrink-0" />
              )}
            </button>
          ))}
        </div>
      ))}
      {hiddenReplies > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-theme-accent/80 hover:text-theme-accent self-start font-semibold"
          data-testid="reply-tree-toggle"
        >
          {expanded ? 'Show fewer' : `Show ${hiddenReplies} more`}
        </button>
      )}
    </div>
  );
}

const TAG_STYLE: Record<ReplyTag, { label: string; cls: string }> = {
  trap: { label: 'Trap', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  mistake: { label: 'Mistake', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  main: { label: 'Main', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  sideline: { label: 'Sideline', cls: 'bg-theme-border/40 text-theme-text-muted border-theme-border' },
};

export function TagChip({ tag }: { tag: ReplyTag }): JSX.Element {
  const t = TAG_STYLE[tag];
  return (
    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${t.cls}`} data-testid={`reply-tag-${tag}`}>
      {t.label}
    </span>
  );
}

/** The reply's one-line idea: the hand-written cue with the move it opens on
 *  dropped (the row already shows the move), else the line's own name. */
export function replyIdea(openingId: string, s: SublineRef & CourseSubline): string {
  const cue = getSublineNarration(openingId, s)?.intro.sayShort;
  if (cue) {
    const stripped = cue.replace(/^…?\S+\s+—\s+/, '').trim();
    if (stripped) return stripped;
  }
  return distinctiveName(s.name);
}

/** The most specific named segment of an ECO name ("Vienna Game: Vienna
 *  Gambit, Breyer Variation" → "Breyer Variation"). */
export function distinctiveName(name: string): string {
  const afterColon = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1).trim() : name;
  const tail = afterColon.includes(',') ? afterColon.slice(afterColon.lastIndexOf(',') + 1).trim() : afterColon;
  return tail || name;
}
