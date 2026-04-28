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
  // WO-VISIBLE-POLISH follow-up — try/finally so the audit fires even
  // when fetch throws (AbortSignal timeout, network unreachable, CORS
  // preflight fail, etc.). The previous shape only logged on
  // resolution; production audit (cycle 2) showed 6 trace-tool-dispatch
  // entries for Lichess but ZERO `lichess-fetch-attempt` — meaning
  // every fetch was throwing before reaching the log line.
  let status: number | null = null;
  let errorMsg: string | null = null;
  try {
    const response = await fetch(url, {
      headers: LICHESS_HEADERS,
      signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
    });
    status = response.status;
    if (!response.ok) {
      throw new Error(`Explorer API error: ${response.status}`);
    }
    return await (response.json() as Promise<LichessExplorerResult>);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    void logAppAudit({
      kind: 'lichess-fetch-attempt',
      category: 'subsystem',
      source: 'lichessExplorerService.fetchLichessExplorer',
      summary: status !== null
        ? `url=${url} status=${status}`
        : `url=${url} status=throw error="${errorMsg ?? 'unknown'}"`,
    });
  }
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
  let status: number | null = null;
  let errorMsg: string | null = null;
  try {
    const response = await fetch(url, {
      headers: LICHESS_HEADERS,
      signal: AbortSignal.timeout(LICHESS_FETCH_TIMEOUT_MS),
    });
    status = response.status;
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Cloud eval API error: ${response.status}`);
    }
    return await (response.json() as Promise<LichessCloudEval>);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    void logAppAudit({
      kind: 'lichess-fetch-attempt',
      category: 'subsystem',
      source: 'lichessExplorerService.fetchCloudEval',
      summary: status !== null
        ? `url=${url} status=${status}`
        : `url=${url} status=throw error="${errorMsg ?? 'unknown'}"`,
    });
  }
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
