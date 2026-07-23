// reviewOpeningsSource — a small, RICH masters-explorer source for the post-game
// review's opening lecture. The shipped masters DB
// (public/data/openings-masters-db.json) carries move frequencies but NO result
// split and NO model games, so the lecture can't say "scores well" or cite
// "Carlsen–Yangyi" the way Danya does. This sidecar
// (public/data/danya-review-openings.json — baked by
// scripts/danya-corpus/build-review-openings.mjs from the live masters explorer)
// holds W/D/L + topGames for the opening positions that matter, and is consulted
// FIRST by the review lecture. On a miss it falls back to the standard
// lookupMasterPlay (main DB, then live). G0/G3: every number + game is real
// Lichess masters data, never invented. Runtime stays API-free — the sidecar is
// a bundled static asset, not a live call.

import type { MasterPlayResult, MasterPlayMove, MasterPlayTopGame } from './masterPlayTypes';
import { lookupMasterPlay } from './masterPlayLookup';
import { positionFen } from './masterPlayCache';

interface RichMove {
  san: string;
  games: number;
  white?: number;
  draws?: number;
  black?: number;
}
interface RichEntry {
  totalGames: number;
  moves: RichMove[];
  topGames?: MasterPlayTopGame[];
}
type Sidecar = Record<string, RichEntry>;

const SIDECAR_URL = '/data/danya-review-openings.json';
let cache: Sidecar | null | undefined;
let inflight: Promise<Sidecar | null> | null = null;

async function loadSidecar(): Promise<Sidecar | null> {
  if (cache !== undefined) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (typeof fetch !== 'function') { cache = null; return null; }
      const resp = await fetch(SIDECAR_URL);
      if (!resp.ok) { cache = null; return null; }
      const raw = (await resp.json()) as unknown;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) {
        cache = raw as Sidecar;
        return cache;
      }
      cache = null;
      return null;
    } catch {
      cache = null; // absent / not deployed / offline → fall back gracefully
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Test seam — inject the sidecar without a fetch. */
export function __setReviewOpeningsForTests(db: Sidecar | null): void {
  cache = db;
  inflight = null;
}
export function __resetReviewOpeningsForTests(): void {
  cache = undefined;
  inflight = null;
}

function buildFromRich(fen: string, entry: RichEntry): MasterPlayResult {
  const sorted = [...entry.moves].sort((a, b) => b.games - a.games);
  const totalGames = sorted.reduce((s, m) => s + (m.games || 0), 0);
  const moves: MasterPlayMove[] = sorted.map((m) => {
    const white = m.white ?? 0;
    const draws = m.draws ?? 0;
    const black = m.black ?? 0;
    const rated = white + draws + black;
    const safe = rated > 0 ? rated : m.games;
    return {
      san: m.san,
      games: m.games || 0,
      white,
      draws,
      black,
      whitePct: safe > 0 && rated > 0 ? white / safe : 0,
      drawPct: safe > 0 && rated > 0 ? draws / safe : 0,
      blackPct: safe > 0 && rated > 0 ? black / safe : 0,
    };
  });
  return { fen: positionFen(fen), totalGames, moves, source: 'local', topGames: entry.topGames };
}

/**
 * The review lecture's lookup: rich sidecar first (scores + model games), then
 * the standard grounding pipeline. Signature matches the `lookup` opts of
 * buildOpeningTheoryLecture.
 */
export async function reviewTheoryLookup(fen: string): Promise<MasterPlayResult> {
  const db = await loadSidecar();
  const hit = db?.[positionFen(fen)];
  if (hit && hit.moves.length > 0) return buildFromRich(fen, hit);
  return lookupMasterPlay(fen, { triggeredBy: 'manual', surface: 'game-review' });
}
