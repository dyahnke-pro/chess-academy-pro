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
import { MISCONCEPTION_TAGS, isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';
import { isMisconceptionDue, slipWeight } from './misconceptionService';
import { isFixtureDerived } from './fixtureGames';
import {
  summariseEvidence, EVIDENCE_READING,
  type CapabilityEvidenceRecord, type EvidenceReading,
} from './capabilityEvidence';

export type HeatState = 'red' | 'short' | 'green' | 'grey';

/** The last N times the board posed the skill. */
export const HOLD_WINDOW = 20;
/** Posed at least this often before a skill can be anything but grey. */
export const HOLD_MIN_POSED = 8;
export const HOLD_GREEN = 0.9;
export const HOLD_SHORT = 0.75;

export interface HoldRecord {
  /** Times posed inside the window (≤ HOLD_WINDOW). */
  posed: number;
  held: number;
  /** Missed — each miss counts once, whatever its grade. */
  missed: number;
  /** held / posed over the window; null when nothing was posed. */
  rate: number | null;
}

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

/** Rows that are not a game slip: a lesson tap is the KNOW reading (its own
 *  tile, `knowLine`), and a missed Lichess puzzle is not the student's game. */
const NOT_A_GAME_SLIP = new Set(['lesson', 'puzzle']);

/** The state from a hold record — the ONE rule. */
export function holdState(h: HoldRecord): HeatState {
  if (h.posed < HOLD_MIN_POSED || h.rate === null) return 'grey';
  if (h.rate >= HOLD_GREEN) return 'green';
  return h.rate >= HOLD_SHORT ? 'short' : 'red';
}

/** Game + ply: the board, side, castling, en passant and move number. Two
 *  records of one move share it; the halfmove clock is dropped. */
function plyKey(fen: string): string {
  const p = fen.split(' ');
  return `${p[0]} ${p[1] ?? ''} ${p[2] ?? ''} ${p[3] ?? ''} ${p[5] ?? ''}`;
}

function plyOrdinal(fen: string): number {
  const p = fen.split(' ');
  return (Number(p[5]) || 0) * 2 + (p[1] === 'b' ? 1 : 0);
}

function isGameSlip(r: MisconceptionTagRecord): boolean {
  return !NOT_A_GAME_SLIP.has(r.source) && !isFixtureDerived(r)
    && isMisconceptionTagId(r.tag) && r.tag !== 'other';
}

interface PosedEvent { held: boolean; time: number; ply: number }

/**
 * Every skill's hold record, from both halves of the record.
 *
 * ORDER is the GAME's, not the clock's: an imported game's slip is stamped when
 * it was ANALYSED, its evidence when the game was PLAYED, so ordering by the
 * row's own time would file every slip after every held answer. A game's time
 * is the earliest evidence time recorded for it (else the earliest slip time),
 * and events inside a game run in ply order.
 */
export function holdRecords(
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  reading: EvidenceReading = 'use',
): Map<MisconceptionTagId, HoldRecord> {
  const ev = evidence.filter((r) =>
    ((EVIDENCE_READING as Partial<Record<string, EvidenceReading>>)[r.origin] ?? 'use') === reading
    && !r.prompted && isMisconceptionTagId(r.tag) && r.tag !== 'other');
  // Slips are game evidence: they belong to the USE reading only.
  const sl = reading === 'use' ? slips.filter(isGameSlip) : [];
  const gameTime = new Map<string, number>();
  const stamp = (g: string | undefined, t: number): void => {
    if (g && !(t >= (gameTime.get(g) ?? Infinity))) gameTime.set(g, t);
  };
  for (const r of ev) stamp(r.sourceGameId, r.recordedAt);
  const evGames = new Set(gameTime.keys());
  for (const r of sl) if (r.sourceGameId && !evGames.has(r.sourceGameId)) stamp(r.sourceGameId, r.createdAt);
  const timeOf = (g: string | undefined, own: number): number => (g ? gameTime.get(g) ?? own : own);

  const events = new Map<MisconceptionTagId, PosedEvent[]>();
  const push = (tag: MisconceptionTagId, e: PosedEvent): void => {
    const l = events.get(tag) ?? [];
    l.push(e);
    events.set(tag, l);
  };
  const brokenAt = new Set<string>();
  for (const r of ev) {
    if (r.outcome === 'broken') brokenAt.add(`${r.tag}|${r.sourceGameId ?? ''}|${plyKey(r.fen)}`);
    push(r.tag, { held: r.outcome === 'held', time: timeOf(r.sourceGameId, r.recordedAt), ply: plyOrdinal(r.fen) });
  }
  for (const r of sl) {
    // A miss is counted ONCE: the broken row already said it.
    if (brokenAt.has(`${r.tag}|${r.sourceGameId ?? ''}|${plyKey(r.fen)}`)) continue;
    push(r.tag as MisconceptionTagId, { held: false, time: timeOf(r.sourceGameId, r.createdAt), ply: plyOrdinal(r.fen) });
  }
  const out = new Map<MisconceptionTagId, HoldRecord>();
  for (const [tag, l] of events) {
    l.sort((a, b) => a.time - b.time || a.ply - b.ply);
    const w = l.slice(-HOLD_WINDOW);
    const held = w.filter((e) => e.held).length;
    out.set(tag, { posed: w.length, held, missed: w.length - held, rate: w.length > 0 ? held / w.length : null });
  }
  return out;
}

const NEVER_POSED: HoldRecord = { posed: 0, held: 0, missed: 0, rate: null };

/**
 * THE HEAT MAP READS EVERY SLIP (David 2026-10-13: "my heat map is not filling
 * in. Despite having 300 games analyzed") — the rows themselves, never the
 * counted-only weakness list, so an imported game's slips count.
 */
export function heatMap(
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  opts: { now?: number; reading?: EvidenceReading } = {},
): HeatTile[] {
  const now = opts.now ?? Date.now();
  const reading = opts.reading ?? 'use';
  const profile = summariseEvidence([...evidence], {}, reading);
  const holds = holdRecords(evidence, slips, reading);
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
      const hold = holds.get(tag) ?? NEVER_POSED;
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
