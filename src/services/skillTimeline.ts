/**
 * skillTimeline — the heat map over TIME (David 2026-10-02: "I want it colored
 * red to green … more of a fade"). For every skill, one cell per week: how the
 * student did when that skill came up.
 *
 * PURE: rows in, cells out. The two signals are the ones the heat map already
 * reads, never a third:
 *   MISS — a slip filed under the skill (`misconceptionTags`, counted rows), or
 *          a `broken` answer when the board asked (`capabilityEvidence`).
 *   HELD — a `held` answer, UNPROMPTED (a told answer proves nothing — the same
 *          rule `summariseEvidence` applies).
 * A week's score is held / (held + miss). A week with neither is NULL — the
 * board never asked, which is not good news and is never drawn as green.
 *
 * DATES ARE THE GAME'S, not the record's. A library imported in one sitting
 * files every slip on the import day; dated by `createdAt` the whole history
 * would land in one column. The source game's played date is the honest week;
 * the record date is the fallback only when there is no game.
 */
import type { MisconceptionTagId } from '../data/misconceptionTags';

export const TIMELINE_WEEKS = 26;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface SlipRow {
  tag: string;
  createdAt: number;
  sourceGameId?: string;
  counted?: boolean;
}

export interface EvidenceRow {
  tag: string;
  outcome: 'held' | 'broken';
  recordedAt: number;
  prompted: boolean;
  sourceGameId?: string;
}

export interface WeekCell {
  held: number;
  missed: number;
  /** 0 (all missed) … 1 (all held); null when the skill never came up. */
  score: number | null;
}

export interface SkillTimeline {
  tag: MisconceptionTagId;
  /** Oldest week first; the last cell is the current week. */
  weeks: WeekCell[];
  /** When the student last made this mistake (ms), null if never. */
  lastMistakeAt: number | null;
}

/** A game's `date` → ms. Accepts `YYYY-MM-DD` and the PGN `YYYY.MM.DD`;
 *  anything unparseable (`????.??.??`) is null, never "today". */
export function parseGameDate(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = /^(\d{4})[.-](\d{2})[.-](\d{2})/.exec(raw);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? t : null;
}

export function buildSkillTimelines(
  tags: readonly MisconceptionTagId[],
  slips: readonly SlipRow[],
  evidence: readonly EvidenceRow[],
  gameDates: ReadonlyMap<string, number>,
  now: number,
  weeks: number = TIMELINE_WEEKS,
): SkillTimeline[] {
  const when = (fallback: number, gameId?: string): number =>
    (gameId ? gameDates.get(gameId) : undefined) ?? fallback;
  // Week 0 is the oldest; week `weeks - 1` ends at `now`.
  const weekOf = (t: number): number => weeks - 1 - Math.floor((now - t) / WEEK_MS);

  const byTag = new Map<string, SkillTimeline>();
  for (const tag of tags) {
    byTag.set(tag, {
      tag,
      weeks: Array.from({ length: weeks }, () => ({ held: 0, missed: 0, score: null })),
      lastMistakeAt: null,
    });
  }

  const miss = (tag: string, t: number): void => {
    const row = byTag.get(tag);
    if (!row) return;
    if (row.lastMistakeAt === null || t > row.lastMistakeAt) row.lastMistakeAt = t;
    const w = weekOf(t);
    if (w >= 0 && w < weeks) row.weeks[w].missed++;
  };

  for (const s of slips) {
    if (s.counted === false) continue;
    miss(s.tag, when(s.createdAt, s.sourceGameId));
  }
  for (const e of evidence) {
    if (e.prompted) continue;
    const t = when(e.recordedAt, e.sourceGameId);
    if (e.outcome === 'broken') { miss(e.tag, t); continue; }
    const row = byTag.get(e.tag);
    const w = weekOf(t);
    if (row && w >= 0 && w < weeks) row.weeks[w].held++;
  }

  for (const row of byTag.values()) {
    for (const c of row.weeks) {
      const n = c.held + c.missed;
      c.score = n > 0 ? c.held / n : null;
    }
  }
  return tags.map((t) => byTag.get(t) as SkillTimeline);
}

/** "today" / "yesterday" / "5 days ago" / "3 weeks ago" / "Mar 4". */
export function relativeDay(t: number, now: number): string {
  const days = Math.floor((now - t) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
