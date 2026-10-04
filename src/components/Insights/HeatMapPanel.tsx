import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/schema';
import { getCapabilityProfile, isUseEvidence } from '../../services/capabilityEvidence';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from '../../services/weaknessSpine';
import { heatMap, newlyGreen, type HeatTile } from '../../services/heatMap';
import { reward } from '../../services/rewardService';
import { getMisconceptionTag } from '../../data/misconceptionTags';
import { REP_PUZZLE_CAP } from '../../services/repCompletion';
import { logAppAudit } from '../../services/appAuditor';
import { buildSkillTimelines, currentStrength, parseGameDate, relativeDay, TIMELINE_WEEKS, type SkillTimeline } from '../../services/skillTimeline';

/**
 * The HEAT MAP on Weaknesses → Overview (David 2026-10-01, redrawn
 * 2026-10-02): every skill the coach tracks as a COLUMN, the last 26 weeks
 * running down it (newest at the top), each week faded red → green by how the
 * student did when the skill came up. Dark = the board never asked; it is never
 * drawn as good news. The fade runs DOWN a column only — blending sideways
 * would paint one skill's record onto its neighbour.
 *
 * A skill that turned green since the last visit gets the "Fixed" fanfare once.
 * Tap a column → its evidence, when the mistake was last made, and the way in:
 * Practice your own positions, or Drill puzzles on the theme.
 */
const SEEN_KEY = 'heatmap_seen_green_v1';

const STATE_LABEL: Record<HeatTile['state'], { text: string; cls: string }> = {
  red: { text: 'to fix', cls: 'text-rose-300' },
  green: { text: 'proven', cls: 'text-green-300' },
  grey: { text: 'not proven yet', cls: 'text-theme-text-muted' },
};

const ROW_PX = 9;
const EMPTY: readonly [number, number, number] = [38, 38, 38];
const STOPS: readonly (readonly [number, number, number])[] = [
  [214, 40, 40], [238, 122, 26], [242, 210, 27], [155, 210, 46], [47, 168, 79],
];

/** 0 → red, 0.5 → yellow, 1 → green. */
function ramp(s: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, s)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - i;
  return [0, 1, 2].map((k) => STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f) as [number, number, number];
}

/** One column, faded down time: each week is a weighted blend of the weeks
 *  around it that were actually asked, and fades to dark where none were. */
function fadeColumn(weeks: SkillTimeline['weeks']): [number, number, number][] {
  return weeks.map((_, y) => {
    let w = 0;
    let v = 0;
    weeks.forEach((c, k) => {
      if (c.score === null) return;
      const g = Math.exp(-((k - y) ** 2) / 3);
      w += g;
      v += g * c.score;
    });
    if (w === 0) return [...EMPTY] as [number, number, number];
    const a = Math.min(1, w * 1.1);
    const c = ramp(v / w);
    return [0, 1, 2].map((k) => EMPTY[k] + (c[k] - EMPTY[k]) * a) as [number, number, number];
  });
}

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

/** The hole whose positions come from the student's OWN games for this
 *  skill, or null — Practice is offered only when one exists. */
export function ownPositionsHole(
  holes: readonly UnifiedWeakness[],
  tag: string,
): UnifiedWeakness | null {
  return holes.find((h) => h.capabilityTag === tag && h.openCount > 0 && h.tag.startsWith('analysis:')) ?? null;
}

export function HeatMapPanel(): JSX.Element | null {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<HeatTile[] | null>(null);
  const [timelines, setTimelines] = useState<Map<string, SkillTimeline>>(new Map());
  const [holes, setHoles] = useState<UnifiedWeakness[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [profile, weaknesses, seen, slips, evidence, games] = await Promise.all([
        getCapabilityProfile().catch(() => new Map()),
        getUnifiedWeaknessProfile().catch((): UnifiedWeakness[] => []),
        db.meta.get(SEEN_KEY).catch(() => undefined),
        db.misconceptionTags.toArray().catch(() => []),
        // The timeline is the USE reading — a lesson tap is not a game week.
        db.capabilityEvidence.toArray().then((rows) => rows.filter(isUseEvidence)).catch(() => []),
        db.games.toArray().catch(() => []),
      ]);
      if (cancelled) return;
      const t = heatMap(profile, weaknesses);
      const gameDates = new Map<string, number>();
      for (const g of games) {
        const d = parseGameDate(g.date);
        if (d !== null) gameDates.set(g.id, d);
      }
      const lines = buildSkillTimelines(t.map((x) => x.tag), slips, evidence, gameDates, now);
      setTiles(t);
      setTimelines(new Map(lines.map((l) => [l.tag, l])));
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
          weeksWithData: lines.reduce((n, l) => n + l.weeks.filter((c) => c.score !== null).length, 0),
        }),
      });
    })();
    return () => { cancelled = true; };
  }, [now]);

  // WEAKEST → STRONGEST, left to right (David 2026-10-03), by how the skill
  // reads over recent weeks. Never-asked skills go last: absent is not strong.
  const ordered = useMemo(() => {
    if (!tiles) return [];
    const strength = new Map(tiles.map((t) => {
      const line = timelines.get(t.tag);
      return [t.tag, line ? currentStrength(line) : null] as const;
    }));
    return [...tiles].sort((a, b) => {
      const sa = strength.get(a.tag) ?? null;
      const sb = strength.get(b.tag) ?? null;
      if (sa === null || sb === null) return sa === null && sb === null ? 0 : sa === null ? 1 : -1;
      return sa - sb || b.openCount - a.openCount;
    });
  }, [tiles, timelines]);

  // Paint: one pixel per (skill, week) on a small canvas, newest week on top,
  // each column scaled up with smoothing so the weeks fade into each other.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || ordered.length === 0) return;
    const small = document.createElement('canvas');
    small.width = ordered.length;
    small.height = TIMELINE_WEEKS;
    const g = small.getContext('2d');
    const ctx = cv.getContext('2d');
    if (!g || !ctx) return;
    const img = g.createImageData(ordered.length, TIMELINE_WEEKS);
    ordered.forEach((t, x) => {
      const weeks = timelines.get(t.tag)?.weeks ?? [];
      const col = fadeColumn(weeks);
      col.forEach((c, i) => {
        const y = TIMELINE_WEEKS - 1 - i;
        const p = (y * ordered.length + x) * 4;
        img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]; img.data[p + 3] = 255;
      });
    });
    g.putImageData(img, 0, 0);
    const colW = 16;
    cv.width = ordered.length * colW;
    cv.height = TIMELINE_WEEKS * ROW_PX;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cv.width, cv.height);
    ordered.forEach((_, x) => {
      ctx.drawImage(small, x, 0, 1, TIMELINE_WEEKS, x * colW + 1, 0, colW - 2, cv.height);
    });
  }, [ordered, timelines]);

  if (!tiles) return <div className="min-h-[6rem]" data-testid="heat-map-loading" />;

  const count = (s: HeatTile['state']): number => tiles.filter((t) => t.state === s).length;
  const selected = ordered.find((t) => t.tag === open) ?? null;
  // "Practice your positions" is offered only when there ARE positions from
  // the student's own games behind this skill — an `analysis:` group on My
  // Weaknesses (David 2026-10-04). Any other hole would route to generic
  // puzzles, which is what Drill already is, so the label would overpromise.
  const selectedHole = selected ? ownPositionsHole(holes, selected.tag) : null;
  const selectedThemes = selected ? getMisconceptionTag(selected.tag)?.drill.puzzleThemes ?? [] : [];
  const lastMistake = selected ? timelines.get(selected.tag)?.lastMistakeAt ?? null : null;

  // Month labels down the side: one at each week where the month changes.
  const monthMarks: { row: number; label: string }[] = [];
  for (let i = 0; i < TIMELINE_WEEKS; i++) {
    const weekStart = now - (TIMELINE_WEEKS - 1 - i) * 7 * 24 * 60 * 60 * 1000;
    const label = new Date(weekStart).toLocaleString('en-US', { month: 'short' });
    const row = TIMELINE_WEEKS - 1 - i;
    const prev = monthMarks[monthMarks.length - 1];
    if (!prev || prev.label !== label) monthMarks.push({ row, label });
  }

  const practice = (hole: UnifiedWeakness): void => {
    // Your own game positions (David 2026-10-02): a hole the spine built from
    // your mistakes opens that group on My Weaknesses — the same bucket key, so
    // the group is exactly the positions this column counted.
    void navigate('/tactics/mistakes', { state: { weaknessKey: hole.tag.replace(/^analysis:/, '') } });
  };

  const drill = (t: HeatTile, themes: readonly string[]): void => {
    if (themes.length > 0) {
      void navigate('/tactics/adaptive', { state: { forcedWeakThemes: themes, misconceptionTag: t.tag, repKey: `heat:${t.tag}`, repCap: REP_PUZZLE_CAP } });
    } else {
      void navigate('/coach/fundamentals');
    }
  };

  const gridH = TIMELINE_WEEKS * ROW_PX;

  return (
    <section className="py-3 border-b" style={{ borderColor: 'var(--color-border)' }} data-testid="heat-map">
      <h2 className="text-center text-xs font-black uppercase tracking-widest text-theme-text-muted">Your skills · last 26 weeks</h2>
      <div className="mt-1 mb-2 flex items-baseline justify-between gap-2 border-b pb-1" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-[11px] uppercase tracking-wide text-theme-text-muted">Tap a skill</span>
        <span className="text-[11px] font-semibold" data-testid="heat-map-counts">
          <span className="text-rose-300">{count('red')} to fix</span>
          <span className="text-theme-text-muted"> · </span>
          <span className="text-green-300">{count('green')} proven</span>
          <span className="text-theme-text-muted"> · {count('grey')} not tested</span>
        </span>
      </div>
      <div className="grid grid-cols-[30px_1fr] gap-x-1">
        <div className="relative" style={{ height: gridH }} aria-hidden="true">
          {monthMarks.map((m) => (
            <div
              key={`${m.label}-${m.row}`}
              className="absolute right-0 -translate-y-1/2 text-[9.5px] text-theme-text-muted"
              style={{ top: Math.min(gridH - 6, Math.max(6, m.row * ROW_PX + ROW_PX / 2)) }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: gridH }}>
          <canvas ref={canvasRef} className="block h-full w-full rounded-md" data-testid="heat-map-canvas" />
          <div className="absolute inset-0 flex">
            {ordered.map((t) => (
              <button
                key={t.tag}
                onClick={() => setOpen(open === t.tag ? null : t.tag)}
                className={`h-full flex-1 rounded-sm ${open === t.tag ? 'ring-2 ring-cyan-300' : ''} ${fresh.has(t.tag) ? 'animate-pulse' : ''}`}
                aria-label={`${t.label}: ${STATE_LABEL[t.state].text}`}
                data-testid={`heat-tile-${t.tag}`}
                data-state={t.state}
              />
            ))}
          </div>
        </div>
        <div />
        <div className="flex h-[132px]" aria-hidden="true">
          {ordered.map((t) => (
            <span key={t.tag} className="relative flex-1">
              <i
                className={`absolute top-1 right-1/2 max-w-[132px] origin-top-right -rotate-[72deg] truncate whitespace-nowrap text-[9.5px] not-italic ${open === t.tag ? 'font-bold text-cyan-300' : t.state === 'green' ? 'text-green-300' : 'text-theme-text-muted'}`}
              >
                {t.label}
              </i>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-[34px] text-[10px] uppercase tracking-wide text-theme-text-muted" aria-hidden="true">
        <span>← weakest</span>
        <span>strongest, then not tested →</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-theme-text-muted">
        worse
        <span className="h-2.5 w-32 rounded-full" style={{ background: 'linear-gradient(90deg,#d62828,#ee7a1a,#f2d21b,#9bd22e,#2fa84f)' }} />
        better
        <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'rgb(38,38,38)' }} />
        not asked
      </div>
      {selected && (
        <div className="mt-2 rounded-lg border border-cyan-300/40 bg-cyan-400/5 p-3" data-testid="heat-tile-detail">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-theme-text">{selected.label}</p>
            <span className={`text-[11px] ${STATE_LABEL[selected.state].cls}`}>● {STATE_LABEL[selected.state].text}</span>
          </div>
          <p className="mt-0.5 text-xs text-theme-text-muted">{evidenceLine(selected)}</p>
          <p className="mt-0.5 text-xs text-theme-text-muted" data-testid="heat-tile-last-mistake">
            {lastMistake !== null ? `Last mistake: ${relativeDay(lastMistake, now)}.` : 'No mistake on record.'}
          </p>
          <div className="mt-2.5 flex gap-2">
            {selectedHole && (
              <button
                onClick={() => practice(selectedHole)}
                className="flex-1 rounded-lg border border-cyan-300 bg-cyan-400/15 px-2 py-2 text-xs font-black uppercase tracking-wide text-cyan-100 shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                data-testid="heat-tile-practice"
              >
                Practice your positions
              </button>
            )}
            <button
              onClick={() => drill(selected, selectedThemes)}
              className="flex-1 rounded-lg border border-theme-border px-2 py-2 text-xs font-black uppercase tracking-wide text-theme-text"
              data-testid="heat-tile-drill"
            >
              {selectedThemes.length > 0 ? 'Drill puzzles' : 'Learn it'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
