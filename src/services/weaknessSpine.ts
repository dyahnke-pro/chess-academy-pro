// The unified weakness read-layer (David 2026-05-25, "do both" — Option A).
//
// The app captures your mistakes through TWO pipelines that historically
// never met:
//   • mistakePuzzles  — derived by the Analyze pass over imported games.
//   • misconceptionTags — derived by the coach asking "why did you play
//     that?" in review / play / opening-play.
// The Weaknesses page read only the first; the Training Plan read only the
// second. So the same kind of slip landed in a different cabinet depending
// on HOW it was caught, and neither surface showed your whole picture.
//
// This module is the single merge layer. It turns the Analyze-side
// mistakePuzzles into the SAME ranked-aggregate shape the misconception
// pipeline already uses, deduped by position so a mistake caught by BOTH
// pipelines counts once (the dedup also makes Option B's dual-write safe —
// a position written to both stores collapses to one row here). The
// Training Plan reads the unified list; the Weaknesses page folds the
// misconception half in via weaknessAnalyzer.analyzeMisconceptions.

import { db } from '../db/schema';
import { getMisconceptionProfile, type MisconceptionAggregate } from './misconceptionService';
import { detectConversionFailures, type ConversionFailure } from './conversionDetector';
import { getSquareHeatmap, type SquareHeatmapEntry } from './findSquareService';
import { useAppStore } from '../stores/appStore';
import type { MisconceptionBucket } from '../data/misconceptionTags';
import type { ClassifiedTactic, MistakePuzzle, MistakeGamePhase, OpeningWeakSpot, TacticType } from '../types';

/** A weak spot not re-drilled within this window is "open" again. */
const WEAKSPOT_STALE_MS = 3 * 24 * 60 * 60 * 1000;
const CONVERSION_TAG = 'analysis:conversion';
const BOARD_VISION_TAG = 'analysis:boardvision';
/** A square needs >= this many attempts before it can count as weak. */
const BOARD_VISION_MIN_ATTEMPTS = 3;
/** Missing >= a third of the time, or slower than this, marks a weak square. */
const BOARD_VISION_ERROR_RATE = 0.34;
const BOARD_VISION_SLOW_MS = 3000;

/** The minimal shape both pipelines satisfy, consumed by buildTodaysReps
 *  and any other ranking surface. A structural superset of the fields
 *  weaknessRep() reads off a MisconceptionAggregate. */
export interface WeaknessRepInput {
  /** Misconception tag id (coach source) or a synthetic `analysis:*` id. */
  tag: string;
  label: string;
  /** Instances due/open right now — drives the ranking + the plan share. */
  openCount: number;
}

export interface UnifiedWeakness extends WeaknessRepInput {
  /** Stable React/dedupe key. */
  key: string;
  bucket: MisconceptionBucket;
  /** All instances logged (any status). */
  total: number;
  /** 0-100, higher = worse. Ranking signal across both pipelines. */
  severity: number;
  /** Which capture pipeline(s) this row draws from. */
  sources: ('coach' | 'analysis')[];
  /** puzzles.json theme tags to pull tactical reps from (may be empty). */
  puzzleThemes: string[];
  /** The student's own flubbed positions (newest first) — replay material. */
  positions: { fen: string; playedSan?: string; bestSan?: string; openingId?: string }[];
  lastSeenAt: number;
}

/** Position identity for dedup: piece placement + side + castling + ep
 *  (drop the half/full-move counters) plus the played SAN. Two records
 *  with the same key describe the same mistake. */
function posKey(fen: string, san?: string): string {
  const core = fen.split(' ').slice(0, 4).join(' ');
  return `${core}|${san ?? ''}`;
}

/** Coarse, HONEST mapping from a mistakePuzzle to a weakness bucket. We do
 *  NOT force-fit Analyze mistakes into specific misconception tags (that
 *  would be guessing which thinking-error caused the slip — see CLAUDE.md
 *  "when unsure, don't guess"). We cluster by tactic motif when the
 *  detector gave one, else by game phase. */
function bucketForMistake(p: MistakePuzzle): { bucket: MisconceptionBucket; clusterId: string; label: string; themes: string[] } {
  if (p.tacticType) {
    return {
      bucket: 'tactical',
      clusterId: `analysis:tactic:${p.tacticType}`,
      label: `Missed ${tacticLabel(p.tacticType)}`,
      themes: themesForTactic(p.tacticType),
    };
  }
  const phase: MistakeGamePhase = p.gamePhase;
  if (phase === 'opening') return { bucket: 'opening', clusterId: 'analysis:phase:opening', label: 'Mistakes in the opening', themes: [] };
  if (phase === 'endgame') return { bucket: 'endgame', clusterId: 'analysis:phase:endgame', label: 'Mistakes in the endgame', themes: [] };
  return { bucket: 'general', clusterId: 'analysis:phase:middlegame', label: 'Mistakes in the middlegame', themes: [] };
}

/** Plain-English plural label for a tactic motif. */
function tacticLabel(t: TacticType): string {
  const map: Partial<Record<TacticType, string>> = {
    fork: 'forks', pin: 'pins', skewer: 'skewers', hanging_piece: 'hanging pieces',
    discovered_attack: 'discovered attacks', double_check: 'double checks',
    back_rank: 'back-rank tactics', deflection: 'deflections', promotion: 'promotions',
    overloaded_piece: 'overloaded pieces', trapped_piece: 'trapped pieces',
    clearance: 'clearance tactics', interference: 'interference', zwischenzug: 'in-between moves',
    x_ray: 'x-ray tactics', removing_the_guard: 'remove-the-defender tactics',
    tactical_sequence: 'tactical sequences',
  };
  return map[t] ?? t.replace(/_/g, ' ');
}

/** Map our snake_case TacticType to puzzles.json (Lichess) camelCase theme
 *  ids so the tag's drill can pull matching tactical reps. Unmapped motifs
 *  return [] (no themed pool) rather than a guessed theme. */
function themesForTactic(t: TacticType): string[] {
  const map: Partial<Record<TacticType, string[]>> = {
    fork: ['fork'], pin: ['pin'], skewer: ['skewer'], hanging_piece: ['hangingPiece'],
    discovered_attack: ['discoveredAttack'], double_check: ['doubleCheck'],
    back_rank: ['backRankMate'], deflection: ['deflection'], promotion: ['promotion', 'advancedPawn'],
    overloaded_piece: ['overloadedPiece'], trapped_piece: ['trappedPiece'],
    clearance: ['clearance'], interference: ['interference'], zwischenzug: ['zwischenzug'],
    x_ray: ['xRayAttack'], removing_the_guard: ['defensiveMove'],
  };
  return map[t] ?? [];
}

/** Cluster the Analyze-side mistakePuzzles into ranked aggregates in the
 *  unified shape. `openCount` mirrors the misconception "due" semantic via
 *  the puzzle's solved-state: an UNSOLVED mistake is still open. */
export function aggregateMistakePuzzles(mistakes: MistakePuzzle[], excludeKeys?: Set<string>): UnifiedWeakness[] {
  const groups = new Map<string, { meta: ReturnType<typeof bucketForMistake>; rows: MistakePuzzle[] }>();
  for (const p of mistakes) {
    if (excludeKeys?.has(posKey(p.fen, p.playerMoveSan))) continue;
    const meta = bucketForMistake(p);
    const g = groups.get(meta.clusterId);
    if (g) g.rows.push(p);
    else groups.set(meta.clusterId, { meta, rows: [p] });
  }

  const out: UnifiedWeakness[] = [];
  for (const [clusterId, { meta, rows }] of groups) {
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const open = rows.filter((r) => r.status === 'unsolved').length;
    const avgCpLoss = Math.round(rows.reduce((s, r) => s + r.cpLoss, 0) / rows.length);
    const blunders = rows.filter((r) => r.classification === 'blunder').length;
    out.push({
      key: clusterId,
      tag: clusterId,
      label: meta.label,
      bucket: meta.bucket,
      openCount: open,
      total: rows.length,
      severity: Math.min(95, rows.length * 6 + blunders * 8 + Math.round(avgCpLoss / 30)),
      sources: ['analysis'],
      puzzleThemes: meta.themes,
      positions: rows.slice(0, 8).map((r) => ({
        fen: r.fen,
        playedSan: r.playerMoveSan,
        bestSan: r.bestMoveSan,
        openingId: r.openingName ?? undefined,
      })),
      lastSeenAt: rows[0] ? Date.parse(rows[0].createdAt) || 0 : 0,
    });
  }
  return out;
}

/** Convert a misconception aggregate into the unified shape. */
function fromMisconception(a: MisconceptionAggregate): UnifiedWeakness {
  return {
    key: `coach:${a.tag}:${a.label}`,
    tag: a.tag,
    label: a.label,
    bucket: a.def?.bucket ?? 'uncategorized',
    openCount: a.openCount,
    total: a.total,
    severity: Math.min(95, a.openCount * 12 + a.total * 3),
    sources: ['coach'],
    puzzleThemes: a.def?.drill.puzzleThemes ?? [],
    positions: a.examples.map((e) => ({
      fen: e.fen,
      playedSan: e.playedSan,
      bestSan: e.bestSan,
      openingId: e.openingId,
    })),
    lastSeenAt: a.lastSeenAt,
  };
}

/** Cluster opening-drill weak spots (failCount per repertoire position) by
 *  opening. PREVIOUSLY DEAD: recordWeakSpot wrote these on every missed drill
 *  move and nothing ever read them. Now they surface as `opening` weaknesses
 *  routed back to the opening's own drill. A spot not re-drilled within the
 *  stale window counts as open. */
export function aggregateOpeningWeakSpots(spots: OpeningWeakSpot[], now: number = Date.now()): UnifiedWeakness[] {
  const groups = new Map<string, OpeningWeakSpot[]>();
  for (const s of spots) {
    const g = groups.get(s.openingId);
    if (g) g.push(s);
    else groups.set(s.openingId, [s]);
  }
  const out: UnifiedWeakness[] = [];
  for (const [openingId, rows] of groups) {
    rows.sort((a, b) => b.failCount - a.failCount);
    const open = rows.filter((r) => !r.lastDrilledAt || now - Date.parse(r.lastDrilledAt) > WEAKSPOT_STALE_MS).length;
    const totalFails = rows.reduce((s, r) => s + r.failCount, 0);
    const lastSeenAt = rows.reduce((m, r) => Math.max(m, Date.parse(r.lastFailedAt) || 0), 0);
    out.push({
      key: `analysis:weakspot:${openingId}`,
      tag: `analysis:weakspot:${openingId}`,
      label: `Weak spots in ${rows[0]?.openingName ?? openingId}`,
      bucket: 'opening',
      openCount: open,
      total: rows.length,
      severity: Math.min(95, totalFails * 8 + rows.length * 4),
      sources: ['analysis'],
      puzzleThemes: [],
      positions: rows.slice(0, 8).map((r) => ({ fen: r.fen, bestSan: r.correctMoveSan, openingId: r.openingId })),
      lastSeenAt,
    });
  }
  return out;
}

/** Cluster classified tactics (motifs missed in real games) by tactic type.
 *  PREVIOUSLY DISPLAY-ONLY (fed the skill radar, never drove a drill). Keyed
 *  on the SAME `analysis:tactic:<type>` cluster id as the mistake-puzzle tactic
 *  rows so mergeByKey folds the two together rather than double-listing. An
 *  un-solved tactic (no puzzle success yet) counts as open. */
export function aggregateClassifiedTactics(tactics: ClassifiedTactic[]): UnifiedWeakness[] {
  const groups = new Map<TacticType, ClassifiedTactic[]>();
  for (const t of tactics) {
    const g = groups.get(t.tacticType);
    if (g) g.push(t);
    else groups.set(t.tacticType, [t]);
  }
  const out: UnifiedWeakness[] = [];
  for (const [type, rows] of groups) {
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const open = rows.filter((r) => r.puzzleSuccesses === 0).length;
    const lastSeenAt = rows[0] ? Date.parse(rows[0].createdAt) || 0 : 0;
    out.push({
      key: `analysis:tactic:${type}`,
      tag: `analysis:tactic:${type}`,
      label: `Missed ${tacticLabel(type)}`,
      bucket: 'tactical',
      openCount: open,
      total: rows.length,
      severity: Math.min(95, rows.length * 6),
      sources: ['analysis'],
      puzzleThemes: themesForTactic(type),
      positions: rows.slice(0, 8).map((r) => ({ fen: r.fen, playedSan: r.playerMoveSan, bestSan: r.bestMoveSan, openingId: r.openingName ?? undefined })),
      lastSeenAt,
    });
  }
  return out;
}

/** Roll up blown-winning-position games into a single conversion weakness.
 *  PREVIOUSLY MISSING: per-move evals were stored but never scanned for the
 *  "was winning, didn't convert" pattern. */
export function aggregateConversionFailures(failures: ConversionFailure[]): UnifiedWeakness[] {
  if (failures.length === 0) return [];
  const lastSeenAt = failures.reduce((m, f) => Math.max(m, f.date ? Date.parse(f.date) || 0 : 0), 0);
  const avgPeak = Math.round(failures.reduce((s, f) => s + f.peakCp, 0) / failures.length);
  return [{
    key: CONVERSION_TAG,
    tag: CONVERSION_TAG,
    label: 'Letting winning positions slip',
    bucket: 'general',
    openCount: failures.length,
    total: failures.length,
    severity: Math.min(95, failures.length * 12 + Math.round(avgPeak / 60)),
    sources: ['analysis'],
    puzzleThemes: [],
    positions: failures.slice(0, 8).map((f) => ({ fen: f.fen, openingId: f.openingName ?? undefined })),
    lastSeenAt,
  }];
}

/** Surface board-vision blind spots (squares the student is slow or wrong to
 *  locate). PREVIOUSLY DEAD: getSquareHeatmap was written + aggregated but
 *  only ever read inside the Find-the-Square page itself. Now a weak-square
 *  set drives a rep routed back to /tactics/find-square, which records fresh
 *  attempts and shrinks the set as vision improves (the loop closes itself). */
export function aggregateBoardVision(heatmap: SquareHeatmapEntry[]): UnifiedWeakness[] {
  const weak = heatmap.filter(
    (e) => e.attempts >= BOARD_VISION_MIN_ATTEMPTS &&
      (e.errorRate >= BOARD_VISION_ERROR_RATE || (Number.isFinite(e.avgCorrectMs) && e.avgCorrectMs > BOARD_VISION_SLOW_MS)),
  );
  if (weak.length === 0) return [];
  weak.sort((a, b) => b.errorRate - a.errorRate);
  const names = weak.slice(0, 3).map((e) => e.square).join(', ');
  const avgError = weak.reduce((s, e) => s + e.errorRate, 0) / weak.length;
  return [{
    key: BOARD_VISION_TAG,
    tag: BOARD_VISION_TAG,
    label: `Board vision — slow on ${names}`,
    bucket: 'general',
    openCount: weak.length,
    total: weak.length,
    severity: Math.min(95, weak.length * 6 + Math.round(avgError * 40)),
    sources: ['analysis'],
    puzzleThemes: [],
    positions: [],
    lastSeenAt: Date.now(),
  }];
}

/** Fold rows sharing a key into one (e.g. a tactic motif caught by both the
 *  mistake-puzzle pass and the classified-tactics pass). Counts add; severity
 *  takes the max; positions concat (deduped, capped); sources union. */
function mergeByKey(rows: UnifiedWeakness[]): UnifiedWeakness[] {
  const byKey = new Map<string, UnifiedWeakness>();
  for (const r of rows) {
    const existing = byKey.get(r.key);
    if (!existing) {
      byKey.set(r.key, { ...r, positions: [...r.positions], sources: [...r.sources] });
      continue;
    }
    existing.openCount += r.openCount;
    existing.total += r.total;
    existing.severity = Math.max(existing.severity, r.severity);
    existing.lastSeenAt = Math.max(existing.lastSeenAt, r.lastSeenAt);
    for (const s of r.sources) if (!existing.sources.includes(s)) existing.sources.push(s);
    if (existing.puzzleThemes.length === 0 && r.puzzleThemes.length > 0) existing.puzzleThemes = r.puzzleThemes;
    const seen = new Set(existing.positions.map((p) => posKey(p.fen, p.playedSan)));
    for (const p of r.positions) {
      const k = posKey(p.fen, p.playedSan);
      if (!seen.has(k) && existing.positions.length < 8) { existing.positions.push(p); seen.add(k); }
    }
  }
  return [...byKey.values()];
}

/** The unified, ranked weakness profile across EVERY capture pipeline,
 *  deduped by position (coach-caught) and by cluster key (analysis). Coach-
 *  caught rows win the position dedup (they carry the richer "why" context);
 *  Analyze positions already represented in a misconception are dropped so
 *  nothing is counted twice. openingWeakSpots, classifiedTactics and the
 *  conversion detector are all folded in here so no captured signal is dead.
 *  Ranked by open/due count, then severity, then recency. */
export async function getUnifiedWeaknessProfile(): Promise<UnifiedWeakness[]> {
  const [misAgg, allMis, mistakes, weakSpots, tactics, games, heatmap] = await Promise.all([
    getMisconceptionProfile(),
    db.misconceptionTags.toArray(),
    db.mistakePuzzles.toArray(),
    db.openingWeakSpots.toArray(),
    db.classifiedTactics.toArray(),
    db.games.toArray(),
    getSquareHeatmap(),
  ]);

  const prefs = useAppStore.getState().activeProfile?.preferences;
  const conversions = detectConversionFailures(games, {
    lichessUsername: prefs?.lichessUsername,
    chessComUsername: prefs?.chessComUsername,
  });

  const coachKeys = new Set(allMis.map((m) => posKey(m.fen, m.playedSan)));
  const coachRows = misAgg.map(fromMisconception);
  const analysisRows = mergeByKey([
    ...aggregateMistakePuzzles(mistakes, coachKeys),
    ...aggregateClassifiedTactics(tactics),
    ...aggregateOpeningWeakSpots(weakSpots),
    ...aggregateConversionFailures(conversions),
    ...aggregateBoardVision(heatmap),
  ]);

  const merged = [...coachRows, ...analysisRows];
  merged.sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return b.lastSeenAt - a.lastSeenAt;
  });
  return merged;
}
