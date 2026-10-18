import { useEffect, useState } from 'react';
import { loadSkillMeters, type SkillMeter, type SkillMeterId } from '../../services/skillMetersLoader';
import { logAppAudit } from '../../services/appAuditor';

/**
 * The nine skill meters — the front of the Weaknesses page (David 2026-10-18:
 * the meters are the front page, the heat map is what you see when you tap
 * one). Tapping a meter filters the heat map to the skills inside it; tapping
 * it again shows them all. A meter with too little evidence reads "not rated
 * yet", never a level — absent is not weak.
 */
export function SkillMetersStrip({ picked, onPick }: { picked: SkillMeterId | null; onPick: (id: SkillMeterId | null) => void }): JSX.Element | null {
  const [meters, setMeters] = useState<SkillMeter[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadSkillMeters().then((m) => {
      if (cancelled) return;
      setMeters(m);
      void logAppAudit({
        kind: 'skill-meters-shown',
        category: 'subsystem',
        source: 'SkillMetersStrip',
        summary: m.map((x) => `${x.id}=${x.rated ? `Lv${x.level}(${Math.round(x.rating)})` : 'unrated'}`).join(' '),
        details: JSON.stringify(m.map((x) => ({ id: x.id, rating: Math.round(x.rating), rd: Math.round(x.rd), events: x.events, level: x.level, rated: x.rated }))),
      });
    }).catch(() => setMeters([]));
    return () => { cancelled = true; };
  }, []);
  if (!meters || meters.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" data-testid="skill-meters">
      {meters.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(picked === m.id ? null : m.id)}
          className={`rounded-lg border px-3 py-2 text-left transition-colors ${picked === m.id ? 'border-amber-300/70 bg-amber-400/10' : 'border-theme-border bg-theme-surface'}`}
          data-testid={`skill-meter-${m.id}`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-theme-text">{m.label}</span>
            <span className="font-mono tabular-nums text-theme-text-muted">
              {m.rated ? `Lv ${m.level} · ~${Math.round(m.rating / 10) * 10}` : 'not rated yet'}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${m.rated ? 'bg-gradient-to-r from-amber-400 to-yellow-200' : 'bg-white/15'} ${widthClass(m.rated ? m.toNext : 0)}`} />
          </div>
        </button>
      ))}
    </div>
  );
}

/** The fill toward the next level, in tenths (Tailwind classes, no inline style). */
function widthClass(f: number): string {
  const tenths = Math.max(0, Math.min(10, Math.round(f * 10)));
  return ['w-0', 'w-[10%]', 'w-[20%]', 'w-[30%]', 'w-[40%]', 'w-1/2', 'w-[60%]', 'w-[70%]', 'w-[80%]', 'w-[90%]', 'w-full'][tenths];
}
