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
import { MISCONCEPTION_TAGS, isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';
import { isMisconceptionDue } from './misconceptionService';
import { isFixtureDerived } from './fixtureGames';
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

/** Rows that are not a game slip: a lesson tap is the KNOW reading (its own
 *  tile, `knowLine`), and a missed Lichess puzzle is not the student's game. */
const NOT_A_GAME_SLIP = new Set(['lesson', 'puzzle']);

/**
 * THE HEAT MAP READS EVERY SLIP (David 2026-10-13: "my heat map is not filling
 * in. Despite having 300 games analyzed"). It used to read the ranked weakness
 * list, whose tag rows are COUNTED rows only — and batch analysis writes every
 * imported game's slips `counted: false` until the student reviews that game,
 * a guard against double-counting the TALLY. The heat map is not a tally; it
 * is the state of each skill. So a skill failed in 50 imported games read GREY
 * ("never asked") — the one reading the Foundation says it must never be.
 * Taking the rows themselves makes the counted-only view impossible to pass.
 */
export function heatMap(profile: CapabilityProfile, slips: readonly MisconceptionTagRecord[], now: number = Date.now()): HeatTile[] {
  const open = new Map<string, number>();
  for (const r of slips) {
    if (NOT_A_GAME_SLIP.has(r.source) || isFixtureDerived(r)) continue;
    if (!isMisconceptionTagId(r.tag) || r.tag === 'other') continue;
    // The one definition of "open" the weakness spine uses: due today.
    if (!isMisconceptionDue(r, now)) continue;
    open.set(r.tag, (open.get(r.tag) ?? 0) + 1);
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

/** THE OTHER HALF OF A TILE (plan "the heat map shows both: known / used").
 *  A tile is read off the student's GAMES; this line says what the LESSONS
 *  say about the same skill, from the KNOW reading's own tile. When lessons
 *  prove it and games do not, that gap is named — it is the signal the coach
 *  acts on (drill the habit in play, not another lesson). Null when there is
 *  no lesson tile for the tag. */
export function knowLine(know: HeatTile | undefined, use: HeatTile): string | null {
  if (!know) return null;
  if (know.state === 'green') {
    return use.state === 'green'
      ? 'In lessons: proven — and your games show it too.'
      : 'In lessons: proven. In your games it has not shown yet — that is a habit to drill in play.';
  }
  if (know.held + know.broken === 0) return 'In lessons: not asked yet.';
  return `In lessons: ${know.held} right, ${know.broken} missed.`;
}
