import type { UpNextPick } from '../../services/upNextPicker';
import { GOLD_WEEK_DAYS } from '../../services/trainingWeek';

/**
 * Today's ring (three bites) and the week's trained days (David 2026-10-01).
 * Days count per WEEK, never as a consecutive streak — a missed day never
 * resets anything. Five is a gold week.
 */
export function TodayRing({ ring, done, daysThisWeek }: {
  ring: readonly UpNextPick[];
  done: ReadonlySet<string>;
  daysThisWeek: number;
}): JSX.Element | null {
  if (ring.length === 0) return null;
  const filled = ring.filter((p) => done.has(p.key)).length;
  const closed = filled === ring.length;
  const r = 22;
  const c = 2 * Math.PI * r;
  const seg = c / ring.length;
  const gap = 6;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-theme-border bg-theme-surface/60 px-4 py-3" data-testid="today-ring">
      <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0 -rotate-90" aria-label={`Today's training ${filled} of ${ring.length}`}>
        {ring.map((p, i) => (
          <circle
            key={p.key}
            cx="28" cy="28" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
            stroke={done.has(p.key) ? (closed ? '#fbbf24' : '#00e5ff') : 'rgba(148,163,184,0.25)'}
            strokeDasharray={`${seg - gap} ${c - seg + gap}`}
            strokeDashoffset={-i * seg}
            className={done.has(p.key) ? 'drop-shadow-[0_0_4px_rgba(0,229,255,0.9)]' : ''}
            data-testid={done.has(p.key) ? 'ring-seg-done' : 'ring-seg-open'}
          />
        ))}
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-black text-theme-text" data-testid="today-ring-label">
          {closed ? "Today's training: done" : `Today's training · ${filled}/${ring.length}`}
        </span>
        <div className="flex items-center gap-1" aria-label={`${daysThisWeek} trained days this week`} data-testid="week-dots">
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i < daysThisWeek ? (daysThisWeek >= GOLD_WEEK_DAYS ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-cyan-300') : 'bg-theme-border'}`}
            />
          ))}
          <span className="ml-1 text-[11px] text-theme-text-muted">
            {daysThisWeek >= GOLD_WEEK_DAYS ? 'Gold week' : `${daysThisWeek}/${GOLD_WEEK_DAYS} days this week`}
          </span>
        </div>
      </div>
    </div>
  );
}
