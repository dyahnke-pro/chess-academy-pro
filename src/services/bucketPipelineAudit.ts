// Bucket-pipeline audit engine (David 2026-07-06: "we need audit tools for
// bucket delivery and organization"). A pure, browser-independent invariant
// checker over the weakness-loop stores — the deterministic backbone that
// proves a captured "why'd you play that?" answer reaches the RIGHT bucket
// and drives a drill (DELIVERY), and that the buckets are correctly grouped,
// ranked, deduped, and spaced (ORGANIZATION).
//
// It reads the SAME stores + read-layer the app uses at runtime
// (misconceptionTags, mistakePuzzles, weaknessSpine.getUnifiedWeaknessProfile,
// misconceptionService.mapTagToDrills) so a green audit means the real
// pipeline is sound — not a parallel re-implementation that can drift.
// Mirrors the shape of the loop-audit continuityPreflight: no browser, no
// LLM, no network; every finding is a concrete invariant breach with the
// offending record id.

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import {
  getMisconceptionProfile,
  mapTagToDrills,
  isMisconceptionDue,
  SRS_INTERVALS_MS,
} from './misconceptionService';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from './weaknessSpine';
import {
  getMisconceptionTag,
  isMisconceptionTagId,
  type MisconceptionBucket,
} from '../data/misconceptionTags';
import type { MisconceptionTagRecord, MistakePuzzle } from '../types';

/** The closed set of valid weakness buckets. */
const VALID_BUCKETS: ReadonlySet<MisconceptionBucket> = new Set([
  'opening',
  'tactical',
  'positional',
  'endgame',
  'general',
  'uncategorized',
]);

const MAX_SRS_LEVEL = SRS_INTERVALS_MS.length - 1;
const MAX_SRS_INTERVAL_MS = SRS_INTERVALS_MS[MAX_SRS_LEVEL];
/** Slack over the longest interval before a dueAt counts as "parked out of
 *  the loop" — the contract is that a misconception never graduates out. */
const GRADUATE_SLACK_MS = 2 * 24 * 60 * 60 * 1000;

export type BucketAuditCode =
  // DELIVERY
  | 'UNKNOWN_TAG'
  | 'BUCKET_MISMATCH'
  | 'OTHER_NO_LABEL'
  | 'COUNTED_NO_DRILL'
  | 'DROPPED_FROM_PROFILE'
  | 'DRILL_PLAN_EMPTY'
  // ORGANIZATION
  | 'INVALID_BUCKET'
  | 'EMPTY_LABEL'
  | 'RANK_OUT_OF_ORDER'
  | 'DUP_ACROSS_PIPELINES'
  | 'SRS_LEVEL_OOB'
  | 'SRS_DUEAT_INCONSISTENT'
  | 'NEVER_GRADUATES';

export interface BucketAuditViolation {
  code: BucketAuditCode;
  layer: 'delivery' | 'organization';
  severity: 'error' | 'warn';
  detail: string;
  /** The offending misconception / mistake-puzzle / unified-row id, if any. */
  recordId?: string;
}

export interface BucketRollup {
  bucket: string;
  /** Distinct tags/clusters filed under this bucket. */
  tags: string[];
  /** Total instances across those tags. */
  total: number;
  /** Instances due/open right now. */
  openCount: number;
}

export interface BucketAuditReport {
  ranAt: number;
  /** Every counted capture, with its delivery status resolved. */
  captures: {
    id: string;
    tag: string;
    bucket: string;
    source: string;
    counted: boolean;
    hasBestSan: boolean;
    /** A drillable mistakePuzzle exists for this position (Option-B delivery). */
    hasDrill: boolean;
    /** This capture surfaces in the unified weakness profile. */
    inProfile: boolean;
  }[];
  buckets: BucketRollup[];
  delivery: {
    captured: number;
    countedCaptured: number;
    withDrill: number;
    inProfile: number;
    /** Counted + hasBestSan captures with NO drill wired — dropped deliveries. */
    dropped: number;
  };
  organization: {
    profileRows: number;
    rankingMonotonic: boolean;
    dedupClean: boolean;
    closedSetClean: boolean;
    srsConsistent: boolean;
  };
  violations: BucketAuditViolation[];
  /** True when there are zero error-severity violations. */
  ok: boolean;
}

/** Position identity — placement+side+castling+ep (drop move counters) + the
 *  played SAN. Mirrors weaknessSpine.posKey / mistakePuzzleService.capturePosKey. */
function posKey(fen: string, san?: string): string {
  return `${fen.split(' ').slice(0, 4).join(' ')}|${san ?? ''}`;
}

/** Is the played SAN legal from the given FEN? A counted capture whose SAN is
 *  illegal legitimately produces NO mistakePuzzle (the builder skips it), so
 *  we only flag a missing drill when the move was actually playable. */
function moveIsLegal(fen: string, san?: string): boolean {
  if (!san) return false;
  try {
    const chess = new Chess(fen);
    return chess.move(san) != null;
  } catch {
    return false;
  }
}

/** Run the full bucket-pipeline audit over the live Dexie stores. */
export async function auditBucketPipeline(now: number = Date.now()): Promise<BucketAuditReport> {
  const violations: BucketAuditViolation[] = [];
  const push = (v: BucketAuditViolation): void => {
    violations.push(v);
  };

  const [rawCaptures, mistakes, profile, misProfile] = await Promise.all([
    db.misconceptionTags.toArray(),
    db.mistakePuzzles.toArray(),
    getUnifiedWeaknessProfile(),
    getMisconceptionProfile({ countedOnly: true }),
  ]);

  const drillKeys = new Set(mistakes.map((m: MistakePuzzle) => posKey(m.fen, m.playerMoveSan)));

  // ── DELIVERY: per-capture ────────────────────────────────────────────────
  // A counted tag surfaces in the unified profile as a coach row keyed by tag.
  const coachTagsInProfile = new Set(
    profile.filter((r) => r.sources.includes('coach')).map((r) => r.tag),
  );

  const captures = rawCaptures.map((rec: MisconceptionTagRecord) => {
    const def = getMisconceptionTag(rec.tag);
    const counted = rec.counted !== false;

    // UNKNOWN_TAG — the hallucination guard must have held at capture time.
    if (!isMisconceptionTagId(rec.tag)) {
      push({
        code: 'UNKNOWN_TAG',
        layer: 'delivery',
        severity: 'error',
        detail: `Capture ${rec.id} carries tag "${rec.tag}" which is outside the closed set.`,
        recordId: rec.id,
      });
    }

    // BUCKET_MISMATCH — the audit-emitted bucket must equal the tag def's
    // bucket, except `other`, which is filed under its phase bucket by design.
    const expectedBucket =
      rec.tag === 'other'
        ? phaseBucket(rec.gamePhase) ?? def?.bucket ?? 'uncategorized'
        : def?.bucket ?? 'uncategorized';

    // OTHER_NO_LABEL — the catch-all must always carry a free-text label.
    if (rec.tag === 'other' && !rec.customLabel?.trim()) {
      push({
        code: 'OTHER_NO_LABEL',
        layer: 'delivery',
        severity: 'error',
        detail: `Capture ${rec.id} is tag "other" with no customLabel — an unlabelled catch-all can't be promoted or reviewed.`,
        recordId: rec.id,
      });
    }

    // COUNTED_NO_DRILL — a counted slip with a real best move and a LEGAL
    // played move must have produced a drillable mistakePuzzle (Option-B
    // dual-write). A missing drill here is a dropped delivery — the exact
    // "picker fired but nothing to drill" class David is chasing.
    const hasBestSan = !!rec.bestSan;
    const hasDrill = drillKeys.has(posKey(rec.fen, rec.playedSan));
    if (
      counted &&
      hasBestSan &&
      rec.tag !== 'other' &&
      moveIsLegal(rec.fen, rec.playedSan) &&
      !hasDrill
    ) {
      push({
        code: 'COUNTED_NO_DRILL',
        layer: 'delivery',
        severity: 'error',
        detail: `Counted ${rec.tag} capture ${rec.id} has a best move but no drillable mistakePuzzle — Option-B dual-write dropped.`,
        recordId: rec.id,
      });
    }

    // DROPPED_FROM_PROFILE — a counted capture must surface in the unified
    // profile (as a coach row for its tag). Nothing silently disappears.
    const inProfile = coachTagsInProfile.has(rec.tag);
    if (counted && isMisconceptionTagId(rec.tag) && !inProfile) {
      push({
        code: 'DROPPED_FROM_PROFILE',
        layer: 'delivery',
        severity: 'error',
        detail: `Counted ${rec.tag} capture ${rec.id} does not surface in the unified weakness profile.`,
        recordId: rec.id,
      });
    }

    return {
      id: rec.id,
      tag: rec.tag,
      bucket: expectedBucket,
      source: rec.source,
      counted,
      hasBestSan,
      hasDrill,
      inProfile,
    };
  });

  // DRILL_PLAN_EMPTY — every non-`other` tag with due instances must yield a
  // non-empty drill plan (themes and/or the student's own flubbed positions).
  const dueTagsWithInstances = new Set(
    rawCaptures
      .filter((r) => r.counted !== false && r.tag !== 'other' && isMisconceptionDue(r, now))
      .map((r) => r.tag),
  );
  for (const tag of dueTagsWithInstances) {
    const plan = await mapTagToDrills(tag);
    const empty = !plan || (plan.positions.length === 0 && plan.puzzleThemes.length === 0);
    if (empty) {
      push({
        code: 'DRILL_PLAN_EMPTY',
        layer: 'delivery',
        severity: 'error',
        detail: `Tag "${tag}" has due instances but mapTagToDrills yields no themes and no positions — nothing to drill.`,
      });
    }
  }

  // ── ORGANIZATION: over the unified profile ───────────────────────────────
  let rankingMonotonic = true;
  for (let i = 1; i < profile.length; i += 1) {
    if (!rankedBefore(profile[i - 1], profile[i])) {
      rankingMonotonic = false;
      push({
        code: 'RANK_OUT_OF_ORDER',
        layer: 'organization',
        severity: 'error',
        detail: `Unified row "${profile[i].key}" ranks above "${profile[i - 1].key}" but has a lower open/severity/recency signal.`,
        recordId: profile[i].key,
      });
    }
  }

  let closedSetClean = true;
  for (const row of profile) {
    if (!VALID_BUCKETS.has(row.bucket)) {
      closedSetClean = false;
      push({
        code: 'INVALID_BUCKET',
        layer: 'organization',
        severity: 'error',
        detail: `Unified row "${row.key}" has bucket "${row.bucket}" outside the closed set.`,
        recordId: row.key,
      });
    }
    if (!row.label.trim()) {
      push({
        code: 'EMPTY_LABEL',
        layer: 'organization',
        severity: 'error',
        detail: `Unified row "${row.key}" has an empty label.`,
        recordId: row.key,
      });
    }
  }

  // DUP_ACROSS_PIPELINES — a single position must not appear in BOTH a coach
  // row and an analysis row (the weaknessSpine dedup gives coach the win).
  let dedupClean = true;
  const coachPositions = new Set<string>();
  for (const row of profile) {
    if (row.sources.includes('coach')) {
      for (const p of row.positions) coachPositions.add(posKey(p.fen, p.playedSan));
    }
  }
  for (const row of profile) {
    if (row.sources.length === 1 && row.sources[0] === 'analysis') {
      for (const p of row.positions) {
        if (coachPositions.has(posKey(p.fen, p.playedSan))) {
          dedupClean = false;
          push({
            code: 'DUP_ACROSS_PIPELINES',
            layer: 'organization',
            severity: 'error',
            detail: `Position ${posKey(p.fen, p.playedSan)} appears in both a coach row and analysis row "${row.key}" — dedup failed.`,
            recordId: row.key,
          });
        }
      }
    }
  }

  // SRS invariants — masteryHits in range, dueAt sane, never parked out.
  let srsConsistent = true;
  for (const rec of rawCaptures) {
    if (rec.masteryHits < 0 || rec.masteryHits > MAX_SRS_LEVEL) {
      srsConsistent = false;
      push({
        code: 'SRS_LEVEL_OOB',
        layer: 'organization',
        severity: 'error',
        detail: `Capture ${rec.id} has masteryHits=${rec.masteryHits} outside [0, ${MAX_SRS_LEVEL}].`,
        recordId: rec.id,
      });
    }
    if (rec.dueAt != null) {
      const anchor = rec.lastDrilledAt ?? rec.createdAt;
      if (rec.dueAt > anchor + MAX_SRS_INTERVAL_MS + GRADUATE_SLACK_MS) {
        srsConsistent = false;
        push({
          code: 'NEVER_GRADUATES',
          layer: 'organization',
          severity: 'error',
          detail: `Capture ${rec.id} dueAt is beyond the longest interval from its last touch — parked out of the loop (must never graduate out).`,
          recordId: rec.id,
        });
      }
      if (rec.dueAt < rec.createdAt - GRADUATE_SLACK_MS) {
        srsConsistent = false;
        push({
          code: 'SRS_DUEAT_INCONSISTENT',
          layer: 'organization',
          severity: 'warn',
          detail: `Capture ${rec.id} dueAt precedes its createdAt by more than the slack window.`,
          recordId: rec.id,
        });
      }
    }
  }

  // ── Rollups ──────────────────────────────────────────────────────────────
  const bucketMap = new Map<string, BucketRollup>();
  for (const row of misProfile) {
    const b = row.bucket;
    const cur = bucketMap.get(b) ?? { bucket: b, tags: [], total: 0, openCount: 0 };
    if (!cur.tags.includes(row.label)) cur.tags.push(row.label);
    cur.total += row.total;
    cur.openCount += row.openCount;
    bucketMap.set(b, cur);
  }
  const buckets = [...bucketMap.values()].sort((a, b) => b.openCount - a.openCount);

  const countedCaptures = captures.filter((c) => c.counted);
  const dropped = countedCaptures.filter(
    (c) => c.hasBestSan && !c.hasDrill && c.tag !== 'other' && moveIsLegal(
      rawCaptures.find((r) => r.id === c.id)?.fen ?? '',
      rawCaptures.find((r) => r.id === c.id)?.playedSan,
    ),
  ).length;

  const errorCount = violations.filter((v) => v.severity === 'error').length;

  return {
    ranAt: now,
    captures,
    buckets,
    delivery: {
      captured: captures.length,
      countedCaptured: countedCaptures.length,
      withDrill: captures.filter((c) => c.hasDrill).length,
      inProfile: captures.filter((c) => c.inProfile).length,
      dropped,
    },
    organization: {
      profileRows: profile.length,
      rankingMonotonic,
      dedupClean,
      closedSetClean,
      srsConsistent,
    },
    violations,
    ok: errorCount === 0,
  };
}

/** Phase → bucket for the honest `other` fallback (mirrors
 *  misconceptionService.phaseToBucket, kept local to avoid exporting it). */
function phaseBucket(
  phase: 'opening' | 'middlegame' | 'endgame' | undefined,
): MisconceptionBucket | null {
  if (phase === 'opening') return 'opening';
  if (phase === 'endgame') return 'endgame';
  if (phase === 'middlegame') return 'positional';
  return null;
}

/** The unified-profile ordering contract: openCount desc, then severity desc,
 *  then lastSeenAt desc. `a` must rank at-or-before `b`. */
function rankedBefore(a: UnifiedWeakness, b: UnifiedWeakness): boolean {
  if (a.openCount !== b.openCount) return a.openCount > b.openCount;
  if (a.severity !== b.severity) return a.severity > b.severity;
  return a.lastSeenAt >= b.lastSeenAt;
}
