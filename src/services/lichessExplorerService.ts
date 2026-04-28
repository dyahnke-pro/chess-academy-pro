import type { LichessExplorerResult, LichessCloudEval } from '../types';
import { logAppAudit } from './appAuditor';

const EXPLORER_BASE = 'https://explorer.lichess.ovh';
const LICHESS_API_BASE = 'https://lichess.org/api';

/** Network timeout for any Lichess call. Keeps slow / unresponsive
 *  Lichess endpoints from stalling the UI — callers that don't wrap
 *  with their own timeout still get protection at the service edge. */
const LICHESS_FETCH_TIMEOUT_MS = 5000;

/** Lichess API ToS asks for an identifying client. Audit Finding 28
 *  showed `lichess_opening_lookup` returning 401, and Finding 113
 *  re-confirmed the same after PR #347's User-Agent attempt — which
 *  was always a no-op because `User-Agent` is on the browser fetch
 *  forbidden-header list (the value is silently dropped, never
 *  reaches the wire). WO-VISIBLE-POLISH bug 3 swaps to `X-Client`
 *  (allowed) so the request is still labelled but no header is
 *  silently filtered. */
const LICHESS_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'X-Client': 'chess-academy-pro/1.0 (https://chess-academy-pro.vercel.app)',
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
  // WO-VISIBLE-POLISH bug 3 diagnostic — log every Lichess attempt
  // with its resolved URL + status so the next test cycle shows
  // exactly what the gateway returned, even when the caller swallows
  // the throw.
  void logAppAudit({
    kind: 'lichess-fetch-attempt',
    category: 'subsystem',
    source: 'lichessExplorerService.fetchLichessExplorer',
    summary: `url=${url} status=${response.status}`,
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
  void logAppAudit({
    kind: 'lichess-fetch-attempt',
    category: 'subsystem',
    source: 'lichessExplorerService.fetchCloudEval',
    summary: `url=${url} status=${response.status}`,
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
