/**
 * hisPlayLookup — the review coach's PRIMARY opening-plan grounding source
 * (David 2026-07-23: "use his games as the primary source, then when he doesn't
 * have any games we use the master DB").
 *
 * Loads `public/data/danya-play-db.json` (built by scripts/build-danya-play-db.mjs
 * from his merged chess.com corpus) and answers "in this exact position, what
 * does he play, and how does it score?" — grounded in real games (G3, never
 * invented). Records BOTH sides (his defense AND his opponents' plans), so the
 * review can teach the student's side whether he chose the opening or faced it.
 *
 * Mirrors masterPlayLookup's fetch-on-demand + memoized-cache shape and reuses
 * `positionFen` for an identical key, so the his → masters → nothing fallthrough
 * in the review resolver is clean.
 */
import { positionFen } from './masterPlayCache';

export interface HisPlayMove {
  san: string;
  games: number;
  w: number;
  d: number;
  l: number;
}

export interface HisPlayEntry {
  total: number;
  moves: HisPlayMove[];
}

type HisPlayDb = Record<string, HisPlayEntry>;

const HIS_PLAY_DB_URL = '/data/danya-play-db.json';

/** A position needs at least this many of his games before we call the most-
 *  played move "his plan" — below it the signal is too thin to teach. */
export const HIS_PLAN_MIN_GAMES = 12;

let dbCache: HisPlayDb | null | undefined;
let dbInflight: Promise<HisPlayDb | null> | null = null;

/** Fetch + memoize the his-play DB. Returns null in non-browser/test env or
 *  when the file isn't deployed — every lookup then falls through to masters. */
export async function getHisPlayDb(): Promise<HisPlayDb | null> {
  if (dbCache !== undefined) return dbCache;
  if (dbInflight) return dbInflight;
  dbInflight = (async () => {
    try {
      if (typeof fetch !== 'function') { dbCache = null; return null; }
      const resp = await fetch(HIS_PLAY_DB_URL);
      if (!resp.ok) { dbCache = null; return null; }
      const raw = (await resp.json()) as unknown;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) {
        dbCache = raw as HisPlayDb;
        return dbCache;
      }
      dbCache = null; return null;
    } catch {
      dbCache = null; return null;
    } finally {
      dbInflight = null;
    }
  })();
  return dbInflight;
}

/** Test/SSR seam — inject a pre-loaded DB (e.g. read from disk in node). */
export function __setHisPlayDbForTests(db: HisPlayDb | null): void {
  dbCache = db === null ? null : db;
  dbInflight = null;
}
export function __resetHisPlayDbForTests(): void {
  dbCache = undefined;
  dbInflight = null;
}

/** His recorded moves at this exact position (side-to-move encoded in the FEN),
 *  or null if the position isn't in his DB. Requires the DB to be loaded first
 *  via getHisPlayDb(); returns null if not. */
export function lookupHisPlaySync(fen: string): HisPlayEntry | null {
  if (!dbCache) return null;
  const hit = dbCache[positionFen(fen)];
  return hit && hit.moves.length > 0 ? hit : null;
}

/** Async convenience: load-then-lookup. */
export async function lookupHisPlay(fen: string): Promise<HisPlayEntry | null> {
  await getHisPlayDb();
  return lookupHisPlaySync(fen);
}

export interface HisGroundedPlan {
  /** The side whose plan this is ('w' | 'b'), = side to move at `fen`. */
  side: 'w' | 'b';
  /** His most-played continuation from here (SANs), following the top move at
   *  each ply for both sides — the grounded spine of how this structure goes in
   *  his games. First SAN is the plan's lead move for `side`. */
  line: string[];
  /** His plan-side moves within `line` (every other SAN), the itinerary. */
  sideMoves: string[];
  /** Games + win% behind the lead move (for `side`). */
  leadGames: number;
  leadWinPct: number;
  /** Total his games at the starting position. */
  total: number;
}

/**
 * Follow his most-played move at each ply (both sides) from `fen`, building the
 * grounded continuation. Returns null when the starting position has fewer than
 * HIS_PLAN_MIN_GAMES of his games (too thin to call it his plan) — the caller
 * then falls through to the masters DB. `applyMove` replays SANs (chess.js) to
 * walk the line; the caller passes it so this module stays engine/lib-free.
 */
export function hisGroundedPlanSync(
  fen: string,
  applyMove: (fen: string, san: string) => string | null,
  maxPlies = 6,
): HisGroundedPlan | null {
  const start = lookupHisPlaySync(fen);
  if (!start || start.total < HIS_PLAN_MIN_GAMES) return null;
  const side: 'w' | 'b' = fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
  const lead = start.moves[0];
  const line: string[] = [];
  const sideMoves: string[] = [];
  let curFen = fen;
  let curSide = side;
  for (let i = 0; i < maxPlies; i++) {
    const entry = lookupHisPlaySync(curFen);
    if (!entry || entry.moves.length === 0) break;
    const top = entry.moves[0].san;
    line.push(top);
    if (curSide === side) sideMoves.push(top);
    const next = applyMove(curFen, top);
    if (!next) break;
    curFen = next;
    curSide = curSide === 'w' ? 'b' : 'w';
  }
  return {
    side,
    line,
    sideMoves,
    leadGames: lead.games,
    leadWinPct: Math.round((100 * lead.w) / Math.max(1, lead.games)),
    total: start.total,
  };
}
