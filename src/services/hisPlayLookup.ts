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

/** A position needs at least this many of his games before we call a move
 *  "his plan" — below it the signal is too thin to teach. */
export const HIS_PLAN_MIN_GAMES = 12;

/** His corpus is the GUIDE (David 2026-07-24: "use his corpus as a guide!! if
 *  not in there then use the DB!!"). For the plan spine we lean on his games
 *  with a LOWER floor than the strict plan bar — a handful of his games is a
 *  better guide than the masters' generic line (which recommends moves he
 *  deliberately avoids, e.g. …e6 in his Grand Prix). The SCORE floor in
 *  bestPlanMove still blocks a losing plan; only below THIS do we fall to the
 *  masters DB. */
export const HIS_PLAN_GUIDE_MIN_GAMES = 5;

/** The taught plan-move must clear this score (win% + draw%/2, from the mover's
 *  perspective) — his most-PLAYED move in a position can still be a dubious /
 *  bullet-noise line that SCORES badly (Barry Attack ...c5 at 17%W across the
 *  10-game tuning set). Teaching a losing plan is worse than none: below this,
 *  the position is treated as ungrounded and falls through to the masters DB. */
export const HIS_PLAN_MIN_SCORE = 0.45;

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
  /** THIS game's actual continuation (SANs) from `fen`. When given, the walk
   *  FOLLOWS it instead of his aggregate most-played reply (David 2026-07-24:
   *  the plan context must track THIS game — his global line diverges onto a
   *  different move order where a different plan applies, e.g. it drifted to the
   *  …Bc4/…e6 line while the game went …Bb5/…Nd4). His corpus still supplies the
   *  confidence %; it only guides the walk BEYOND the game's end. */
  gameLine?: string[],
): HisGroundedPlan | null {
  const start = lookupHisPlaySync(fen);
  if (!start || start.total < HIS_PLAN_GUIDE_MIN_GAMES) return null;
  // His most-PLAYED move can score badly (noise / a dropped line) — teach his
  // best-scoring frequent move instead, and if even that is weak, this position
  // is not a plan worth teaching → null → masters backup.
  const lead = bestPlanMove(start);
  if (!lead) return null;
  const side: 'w' | 'b' = fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
  const line: string[] = [];
  const sideMoves: string[] = [];
  let curFen = fen;
  let curSide = side;
  for (let i = 0; i < maxPlies; i++) {
    // Follow THIS game's move when we have it — the plan must track the game,
    // not drift onto his aggregate line (which recommends a move he avoids in
    // this exact structure). His corpus guides only past the game's end.
    let pickSan: string | null = gameLine && i < gameLine.length ? gameLine[i] : null;
    if (!pickSan) {
      const entry = lookupHisPlaySync(curFen);
      if (!entry || entry.moves.length === 0) break;
      // his side follows his best plan-move; the opponent side follows their
      // most-played reply (what he actually faced) to keep the line realistic.
      pickSan = curSide === side ? (bestPlanMove(entry) ?? entry.moves[0]).san : entry.moves[0].san;
    }
    line.push(pickSan);
    if (curSide === side) sideMoves.push(pickSan);
    const next = applyMove(curFen, pickSan);
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
