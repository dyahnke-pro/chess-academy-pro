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
];

const PIECE_MAP: Record<string, string> = {
  wP: 'wP', wN: 'wN', wB: 'wB', wR: 'wR', wQ: 'wQ', wK: 'wK',
  bP: 'bP', bN: 'bN', bB: 'bB', bR: 'bR', bQ: 'bQ', bK: 'bK',
};

/** CC0 piece SVGs hosted by Lichess in their public lila repo. The
 *  legacy `https://lichess1.org/assets/piece/<set>/<piece>.svg` path
 *  stopped serving without a content-hash prefix (Lichess switched
 *  to webpack-hashed asset paths), which broke every set in our
 *  picker — confirmed in the prod audit log (100+
 *  asset-load-error rows). jsdelivr serves the GitHub source
 *  directly with proper Content-Type + CORS, identical directory
 *  layout, and no auth. Pinned to a commit so this URL never silently
 *  regresses. */
export const LICHESS_CDN =
  'https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece';

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
  const hasFilters = filters?.whitePieceFilter || filters?.blackPieceFilter;

  // No custom set and no filters → use react-chessboard defaults
  if (!config?.lichessName && !hasFilters) return undefined;

  // Use the configured set, or fall back to cburnett when we need filters on the default set
  const setName = config?.lichessName ?? 'cburnett';
  const pieces: PieceRenderObject = {};

  for (const [key, file] of Object.entries(PIECE_MAP)) {
    const url = `${LICHESS_CDN}/${setName}/${file}.svg`;
    const isWhite = key.startsWith('w');
    const pieceFilter = isWhite ? filters?.whitePieceFilter : filters?.blackPieceFilter;

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
          // failed response. Retry once with a cache-busting query
          // before giving up to the alt-text fallback. Second failure
          // logs the audit row and surrenders.
          const img = e.currentTarget as HTMLImageElement;
          if (!img.dataset.retried) {
            img.dataset.retried = '1';
            img.src = `${url}?retry=${Date.now()}`;
            return;
          }
          void logAppAudit({
            kind: 'asset-load-error',
            category: 'subsystem',
            source: 'pieceSetService',
            summary: `piece=${key} set=${setName} url=${url} (retry exhausted)`,
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
