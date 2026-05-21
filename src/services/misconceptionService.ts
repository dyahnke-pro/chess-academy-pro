// The misconception-tag engine — the shared bucket behind the weakness
// loop (David 2026-05-21). Three faucets write here (Discussion Practice
// live games, Game Review, import-time auto-analysis); the Training Plan
// reads here to prioritise drills. The taxonomy is the closed set in
// data/misconceptionTags.ts — this module never invents tags, it only
// stores, aggregates, and maps them to drills.

import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import type {
  MisconceptionTagRecord,
  MisconceptionSource,
} from '../types';
import {
  MISCONCEPTION_TAGS,
  getMisconceptionTag,
  isMisconceptionTagId,
  type MisconceptionTagDef,
  type MisconceptionDrillKind,
} from '../data/misconceptionTags';

/** SRS spacing intervals (ms) indexed by masteryHits level. A misconception
 *  NEVER graduates out (David 2026-05-21: "it should never graduate out!
 *  just reduce the amount of times you see it"). Each success lengthens the
 *  interval; a miss snaps it back so you see it sooner. Level 0 = due now. */
export const SRS_INTERVALS_MS: readonly number[] = [
  0, // 0 — due immediately (fresh capture or just missed)
  1 * 24 * 60 * 60 * 1000, // 1 — 1 day
  3 * 24 * 60 * 60 * 1000, // 2 — 3 days
  7 * 24 * 60 * 60 * 1000, // 3 — 1 week
  16 * 24 * 60 * 60 * 1000, // 4 — ~2 weeks
  35 * 24 * 60 * 60 * 1000, // 5+ — ~5 weeks (cap)
];

const MAX_SRS_LEVEL = SRS_INTERVALS_MS.length - 1;
/** A miss drops the level back this far so the instance resurfaces soon. */
const MISS_LEVEL_DROP = 2;

/** Spacing interval (ms) for a given level, capped at the longest. */
function intervalForLevel(level: number): number {
  const i = Math.min(Math.max(level, 0), MAX_SRS_LEVEL);
  return SRS_INTERVALS_MS[i];
}

/** True when an instance is due to resurface. A missing dueAt (fresh capture
 *  or a legacy row from the old graduate-out model) counts as due — that's
 *  what guarantees nothing ever drops out of the loop permanently. */
export function isMisconceptionDue(rec: MisconceptionTagRecord, now: number = Date.now()): boolean {
  return rec.dueAt == null || rec.dueAt <= now;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface LogMisconceptionInput {
  tag: string;
  source: MisconceptionSource;
  fen: string;
  customLabel?: string;
  playedSan?: string;
  bestSan?: string;
  cpLoss?: number;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  userReason?: string;
  coachNote?: string;
  sourceGameId?: string;
}

/** Persist one tagged misconception. Rejects a tag outside the closed
 *  set (an LLM hallucination guard) and requires a customLabel when the
 *  tag is the 'other' catch-all. Returns the stored record, or null
 *  when the input fails validation. */
export async function logMisconception(
  input: LogMisconceptionInput,
): Promise<MisconceptionTagRecord | null> {
  if (!isMisconceptionTagId(input.tag)) return null;
  if (input.tag === 'other' && !input.customLabel?.trim()) return null;

  const record: MisconceptionTagRecord = {
    id: newId(),
    tag: input.tag,
    customLabel: input.tag === 'other' ? input.customLabel?.trim() : undefined,
    source: input.source,
    createdAt: Date.now(),
    fen: input.fen,
    playedSan: input.playedSan,
    bestSan: input.bestSan,
    cpLoss: input.cpLoss,
    gamePhase: input.gamePhase,
    moveNumber: input.moveNumber,
    openingId: input.openingId,
    openingName: input.openingName,
    userReason: input.userReason?.trim() || undefined,
    coachNote: input.coachNote?.trim() || undefined,
    sourceGameId: input.sourceGameId,
    status: 'open',
    masteryHits: 0,
    dueAt: Date.now(), // due immediately on first capture
  };
  await db.misconceptionTags.add(record);
  void logAppAudit({
    kind: 'misconception-captured',
    category: 'subsystem',
    source: `misconceptionService.logMisconception:${input.source}`,
    summary: `tag=${record.tag} bucket=${getMisconceptionTag(record.tag)?.bucket ?? 'uncategorized'} cpLoss=${record.cpLoss ?? 'n/a'} phase=${record.gamePhase ?? 'n/a'}`,
    fen: record.fen,
    details: JSON.stringify({
      tag: record.tag,
      customLabel: record.customLabel,
      source: record.source,
      playedSan: record.playedSan,
      bestSan: record.bestSan,
      openingName: record.openingName,
      sourceGameId: record.sourceGameId,
    }),
  });
  return record;
}

export async function getAllMisconceptions(): Promise<MisconceptionTagRecord[]> {
  return db.misconceptionTags.toArray();
}

/** True when this game has already been tagged — guards Game Review /
 *  auto-analysis against double-logging the same game's blunders. */
export async function hasMisconceptionsForGame(gameId: string): Promise<boolean> {
  const n = await db.misconceptionTags.where('sourceGameId').equals(gameId).count();
  return n > 0;
}

export interface MisconceptionAggregate {
  tag: string;
  def: MisconceptionTagDef | null;
  /** For `other`, the most recent free-text label; else the def label. */
  label: string;
  bucket: string;
  /** Total instances logged for this tag (any status). */
  total: number;
  /** Instances DUE to resurface right now. Drives the headline ranking.
   *  Spaced-out instances drop to 0 today but reappear when they come
   *  due again — a tag never permanently graduates out. */
  openCount: number;
  lastSeenAt: number;
  /** A few representative records (most recent first), for the UI. */
  examples: MisconceptionTagRecord[];
}

/** Aggregate the bucket into one row per tag, ranked by DUE count (the
 *  Training Plan's headline order). Well-spaced tags sink to the bottom
 *  today but resurface when due — they never graduate out. `other` rows
 *  are grouped by their free-text label so distinct uncategorised errors
 *  stay distinct for later promotion. */
export async function getMisconceptionProfile(): Promise<MisconceptionAggregate[]> {
  const now = Date.now();
  const all = await db.misconceptionTags.toArray();
  const groups = new Map<string, MisconceptionTagRecord[]>();
  for (const rec of all) {
    // Keep distinct free-text labels separate within the 'other' tag.
    const key = rec.tag === 'other' ? `other:${rec.customLabel ?? 'unlabelled'}` : rec.tag;
    const arr = groups.get(key);
    if (arr) arr.push(rec);
    else groups.set(key, [rec]);
  }

  const rows: MisconceptionAggregate[] = [];
  for (const [, records] of groups) {
    records.sort((a, b) => b.createdAt - a.createdAt);
    const head = records[0];
    const def = getMisconceptionTag(head.tag);
    const openCount = records.filter((r) => isMisconceptionDue(r, now)).length;
    rows.push({
      tag: head.tag,
      def,
      label: head.tag === 'other'
        ? (head.customLabel ?? 'Uncategorized')
        : (def?.label ?? head.tag),
      bucket: def?.bucket ?? 'uncategorized',
      total: records.length,
      openCount,
      lastSeenAt: head.createdAt,
      examples: records.slice(0, 5),
    });
  }

  rows.sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return b.lastSeenAt - a.lastSeenAt;
  });
  return rows;
}

/** Record the outcome of a drill aimed at a tag. A success SPACES every
 *  currently-due instance of that tag further out (the interval lengthens
 *  with the SRS level); a miss snaps it back so it resurfaces soon. The
 *  instance NEVER graduates out — you just see it less often as you fix it
 *  (David 2026-05-21). Only due instances move, so spacing one out doesn't
 *  reset the ones already resting. */
export async function recordTagDrillResult(tag: string, success: boolean): Promise<void> {
  const now = Date.now();
  const due = await db.misconceptionTags
    .where('tag').equals(tag)
    .filter((r) => isMisconceptionDue(r, now))
    .toArray();
  for (const rec of due) {
    if (success) {
      const level = Math.min(rec.masteryHits + 1, MAX_SRS_LEVEL);
      await db.misconceptionTags.update(rec.id, {
        masteryHits: level,
        status: 'improving',
        dueAt: now + intervalForLevel(level),
        lastDrilledAt: now,
      });
    } else {
      const level = Math.max(0, rec.masteryHits - MISS_LEVEL_DROP);
      await db.misconceptionTags.update(rec.id, {
        masteryHits: level,
        status: level === 0 ? 'open' : 'improving',
        dueAt: now, // due again immediately — see it sooner
        lastDrilledAt: now,
      });
    }
  }
  void logAppAudit({
    kind: 'misconception-drill-result',
    category: 'subsystem',
    source: 'misconceptionService.recordTagDrillResult',
    summary: `tag=${tag} success=${success} spaced=${due.length} instance(s)`,
    details: JSON.stringify({ tag, success, affected: due.length }),
  });
}

export interface TagDrillPlan {
  tag: string;
  label: string;
  kind: MisconceptionDrillKind | 'review';
  /** puzzles.json themes to pull tactical reps from. */
  puzzleThemes: string[];
  /** The user's own positions where this error occurred (FENs), newest
   *  first — "replay your loss" material. */
  positions: { fen: string; playedSan?: string; bestSan?: string; openingId?: string }[];
}

/** Map a tag to its drill sources: the tag def's drill kind + themes,
 *  plus the user's own flubbed positions. `other` has no canned drill
 *  (it's a review-only holding pen) so its kind is 'review'. */
export async function mapTagToDrills(tag: string): Promise<TagDrillPlan | null> {
  const def = getMisconceptionTag(tag);
  if (!def) return null;
  const now = Date.now();
  const all = await db.misconceptionTags
    .where('tag').equals(tag)
    .toArray();
  // Drill the due instances first; if none are due, still surface the rest
  // so the tag is always drillable on demand (it never graduates out).
  const dueRecords = all.filter((r) => isMisconceptionDue(r, now));
  const records = dueRecords.length > 0 ? dueRecords : all;
  records.sort((a, b) => b.createdAt - a.createdAt);
  return {
    tag,
    label: def.label,
    kind: tag === 'other' ? 'review' : def.drill.kind,
    puzzleThemes: tag === 'other' ? [] : (def.drill.puzzleThemes ?? []),
    positions: records.map((r) => ({
      fen: r.fen,
      playedSan: r.playedSan,
      bestSan: r.bestSan,
      openingId: r.openingId,
    })),
  };
}

/** The closed-set tag defs, for UI rendering of the full taxonomy. */
export function listMisconceptionTags(): readonly MisconceptionTagDef[] {
  return MISCONCEPTION_TAGS;
}
