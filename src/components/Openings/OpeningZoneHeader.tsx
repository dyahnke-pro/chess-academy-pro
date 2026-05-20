import { Volume2, Square as StopIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Section divider used on OpeningDetailPage to organize the 13
 * scrollable cards into 5 teaching zones. Each zone answers ONE
 * question for the student — Identity, Understand, Master, Weapons,
 * Pitfalls, Depth — so the page reads as a coached arc rather than
 * a feature dump.
 *
 * Visual treatment per zone:
 *   - thin colored gradient strip across the top edge
 *   - icon + zone title (eyebrow size) on the left
 *   - single-message tagline underneath
 *   - ~24px breathing room before the first card below
 */
interface OpeningZoneHeaderProps {
  /** Zone title — short noun ("Understand", "Master", "Weapons"). */
  title: string;
  /** Single-message tagline — the question this zone answers. */
  tagline: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Tailwind color family — "cyan", "blue", "emerald", "amber", "slate". */
  color: 'cyan' | 'blue' | 'emerald' | 'amber' | 'slate';
  /** Optional right-aligned slot (counts, badges, etc.). */
  aside?: ReactNode;
  /** When provided, the whole header becomes a button that fires this
   *  on tap — used to start TTS narration of the zone's content.
   *  A speaker affordance renders on the right (David 2026-05-20:
   *  "I can't click on Understand to listen"). */
  onActivate?: () => void;
  /** True while the zone's narration is actively playing — flips the
   *  speaker icon to a "playing" state. */
  isActive?: boolean;
}

const COLOR_CLASSES: Record<OpeningZoneHeaderProps['color'], {
  text: string;
  border: string;
  bg: string;
  iconBg: string;
}> = {
  cyan: {
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
    iconBg: 'bg-cyan-500/15',
  },
  blue: {
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    iconBg: 'bg-blue-500/15',
  },
  emerald: {
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    iconBg: 'bg-emerald-500/15',
  },
  amber: {
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    iconBg: 'bg-amber-500/15',
  },
  slate: {
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    bg: 'bg-slate-500/5',
    iconBg: 'bg-slate-500/15',
  },
};

export function OpeningZoneHeader({
  title,
  tagline,
  icon: Icon,
  color,
  aside,
  onActivate,
  isActive,
}: OpeningZoneHeaderProps): JSX.Element {
  const c = COLOR_CLASSES[color];
  const clickable = Boolean(onActivate);
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
        <Icon size={16} className={c.text} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>
            {title}
          </h2>
        </div>
        <p className="text-xs text-theme-text-muted leading-snug mt-0.5">{tagline}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
      {clickable ? (
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
          {isActive ? <StopIcon size={13} className={c.text} /> : <Volume2 size={13} className={c.text} />}
        </div>
      ) : null}
    </div>
  );

  const base = `mt-6 mb-3 rounded-xl border ${c.border} ${c.bg} px-3 py-2.5`;
  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onActivate?.()}
        className={`${base} w-full text-left transition-colors hover:brightness-125`}
        data-testid={`opening-zone-${color}`}
        aria-label={isActive ? `Stop ${title} narration` : `Listen to ${title}`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={base} data-testid={`opening-zone-${color}`}>
      {inner}
    </div>
  );
}
