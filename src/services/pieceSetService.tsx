import type { PieceRenderObject } from 'react-chessboard';
import { logAppAudit } from './appAuditor';

export interface PieceSetConfig {
  id: string;
  name: string;
  /** Lichess piece set directory name for CDN loading. null = use react-chessboard defaults. */
  lichessName: string | null;
}

export const PIECE_SETS: PieceSetConfig[] = [
  { id: 'staunton', name: 'Staunton', lichessName: null },
  { id: 'neo', name: 'Neo', lichessName: 'companion' },
  { id: 'alpha', name: 'Alpha', lichessName: 'alpha' },
  { id: 'merida', name: 'Merida', lichessName: 'merida' },
  { id: 'california', name: 'California', lichessName: 'california' },
  { id: 'cardinal', name: 'Cardinal', lichessName: 'cardinal' },
  { id: 'tatiana', name: 'Tatiana', lichessName: 'tatiana' },
  { id: 'pixel', name: 'Pixel', lichessName: 'pixel' },
  { id: 'horsey', name: 'Horsey', lichessName: 'horsey' },
  { id: 'letter', name: 'Letter', lichessName: 'letter' },
  // "Gold (Champion)" — matches the gold-knight app icon using the pieces we
  // already ship: renders the clean cburnett glyphs with a baked CSS treatment
  // (see GOLD_PIECE_FILTERS) so white reads as polished gold and black gains an
  // emerald-energy rim. Special-cased in buildPieceRenderer so the gold
  // treatment wins over the user's neon glow filter (otherwise a green
  // drop-shadow would mask the gold tint).
  { id: 'gold', name: 'Gold (Champion)', lichessName: 'cburnett' },
];

/** Baked CSS `filter` treatment for the "gold" piece set, applied per side
 *  regardless of the user's neon-glow setting. White → warm polished gold;
 *  black → kept dark with a soft green rim so the two sides stay readable
 *  and both nod to the gold-and-green app icon. */
const GOLD_PIECE_FILTERS = {
  white:
    'sepia(1) saturate(2.6) hue-rotate(2deg) brightness(1.06) contrast(1.05) drop-shadow(0 0 3px rgba(255, 196, 64, 0.65))',
  black:
    'brightness(0.82) sepia(0.35) hue-rotate(70deg) saturate(1.4) drop-shadow(0 0 3px rgba(74, 222, 128, 0.7))',
};

const PIECE_MAP: Record<string, string> = {
  wP: 'wP', wN: 'wN', wB: 'wB', wR: 'wR', wQ: 'wQ', wK: 'wK',
  bP: 'bP', bN: 'bN', bB: 'bB', bR: 'bR', bQ: 'bQ', bK: 'bK',
};

/** Per-session dedup for asset-load-error events. One failed sprite
 *  URL produces one audit entry per session — without this the same
 *  failing URL re-emits on every board render (32+ pieces × 5+ moves
 *  in a walkthrough = 160+ duplicated audit rows that drown out
 *  meaningful events in the rolling 1000-entry buffer). */
const loggedAssetFailures = new Set<string>();

/** CC0 piece SVGs hosted by Lichess in their public lila repo. The
 *  legacy `https://lichess1.org/assets/piece/<set>/<piece>.svg` path
 *  stopped serving without a content-hash prefix (Lichess switched
 *  to webpack-hashed asset paths), which broke every set in our
 *  picker — confirmed in the prod audit log (100+
 *  asset-load-error rows). jsdelivr serves the GitHub source
 *  directly with proper Content-Type + CORS, identical directory
 *  layout, and no auth. */
export const LICHESS_CDN =
  'https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece';

/** Fallback CDN for the same assets — served by GitHack (separate
 *  infrastructure from jsdelivr, so a regional jsdelivr outage or
 *  edge cache miss doesn't take board rendering down). Audit log
 *  (2026-05-27/28) showed 48 asset-load-errors all on the jsdelivr
 *  primary; with no second CDN we'd previously retry the SAME URL
 *  with a cache-bust query that DEFEATED jsdelivr's edge cache and
 *  forced another cold fetch. The fallback path now tries a wholly
 *  different CDN before surrendering to the alt-text fallback. */
export const LICHESS_CDN_FALLBACK =
  'https://raw.githack.com/lichess-org/lila/master/public/piece';

export interface PieceFilterOptions {
  whitePieceFilter?: string;
  blackPieceFilter?: string;
}

/**
 * Builds a PieceRenderObject for react-chessboard from a Lichess piece set name.
 * Returns undefined for the default set when no filters are applied.
 * When piece filters are provided, always returns a custom renderer so filters
 * can be applied via CSS (falls back to 'cburnett' CDN set for Staunton).
 */
export function buildPieceRenderer(
  pieceSetId: string,
  filters?: PieceFilterOptions,
): PieceRenderObject | undefined {
  const config = PIECE_SETS.find((ps) => ps.id === pieceSetId);
  const isGold = pieceSetId === 'gold';
  const hasFilters = filters?.whitePieceFilter || filters?.blackPieceFilter;

  // No custom set and no filters → use react-chessboard defaults.
  // ('gold' always renders custom — its gold treatment is baked, not optional.)
  if (!config?.lichessName && !hasFilters && !isGold) return undefined;

  // Use the configured set, or fall back to cburnett when we need filters on the default set
  const setName = config?.lichessName ?? 'cburnett';
  const pieces: PieceRenderObject = {};

  for (const [key, file] of Object.entries(PIECE_MAP)) {
    const url = `${LICHESS_CDN}/${setName}/${file}.svg`;
    const isWhite = key.startsWith('w');
    // The gold set's baked treatment overrides the user's neon-glow filter so
    // the gold tint isn't masked by a green drop-shadow.
    const pieceFilter = isGold
      ? (isWhite ? GOLD_PIECE_FILTERS.white : GOLD_PIECE_FILTERS.black)
      : (isWhite ? filters?.whitePieceFilter : filters?.blackPieceFilter);

    pieces[key] = ({ svgStyle } = {}) => (
      <img
        src={url}
        alt={key}
        onError={(e) => {
          // Audit (2026-05-18, David's flag): piece SVGs sometimes
          // fail to load on the first board mount and show alt-text
          // ("bR", "wP", etc.) until the user closes + reopens the
          // app. Symptoms match a CDN cold-start race — jsdelivr is
          // momentarily slow / throttled and the browser caches the
          // failed response. We now retry on a DIFFERENT CDN
          // (raw.githack.com) instead of a cache-bust query on the
          // same one — the previous cache-bust DEFEATED jsdelivr's
          // edge cache and forced another cold fetch on the very
          // CDN that just failed. Second failure logs the audit row
          // and surrenders to the alt-text fallback.
          //
          // Dedup (2026-05-19): without per-URL dedup this fires once
          // PER FAILED SPRITE PER BOARD RENDER. A walkthrough animating
          // 5 moves emits 100+ events for the same handful of failed
          // URLs and floods the rolling 1000-entry audit buffer,
          // displacing the events the audit actually cares about
          // (claim-validator-trip, llm-token-usage, etc.). The module-
          // level Set below remembers URLs we've already audited so
          // each unique failure is logged once per session.
          const img = e.currentTarget as HTMLImageElement;
          if (!img.dataset.retried) {
            img.dataset.retried = '1';
            img.src = `${LICHESS_CDN_FALLBACK}/${setName}/${file}.svg`;
            return;
          }
          if (loggedAssetFailures.has(url)) return;
          loggedAssetFailures.add(url);
          void logAppAudit({
            kind: 'asset-load-error',
            category: 'subsystem',
            source: 'pieceSetService',
            summary: `piece=${key} set=${setName} url=${url} (retry exhausted, fallback CDN also failed)`,
          });
        }}
        style={{
          width: '100%',
          height: '100%',
          ...(pieceFilter ? { filter: pieceFilter } : {}),
          ...svgStyle,
        }}
        draggable={false}
      />
    );
  }

  return pieces;
}

/** Preload every piece SVG for the given set into the browser cache
 *  so the next board mount renders the images instantly instead of
 *  showing the alt-text fallback during the CDN round-trip.
 *  Fire-and-forget — failed preloads are silent (the live `onError`
 *  retry handles those at render time). Idempotent: subsequent calls
 *  with the same set name short-circuit on the per-set in-flight
 *  cache. */
const preloadedSets = new Set<string>();
export function preloadPieceSet(pieceSetId: string): void {
  if (typeof window === 'undefined') return;
  const config = PIECE_SETS.find((ps) => ps.id === pieceSetId);
  const setName = config?.lichessName ?? 'cburnett';
  if (preloadedSets.has(setName)) return;
  preloadedSets.add(setName);
  for (const file of Object.values(PIECE_MAP)) {
    const url = `${LICHESS_CDN}/${setName}/${file}.svg`;
    const img = new Image();
    img.src = url;
    // No onload / onerror handlers — the browser caches the response
    // either way, and we don't care about failures here (the real
    // `<img>` element renders later with its own onError retry).
  }
}

export function getPieceSetConfig(id: string): PieceSetConfig {
  return PIECE_SETS.find((ps) => ps.id === id) ?? PIECE_SETS[0];
}
