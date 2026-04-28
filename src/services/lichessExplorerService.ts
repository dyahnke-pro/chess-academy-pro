import type { LichessExplorerResult, LichessCloudEval } from '../types';

const EXPLORER_BASE = 'https://explorer.lichess.ovh';
const LICHESS_API_BASE = 'https://lichess.org/api';

/** Network timeout for any Lichess call. Keeps slow / unresponsive
 *  Lichess endpoints from stalling the UI — callers that don't wrap
 *  with their own timeout still get protection at the service edge. */
const LICHESS_FETCH_TIMEOUT_MS = 5000;

/** WO-LICHESS-CORS-FIX — only `Accept: application/json` is sent.
 *
 *  Earlier shapes set a custom `User-Agent` per Lichess ToS recommen-
 *  dation, but `User-Agent` is on the browser fetch forbidden-header
 *  list. Two failure modes flowed from this:
 *    1. Older iOS WKWebView throws "Load failed" on the fetch call
 *       when the page tries to set a forbidden header — production
 *       audit findings 40 / 90 / 125 (cycle 5) all show
 *       `lichess_opening_lookup error: "Load failed"` from this
 *       exact path.
 *    2. Even when the forbidden header is silently dropped, some
 *       earlier custom-header attempts (`X-Client`) trigger CORS
 *       preflight, which Lichess does not advertise for the
 *       explorer endpoint — so the preflight 404s, the GET never
 *       fires, and the app surfaces a network failure that looks
 *       like an outage.
 *  The public Lichess explorer doesn't require any identifying
 *  header for read-only queries; `Accept: application/json` is on
 *  the CORS-safelist so it doesn't trigger preflight, and the
 *  endpoint returns JSON regardless. */
const LICHESS_HEADERS: Record<string, string> = {
  Accept: 'application/json',
};

export type ExplorerSource = 'lichess' | 'masters';

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
  const response = await fetch(url, {
    headers: LICHESS_HEADERS,
    signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
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
  const response = await fetch(url, {
    headers: LICHESS_HEADERS,
    signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
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
