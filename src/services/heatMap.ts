/**
 * heatMap — the student's skills as RED / GREEN / GREY, the thing the
 * Foundation says the app is going toward (CLAUDE.md § THE HEAT MAP) and that
 * no screen showed until 2026-10-01 (David: "Does weakness tab show the users
 * heatmap?" — it did not; green lived only inside the coach's brain).
 *
 * PURE: two reads in, one verdict per skill out. No second "proven" bar —
 * GREEN is `capabilityProven`, the one definition every consumer reads.
 *
 *   GREEN — proven held (the board asked and the student answered, across
 *           games). Wins over an old open hole: proof is newer than the slip
 *           it outlived, and the coach already goes quiet on it.
 *   RED   — an open hole in the weakness spine, or a recent break with no held
 *           streak since.
 *   GREY  — not proven either way: never asked, or answered but not yet
 *           across enough games. NOT mastered (absent ≠ silent) — shown as
 *           "not tested yet" or "being tested", never as good news.
 *
 * `progress` is honest partial credit toward green (held streak / the bar),
 * so a red tile can show it is on its way without claiming it has arrived.
 */
import { MISCONCEPTION_TAGS, type MisconceptionTagId } from '../data/misconceptionTags';
import {
  capabilityProven, HELD_FOR_PROVEN, PROVEN_MIN_GAMES,
  type CapabilityProfile,
} from './capabilityEvidence';

export type HeatState = 'red' | 'green' | 'grey';

export interface HeatTile {
  tag: MisconceptionTagId;
  label: string;
  state: HeatState;
  /** Open slips in the weakness spine for this skill. */
  openCount: number;
  held: number;
  broken: number;
  heldStreak: number;
  streakGames: number;
  /** 0..1 toward green; 1 only when green. */
  progress: number;
}

export interface OpenHole {
  capabilityTag: MisconceptionTagId | null;
  openCount: number;
}

export function heatMap(profile: CapabilityProfile, holes: readonly OpenHole[]): HeatTile[] {
  const open = new Map<string, number>();
  for (const h of holes) {
    if (!h.capabilityTag || h.openCount <= 0) continue;
    open.set(h.capabilityTag, (open.get(h.capabilityTag) ?? 0) + h.openCount);
  }
  // `other` is the catch-all review queue, not a skill — never a tile.
  return MISCONCEPTION_TAGS
    .filter((t) => t.bucket !== 'uncategorized')
    .map((t) => {
      const tag: MisconceptionTagId = t.id;
      const e = profile.get(tag);
      const openCount = open.get(tag) ?? 0;
      const green = capabilityProven(e);
      // Held but not yet proven is NOT failing: it stays grey, with progress
      // toward green. Red is only an open hole or a fresh break.
      const state: HeatState = green
        ? 'green'
        : openCount > 0 || (!!e && e.broken > 0 && e.heldStreak === 0)
          ? 'red'
          : 'grey';
      return {
        tag,
        label: t.label,
        state,
        openCount,
        held: e?.held ?? 0,
        broken: e?.broken ?? 0,
        heldStreak: e?.heldStreak ?? 0,
        streakGames: e?.streakGames ?? 0,
        // Both halves of the bar: the held streak AND the distinct games.
        progress: green ? 1 : Math.min(0.95,
          (e?.heldStreak ?? 0) / HELD_FOR_PROVEN,
          (e?.streakGames ?? 0) / PROVEN_MIN_GAMES),
      };
    });
}

/** Tags green NOW that were not in `before` — the "Fixed" moments. */
export function newlyGreen(tiles: readonly HeatTile[], before: ReadonlySet<string>): HeatTile[] {
  return tiles.filter((t) => t.state === 'green' && !before.has(t.tag));
}
