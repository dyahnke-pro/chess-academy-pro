/**
 * THE PATTERN MINER'S CORE (WO-CAMPAIGN-MASTER, Lane D) — runs every pattern
 * check in `src/missions/patterns/` over real games and reports, per pattern:
 * how often it arises, in which openings, at what ply, for which colour, real
 * examples, and fail twins (real boards one condition short, from the
 * pattern's own near-miss read).
 *
 * Two halves so the work can be spread over threads without touching the
 * result: `scanGame` reads ONE game (pure; any order, any thread), and
 * `aggregate` folds the scans IN GAME ORDER into the reports.
 *
 * PURE AND DETERMINISTIC: no clock, no randomness, every list sorted on a
 * total order, every rate rounded — the same games in the same order give the
 * same bytes (`mineCore.test.ts`). Openings are named by the app's own lookup
 * (`openingDetectionService.detectOpening` over `openings-lichess.json`),
 * never by hand. The CLI (`mine.mjs`) only reads the sources and writes files.
 */
import { Chess, type Color } from 'chess.js';
import { PATTERN_IDS, PATTERN_PROBES } from '../../src/missions/patterns/index';
import { isLegalBoard, type LastMove } from '../../src/missions/patterns/board';
import type { PatternId } from '../../src/missions/missionCard';
import { detectOpening } from '../../src/services/openingDetectionService';

export interface MineGame {
  /** Where the game came from (`model-games`, `david`, …) — reports keep the
   *  sources in the order the games arrive. */
  source: string;
  id: string;
  /** SAN moves from the standard starting position. */
  sans: readonly string[];
}

export interface MineOptions {
  examples: number;
  failTwins: number;
  openings: number;
  /** Twins kept per source per near-miss name before the pick. */
  twinPool: number;
}

export const DEFAULT_MINE_OPTIONS: MineOptions = { examples: 10, failTwins: 20, openings: 25, twinPool: 12 };

export interface MinedBoard {
  source: string;
  game: string;
  /** Half-moves played to reach the board (1 = after White's first move). */
  ply: number;
  /** The side the pattern favours (or would, for a twin). */
  side: Color;
  fen: string;
  /** The move that made the board — what a move-aware check reads. */
  last: LastMove;
}
export interface MinedTwin extends MinedBoard { missing: string }

/** What one game says about one pattern. */
export interface PatternScan {
  /** Boards (ply × favoured side) the pattern is present on. */
  found: number;
  first: MinedBoard | null;
  /** The first board for each near-miss name, at most one per name. */
  twins: MinedTwin[];
}

export interface GameScan {
  source: string;
  id: string;
  plies: number;
  family: string;
  patterns: Partial<Record<PatternId, PatternScan>>;
}

export interface PatternReport {
  id: PatternId;
  module: string;
  nearMissCodes: readonly string[];
  gamesScanned: number;
  positionsScanned: number;
  /** Boards (ply × favoured side) on which the pattern is present. */
  positionsFound: number;
  gamesWithPattern: number;
  /** gamesWithPattern / gamesScanned. */
  arrivalRate: number;
  /** The ply of the pattern's FIRST arrival in each game that has it. */
  firstPly: { median: number | null; p25: number | null; p75: number | null };
  /** Colour of the favoured side at the first arrival. */
  colour: { white: number; black: number };
  bySource: Array<{ source: string; games: number; positions: number; gamesWithPattern: number; positionsFound: number }>;
  /** Opening families (the name before the colon) ranked by how reliably they
   *  set the pattern up: the family's rate shrunk toward the pattern's overall
   *  rate (`OPENING_PRIOR_GAMES` pseudo-games), so one game seen once cannot
   *  top a family seen a thousand times; then rate, count, name. */
  openings: Array<{ opening: string; gamesWithPattern: number; games: number; rate: number; shrunkRate: number }>;
  examples: MinedBoard[];
  failTwins: MinedTwin[];
}

const round4 = (x: number): number => Math.round(x * 1e4) / 1e4;
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** How many games of evidence the pattern's overall rate is worth when
 *  ranking one opening family against it. */
export const OPENING_PRIOR_GAMES = 20;

/** k of n, shrunk toward `base` with `prior` pseudo-games: a family seen once
 *  sits near the pattern's overall rate, a family seen a thousand times near
 *  its own. */
export function shrunkRate(k: number, n: number, base: number, prior = OPENING_PRIOR_GAMES): number {
  return (k + prior * base) / (n + prior);
}

/** Nearest-rank percentile of a sorted list. */
function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.max(1, Math.ceil(p * sorted.length)) - 1];
}

/** The opening family the app's own lookup names for these moves. */
export function openingFamily(sans: readonly string[]): string {
  const hit = detectOpening([...sans]);
  if (!hit) return '(unnamed)';
  return hit.name.split(':')[0].trim();
}

// ─── PGN reading ────────────────────────────────────────────────────────────

/** One PGN game's tags and SAN moves. Comments, variations, NAGs, move
 *  numbers and the result are dropped; annotation glyphs are stripped. */
export function parsePgn(pgn: string): { tags: Record<string, string>; sans: string[] } {
  const tags: Record<string, string> = {};
  const body: string[] = [];
  for (const line of pgn.split(/\r?\n/)) {
    const tag = /^\s*\[(\w+)\s+"(.*)"\]\s*$/.exec(line);
    if (tag) tags[tag[1]] = tag[2];
    else body.push(line);
  }
  let text = body.join(' ');
  text = text.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  // Variations nest; peel the innermost until none remain.
  let prev = '';
  while (prev !== text) { prev = text; text = text.replace(/\([^()]*\)/g, ' '); }
  const sans: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const tok = raw.replace(/^\d+\.(\.\.)?/, '').replace(/[!?]+$/, '');
    if (!tok || /^\$\d+$/.test(tok) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok) || /^\d+\.+$/.test(tok)) continue;
    sans.push(tok);
  }
  return { tags, sans };
}

/** Split a multi-game PGN text into one string per game. */
export function splitPgnGames(text: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  let inMoves = false;
  for (const line of text.split(/\r?\n/)) {
    const isTag = /^\s*\[/.test(line);
    if (isTag && inMoves) { out.push(current.join('\n')); current = []; inMoves = false; }
    if (!isTag && line.trim()) inMoves = true;
    current.push(line);
  }
  if (current.some((l) => l.trim())) out.push(current.join('\n'));
  return out;
}

/** A PGN as a mining game, or null when it does not start from the standard
 *  position (a `FEN` / `SetUp` tag) — the opening lookup needs move one. */
export function gameFromPgn(source: string, id: string, pgn: string): MineGame | null {
  const { tags, sans } = parsePgn(pgn);
  if (tags.FEN || tags.SetUp === '1') return null;
  return { source, id, sans };
}

// ─── one game ───────────────────────────────────────────────────────────────

/** Read one game for the given patterns. Pure. A move chess.js refuses ends
 *  the game there; a board that is not legal (`isLegalBoard`) is skipped. */
export function scanGame(game: MineGame, ids: readonly PatternId[] = PATTERN_IDS): GameScan {
  const board = new Chess();
  const steps: Array<{ fen: string; last: LastMove; legal: boolean }> = [];
  const played: string[] = [];
  for (const san of game.sans) {
    let m;
    try { m = board.move(san); } catch { break; }
    played.push(san);
    const fen = board.fen();
    steps.push({ fen, last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) }, legal: isLegalBoard(fen) });
  }
  const patterns: GameScan['patterns'] = {};
  for (const id of ids) {
    const probe = PATTERN_PROBES[id];
    const scan: PatternScan = { found: 0, first: null, twins: [] };
    const taken = new Set<string>();
    steps.forEach(({ fen, last, legal }, i) => {
      if (!legal) return;
      for (const side of ['w', 'b'] as const) {
        const here = probe.presentAfter ? probe.presentAfter(fen, last, side) : probe.present(fen, side);
        const board1: MinedBoard = { source: game.source, game: game.id, ply: i + 1, side, fen, last };
        if (here) {
          scan.found += 1;
          if (!scan.first) scan.first = board1;
          continue;
        }
        if (taken.size === probe.nearMissCodes.length) continue;
        const misses = probe.nearMissesAfter ? probe.nearMissesAfter(fen, last, side) : probe.nearMisses(fen, side);
        for (const missing of misses) {
          if (taken.has(missing)) continue;
          taken.add(missing);
          scan.twins.push({ ...board1, missing });
        }
      }
    });
    patterns[id] = scan;
  }
  return { source: game.source, id: game.id, plies: steps.length, family: played.length > 0 ? openingFamily(played) : '(no moves)', patterns };
}

// ─── the fold ───────────────────────────────────────────────────────────────

/** Round-robin over lists: one from each in turn until `n` or all run dry. */
function roundRobin<T>(lists: readonly T[][], n: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < n; i++) {
    let took = false;
    for (const l of lists) {
      if (i < l.length && out.length < n) { out.push(l[i]); took = true; }
    }
    if (!took) break;
  }
  return out;
}

/** Fold game scans, IN THE ORDER GIVEN, into one report per pattern. */
export function aggregate(scans: readonly GameScan[], ids: readonly PatternId[] = PATTERN_IDS, options: Partial<MineOptions> = {}): PatternReport[] {
  const opts: MineOptions = { ...DEFAULT_MINE_OPTIONS, ...options };
  const sourceOrder: string[] = [];
  const familyGames = new Map<string, number>();
  let positionsScanned = 0;
  for (const s of scans) {
    if (!sourceOrder.includes(s.source)) sourceOrder.push(s.source);
    familyGames.set(s.family, (familyGames.get(s.family) ?? 0) + 1);
    positionsScanned += s.plies;
  }
  return ids.map((id): PatternReport => {
    let positionsFound = 0;
    const firstPlies: number[] = [];
    const colour = { white: 0, black: 0 };
    const bySource = new Map<string, { games: number; positions: number; gamesWithPattern: number; positionsFound: number }>();
    const openings = new Map<string, number>();
    const examples = new Map<string, MinedBoard[]>();
    const pools = new Map<string, Map<string, MinedTwin[]>>();
    const used = new Set<string>();
    for (const s of scans) {
      const p = s.patterns[id];
      const src = bySource.get(s.source) ?? { games: 0, positions: 0, gamesWithPattern: 0, positionsFound: 0 };
      src.games += 1;
      src.positions += s.plies;
      bySource.set(s.source, src);
      if (!p) continue;
      positionsFound += p.found;
      src.positionsFound += p.found;
      if (p.first) {
        src.gamesWithPattern += 1;
        firstPlies.push(p.first.ply);
        if (p.first.side === 'w') colour.white += 1; else colour.black += 1;
        openings.set(s.family, (openings.get(s.family) ?? 0) + 1);
        const ex = examples.get(s.source) ?? [];
        const key = `${p.first.fen}|${p.first.side}`;
        if (ex.length < opts.examples && !used.has(key)) { used.add(key); ex.push(p.first); }
        examples.set(s.source, ex);
      }
      const pool = pools.get(s.source) ?? new Map<string, MinedTwin[]>();
      pools.set(s.source, pool);
      for (const t of p.twins) {
        const list = pool.get(t.missing) ?? [];
        const key = `${t.fen}|${t.side}`;
        if (list.length < opts.twinPool && !used.has(key)) { used.add(key); list.push(t); }
        pool.set(t.missing, list);
      }
    }
    const gamesWithPattern = firstPlies.length;
    const base = scans.length > 0 ? gamesWithPattern / scans.length : 0;
    const plies = [...firstPlies].sort((x, y) => x - y);
    const codes = [...PATTERN_PROBES[id].nearMissCodes].sort(byText);
    const twinLists: MinedTwin[][] = [];
    for (const c of codes) for (const src of sourceOrder) twinLists.push(pools.get(src)?.get(c) ?? []);
    return {
      id,
      module: `src/missions/patterns/${id}.ts`,
      nearMissCodes: codes,
      gamesScanned: scans.length,
      positionsScanned,
      positionsFound,
      gamesWithPattern,
      arrivalRate: scans.length > 0 ? round4(gamesWithPattern / scans.length) : 0,
      firstPly: { median: percentile(plies, 0.5), p25: percentile(plies, 0.25), p75: percentile(plies, 0.75) },
      colour,
      bySource: sourceOrder.map((source) => ({ source, ...(bySource.get(source) ?? { games: 0, positions: 0, gamesWithPattern: 0, positionsFound: 0 }) })),
      openings: [...openings.entries()]
        .map(([opening, n]) => {
          const games = familyGames.get(opening) ?? 0;
          return { opening, gamesWithPattern: n, games, rate: games > 0 ? round4(n / games) : 0, shrunkRate: round4(shrunkRate(n, games, base)) };
        })
        .sort((x, y) => y.shrunkRate - x.shrunkRate || y.rate - x.rate || y.gamesWithPattern - x.gamesWithPattern || byText(x.opening, y.opening))
        .slice(0, opts.openings),
      examples: roundRobin(sourceOrder.map((src) => examples.get(src) ?? []), opts.examples),
      failTwins: roundRobin(twinLists, opts.failTwins),
    };
  });
}

/** Scan and fold on one thread. */
export function minePatterns(games: readonly MineGame[], ids: readonly PatternId[] = PATTERN_IDS, options: Partial<MineOptions> = {}): PatternReport[] {
  return aggregate(games.map((g) => scanGame(g, ids)), ids, options);
}

/** The bytes a report is written as. */
export function serializeReport(report: object): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
