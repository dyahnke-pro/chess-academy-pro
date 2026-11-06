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
import { loadDataJson } from './dataFile';

interface HisPlayMove {
  san: string;
  games: number;
  w: number;
  d: number;
  l: number;
}

interface HisPlayEntry {
  total: number;
  moves: HisPlayMove[];
}

type HisPlayDb = Record<string, HisPlayEntry>;

const HIS_PLAY_DB_URL = '/data/danya-play-db.json';

/** A position needs at least this many of his games before we call a move
 *  "his plan" — below it the signal is too thin to teach. */
export const HIS_PLAN_MIN_GAMES = 12;

/** The taught plan-move must clear this score (win% + draw%/2, from the mover's
 *  perspective) — his most-PLAYED move in a position can still be a dubious /
 *  bullet-noise line that SCORES badly (Barry Attack ...c5 at 17%W across the
 *  10-game tuning set). Teaching a losing plan is worse than none: below this,
 *  the position is treated as ungrounded and falls through to the masters DB. */
const HIS_PLAN_MIN_SCORE = 0.45;

/** A candidate plan-move must be played in at least this fraction of the most-
 *  played move's games to be considered — so we pick his BEST-scoring move from
 *  among the ones he actually plays often, not a rare high-% outlier. */
const FREQ_FLOOR_FRACTION = 0.5;

/** Score of a move from the mover's perspective: win% + half the draw%. */
function moveScore(m: HisPlayMove): number {
  return (m.w + m.d / 2) / Math.max(1, m.games);
}

/** His best plan-move at a position: among his frequently-played moves (>= half
 *  the top move's games), the highest-scoring one — "his frequent, successful
 *  choice." Null if even that scores below HIS_PLAN_MIN_SCORE. */
export function bestPlanMove(entry: HisPlayEntry): HisPlayMove | null {
  if (!entry.moves.length) return null;
  const topGames = entry.moves[0].games;
  const frequent = entry.moves.filter((m) => m.games >= topGames * FREQ_FLOOR_FRACTION);
  const best = frequent.reduce((a, b) => (moveScore(b) > moveScore(a) ? b : a), frequent[0]);
  return moveScore(best) >= HIS_PLAN_MIN_SCORE ? best : null;
}

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
      // Web: same-origin fetch. Native: kept copy → app bundle → web origin
      // (downloaded once, ~1 MB compressed, then kept) — see dataFile.ts.
      const raw = await loadDataJson(HIS_PLAY_DB_URL);
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
