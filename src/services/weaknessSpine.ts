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
import { getMisconceptionProfile, isMisconceptionDue, type MisconceptionAggregate } from './misconceptionService';
import { FUNDAMENTAL_IDS, FUNDAMENTAL_TAG, type FundamentalId } from './principleAttribution';
import { FUNDAMENTAL_LABEL } from './fundamentalsCatalog';
import { getMisconceptionTag } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';
import { detectConversionFailures, resolvePlayerColor, type ConversionFailure } from './conversionDetector';
import { classifyEndgameType, endgameTypeInfo, type EndgameType } from './endgameProfileService';
import { computeMustDefend } from './threatOut';
import { describeStructure } from './boardStructure';
import { getAddressedConversions } from './conversionProgress';
import { detectTimeTrouble, type TimeTroubleHit } from './timeTroubleDetector';
import { getSquareHeatmap, type SquareHeatmapEntry } from './findSquareService';
import { aggregateBookDepartures } from './bookDepartureWeakness';
import { getCachedBookDepartureRows } from './bookDeparturePrecompute';
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

/** WHERE A SIGNAL CAME FROM — one shape on EVERY source (David 2026-09-16,
 *  capability parity: "if tactics and puzzles have something so should
 *  everything else").
 *
 *  `MistakePuzzle` and `ClassifiedTactic` have carried `opponentName` +
 *  `gameDate` all along and the spine threw them away, so no surface could say
 *  "you met this against X thirteen days ago" — and the six other sources never
 *  had them at all. This is that capability defined once, so review, drills,
 *  custom lessons, the transfer beat and the insight bucket all gain it at the
 *  same moment instead of one tab at a time.
 *
 *  A DRILL has no opponent and that is not a gap: `origin: 'drill'` is the
 *  honest answer, and it is why this is a discriminated shape rather than three
 *  optional fields nobody fills. */
export interface WeaknessProvenance {
  origin: 'game' | 'drill';
  gameId?: string;
  /** Who they were playing. null when the source knows the game but not the
   *  name; undefined when there is no game at all. */
  opponentName?: string | null;
  /** ms — when the game was PLAYED. NEVER the capture clock: on an imported
   *  archive `createdAt` is the day they hit Import, so every slip in a
   *  three-year archive would read "earlier today". `weaknessLifecycle` already
   *  anchors on the play clock for exactly this reason. */
  playedAt?: number;
}

/** One of the student's own positions, with its provenance ATTACHED.
 *  `from` is REQUIRED on purpose — a new weakness source fails to compile until
 *  someone decides where its positions came from, which is the only version of
 *  this rule that cannot quietly rot back (CLAUDE.md capability parity). */
export interface WeaknessPosition {
  fen: string;
  playedSan?: string;
  bestSan?: string;
  openingId?: string;
  from: WeaknessProvenance;
}

/** ms from a stored date string, or undefined when absent/unparseable — never a
 *  fabricated "now" (a guessed timestamp is a lie the student would hear). */
export function playedAtMs(date: string | null | undefined): number | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  return Number.isFinite(t) ? t : undefined;
}

/** gameId → who they played and when, resolved ONCE from the games table for
 *  the sources that carry a gameId but not the names (conversion, time trouble,
 *  book departures). Built inside the profile's existing shared read
 *  transaction, so it is a Map lookup and costs no extra I/O. */
export type GameProvenanceIndex = ReadonlyMap<string, { opponentName: string | null; playedAt?: number }>;

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
  positions: WeaknessPosition[];
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
    checkmate: 'checkmates',
    tactical_sequence: 'tactical sequences',
  };
  return map[t] ?? t.replace(/_/g, ' ');
}

/** Map our snake_case TacticType to puzzles.json (Lichess) camelCase theme
 *  ids so the tag's drill can pull matching tactical reps. Unmapped motifs
 *  return [] (no themed pool) rather than a guessed theme. */
/**
 * A DETECTED TACTIC -> THE PUZZLE CORPUS'S OWN WORDS FOR IT.
 *
 * Exhaustive `Record`, NOT `Partial` (CLAUDE.md, the rot rule): a new
 * `TacticType` must fail to compile until someone decides which corpus themes
 * drill it. It was `Partial` and two entries named themes the corpus does not
 * have, so those weaknesses drilled to ZERO puzzles while every test stayed
 * green — the `discovery` / `discovered_attack` failure wearing a new hat: the
 * computer TEACHES the tactic and silently cannot DRILL it.
 *
 * Measured against `puzzles.json` (15,000 puzzles, 72 distinct themes). NB a
 * hand census of the union first read 16 members; the exhaustive Record found
 * 18 — `checkmate` and `tactical_sequence` — which is the whole point of it.
 *   - `zwischenzug` -> the corpus calls it `intermezzo` (211 puzzles).
 *   - `overloaded_piece` -> the corpus has no `overloadedPiece`; the idea is
 *     filed as `capturingDefender` (133) and `deflection` (719).
 * Gate: `drillVocabulary.test.ts` re-derives the vocabulary from the corpus and
 * fails on any theme named here that no puzzle carries, so this cannot rot back.
 */
export function themesForTactic(t: TacticType): string[] {
  const map: Record<TacticType, string[]> = {
    fork: ['fork'], pin: ['pin'], skewer: ['skewer'], hanging_piece: ['hangingPiece'],
    discovered_attack: ['discoveredAttack'], double_check: ['doubleCheck'],
    back_rank: ['backRankMate'], deflection: ['deflection'], promotion: ['promotion', 'advancedPawn'],
    overloaded_piece: ['capturingDefender', 'deflection'], trapped_piece: ['trappedPiece'],
    clearance: ['clearance'], interference: ['interference'], zwischenzug: ['intermezzo'],
    x_ray: ['xRayAttack'], removing_the_guard: ['defensiveMove'],
    checkmate: ['mate', 'mateIn1', 'mateIn2'],
    // A multi-move combination. Same join the `calculation-depth` tag already
    // uses (`long` 4,382 / `veryLong` 1,297 puzzles) — reused, not invented.
    // Was UNMAPPED under `Partial` and fell through to [] for every student.
    tactical_sequence: ['long', 'veryLong'],
  };
  return map[t];
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
        from: {
          origin: 'game' as const,
          gameId: r.sourceGameId,
          opponentName: r.opponentName,
          playedAt: playedAtMs(r.gameDate),
        },
      })),
      lastSeenAt: rows[0] ? Date.parse(rows[0].createdAt) || 0 : 0,
    });
  }
  return out;
}

/** Cluster-id prefix for the per-FUNDAMENTAL rows below. A weakness signal whose
 *  `clusterId` starts with this is a fundamental, joined by `weaknessSignal`'s
 *  `matchFundamental` / `matchClauseKind('fundamental')`. */
export const FUNDAMENTAL_CLUSTER_PREFIX = 'fundamental:';
export function fundamentalClusterId(id: FundamentalId): string {
  return `${FUNDAMENTAL_CLUSTER_PREFIX}${id}`;
}
const FUNDAMENTAL_ID_SET: ReadonlySet<string> = new Set<string>(FUNDAMENTAL_IDS);

/**
 * 🔒 THE FUNDAMENTAL THE COMPUTER PROVED REACHES THE RANKER (A-NEW, measured
 * 2026-09-19 on 47 real amateur games: 154 flagged moves, 79 carrying an
 * attributed `fundamentalId`, and the spine read ZERO of them).
 *
 * Why zero: batch analysis (`autoAnalyzeGameMisconceptions`) writes every row
 * `counted: false` so the misconception TALLY does not double-count the same
 * game's `mistakePuzzles` — a correct guard for the TAG, and WO-3's file. But
 * `fundamentalId` lives ONLY on those rows (a `MistakePuzzle` carries none), so
 * the one gate silenced a different dimension entirely: the Fundamentals tab
 * said "loose piece 19×" while the ranker deciding what to teach next had never
 * heard of it. The loop, not closing, one layer below the heat map.
 *
 * The fix is NOT to flip `counted` (that reopens the tag double-count). It is
 * this reader: aggregate `fundamentalId` over ALL rows the way the scorecard's
 * `getFundamentalCounts` already does, into its OWN rows keyed
 * `fundamental:<id>`, so the fundamental counts once and the tag rows are left
 * exactly as they were. Bucket and drill themes come from the fundamental's own
 * closed-set tag (`FUNDAMENTAL_TAG`, exhaustive by type) — the same join the
 * recording path used to file it, never a second table.
 */
export function aggregateFundamentals(rows: readonly MisconceptionTagRecord[], gameIndex?: GameProvenanceIndex): UnifiedWeakness[] {
  const now = Date.now();
  const groups = new Map<FundamentalId, MisconceptionTagRecord[]>();
  for (const r of rows) {
    const fid = r.fundamentalId;
    if (!fid || !FUNDAMENTAL_ID_SET.has(fid)) continue; // stale / unknown ids never invent a row
    const id = fid as FundamentalId;
    const arr = groups.get(id);
    if (arr) arr.push(r);
    else groups.set(id, [r]);
  }
  const out: UnifiedWeakness[] = [];
  for (const [id, recs] of groups) {
    recs.sort((a, b) => b.createdAt - a.createdAt);
    const def = getMisconceptionTag(FUNDAMENTAL_TAG[id]);
    const openCount = recs.filter((r) => isMisconceptionDue(r, now)).length;
    const sources: ('coach' | 'analysis')[] = [];
    if (recs.some((r) => r.counted !== false)) sources.push('coach');
    if (recs.some((r) => r.counted === false)) sources.push('analysis');
    out.push({
      key: fundamentalClusterId(id),
      tag: fundamentalClusterId(id),
      label: FUNDAMENTAL_LABEL[id],
      bucket: def?.bucket ?? 'uncategorized',
      openCount,
      total: recs.length,
      severity: Math.min(95, openCount * 12 + recs.length * 3),
      sources,
      puzzleThemes: def?.drill.puzzleThemes ?? [],
      positions: recs.slice(0, 8).map((e) => ({
        from: {
          origin: 'game' as const,
          ...(e.sourceGameId ? { gameId: e.sourceGameId } : {}),
          ...(e.sourceGameId && gameIndex?.has(e.sourceGameId)
            ? {
                opponentName: gameIndex.get(e.sourceGameId)?.opponentName ?? null,
                playedAt: gameIndex.get(e.sourceGameId)?.playedAt,
              }
            : {}),
        },
        fen: e.fen,
        playedSan: e.playedSan,
        bestSan: e.bestSan,
        openingId: e.openingId,
      })),
      lastSeenAt: recs[0]?.createdAt ?? 0,
    });
  }
  return out;
}

/** Convert a misconception aggregate into the unified shape. */
function fromMisconception(a: MisconceptionAggregate, gameIndex?: GameProvenanceIndex): UnifiedWeakness {
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
    // ✅ THE GAME LINK LANDED (2026-09-19). This used to read "we simply
    // cannot say which game" and fill a bare `origin: 'game'` — the biggest
    // capability-parity hole in the spine, because these are the COACH'S OWN
    // captures, the richest signal in the app. The cause was not the record
    // shape: `MisconceptionTagRecord.sourceGameId` existed and
    // `captureMisconception` always forwarded it — the LIVE capture sites just
    // never passed one, because Learn minted its game id at SAVE time, after
    // every slip had already been written. The id is now minted by
    // `learnMemory` when the game begins and both the slips and the saved
    // GameRecord carry it.
    //
    // Still honest about what it does not know: a row captured before this
    // landed, or from a surface with no game, has no `sourceGameId`, and those
    // fields stay undefined rather than guessed.
    positions: a.examples.map((e) => ({
      from: {
        origin: 'game' as const,
        ...(e.sourceGameId ? { gameId: e.sourceGameId } : {}),
        ...(e.sourceGameId && gameIndex?.has(e.sourceGameId)
          ? {
              opponentName: gameIndex.get(e.sourceGameId)?.opponentName ?? null,
              playedAt: gameIndex.get(e.sourceGameId)?.playedAt,
            }
          : {}),
      },
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
      // A repertoire drill, not a game — 'drill' is the answer, not a gap.
      positions: rows.slice(0, 8).map((r) => ({ fen: r.fen, bestSan: r.correctMoveSan, openingId: r.openingId, from: { origin: 'drill' as const, playedAt: playedAtMs(r.lastFailedAt) } })),
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
      positions: rows.slice(0, 8).map((r) => ({ fen: r.fen, playedSan: r.playerMoveSan, bestSan: r.bestMoveSan, openingId: r.openingName ?? undefined, from: { origin: 'game' as const, opponentName: r.opponentName, playedAt: playedAtMs(r.gameDate) } })),
      lastSeenAt,
    });
  }
  return out;
}

/** Roll up blown-winning-position games into a single conversion weakness.
 *  PREVIOUSLY MISSING: per-move evals were stored but never scanned for the
 *  "was winning, didn't convert" pattern. */
export function aggregateConversionFailures(failures: ConversionFailure[], games: GameRecord[] = [], gameIndex?: GameProvenanceIndex): UnifiedWeakness[] {
  if (failures.length === 0) return [];
  const toRow = (key: string, label: string, rows: ConversionFailure[]): UnifiedWeakness => {
    const lastSeenAt = rows.reduce((m, f) => Math.max(m, f.date ? Date.parse(f.date) || 0 : 0), 0);
    const avgPeak = Math.round(rows.reduce((s, f) => s + f.peakCp, 0) / rows.length);
    return {
      key, tag: key, label, bucket: 'general',
      openCount: rows.length, total: rows.length,
      severity: Math.min(95, rows.length * 12 + Math.round(avgPeak / 60)),
      sources: ['analysis'], puzzleThemes: [],
      positions: rows.slice(0, 8).map((f) => ({
        fen: f.fen,
        openingId: f.openingName ?? undefined,
        from: {
          origin: 'game' as const,
          gameId: f.gameId,
          opponentName: gameIndex?.get(f.gameId)?.opponentName ?? null,
          playedAt: playedAtMs(f.date) ?? gameIndex?.get(f.gameId)?.playedAt,
        },
      })),
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
    positions: vsStronger.slice(0, 8).map((p) => ({ fen: p.fen, playedSan: p.playerMoveSan, bestSan: p.bestMoveSan, openingId: p.openingName ?? undefined, from: { origin: 'game' as const, gameId: p.sourceGameId, opponentName: p.opponentName, playedAt: playedAtMs(p.gameDate) } })),
    lastSeenAt,
  }];
}

/** Roll up blunders made in time trouble into one weakness, routed to timed
 *  practice. Sourced from the per-ply clock now captured on clocked games. */
export function aggregateTimeTrouble(hits: TimeTroubleHit[], gameIndex?: GameProvenanceIndex): UnifiedWeakness[] {
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
    positions: hits.slice(0, 8).map((h) => ({
      fen: h.fen,
      openingId: undefined,
      from: {
        origin: 'game' as const,
        gameId: h.gameId,
        opponentName: gameIndex?.get(h.gameId)?.opponentName ?? null,
        playedAt: gameIndex?.get(h.gameId)?.playedAt,
      },
    })),
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
  const names = { lichessUsername: prefs?.lichessUsername, chessComUsername: prefs?.chessComUsername };
  const conversions = detectConversionFailures(games, names)
    .filter((c) => !addressedConv.has(c.fen.split(' ').slice(0, 4).join(' ')));

  // BOOK DEPARTURES (Phase 3) — read the precomputed, cost-gated departures from
  // the meta cache (cheap; a background refresh fires when stale). Rating scales
  // the "too early / costly" gate. Async findTheoryDeparture never runs on this
  // hot path — only the cache read does.
  const studentRating = useAppStore.getState().activeProfile?.currentRating
    ?? useAppStore.getState().activeProfile?.puzzleRating ?? 1200;
  const bookRows = await getCachedBookDepartureRows(games, names, studentRating);

  // THE GAME INDEX (capability parity, David 2026-09-16). Resolved ONCE, here,
  // where the student's usernames are known — so the sources that carry a gameId
  // but not the names (conversion, time trouble, book departures) get the same
  // "who and when" the mistake/tactic rows have always had. `games` is already
  // in hand from the shared read transaction above, so this is pure arithmetic:
  // no extra I/O, no second transaction (see the iOS WebKit cursor note above).
  const gameIndex: Map<string, { opponentName: string | null; playedAt?: number }> = new Map();
  for (const g of games) {
    const color = resolvePlayerColor(g, names);
    // Unknown colour → unknown opponent, NOT a guess: naming the wrong player is
    // worse than naming none (empty > generic > invented).
    const opponentName = color === 'white' ? g.black : color === 'black' ? g.white : null;
    gameIndex.set(g.id, { opponentName: opponentName ?? null, playedAt: playedAtMs(g.date) });
  }
  const opponentFor = (gameId: string): string | null => gameIndex.get(gameId)?.opponentName ?? null;

  // 🔒 THE EXCLUSION SET IS THE ROWS THE COACH HALF REPRESENTS — NOT EVERY ROW
  // (found 2026-09-19 under A-NEW). `coachRows` is built from the counted rows
  // only (`countedOnly: true`), but this set used to be built from ALL rows —
  // including the `counted: false` ones batch analysis writes for every
  // blunder it ALSO persists as a `mistakePuzzle` at the same fen + move
  // (`autoAnalyzeGame.persistMistakePuzzlesForBlunders`). So the puzzle twin
  // was excluded HERE as "already owned by the coach" while its misconception
  // row was excluded THERE as "not counted": every batch-analyzed slip since
  // 2026-06-11 vanished from the unified profile on both sides at once. The
  // dedupe is right for a slip the coach half actually shows; a row the coach
  // half filtered out owns nothing.
  const coachKeys = new Set(allMis.filter((m) => m.counted !== false).map((m) => posKey(m.fen, m.playedSan)));
  const coachRows = misAgg.map((a) => fromMisconception(a, gameIndex));
  // The per-fundamental rows read EVERY row (counted or not) — see
  // aggregateFundamentals. They are a finer dimension beside the tag rows, keyed
  // apart (`fundamental:<id>`), so nothing here changes a tag's count.
  const fundamentalRows = aggregateFundamentals(allMis, gameIndex);
  const analysisRows = mergeByKey([
    ...aggregateMistakePuzzles(mistakes, coachKeys),
    ...aggregateClassifiedTactics(tactics),
    ...aggregateOpeningWeakSpots(weakSpots),
    ...aggregateConversionFailures(conversions, games, gameIndex),
    ...aggregateBoardVision(heatmap),
    ...aggregateTimeTrouble(detectTimeTrouble(games, mistakes), gameIndex),
    ...aggregateStrongerOpponentErrors(mistakes, games, names),
    ...aggregateBookDepartures(bookRows, studentRating, opponentFor),
  ]);

  const merged = [...coachRows, ...fundamentalRows, ...analysisRows];
  merged.sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return b.lastSeenAt - a.lastSeenAt;
  });
  return merged;
}
