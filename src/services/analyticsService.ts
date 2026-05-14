/**
 * analyticsService — typed query layer over the existing audit log.
 *
 * Why this exists. `appAuditor.ts` is mature: 100+ AuditKinds,
 * Dexie-persisted, audit-stream pipe, global error hooks. But it
 * surfaces only as `getAppAuditLog(): Promise<AuditEntry[]>` —
 * a forensic stream, not a metrics pipe. Code consumers (the
 * coach brain, weakness/strength reports, in-app analytics panel)
 * want typed answers like "how many hints in the last 7 days"
 * or "what's the average position-dwell in the middlegame", not
 * raw rows.
 *
 * Design rules:
 * - Read-only. Never writes to the log. Emit sites own that.
 * - Single source of truth. Reads `getAppAuditLog()` once per
 *   call (the log is in-memory + Dexie-cached, so cheap).
 * - Graceful on empty. Every function returns a defined shape
 *   with zero samples / empty counts on a fresh profile.
 * - Typed details. Helpers parse the JSON `details` field on the
 *   Tier 1 / 2 kinds and return shape-typed payloads. Untyped
 *   rows are skipped silently; legacy rows without the new
 *   structure don't break queries.
 *
 * Companion docs: ANALYTICS_AUDIT.md. The build plan there maps
 * each query function to the emit sites that feed it.
 */
import { getAppAuditLog, type AuditEntry, type AuditKind } from './appAuditor';
import { db } from '../db/schema';
import { getOverviewInsights, getOpeningInsights } from './gameInsightsService';
import type {
  GamePhase,
  TacticType,
  GameRecord,
  MoveClassification,
} from '../types';

// ─── Structured emit payloads ────────────────────────────────────────
//
// Every emit site that targets a Tier 1-5 kind should stringify one
// of these into the AuditEntry.details field. Stable across surfaces
// so the joins in this service Just Work.

export type HintRevealReason = 'student-tap' | 'auto-reveal' | 'coach-initiative';
export type MoveMethod = 'drag' | 'click' | 'unknown';
export type DwellExitReason = 'moved' | 'navigated' | 'session-end';

export interface MoveAttemptPayload {
  surface: string;          // 'puzzle' | 'walkthrough-findmove' | 'endgame' | 'coach-play' | ...
  fen: string;
  attemptedSan: string;
  correctSan?: string | null;
  isCorrect: boolean;
  moveMethod: MoveMethod;
  timeFromPositionEnterMs?: number;
  sourceId?: string;        // puzzleId / lessonId / gameId
  tacticType?: TacticType;
  phase?: GamePhase;
}

export interface HintRevealedPayload {
  surface: string;
  reason: HintRevealReason;
  tier: 0 | 1 | 2 | 3;
  timeToRevealMs?: number;
  fen?: string;
  tacticType?: TacticType;
  phase?: GamePhase;
  openingEco?: string | null;
  sourceId?: string;
}

export interface PositionDwellPayload {
  surface: string;
  fen: string;
  dwellMs: number;
  exitReason: DwellExitReason;
  phase?: GamePhase;
}

export interface InsightsTabSwitchedPayload {
  fromTab: string;
  toTab: string;
}

export interface EngineLinesDwellPayload {
  durationMs: number;
  gameId?: string;
}

// ─── Window + helpers ──────────────────────────────────────────────────

export interface AnalyticsWindow {
  sinceMs: number;        // epoch ms; rows older than this are excluded
  nowMs?: number;         // override for testing; defaults to Date.now()
}

function nowOf(w: AnalyticsWindow): number {
  return w.nowMs ?? Date.now();
}

function withinWindow(entry: AuditEntry, w: AnalyticsWindow): boolean {
  return entry.timestamp >= w.sinceMs && entry.timestamp <= nowOf(w);
}

// The generic <T> only appears in the return type — by design. Callers
// pin the shape they expect (`parseDetails<HintRevealedPayload>(...)`)
// and get a typed null-or-shape back. The lint rule treats this as a
// smell ("only used once"), but the call-site usage IS the point.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function parseDetails<T>(entry: AuditEntry): T | null {
  if (!entry.details) return null;
  try {
    return JSON.parse(entry.details) as T;
  } catch {
    return null;
  }
}

/** Cheap memoization — every public query reads the log once. The
 *  audit log is in-memory cached in appAuditor so re-reads are
 *  near-free, but if a panel renders 6 queries in a row we still
 *  prefer one read over six. Per-call cache; resets on next public
 *  query. */
async function readLogCached(): Promise<AuditEntry[]> {
  return getAppAuditLog();
}

// ─── Recent hint activity ──────────────────────────────────────────────

export interface HintActivitySummary {
  count: number;
  byReason: Record<HintRevealReason, number>;
  byTactic: Partial<Record<TacticType, number>>;
  avgLatencyMs: number;
  /** Best-effort: hints followed by a CORRECT move-attempt on the
   *  same FEN within 60s. Returns 0 when no joinable move-attempts
   *  exist (today, until emit sites land). */
  effectivenessPct: number;
}

export async function recentHintActivity(w: AnalyticsWindow): Promise<HintActivitySummary> {
  const log = await readLogCached();
  const hints = log.filter(
    (e) => e.kind === 'hint-revealed' && withinWindow(e, w),
  );
  const attempts = log.filter(
    (e) => e.kind === 'move-attempt' && withinWindow(e, w),
  );

  const byReason: Record<HintRevealReason, number> = {
    'student-tap': 0,
    'auto-reveal': 0,
    'coach-initiative': 0,
  };
  const byTactic: Partial<Record<TacticType, number>> = {};
  let latencySum = 0;
  let latencySamples = 0;

  for (const h of hints) {
    const p = parseDetails<HintRevealedPayload>(h);
    if (!p) continue;
    byReason[p.reason] = byReason[p.reason] + 1;
    if (p.tacticType) {
      byTactic[p.tacticType] = (byTactic[p.tacticType] ?? 0) + 1;
    }
    if (typeof p.timeToRevealMs === 'number') {
      latencySum += p.timeToRevealMs;
      latencySamples++;
    }
  }

  // Effectiveness: for each hint, look for a move-attempt with
  // matching FEN within 60s after; count as "effective" if correct.
  const SIXTY_SECONDS = 60_000;
  let effective = 0;
  let joined = 0;
  for (const h of hints) {
    const hp = parseDetails<HintRevealedPayload>(h);
    if (!hp?.fen) continue;
    const next = attempts.find((a) => {
      if (a.timestamp <= h.timestamp) return false;
      if (a.timestamp - h.timestamp > SIXTY_SECONDS) return false;
      const ap = parseDetails<MoveAttemptPayload>(a);
      return ap?.fen === hp.fen;
    });
    if (!next) continue;
    joined++;
    const ap = parseDetails<MoveAttemptPayload>(next);
    if (ap?.isCorrect) effective++;
  }

  return {
    count: hints.length,
    byReason,
    byTactic,
    avgLatencyMs: latencySamples > 0 ? Math.round(latencySum / latencySamples) : 0,
    effectivenessPct: joined > 0 ? Math.round((effective / joined) * 100) : 0,
  };
}

// ─── Position dwell by phase ───────────────────────────────────────────

export interface DwellByPhase {
  opening: { avgMs: number; samples: number };
  middlegame: { avgMs: number; samples: number };
  endgame: { avgMs: number; samples: number };
}

export async function positionDwellByPhase(w: AnalyticsWindow): Promise<DwellByPhase> {
  const log = await readLogCached();
  const rows = log.filter(
    (e) => e.kind === 'position-dwell' && withinWindow(e, w),
  );

  const bins: Record<GamePhase, { sum: number; count: number }> = {
    opening: { sum: 0, count: 0 },
    middlegame: { sum: 0, count: 0 },
    endgame: { sum: 0, count: 0 },
  };

  for (const r of rows) {
    const p = parseDetails<PositionDwellPayload>(r);
    if (!p?.phase) continue;
    bins[p.phase].sum += p.dwellMs;
    bins[p.phase].count++;
  }

  const finalize = (b: { sum: number; count: number }): { avgMs: number; samples: number } => ({
    avgMs: b.count > 0 ? Math.round(b.sum / b.count) : 0,
    samples: b.count,
  });

  return {
    opening: finalize(bins.opening),
    middlegame: finalize(bins.middlegame),
    endgame: finalize(bins.endgame),
  };
}

// ─── Move attempts per puzzle ──────────────────────────────────────────

export interface MoveAttemptsSummary {
  /** Mean attempts per distinct sourceId. 0 when no data. */
  meanAttempts: number;
  /** [{ attempts: 1, count: 12 }, { attempts: 2, count: 4 }, ...] */
  distribution: { attempts: number; count: number }[];
  /** Attempts broken out by puzzle tactic. */
  byTactic: Partial<Record<TacticType, { attempts: number; meanAttempts: number }>>;
  /** % of distinct sources where the FIRST attempt was correct.
   *  Cross-surface "first-try mastery" strength signal. */
  firstTryCorrectPct: number;
}

export async function moveAttemptsPerPuzzle(w: AnalyticsWindow): Promise<MoveAttemptsSummary> {
  const log = await readLogCached();
  const rows = log.filter(
    (e) => e.kind === 'move-attempt' && withinWindow(e, w),
  );

  // Group attempts by sourceId; within each, sort by timestamp.
  type AttemptRecord = { ts: number; payload: MoveAttemptPayload };
  const bySource = new Map<string, AttemptRecord[]>();
  for (const r of rows) {
    const p = parseDetails<MoveAttemptPayload>(r);
    if (!p?.sourceId) continue;
    let arr = bySource.get(p.sourceId);
    if (!arr) {
      arr = [];
      bySource.set(p.sourceId, arr);
    }
    arr.push({ ts: r.timestamp, payload: p });
  }
  for (const arr of bySource.values()) arr.sort((a, b) => a.ts - b.ts);

  if (bySource.size === 0) {
    return {
      meanAttempts: 0,
      distribution: [],
      byTactic: {},
      firstTryCorrectPct: 0,
    };
  }

  const distCounts = new Map<number, number>();
  let totalAttempts = 0;
  let firstTryCorrect = 0;
  const tacticBins: Map<TacticType, { attempts: number; sources: number }> = new Map();

  for (const [, arr] of bySource) {
    const n = arr.length;
    distCounts.set(n, (distCounts.get(n) ?? 0) + 1);
    totalAttempts += n;
    if (arr[0]?.payload.isCorrect) firstTryCorrect++;

    // Attribute the whole puzzle's attempts to its tactic (uses
    // first attempt's tacticType — they should all match within a
    // single puzzle).
    const tt = arr[0]?.payload.tacticType;
    if (tt) {
      const bin = tacticBins.get(tt) ?? { attempts: 0, sources: 0 };
      bin.attempts += n;
      bin.sources++;
      tacticBins.set(tt, bin);
    }
  }

  const distribution = Array.from(distCounts.entries())
    .map(([attempts, count]) => ({ attempts, count }))
    .sort((a, b) => a.attempts - b.attempts);

  const byTactic: Partial<Record<TacticType, { attempts: number; meanAttempts: number }>> = {};
  for (const [tt, bin] of tacticBins) {
    byTactic[tt] = {
      attempts: bin.attempts,
      meanAttempts: bin.sources > 0 ? Number((bin.attempts / bin.sources).toFixed(2)) : 0,
    };
  }

  return {
    meanAttempts: bySource.size > 0 ? Number((totalAttempts / bySource.size).toFixed(2)) : 0,
    distribution,
    byTactic,
    firstTryCorrectPct: Math.round((firstTryCorrect / bySource.size) * 100),
  };
}

// ─── Surface coverage map ──────────────────────────────────────────────
//
// "Which surfaces are emitting which kinds, how often, when last."
// Powers the AnalyticsAuditPanel's coverage table — David's "show me
// the data flow" view. Surface = `entry.source` string (the
// convention every logAppAudit call already follows).

export interface SurfaceCoverageRow {
  surface: string;
  kindsEmitted: number;
  totalEvents: number;
  lastSeen: number | null;
  /** Distinct AuditKind values seen on this surface in the window. */
  kinds: string[];
}

export interface SurfaceCoverage {
  rows: SurfaceCoverageRow[];
  totalEvents: number;
  /** Surfaces from this list that emitted ZERO events in the window.
   *  Drives the red "no signal" rows in the panel. */
  silentSurfaces: string[];
}

/** The surfaces we expect to emit at least one event per active
 *  session. Used to flag "this surface is silent" warnings in the
 *  coverage view. Keep in sync with ANALYTICS_AUDIT.md §3. */
export const EXPECTED_SURFACES: readonly string[] = [
  'CoachGamePage',
  'CoachTeachPage',
  'CoachReviewSessionPage',
  'CoachReviewListPage',
  'CoachChatPage',
  'GameInsightsPage',
  'CoachEndgamePage',
  'AnalyticsAuditPanel',
];

export async function surfaceCoverage(w: AnalyticsWindow): Promise<SurfaceCoverage> {
  const log = await readLogCached();
  const rows = log.filter((e) => withinWindow(e, w));

  // Bucket by the leading token of `source` (the convention is
  // `CoachGamePage.someAction` or `CoachGamePage` flat). This lets
  // dotted sub-source labels roll up to a single surface row.
  const bins = new Map<string, { kinds: Set<string>; count: number; lastSeen: number }>();
  for (const r of rows) {
    const surface = r.source.split('.')[0];
    let bin = bins.get(surface);
    if (!bin) {
      bin = { kinds: new Set(), count: 0, lastSeen: 0 };
      bins.set(surface, bin);
    }
    bin.kinds.add(r.kind);
    bin.count++;
    if (r.timestamp > bin.lastSeen) bin.lastSeen = r.timestamp;
  }

  const out: SurfaceCoverageRow[] = Array.from(bins.entries())
    .map(([surface, bin]) => ({
      surface,
      kindsEmitted: bin.kinds.size,
      totalEvents: bin.count,
      lastSeen: bin.lastSeen || null,
      kinds: Array.from(bin.kinds).sort(),
    }))
    .sort((a, b) => b.totalEvents - a.totalEvents);

  const seenSet = new Set(out.map((r) => r.surface));
  const silentSurfaces = EXPECTED_SURFACES.filter((s) => !seenSet.has(s));

  return {
    rows: out,
    totalEvents: rows.length,
    silentSurfaces,
  };
}

// ─── Kind frequency (recent) ───────────────────────────────────────────
//
// Companion to surfaceCoverage. Same window, grouped by AuditKind
// instead of source. Useful for "is this kind emitting at all?"
// confirmations in the panel.

export interface KindFrequencyRow {
  kind: AuditKind;
  count: number;
  lastSeen: number | null;
}

export async function kindFrequency(w: AnalyticsWindow): Promise<KindFrequencyRow[]> {
  const log = await readLogCached();
  const bins = new Map<AuditKind, { count: number; lastSeen: number }>();
  for (const r of log) {
    if (!withinWindow(r, w)) continue;
    let bin = bins.get(r.kind);
    if (!bin) {
      bin = { count: 0, lastSeen: 0 };
      bins.set(r.kind, bin);
    }
    bin.count++;
    if (r.timestamp > bin.lastSeen) bin.lastSeen = r.timestamp;
  }
  return Array.from(bins.entries())
    .map(([kind, bin]) => ({
      kind,
      count: bin.count,
      lastSeen: bin.lastSeen,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Dead capture probes ───────────────────────────────────────────────
//
// Static list of known orphan tables / kinds whose data nothing
// downstream consumes. Updated when audits find new orphans; this is
// the in-app surface for "what are we tracking but not using." Each
// row carries a one-line action so the panel can show a fix.

export interface DeadCaptureProbe {
  label: string;
  status: 'orphan-table' | 'no-consumer' | 'forensic-only';
  rationale: string;
  fixHint: string;
}

export function deadCaptureProbes(): DeadCaptureProbe[] {
  return [
    {
      label: 'db.sessions',
      status: 'orphan-table',
      rationale:
        'Written by sessionGenerator.ts:69 on session end (durationMinutes, xpEarned, coachSummary, puzzleAccuracy). No surface queries it.',
      fixHint:
        'Either wire into a dashboard surface (sessions-this-week, surface-time-distribution) or delete the writer.',
    },
    {
      label: 'AuditEntry.details on forensic kinds',
      status: 'forensic-only',
      rationale:
        'Several kinds (stockfish-error, llm-error, narration-latency) carry rich details payloads that the audit-stream consumes via /api/audit-stream but no in-app consumer reads. That is by design — they are diagnostics.',
      fixHint: 'No action; documented expectation.',
    },
    {
      label: 'coach-memory-hint-{requested,recorded}',
      status: 'no-consumer',
      rationale:
        'Today the only in-app consumer is the audit log itself. The new hint-revealed kind supersedes these for analytic use; legacy kinds stay for backward compatibility.',
      fixHint: 'When hint-revealed emit sites land app-wide, retire the legacy kinds from new code.',
    },
    {
      label: 'Reserved AuditKinds awaiting emit sites',
      status: 'no-consumer',
      rationale:
        'Tier 2-5 kinds from ANALYTICS_AUDIT.md are declared in the union ahead of their emit sites so the analytic API is stable and emit wiring can land progressively. Currently quiet: position-dwell, engine-lines-dwell, endgame-playout-attempt, narration-replay/muted/unmuted, session-shape, move-reversed, puzzle-skipped, repeat-mistake, lesson-{started,completed,abandoned}, coach-question-topic.',
      fixHint: 'Wire one surface at a time per the Tier 2-5 plan in ANALYTICS_AUDIT.md §4. Tier 1 (move-attempt, hint-revealed) is live.',
    },
  ];
}

// ─── Self-audit summary ────────────────────────────────────────────────
//
// Single aggregator the AnalyticsAuditPanel renders on a "refresh"
// click. Pulls every query into one shape so the panel doesn't
// orchestrate the calls.

export interface AnalyticsSelfAudit {
  window: AnalyticsWindow;
  hint: HintActivitySummary;
  dwell: DwellByPhase;
  attempts: MoveAttemptsSummary;
  coverage: SurfaceCoverage;
  kinds: KindFrequencyRow[];
  deadCapture: DeadCaptureProbe[];
}

export async function analyticsSelfAudit(w: AnalyticsWindow): Promise<AnalyticsSelfAudit> {
  const [hint, dwell, attempts, coverage, kinds] = await Promise.all([
    recentHintActivity(w),
    positionDwellByPhase(w),
    moveAttemptsPerPuzzle(w),
    surfaceCoverage(w),
    kindFrequency(w),
  ]);
  return {
    window: w,
    hint,
    dwell,
    attempts,
    coverage,
    kinds,
    deadCapture: deadCaptureProbes(),
  };
}

/** Common window helpers — typed constants so callers don't fat-finger
 *  millisecond math at every call site. */
export const ANALYTICS_WINDOWS = {
  last24h: (): AnalyticsWindow => ({ sinceMs: Date.now() - 24 * 60 * 60 * 1000 }),
  last7d: (): AnalyticsWindow => ({ sinceMs: Date.now() - 7 * 24 * 60 * 60 * 1000 }),
  last30d: (): AnalyticsWindow => ({ sinceMs: Date.now() - 30 * 24 * 60 * 60 * 1000 }),
} as const;

// ─── Strength + game-record queries (Dexie-backed) ─────────────────────
//
// These don't read the audit log — they read the persisted game data
// and derive symmetric strength/weakness signals the existing
// /weaknesses tabs under-collect. Each function is shape-stable
// (returns null when there isn't enough data, never throws).

const AI_NAMES = new Set(['AI Coach', 'Stockfish Bot']);

function inferPlayerColor(g: GameRecord, username: string | null): 'white' | 'black' | null {
  if (AI_NAMES.has(g.white)) return 'black';
  if (AI_NAMES.has(g.black)) return 'white';
  if (!username) return null;
  const lc = username.toLowerCase();
  if (g.white.toLowerCase() === lc) return 'white';
  if (g.black.toLowerCase() === lc) return 'black';
  return null;
}

function isWin(g: GameRecord, c: 'white' | 'black'): boolean {
  return (c === 'white' && g.result === '1-0') || (c === 'black' && g.result === '0-1');
}

async function loadPlayerGames(): Promise<{ game: GameRecord; color: 'white' | 'black' }[]> {
  const profile = await db.profiles.toCollection().first();
  const username = profile?.preferences.chessComUsername ?? profile?.preferences.lichessUsername ?? profile?.name ?? null;
  const all = await db.games.filter((g) => !g.isMasterGame && g.result !== '*').toArray();
  const out: { game: GameRecord; color: 'white' | 'black' }[] = [];
  for (const g of all) {
    const c = inferPlayerColor(g, username);
    if (c) out.push({ game: g, color: c });
  }
  return out;
}

// ─── Color/proficiency mismatch ────────────────────────────────────────
//
// "You play White 70% of the time but only win 40% as White; you play
// Black 30% and win 65%." The inversion IS the strength to surface —
// most users don't realize the color they prefer underperforms their
// other color. Today gameInsightsService.OverviewInsights carries the
// numbers but no consumer calls out the mismatch.

export interface ColorMismatch {
  preferredColor: 'white' | 'black';
  preferredShare: number;          // 0-100
  preferredWinRate: number;        // 0-100
  otherColor: 'white' | 'black';
  otherShare: number;
  otherWinRate: number;
  /** Inversion magnitude: otherWinRate - preferredWinRate. Positive =
   *  the inversion exists (user is better at the color they avoid). */
  inversionPoints: number;
  /** Soft gate — only surfaces an actionable callout when the user has
   *  played at least this many of each color, otherwise too noisy to
   *  draw a conclusion from. */
  isSignificant: boolean;
}

const MIN_GAMES_PER_COLOR = 5;

export async function colorProficiencyMismatch(): Promise<ColorMismatch | null> {
  const overview = await getOverviewInsights();
  if (overview.totalGames === 0) return null;

  // overview.winRateWhite/Black are already 0-100 rounded but overview
  // doesn't carry per-color game counts, so we re-derive cheaply from
  // db.games (single Dexie scan).
  const playerGames = await loadPlayerGames();
  let w = 0, b = 0, wWins = 0, bWins = 0;
  for (const { game, color } of playerGames) {
    if (color === 'white') { w++; if (isWin(game, 'white')) wWins++; }
    else { b++; if (isWin(game, 'black')) bWins++; }
  }
  const total = w + b;
  if (total === 0) return null;
  const whiteShare = (w / total) * 100;
  const blackShare = (b / total) * 100;
  const whiteWr = w > 0 ? (wWins / w) * 100 : 0;
  const blackWr = b > 0 ? (bWins / b) * 100 : 0;

  const preferredColor: 'white' | 'black' = whiteShare >= blackShare ? 'white' : 'black';
  const preferredShare = preferredColor === 'white' ? whiteShare : blackShare;
  const preferredWinRate = preferredColor === 'white' ? whiteWr : blackWr;
  const otherColor: 'white' | 'black' = preferredColor === 'white' ? 'black' : 'white';
  const otherShare = preferredColor === 'white' ? blackShare : whiteShare;
  const otherWinRate = preferredColor === 'white' ? blackWr : whiteWr;
  const inversionPoints = Math.round(otherWinRate - preferredWinRate);

  return {
    preferredColor,
    preferredShare: Math.round(preferredShare),
    preferredWinRate: Math.round(preferredWinRate),
    otherColor,
    otherShare: Math.round(otherShare),
    otherWinRate: Math.round(otherWinRate),
    inversionPoints,
    isSignificant: w >= MIN_GAMES_PER_COLOR && b >= MIN_GAMES_PER_COLOR && inversionPoints >= 10,
  };
}

// ─── Comeback wins ─────────────────────────────────────────────────────
//
// Inverse of thrownWins (existing MistakeInsights field). Game won
// from ≤-200cp evaluation. Rare; a strength fingerprint we don't
// currently surface anywhere.

export interface ComebackStats {
  comebackWins: number;
  /** Game IDs for the drilldown — the user can tap into them. */
  gameIds: string[];
  /** The deepest hole-to-win in cp (most negative eval that became
   *  a win). */
  deepestHoleCp: number | null;
}

export async function comebackWins(): Promise<ComebackStats> {
  const playerGames = await loadPlayerGames();
  let count = 0;
  let deepest: number | null = null;
  const gameIds: string[] = [];

  for (const { game, color } of playerGames) {
    if (!isWin(game, color)) continue;
    if (!game.annotations || game.annotations.length === 0) continue;
    let worstEval: number | null = null;
    for (const ann of game.annotations) {
      if (ann.evaluation === null) continue;
      const signed = color === 'white' ? ann.evaluation : -ann.evaluation;
      if (worstEval === null || signed < worstEval) worstEval = signed;
    }
    if (worstEval !== null && worstEval <= -200) {
      count++;
      gameIds.push(game.id);
      if (deepest === null || worstEval < deepest) deepest = worstEval;
    }
  }

  return { comebackWins: count, gameIds, deepestHoleCp: deepest };
}

// ─── Quick wins vs grind wins ──────────────────────────────────────────
//
// Quick win: ≤20 moves. Grind win: ≥60 moves. Distinct strengths —
// the first is tactical kill, the second is endgame conversion.

export interface WinShapeStats {
  quickWins: number;     // games won in ≤20 moves
  grindWins: number;     // games won in ≥60 moves
  midLengthWins: number; // everything else
  totalWins: number;
}

export async function winShapeStats(): Promise<WinShapeStats> {
  const playerGames = await loadPlayerGames();
  let quick = 0, grind = 0, mid = 0;
  for (const { game, color } of playerGames) {
    if (!isWin(game, color)) continue;
    const moves = countMovesInPgn(game.pgn);
    if (moves <= 20) quick++;
    else if (moves >= 60) grind++;
    else mid++;
  }
  return { quickWins: quick, grindWins: grind, midLengthWins: mid, totalWins: quick + grind + mid };
}

function countMovesInPgn(pgn: string): number {
  // Stripped down — we only need a rough plycount. Drop headers,
  // comments, NAGs, then count non-numbered tokens.
  const body = pgn.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '');
  const tokens = body.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  return Math.ceil(tokens.length / 2);
}

// ─── Tactic-type breadth ───────────────────────────────────────────────
//
// How many DISTINCT tactic types has the student found (brilliant /
// great-tagged moves) in their own games? Coverage breadth as a
// strength signal. Today we have classifiedTactics for individual
// finds; breadth is a one-liner derive.

export interface TacticBreadth {
  distinctTypes: number;
  types: TacticType[];
}

export async function tacticTypeBreadth(): Promise<TacticBreadth> {
  const tactics = await db.classifiedTactics.toArray();
  const types = new Set<TacticType>();
  for (const t of tactics) types.add(t.tacticType);
  return { distinctTypes: types.size, types: Array.from(types).sort() };
}

// ─── Brilliant-move concentration ──────────────────────────────────────
//
// Same brilliant count, very different stories: spread across many
// games (general sharpness) vs clustered in 2-3 (peak / lucky day).
// Coefficient of variation across games carries the fingerprint.

export interface BrilliantConcentration {
  totalBrilliants: number;
  gamesWithBrilliants: number;
  /** Higher = more clustered; lower = more spread. 0 when ≤1 sample. */
  coefficientOfVariation: number;
  /** Soft label for the UI — "spread" when CV < 1, "clustered" when ≥1. */
  shape: 'spread' | 'clustered' | 'insufficient';
}

export async function brilliantConcentration(): Promise<BrilliantConcentration> {
  const playerGames = await loadPlayerGames();
  const perGame: number[] = [];
  let total = 0;
  for (const { game } of playerGames) {
    if (!game.annotations) continue;
    let n = 0;
    for (const ann of game.annotations) {
      if (ann.classification === 'brilliant') n++;
    }
    if (n > 0) {
      perGame.push(n);
      total += n;
    }
  }
  if (perGame.length < 2) {
    return {
      totalBrilliants: total,
      gamesWithBrilliants: perGame.length,
      coefficientOfVariation: 0,
      shape: 'insufficient',
    };
  }
  const mean = total / perGame.length;
  const variance = perGame.reduce((s, x) => s + (x - mean) ** 2, 0) / perGame.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : 0;
  return {
    totalBrilliants: total,
    gamesWithBrilliants: perGame.length,
    coefficientOfVariation: Number(cv.toFixed(2)),
    shape: cv >= 1 ? 'clustered' : 'spread',
  };
}

// ─── First-try mastery aggregate ──────────────────────────────────────
//
// Pull first-attempt-correct counts across the surfaces that track
// it. Endgame already has `mastered` (true iff first-try). For
// mistake puzzles, attempts === 1 && successes >= 1 means first-try.
// Tactic puzzles use the same heuristic. Returns the aggregate %.

export interface FirstTryMastery {
  endgame: { mastered: number; total: number };
  mistakePuzzles: { firstTry: number; total: number };
  /** Overall percentage across both. 0 when no data. */
  overallPct: number;
}

export async function firstTryMasteryAggregate(): Promise<FirstTryMastery> {
  const [endgames, mistakes] = await Promise.all([
    db.endgameProgress.toArray(),
    db.mistakePuzzles.toArray(),
  ]);
  const endgameMastered = endgames.filter((e) => e.mastered).length;
  const endgameTotal = endgames.length;
  const mistakeFirstTry = mistakes.filter(
    (m) => m.attempts === 1 && m.successes >= 1,
  ).length;
  const mistakeTotal = mistakes.length;
  const total = endgameTotal + mistakeTotal;
  const firstTry = endgameMastered + mistakeFirstTry;
  return {
    endgame: { mastered: endgameMastered, total: endgameTotal },
    mistakePuzzles: { firstTry: mistakeFirstTry, total: mistakeTotal },
    overallPct: total > 0 ? Math.round((firstTry / total) * 100) : 0,
  };
}

// ─── Tactic transfer gap ───────────────────────────────────────────────
//
// THE marquee cross-surface signal. Compare puzzle accuracy (puzzles
// + mistake puzzles, theme-tagged) to in-game accuracy on the same
// tactic. Big puzzle-game gap → transfer problem. Inverse → board
// sense outpaces pattern recognition.

export interface TacticTransferRow {
  tacticType: TacticType;
  puzzleAccuracyPct: number | null;   // % first-try across puzzles
  puzzleSamples: number;
  gameOccurrences: number;            // brilliant/great moves of this type
  gameMissedOccurrences: number;
  gameRecognitionPct: number | null;  // found / (found+missed)
  /** puzzleAccuracyPct - gameRecognitionPct, when both defined.
   *  Positive = transfer problem (good at puzzles, weak in games).
   *  Negative = board sense outpacing puzzle pattern knowledge. */
  transferGapPoints: number | null;
}

export async function tacticTransferGap(): Promise<TacticTransferRow[]> {
  const tactics = await db.classifiedTactics.toArray();
  const mistakes = await db.mistakePuzzles.toArray();

  // Build puzzle-side accuracy by tactic, using mistakePuzzles as the
  // available puzzle proxy. attempts === 1 + successes >= 1 = first-try.
  const puzzleByType = new Map<TacticType, { firstTry: number; total: number }>();
  for (const m of mistakes) {
    if (!m.tacticType) continue;
    const bin = puzzleByType.get(m.tacticType) ?? { firstTry: 0, total: 0 };
    bin.total++;
    if (m.attempts === 1 && m.successes >= 1) bin.firstTry++;
    puzzleByType.set(m.tacticType, bin);
  }

  // In-game side: classifiedTactics carries each found-tactic; missed
  // tactics need a different source (missedTacticService /
  // gameInsightsService.getTacticInsights). For a stable join we count
  // classifiedTactics by type as "found"; mistakePuzzles tagged with
  // the same tacticType serve as a proxy for "missed" occurrences.
  const foundByType = new Map<TacticType, number>();
  for (const t of tactics) {
    foundByType.set(t.tacticType, (foundByType.get(t.tacticType) ?? 0) + 1);
  }

  const types = new Set<TacticType>([
    ...puzzleByType.keys(),
    ...foundByType.keys(),
  ]);
  const rows: TacticTransferRow[] = [];
  for (const tt of types) {
    const puzzle = puzzleByType.get(tt);
    const found = foundByType.get(tt) ?? 0;
    const missedInGames = puzzle?.total ?? 0;          // mistake puzzles = missed-in-games
    const gameTotal = found + missedInGames;

    const puzzleAccuracyPct = puzzle && puzzle.total > 0
      ? Math.round((puzzle.firstTry / puzzle.total) * 100)
      : null;
    const gameRecognitionPct = gameTotal > 0
      ? Math.round((found / gameTotal) * 100)
      : null;

    rows.push({
      tacticType: tt,
      puzzleAccuracyPct,
      puzzleSamples: puzzle?.total ?? 0,
      gameOccurrences: found,
      gameMissedOccurrences: missedInGames,
      gameRecognitionPct,
      transferGapPoints:
        puzzleAccuracyPct !== null && gameRecognitionPct !== null
          ? puzzleAccuracyPct - gameRecognitionPct
          : null,
    });
  }
  rows.sort((a, b) => (b.transferGapPoints ?? -Infinity) - (a.transferGapPoints ?? -Infinity));
  return rows;
}

// ─── Repeat-of-mistake ─────────────────────────────────────────────────
//
// "Made the same mistake twice." Strongest single weakness signal we
// can derive today: mistake puzzles with status='unsolved' AND
// attempts >= 2 mean the student re-attempted and missed again.

export interface RepeatMistakeStats {
  totalUnsolved: number;
  repeatedMistakes: number;       // attempts >= 2 still unsolved
  byTactic: Partial<Record<TacticType, number>>;
}

export async function repeatMistakes(): Promise<RepeatMistakeStats> {
  const mistakes = await db.mistakePuzzles.toArray();
  const unsolved = mistakes.filter((m) => m.status === 'unsolved');
  const repeated = unsolved.filter((m) => m.attempts >= 2);
  const byTactic: Partial<Record<TacticType, number>> = {};
  for (const m of repeated) {
    if (!m.tacticType) continue;
    byTactic[m.tacticType] = (byTactic[m.tacticType] ?? 0) + 1;
  }
  return {
    totalUnsolved: unsolved.length,
    repeatedMistakes: repeated.length,
    byTactic,
  };
}

// ─── Streaks ───────────────────────────────────────────────────────────
//
// Win streak + first-try-mastery streak from recent surfaces.
// Engagement-coded strength signal — the cleanest "look how well I'm
// doing" surface in the audit.

export interface StreakStats {
  currentWinStreak: number;
  longestWinStreak: number;
  currentSolveStreak: number;     // consecutive first-try solves on mistakePuzzles
  longestSolveStreak: number;
}

export async function streaks(): Promise<StreakStats> {
  const games = await loadPlayerGames();
  // Sort newest-first by date string (ISO-safe lexicographic).
  games.sort((a, b) => b.game.date.localeCompare(a.game.date));
  let cur = 0, longest = 0, scan = 0;
  for (const { game, color } of games) {
    const win = isWin(game, color);
    if (win) {
      scan++;
      if (scan > longest) longest = scan;
      if (cur === scan - 1) cur = scan; // still on the leading streak
    } else {
      if (scan === 0) cur = 0;          // first non-win in the leading slot ends current streak
      else if (cur > 0 && scan === cur) cur = scan; // no-op
      scan = 0;
    }
  }
  // Solve streak: most-recent-first ordering on mistakePuzzles.
  const mistakes = await db.mistakePuzzles.toArray();
  mistakes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let curS = 0, longestS = 0, scanS = 0;
  for (const m of mistakes) {
    const firstTry = m.attempts === 1 && m.successes >= 1;
    if (firstTry) {
      scanS++;
      if (scanS > longestS) longestS = scanS;
      if (curS === scanS - 1) curS = scanS;
    } else {
      if (scanS === 0) curS = 0;
      scanS = 0;
    }
  }
  return {
    currentWinStreak: cur,
    longestWinStreak: longest,
    currentSolveStreak: curS,
    longestSolveStreak: longestS,
  };
}

// ─── Engagement summary (the user-facing "habits" view) ────────────────
//
// One-stop aggregate the /weaknesses Patterns tab reads. Composes
// every Dexie-backed query so the UI doesn't orchestrate 8 awaits.

export interface EngagementSummary {
  colorMismatch: ColorMismatch | null;
  comeback: ComebackStats;
  winShape: WinShapeStats;
  breadth: TacticBreadth;
  brilliantShape: BrilliantConcentration;
  firstTry: FirstTryMastery;
  transferGap: TacticTransferRow[];
  repeatMistake: RepeatMistakeStats;
  streak: StreakStats;
  /** Total game sample size — gates "not enough data" empty states. */
  totalGames: number;
}

export async function engagementSummary(): Promise<EngagementSummary> {
  const [
    overview,
    colorMismatch,
    comeback,
    winShape,
    breadth,
    brilliantShape,
    firstTry,
    transferGap,
    repeatMistake,
    streak,
  ] = await Promise.all([
    getOverviewInsights(),
    colorProficiencyMismatch(),
    comebackWins(),
    winShapeStats(),
    tacticTypeBreadth(),
    brilliantConcentration(),
    firstTryMasteryAggregate(),
    tacticTransferGap(),
    repeatMistakes(),
    streaks(),
  ]);
  // Silence unused-var warning — getOpeningInsights is imported for
  // future shape extension and to keep the dependency edge documented.
  void getOpeningInsights;
  return {
    colorMismatch,
    comeback,
    winShape,
    breadth,
    brilliantShape,
    firstTry,
    transferGap,
    repeatMistake,
    streak,
    totalGames: overview.totalGames,
  };
}

/** Useful for `MoveClassification` consumers that don't want to
 *  re-import the type. Re-export keeps the API surface clean. */
export type { MoveClassification };
