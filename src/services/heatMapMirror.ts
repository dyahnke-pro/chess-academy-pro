/**
 * heatMapMirror — the student's heat map, as PostHog sees it (David
 * 2026-10-18: "Mirror the heat map to PostHog" — so a question about why a
 * tile is grey is answered from the data, not by asking the student to look).
 *
 * One event, `heat_map_state`: the three counts, which skills are red and
 * green, and every tile's own numbers. Sent when the map CHANGES, and at most
 * once a day otherwise, so a home screen opened ten times sends one row.
 */
import { db } from '../db/schema';
import { captureEvent } from './analytics';
import type { HeatTile } from './heatMap';

const KEY = 'heat_map_mirror_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export function heatMapEventProps(tiles: readonly HeatTile[]): Record<string, unknown> {
  const by = (s: HeatTile['state']): HeatTile[] => tiles.filter((t) => t.state === s);
  return {
    green: by('green').length,
    red: by('red').length,
    grey: by('grey').length,
    red_tags: by('red').map((t) => t.tag).join(','),
    green_tags: by('green').map((t) => t.tag).join(','),
    open_slips: tiles.reduce((n, t) => n + t.openCount, 0),
    tiles: JSON.stringify(tiles.map((t) => ({ tag: t.tag, s: t.state, open: t.openCount, held: t.held, broken: t.broken, streak: t.heldStreak, games: t.streakGames }))),
  };
}

export async function mirrorHeatMap(tiles: readonly HeatTile[], now: number = Date.now()): Promise<boolean> {
  if (tiles.length === 0) return false;
  const props = heatMapEventProps(tiles);
  const sig = String(props.tiles);
  try {
    const last = await db.meta.get(KEY);
    const prev = last ? (JSON.parse(last.value) as { sig: string; at: number }) : null;
    if (prev && prev.sig === sig && now - prev.at < DAY_MS) return false;
    captureEvent('heat_map_state', props);
    await db.meta.put({ key: KEY, value: JSON.stringify({ sig, at: now }) });
    return true;
  } catch { return false; }
}
