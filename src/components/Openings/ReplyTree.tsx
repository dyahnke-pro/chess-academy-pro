import { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, ChevronRight, Check } from 'lucide-react';
import { buildCourse, sublinesForOpening, type ChapterSubline, type CourseSubline, type SublineRef } from '../../services/openingCourse';
import { replyTag, type ReplyTag } from '../../services/replyTags';
import { sublineLineKey } from '../../services/srsOpeningService';
import { getSublineNarration } from '../../data/lessons/sublineNarration';
import { numberedMove } from '../../utils/numberedMove';
import { isSublineRungComplete } from '../../utils/wlppLadder';
import { builtRepliesFor, replyFloorPly, tabLineSans } from '../../services/builtReplies';
import { clubRepliesOf, clubRepliesOnTab, walkBandFor, type ClubReplyRecord } from '../../services/clubReplies';
import { facedRepliesIndex, type FacedIndex } from '../../services/facedReplies';
import { groupReplies } from '../../services/replyTree';
import { replyIdentity } from '../../services/replyIdentity';
import { explorerBandFor } from '../../services/ratingBands';
import { useAppStore } from '../../stores/appStore';
import { logAppAudit } from '../../services/appAuditor';
import type { OpeningRecord, OpeningReply } from '../../types';

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
 * Every tab of every opening carries the replies the games show
 * (`builtRepliesFor`, David 2026-10-28: "match the depth of chessable"),
 * after the curated ones — and the replies CLUB players make that no taught
 * line covers (`clubRepliesOnTab`, WO-COURSE-01 D), tagged Club, ordered by
 * the student's rating band. In every group the replies the student met in
 * their own games come first (`groupReplies`).
 */
export function ReplyTree({ opening, lineIndex, onOpen }: {
  opening: OpeningRecord;
  /** The selected variation tab index (replies are per variation). */
  lineIndex: number;
  /** `varIndex` is the chapter the reply is shown on (where Back returns);
   *  the reply's identity is its own `tab`. */
  onOpen: (subline: ChapterSubline, varIndex: number, isTopOfGroup: boolean) => void;
}): JSX.Element | null {
  // The replies the games show for this tab, built when it is opened
  // (`builtRepliesFor`); the curated ones come first and keep their place.
  const [built, setBuilt] = useState<{ key: string; replies: OpeningReply[] }>({ key: '', replies: [] });
  const builtKey = `${opening.id}|${lineIndex}`;
  useEffect(() => {
    let live = true;
    void builtRepliesFor(opening, lineIndex).then((replies) => { if (live) setBuilt({ key: builtKey, replies }); });
    return () => { live = false; };
  }, [opening, lineIndex, builtKey]);

  // The club replies of this opening (fetched when the page opens) and what
  // the student's own opponents played — each read once a session.
  const [club, setClub] = useState<{ key: string; records: ClubReplyRecord[]; faced: FacedIndex | null }>({ key: '', records: [], faced: null });
  const clubKey = `${opening.id}|${opening.color}`;
  useEffect(() => {
    let live = true;
    void Promise.all([clubRepliesOf(opening.id), facedRepliesIndex(opening.color)])
      .then(([records, faced]) => { if (live) setClub({ key: clubKey, records, faced }); });
    return () => { live = false; };
  }, [opening.id, opening.color, clubKey]);
  // The student's band, from the adaptive rating (the ONE bucketer).
  const rating = useAppStore((st) => st.activeProfile?.currentRating);
  const studentBand = explorerBandFor(rating).band;

  const groups = useMemo(() => {
    const course = buildCourse(opening);
    const curated = course.chapters.find((c) => c.lineIndex === lineIndex)?.sublines ?? [];
    const extra = built.key === builtKey
      ? built.replies
        .filter((r) => !curated.some((c) => c.atPly === r.atPly && c.triggerMove === r.triggerMove))
        .map((r): ChapterSubline => ({ ...r, tab: lineIndex }))
      : [];
    const courseRows = [...curated, ...extra];
    const ready = club.key === clubKey;
    const tabLine = tabLineSans(opening, lineIndex);
    const clubRows = ready && club.records.length > 0
      ? clubRepliesOnTab({
        records: club.records,
        tabLine,
        lineIndex,
        from: replyFloorPly(opening, lineIndex),
        anchors: curated,
        shown: courseRows,
        reserved: new Set(Object.entries(sublinesForOpening(opening.id))
          .flatMap(([tab, list]) => list.map((s) => replyIdentity({ ...s, tab: Number(tab) })))),
        studentBand,
        faced: club.faced,
      })
      : [];
    return groupReplies(tabLine, [...courseRows, ...clubRows], ready ? club.faced : null).map((g) => ({
      ...g,
      rows: g.rows.map(({ subline: s, met, isTop }) => ({
        subline: s,
        met,
        isTop,
        tag: replyTag(opening.id, s.moves.slice(0, s.atPly + 1), s.pct, isTop, s.club ? 'club' : 'course'),
        idea: replyIdea(opening.id, s),
        learned: isSublineRungComplete(opening, sublineLineKey(s), 'learn'),
      })),
    }));
  }, [opening, lineIndex, built, builtKey, club, clubKey, studentBand]);

  // The decision, observable (every algo-based build ships its audit row):
  // which club replies this tab shows, in what order, for which band, and
  // which the student met in their own games. Once per distinct order.
  const emitted = useRef('');
  useEffect(() => {
    const rows = groups.flatMap((g) => g.rows
      .filter((r) => r.subline.club)
      .map((r) => ({ group: g.id, san: r.subline.triggerMove, atPly: r.subline.atPly, via: r.subline.via ?? null, reach: r.subline.club?.reach ?? 0, met: r.met })));
    if (rows.length === 0) return;
    // The measured band the order read (the one that holds the student).
    const band = walkBandFor(Object.keys(club.records[0]?.reach ?? {}), studentBand) ?? '';
    const signature = `${opening.id}|${lineIndex}|${band}|${rows.map((r) => `${r.group}:${r.san}:${r.met}`).join(',')}`;
    if (emitted.current === signature) return;
    emitted.current = signature;
    const met = rows.filter((r) => r.met > 0).length;
    void logAppAudit({
      kind: 'club-replies-ordered',
      category: 'subsystem',
      source: 'ReplyTree',
      summary: `${opening.id} tab ${lineIndex}: ${rows.length} club replies by band ${band}, ${met} met in the student's games`,
      details: JSON.stringify({ openingId: opening.id, lineIndex, band, rating: rating ?? null, shown: rows.length, met, rows }),
    });
  }, [groups, opening.id, lineIndex, studentBand, rating, club.records]);

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
        <div key={g.id} className="flex flex-col gap-1" data-testid={`reply-group-${g.id}`}>
          {g.after && (
            <p className="text-[11px] uppercase tracking-wide text-theme-text-muted">After {g.after}</p>
          )}
          {g.rows.map(({ subline: s, tag, idea, learned, met, isTop }) => (
            <button
              key={`${s.triggerMove}-${s.atPly}`}
              type="button"
              onClick={() => onOpen(s, lineIndex, isTop)}
              className="flex items-center gap-2 text-left text-xs py-2 px-2 rounded-lg hover:bg-theme-border/40 transition-colors"
              data-testid={`reply-${s.atPly}-${s.triggerMove}`}
              aria-label={`Learn the reply ${numberedMove(s.atPly, s.triggerMove)}`}
            >
              <span className="font-mono font-semibold text-theme-accent shrink-0 w-16">{numberedMove(s.atPly, s.triggerMove)}</span>
              <TagChip tag={tag} />
              <span className="flex-1 min-w-0 truncate text-theme-text-muted">{idea}</span>
              {met > 0 && (
                <span className="text-[10px] text-sky-300 shrink-0" data-testid={`reply-met-${s.atPly}-${s.triggerMove}`}>
                  met {met}×
                </span>
              )}
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
  club: { label: 'Club', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
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
