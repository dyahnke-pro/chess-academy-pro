import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { UpNextPick } from '../../services/upNextPicker';
import { startBite } from '../../services/activeBite';
import { reward } from '../../services/rewardService';
import { logAppAudit } from '../../services/appAuditor';

/**
 * The pinned, pulsing "Up next" bar (David 2026-10-01): the ONE thing the
 * record says to work on now, with its reason and its finish line. It mirrors
 * a real row (which pulses in place) — the list itself never reorders.
 * Opening it is a soft tap; FINISHING the bite is the burst.
 */
export function UpNextBar({ pick, surface }: { pick: UpNextPick; surface: string }): JSX.Element {
  const navigate = useNavigate();
  const open = (): void => {
    startBite(pick);
    reward({ kind: 'pip', step: 0 });
    void logAppAudit({
      kind: 'up-next-opened',
      category: 'subsystem',
      source: `UpNextBar.${surface}`,
      summary: `${pick.kind}: ${pick.label}`,
      details: JSON.stringify({ kind: pick.kind, key: pick.key, surface }),
    });
    void navigate(pick.path, pick.state ? { state: pick.state } : undefined);
  };
  return (
    <button
      onClick={open}
      className="relative w-full overflow-hidden rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-500/15 px-4 py-3 text-left upnext-glow transition-transform active:scale-[0.98]"
      data-testid="up-next-bar"
      data-pick-kind={pick.kind}
    >
      <span className="flex items-center gap-3">
        <Sparkles size={22} className="shrink-0 text-fuchsia-200 drop-shadow-[0_0_6px_rgba(255,61,242,0.9)]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300">Up next</span>
            <span className="rounded-full bg-black/30 px-2 py-px text-[10px] font-bold text-fuchsia-100" data-testid="up-next-bite">{pick.bite}</span>
          </span>
          <span className="truncate text-base font-black text-theme-text" data-testid="up-next-label">{pick.label}</span>
          <span className="text-xs leading-snug text-theme-text-muted" data-testid="up-next-reason">{pick.reason}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-fuchsia-200" />
      </span>
    </button>
  );
}
