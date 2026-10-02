import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/schema';
import { getCapabilityProfile } from '../../services/capabilityEvidence';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from '../../services/weaknessSpine';
import { heatMap, newlyGreen, type HeatTile } from '../../services/heatMap';
import { reward } from '../../services/rewardService';
import { resolveRepRoute } from '../../services/repRouting';
import { getMisconceptionTag } from '../../data/misconceptionTags';
import { REP_PUZZLE_CAP } from '../../services/repCompletion';
import { logAppAudit } from '../../services/appAuditor';

/**
 * The HEAT MAP on Weaknesses (David 2026-10-01): every skill the coach tracks,
 * RED (keeps failing) / GREEN (proven held) / GREY (not proven either way —
 * never "mastered"). Green finally has a screen: the app can say you GOT
 * BETTER, not only what you are bad at.
 *
 * A tile that turned green since the last visit gets the "Fixed" fanfare once.
 * Tap a tile → its evidence, and a two-minute drill for it.
 */
const SEEN_KEY = 'heatmap_seen_green_v1';

const STATE_STYLE: Record<HeatTile['state'], string> = {
  red: 'border-rose-400/60 bg-rose-500/15 text-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.35)]',
  green: 'border-green-400/70 bg-green-500/20 text-green-100 shadow-[0_0_12px_rgba(34,197,94,0.5)]',
  grey: 'border-theme-border bg-theme-surface text-theme-text-muted',
};

function evidenceLine(t: HeatTile): string {
  if (t.state === 'green') return `Proven: answered ${t.heldStreak} times in a row across ${t.streakGames} games.`;
  if (t.state === 'red') {
    const parts: string[] = [];
    if (t.openCount > 0) parts.push(`${t.openCount} open slip${t.openCount === 1 ? '' : 's'} from your games`);
    if (t.broken > 0) parts.push(`missed ${t.broken} time${t.broken === 1 ? '' : 's'} when the board asked`);
    if (t.heldStreak > 0) parts.push(`but ${t.heldStreak} right since — on its way`);
    return `${parts.join(', ')}.`;
  }
  if (t.heldStreak > 0) return `Being tested: answered ${t.heldStreak} time${t.heldStreak === 1 ? '' : 's'} — prove it in more games to turn it green.`;
  return 'Not tested yet — the board has not asked you this.';
}

export function HeatMapPanel(): JSX.Element | null {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<HeatTile[] | null>(null);
  const [holes, setHoles] = useState<UnifiedWeakness[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [profile, weaknesses, seen] = await Promise.all([
        getCapabilityProfile().catch(() => new Map()),
        getUnifiedWeaknessProfile().catch((): UnifiedWeakness[] => []),
        db.meta.get(SEEN_KEY).catch(() => undefined),
      ]);
      if (cancelled) return;
      const t = heatMap(profile, weaknesses);
      setTiles(t);
      setHoles(weaknesses);
      let before = new Set<string>();
      try { before = new Set(JSON.parse(seen?.value ?? '[]') as string[]); } catch { /* fresh */ }
      const crossed = seen ? newlyGreen(t, before) : [];
      if (crossed.length > 0) {
        setFresh(new Set(crossed.map((c) => c.tag)));
        reward({ kind: 'proven', label: crossed.length === 1 ? `Fixed: ${crossed[0].label}` : `${crossed.length} skills fixed` });
      }
      void db.meta.put({ key: SEEN_KEY, value: JSON.stringify(t.filter((x) => x.state === 'green').map((x) => x.tag)) });
      void logAppAudit({
        kind: 'heat-map-shown',
        category: 'subsystem',
        source: 'HeatMapPanel',
        summary: `red ${t.filter((x) => x.state === 'red').length} · green ${t.filter((x) => x.state === 'green').length} · grey ${t.filter((x) => x.state === 'grey').length}${crossed.length ? ` · newly green ${crossed.length}` : ''}`,
        details: JSON.stringify({
          red: t.filter((x) => x.state === 'red').map((x) => x.tag),
          green: t.filter((x) => x.state === 'green').map((x) => x.tag),
          newlyGreen: crossed.map((x) => x.tag),
          firstVisit: !seen,
        }),
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const ordered = useMemo(() => {
    if (!tiles) return [];
    const rank = { red: 0, green: 1, grey: 2 } as const;
    return [...tiles].sort((a, b) => rank[a.state] - rank[b.state] || b.openCount - a.openCount || b.progress - a.progress);
  }, [tiles]);

  if (!tiles) return <div className="min-h-[6rem]" data-testid="heat-map-loading" />;

  const count = (s: HeatTile['state']): number => tiles.filter((t) => t.state === s).length;
  const selected = ordered.find((t) => t.tag === open) ?? null;

  const drill = (t: HeatTile): void => {
    const hole = holes.find((h) => h.capabilityTag === t.tag && h.openCount > 0);
    if (hole) {
      const route = resolveRepRoute({
        kind: 'weakness', key: `weakness:${hole.tag}:${hole.label}`, label: hole.label, subtitle: '',
        tag: hole.tag, puzzleThemes: hole.puzzleThemes, fen: hole.fen,
      });
      void navigate(route.path, route.state ? { state: route.state } : undefined);
      return;
    }
    const themes = getMisconceptionTag(t.tag)?.drill.puzzleThemes ?? [];
    if (themes.length > 0) {
      void navigate('/tactics/adaptive', { state: { forcedWeakThemes: themes, misconceptionTag: t.tag, repKey: `heat:${t.tag}`, repCap: REP_PUZZLE_CAP } });
    } else {
      void navigate('/coach/fundamentals');
    }
  };

  return (
    <section className="py-3 border-b" style={{ borderColor: 'var(--color-border)' }} data-testid="heat-map">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-theme-text">Your skills</h2>
        <span className="text-[11px] font-semibold" data-testid="heat-map-counts">
          <span className="text-rose-300">{count('red')} to fix</span>
          <span className="text-theme-text-muted"> · </span>
          <span className="text-green-300">{count('green')} proven</span>
          <span className="text-theme-text-muted"> · {count('grey')} not tested</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ordered.map((t) => (
          <button
            key={t.tag}
            onClick={() => setOpen(open === t.tag ? null : t.tag)}
            className={`relative overflow-hidden rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition-transform active:scale-95 ${STATE_STYLE[t.state]} ${fresh.has(t.tag) ? 'animate-pulse' : ''} ${open === t.tag ? 'ring-2 ring-cyan-300' : ''}`}
            data-testid={`heat-tile-${t.tag}`}
            data-state={t.state}
          >
            {t.state === 'green' ? 'Fixed: ' : ''}{t.label}
            {t.state !== 'green' && t.progress > 0 && (
              <span className="absolute bottom-0 left-0 h-0.5 bg-green-400" style={{ width: `${Math.round(t.progress * 100)}%` }} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-2 rounded-lg border border-cyan-300/40 bg-cyan-400/5 p-2.5" data-testid="heat-tile-detail">
          <p className="text-xs font-bold text-theme-text">{selected.label}</p>
          <p className="mt-0.5 text-xs text-theme-text-muted">{evidenceLine(selected)}</p>
          <button
            onClick={() => drill(selected)}
            className="mt-2 rounded-lg border border-cyan-300 bg-cyan-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-cyan-100 shadow-[0_0_12px_rgba(0,229,255,0.4)]"
            data-testid="heat-tile-drill"
          >
            Drill it
          </button>
        </div>
      )}
    </section>
  );
}
