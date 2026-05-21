// Training Plan "Today's reps" selector (David 2026-05-21). The
// masterclass TEACHES; the plan DRILLS. It turns the weakness-tag bucket
// + your repertoire into a small, prioritised daily feed — weighted
// SHARES, not a strict gate, so it advises while you stay free to browse
// the full menu. Weakness-first → SRS-due → new lines; new lines get the
// FEWEST slots and never count against you until learned.

import type { MisconceptionAggregate } from './misconceptionService';

export type RepKind = 'weakness' | 'srs' | 'new';

export interface RepCandidate {
  kind: RepKind;
  /** Stable key for React + dedupe. */
  key: string;
  label: string;
  subtitle: string;
  /** Present for weakness reps — the closed-set tag id ('other' too). */
  tag?: string;
  /** Present for srs / new reps — the opening to drill. */
  openingId?: string;
}

export interface BuildTodaysRepsInput {
  /** Ranked, already-aggregated misconceptions (open first). */
  weaknesses: MisconceptionAggregate[];
  /** Openings with SRS reviews due today. */
  srsDue: { openingId: string; name: string }[];
  /** Repertoire lines not yet learned (low-pressure, fewest slots). */
  newLines: { openingId: string; name: string }[];
  /** Size of the daily feed. Default 5. */
  total?: number;
}

const DEFAULT_TOTAL = 5;
// Weighted shares of the feed. Weakness-heavy; new gets the remainder.
const WEAKNESS_SHARE = 0.6;
const SRS_SHARE = 0.2;

function timesPhrase(n: number): string {
  if (n <= 1) return 'once';
  return `${n}×`;
}

function weaknessRep(w: MisconceptionAggregate, rank: number): RepCandidate {
  const lead = rank === 0 ? 'Your top error' : 'A recurring error';
  return {
    kind: 'weakness',
    key: `weakness:${w.tag}:${w.label}`,
    label: w.label,
    subtitle: `${lead} — seen ${timesPhrase(w.openCount)}.`,
    tag: w.tag,
  };
}

/** Build today's prioritised reps. Fills weakness/SRS/new to their
 *  weighted shares, then backfills any unused slots by priority
 *  (weakness → SRS → new) so a thin category never wastes the feed. */
export function buildTodaysReps(input: BuildTodaysRepsInput): RepCandidate[] {
  const total = input.total ?? DEFAULT_TOTAL;
  if (total <= 0) return [];

  const openWeaknesses = input.weaknesses.filter((w) => w.openCount > 0);

  const weaknessPool: RepCandidate[] = openWeaknesses.map((w, i) => weaknessRep(w, i));
  const srsPool: RepCandidate[] = input.srsDue.map((o) => ({
    kind: 'srs' as const,
    key: `srs:${o.openingId}`,
    label: o.name,
    subtitle: 'Spaced review due today.',
    openingId: o.openingId,
  }));
  const newPool: RepCandidate[] = input.newLines.map((o) => ({
    kind: 'new' as const,
    key: `new:${o.openingId}`,
    label: o.name,
    subtitle: 'A new line to learn — no pressure yet.',
    openingId: o.openingId,
  }));

  // Desired slots per category (weakness gets the rounding remainder).
  const srsSlots = Math.round(total * SRS_SHARE);
  const weaknessSlots = Math.max(0, Math.round(total * WEAKNESS_SHARE));
  const newSlots = Math.max(0, total - weaknessSlots - srsSlots);

  const picked: RepCandidate[] = [];
  const take = (pool: RepCandidate[], n: number): void => {
    for (let i = 0; i < n && pool.length > 0 && picked.length < total; i++) {
      picked.push(pool.shift() as RepCandidate);
    }
  };

  take(weaknessPool, weaknessSlots);
  take(srsPool, srsSlots);
  take(newPool, newSlots);

  // Backfill leftover slots by priority so the feed is never short when a
  // category had fewer items than its share.
  take(weaknessPool, total);
  take(srsPool, total);
  take(newPool, total);

  return picked;
}
