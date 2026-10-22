/**
 * heatMap — the student's skills as RED / SHORT / GREEN / GREY, the thing the
 * Foundation says the app is going toward (CLAUDE.md § THE HEAT MAP).
 *
 * ONE COMPUTER, THE HOLD RATE (David 2026-10-19, "Agreed"). A skill's state is
 * how often the student HELD it over the last `HOLD_WINDOW` times the board
 * POSED it. Both halves of the record count as one: a held/broken
 * capability-evidence row, and a recorded slip — and a miss is counted ONCE
 * (a `broken` row and a slip on the same game + ply + skill are one miss).
 *
 *   GREEN — ≥ 90% held over the last 20, with at least 8 posed.
 *   SHORT — 75–89%: nearly held; the coach says it in one short line.
 *   RED   — under 75%: the full lesson.
 *   GREY  — fewer than 8 posed: not proven either way. Grey TEACHES.
 *
 * This REPLACES "green wins over open slips": David's record held 1,428 open
 * hung-material slips while its streak said proven. The heat map, the fade and
 * the threat voice all read this one state.
 */
import { MISCONCEPTION_TAGS, type MisconceptionTagId } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';
import { isMisconceptionDue, slipWeight } from './misconceptionService';
import { summariseEvidence, type CapabilityEvidenceRecord, type CapabilityProfile, type EvidenceReading } from './capabilityEvidence';
import {
  holdState, isGameSlip, NEVER_POSED, HOLD_GREEN, HOLD_MIN_POSED,
  type HeatState, type HoldRecord,
} from './holdRate';

export type { HeatState, HoldRecord } from './holdRate';
export { holdRecords, holdState, HOLD_WINDOW, HOLD_MIN_POSED } from './holdRate';

export interface HeatTile {
  tag: MisconceptionTagId;
  label: string;
  state: HeatState;
  /** The hold rate that decided the state. */
  hold: HoldRecord;
  /** Open slips in the weakness spine for this skill. */
  openCount: number;
  /** Their WEIGHT (an inaccuracy is half a slip, `slipWeight`). */
  openWeight: number;
  held: number;
  broken: number;
  heldStreak: number;
  streakGames: number;
  /** 0..1 toward green; 1 only when green. */
  progress: number;
}

/**
 * THE HEAT MAP READS EVERY SLIP (David 2026-10-13: "my heat map is not filling
 * in. Despite having 300 games analyzed") — the rows themselves, never the
 * counted-only weakness list, so an imported game's slips count. The state is
 * the profile's hold rate (`holdRate`, read through `summariseEvidence`) — the
 * same one `capabilityProven` reads.
 */
export function heatMap(
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  /** `profile`: the summary of these same rows at the shipped bar, when the
   *  caller already built it (`studentRecordFrom`) — a second walk of the
   *  whole record for the same answer was half the cost of every rebuild. */
  opts: { now?: number; reading?: EvidenceReading; profile?: CapabilityProfile } = {},
): HeatTile[] {
  const now = opts.now ?? Date.now();
  const reading = opts.reading ?? 'use';
  const profile = opts.profile ?? summariseEvidence(evidence, slips, {}, reading);
  const open = new Map<string, number>();
  const weight = new Map<string, number>();
  if (reading === 'use') {
    for (const r of slips) {
      if (!isGameSlip(r) || !isMisconceptionDue(r, now)) continue;
      open.set(r.tag, (open.get(r.tag) ?? 0) + 1);
      weight.set(r.tag, (weight.get(r.tag) ?? 0) + slipWeight(r));
    }
  }
  // `other` is the catch-all review queue, not a skill — never a tile.
  return MISCONCEPTION_TAGS
    .filter((t) => t.bucket !== 'uncategorized')
    .map((t) => {
      const tag: MisconceptionTagId = t.id;
      const e = profile.get(tag);
      const hold = e?.hold ?? NEVER_POSED;
      const state = holdState(hold);
      return {
        tag,
        label: t.label,
        state,
        hold,
        openCount: open.get(tag) ?? 0,
        openWeight: weight.get(tag) ?? 0,
        held: e?.held ?? 0,
        broken: e?.broken ?? 0,
        heldStreak: e?.heldStreak ?? 0,
        streakGames: e?.streakGames ?? 0,
        // Both halves of the bar: the rate toward 90% AND the posed count toward 8.
        progress: state === 'green' ? 1 : Math.min(0.95,
          (hold.rate ?? 0) / HOLD_GREEN,
          hold.posed / HOLD_MIN_POSED),
      };
    });
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
