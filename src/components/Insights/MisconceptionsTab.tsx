/**
 * MisconceptionsTab — "Thinking Errors", the weakness-loop MIRROR
 * (David 2026-05-21, money build M4).
 *
 * Renders the closed-set misconception bucket (getMisconceptionProfile)
 * as a ranked, readable map of HOW you think — the recurring mistakes the
 * three faucets (Discussion Practice, Game Review, auto-analysis) tag into
 * one place. Ranked by what's DUE today; a tag never graduates out, it just
 * resurfaces less often as you fix it (SRS spacing). The Training Plan
 * (/coach/plan) is the hub that drills these; this tab is where you SEE them.
 *
 * Read-only. Empty state teaches: play/review a game and the map fills in.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Target, ArrowRight, Clock } from 'lucide-react';
import {
  getMisconceptionProfile,
  type MisconceptionAggregate,
} from '../../services/misconceptionService';

const BUCKET_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  opening: { label: 'Opening', color: 'text-sky-300', bg: 'bg-sky-500/15' },
  tactical: { label: 'Tactics', color: 'text-rose-300', bg: 'bg-rose-500/15' },
  positional: { label: 'Positional', color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
  endgame: { label: 'Endgame', color: 'text-amber-300', bg: 'bg-amber-500/15' },
  general: { label: 'General', color: 'text-violet-300', bg: 'bg-violet-500/15' },
  uncategorized: { label: 'Uncategorized', color: 'text-slate-300', bg: 'bg-slate-500/15' },
};

function timeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function MisconceptionsTab(): JSX.Element {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MisconceptionAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getMisconceptionProfile()
      .then((p) => { if (!cancelled) { setRows(p); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }} data-testid="misconceptions-loading">
        Reading your thinking-error map…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center" data-testid="misconceptions-empty">
        <div className="w-14 h-14 rounded-full bg-violet-500/15 flex items-center justify-center mb-4">
          <Brain size={26} className="text-violet-300" />
        </div>
        <h3 className="text-base font-semibold text-theme-text mb-1">No thinking errors yet</h3>
        <p className="text-sm text-theme-text-muted max-w-xs">
          Play a game with the coach or review one of yours. When you slip, I'll ask
          why — and map how you think right here.
        </p>
      </div>
    );
  }

  const dueTotal = rows.reduce((n, r) => n + r.openCount, 0);

  return (
    <div className="flex flex-col gap-3" data-testid="misconceptions-tab">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-theme-text-muted">
          {rows.length} error {rows.length === 1 ? 'type' : 'types'}
          {dueTotal > 0 ? ` · ${dueTotal} due to drill` : ' · all spaced out'}
        </p>
        <button
          onClick={() => void navigate('/coach/plan')}
          className="flex items-center gap-1 text-xs font-medium text-theme-accent hover:opacity-80"
          data-testid="misconceptions-to-plan"
        >
          Drill in Training Plan
          <ArrowRight size={13} />
        </button>
      </div>

      {rows.map((row) => {
        const style = BUCKET_STYLE[row.bucket] ?? BUCKET_STYLE.uncategorized;
        const due = row.openCount > 0;
        const example = row.examples[0];
        return (
          <div
            key={`${row.tag}:${row.label}`}
            className={`rounded-xl border p-3 ${due ? 'border-theme-border bg-theme-surface' : 'border-theme-border/50 bg-theme-surface/50'}`}
            data-testid={`misconception-row-${row.tag}`}
          >
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-9 h-9 rounded-lg ${style.bg} flex items-center justify-center mt-0.5`}>
                <Target size={16} className={style.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-theme-text">{row.label}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-theme-text-muted mt-0.5">
                  Seen {row.total}{row.total === 1 ? ' time' : ' times'}
                  {' · '}
                  <span className="inline-flex items-center gap-0.5">
                    <Clock size={10} />{timeAgo(row.lastSeenAt)}
                  </span>
                  {due
                    ? <span className="text-amber-400"> · {row.openCount} due now</span>
                    : <span className="text-emerald-400/80"> · resting</span>}
                </p>
                {example?.coachNote && (
                  <p className="text-xs text-theme-text-muted/90 mt-1.5 italic line-clamp-2">
                    “{example.coachNote}”
                  </p>
                )}
                {example?.openingName && (
                  <p className="text-[10px] text-theme-text-muted/70 mt-1">
                    e.g. {example.openingName}
                    {example.playedSan ? ` — you played ${example.playedSan}` : ''}
                    {example.bestSan ? `, best was ${example.bestSan}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
