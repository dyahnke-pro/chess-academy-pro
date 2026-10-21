// holdRate — THE ONE GREEN (David 2026-10-19, "Agreed"; the lead's calls
// 2026-10-20). A skill's state is how often the student HELD it over the last
// `HOLD_WINDOW` times the board POSED it:
//
//   GREEN — ≥ 90% held, with at least 8 posed;
//   SHORT — 75–89%: nearly held (the coach says it in one short line);
//   RED   — under 75%: the full lesson;
//   GREY  — fewer than 8 posed. Grey TEACHES.
//
// Both halves of the record are one record: a held/broken capability-evidence
// row, and a recorded slip. ONE MOVE POSES A SKILL ONCE, whichever writers saw
// it (WO-LEARN-FOCUS-01): every row and slip of one game + board + skill is ONE
// event — a miss if any of them missed, steered if any was. An inaccuracy slip
// is half a miss (`slipWeight`, David's locked rule). Events run in the order
// they were PLAYED: evidence is dated by its game, a slip by its game's
// `playedAt` (a live slip's `createdAt` is the moment it happened).
//
// PROMPTED IS EXCLUDED BOTH WAYS (WO-LEARN-FOCUS-01, the root fix). A find the
// coach announced never counted (`summariseEvidence` drops a prompted row) —
// but a MISS at that same moment did, because a slip carried no prompted flag.
// So any question the coach asked could only lower the score. A prompted slip
// is still a real mistake for drills; it is just not a measurement.
//
// A STEERED hold — the coach steered the game into the question — counts half:
// a situation the coach built for the student is easier than one the game
// threw up. A steered miss counts in full.
//
// Every reader of "proven" — the heat map, the fade, the threat voice, the
// need score, the ranker boost — reads `holdState` through
// `capabilityProven`. There is no second definition.
import { isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';
import { slipWeight } from './misconceptionService';
import { isFixtureDerived } from './fixtureGames';
import { plyOfFen } from '../utils/plyOfFen';

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
  /** Held, by weight: a steered hold is `STEERED_HOLD_WEIGHT`. The rate reads
   *  this; `held` stays the count a sentence can say. */
  heldWeight: number;
  /** Missed, by weight: an inaccuracy slip is half a miss. */
  missed: number;
  /** heldWeight / (heldWeight + missed) over the window, where a steered hold
   *  weighs `STEERED_HOLD_WEIGHT`; null when nothing was posed. */
  rate: number | null;
}

export const NEVER_POSED: HoldRecord = { posed: 0, held: 0, heldWeight: 0, missed: 0, rate: null };

/** What a steered hold is worth against an unsteered one. */
export const STEERED_HOLD_WEIGHT = 0.5;

/** The state from a hold record — the ONE rule. */
export function holdState(h: HoldRecord | undefined): HeatState {
  if (!h || h.posed < HOLD_MIN_POSED || h.rate === null) return 'grey';
  if (h.rate >= HOLD_GREEN) return 'green';
  return h.rate >= HOLD_SHORT ? 'short' : 'red';
}

/** The fields of an answer row the hold rate reads. */
interface PosedRow {
  tag: MisconceptionTagId;
  outcome: 'held' | 'broken';
  fen: string;
  recordedAt: number;
  sourceGameId?: string;
  /** The coach steered the game into this question (`CapabilityEvidenceRecord.steered`). */
  steered?: true;
}

/** Rows that are not a game slip: a lesson tap is the KNOW reading, and a
 *  missed Lichess puzzle is not the student's game. */
const NOT_A_GAME_SLIP = new Set(['lesson', 'puzzle']);

export function isGameSlip(r: MisconceptionTagRecord): boolean {
  return !NOT_A_GAME_SLIP.has(r.source) && !isFixtureDerived(r)
    && isMisconceptionTagId(r.tag) && r.tag !== 'other';
}

/** Game + ply + skill: two records of one move on one skill share it. The
 *  halfmove clock is dropped. */
function moveKey(tag: string, game: string | undefined, fen: string): string {
  const p = fen.split(' ');
  return `${tag}|${game ?? ''}|${p[0]} ${p[1] ?? ''} ${p[2] ?? ''} ${p[3] ?? ''} ${p[5] ?? ''}`;
}

/** When a slip was played: its game's date (+ ply), else the moment it was
 *  logged (a live game's slip is logged as it happens). */
function slipPlayedAt(r: Pick<MisconceptionTagRecord, 'playedAt' | 'createdAt'>): number {
  return r.playedAt ?? r.createdAt;
}

interface PosedEvent { held: boolean; miss: number; steered: boolean; time: number; ply: number }

/**
 * Every skill's hold record. `rows` are the answer rows of ONE reading,
 * unprompted (the caller filters — `summariseEvidence`); `slips` are game
 * slips and belong to the USE reading only. A prompted slip is skipped here.
 */
export function holdRecords(
  rows: readonly PosedRow[],
  slips: readonly MisconceptionTagRecord[],
): Map<MisconceptionTagId, HoldRecord> {
  const events = new Map<MisconceptionTagId, PosedEvent[]>();
  /** One event per game + board + skill. A row with no game (a puzzle, a
   *  drill) is its own event, as before. */
  const byMove = new Map<string, PosedEvent>();
  const push = (tag: MisconceptionTagId, key: string | null, e: PosedEvent): void => {
    const seen = key ? byMove.get(key) : undefined;
    if (seen) {
      // The same move, read by another writer: a miss wins, the bigger miss
      // weight stands, steered sticks, the earliest time orders it.
      seen.held = seen.held && e.held;
      seen.miss = Math.max(seen.miss, e.miss);
      seen.steered = seen.steered || e.steered;
      seen.time = Math.min(seen.time, e.time);
      return;
    }
    if (key) byMove.set(key, e);
    const l = events.get(tag) ?? [];
    l.push(e);
    events.set(tag, l);
  };
  for (const r of rows) {
    if (r.tag === 'other') continue;
    push(r.tag, r.sourceGameId ? moveKey(r.tag, r.sourceGameId, r.fen) : null,
      { held: r.outcome === 'held', miss: r.outcome === 'held' ? 0 : 1, steered: !!r.steered, time: r.recordedAt, ply: plyOfFen(r.fen) });
  }
  for (const r of slips) {
    if (!isGameSlip(r) || r.prompted) continue;
    push(r.tag as MisconceptionTagId, r.sourceGameId ? moveKey(r.tag, r.sourceGameId, r.fen) : null,
      { held: false, miss: slipWeight(r), steered: false, time: slipPlayedAt(r), ply: plyOfFen(r.fen) });
  }
  const out = new Map<MisconceptionTagId, HoldRecord>();
  for (const [tag, l] of events) {
    l.sort((a, b) => a.time - b.time || a.ply - b.ply);
    const w = l.slice(-HOLD_WINDOW);
    const held = w.filter((e) => e.held).length;
    const heldWeight = w.reduce((s, e) => s + (e.held ? (e.steered ? STEERED_HOLD_WEIGHT : 1) : 0), 0);
    const missed = w.reduce((s, e) => s + e.miss, 0);
    out.set(tag, { posed: w.length, held, heldWeight, missed, rate: heldWeight + missed > 0 ? heldWeight / (heldWeight + missed) : null });
  }
  return out;
}
