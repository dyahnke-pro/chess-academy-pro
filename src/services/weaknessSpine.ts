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

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { getMisconceptionProfile, type MisconceptionAggregate } from './misconceptionService';
import { detectConversionFailures, resolvePlayerColor, type ConversionFailure } from './conversionDetector';
import { classifyEndgameType, endgameTypeInfo, type EndgameType } from './endgameProfileService';
import { computeMustDefend } from './threatOut';
import { describeStructure } from './boardStructure';
import { getAddressedConversions } from './conversionProgress';
import { detectTimeTrouble, type TimeTroubleHit } from './timeTroubleDetector';
import { getSquareHeatmap, type SquareHeatmapEntry } from './findSquareService';
import { useAppStore } from '../stores/appStore';
import type { MisconceptionBucket } from '../data/misconceptionTags';
import type { ClassifiedTactic, MistakePuzzle, MistakeGamePhase, OpeningWeakSpot, TacticType, GameRecord } from '../types';

/** A weak spot not re-drilled within this window is "open" again. */
const WEAKSPOT_STALE_MS = 3 * 24 * 60 * 60 * 1000;
const CONVERSION_TAG = 'analysis:conversion';
const BOARD_VISION_TAG = 'analysis:boardvision';
const TIME_TROUBLE_TAG = 'analysis:timetrouble';
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
  /** A single position to drill (conversion: the winning peak FEN). Lets the
   *  rep deep-link into "play out this position" without carrying positions. */
  fen?: string;
}

/** Position identity for dedup: piece placement + side + castling + ep
 *  (drop the half/full-move counters) plus the played SAN. Two records
 *  with the same key describe the same mistake. */
function posKey(fen: string, san?: string): string {
  const core = fen.split(' ').slice(0, 4).join(' ');
  return `${core}|${san ?? ''}`;
}

const MISSED_THREAT_TAG = 'analysis:missed-threat';
const STRUCTURE_DAMAGE_TAG = 'analysis:structure-damage';
/** The opponent's null-move net (points) that marks a REAL standing threat the
 *  student was on move to answer. 3 = a minor piece; below that is noise. */
const MISSED_THREAT_MIN_NET = 3;

const colorChar = (c: 'white' | 'black'): 'w' | 'b' => (c === 'white' ? 'w' : 'b');

// The two board probes are pure functions of (fen, playedSan); bucketForMistake
// runs on every mistake across several hot paths (unified profile, lifecycle,
// drill queue), so memoize the expensive board work per position+move.
const _threatMemo = new Map<string, boolean>();
const _structMemo = new Map<string, boolean>();

/** A1 — MISSED OPPONENT THREAT / prophylaxis (David 2026-09-01 Batch A). In the
 *  position the student was ON MOVE to answer, the OPPONENT already had a
 *  standing threat to win >= a minor (threatOut null-move probe, SEE-verified) —
 *  so this slip is "you didn't see what they were threatening", NOT "your move
 *  hung a piece". Only fires when the student is genuinely the side to move. */
function mistakeMissedThreat(p: MistakePuzzle): boolean {
  const key = `${p.fen}|${p.playerMoveSan ?? ''}`;
  const memo = _threatMemo.get(key);
  if (memo !== undefined) return memo;
  let hit = false;
  try {
    const stm = new Chess(p.fen).turn();
    if (stm === colorChar(p.playerColor)) hit = computeMustDefend(p.fen, stm).net >= MISSED_THREAT_MIN_NET;
  } catch { hit = false; }
  _threatMemo.set(key, hit);
  return hit;
}

/** A3 — SELF-INFLICTED STRUCTURE DAMAGE (David 2026-09-01 Batch A). The
 *  student's PLAYED move worsened their OWN pawn structure — a new isolated pawn
 *  or a fresh doubled file (boardStructure, pure geometry). It's a mistake
 *  puzzle, so the engine already judged there was no compensation. */
function mistakeStructureDamage(p: MistakePuzzle): boolean {
  const key = `${p.fen}|${p.playerMoveSan ?? ''}`;
  const memo = _structMemo.get(key);
  if (memo !== undefined) return memo;
  let hit = false;
  try {
    if (p.playerMoveSan) {
      const c = colorChar(p.playerColor);
      const before = describeStructure(p.fen);
      const g = new Chess(p.fen);
      g.move(p.playerMoveSan);
      const after = describeStructure(g.fen());
      if (before && after) {
        const badness = (s: NonNullable<ReturnType<typeof describeStructure>>): number =>
          s.pawns.isolatedPawns[c].length + s.pawns.doubledFiles[c].length;
        hit = badness(after) > badness(before);
      }
    }
  } catch { hit = false; }
  _structMemo.set(key, hit);
  return hit;
}

/** Refine an untagged opening/middlegame mistake (no tactic/transform motif)
 *  into a specific weakness when a board probe names one — a missed opponent
 *  threat, or self-inflicted structure damage — instead of the vague "mistakes
 *  in the middlegame". Threat first (more urgent), then structure. Null when
 *  neither fires (keeps the generic phase label). Board-verified, conservative. */
function refineNonTacticalMistake(p: MistakePuzzle): { bucket: MisconceptionBucket; clusterId: string; label: string; themes: string[] } | null {
  if (mistakeMissedThreat(p)) return { bucket: 'general', clusterId: MISSED_THREAT_TAG, label: 'Missed opponent threats', themes: [] };
  if (mistakeStructureDamage(p)) return { bucket: 'positional', clusterId: STRUCTURE_DAMAGE_TAG, label: 'Self-inflicted pawn weaknesses', themes: [] };
  return null;
}

/** Coarse, HONEST mapping from a mistakePuzzle to a weakness bucket. We do
 *  NOT force-fit Analyze mistakes into specific misconception tags (that
 *  would be guessing which thinking-error caused the slip — see CLAUDE.md
 *  "when unsure, don't guess"). We cluster by tactic motif when the
 *  detector gave one, else by game phase. */
export function bucketForMistake(p: MistakePuzzle): { bucket: MisconceptionBucket; clusterId: string; label: string; themes: string[] } {
  // Position-transformation (trade) errors are their own POSITIONAL weakness
  // (Phase 4), not a generic phase cluster.
  if (p.positionalMotif) {
    return {
      bucket: 'positional',
      clusterId: `analysis:transform:${p.positionalMotif}`,
      label: p.positionalMotif === 'unfavorable-trade' ? 'Unfavorable trades' : 'Missed favorable trades',
      themes: [],
    };
  }
  if (p.tacticType) {
    return {
      bucket: 'tactical',
      clusterId: `analysis:tactic:${p.tacticType}`,
      label: `Missed ${tacticLabel(p.tacticType)}`,
      themes: themesForTactic(p.tacticType),
    };
  }
  const phase: MistakeGamePhase = p.gamePhase;
  if (phase === 'opening') {
    // Refine before the generic label — a missed threat / structure damage in
    // the opening is still that, and more teachable than "mistakes in the opening".
    return refineNonTacticalMistake(p) ?? { bucket: 'opening', clusterId: 'analysis:phase:opening', label: 'Mistakes in the opening', themes: [] };
  }
  if (phase === 'endgame') {
    // TYPE the ending (David 2026-09-01: "which endgame the user is weakest at")
    // so the whole weakness system — unified profile, lifecycle, briefing, drills
    // — speaks the specific ending (rook, K+P, …) instead of a flat "endgame".
    // Unclassifiable positions keep the generic bucket (empty > wrong label).
    const type = classifyEndgameType(p.fen);
    if (type !== 'other') {
      const label = endgameTypeInfo(type).label;
      return { bucket: 'endgame', clusterId: `analysis:endgame-type:${type}`, label: label.charAt(0).toUpperCase() + label.slice(1), themes: [] };
    }
    return { bucket: 'endgame', clusterId: 'analysis:phase:endgame', label: 'Mistakes in the endgame', themes: [] };
  }
  // Middlegame — the vaguest, most common bucket. Refine into a missed threat /
  // structure damage when a board probe names one; else the generic label.
  return refineNonTacticalMistake(p) ?? { bucket: 'general', clusterId: 'analysis:phase:middlegame', label: 'Mistakes in the middlegame', themes: [] };
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
export function themesForTactic(t: TacticType): string[] {
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
export function aggregateConversionFailures(failures: ConversionFailure[], games: GameRecord[] = []): UnifiedWeakness[] {
  if (failures.length === 0) return [];
  const toRow = (key: string, label: string, rows: ConversionFailure[]): UnifiedWeakness => {
    const lastSeenAt = rows.reduce((m, f) => Math.max(m, f.date ? Date.parse(f.date) || 0 : 0), 0);
    const avgPeak = Math.round(rows.reduce((s, f) => s + f.peakCp, 0) / rows.length);
    return {
      key, tag: key, label, bucket: 'general',
      openCount: rows.length, total: rows.length,
      severity: Math.min(95, rows.length * 12 + Math.round(avgPeak / 60)),
      sources: ['analysis'], puzzleThemes: [],
      positions: rows.slice(0, 8).map((f) => ({ fen: f.fen, openingId: f.openingName ?? undefined })),
      lastSeenAt,
      fen: rows[0]?.fen, // the most-recent blown win — drill this one
    };
  };
  // A2 — SPLIT BY ENDING TYPE (David 2026-09-01 Batch A): a thrown win in a rook
  // ending is a nameable, drillable weakness ("converting rook endings") that
  // routes to the endgame lesson — distinct from a general middlegame collapse.
  // Classify at the game's FINAL position (where the conversion actually failed);
  // failures with no classifiable ending fold into the flat conversion row.
  const gameById = new Map(games.map((g) => [g.id, g]));
  const byType = new Map<EndgameType, ConversionFailure[]>();
  const generic: ConversionFailure[] = [];
  for (const f of failures) {
    let type: EndgameType = 'other';
    const g = gameById.get(f.gameId);
    if (g?.pgn) { try { const c = new Chess(); c.loadPgn(g.pgn); type = classifyEndgameType(c.fen()); } catch { type = 'other'; } }
    if (type !== 'other') { const arr = byType.get(type) ?? []; arr.push(f); byType.set(type, arr); }
    else generic.push(f);
  }
  const out: UnifiedWeakness[] = [];
  for (const [type, rows] of byType) {
    const label = endgameTypeInfo(type).label;
    out.push(toRow(`analysis:conversion-endgame:${type}`, `Converting ${label}`, rows));
  }
  if (generic.length > 0) out.push(toRow(CONVERSION_TAG, 'Letting winning positions slip', generic));
  return out;
}

/** CAPTURE GAP (Part III, David 2026-09-01: "if you see us missing something,
 *  PLEASE ADD"). Errors made specifically against STRONGER opponents — the
 *  "you tense up against higher-rated players" pattern the other captures miss.
 *  Cross-refs each mistake to its game's Elos (via resolvePlayerColor) and only
 *  surfaces when the vs-stronger error rate is notably ELEVATED over the
 *  vs-equal/weaker rate AND there's something open to drill. Honest floor —
 *  empty when the sample is thin or the pattern isn't real. */
export function aggregateStrongerOpponentErrors(
  mistakes: MistakePuzzle[],
  games: GameRecord[],
  names: { lichessUsername?: string; chessComUsername?: string },
  now: number = Date.now(),
): UnifiedWeakness[] {
  const gameById = new Map(games.map((g) => [g.id, g]));
  const vsStronger: MistakePuzzle[] = [];
  const strongerGames = new Set<string>();
  let otherErrors = 0;
  const otherGames = new Set<string>();
  for (const p of mistakes) {
    if (p.classification === 'inaccuracy') continue;
    const g = gameById.get(p.sourceGameId);
    if (!g) continue;
    const color = resolvePlayerColor(g, names) ?? p.playerColor;
    const myElo = color === 'white' ? g.whiteElo : g.blackElo;
    const oppElo = color === 'white' ? g.blackElo : g.whiteElo;
    if (myElo == null || oppElo == null) continue;
    if (oppElo - myElo >= 100) { vsStronger.push(p); strongerGames.add(g.id); }
    else { otherErrors += 1; otherGames.add(g.id); }
  }
  if (vsStronger.length < 4) return [];
  const open = vsStronger.filter((p) => p.status === 'unsolved').length;
  if (open === 0) return []; // nothing to act on → don't surface
  const strongerRate = vsStronger.length / Math.max(1, strongerGames.size);
  const otherRate = otherErrors / Math.max(1, otherGames.size);
  // Must be NOTABLY elevated (30%+) or there's no distinct pattern to name.
  if (strongerRate <= otherRate * 1.3) return [];
  const worstCp = Math.max(...vsStronger.map((p) => p.cpLoss));
  const lastSeenAt = vsStronger.reduce((m, p) => Math.max(m, Date.parse(p.gameDate ?? p.createdAt) || 0), 0) || now;
  return [{
    key: 'analysis:vs-stronger',
    tag: 'analysis:vs-stronger',
    label: 'Errors against stronger opponents',
    bucket: 'general',
    openCount: open,
    total: vsStronger.length,
    severity: Math.min(90, vsStronger.length * 6 + Math.round(worstCp / 30)),
    sources: ['analysis'],
    puzzleThemes: [],
    positions: vsStronger.slice(0, 8).map((p) => ({ fen: p.fen, playedSan: p.playerMoveSan, bestSan: p.bestMoveSan, openingId: p.openingName ?? undefined })),
    lastSeenAt,
  }];
}

/** Roll up blunders made in time trouble into one weakness, routed to timed
 *  practice. Sourced from the per-ply clock now captured on clocked games. */
export function aggregateTimeTrouble(hits: TimeTroubleHit[]): UnifiedWeakness[] {
  if (hits.length === 0) return [];
  return [{
    key: TIME_TROUBLE_TAG,
    tag: TIME_TROUBLE_TAG,
    label: 'Blunders in time trouble',
    bucket: 'general',
    openCount: hits.length,
    total: hits.length,
    severity: Math.min(95, hits.length * 10),
    sources: ['analysis'],
    puzzleThemes: [],
    positions: hits.slice(0, 8).map((h) => ({ fen: h.fen, openingId: undefined })),
    lastSeenAt: Date.now(),
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
  // The five direct store scans run inside ONE shared read transaction so they
  // don't fight over concurrent transient transactions. Five bare
  // `db.*.toArray()` in a Promise.all each open their own auto-transaction; on
  // iOS WebKit under memory pressure one commits while another's cursor is
  // mid-iteration → "Attempt to iterate a cursor that doesn't exist" /
  // "…without an in-progress transaction" / "Transaction aborted" (PostHog
  // unhandled-rejection on capacitor://…/weaknesses). Same fix pattern as
  // coachContextSnapshot.buildCoachContextSnapshot. The three aggregate helpers
  // manage their own transactions and stay concurrent.
  // getMisconceptionProfile reads db.misconceptionTags — the SAME store the
  // shared transaction scans — so running it as a separate concurrent branch
  // raced two cursors on one store ("Attempt to iterate a cursor that doesn't
  // exist", the same class fixed in computeWeaknessProfile; David 2026-08-26
  // self-audit). It now runs INSIDE the shared transaction (misconceptionTags
  // is already in the store list, so it joins the ambient tx). getSquareHeatmap
  // (findSquareAttempts) and getAddressedConversions (meta) read OTHER stores,
  // so they stay concurrent without competing on the transaction's cursors.
  const [direct, heatmap, addressedConv] = await Promise.all([
    db.transaction(
      'r',
      [db.misconceptionTags, db.mistakePuzzles, db.openingWeakSpots, db.classifiedTactics, db.games],
      async () => {
        const [misAgg, allMis, mistakes, weakSpots, tactics, games] = await Promise.all([
          getMisconceptionProfile({ countedOnly: true }),
          db.misconceptionTags.toArray(),
          db.mistakePuzzles.toArray(),
          db.openingWeakSpots.toArray(),
          db.classifiedTactics.toArray(),
          db.games.toArray(),
        ]);
        return { misAgg, allMis, mistakes, weakSpots, tactics, games };
      },
    ),
    getSquareHeatmap(),
    getAddressedConversions(),
  ]);
  const { misAgg, allMis, mistakes, weakSpots, tactics, games } = direct;

  const prefs = useAppStore.getState().activeProfile?.preferences;
  const conversions = detectConversionFailures(games, {
    lichessUsername: prefs?.lichessUsername,
    chessComUsername: prefs?.chessComUsername,
  }).filter((c) => !addressedConv.has(c.fen.split(' ').slice(0, 4).join(' ')));

  const coachKeys = new Set(allMis.map((m) => posKey(m.fen, m.playedSan)));
  const coachRows = misAgg.map(fromMisconception);
  const analysisRows = mergeByKey([
    ...aggregateMistakePuzzles(mistakes, coachKeys),
    ...aggregateClassifiedTactics(tactics),
    ...aggregateOpeningWeakSpots(weakSpots),
    ...aggregateConversionFailures(conversions, games),
    ...aggregateBoardVision(heatmap),
    ...aggregateTimeTrouble(detectTimeTrouble(games, mistakes)),
    ...aggregateStrongerOpponentErrors(mistakes, games, {
      lichessUsername: prefs?.lichessUsername,
      chessComUsername: prefs?.chessComUsername,
    }),
  ]);

  const merged = [...coachRows, ...analysisRows];
  merged.sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return b.lastSeenAt - a.lastSeenAt;
  });
  return merged;
}
