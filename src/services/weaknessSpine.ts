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
import type { MisconceptionBucket } from '../data/misconceptionTags';
import type { MistakePuzzle, MistakeGamePhase, TacticType } from '../types';

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

/** The unified, ranked weakness profile across BOTH capture pipelines,
 *  deduped by position. Coach-caught rows win the dedup (they carry the
 *  richer "why" context); Analyze positions already represented in a
 *  misconception are dropped so nothing is counted twice. Ranked by
 *  open/due count, then severity, then recency. */
export async function getUnifiedWeaknessProfile(): Promise<UnifiedWeakness[]> {
  const [misAgg, allMis, mistakes] = await Promise.all([
    getMisconceptionProfile(),
    db.misconceptionTags.toArray(),
    db.mistakePuzzles.toArray(),
  ]);

  const coachKeys = new Set(allMis.map((m) => posKey(m.fen, m.playedSan)));
  const coachRows = misAgg.map(fromMisconception);
  const analysisRows = aggregateMistakePuzzles(mistakes, coachKeys);

  const merged = [...coachRows, ...analysisRows];
  merged.sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return b.lastSeenAt - a.lastSeenAt;
  });
  return merged;
}
