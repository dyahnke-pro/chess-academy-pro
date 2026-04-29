import type { LichessExplorerResult, LichessCloudEval } from '../types';
import { logAppAudit } from './appAuditor';

/** Network timeout for any Lichess call. Keeps slow / unresponsive
 *  Lichess endpoints from stalling the UI — callers that don't wrap
 *  with their own timeout still get protection at the service edge. */
const LICHESS_FETCH_TIMEOUT_MS = 8000;

/** WO-REAL-FIXES — route every Lichess call through our own Edge
 *  proxies (`/api/lichess-explorer`, `/api/lichess-cloud-eval`)
 *  instead of the bare `explorer.lichess.ovh` host.
 *
 *  Why: production audit cycle 6 ran the 3-shape probe (PR #355) and
 *  proved Lichess returns HTTP 401 to a bare GET from iOS Safari's
 *  default User-Agent — `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7…)`.
 *  Every browser-side header trick fails because:
 *    - `User-Agent` is on the fetch forbidden-header list (silently
 *      dropped or thrown by older WebKit)
 *    - any custom header (`X-Client`, etc.) triggers CORS preflight,
 *      which Lichess explorer doesn't advertise
 *  The Edge proxy talks to Lichess from Vercel-side Node, where
 *  `User-Agent` can be set freely; the browser fetches the proxy
 *  same-origin so no CORS / no preflight / no forbidden-header. */
const EXPLORER_PROXY_PATH = '/api/lichess-explorer';
const CLOUD_EVAL_PROXY_PATH = '/api/lichess-cloud-eval';
const GAME_EXPORT_PROXY_PATH = '/api/lichess-game-export';

/** Capacitor needs absolute URLs — the page protocol is
 *  `capacitor://app.chessacademy.pro` which can't relative-resolve
 *  `/api/...`. Web stays on relative paths so the same-origin proxy
 *  CORS short-circuit applies. Mirrors `getTtsUrl()` in
 *  voiceService.ts. */
const VERCEL_ORIGIN = 'https://chess-academy-pro.vercel.app';
function isCapacitor(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
}
function withApiBase(path: string): string {
  return isCapacitor() ? `${VERCEL_ORIGIN}${path}` : path;
}

export type ExplorerSource = 'lichess' | 'masters';

/** Capture the actual error fields whenever a Lichess fetch fails.
 *  Inherited from PR #355's diagnostic instrumentation — preserves
 *  the `error.name` / `error.cause` / `navigator.onLine` signal that
 *  distinguishes proxy outages from upstream Lichess outages. */
function emitLichessFailure(
  source: string,
  url: string,
  err: unknown,
  statusIfReachable: number | null,
): void {
  const e = err as { name?: string; message?: string; cause?: unknown } | null;
  const errorName = e?.name ?? 'UnknownError';
  const errorMessage = e?.message ?? (err === null ? 'null' : String(err));
  const cause =
    e?.cause !== undefined && e?.cause !== null
      ? typeof e.cause === 'string'
        ? e.cause
        : JSON.stringify(e.cause)
      : null;
  void logAppAudit({
    kind: 'lichess-error',
    category: 'subsystem',
    source,
    summary: `url=${url} status=${statusIfReachable ?? 'throw'} error=${errorName}: ${errorMessage}`,
    details: JSON.stringify(
      {
        url,
        status: statusIfReachable,
        errorName,
        errorMessage,
        cause,
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
      null,
      2,
    ),
  });
}

/**
 * Fetch opening explorer data for a FEN position.
 * Returns move statistics (W/D/L) from Lichess games or master games.
 */
export async function fetchLichessExplorer(
  fen: string,
  source: ExplorerSource = 'lichess',
): Promise<LichessExplorerResult> {
  const params = new URLSearchParams({ fen, source });
  if (source === 'lichess') {
    params.set('speeds', 'blitz,rapid,classical');
    params.set('ratings', '1600,1800,2000,2200,2500');
  }
  const url = withApiBase(`${EXPLORER_PROXY_PATH}?${params.toString()}`);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    emitLichessFailure('lichessExplorerService.fetchLichessExplorer', url, err, null);
    throw err;
  }
  if (!response.ok) {
    emitLichessFailure(
      'lichessExplorerService.fetchLichessExplorer',
      url,
      new Error(`HTTP ${response.status}`),
      response.status,
    );
    throw new Error(`Explorer API error: ${response.status}`);
  }
  return response.json() as Promise<LichessExplorerResult>;
}

/**
 * Fetch Lichess cloud evaluation for a FEN position.
 * Returns null if no cloud eval is available (404).
 * No auth required.
 */
export async function fetchCloudEval(
  fen: string,
  multiPv: number = 3,
): Promise<LichessCloudEval | null> {
  const params = new URLSearchParams({ fen, multiPv: String(multiPv) });
  const url = withApiBase(`${CLOUD_EVAL_PROXY_PATH}?${params.toString()}`);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    emitLichessFailure('lichessExplorerService.fetchCloudEval', url, err, null);
    throw err;
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    emitLichessFailure(
      'lichessExplorerService.fetchCloudEval',
      url,
      new Error(`HTTP ${response.status}`),
      response.status,
    );
    throw new Error(`Cloud eval API error: ${response.status}`);
  }
  return response.json() as Promise<LichessCloudEval>;
}

/**
 * Format a centipawn value as a human-readable eval string (e.g. "+1.23").
 */
export function formatCloudEval(pv: { cp?: number; mate?: number }): string {
  if (pv.mate !== undefined) {
    return pv.mate > 0 ? `M${pv.mate}` : `-M${Math.abs(pv.mate)}`;
  }
  if (pv.cp !== undefined) {
    const pawns = pv.cp / 100;
    return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
  }
  return '0.00';
}

/**
 * Fetch a master game's PGN by Lichess game ID. Routes through our
 * Edge proxy at /api/lichess-game-export so the iOS Safari fetch
 * forbidden-header issue doesn't bite us. The id is typically
 * sourced from a `lichess_master_games` topGames[].id entry.
 */
export async function fetchLichessGameExport(id: string): Promise<string> {
  const cleaned = id.trim();
  if (!cleaned) throw new Error('id is required');
  const params = new URLSearchParams({ id: cleaned });
  const url = withApiBase(`${GAME_EXPORT_PROXY_PATH}?${params.toString()}`);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/x-chess-pgn' },
      signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    emitLichessFailure('lichessExplorerService.fetchLichessGameExport', url, err, null);
    throw err;
  }
  if (!response.ok) {
    emitLichessFailure(
      'lichessExplorerService.fetchLichessGameExport',
      url,
      new Error(`HTTP ${response.status}`),
      response.status,
    );
    throw new Error(`Game export API error: ${response.status}`);
  }
  return response.text();
}
