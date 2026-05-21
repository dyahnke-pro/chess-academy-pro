// The misconception-tag engine — the shared bucket behind the weakness
// loop (David 2026-05-21). Three faucets write here (Discussion Practice
// live games, Game Review, import-time auto-analysis); the Training Plan
// reads here to prioritise drills. The taxonomy is the closed set in
// data/misconceptionTags.ts — this module never invents tags, it only
// stores, aggregates, and maps them to drills.

import { db } from '../db/schema';
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

/** Consecutive successful drills before a tagged instance graduates to
 *  `mastered` and stops counting against the user. */
export const MASTERY_THRESHOLD = 3;

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
  };
  await db.misconceptionTags.add(record);
  return record;
}

export async function getAllMisconceptions(): Promise<MisconceptionTagRecord[]> {
  return db.misconceptionTags.toArray();
}

export interface MisconceptionAggregate {
  tag: string;
  def: MisconceptionTagDef | null;
  /** For `other`, the most recent free-text label; else the def label. */
  label: string;
  bucket: string;
  /** Total instances logged for this tag (any status). */
  total: number;
  /** Instances still counting (status !== 'mastered'). */
  openCount: number;
  lastSeenAt: number;
  /** A few representative records (most recent first), for the UI. */
  examples: MisconceptionTagRecord[];
}

/** Aggregate the bucket into one row per tag, ranked by open count
 *  (the Training Plan's headline order). Mastered-out tags sink to the
 *  bottom. `other` rows are grouped by their free-text label so distinct
 *  uncategorised errors stay distinct for later promotion. */
export async function getMisconceptionProfile(): Promise<MisconceptionAggregate[]> {
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
    const openCount = records.filter((r) => r.status !== 'mastered').length;
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

/** Record the outcome of a drill aimed at a tag. A success advances every
 *  still-open instance of that tag toward mastery (graduating at
 *  MASTERY_THRESHOLD); a miss resets their progress. This is the adaptive
 *  loop — an error you're fixing graduates out and stops counting. */
export async function recordTagDrillResult(tag: string, success: boolean): Promise<void> {
  const now = Date.now();
  const open = await db.misconceptionTags
    .where('tag').equals(tag)
    .filter((r) => r.status !== 'mastered')
    .toArray();
  for (const rec of open) {
    if (success) {
      const hits = rec.masteryHits + 1;
      await db.misconceptionTags.update(rec.id, {
        masteryHits: hits,
        status: hits >= MASTERY_THRESHOLD ? 'mastered' : 'improving',
        lastDrilledAt: now,
      });
    } else {
      await db.misconceptionTags.update(rec.id, {
        masteryHits: 0,
        status: 'open',
        lastDrilledAt: now,
      });
    }
  }
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
  const records = await db.misconceptionTags
    .where('tag').equals(tag)
    .filter((r) => r.status !== 'mastered')
    .toArray();
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
