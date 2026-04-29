import type { LichessExplorerResult, LichessCloudEval } from '../types';
import { logAppAudit } from './appAuditor';

const EXPLORER_BASE = 'https://explorer.lichess.ovh';
const LICHESS_API_BASE = 'https://lichess.org/api';

/** Network timeout for any Lichess call. Keeps slow / unresponsive
 *  Lichess endpoints from stalling the UI — callers that don't wrap
 *  with their own timeout still get protection at the service edge. */
const LICHESS_FETCH_TIMEOUT_MS = 5000;

/** WO-DEEP-DIAGNOSTICS — only `Accept: application/json` is sent.
 *
 *  Earlier shapes set a custom `User-Agent` per Lichess ToS recommen-
 *  dation, but `User-Agent` is on the browser fetch forbidden-header
 *  list — older iOS WKWebView throws "Load failed" on the fetch call
 *  when the page tries to set a forbidden header (audit cycle 5
 *  Findings 40 / 90 / 125 are exactly this).
 *
 *  `Accept: application/json` is on the CORS-safelist regardless of
 *  value, so it doesn't trigger an OPTIONS preflight, and the
 *  endpoint returns JSON for read-only queries without any
 *  identifying header. */
const LICHESS_HEADERS: Record<string, string> = {
  Accept: 'application/json',
};

export type ExplorerSource = 'lichess' | 'masters';

/** WO-DEEP-DIAGNOSTICS — capture the actual error fields whenever a
 *  Lichess fetch fails. The legacy "Explorer API error: 401" shape
 *  loses the WebKit `error.name` / `error.cause` / `navigator.onLine`
 *  signal that distinguishes forbidden-header throw from CORS
 *  preflight from real outage. Production audit is emitted from
 *  here so we never lose the diagnostic data even when the caller
 *  swallows the throw. */
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
  const params = new URLSearchParams({ fen });
  if (source === 'lichess') {
    params.set('speeds', 'blitz,rapid,classical');
    params.set('ratings', '1600,1800,2000,2200,2500');
  }
  const url = `${EXPLORER_BASE}/${source}?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: LICHESS_HEADERS,
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
  const url = `${LICHESS_API_BASE}/cloud-eval?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: LICHESS_HEADERS,
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
